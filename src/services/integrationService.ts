import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import {
  UserAccount,
  UserPoints,
  DiscordUserLink,
  DiscordActivity,
  DiscordUserStats,
  LinkedUserInfo,
  LinkingStatus,
  DiscordMissionSubmission,
  LeaderboardEntry,
  UGCContent,
  SupabaseResponse,
  SupabaseListResponse,
} from '../types/existing-database';

export class IntegrationService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Discord User Linking Methods
  async isDiscordUserLinked(discordId: string): Promise<boolean> {
    try {
      // Use your RPC function
      const { data, error } = await this.client.rpc('is_discord_user_linked', {
        p_discord_id: discordId,
      });

      if (!error && data !== null) {
        return data === true;
      }

      // Fallback: Direct query to tdr_applications table
      const { data: userData, error: userError } = await this.client
        .from('tdr_applications')
        .select('discord_id')
        .eq('discord_id', discordId)
        .single();

      return !userError && !!userData;
    } catch (error) {
      console.error('Error checking Discord link:', error);
      return false;
    }
  }

  async getUserByDiscord(discordId: string): Promise<SupabaseResponse<DiscordUserStats>> {
    try {
      // Use your RPC function
      const { data, error } = await this.client.rpc('get_user_by_discord', {
        p_discord_id: discordId,
      });

      if (!error && data && data.length > 0) {
        const userStats: DiscordUserStats = data[0];
        return { data: userStats, error: null };
      }

      // Fallback: Direct query with joins
      const { data: userData, error: userError } = await this.client
        .from('tdr_applications')
        .select(`
          id,
          email,
          full_name,
          discord_id,
          discord_username,
          discord_discriminator,
          discord_linked_at,
          instagram_handle,
          user_points (
            total_points,
            submission_points,
            approval_points,
            engagement_points,
            weekly_win_points
          )
        `)
        .eq('discord_id', discordId)
        .single();

      if (userError) throw userError;

      const userStats: DiscordUserStats = {
        id: userData.id,
        discord_id: userData.discord_id,
        discord_username: userData.discord_username,
        discord_discriminator: userData.discord_discriminator,
        discord_linked_at: userData.discord_linked_at,
        email: userData.email,
        full_name: userData.full_name,
        instagram_handle: userData.instagram_handle,
        total_points: userData.user_points?.[0]?.total_points || 0,
        submission_points: userData.user_points?.[0]?.submission_points || 0,
        approval_points: userData.user_points?.[0]?.approval_points || 0,
        engagement_points: userData.user_points?.[0]?.engagement_points || 0,
        weekly_win_points: userData.user_points?.[0]?.weekly_win_points || 0,
        linked_at: userData.discord_linked_at,
        discord_activities: 0 // We'll calculate this separately if needed
      };

      return { data: userStats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async linkDiscordAccount(
    userAccountId: string,
    discordId: string,
    discordUsername: string,
    discordDiscriminator: string
  ): Promise<boolean> {
    try {
      // Use your RPC function
      const { data, error } = await this.client.rpc('link_discord_account', {
        p_user_account_id: userAccountId,
        p_discord_id: discordId,
        p_discord_username: discordUsername,
        p_discord_discriminator: discordDiscriminator,
      });

      if (!error && data === true) {
        return true;
      }

      // Fallback: Direct update
      const { error: updateError } = await this.client
        .from('tdr_applications')
        .update({
          discord_id: discordId,
          discord_username: discordUsername,
          discord_discriminator: discordDiscriminator,
          discord_linked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userAccountId);

      if (updateError) throw updateError;

      // Log the linking activity
      await this.logDiscordActivity(
        userAccountId,
        discordId,
        'account_linked',
        { discordUsername, discordDiscriminator },
        config.discordPoints.accountLinking
      );

      // Award points for linking
      await this.addDiscordPoints(
        userAccountId,
        discordId,
        config.discordPoints.accountLinking,
        'account_linking',
        'Discord account linked successfully'
      );

      return true;
    } catch (error) {
      console.error('Error linking Discord account:', error);
      return false;
    }
  }

  async unlinkDiscordAccount(discordId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client.rpc('unlink_discord_account', {
        p_discord_id: discordId,
      });

      return !error && data === true;
    } catch (error) {
      console.error('Error unlinking Discord account:', error);
      return false;
    }
  }

  async findUserByEmail(email: string): Promise<SupabaseResponse<UserAccount>> {
    try {
      const { data, error } = await this.client
        .from('user_accounts')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // User Points Methods
  async getUserPoints(userAccountId: string): Promise<SupabaseResponse<UserPoints>> {
    try {
      const { data, error } = await this.client
        .from('user_points')
        .select('*')
        .eq('user_id', userAccountId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async addDiscordPoints(
    userAccountId: string,
    discordId: string,
    amount: number,
    source: string,
    description: string
  ): Promise<boolean> {
    try {
      // Use your RPC function
      const { error: rpcError } = await this.client.rpc('add_user_points', {
        p_user_id: userAccountId,
        p_points: amount,
        p_source: source,
      });

      if (!rpcError) {
        // RPC function succeeded, it already logs the activity
        return true;
      }

      // Fallback: Manual points update
      const { error: pointsError } = await this.client
        .from('user_points')
        .upsert({
          user_id: userAccountId,
          total_points: amount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (pointsError) {
        // If upsert fails due to existing record, try to update it
        const { data: existingPoints } = await this.client
          .from('user_points')
          .select('total_points')
          .eq('user_id', userAccountId)
          .single();

        if (!existingPoints) {
          throw pointsError;
        }

        const { error: updateError } = await this.client
          .from('user_points')
          .update({
            total_points: existingPoints.total_points + amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userAccountId);

        if (updateError) throw updateError;
      }

      // Log the Discord activity
      const { error: activityError } = await this.client
        .from('discord_activities')
        .insert([{
          user_account_id: userAccountId,
          discord_id: discordId,
          activity_type: this.getActivityType(source),
          activity_data: { source, description },
          points_awarded: amount,
        }]);

      if (activityError) throw activityError;

      return true;
    } catch (error) {
      console.error('Error adding Discord points:', error);
      return false;
    }
  }

  // Content Submission Methods
  async submitContent(
    userAccountId: string,
    discordId: string,
    submission: DiscordMissionSubmission
  ): Promise<boolean> {
    try {
      const contentData = {
        id: `discord_${Date.now()}_${discordId}`,
        platform: submission.submissionData.platform || 'instagram',
        author_username: submission.submissionData.title || 'Discord User',
        content_url: submission.submissionData.mediaUrl || '',
        media_type: 'image' as const, // Default to image, can be enhanced
        media_url: submission.submissionData.mediaUrl || '',
        caption: submission.submissionData.description,
        hashtags: submission.submissionData.hashtags || [],
        status: 'new' as const,
      };

      const { error } = await this.client
        .from('ugc_content')
        .insert([contentData]);

      if (error) throw error;

      // Log the activity
      await this.client
        .from('discord_activities')
        .insert([{
          user_account_id: userAccountId,
          discord_id: discordId,
          activity_type: 'content_submitted',
          activity_data: { submission },
          points_awarded: config.discordPoints.contentSubmission,
        }]);

      // Award points
      await this.addDiscordPoints(
        userAccountId,
        discordId,
        config.discordPoints.contentSubmission,
        'content_submission',
        'Content submitted through Discord'
      );

      return true;
    } catch (error) {
      console.error('Error submitting content:', error);
      return false;
    }
  }

  // Leaderboard Methods
  async getDiscordLeaderboard(limit = 10): Promise<SupabaseListResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('user_points')
        .select(`
          *,
          tdr_applications (
            discord_id,
            discord_username,
            full_name
          )
        `)
        .order('total_points', { ascending: false })
        .limit(limit);

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getUserRank(discordId: string): Promise<number | null> {
    try {
      // Use your RPC function first
      const { data: leaderboardData, error: rpcError } = await this.client.rpc('get_discord_leaderboard', {
        p_limit: 100
      });

      if (!rpcError && leaderboardData) {
        const rank = leaderboardData.findIndex((user: any) => user.discord_id === discordId);
        return rank >= 0 ? rank + 1 : null;
      }

      // Fallback: Manual ranking calculation
      const { data: allUsers, error } = await this.client
        .from('tdr_applications')
        .select(`
          discord_id,
          user_points!inner (total_points)
        `)
        .not('discord_id', 'is', null)
        .order('user_points(total_points)', { ascending: false });

      if (error || !allUsers) return null;

      const rank = allUsers.findIndex(user => user.discord_id === discordId);
      return rank >= 0 ? rank + 1 : null;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return null;
    }
  }

  // Activity Tracking Methods
  async logDiscordActivity(
    userAccountId: string,
    discordId: string,
    activityType: DiscordActivity['activity_type'],
    activityData: Record<string, any>,
    pointsAwarded: number = 0
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('discord_activities')
        .insert([{
          user_account_id: userAccountId,
          discord_id: discordId,
          activity_type: activityType,
          activity_data: activityData,
          points_awarded: pointsAwarded,
        }]);

      return !error;
    } catch (error) {
      console.error('Error logging Discord activity:', error);
      return false;
    }
  }

  async getUserActivities(
    discordId: string,
    limit = 10
  ): Promise<SupabaseListResponse<DiscordActivity>> {
    try {
      // First get the user account ID from Discord ID
      const { data: userData, error: userError } = await this.client
        .from('tdr_applications')
        .select('id')
        .eq('discord_id', discordId)
        .single();

      if (userError || !userData) {
        return { data: [], error: userError };
      }

      // Then get activities for that user
      const { data, error } = await this.client
        .from('discord_activities')
        .select('*')
        .eq('user_account_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Mission Types Methods
  async getDiscordMissionTypes(): Promise<SupabaseListResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('discord_mission_types')
        .select('*')
        .eq('is_active', true)
        .order('point_reward', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Helper Methods
  private getActivityType(source: string): DiscordActivity['activity_type'] {
    const typeMap: Record<string, DiscordActivity['activity_type']> = {
      'account_linking': 'account_linked',
      'daily_checkin': 'daily_checkin',
      'content_submission': 'content_submitted',
      'community_help': 'mission_completed',
      'referral_discord': 'referral_completed',
    };

    return typeMap[source] || 'mission_completed';
  }

  async createLinkingCode(userAccountId: string): Promise<string | null> {
    try {
      const code = this.generateLinkingCode();
      const expiresAt = new Date(Date.now() + config.linking.codeExpiryHours * 60 * 60 * 1000);

      // Store linking code in a temporary table or cache
      // For now, we'll return the code that can be validated through the dashboard
      return code;
    } catch (error) {
      console.error('Error creating linking code:', error);
      return null;
    }
  }

  private generateLinkingCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();