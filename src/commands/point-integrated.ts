import { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../types/discord';
import { integrationService } from '../services/integrationService';
import { createPointEmbed, createErrorEmbed, createWarningEmbed } from '../utils/embeds';
import { getTierInfo, getTierEmoji, formatTierName } from '../utils/tiers';
import { config } from '../config';
import { logger } from '../utils/logger';

const pointIntegratedCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('point')
    .setDescription('Tampilkan poin dan tier kamu saat ini'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Check if user is linked
      const isLinked = await integrationService.isDiscordUserLinked(discordId);

      if (!isLinked) {
        const embed = createWarningEmbed(
          '🔓 Account Not Linked',
          `Your Discord account is not linked to your HPZ Crew dashboard.\n\n` +
          `To view your points and unlock all features, please link your account first.\n\n` +
          `**What you'll get after linking:**\n` +
          `✅ View your complete point balance\n` +
          `✅ Track tier progression\n` +
          `✅ Submit missions and earn points\n` +
          `✅ Access exclusive Discord features\n` +
          `✅ Participate in leaderboard\n\n` +
          `Ready to link? Use the \`/link\` command! 🚀`
        );

        // Add quick link button
        const actionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('🔗 Link Account Now')
              .setStyle(ButtonStyle.Primary)
              .setCustomId('quick_link_account'),
            new ButtonBuilder()
              .setLabel('📖 Learn More')
              .setStyle(ButtonStyle.Secondary)
              .setCustomId('learn_about_linking')
          );

        await interaction.editReply({
          embeds: [embed],
          components: [actionRow],
        });

        logger.info(`Command executed: point by ${discordUser.tag} in ${interaction.guild?.name || 'Unknown Guild'}`);
        return;
      }

      // User is linked - get full information
      const { data: userStats, error: userError } = await integrationService.getUserByDiscord(discordId);

      if (userError || !userStats) {
        logger.error(`Point Command - User Fetch: ${userError}`);
        await interaction.editReply({
          embeds: [createErrorEmbed('Database Error', 'Gagal mengambil data pengguna. Silakan coba lagi nanti.')],
        });
        return;
      }

      // Get activities and rank with fallback handling
      let activities = null;
      let userRank = null;

      try {
        const activitiesResult = await integrationService.getUserActivities(discordId, 5);
        if (!activitiesResult.error) {
          activities = activitiesResult.data;
        }
      } catch (error) {
        logger.error(`Point Command - Activities Fetch: ${error}`);
      }

      try {
        userRank = await integrationService.getUserRank(discordId);
      } catch (error) {
        logger.error(`Point Command - Rank Fetch: ${error}`);
      }

      // Get detailed tier information
      const tierInfo = getTierInfo(userStats.total_points);
      const currentTierEmoji = getTierEmoji(calculateTier(userStats.total_points));
      const currentTierName = formatTierName(calculateTier(userStats.total_points));

      // Create comprehensive points embed
      const embed = createPointEmbed(
        discordUser.username,
        userStats.total_points,
        calculateTier(userStats.total_points),
        activities || []
      );

      // Update embed with linked account information
      embed.setTitle(`${currentTierEmoji} Status Poin ${userStats.full_name || discordUser.username}`)
        .setDescription(
          `**Linked Account:** ${userStats.email}\n` +
          `**Instagram:** ${userStats.instagram_handle || 'Not connected'}\n` +
          `**Total Poin:** ${userStats.total_points.toLocaleString()}`
        );

      // Add detailed point breakdown
      embed.addFields({
        name: '💰 Point Breakdown',
        value: `• **Submission Points:** ${userStats.submission_points.toLocaleString()}\n` +
               `• **Approval Points:** ${userStats.approval_points.toLocaleString()}\n` +
               `• **Engagement Points:** ${userStats.engagement_points.toLocaleString()}\n` +
               `• **Weekly Wins:** ${userStats.weekly_win_points.toLocaleString()}\n` +
               `• **Discord Activities:** ${userStats.discord_activities || 0}`,
        inline: false,
      });

      // Add ranking and tier progress
      embed.addFields({
        name: '📊 Statistics',
        value: `**Current Tier:** ${currentTierEmoji} ${currentTierName}\n` +
               `**Leaderboard Rank:** #${userRank || 'N/A'}\n` +
               `**Tier Progress:** ${tierInfo.progress.toFixed(1)}%\n` +
               `**Account Linked:** ${userStats.linked_at ? new Date(userStats.linked_at).toLocaleDateString('id-ID') : 'Unknown'}`,
        inline: false,
      });

      // Add recent activity with points
      if (activities && activities.length > 0) {
        const activityText = activities
          .filter(activity => activity.points_awarded > 0)
          .slice(0, 3)
          .map(activity => {
            const date = new Date(activity.created_at).toLocaleDateString('id-ID');
            return `• ${activity.activity_type.replace('_', ' ')}: +${activity.points_awarded} poin (${date})`;
          })
          .join('\n');

        if (activityText) {
          embed.addFields({
            name: '📜 Recent Point Activity',
            value: activityText,
            inline: false,
          });
        }
      }

      // Add quick action buttons
      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('📈 View Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('view_leaderboard_from_points'),
          new ButtonBuilder()
            .setLabel('🎯 View Missions')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('view_missions_from_points'),
          new ButtonBuilder()
            .setLabel('⚙️ Account Settings')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('account_settings_from_points')
        );

      embed.setFooter({ text: 'Points sync with your dashboard • Use /status for more details' });
      embed.setThumbnail(discordUser.displayAvatarURL());

      await interaction.editReply({
        embeds: [embed],
        components: [actionRow],
      });

      logger.info(`Command executed: point by ${discordUser.tag} in ${interaction.guild?.name || 'Unknown Guild'}`);

    } catch (error) {
      logger.error(`Point Command: ${error}`);
      if (!interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Error', 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.')],
        });
      }
    }
  },
};

// Helper function to calculate tier
function calculateTier(points: number): string {
  if (points >= 1500) return 'hpz_legend';
  if (points >= 500) return 'pro_racer';
  return 'rookie_rider';
}

export default pointIntegratedCommand;