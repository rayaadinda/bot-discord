import { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../types/discord';
import { integrationService } from '../services/integrationService';
import { createSuccessEmbed, createErrorEmbed, createWarningEmbed } from '../utils/embeds';
import { config } from '../config';
import { discordLogger } from '../utils/logger';

const statusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your Discord account linking status and available features'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Check if account is linked
      const isLinked = await integrationService.isDiscordUserLinked(discordId);

      if (!isLinked) {
        const embed = createWarningEmbed(
          '🔓 Account Not Linked',
          `Your Discord account is not linked to your HPZ Crew dashboard.\n\n` +
          `**Available Features (Limited):**\n` +
          `✅ View FAQ and help information\n` +
          `✅ Basic bot information\n` +
          `❌ Earn points through Discord\n` +
          `❌ Submit missions\n` +
          `❌ View your point balance\n` +
          `❌ Access leaderboard features\n\n` +
          `**Get Full Access:**\n` +
          `Link your account to unlock all features and earn points! 🚀`
        );

        // Add link button
        const actionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('🔗 Link Account Now')
              .setStyle(ButtonStyle.Primary)
              .setURL(`${config.dashboard.baseUrl}${config.dashboard.linkingUrl}`),
            new ButtonBuilder()
              .setLabel('❓ Learn More')
              .setStyle(ButtonStyle.Secondary)
              .setCustomId('learn_linking')
          );

        await interaction.editReply({
          embeds: [embed],
          components: [actionRow],
        });

        return;
      }

      // Account is linked - show full status
      const { data: userStats } = await integrationService.getUserByDiscord(discordId);
      const { data: activities } = await integrationService.getUserActivities(discordId, 5);
      const userRank = await integrationService.getUserRank(discordId);

      if (!userStats) {
        const embed = createErrorEmbed(
          'Error',
          'Unable to retrieve your account information. Please try again later.'
        );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Create comprehensive status embed
      const embed = createSuccessEmbed(
        '✅ Account Linked - Full Access',
        `**Linked Dashboard Account:**\n` +
        `📧 **Email:** ${userStats.email}\n` +
        `👤 **Name:** ${userStats.full_name || 'Not set'}\n` +
        `📷 **Instagram:** ${userStats.instagram_handle || 'Not set'}\n` +
        `🔗 **Linked Since:** ${userStats.linked_at ? new Date(userStats.linked_at).toLocaleDateString('id-ID') : 'Unknown'}`
      );

      // Add points information
      embed.addFields({
        name: '🏆 Points Overview',
        value: `💰 **Total Points:** ${userStats.total_points.toLocaleString()}\n` +
               `📝 **Submission Points:** ${userStats.submission_points.toLocaleString()}\n` +
               `✅ **Approval Points:** ${userStats.approval_points.toLocaleString()}\n` +
               `💬 **Engagement Points:** ${userStats.engagement_points.toLocaleString()}\n` +
               `🎯 **Weekly Wins:** ${userStats.weekly_win_points.toLocaleString()}\n` +
               `🏅 **Leaderboard Rank:** #${userRank || 'N/A'}`,
        inline: false,
      });

      // Add Discord activity
      if (activities && activities.length > 0) {
        const recentActivity = activities
          .slice(0, 3)
          .map(activity => {
            const date = new Date(activity.created_at).toLocaleDateString('id-ID');
            const points = activity.points_awarded > 0 ? ` (+${activity.points_awarded} poin)` : '';
            return `• ${activity.activity_type.replace('_', ' ')}${points}`;
          })
          .join('\n');

        embed.addFields({
          name: '📊 Recent Discord Activity',
          value: recentActivity,
          inline: false,
        });
      }

      // Add available features
      embed.addFields({
        name: '🚀 Available Features',
        value: `✅ \`/point\` - View detailed points information\n` +
               `✅ \`/misi\` - View and submit missions\n` +
               `✅ \`/submit\` - Submit content directly\n` +
               `✅ \`/leaderboard\` - View rankings\n` +
               `✅ \`/unlink\` - Unlink account if needed`,
        inline: false,
      });

      // Add action buttons
      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('🏆 View Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('view_leaderboard'),
          new ButtonBuilder()
            .setLabel('📊 Dashboard Profile')
            .setStyle(ButtonStyle.Link)
            .setURL(`${config.dashboard.baseUrl}${config.dashboard.profileUrl}`),
          new ButtonBuilder()
            .setLabel('⚙️ Account Settings')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('account_settings')
        );

      await interaction.editReply({
        embeds: [embed],
        components: [actionRow],
      });

      discordLogger.command('status', discordUser.tag, interaction.guild?.name || 'Unknown Guild');

    } catch (error) {
      discordLogger.error(error as Error, 'Status Command');
      if (!interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Error', 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.')],
        });
      }
    }
  },
};

export default statusCommand;