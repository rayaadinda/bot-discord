import express from 'express';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'HPZ Crew Discord Bot'
  });
});

// Start health check server (only for deployment monitoring)
if (process.env.NODE_ENV === 'production') {
  app.listen(port, () => {
    logger.info(`Health check server running on port ${port}`, { service: 'hpz-crew-bot' });
  });
}

export default app;