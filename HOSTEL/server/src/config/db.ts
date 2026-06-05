import { PrismaClient } from '@prisma/client';
import { env } from './env';

const db = new PrismaClient({
  log: env.isDev ? ['warn', 'error'] : ['error'],
});

export default db;
