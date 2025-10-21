import { SlashCommandBuilder, CommandInteraction, ChatInputCommandInteraction } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface SlashCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface CommandCategory {
  name: string;
  description: string;
  commands: Command[];
}

export interface BotEvent {
  name: string;
  once: boolean;
  execute: (...args: any[]) => Promise<void>;
}

export interface UserInfo {
  id: string;
  username: string;
  discriminator: string;
  displayName: string;
  avatarURL?: string;
}

export interface PointHistory {
  amount: number;
  source: string;
  description: string;
  timestamp: Date;
}

export interface MissionInfo {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  requirements: string[];
  status: 'available' | 'completed' | 'in_progress';
}

export interface TierInfo {
  name: string;
  currentPoints: number;
  maxPoints: number;
  progress: number;
  benefits: string[];
  nextTier?: {
    name: string;
    pointsNeeded: number;
    benefits: string[];
  };
}