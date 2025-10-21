import { CommandInteraction } from 'discord.js';
import { integrationService } from '../services/integrationService';
import { logger } from './logger';

export enum AccessLevel {
  UNLINKED = 'unlinked',
  LINKED = 'linked',
  ADMIN = 'admin',
}

export interface CommandAccess {
  commandName: string;
  minAccessLevel: AccessLevel;
  requiresLinkedAccount: boolean;
}

// Define access levels for each command
const COMMAND_ACCESS: Record<string, CommandAccess> = {
  // Commands available to all users
  faq: {
    commandName: 'faq',
    minAccessLevel: AccessLevel.UNLINKED,
    requiresLinkedAccount: false,
  },
  status: {
    commandName: 'status',
    minAccessLevel: AccessLevel.UNLINKED,
    requiresLinkedAccount: false,
  },

  // Commands requiring linked account
  point: {
    commandName: 'point',
    minAccessLevel: AccessLevel.LINKED,
    requiresLinkedAccount: true,
  },
  misi: {
    commandName: 'misi',
    minAccessLevel: AccessLevel.LINKED,
    requiresLinkedAccount: true,
  },
  tierku: {
    commandName: 'tierku',
    minAccessLevel: AccessLevel.LINKED,
    requiresLinkedAccount: true,
  },
  upgrade: {
    commandName: 'accessLevel',
    minAccessLevel: AccessLevel.LINKED,
    requiresLinkedAccount: true,
  },

  // Account management commands
  link: {
    commandName: 'link',
    minAccessLevel: AccessLevel.UNLINKED,
    requiresLinkedAccount: false,
  },
  unlink: {
    commandName: 'unlink',
    minAccessLevel: AccessLevel.LINKED,
    requiresLinkedAccount: true,
  },
};

export class AccessController {

  async checkCommandAccess(
    commandName: string,
    discordId: string
  ): Promise<{ hasAccess: boolean; reason?: string }> {
    const commandAccess = COMMAND_ACCESS[commandName];

    if (!commandAccess) {
      logger.error(`Unknown command: ${commandName}`);
      return { hasAccess: false, reason: 'Unknown command' };
    }

    // Check if user is linked (for commands requiring it)
    if (commandAccess.requiresLinkedAccount) {
      const isLinked = await integrationService.isDiscordUserLinked(discordId);
      if (!isLinked) {
        return {
          hasAccess: false,
          reason: 'This command requires a linked account. Use /link to connect your Discord account.',
        };
      }
    }

  
    // Check if user has minimum access level
    if (commandAccess.minAccessLevel === AccessLevel.LINKED) {
      const isLinked = await integrationService.isDiscordUserLinked(discordId);
      if (!isLinked) {
        return {
          hasAccess: false,
          reason: 'This command requires a linked Discord account.',
        };
      }
    }

    return { hasAccess: true };
  }

  async getUserAccessLevel(discordId: string): Promise<AccessLevel> {
    const isLinked = await integrationService.isDiscordUserLinked(discordId);
    return isLinked ? AccessLevel.LINKED : AccessLevel.UNLINKED;
  }

  async enforceAccess(
    commandName: string,
    discordId: string,
    interaction: CommandInteraction
  ): Promise<{ allowed: boolean; reason?: string }> {
    const { hasAccess, reason } = await this.checkCommandAccess(commandName, discordId);

    if (!hasAccess) {
      // Send user-friendly error message
      const errorMessage = {
        content: reason || 'Access denied',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }

      logger.error(`Access denied for command ${commandName} for user ${discordId}: ${reason}`);
      return { allowed: false, reason: reason || 'Access denied' };
    }

    return { allowed: true };
  }

  async requireLinkedAccount(
    discordId: string,
    interaction: CommandInteraction
  ): Promise<boolean> {
    const { hasAccess, reason } = await this.checkCommandAccess('point', discordId);

    if (!hasAccess) {
      const errorMessage = {
        content: reason || 'This command requires a linked Discord account.',
        ephemeral: true,
        components: [
          {
            type: 2,
            label: 'Link Account Now',
            style: 'Primary',
            url: 'https://hpz-crew-dashboard.vercel.app/link-discord',
          },
        ],
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }

      logger.error(`Linked account required for point command for user ${discordId}: ${reason}`);
      return false;
    }

    return true;
  }

  async requireLinkedAccountWithMessage(
    discordId: string,
    interaction: CommandInteraction,
    message?: string
  ): Promise<boolean> {
    const errorMessage = {
      content: message || 'This command requires a linked Discord account.',
      ephemeral: true,
      components: [
        {
          type: 2,
          label: 'Link Account Now',
          style: 'Primary',
          url: 'https://hpz-crew-dashboard.vercel.app/link-discord',
        },
      ],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }

    return false;
  }

  async handleUnlinkedUser(
    commandName: string,
    interaction: CommandInteraction,
    message?: string
  ): Promise<void> {
    const defaultMessage = message || 'Link your Discord account to access this feature.';

    const errorMessage = {
      content: defaultMessage,
      ephemeral: true,
      components: [
        {
          type: 2,
          label: 'Link Account',
          style: 'Primary',
          url: 'https://hpz-crew-dashboard.vercel.app/link-discord',
        },
        {
          type: 2,
          label: 'Learn More',
          style: 'Secondary',
          custom_id: 'learn_more_about_linking',
        },
      ],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }

    logger.info(`Unlinked user attempted ${commandName} - showing linking prompt`);
  }

  getCommandDescription(commandName: string): string {
    const commandAccess = COMMAND_ACCESS[commandName];
    if (!commandAccess) return '';

    let description = '';

    switch (commandName) {
      case 'faq':
        description = 'View frequently asked questions about HPZ Crew';
        break;
      case 'status':
        description = 'Check your account status and available features';
        break;
      case 'link':
        description = 'Link Discord account with HPZ Crew dashboard';
        break;
      case 'unlink':
        description = 'Unlink Discord account from HPZ Crew dashboard';
        break;
      case 'point':
        description = 'View your points and tier information';
        break;
      case 'misi':
        description = 'View available missions and progress';
        break;
      case 'tierku':
        description = 'Display your tier information and benefits';
        break;
      case 'upgrade':
        description = 'Get guidance for advancing to next tier';
        break;
      default:
        description = 'Execute command';
    }

    return description;
  }

  getAccessLevelName(accessLevel: AccessLevel): string {
    switch (accessLevel) {
      case AccessLevel.UNLINKED:
        return 'Unlinked User';
      case AccessLevel.LINKED:
        return 'Linked User';
      case AccessLevel.ADMIN:
        return 'Admin';
      default:
        return 'Unknown';
    }
  }
}

export { COMMAND_ACCESS };