import { GuildMember, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { integrationService } from '../services/integrationService';
import { createWelcomeEmbed } from '../utils/embeds';
import { createSuccessEmbed } from '../utils/embeds';
import { config } from '../config';
import { discordLogger } from '../utils/logger';

export async function handleIntegratedGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    discordLogger.command('Guild Member Add', member.user.tag, member.guild.name);

    // Check if user already exists in our system
    const isLinked = await integrationService.isDiscordUserLinked(member.user.id);

    // Send welcome message
    const welcomeChannelId = config.channels.welcome;
    if (welcomeChannelId) {
      const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId) as TextChannel;

      if (welcomeChannel && welcomeChannel.isTextBased()) {
        if (isLinked) {
          // User is already linked - welcome back
          await sendLinkedWelcomeMessage(welcomeChannel, member);
        } else {
          // User is not linked - encourage linking
          await sendUnlinkedWelcomeMessage(welcomeChannel, member);
        }
      } else {
        discordLogger.error(new Error('Welcome channel not found or not text-based'), 'Welcome System');
      }
    }

    // Send DM to new member
    try {
      if (isLinked) {
        await sendLinkedUserDM(member);
      } else {
        await sendUnlinkedUserDM(member);
      }
    } catch (dmError) {
      // User might have DMs disabled, log but don't fail
      discordLogger.error(dmError as Error, 'Welcome DM Failed');
    }

  } catch (error) {
    discordLogger.error(error as Error, 'Integrated Welcome System');
  }
}

async function sendLinkedWelcomeMessage(channel: TextChannel, member: GuildMember): Promise<void> {
  const { data: userStats } = await integrationService.getUserByDiscord(member.user.id);

  const embed = createSuccessEmbed(
    `👋 Welcome back to HPZ Crew, ${member.user.username}!`,
    `We see you're already part of our community! 🎉\n\n` +
    `**Your Account Status:**\n` +
    `✅ Discord account linked\n` +
    `📧 Dashboard: ${userStats?.email}\n` +
    `🏆 Points: ${userStats?.total_points?.toLocaleString() || '0'}\n\n` +
    `**Quick Actions:**\n` +
    `• Use \`/status\` to see your full account details\n` +
    `• Use \`/point\` to check your point balance\n` +
    `• Use \`/submit\` to share your content\n` +
    `• Use \`/misi\` to see available missions\n\n` +
    `Ride with Pride — Grow Together as HPZ Crew! 🏍️🚀`
  );

  embed.setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: `Account linked • ${userStats?.total_points || 0} points earned` })
    .setTimestamp();

  await channel.send({ content: `🎉 ${member}`, embeds: [embed] });
}

async function sendUnlinkedWelcomeMessage(channel: TextChannel, member: GuildMember): Promise<void> {
  const embed = createWelcomeEmbed(member.user.username, member.user.displayAvatarURL());

  // Add linking section to the welcome embed
  embed.addFields({
    name: '🔗 Unlock Full Features',
    value: `Link your Discord account with your HPZ Crew dashboard to:\n` +
           `✅ Earn points through Discord activities\n` +
           `✅ Submit content and missions\n` +
           `✅ Access exclusive features\n` +
           `✅ Appear on the leaderboard\n\n` +
           `**Get Started:**\n` +
           `1. Use \`/link\` to connect your account\n` +
           `2. Earn **${config.linking.welcomePoints} bonus points** for linking!\n` +
           `3. Start your HPZ Crew journey! 🚀`,
    inline: false,
  });

  // Add quick action button
  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Link Account Now')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('welcome_link_account'),
      new ButtonBuilder()
        .setLabel('📖 Learn More')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('welcome_learn_more')
    );

  await channel.send({ content: `👋 Welcome ${member}!`, embeds: [embed], components: [actionRow] });
}

async function sendLinkedUserDM(member: GuildMember): Promise<void> {
  const { data: userStats } = await integrationService.getUserByDiscord(member.user.id);

  const embed = createSuccessEmbed(
    '🎉 Welcome to HPZ Crew Discord!',
    `Your Discord account is already linked with your dashboard! 🚀\n\n` +
    `**Your Account:**\n` +
    `📧 Email: ${userStats?.email}\n` +
    `🏆 Total Points: ${userStats?.total_points?.toLocaleString() || '0'}\n` +
    `📊 Current Tier: ${userStats?.total_points && userStats.total_points >= 1500 ? 'HPZ Legend' : userStats?.total_points && userStats.total_points >= 500 ? 'Pro Racer' : 'Rookie Rider'}\n\n` +
    `**Available Commands:**\n` +
    `• \`/status\` - Full account overview\n` +
    `• \`/point\` - Detailed point information\n` +
    `• \`/submit\` - Submit content for points\n` +
    `• \`/misi\` - View available missions\n\n` +
    `**Need Help?**\n` +
    `• Use \`/faq\` for frequently asked questions\n` +
    `• Contact admin in #support channel\n` +
    `• Check your dashboard for more details\n\n` +
    `Happy to have you with us! 🏍️✨`
  );

  embed.setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: 'HPZ Crew • Ride with Pride!' })
    .setTimestamp();

  await member.send({ embeds: [embed] });
}

async function sendUnlinkedUserDM(member: GuildMember): Promise<void> {
  const embed = createWelcomeEmbed(member.user.username, member.user.displayAvatarURL());

  embed.setDescription(
    embed.data.description! +
    '\n\n**🔗 Important Next Step:**\n' +
    'Link your Discord account to unlock all features and earn points!\n\n' +
    '**What you get after linking:**\n' +
    '✅ **10 bonus points** just for linking!\n' +
    '✅ Submit content and earn points\n' +
    '✅ Participate in community missions\n' +
    '✅ Access exclusive Discord features\n' +
    '✅ Appear on the leaderboard\n\n' +
    '**How to link:**\n' +
    '1. Use the `/link` command in Discord\n' +
    '2. Or visit your HPZ Crew dashboard\n' +
    '3. Authorize Discord connection\n' +
    '4. Start earning points right away! 🚀'
  );

  embed.addFields({
    name: '📞 Need Help?',
    value: '• Use `/link` to start the linking process\n' +
           '• Use `/faq` for common questions\n' +
           '• Ask in #support channel for assistance\n' +
           '• DM admin if you need personal help',
    inline: false,
  });

  // Add quick link button
  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Link Account Now')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('dm_link_account')
    );

  try {
    await member.send({ embeds: [embed], components: [actionRow] });
  } catch (error) {
    // If DM fails, fallback to channel message
    discordLogger.error(error as Error, 'DM Failed - User might have DMs disabled');
  }
}