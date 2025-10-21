import { Client, Events, GuildMember } from 'discord.js';
import { handleCommand } from './commandHandler';
import { handleIntegratedGuildMemberAdd } from '../events/guildMemberAdd-integrated';
import { discordLogger, logger } from '../utils/logger';

export async function loadEvents(client: Client): Promise<void> {
  // Handle interaction create (slash commands)
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    await handleCommand(interaction);
  });

  // Handle guild member add (welcome messages)
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      await handleIntegratedGuildMemberAdd(member);
    } catch (error) {
      discordLogger.error(error as Error, 'Guild Member Add Event');
    }
  });

  // Handle guild member remove
  client.on(Events.GuildMemberRemove, async (member) => {
    discordLogger.error(
      new Error('Guild Member Remove'),
      `User left guild`
    );
  });

  // Handle guild create (bot joins a new server)
  client.on(Events.GuildCreate, async (guild) => {
    discordLogger.guildJoin(guild.name, guild.id);
  });

  // Handle guild delete (bot leaves a server)
  client.on(Events.GuildDelete, async (guild) => {
    discordLogger.guildLeave(guild.name, guild.id);
  });

  // Handle message reactions (for mission submissions)
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    // Handle mission submission reactions if needed
    if (user.bot) return;

    // This can be expanded for mission submission verification
  });

  logger.info('Event Handler Loaded');
}