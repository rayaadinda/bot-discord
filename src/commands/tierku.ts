import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../types/discord';
import { supabaseService } from '../services/supabase';
import { createTierEmbed, createErrorEmbed } from '../utils/embeds';
import { getTierInfo, getTierEmoji, formatTierName } from '../utils/tiers';
import { discordLogger } from '../utils/logger';

const tierkuCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('tierku')
    .setDescription('Tampilkan informasi tier dan benefit kamu saat ini'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Get user data from database
      const { data: userData, error: userError } = await supabaseService.getUser(discordId);

      if (userError) {
        discordLogger.error(userError, 'Tierku Command - User Fetch');
        await interaction.editReply({
          embeds: [createErrorEmbed('Database Error', 'Gagal mengambil data pengguna. Silakan coba lagi nanti.')],
        });
        return;
      }

      if (!userData) {
        await interaction.editReply({
          embeds: [createErrorEmbed('User Not Found', 'Kamu belum terdaftar di sistem. Gunakan /point untuk mendaftar.')],
        });
        return;
      }

      // Ensure points data exists
      const userPoints = userData.points || 0;
      const userTier = userData.tier || 'rookie_rider';

      // Get detailed tier information
      const tierInfo = getTierInfo(userPoints);
      const currentTierEmoji = getTierEmoji(userTier);
      const currentTierName = formatTierName(userTier);

      // Create tier embed with safe points value
      const embed = createTierEmbed(userPoints);

      // Add user-specific information
      embed.addFields({
        name: '📊 Status Kamu',
        value: `**Tier:** ${currentTierEmoji} ${currentTierName}\n**Poin Saat Ini:** ${userPoints.toLocaleString()}\n**Progress dalam Tier:** ${tierInfo.progress.toFixed(1)}%`,
        inline: false,
      });

      // Add current tier benefits
      const currentTierBenefits = tierInfo.benefits.map(benefit => `• ${benefit}`).join('\n');
      embed.addFields({
        name: `🎁 Benefit ${currentTierName}`,
        value: currentTierBenefits,
        inline: true,
      });

      // Add next tier information if applicable
      if (tierInfo.nextTier) {
        const nextTierEmoji = getTierEmoji(calculateTier(userPoints + tierInfo.nextTier.pointsNeeded));
        embed.addFields({
          name: `🎯 Target: ${nextTierEmoji} ${tierInfo.nextTier.name}`,
          value: `**Poin Dibutuhkan:** ${tierInfo.nextTier.pointsNeeded.toLocaleString()}\n**Benefits Berikutnya:**\n${tierInfo.nextTier.benefits.map(b => `• ${b}`).join('\n')}`,
          inline: true,
        });
      } else {
        embed.addFields({
          name: '🏆 Max Tier!',
          value: 'Kamu sudah mencapai tier tertinggi! Terus pertahankan performa kamu.',
          inline: true,
        });
      }

      // Add additional stats
      embed.addFields({
        name: '📈 Statistik Lengkap',
        value: `• Total Konten: ${userData.total_content_submissions}\n• Total Referral: ${userData.total_referrals}\n• Bergabung: ${new Date(userData.join_date).toLocaleDateString('id-ID')}`,
        inline: false,
      });

      embed.setThumbnail(discordUser.displayAvatarURL());
      embed.setFooter({ text: 'Gunakan /upgrade untuk cara naik tier • Ride with Pride!' });

      await interaction.editReply({ embeds: [embed] });

      discordLogger.command('tierku', discordUser.tag, interaction.guild?.name || 'Unknown Guild');

    } catch (error) {
      discordLogger.error(error as Error, 'Tierku Command');
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

export default tierkuCommand;