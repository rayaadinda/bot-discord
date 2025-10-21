import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../types/discord';
import { supabaseService } from '../services/supabase';
import { createErrorEmbed } from '../utils/embeds';
import { getTierInfo, getTierEmoji, formatTierName } from '../utils/tiers';
import { config } from '../config';
import { discordLogger } from '../utils/logger';
import { EmbedBuilder } from 'discord.js';

const upgradeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('upgrade')
    .setDescription('Tampilkan cara dan syarat untuk naik tier'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Get user data from database
      const { data: userData, error: userError } = await supabaseService.getUser(discordId);

      if (userError) {
        discordLogger.error(userError, 'Upgrade Command - User Fetch');
        await interaction.editReply({
          embeds: [createErrorEmbed('Database Error', 'Gagal mengambil data pengguna. Silakan coba lagi nanti.')],
        });
        return;
      }

      const userPoints = userData?.points || 0;
      const currentTier = userData ? calculateTier(userPoints) : 'rookie_rider';
      const tierInfo = getTierInfo(userPoints);

      // Create upgrade guide embed
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📈 Panduan Upgrade Tier HPZ Crew')
        .setDescription('Cara naik tier dan dapatkan benefit lebih banyak!');

      // Current status
      const currentTierEmoji = getTierEmoji(currentTier);
      embed.addFields({
        name: '📍 Status Saat Ini',
        value: `**Tier:** ${currentTierEmoji} ${formatTierName(currentTier)}\n**Poin Kamu:** ${userPoints.toLocaleString()}\n**Progress:** ${tierInfo.progress.toFixed(1)}%`,
        inline: false,
      });

      // Upgrade path based on current tier
      if (currentTier === 'rookie_rider') {
        embed.addFields({
          name: '🎯 Target: 🏍️ Pro Racer (500 poin)',
          value: `**Poin dibutuhkan:** ${(500 - userPoints).toLocaleString()}\n\n**Cara dapat poin:**\n• Upload konten (+${config.points.content} poin)\n• Ajak teman (+${config.points.referral} poin)\n• Ikut challenge (+${config.points.weeklyChallenge} poin)\n• Hadir event (+${config.points.eventAttendance} poin)\n• Penjualan afiliasi (+${config.points.affiliateSale} poin)`,
          inline: false,
        });

        embed.addFields({
          name: '🎁 Benefit Pro Racer',
          value: '• Bonus poin eksklusif\n• Kesempatan tampil di media HPZ\n• Akses ke challenge khusus\n• Reward tier bulanan',
          inline: false,
        });
      } else if (currentTier === 'pro_racer') {
        embed.addFields({
          name: '🎯 Target: 🏆 HPZ Legend (1500 poin)',
          value: `**Poin dibutuhkan:** ${(1500 - userPoints).toLocaleString()}\n\n**Strategi cepat naik tier:**\n• Fokus pada konten berkualitas (+${config.points.content} poin)\n• Program afiliasi sangat efektif (+${config.points.affiliateSale} poin)\n• Ajak banyak teman bergabung (+${config.points.referral} poin)\n• Aktif di semua event HPZ`,
          inline: false,
        });

        embed.addFields({
          name: '🏆 Benefit HPZ Legend',
          value: '• Produk gratis dari HPZ\n• Akses event eksklusif\n• Meet & greet dengan tim HPZ\n• Kolaborasi konten khusus\n• Opportunity jadi brand ambassador',
          inline: false,
        });
      } else {
        embed.addFields({
          name: '🏆 Kamu sudah MAX TIER!',
          value: 'Selamat! Kamu sudah mencapai tier tertinggi. Terus pertahankan kontribusi kamu dan nikmati semua benefit eksklusif HPZ Legend!',
          inline: false,
        });
      }

      // Recommended actions
      embed.addFields({
        name: '💡 Tips Cepat Naik Tier',
        value: '1. **Konsistensi** Upload konten berkualitas setiap minggu\n2. **Kolaborasi** Ajak teman-teman otomotif bergabung\n3. **Engagement** Ikuti semua challenge dan event\n4. **Kreativitas** Buat konten unik dan menarik\n5. **Networking** Bangun relasi dengan anggota lain',
        inline: false,
      });

      // Quick actions
      embed.addFields({
        name: '🚀 Aksi Cepat',
        value: '• `/misi` - Lihat misi yang tersedia\n• `/point` - Cek poin terkini\n• `/faq` - Baca panduan lengkap\n• Join channel #mission-tips untuk strategi',
        inline: false,
      });

      embed.setThumbnail(discordUser.displayAvatarURL());
      embed.setFooter({ text: 'Ride with Pride - Every point counts! 🏍️' });
      embed.setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      discordLogger.command('upgrade', discordUser.tag, interaction.guild?.name || 'Unknown Guild');

    } catch (error) {
      discordLogger.error(error as Error, 'Upgrade Command');
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

export default upgradeCommand;