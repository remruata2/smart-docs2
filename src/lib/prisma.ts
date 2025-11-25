import { PrismaClient } from '../generated/prisma';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma_db: PrismaClient };

export const prisma = globalForPrisma.prisma_db || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_db = prisma;

export default prisma;
