import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export const logger = pino({
  level: env.isDev ? 'debug' : 'info',
  transport: env.isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      }
    : undefined,
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    const existingID = req.id ?? req.headers['x-request-id'];
    if (existingID) return existingID;
    // Generate req_9x8ab21 format
    return 'req_' + uuidv4().replace(/-/g, '').substring(0, 7);
  },
  customProps: (req) => {
    return {
      userId: (req as any).user?.id,
      role: (req as any).user?.role,
    };
  },
  serializers: {
    req: (req) => {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        ip: req.remoteAddress,
      };
    },
  },
});
