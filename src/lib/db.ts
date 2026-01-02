import { PrismaClient } from '../generated/prisma';

// Define the global type for PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// In development, we want to clear the global prisma instance if it's stale
// (e.g. after adding new models like UserEnrollment or Course)
if (process.env.NODE_ENV !== 'production' && global.prisma && (!('userEnrollment' in global.prisma) || !('course' in global.prisma) || !('instructor' in global.prisma))) {
  global.prisma = undefined;
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
export const db = global.prisma || new PrismaClient();

// In development, keep the connection alive between hot reloads
if (process.env.NODE_ENV !== 'production') global.prisma = db;
