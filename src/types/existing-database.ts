// Types for existing Supabase database tables

export interface UserAccount {
  id: string;
  auth_user_id?: string;
  tdr_application_id?: string;
  email: string;
  instagram_handle?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface UserPoints {
  id: string;
  user_id: string;
  submission_points: number;
  approval_points: number;
  engagement_points: number;
  weekly_win_points: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface UserAchievements {
  id: string;
  user_id: string;
  achievement_type?: string;
  name?: string;
  description?: string;
  points_awarded?: number;
  unlocked_at: string;
}

export interface TDRApplication {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone?: string;
  instagram_handle?: string;
  tiktok_username?: string;
  follower_count?: string;
  content_focus?: string[];
  why_partner?: string;
  owns_motorcycle?: string;
  racing_experience?: string;
  motorcycle_knowledge?: string;
  portfolio_url?: string;
  portfolio_filename?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  updated_at: string;
}

export interface UGCContent {
  id: string;
  platform: 'instagram' | 'tiktok';
  author_username: string;
  content_url: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  likes_count: number;
  comments_count: number;
  hashtags?: string[];
  status: 'new' | 'approved_for_repost' | 'weekly_winner' | 'rejected';
  created_at: string;
  updated_at: string;
}

// New Discord integration tables
export interface DiscordUserLink {
  id: string;
  user_account_id: string;
  discord_id: string;
  discord_username?: string;
  discord_discriminator?: string;
  linked_at: string;
  last_sync_at: string;
  is_active: boolean;
}

export interface DiscordActivity {
  id: string;
  user_account_id?: string;
  discord_id?: string;
  activity_type: 'account_linked' | 'daily_checkin' | 'mission_completed' | 'content_submitted' | 'achievement_unlocked' | 'referral_completed' | 'account_unlinked';
  activity_data: Record<string, any>;
  points_awarded: number;
  created_at: string;
}

export interface DiscordMissionType {
  id: string;
  name: string;
  description?: string;
  point_reward: number;
  requirements: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// View for Discord user statistics
export interface DiscordUserStats {
  id: string;
  discord_id: string;
  discord_username?: string;
  discord_discriminator?: string;
  discord_linked_at?: string;
  email: string;
  full_name?: string;
  instagram_handle?: string;
  total_points: number;
  submission_points: number;
  approval_points: number;
  engagement_points: number;
  weekly_win_points: number;
  discord_activities: number;
  linked_at?: string;
  last_sync_at?: string;
}

// Combined user information for Discord bot
export interface LinkedUserInfo {
  userAccount: UserAccount;
  userPoints?: UserPoints;
  discordLink: DiscordUserLink;
  recentActivities: DiscordActivity[];
}

// Discord linking status
export interface LinkingStatus {
  isLinked: boolean;
  userInfo?: LinkedUserInfo;
  linkingCode?: string;
  expiresAt?: Date;
}

// Mission submission data
export interface DiscordMissionSubmission {
  discordId: string;
  missionType: string;
  submissionData: {
    title?: string;
    description?: string;
    mediaUrl?: string;
    hashtags?: string[];
    platform?: 'instagram' | 'tiktok';
  };
  proofUrl?: string;
}

// Point transaction for existing system
export interface PointTransaction {
  user_account_id: string;
  discord_id?: string;
  amount: number;
  source: string;
  description: string;
  transaction_type: 'submission' | 'approval' | 'engagement' | 'weekly_win' | 'discord_activity';
  created_at: string;
}

// Leaderboard entry based on existing data
export interface LeaderboardEntry {
  rank: number;
  discord_username?: string;
  full_name?: string;
  instagram_handle?: string;
  total_points: number;
  submission_points: number;
  approval_points: number;
  engagement_points: number;
  weekly_win_points: number;
  discord_activities: number;
}

// Supabase response types
export type SupabaseResponse<T> = {
  data: T | null;
  error: any;
};

export type SupabaseListResponse<T> = {
  data: T[] | null;
  error: any;
};