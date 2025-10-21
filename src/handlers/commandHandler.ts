import { REST, Routes } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Command } from '../types/discord';

// Import all commands
import pointIntegratedCommand from '../commands/point-integrated';
import misiCommand from '../commands/misi';
import faqCommand from '../commands/faq';
import tierkuCommand from '../commands/tierku';
import upgradeCommand from '../commands/upgrade';
import linkCommand from '../commands/link';
import unlinkCommand from '../commands/unlink';
import statusCommand from '../commands/status';
// import submitCommand from '../commands/submit'; // Temporarily disabled

const commands: Command[] = [
  pointIntegratedCommand, // Use the integrated version that checks linking status
  misiCommand,
  faqCommand,
  tierkuCommand,
  upgradeCommand,
  linkCommand,        // New: Link Discord account
  unlinkCommand,      // New: Unlink Discord account
  statusCommand,      // New: Check account status
  // submitCommand,      // New: Submit content - temporarily disabled
];

export async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    logger.info(`Started refreshing application (/) commands.`);

    // Try guild commands first, fallback to global if permissions issue
    let data;
    try {
      // Register commands for a specific guild (faster for testing)
      data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands.map(command => command.data.toJSON()) }
      ) as string[];
      logger.info(`Successfully reloaded ${data.length} guild application (/) commands.`);
    } catch (guildError) {
      logger.warn('Guild commands failed, trying global commands:', guildError);

      // Fallback to global commands (requires bot to be in many servers)
      data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands.map(command => command.data.toJSON()) }
      ) as string[];
      logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
    }

  } catch (error) {
    logger.error('Error refreshing application commands:', error);
    throw error;
  }
}

export async function handleCommand(interaction: any): Promise<void> {
  const command = commands.find(cmd => cmd.data.name === interaction.commandName);

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    logger.info(`Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing ${interaction.commandName}:`, error);

    const errorMessage = {
      content: 'There was an error while executing this command!',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

export { commands };