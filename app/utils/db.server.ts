/**
 * Database client singleton pattern for Remix applications.
 *
 * This pattern ensures we reuse the same Prisma Client instance across requests in development,
 * while creating a fresh instance in production for optimal performance.
 *
 * See: https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma ?? new PrismaClient();

// Soft delete middleware
prisma.$use(async (params, next) => {
  const modelsWithSoftDelete = [
    'User',
    'Visitor',
    'Location',
    'Checkin',
    'MagicLinkToken',
  ];
  const newParams = { ...params };

  if (modelsWithSoftDelete.includes(newParams.model ?? '')) {
    if (newParams.action === 'delete') {
      newParams.action = 'update';
      newParams.args.data = { deleted_at: new Date() };
    } else if (newParams.action === 'deleteMany') {
      newParams.action = 'updateMany';
      if (newParams.args.data) {
        newParams.args.data.deleted_at = new Date();
      } else {
        newParams.args.data = { deleted_at: new Date() };
      }
    } else if (newParams.action.startsWith('find')) {
      if (newParams.args.where) {
        if (newParams.args.where.deleted_at === undefined) {
          newParams.args.where.deleted_at = null;
        }
      } else {
        newParams.args.where = { deleted_at: null };
      }
    }
  }

  return next(newParams);
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
