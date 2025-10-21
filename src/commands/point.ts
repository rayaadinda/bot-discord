import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../types/discord';
import { supabaseService } from '../services/supabase';
import { createPointEmbed, createErrorEmbed } from '../utils/embeds';
import { discordLogger } from '../utils/logger';

const pointCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('point')
    .setNameLocalizations({
      id: 'point',
    })
    .setDescription('Tampilkan poin dan tier kamu saat ini')
    .setDescriptionLocalizations({
      id: 'Tampilkan poin dan tier kamu saat ini',
    }),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Get user data from database
      const { data: userData, error: userError } = await supabaseService.getUser(discordId);

      if (userError) {
        discordLogger.error(userError, 'Point Command - User Fetch');
        await interaction.editReply({
          embeds: [createErrorEmbed('Database Error', 'Gagal mengambil data pengguna. Silakan coba lagi nanti.')],
        });
        return;
      }

      if (!userData) {
        // User not found in database, create new user
        const newUser = {
          discord_id: discordId,
          discord_username: discordUser.username,
          discord_discriminator: discordUser.discriminator,
          points: 0,
          tier: 'rookie_rider' as const,
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_content_submissions: 0,
          total_referrals: 0,
        };

        const { data: createdUser, error: createError } = await supabaseService.createUser(newUser);

        if (createError) {
          discordLogger.error(createError, 'Point Command - User Creation');
          await interaction.editReply({
            embeds: [createErrorEmbed('Registration Error', 'Gagal mendaftarkan pengguna baru. Silakan coba lagi nanti.')],
          });
          return;
        }

        await interaction.editReply({
          embeds: [createPointEmbed(
            discordUser.username,
            0,
            'rookie_rider',
            []
          )],
        });

        discordLogger.pointsAwarded(discordUser.username, 0, 'Initial Registration');
        return;
      }

      // Get user's point history
      const { data: pointHistory, error: historyError } = await supabaseService.getUserPointHistory(discordId, 5);

      if (historyError) {
        discordLogger.error(historyError, 'Point Command - Point History');
      }

      // Update last active timestamp
      await supabaseService.updateUser(discordId, {
        last_active: new Date().toISOString(),
      });

      // Create and send embed
      const embed = createPointEmbed(
        userData.discord_username,
        userData.points,
        userData.tier,
        pointHistory || []
      );

      // Add point history if available
      if (pointHistory && pointHistory.length > 0) {
        const historyText = pointHistory
          .map(transaction => {
            const description = transaction.activity_data?.description || transaction.activity_type;
            const amount = transaction.points_awarded || 0;
            return `• ${description}: +${amount} poin`;
          })
          .join('\n');

        embed.addFields({
          name: '📜 Riwayat Terbaru',
          value: historyText,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });

      discordLogger.command('point', discordUser.tag, interaction.guild?.name || 'Unknown Guild');

    } catch (error) {
      discordLogger.error(error as Error, 'Point Command');
      if (!interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Error', 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.')],
        });
      }
    }
  },
};

export default pointCommand;