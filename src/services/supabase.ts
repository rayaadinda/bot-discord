import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { User, Mission, UserMission, PointTransaction, FAQ, WelcomeMessage, DiscordMissionType, DiscordActivity, SupabaseResponse, SupabaseListResponse } from '../types/database';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // User operations
  async getUser(discordId: string): Promise<SupabaseResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('tdr_applications')
        .select(`
          *,
          user_points (
            submission_points,
            approval_points,
            engagement_points,
            weekly_win_points,
            total_points
          )
        `)
        .eq('discord_id', discordId)
        .single();

      // If we have user data, merge the points data
      if (data && data.user_points) {
        const userData = {
          ...data,
          points: data.user_points.total_points || 0,
          submission_points: data.user_points.submission_points || 0,
          approval_points: data.user_points.approval_points || 0,
          engagement_points: data.user_points.engagement_points || 0,
          weekly_win_points: data.user_points.weekly_win_points || 0,
        };
        return { data: userData, error: null };
      }

      // If no points data exists, set default values
      if (data) {
        const userData = {
          ...data,
          points: 0,
          submission_points: 0,
          approval_points: 0,
          engagement_points: 0,
          weekly_win_points: 0,
        };
        return { data: userData, error: null };
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createUser(userData: Partial<User>): Promise<SupabaseResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('tdr_applications')
        .insert([userData])
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateUser(discordId: string, updateData: Partial<User>): Promise<SupabaseResponse<User>> {
    try {
      const { data, error } = await this.client
        .from('tdr_applications')
        .update(updateData)
        .eq('discord_id', discordId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async addPoints(discordId: string, amount: number, source: string, description: string, missionId?: string): Promise<boolean> {
    try {
      // First, update user points in tdr_applications table
      const { error: userError } = await this.client
        .from('tdr_applications')
        .select('points')
        .eq('discord_id', discordId)
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;

      if (userError?.code === 'PGRST116') {
        // User not found, create new user
        const { error: createUserError } = await this.client
          .from('tdr_applications')
          .insert([{
            discord_id: discordId,
            points: amount,
            created_at: new Date().toISOString(),
          }]);

        if (createUserError) throw createUserError;
      } else {
        // User found, update points
        const currentPoints = userError ? 0 : (await this.client
          .from('tdr_applications')
          .select('points')
          .eq('discord_id', discordId)
          .single()).data?.points || 0;

        const { error: updateError } = await this.client
          .from('tdr_applications')
          .update({ points: currentPoints + amount })
          .eq('discord_id', discordId);

        if (updateError) throw updateError;
      }

      // Then, record the activity
      const { error: activityError } = await this.client
        .from('discord_activities')
        .insert([{
          discord_id: discordId,
          activity_type: 'mission_completed',
          activity_data: {
            source,
            description,
            related_mission_id: missionId || null,
          },
          points_awarded: amount,
          created_at: new Date().toISOString(),
        }]);

      if (activityError) throw activityError;

      return true;
    } catch (error) {
      console.error('Error adding points:', error);
      return false;
    }
  }

  // Mission operations
  async getActiveMissions(): Promise<SupabaseListResponse<DiscordMissionType>> {
    try {
      const { data, error } = await this.client
        .from('discord_mission_types')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getUserMissions(discordId: string): Promise<SupabaseListResponse<DiscordActivity>> {
    try {
      const { data, error } = await this.client
        .from('discord_activities')
        .select('*')
        .eq('discord_id', discordId)
        .eq('activity_type', 'mission_completed')
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async submitMission(discordId: string, missionId: string, submissionData: Record<string, any>, proofUrl?: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('discord_activities')
        .insert([{
          discord_id: discordId,
          activity_type: 'mission_completed',
          activity_data: {
            mission_id: missionId,
            submission_data: submissionData,
            proof_url: proofUrl || null,
          },
          points_awarded: 0, // Will be updated when mission is approved
          created_at: new Date().toISOString(),
        }]);

      return !error;
    } catch (error) {
      console.error('Error submitting mission:', error);
      return false;
    }
  }

  // Point transaction operations
  async getUserPointHistory(discordId: string, limit = 10): Promise<SupabaseListResponse<DiscordActivity>> {
    try {
      const { data, error } = await this.client
        .from('discord_activities')
        .select('*')
        .eq('discord_id', discordId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Leaderboard operations
  async getLeaderboard(limit = 10): Promise<SupabaseListResponse<Pick<User, 'discord_username' | 'points' | 'tier'>>> {
    try {
      const { data, error } = await this.client
        .from('tdr_applications')
        .select('discord_username, points, tier')
        .order('points', { ascending: false })
        .limit(limit);

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // FAQ operations
  async getActiveFAQs(): Promise<SupabaseListResponse<FAQ>> {
    try {
      const { data, error } = await this.client
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('order_num', { ascending: true });

      // If the table doesn't exist or can't be found, return empty data instead of error
      if (error && (
        error.message?.includes('does not exist') ||
        error.message?.includes('find the table') ||
        error.code === 'PGRST116'
      )) {
        return { data: [], error: null };
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Welcome message operations
  async getActiveWelcomeMessage(): Promise<SupabaseResponse<WelcomeMessage>> {
    try {
      const { data, error } = await this.client
        .from('welcome_messages')
        .select('*')
        .eq('is_active', true)
        .single();

      // If the table doesn't exist or can't be found, return null instead of error
      if (error && (
        error.message?.includes('does not exist') ||
        error.message?.includes('find the table') ||
        error.code === 'PGRST116'
      )) {
        return { data: null, error: null };
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();