import { Client, TextChannel } from 'discord.js';
import { integrationService } from './integrationService';
import { createLeaderboardEmbed } from '../utils/embeds';
import { config } from '../config';
import { discordLogger, logger } from '../utils/logger';
import * as cron from 'node-cron';
import { DiscordUserStats } from '../types/existing-database';

export class IntegratedLeaderboardService {
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
    logger.info('Integrated Leaderboard service started - updates every hour');

    // Initial update
    setTimeout(() => {
      this.updateLeaderboard();
    }, 10000); // Wait 10 seconds after bot start
  }

  public stop(): void {
    if (this.updateJob) {
      this.updateJob.stop();
      logger.info('Integrated Leaderboard service stopped');
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

      // Get leaderboard data from existing database
      const { data: leaderboardData, error } = await integrationService.getDiscordLeaderboard(10);

      if (error) {
        logger.error('Error fetching integrated leaderboard data:', error);
        return;
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        logger.info('No linked users for leaderboard display');

        // Display "no data" message
        const noDataEmbed = {
          title: '🏆 HPZ Crew Leaderboard',
          description: 'No linked users found. Link your Discord account using `/link` to appear on the leaderboard!',
          color: 0x7289da,
          footer: { text: 'Link your account to start earning points! 🚀' },
          timestamp: new Date().toISOString(),
        };

        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(msg =>
          msg.author.id === this.client.user?.id &&
          msg.embeds.length > 0 &&
          msg.embeds[0]?.title?.includes('Leaderboard')
        );

        if (botMessage) {
          await botMessage.edit({ embeds: [noDataEmbed] });
        } else {
          await channel.send({ embeds: [noDataEmbed] });
        }
        return;
      }

      // Create custom leaderboard embed with existing data
      const embed = this.createIntegratedLeaderboardEmbed(leaderboardData);

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
        logger.info('Integrated leaderboard updated successfully');
      } else {
        // Send new message
        await channel.send({ embeds: [embed] });
        logger.info('New integrated leaderboard message sent');
      }

    } catch (error) {
      discordLogger.error(error as Error, 'Integrated Leaderboard Update');
    }
  }

  private createIntegratedLeaderboardEmbed(leaderboardData: DiscordUserStats[]) {
    const embed = {
      title: '🏆 HPZ Crew Leaderboard',
      description: 'Top 10 linked Discord users with the most points from the dashboard',
      color: 0xffd700, // Gold color
      fields: [] as any[],
      footer: {
        text: 'Updated every hour • Link your account with /link to appear here! 🏍️',
      },
      timestamp: new Date().toISOString(),
    };

    // Create leaderboard entries
    const leaderboardText = leaderboardData
      .map((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        const discordUser = entry.discord_username ? `@${entry.discord_username}` : entry.full_name || 'Unknown';
        const tierEmoji = this.getTierEmoji(entry.total_points);

        return `${medal} **${index + 1}.** ${discordUser} - ${entry.total_points.toLocaleString()} poin ${tierEmoji}`;
      })
      .join('\n');

    embed.fields.push({
      name: '📊 Peringkat',
      value: leaderboardText,
      inline: false,
    });

    // Add statistics
    const totalPoints = leaderboardData.reduce((sum, entry) => sum + entry.total_points, 0);
    const avgPoints = Math.round(totalPoints / leaderboardData.length);

    embed.fields.push({
      name: '📈 Statistik',
      value: `**Total Pengguna Terhubung:** ${leaderboardData.length}\n**Total Poin:** ${totalPoints.toLocaleString()}\n**Rata-rata Poin:** ${avgPoints.toLocaleString()}`,
      inline: false,
    });

    // Add tier breakdown
    const tierBreakdown = this.getTierBreakdown(leaderboardData);
    embed.fields.push({
      name: '🏅 Tier Distribution',
      value: tierBreakdown,
      inline: false,
    });

    return embed;
  }

  private getTierEmoji(points: number): string {
    if (points >= 1500) return '🏆';
    if (points >= 500) return '🏍️';
    return '🏁';
  }

  private getTierName(points: number): string {
    if (points >= 1500) return 'HPZ Legend';
    if (points >= 500) return 'Pro Racer';
    return 'Rookie Rider';
  }

  private getTierBreakdown(leaderboardData: DiscordUserStats[]): string {
    const tierCounts = leaderboardData.reduce((counts, entry) => {
      const tierName = this.getTierName(entry.total_points);
      counts[tierName] = (counts[tierName] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(tierCounts)
      .map(([tier, count]) => `${this.getTierEmoji(this.getTierPoints(tier))} ${tier}: ${count}`)
      .join('\n');
  }

  private getTierPoints(tierName: string): number {
    switch (tierName) {
      case 'HPZ Legend': return 1500;
      case 'Pro Racer': return 500;
      default: return 0;
    }
  }

  public async getLeaderboardData(limit = 10) {
    try {
      const { data, error } = await integrationService.getDiscordLeaderboard(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      discordLogger.error(error as Error, 'Get Integrated Leaderboard Data');
      return [];
    }
  }

  public async getUserRank(discordId: string): Promise<{ rank: number; data: any } | null> {
    try {
      // Use the integration service to get user rank
      const rank = await integrationService.getUserRank(discordId);

      if (!rank) {
        return null;
      }

      const { data: userStats } = await integrationService.getUserByDiscord(discordId);

      return {
        rank,
        data: userStats,
      };
    } catch (error) {
      discordLogger.error(error as Error, 'Get User Rank (Integrated)');
      return null;
    }
  }

  public async getServerStats(): Promise<{
    totalLinkedUsers: number;
    totalPoints: number;
    activeUsersThisWeek: number;
  }> {
    try {
      const { data: allUsers } = await integrationService.getDiscordLeaderboard(100);

      if (!allUsers) {
        return {
          totalLinkedUsers: 0,
          totalPoints: 0,
          activeUsersThisWeek: 0,
        };
      }

      const totalLinkedUsers = allUsers.length;
      const totalPoints = allUsers.reduce((sum, user) => sum + user.total_points, 0);

      // Calculate active users this week (users with recent activity)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeUsersThisWeek = allUsers.filter(user =>
        user.last_sync_at && new Date(user.last_sync_at) > oneWeekAgo
      ).length;

      return {
        totalLinkedUsers,
        totalPoints,
        activeUsersThisWeek,
      };
    } catch (error) {
      discordLogger.error(error as Error, 'Get Server Stats');
      return {
        totalLinkedUsers: 0,
        totalPoints: 0,
        activeUsersThisWeek: 0,
      };
    }
  }
}

// Singleton instance
let integratedLeaderboardService: IntegratedLeaderboardService | null = null;

export function initializeIntegratedLeaderboard(client: Client): IntegratedLeaderboardService {
  if (!integratedLeaderboardService) {
    integratedLeaderboardService = new IntegratedLeaderboardService(client);
    integratedLeaderboardService.start();
  }
  return integratedLeaderboardService;
}

export function getIntegratedLeaderboardService(): IntegratedLeaderboardService | null {
  return integratedLeaderboardService;
}