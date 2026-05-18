// import dotenv from 'dotenv';

// dotenv.config();

console.log(process.env.NODE_ENV)
const config = {
  env: process.env.NODE_ENV || 'development',

  port: Number(process.env.PORT) || 5000,

  appName: process.env.APP_NAME || 'HomeFood',

  clientUrl:
    process.env.CLIENT_URL || 'http://localhost:3000',

  db: {
    uri:
      process.env.MONGODB_URI_PROD ||
      'mongodb://127.0.0.1:27017/homefood',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',

    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'refresh-secret',

    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcrypt: {
    saltRounds:
      Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  email: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
    fromName:
      process.env.EMAIL_FROM_NAME || 'HomeFood',
  },

  rateLimit: {
    windowMs:
      Number(process.env.RATE_LIMIT_WINDOW_MS) ||
      15 * 60 * 1000,

    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  },

  geo: {
    defaultRadiusKm:
      Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 10,
  },

  pagination: {
    defaultSize:
      Number(process.env.DEFAULT_PAGE_SIZE) || 20,

    maxSize:
      Number(process.env.MAX_PAGE_SIZE) || 100,
  },
};

// Validate Required Production Variables
const requiredEnv = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

if (config.env === 'production') {
  requiredEnv.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}`
      );
    }
  });
}

export default config;