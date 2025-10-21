import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'hpz-crew-bot' },
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
  ],
});

// Add file transport if enabled
if (config.logging.fileEnabled) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    })
  );
}

// Discord-specific logging utilities
export const discordLogger = {
  command: (commandName: string, user: string, guild: string) => {
    logger.info(`Command executed: ${commandName}`, { user, guild });
  },

  error: (error: Error, context?: string) => {
    logger.error(`Discord Error${context ? ` in ${context}` : ''}`, {
      error: error.message,
      stack: error.stack,
    });
  },

  guildJoin: (guildName: string, guildId: string) => {
    logger.info(`Bot joined guild`, { guildName, guildId });
  },

  guildLeave: (guildName: string, guildId: string) => {
    logger.info(`Bot left guild`, { guildName, guildId });
  },

  ready: (username: string, guildCount: number) => {
    logger.info(`Bot is ready`, { username, guildCount });
  },

  userJoin: (username: string, userId: string, guild: string) => {
    logger.info(`User joined guild`, { username, userId, guild });
  },

  userMissionSubmit: (username: string, missionTitle: string, points: number) => {
    logger.info(`Mission submitted`, { username, missionTitle, points });
  },

  pointsAwarded: (username: string, amount: number, source: string) => {
    logger.info(`Points awarded`, { username, amount, source });
  },
};

export default logger;