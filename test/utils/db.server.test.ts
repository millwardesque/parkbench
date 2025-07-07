import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import the module under test (after mocking)
import '../../app/utils/db.server';

// Mock the Prisma client and its middleware
const mockUseFunction = vi.fn();
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $use: mockUseFunction,
    // Add other methods used by the application
    user: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  })),
}));

describe('Prisma Soft Delete Middleware', () => {
  // Define more specific types for the middleware
  type PrismaAction =
    | 'findUnique'
    | 'findMany'
    | 'findFirst'
    | 'create'
    | 'update'
    | 'delete'
    | 'deleteMany'
    | 'updateMany';

  interface PrismaParams {
    model: string;
    action: PrismaAction;
    args: Record<string, unknown>;
  }

  type NextFunction = (params: PrismaParams) => Promise<unknown>;
  type MiddlewareFunction = (
    params: PrismaParams,
    next: NextFunction
  ) => Promise<unknown>;

  let middleware: MiddlewareFunction;

  beforeEach(() => {
    // Reset mocks between tests
    vi.resetAllMocks();

    // Extract the middleware function that was registered
    // We know that db.server.ts calls $use with a middleware function
    // Get that function from the first call to mockUseFunction
    middleware = mockUseFunction.mock.calls[0][0] as MiddlewareFunction;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should convert delete operations to updates with deleted_at timestamp', async () => {
    // Setup
    const params: PrismaParams = {
      model: 'User',
      action: 'delete',
      args: { where: { id: '123' } },
    };

    const next = vi.fn().mockResolvedValue({ id: '123', name: 'Test User' });

    // Execute
    await middleware(params, next);

    // Assert
    expect(next).toHaveBeenCalledWith({
      model: 'User',
      action: 'update',
      args: {
        where: { id: '123' },
        data: { deleted_at: expect.any(Date) },
      },
    });
  });

  it('should convert deleteMany operations to updateMany with deleted_at timestamp', async () => {
    // Setup
    const params: PrismaParams = {
      model: 'User',
      action: 'deleteMany',
      args: { where: { email: 'test@example.com' } },
    };

    const next = vi.fn().mockResolvedValue({ count: 1 });

    // Execute
    await middleware(params, next);

    // Assert
    expect(next).toHaveBeenCalledWith({
      model: 'User',
      action: 'updateMany',
      args: {
        where: { email: 'test@example.com' },
        data: { deleted_at: expect.any(Date) },
      },
    });
  });

  it('should add deleted_at filter to findMany queries by default', async () => {
    // Setup
    const params: PrismaParams = {
      model: 'User',
      action: 'findMany',
      args: { where: { age: { gt: 18 } } },
    };

    const next = vi.fn().mockResolvedValue([{ id: '123', name: 'Test User' }]);

    // Execute
    await middleware(params, next);

    // Assert
    expect(next).toHaveBeenCalledWith({
      model: 'User',
      action: 'findMany',
      args: {
        where: {
          age: { gt: 18 },
          deleted_at: null,
        },
      },
    });
  });

  it('should honor includeDeleted option when set to true', async () => {
    // Setup
    const params: PrismaParams = {
      model: 'User',
      action: 'findMany',
      args: {
        where: { age: { gt: 18 } },
        includeDeleted: true,
      },
    };

    const next = vi.fn().mockResolvedValue([{ id: '123', name: 'Test User' }]);

    // Execute
    await middleware(params, next);

    // Assert
    expect(next).toHaveBeenCalledWith({
      model: 'User',
      action: 'findMany',
      args: {
        where: { age: { gt: 18 } },
        includeDeleted: true,
      },
    });
  });

  it('should not modify findUnique by default but add deleted_at check', async () => {
    // Setup
    const params: PrismaParams = {
      model: 'User',
      action: 'findUnique',
      args: { where: { id: '123' } },
    };

    const next = vi.fn().mockResolvedValue({ id: '123', name: 'Test User' });

    // Execute
    await middleware(params, next);

    // Assert
    expect(next).toHaveBeenCalledWith({
      model: 'User',
      action: 'findFirst',
      args: {
        where: {
          id: '123',
          deleted_at: null,
        },
      },
    });
  });
});
