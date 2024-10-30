import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { sendCommand as sc } from '../connection/redis';

export const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => sc(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
