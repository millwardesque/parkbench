/**
 * Unit tests for check-in/check-out utilities
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getActiveCheckins,
  getCachedActiveCheckins,
  invalidateCache,
  createCheckins,
  endCheckins,
  type CreateCheckinOptions,
} from '~/utils/checkin.server';
import prisma from '~/utils/db.server';

// Mock the Prisma client with properly typed mock functions
vi.mock('~/utils/db.server', () => {
  const mockPrisma = {
    location: {
      findMany: vi.fn(),
    },
    visitor: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    checkin: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  };

  return { default: mockPrisma };
});

// Type assertion for mocked prisma client
type MockedPrismaClient = {
  [K in keyof typeof prisma]: {
    [M in keyof (typeof prisma)[K]]: ReturnType<typeof vi.fn>;
  };
} & {
  $transaction: ReturnType<typeof vi.fn>;
};

const mockedPrisma = prisma as unknown as MockedPrismaClient;

describe('Checkin utilities', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getActiveCheckins', () => {
    test('should fetch and format parks with active check-ins', async () => {
      // Mock data
      const mockLocations = [
        {
          id: 'location-1',
          name: 'Central Park',
          checkins: [
            {
              id: 'checkin-1',
              visitor_id: 'visitor-1',
              location_id: 'location-1',
              checkin_at: new Date(),
              est_checkout_at: new Date(),
              actual_checkout_at: null,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
              visitor: { id: 'visitor-1', name: 'Bob', owner_id: 'user-1' },
            },
            {
              id: 'checkin-2',
              visitor_id: 'visitor-2',
              location_id: 'location-1',
              checkin_at: new Date(),
              est_checkout_at: new Date(),
              actual_checkout_at: null,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
              visitor: { id: 'visitor-2', name: 'Alice', owner_id: 'user-1' },
            },
          ],
        },
        {
          id: 'location-2',
          name: 'Riverside Park',
          checkins: [
            {
              id: 'checkin-3',
              visitor_id: 'visitor-3',
              location_id: 'location-2',
              checkin_at: new Date(),
              est_checkout_at: new Date(),
              actual_checkout_at: null,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
              visitor: { id: 'visitor-3', name: 'Charlie', owner_id: 'user-1' },
            },
          ],
        },
      ];

      // Setup mocks
      mockedPrisma.location.findMany.mockResolvedValue(mockLocations);

      // Execute
      const result = await getActiveCheckins();

      // Verify
      expect(mockedPrisma.location.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          checkins: {
            some: {
              actual_checkout_at: null,
              deleted_at: null,
            },
          },
        },
        include: {
          checkins: {
            where: {
              actual_checkout_at: null,
              deleted_at: null,
            },
            include: {
              visitor: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Verify result structure
      expect(result).toHaveLength(2);

      // Parks should be in alphabetical order
      expect(result[0].name).toBe('Central Park');
      expect(result[1].name).toBe('Riverside Park');

      // Central Park visitors should be sorted alphabetically (Alice before Bob)
      expect(result[0].visitors).toHaveLength(2);
      expect(result[0].visitors[0].name).toBe('Alice');
      expect(result[0].visitors[1].name).toBe('Bob');

      // Riverside Park should have one visitor
      expect(result[1].visitors).toHaveLength(1);
      expect(result[1].visitors[0].name).toBe('Charlie');
    });
  });

  describe('getCachedActiveCheckins', () => {
    test('should return cached results if available', async () => {
      // Mock getActiveCheckins to control cache population
      const mockData = [{ id: 'park-1', name: 'Test Park', visitors: [] }];
      vi.mock('~/utils/checkin.server', async (importOriginal) => {
        const original = (await importOriginal()) as Record<string, unknown>;
        return {
          ...original,
          getActiveCheckins: vi.fn().mockResolvedValue(mockData),
        };
      });

      // First call should populate cache
      const cachedResult = await getCachedActiveCheckins();
      expect(cachedResult).toEqual(mockData);
      expect(mockedPrisma.location.findMany).not.toHaveBeenCalled();
    });

    test('should refresh cache if expired', async () => {
      // Setup
      mockedPrisma.location.findMany.mockResolvedValue([
        {
          id: 'park-1',
          name: 'Test Park',
          checkins: [],
        },
      ]);

      // First call to prime the cache
      await getCachedActiveCheckins();

      // Clear the mock to track new calls
      mockedPrisma.location.findMany.mockClear();

      // Manually invalidate cache
      invalidateCache();

      // This call should refresh the cache
      await getCachedActiveCheckins();

      // Verify Prisma was called again
      expect(mockedPrisma.location.findMany).toHaveBeenCalled();
    });
  });

  describe('createCheckins', () => {
    test('should create checkins for multiple visitors', async () => {
      // Mock data
      const userId = 'user-1';
      const options = [
        {
          visitorId: 'visitor-1',
          locationId: 'location-1',
          durationMinutes: 60,
        },
        {
          visitorId: 'visitor-2',
          locationId: 'location-1',
          durationMinutes: 60,
        },
      ];

      const mockVisitors = [
        { id: 'visitor-1', name: 'Alice', owner_id: userId },
        { id: 'visitor-2', name: 'Bob', owner_id: userId },
      ];

      const mockLocations = [{ id: 'location-1', name: 'Central Park' }];

      // Setup mocks
      mockedPrisma.visitor.findMany.mockResolvedValue(mockVisitors);
      mockedPrisma.location.findMany.mockResolvedValue(mockLocations);
      mockedPrisma.checkin.findMany.mockResolvedValue([]); // No active checkins
      mockedPrisma.$transaction.mockResolvedValue([
        { id: 'new-checkin-1', visitor_id: 'visitor-1' },
        { id: 'new-checkin-2', visitor_id: 'visitor-2' },
      ]);

      // Execute
      const result = await createCheckins(options, userId);

      // Verify
      expect(mockedPrisma.visitor.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['visitor-1', 'visitor-2'] },
          owner_id: userId,
          deleted_at: null,
        },
      });

      expect(mockedPrisma.location.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['location-1'] },
          deleted_at: null,
        },
      });

      expect(mockedPrisma.checkin.findMany).toHaveBeenCalledWith({
        where: {
          visitor_id: { in: ['visitor-1', 'visitor-2'] },
          actual_checkout_at: null,
          deleted_at: null,
        },
        include: {
          visitor: true,
        },
      });

      // Verify transaction was called with two create operations
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].visitor_id).toBe('visitor-1');
      expect(result[1].visitor_id).toBe('visitor-2');
    });

    test('should throw error if visitor already checked in', async () => {
      // Mock data
      const userId = 'user-1';
      const options: CreateCheckinOptions[] = [
        {
          visitorId: 'visitor-1',
          locationId: 'location-1',
          durationMinutes: 60,
        },
      ];

      const mockVisitors = [
        { id: 'visitor-1', name: 'Alice', owner_id: userId },
      ];

      const mockLocations = [{ id: 'location-1', name: 'Central Park' }];

      const mockActiveCheckins = [
        {
          id: 'checkin-existing',
          visitor_id: 'visitor-1',
          location_id: 'location-2',
          visitor: { id: 'visitor-1', name: 'Alice', owner_id: userId },
        },
      ];

      // Setup mocks
      mockedPrisma.visitor.findMany.mockResolvedValue(mockVisitors);
      mockedPrisma.location.findMany.mockResolvedValue(mockLocations);
      mockedPrisma.checkin.findMany.mockResolvedValue(mockActiveCheckins);

      // Execute & Verify
      await expect(createCheckins(options, userId)).rejects.toThrow();
      expect(mockedPrisma.checkin.create).not.toHaveBeenCalled();
    });
  });

  describe('endCheckins', () => {
    test('should end multiple checkins', async () => {
      // Mock data
      const userId = 'user-1';
      const checkinIds = ['checkin-1', 'checkin-2'];

      const mockCheckins = [
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
      mockedPrisma.checkin.findMany.mockResolvedValue(mockCheckins);
      // Use type assertion to properly type the implementation function parameter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedPrisma.checkin.update.mockImplementation((data: any) =>
        Promise.resolve({
          id: data.where.id,
          actual_checkout_at: new Date(),
        })
      );

      // Execute
      const result = await endCheckins(checkinIds, userId);

      // Verify
      expect(prisma.checkin.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: checkinIds },
          actual_checkout_at: null,
          deleted_at: null,
          visitor: {
            owner_id: userId,
            deleted_at: null,
          },
        },
        include: {
          visitor: true,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    test('should throw error if checkin not found or unauthorized', async () => {
      // Mock data
      const userId = 'user-1';
      const checkinIds = ['checkin-1', 'checkin-2'];

      // Only one of the checkins belongs to the user
      const mockCheckins = [
        {
          id: 'checkin-1',
          visitor_id: 'visitor-1',
          visitor: { id: 'visitor-1', name: 'Alice', owner_id: userId },
        },
      ];

      // Setup mocks
      mockedPrisma.checkin.findMany.mockResolvedValue(mockCheckins);

      // Execute & Verify
      await expect(endCheckins(checkinIds, userId)).rejects.toThrow();
      expect(mockedPrisma.checkin.update).not.toHaveBeenCalled();
    });
  });
});
