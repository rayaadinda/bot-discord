import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../types/discord';
import { supabaseService } from '../services/supabase';
import { createMissionEmbed, createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { discordLogger } from '../utils/logger';

const misiCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('misi')
    .setDescription('Tampilkan semua misi yang tersedia dan progress kamu'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Get active missions
      const { data: missions, error: missionsError } = await supabaseService.getActiveMissions();

      if (missionsError) {
        discordLogger.error(missionsError, 'Misi Command - Missions Fetch');
        await interaction.editReply({
          embeds: [createErrorEmbed('Database Error', 'Gagal mengambil data misi. Silakan coba lagi nanti.')],
        });
        return;
      }

      // Get user's mission progress
      const { data: userMissions, error: userMissionsError } = await supabaseService.getUserMissions(discordId);

      if (userMissionsError) {
        discordLogger.error(userMissionsError, 'Misi Command - User Missions Fetch');
      }

      if (!missions || missions.length === 0) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Tidak Ada Misi', 'Saat ini tidak ada misi yang tersedia. Coba lagi nanti!')],
        });
        return;
      }

      // Create mission embed with user progress
      const embed = createMissionEmbed(missions);

      // Add user progress section
      if (userMissions && userMissions.length > 0) {
        const completedMissions = userMissions.filter(um => um.points_awarded > 0).length;
        const inProgressMissions = userMissions.filter(um => um.points_awarded === 0).length;

        embed.addFields({
          name: '📊 Progress Kamu',
          value: `✅ Misi Selesai: ${completedMissions}\n⏳ Misi dalam Review: ${inProgressMissions}`,
          inline: false,
        });
      }

      embed.addFields({
        name: '📝 Cara Submit Misi',
        value: '1. Pilih misi yang ingin dikerjakan\n2. Selesaikan sesuai requirements\n3. Submit melalui channel #mission-submission\n4. Tunggu review dari admin',
        inline: false,
      });

      await interaction.editReply({ embeds: [embed] });

      discordLogger.command('misi', discordUser.tag, interaction.guild?.name || 'Unknown Guild');

    } catch (error) {
      discordLogger.error(error as Error, 'Misi Command');
      if (!interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Error', 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.')],
        });
      }
    }
  },
};

export default misiCommand;