/**
 * Unit tests for mass check-in/check-out utilities
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkInAllVisitors,
  checkOutAllVisitors,
} from '~/utils/mass-checkin.server';
import { invalidateCache } from '~/utils/checkin.server';
import prisma from '~/utils/db.server';

// Mock the prisma module
vi.mock('~/utils/db.server', () => {
  const mockPrisma = {
    visitor: {
      findMany: vi.fn(),
    },
    checkin: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    location: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  return { default: mockPrisma };
});

// Mock the checkin module to verify cache invalidation
vi.mock('~/utils/checkin.server', () => ({
  invalidateCache: vi.fn(),
}));

// Type assertion for mocked prisma client
type MockedPrismaClient = {
  [K in keyof typeof prisma]: {
    [M in keyof (typeof prisma)[K]]: ReturnType<typeof vi.fn>;
  };
} & {
  $transaction: ReturnType<typeof vi.fn>;
};

const mockedPrisma = prisma as unknown as MockedPrismaClient;

describe('Mass check-in utilities', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('checkInAllVisitors', () => {
    test('should check in all visitors not already checked in', async () => {
      // Mock data
      const userId = 'user-1';
      const mockVisitors = [
        { id: 'visitor-1', name: 'Alice', owner_id: userId },
        { id: 'visitor-2', name: 'Bob', owner_id: userId },
        { id: 'visitor-3', name: 'Charlie', owner_id: userId },
      ];

      const mockActiveCheckins = [
        {
          id: 'checkin-1',
          visitor_id: 'visitor-1',
          location_id: 'location-1',
          visitor: { id: 'visitor-1', name: 'Alice', owner_id: userId },
        },
      ];

      const mockDefaultLocation = {
        id: 'location-default',
        name: 'Default Park',
      };

      // Setup mocks
      mockedPrisma.visitor.findMany.mockResolvedValue(mockVisitors);
      mockedPrisma.checkin.findMany.mockResolvedValue(mockActiveCheckins);
      mockedPrisma.location.findFirst.mockResolvedValue(mockDefaultLocation);
      mockedPrisma.checkin.create.mockImplementation((data) =>
        Promise.resolve({
          id: `new-checkin-${data.data.visitor_id}`,
          ...data.data,
          checkin_at: new Date(),
          est_checkout_at: new Date(),
        })
      );

      // Execute
      const result = await checkInAllVisitors(userId);

      // Verify
      expect(mockedPrisma.visitor.findMany).toHaveBeenCalledWith({
        where: {
          owner_id: userId,
          deleted_at: null,
        },
      });

      expect(mockedPrisma.checkin.findMany).toHaveBeenCalledWith({
        where: {
          visitor: {
            owner_id: userId,
          },
          actual_checkout_at: null,
          deleted_at: null,
        },
        include: {
          visitor: true,
        },
      });

      expect(mockedPrisma.location.findFirst).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Only 2 visitors should be checked in (Bob and Charlie)
      // Alice is already checked in
      expect(result).toHaveLength(2);
      expect(result.some((c) => c.visitor_id === 'visitor-2')).toBeTruthy();
      expect(result.some((c) => c.visitor_id === 'visitor-3')).toBeTruthy();
      expect(
        result.every((c) => c.location_id === 'location-default')
      ).toBeTruthy();

      // Verify cache was invalidated
      expect(invalidateCache).toHaveBeenCalled();
    });

    test('should return empty array if all visitors already checked in', async () => {
      // Mock data
      const userId = 'user-1';
      const mockVisitors = [
        { id: 'visitor-1', name: 'Alice', owner_id: userId },
        { id: 'visitor-2', name: 'Bob', owner_id: userId },
      ];

      const mockActiveCheckins = [
        {
          id: 'checkin-1',
          visitor_id: 'visitor-1',
          visitor: { id: 'visitor-1', name: 'Alice', owner_id: userId },
        },
        {
          id: 'checkin-2',
          visitor_id: 'visitor-2',
          visitor: { id: 'visitor-2', name: 'Bob', owner_id: userId },
        },
      ];

      // Setup mocks
      mockedPrisma.visitor.findMany.mockResolvedValue(mockVisitors);
      mockedPrisma.checkin.findMany.mockResolvedValue(mockActiveCheckins);

      // Execute
      const result = await checkInAllVisitors(userId);

      // Verify
      expect(mockedPrisma.visitor.findMany).toHaveBeenCalled();
      expect(mockedPrisma.checkin.findMany).toHaveBeenCalled();
      expect(mockedPrisma.checkin.create).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
      expect(invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe('checkOutAllVisitors', () => {
    test('should check out all visitors with active check-ins', async () => {
      // Mock data
      const userId = 'user-1';
      const mockActiveCheckins = [
        {
          id: 'checkin-1',
          visitor_id: 'visitor-1',
          visitor: { id: 'visitor-1', name: 'Alice', owner_id: userId },
        },
        {
          id: 'checkin-2',
          visitor_id: 'visitor-2',
          visitor: { id: 'visitor-2', name: 'Bob', owner_id: userId },
        },
      ];

      // Setup mocks
      mockedPrisma.checkin.findMany.mockResolvedValue(mockActiveCheckins);
      mockedPrisma.checkin.update.mockImplementation((data) =>
        Promise.resolve({
          id: data.where.id,
          actual_checkout_at: new Date(),
        })
      );

      // Execute
      const result = await checkOutAllVisitors(userId);

      // Verify
      expect(mockedPrisma.checkin.findMany).toHaveBeenCalledWith({
        where: {
          visitor: {
            owner_id: userId,
          },
          actual_checkout_at: null,
          deleted_at: null,
        },
        include: {
          visitor: true,
        },
      });

      // Both visitors should be checked out
      expect(result).toHaveLength(2);
      expect(mockedPrisma.checkin.update).toHaveBeenCalledTimes(2);
      expect(invalidateCache).toHaveBeenCalled();
    });

    test('should return empty array if no visitors checked in', async () => {
      // Mock data
      const userId = 'user-1';

      // Setup mocks - no active check-ins
      mockedPrisma.checkin.findMany.mockResolvedValue([]);

      // Execute
      const result = await checkOutAllVisitors(userId);

      // Verify
      expect(mockedPrisma.checkin.findMany).toHaveBeenCalled();
      expect(mockedPrisma.checkin.update).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
      expect(invalidateCache).not.toHaveBeenCalled();
    });
  });
});
