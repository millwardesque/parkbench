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

// Mock the Prisma client
vi.mock('~/utils/db.server', () => ({
  default: {
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
  },
}));

describe('Checkin utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
      prisma.location.findMany.mockResolvedValue(mockLocations);

      // Execute
      const result = await getActiveCheckins();

      // Verify
      expect(prisma.location.findMany).toHaveBeenCalledWith({
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
        const original = await importOriginal();
        return {
          ...original,
          getActiveCheckins: vi.fn().mockResolvedValue(mockData),
        };
      });

      // First call should populate cache
      const cachedResult = await getCachedActiveCheckins();
      expect(cachedResult).toEqual(mockData);
      expect(prisma.location.findMany).not.toHaveBeenCalled();
    });

    test('should refresh cache if expired', async () => {
      // Setup
      prisma.location.findMany.mockResolvedValue([
        {
          id: 'park-1',
          name: 'Test Park',
          checkins: [],
        },
      ]);

      // First call to prime the cache
      await getCachedActiveCheckins();

      // Clear the mock to track new calls
      prisma.location.findMany.mockClear();

      // Manually invalidate cache
      invalidateCache();

      // This call should refresh the cache
      await getCachedActiveCheckins();

      // Verify Prisma was called again
      expect(prisma.location.findMany).toHaveBeenCalled();
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
      prisma.visitor.findMany.mockResolvedValue(mockVisitors);
      prisma.location.findMany.mockResolvedValue(mockLocations);
      prisma.checkin.findMany.mockResolvedValue([]); // No active checkins
      prisma.$transaction.mockResolvedValue([
        { id: 'new-checkin-1', visitor_id: 'visitor-1' },
        { id: 'new-checkin-2', visitor_id: 'visitor-2' },
      ]);

      // Execute
      const result = await createCheckins(options, userId);

      // Verify
      expect(prisma.visitor.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['visitor-1', 'visitor-2'] },
          owner_id: userId,
          deleted_at: null,
        },
      });

      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['location-1'] },
          deleted_at: null,
        },
      });

      expect(prisma.checkin.findMany).toHaveBeenCalledWith({
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
      expect(prisma.$transaction).toHaveBeenCalled();
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
      prisma.visitor.findMany.mockResolvedValue(mockVisitors);
      prisma.location.findMany.mockResolvedValue(mockLocations);
      prisma.checkin.findMany.mockResolvedValue(mockActiveCheckins);

      // Execute & Verify
      await expect(createCheckins(options, userId)).rejects.toThrow();
      expect(prisma.checkin.create).not.toHaveBeenCalled();
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
      prisma.checkin.findMany.mockResolvedValue(mockCheckins);
      prisma.checkin.update.mockImplementation((data) =>
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
      prisma.checkin.findMany.mockResolvedValue(mockCheckins);

      // Execute & Verify
      await expect(endCheckins(checkinIds, userId)).rejects.toThrow();
      expect(prisma.checkin.update).not.toHaveBeenCalled();
    });
  });
});
