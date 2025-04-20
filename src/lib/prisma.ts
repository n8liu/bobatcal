import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the PrismaClient instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Initialize PrismaClient
// In development, Next.js clears the Node.js cache on every reload,
// leading to new PrismaClient instances being created. This prevents that.
const prisma = global.prisma || new PrismaClient({
  // Optional: Log database queries during development
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
