import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../types/discord';
import { supabaseService } from '../services/supabase';
import { createFAQEmbed, createErrorEmbed } from '../utils/embeds';
import { discordLogger, logger } from '../utils/logger';

const faqCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Tampilkan Frequently Asked Questions tentang HPZ Crew'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();

      // Get FAQs from database
      const { data: faqs, error: faqError } = await supabaseService.getActiveFAQs();

      if (faqError) {
        discordLogger.error(faqError, 'FAQ Command - FAQs Fetch');
        await interaction.editReply({
          embeds: [createErrorEmbed('Database Error', 'Gagal mengambil data FAQ. Silakan coba lagi nanti.')],
        });
        return;
      }

      // Debug logging to help diagnose the issue
      logger.info(`FAQ Debug - Found ${faqs?.length || 0} FAQs`, {
        faqsCount: faqs?.length || 0,
        sampleFAQ: faqs?.[0] ? {
          id: faqs[0].id,
          category: faqs[0].category,
          question: faqs[0].question,
          answer: faqs[0].answer ? `Length: ${faqs[0].answer.length}` : 'undefined'
        } : null
      });

      if (!faqs || faqs.length === 0) {
        // If no FAQs in database, provide default FAQs based on knowledge base
        const defaultFAQs = [
          {
            category: 'Registrasi & Keanggotaan',
            faqs: [
              {
                question: 'Bagaimana cara bergabung?',
                answer: 'Isi form "Join HPZ Crew" di halaman utama, lalu tunggu email konfirmasi dari tim HPZ. Setelah disetujui, kamu akan mendapat akses ke server Discord.',
              },
              {
                question: 'Apakah bergabung gratis?',
                answer: 'Ya, 100% gratis untuk semua rider, kreator, maupun penggemar otomotif. Tidak ada biaya pendaftaran atau keanggotaan.',
              },
            ],
          },
          {
            category: 'Poin & Tier',
            faqs: [
              {
                question: 'Bagaimana cara mendapatkan poin?',
                answer: 'Upload konten dengan hashtag resmi #RideWithPride (+50 poin), ajak teman (+100 poin), ikut challenge (+30 poin), hadir event (+40 poin), atau penjualan via afiliasi (+150 poin).',
              },
              {
                question: 'Apa saja keuntungan setiap tier?',
                answer: '🏁 Rookie Rider: Starter Kit Digital\n🏍️ Pro Racer: Bonus poin + tampil di media HPZ\n🏆 HPZ Legend: Produk gratis + event eksklusif',
              },
            ],
          },
          {
            category: 'Misi & Challenge',
            faqs: [
              {
                question: 'Bagaimana cara submit misi?',
                answer: 'Pilih misi yang tersedia, selesaikan sesuai requirements, lalu submit melalui channel #mission-submission dengan format yang ditentukan.',
              },
              {
                question: 'Kapan misi akan di-review?',
                answer: 'Misi akan di-review oleh admin HPZ dalam 1-3 hari kerja. Hasil review akan dikirim melalui DM atau diumumkan di channel khusus.',
              },
            ],
          },
        ];

        const embed = createFAQEmbed(defaultFAQs);
        embed.addFields({
          name: '🔞 Butuh bantuan lebih?',
          value: 'Hubungi admin HPZ melalui:\n• Channel #support\n• DM @admin\n• Email: crew@hpztv.com',
          inline: false,
        });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Group FAQs by category
      const groupedFAQs = faqs.reduce((groups, faq) => {
        if (!groups[faq.category]) {
          groups[faq.category] = [];
        }
        groups[faq.category]!.push(faq);
        return groups;
      }, {} as Record<string, any[]>);

      const embed = createFAQEmbed(faqs);

      // Add contact information
      embed.addFields({
        name: '📞 Butuh bantuan lebih?',
        value: 'Hubungi tim HPZ melalui:\n• Chatbot perintah `/hubungiadmin`\n• Email: **crew@hpztv.com**\n• Channel Discord: `#support`\n• Instagram DM: [@hpztv.official](https://instagram.com/hpztv.official)',
        inline: false,
      });

      embed.setFooter({ text: 'FAQ diperbarui secara berkala • Ride with Pride!' });

      await interaction.editReply({ embeds: [embed] });

      discordLogger.command('faq', interaction.user.tag, interaction.guild?.name || 'Unknown Guild');

    } catch (error) {
      discordLogger.error(error as Error, 'FAQ Command');
      if (!interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Error', 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.')],
        });
      }
    }
  },
};

export default faqCommand;