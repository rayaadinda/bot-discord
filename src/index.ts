import { Client, GatewayIntentBits, Events, ActivityType } from 'discord.js';
import { config, validateConfig } from './config';
import { logger, discordLogger } from './utils/logger';
import { integrationService } from './services/integrationService';

// Import health check for deployment monitoring
import './health';

// Import command handlers
import { registerCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { initializeIntegratedLeaderboard, getIntegratedLeaderboardService } from './services/integratedLeaderboard';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function main() {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated successfully');

    // Load events
    await loadEvents(client);
    logger.info('Events loaded successfully');

    // Register slash commands
    await registerCommands();
    logger.info('Slash commands registered successfully');

    // Login to Discord
    await client.login(config.discord.token);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Ready event
client.once(Events.ClientReady, async (readyClient) => {
  discordLogger.ready(
    readyClient.user?.tag || 'Unknown',
    readyClient.guilds.cache.size
  );

  // Set bot activity
  readyClient.user?.setActivity('HPZ Crew Community', { type: ActivityType.Watching });

  // Initialize services
  try {
    // Test database connection
    const isLinked = await integrationService.isDiscordUserLinked('test');
    logger.info('Integration service test successful');
  } catch (error) {
      logger.warn('Integration service test failed:', error);
    }

  // Initialize integrated leaderboard service
    try {
      initializeIntegratedLeaderboard(readyClient);
      logger.info('Integrated leaderboard service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize integrated leaderboard service:', error);
    }
});

// Error handling
client.on(Events.Error, (error) => {
  discordLogger.error(error, 'Client Error');
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');

  // Stop integrated leaderboard service
  const integratedLeaderboardService = getIntegratedLeaderboardService();
  if (integratedLeaderboardService) {
    integratedLeaderboardService.stop();
  }

  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');

  // Stop integrated leaderboard service
  const integratedLeaderboardService = getIntegratedLeaderboardService();
  if (integratedLeaderboardService) {
    integratedLeaderboardService.stop();
  }

  client.destroy();
  process.exit(0);
});

// Start the bot
main();