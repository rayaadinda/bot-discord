import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { getTierEmoji, formatTierName } from './tiers';

export const colors = {
  primary: 0x0099ff, // Blue
  success: 0x00ff00, // Green
  warning: 0xffaa00, // Yellow
  error: 0xff0000, // Red
  info: 0x7289da, // Discord blurple
  rookie: 0x808080, // Gray
  pro: 0xc0c0c0, // Silver
  legend: 0xffd700, // Gold
};

export function createWelcomeEmbed(username: string, avatarUrl?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`👋 Selamat datang di HPZ Crew, ${username}!`)
    .setDescription(
      'Selamat bergabung dengan komunitas HPZ Crew! 🏍️\n\n' +
      '**Langkah pertama kamu:**\n' +
      '• Lihat misi yang tersedia dengan `/misi`\n' +
      '• Cek poin kamu dengan `/point`\n' +
      '• Pelajari tier system dengan `/tierku`\n\n' +
      'Ride with Pride — Grow Together as HPZ Crew! 🚀'
    )
    .setThumbnail(avatarUrl || null)
    .addFields(
      { name: '📚 Panduan', value: 'Gunakan `/faq` untuk melihat panduan lengkap', inline: true },
      { name: '🏆 Poin & Tier', value: 'Kumpulkan poin dan naik level untuk dapatkan reward!', inline: true }
    )
    .setFooter({ text: 'HPZ Crew - Komunitas Otomotif Digital Indonesia' })
    .setTimestamp();
}

export function createPointEmbed(username: string, points: number, tier: string, pointHistory: any[]): EmbedBuilder {
  const tierEmoji = getTierEmoji(tier);
  const tierName = formatTierName(tier);

  return new EmbedBuilder()
    .setColor(colors[tier as keyof typeof colors] || colors.info)
    .setTitle(`${tierEmoji} Status Poin ${username}`)
    .setDescription(
      `**Tier Saat Ini:** ${tierEmoji} ${tierName}\n` +
      `**Total Poin:** ${points.toLocaleString()}`
    )
    .addFields(
      { name: '📊 Statistik', value: `Tier: ${tierName}\nPoin: ${points.toLocaleString()}`, inline: true },
      { name: '🎯 Target', value: 'Gunakan `/upgrade` untuk lihat syarat naik tier', inline: true }
    )
    .setTimestamp();
}

export function createMissionEmbed(missions: any[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(colors.info)
    .setTitle('📋 Misi yang Tersedia')
    .setDescription('Berikut adalah misi yang bisa kamu kerjakan untuk mendapatkan poin:');

  if (!missions || missions.length === 0) {
    embed.addFields({
      name: 'ℹ️ Informasi',
      value: 'Saat ini tidak ada misi yang tersedia. Silakan coba lagi nanti!',
      inline: false,
    });
    embed.setFooter({ text: 'Misi akan diperbarui secara berkala' });
    embed.setTimestamp();
    return embed;
  }

  // Group missions by activity type
  const missionGroups = missions.reduce((groups, mission) => {
    const type = mission.activity_type || 'general';
    if (!groups[type]) groups[type] = [];
    groups[type].push(mission);
    return groups;
  }, {});

  // Add fields for each mission type
  Object.entries(missionGroups).forEach(([type, missionList]) => {
    const missions = missionList as any[];
    const missionText = missions
      .map(mission => `• **${mission.name}** - ${mission.point_reward} poin\n  ${mission.description || 'Tidak ada deskripsi'}`)
      .join('\n');

    embed.addFields({
      name: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      value: missionText || 'Tidak ada misi tersedia',
      inline: false,
    });
  });

  embed.setFooter({ text: 'Gunakan perintah khusus untuk submit misi' });
  embed.setTimestamp();

  return embed;
}

export function createFAQEmbed(faqs: any[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(colors.info)
    .setTitle('❓ Frequently Asked Questions')
    .setDescription('Pertanyaan yang sering diajukan tentang HPZ Crew:');

  // Filter out FAQs with undefined or empty question/answer
  const validFaqs = faqs.filter(faq =>
    faq &&
    faq.category &&
    faq.question &&
    faq.answer &&
    faq.question !== 'undefined' &&
    faq.answer !== 'undefined'
  );

  // Group FAQs by category
  const faqGroups = validFaqs.reduce((groups, faq) => {
    if (!groups[faq.category]) groups[faq.category] = [];
    groups[faq.category].push(faq);
    return groups;
  }, {});

  // Add fields for each category
  Object.entries(faqGroups).forEach(([category, faqList]) => {
    const faqs = faqList as any[];
    const faqText = faqs
      .map(faq => `**Q: ${faq.question}**\nA: ${faq.answer}`)
      .join('\n\n');

    embed.addFields({
      name: category,
      value: faqText,
      inline: false,
    });
  });

  // If no valid FAQs found, add a helpful message
  if (Object.keys(faqGroups).length === 0) {
    embed.addFields({
      name: 'ℹ️ Informasi',
      value: 'FAQ sedang dalam pembaruan. Silakan hubungi admin untuk bantuan lebih lanjut.',
      inline: false,
    });
  }

  embed.setFooter({ text: 'Butuh bantuan lebih? Hubungi admin dengan /hubungiadmin' });
  embed.setTimestamp();

  return embed;
}

export function createTierEmbed(points: number): EmbedBuilder {
  // Defensive programming - ensure points is a valid number
  const safePoints = typeof points === 'number' && !isNaN(points) ? points : 0;
  const tierEmoji = getTierEmoji(calculateTier(safePoints));
  const tierName = formatTierName(calculateTier(safePoints));

  return new EmbedBuilder()
    .setColor(colors[calculateTier(safePoints) as keyof typeof colors] || colors.info)
    .setTitle(`${tierEmoji} Tier Information`)
    .setDescription(
      `**Tier Saat Ini:** ${tierEmoji} ${tierName}\n` +
      `**Total Poin:** ${safePoints.toLocaleString()}`
    )
    .addFields(
      { name: '🏁 Rookie Rider (0-499 poin)', value: '• Starter Kit Digital', inline: true },
      { name: '🏍️ Pro Racer (500-1499 poin)', value: '• Bonus poin\n• Tampil di media HPZ', inline: true },
      { name: '🏆 HPZ Legend (1500+ poin)', value: '• Produk gratis\n• Event eksklusif', inline: true }
    )
    .setFooter({ text: 'Gunakan /upgrade untuk melihat cara naik tier' })
    .setTimestamp();
}

export function createLeaderboardEmbed(leaderboard: any[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(colors.legend)
    .setTitle('🏆 Leaderboard HPZ Crew')
    .setDescription('Top 10 anggota dengan poin tertinggi:');

  const leaderboardText = leaderboard
    .map((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
      const tierEmoji = getTierEmoji(entry.tier);
      return `${medal} **${index + 1}.** ${entry.discord_username} - ${entry.points.toLocaleString()} poin ${tierEmoji}`;
    })
    .join('\n');

  embed.addFields({
    name: '📊 Peringkat',
    value: leaderboardText || 'Belum ada data',
    inline: false,
  });

  embed.setFooter({ text: 'Update otomatis setiap jam • Ride with Pride!' });
  embed.setTimestamp();

  return embed;
}

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(colors.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function createWarningEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(colors.warning)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

// Helper function to calculate tier (duplicate from tiers.ts to avoid circular imports)
function calculateTier(points: number): string {
  if (points >= 1500) return 'hpz_legend';
  if (points >= 500) return 'pro_racer';
  return 'rookie_rider';
}