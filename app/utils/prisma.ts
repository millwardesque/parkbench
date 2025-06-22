import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client instance
const prismaClientSingleton = () => {
  const client = new PrismaClient();

  // Add middleware to filter out soft-deleted records
  client.$use(async (params, next) => {
    // Check if this is a find operation on a model that has deleted_at
    if (params.action.startsWith('find') || params.action === 'count') {
      // These models have the deleted_at field for soft-deletion
      const modelsWithSoftDelete = ['User', 'Visitor', 'Location', 'Checkin'];

      // Apply filter for soft-deleted records
      if (modelsWithSoftDelete.includes(params.model as string)) {
        // Create a deep copy of the params object to avoid mutating the original
        const newParams = {
          ...params,
          args: { ...params.args },
        };

        // For findUnique, we need to convert it to findFirst
        // because we can't filter on non-unique fields with findUnique
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // Change to findFirst - keep all the same parameters
          newParams.action = 'findFirst';
          // Add deleted_at filter
          newParams.args.where = { ...newParams.args.where, deleted_at: null };
          return next(newParams);
        }

        if (params.action === 'findMany' || params.action === 'count') {
          // Add deleted_at filter
          newParams.args.where = { ...newParams.args.where, deleted_at: null };
          return next(newParams);
        }
      }
    }
    return next(params);
  });

  return client;
};

// Export the client with middleware applied as default
const prisma = globalThis.prisma ?? prismaClientSingleton();

// In development, don't share connection between hot reloads
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-global-assign
  globalThis.prisma = prisma;
}

export default prisma;
