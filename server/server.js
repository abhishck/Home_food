import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import connectDB from './src/database/connect.js';
import logger from './src/utils/logger.js';
import config from './src/config/index.js';
import 'dotenv/config';

const PORT = config.port;

let server;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════╗
║          🍽️  HomeFood API Server Started          ║
╠══════════════════════════════════════════════════╣
║  Environment : ${config.env.padEnd(33)}║
║  Port        : ${String(PORT).padEnd(33)}║
║  Base URL    : http://localhost:${String(PORT).padEnd(18)}║
║  API         : http://localhost:${PORT}/api/v1       ║
╚══════════════════════════════════════════════════╝
      `);
    });

    // Handle server errors (e.g. port in use)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        throw err;
      }
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

// ── Graceful shutdown ──────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Unhandled errors ───────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

startServer();
