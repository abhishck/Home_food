import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import config from './config/index.js';
import routes from './routes/index.js';
import errorHandler from './middleware/error.middleware.js';
import requestLogger from './middleware/logger.middleware.js';
import ApiError from './utils/ApiError.js';

const app = express();

// ── Trust proxy (needed behind nginx / load balancer) ──────────────────────
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [config.clientUrl, 'http://localhost:3000', 'http://localhost:5173'];
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: {
    success: false,
    message: 'Too many auth attempts. Please try again in 15 minutes.',
  },
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── Sanitization ─────────────────────────────────────────────────────────────
app.use(mongoSanitize());   // Prevent NoSQL injection
app.use(xssClean());        // Sanitize user input against XSS

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(requestLogger);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Root ping ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🍽️  HomeFood API — Homemade food, delivered with love.',
    docs: '/api/v1/health',
    version: '1.0.0',
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
