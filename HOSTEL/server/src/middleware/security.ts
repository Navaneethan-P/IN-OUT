import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Global security headers
export const securityHeaders = helmet();

// Strict rate limit for auth routes to prevent brute force
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased for testing (normally 5)
  message: {
    success: false,
    error: {
      message: 'Too many login attempts, please try again after 15 minutes',
      code: 'TOO_MANY_REQUESTS',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'TOO_MANY_REQUESTS',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
