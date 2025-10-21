import { GuildMember, TextChannel } from 'discord.js';
import { supabaseService } from '../services/supabase';
import { createWelcomeEmbed } from '../utils/embeds';
import { config } from '../config';
import { discordLogger } from '../utils/logger';

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    discordLogger.userJoin(member.user.tag, member.user.id, member.guild.name);

    // Check if user already exists in database
    const { data: existingUser, error: fetchError } = await supabaseService.getUser(member.user.id);

    if (fetchError) {
      discordLogger.error(fetchError, 'Welcome System - User Fetch');
      return;
    }

    // Create new user if doesn't exist
    if (!existingUser) {
      const newUser = {
        discord_id: member.user.id,
        discord_username: member.user.username,
        discord_discriminator: member.user.discriminator,
        points: 0,
        tier: 'rookie_rider' as const,
        join_date: new Date().toISOString(),
        last_active: new Date().toISOString(),
        total_content_submissions: 0,
        total_referrals: 0,
      };

      const { error: createError } = await supabaseService.createUser(newUser);

      if (createError) {
        discordLogger.error(createError, 'Welcome System - User Creation');
        return;
      }

      // Add welcome points
      await supabaseService.addPoints(
        member.user.id,
        10, // Welcome bonus points
        'welcome_bonus',
        'Selamat datang di HPZ Crew! 🎉'
      );

      discordLogger.pointsAwarded(member.user.username, 10, 'Welcome Bonus');
    } else {
      // Update last active for existing users
      await supabaseService.updateUser(member.user.id, {
        last_active: new Date().toISOString(),
        discord_username: member.user.username,
        discord_discriminator: member.user.discriminator,
      });
    }

    // Send welcome message
    const welcomeChannelId = config.channels.welcome;
    if (welcomeChannelId) {
      const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId) as TextChannel;

      if (welcomeChannel && welcomeChannel.isTextBased()) {
        const welcomeEmbed = createWelcomeEmbed(
          member.user.username,
          member.user.displayAvatarURL()
        );

        // Mention the new member
        const message = `🎉 Selamat datang ${member}!`;

        await welcomeChannel.send({
          content: message,
          embeds: [welcomeEmbed],
        });

        // Also send DM to new member
        try {
          const dmEmbed = createWelcomeEmbed(
            member.user.username,
            member.user.displayAvatarURL()
          );

          dmEmbed.setDescription(
            dmEmbed.data.description! +
            '\n\n**📞 Butuh bantuan?**\n' +
            '• Gunakan `/faq` untuk pertanyaan umum\n' +
            '• Hubungi admin di channel #support\n' +
            '• DM admin HPZ jika butuh bantuan personal'
          );

          await member.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          // User might have DMs disabled, log but don't fail
          discordLogger.error(dmError as Error, 'Welcome DM Failed');
        }
      } else {
        discordLogger.error(new Error('Welcome channel not found or not text-based'), 'Welcome System');
      }
    }

    // Try to assign initial role if configured
    try {
      // This would require a role ID configuration
      // const rookieRole = member.guild.roles.cache.get('ROOKIE_ROLE_ID');
      // if (rookieRole) {
      //   await member.roles.add(rookieRole);
      // }
    } catch (roleError) {
      discordLogger.error(roleError as Error, 'Welcome Role Assignment');
    }

  } catch (error) {
    discordLogger.error(error as Error, 'Welcome System');
  }
}