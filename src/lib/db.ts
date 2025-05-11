import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient({
  transactionOptions: {
    timeout: 10000,
  },
});
