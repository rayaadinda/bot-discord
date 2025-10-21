export interface User {
  id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator: string;
  points: number;
  tier: 'rookie_rider' | 'pro_racer' | 'hpz_legend';
  join_date: string;
  last_active: string;
  total_content_submissions: number;
  total_referrals: number;
  affiliate_link: string | null;
  created_at: string;
  updated_at: string;
  // Additional points fields from user_points table
  submission_points?: number;
  approval_points?: number;
  engagement_points?: number;
  weekly_win_points?: number;
  // Nested user_points data
  user_points?: {
    submission_points: number;
    approval_points: number;
    engagement_points: number;
    weekly_win_points: number;
    total_points: number;
  };
}

export interface DiscordMissionType {
  id: string;
  name: string;
  description: string | null;
  point_reward: number;
  requirements: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  activity_type: string | null;
}

export interface DiscordActivity {
  id: string;
  user_account_id: string | null;
  discord_id: string | null;
  activity_type: 'account_linked' | 'daily_checkin' | 'mission_completed' | 'content_submitted' | 'achievement_unlocked' | 'referral_completed';
  activity_data: Record<string, any>;
  points_awarded: number;
  created_at: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  mission_type: 'content' | 'referral' | 'challenge' | 'event' | 'affiliate';
  points_reward: number;
  requirements: Record<string, any>;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submission_data: Record<string, any> | null;
  proof_url: string | null;
  notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earned' | 'redeemed' | 'adjusted';
  source: string;
  description: string;
  related_mission_id: string | null;
  created_at: string;
}

export interface WelcomeMessage {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  discord_username: string;
  points: number;
  tier: string;
  rank: number;
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