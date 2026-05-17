import morgan from 'morgan';
import logger from '../utils/logger.js';
import config from '../config/index.js';

// Stream for morgan → winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging in test mode
const skip = () => config.env === 'test';

const morganFormat =
  config.env === 'development'
    ? ':method :url :status :res[content-length] - :response-time ms'
    : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]';

const requestLogger = morgan(morganFormat, { stream, skip });

export default requestLogger;
