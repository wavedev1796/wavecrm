import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var wavePrisma: PrismaClient | undefined;
}

export const prisma = globalThis.wavePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.wavePrisma = prisma;
}

export * from '@prisma/client';

