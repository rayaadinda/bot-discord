import { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../types/discord';
import { integrationService } from '../services/integrationService';
import { createSuccessEmbed, createErrorEmbed, createWarningEmbed } from '../utils/embeds';
import { discordLogger } from '../utils/logger';

const unlinkCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink Discord account from your HPZ Crew dashboard'),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const discordUser = interaction.user;
      const discordId = discordUser.id;

      // Check if account is linked
      const isLinked = await integrationService.isDiscordUserLinked(discordId);

      if (!isLinked) {
        const embed = createErrorEmbed(
          'Account Not Linked',
          'Your Discord account is not linked to any HPZ Crew dashboard account.\n\nUse `/link` to link your account first.'
        );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get current user info before unlinking
      const { data: userStats } = await integrationService.getUserByDiscord(discordId);

      // Create confirmation embed
      const embed = createWarningEmbed(
        '⚠️ Confirm Account Unlinking',
        `Are you sure you want to unlink your Discord account?\n\n` +
        `**Current Linked Account:**\n` +
        `📧 Email: ${userStats?.email}\n` +
        `👤 Name: ${userStats?.full_name || 'Not set'}\n` +
        `🏆 Points: ${userStats?.total_points?.toLocaleString() || '0'}\n\n` +
        `**Consequences:**\n` +
        `• You'll lose access to Discord-exclusive features\n` +
        `• Your Discord activity won't earn points\n` +
        `• You can always link again later\n\n` +
        `This action cannot be undone!`
      );

      // Add confirmation buttons
      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('✅ Yes, Unlink')
            .setStyle(ButtonStyle.Danger)
            .setCustomId('confirm_unlink'),
          new ButtonBuilder()
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('cancel_unlink')
        );

      await interaction.editReply({
        embeds: [embed],
        components: [actionRow],
      });

      // Set up a collector for button interactions
      const collector = interaction.channel?.createMessageComponentCollector({
        time: 60000, // 60 seconds
        filter: (i) => i.user.id === discordUser.id,
      });

      collector?.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'confirm_unlink') {
          try {
            // Perform unlink
            const success = await integrationService.unlinkDiscordAccount(discordId);

            if (success) {
              const successEmbed = createSuccessEmbed(
                '✅ Account Unlinked Successfully',
                `Your Discord account has been unlinked from your HPZ Crew dashboard.\n\n` +
                `You can always link again using \`/link\` if you change your mind!\n\n` +
                `Thank you for being part of HPZ Crew! 🏍️`
              );

              await buttonInteraction.update({
                embeds: [successEmbed],
                components: [],
              });

              discordLogger.command('unlink', discordUser.tag, interaction.guild?.name || 'Unknown Guild');
            } else {
              const errorEmbed = createErrorEmbed(
                'Unlinking Failed',
                'Failed to unlink your account. Please try again later or contact support.'
              );

              await buttonInteraction.update({
                embeds: [errorEmbed],
                components: [],
              });
            }
          } catch (error) {
            discordLogger.error(error as Error, 'Unlink Confirmation');
            await buttonInteraction.update({
              embeds: [createErrorEmbed('Error', 'An unexpected error occurred. Please try again.')],
              components: [],
            });
          }
        } else if (buttonInteraction.customId === 'cancel_unlink') {
          const cancelEmbed = createSuccessEmbed(
            '❌ Unlinking Cancelled',
            'Your account remains linked. Your Discord features and point earning capabilities are still active.'
          );

          await buttonInteraction.update({
            embeds: [cancelEmbed],
            components: [],
          });
        }

        collector.stop();
      });

      collector?.on('end', (collected) => {
        if (collected.size === 0) {
          // No interaction received, disable buttons
          const timeoutEmbed = createWarningEmbed(
            '⏰ Linking Session Expired',
            'The unlinking confirmation has expired. Please use `/unlink` again if you still want to unlink your account.'
          );

          interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
        }
      });

    } catch (error) {
      discordLogger.error(error as Error, 'Unlink Command');
      if (!interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Error', 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.')],
        });
      }
    }
  },
};

export default unlinkCommand;