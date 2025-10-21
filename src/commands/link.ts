import { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../types/discord';
import { integrationService } from '../services/integrationService';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embeds';
import { config } from '../config';
import { discordLogger } from '../utils/logger';

const linkCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link Discord account with your HPZ Crew dashboard'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Check if already linked
      const isLinked = await integrationService.isDiscordUserLinked(discordId);

      if (isLinked) {
        const { data: userStats } = await integrationService.getUserByDiscord(discordId);

        const embed = createSuccessEmbed(
          'Account Already Linked',
          `Your Discord account is already linked to:\n**Email:** ${userStats?.email}\n**Name:** ${userStats?.full_name || 'Not set'}\n\nUse \`/unlink\` if you want to unlink this account.`
        );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Create linking embed with instructions
      const embed = createSuccessEmbed(
        '🔗 Link Your Discord Account',
        `To link your Discord account with your HPZ Crew dashboard:\n\n` +
        `1️⃣ **Visit your HPZ Crew Dashboard**\n` +
        `   🔗 ${config.dashboard.baseUrl}${config.dashboard.linkingUrl}\n\n` +
        `2️⃣ **Click "Link Discord Account"**\n` +
        `   Authorize the Discord application\n\n` +
        `3️⃣ **You'll earn ${config.linking.welcomePoints} bonus points!** 🎉\n\n` +
        `Already have a linking code? Use the button below to enter it.`
      );

      // Add action buttons
      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('🌐 Open Dashboard')
            .setStyle(ButtonStyle.Link)
            .setURL(`${config.dashboard.baseUrl}${config.dashboard.linkingUrl}`),
          new ButtonBuilder()
            .setLabel('📝 Enter Code')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('enter_linking_code'),
          new ButtonBuilder()
            .setLabel('❓ Need Help')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('linking_help')
        );

      await interaction.editReply({
        embeds: [embed],
        components: [actionRow],
      });

      discordLogger.command('link', discordUser.tag, interaction.guild?.name || 'Unknown Guild');

    } catch (error) {
      discordLogger.error(error as Error, 'Link Command');
      if (!interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Error', 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.')],
        });
      }
    }
  },
};

export default linkCommand;