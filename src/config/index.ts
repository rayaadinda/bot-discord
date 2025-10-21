import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_BOT_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    botPrefix: process.env.BOT_PREFIX || '!',
    oauthRedirectUri: process.env.DISCORD_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback',
    oauthScope: process.env.DISCORD_OAUTH_SCOPE || 'identify email',
  },

  // Channel IDs
  channels: {
    welcome: process.env.WELCOME_CHANNEL_ID || '',
    leaderboard: process.env.LEADERBOARD_CHANNEL_ID || '',
    log: process.env.LOG_CHANNEL_ID || '',
    linking: process.env.LINKING_CHANNEL_ID || '',
    missions: process.env.MISSIONS_CHANNEL_ID || '',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Account Linking
  linking: {
    codeExpiryHours: parseInt(process.env.LINKING_CODE_EXPIRY_HOURS || '24'),
    welcomePoints: parseInt(process.env.LINKING_WELCOME_POINTS || '10'),
    maxLinkingAttempts: parseInt(process.env.MAX_LINKING_ATTEMPTS || '3'),
    cooldownMinutes: parseInt(process.env.LINKING_COOLDOWN_MINUTES || '5'),
  },

  // Point System (Discord specific)
  discordPoints: {
    accountLinking: parseInt(process.env.DISCORD_POINTS_LINKING || '10'),
    dailyCheckin: parseInt(process.env.DISCORD_POINTS_DAILY_CHECKIN || '5'),
    contentSubmission: parseInt(process.env.DISCORD_POINTS_CONTENT_SUBMISSION || '20'),
    communityHelp: parseInt(process.env.DISCORD_POINTS_COMMUNITY_HELP || '10'),
    referralDiscord: parseInt(process.env.DISCORD_POINTS_REFERRAL || '15'),
  },

  // Point System (Existing from dashboard)
  points: {
    content: parseInt(process.env.POINTS_FOR_CONTENT || '50'),
    referral: parseInt(process.env.POINTS_FOR_REFERRAL || '100'),
    weeklyChallenge: parseInt(process.env.POINTS_FOR_WEEKLY_CHALLENGE || '30'),
    eventAttendance: parseInt(process.env.POINTS_FOR_EVENT_ATTENDANCE || '40'),
    affiliateSale: parseInt(process.env.POINTS_FOR_AFFILIATE_SALE || '150'),
  },

  // Tier System (based on existing point structure)
  tiers: {
    rookie_rider: {
      minPoints: 0,
      maxPoints: parseInt(process.env.ROOKIE_RIDER_MAX_POINTS || '499'),
      name: 'Rookie Rider',
      benefits: ['Starter Kit Digital'],
    },
    pro_racer: {
      minPoints: 500,
      maxPoints: parseInt(process.env.PRO_RACER_MAX_POINTS || '1499'),
      name: 'Pro Racer',
      benefits: ['Bonus poin', 'Tampil di media HPZ'],
    },
    hpz_legend: {
      minPoints: 1500,
      maxPoints: Infinity,
      name: 'HPZ Legend',
      benefits: ['Produk gratis', 'Event eksklusif'],
    },
  },

  // Mission Configuration
  missions: {
    approvalRequired: process.env.MISSION_APPROVAL_REQUIRED !== 'false',
    autoApprovalThreshold: parseInt(process.env.MISSION_AUTO_APPROVAL_THRESHOLD || '3'),
    maxSubmissionsPerDay: parseInt(process.env.MISSION_MAX_SUBMISSIONS_PER_DAY || '5'),
  },

  // Dashboard Integration
  dashboard: {
    baseUrl: process.env.DASHBOARD_BASE_URL || 'https://hpz-crew-dashboard.vercel.app',
    linkingUrl: process.env.DASHBOARD_LINKING_URL || '/link-discord',
    profileUrl: process.env.DASHBOARD_PROFILE_URL || '/profile',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const requiredVars = [
    'discord.token',
    'discord.clientId',
    'discord.guildId',
    'supabase.url',
    'supabase.anonKey',
  ];

  const missingVars = requiredVars.filter(varPath => {
    const keys = varPath.split('.');
    let value = config;
    for (const key of keys) {
      value = (value as any)[key];
    }
    return !value;
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}