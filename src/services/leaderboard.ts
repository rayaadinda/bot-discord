import { Client, TextChannel } from 'discord.js';
import { supabaseService } from './supabase';
import { createLeaderboardEmbed } from '../utils/embeds';
import { config } from '../config';
import { discordLogger, logger } from '../utils/logger';
import * as cron from 'node-cron';

export class LeaderboardService {
  private client: Client;
  private updateJob?: cron.ScheduledTask;

  constructor(client: Client) {
    this.client = client;
  }

  public start(): void {
    // Update leaderboard every hour
    this.updateJob = cron.schedule('0 * * * *', async () => {
      await this.updateLeaderboard();
    });

    this.updateJob.start();
    logger.info('Leaderboard service started - updates every hour');

    // Initial update
    setTimeout(() => {
      this.updateLeaderboard();
    }, 5000); // Wait 5 seconds after bot start
  }

  public stop(): void {
    if (this.updateJob) {
      this.updateJob.stop();
      logger.info('Leaderboard service stopped');
    }
  }

  public async updateLeaderboard(): Promise<void> {
    try {
      const leaderboardChannelId = config.channels.leaderboard;
      if (!leaderboardChannelId) {
        logger.warn('Leaderboard channel ID not configured');
        return;
      }

      const channel = this.client.channels.cache.get(leaderboardChannelId) as TextChannel;
      if (!channel || !channel.isTextBased()) {
        logger.warn('Leaderboard channel not found or not text-based');
        return;
      }

      // Get leaderboard data
      const { data: leaderboardData, error } = await supabaseService.getLeaderboard(10);

      if (error) {
        logger.error('Error fetching leaderboard data:', error);
        return;
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        logger.info('No leaderboard data available');
        return;
      }

      // Create leaderboard embed
      const embed = createLeaderboardEmbed(leaderboardData);

      // Find or update the leaderboard message
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessage = messages.find(msg =>
        msg.author.id === this.client.user?.id &&
        msg.embeds.length > 0 &&
        msg.embeds[0]?.title?.includes('Leaderboard')
      );

      if (botMessage) {
        // Update existing message
        await botMessage.edit({ embeds: [embed] });
        logger.info('Leaderboard updated successfully');
      } else {
        // Send new message
        await channel.send({ embeds: [embed] });
        logger.info('New leaderboard message sent');
      }

    } catch (error) {
      discordLogger.error(error as Error, 'Leaderboard Update');
    }
  }

  public async getLeaderboardData(limit = 10) {
    try {
      const { data, error } = await supabaseService.getLeaderboard(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      discordLogger.error(error as Error, 'Get Leaderboard Data');
      return [];
    }
  }

  public async getUserRank(discordId: string): Promise<{ rank: number; data: any } | null> {
    try {
      // Get all users ordered by points
      const { data, error } = await supabaseService.getLeaderboard(100); // Get more users to find rank

      if (error || !data) {
        throw error || new Error('No data available');
      }

      // Find user's rank
      const userIndex = data.findIndex(user => user.discord_username === discordId);

      if (userIndex === -1) {
        return null;
      }

      return {
        rank: userIndex + 1,
        data: data[userIndex],
      };
    } catch (error) {
      discordLogger.error(error as Error, 'Get User Rank');
      return null;
    }
  }
}

// Singleton instance
let leaderboardService: LeaderboardService | null = null;

export function initializeLeaderboard(client: Client): LeaderboardService {
  if (!leaderboardService) {
    leaderboardService = new LeaderboardService(client);
    leaderboardService.start();
  }
  return leaderboardService;
}

export function getLeaderboardService(): LeaderboardService | null {
  return leaderboardService;
}