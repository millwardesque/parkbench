/**
 * Utilities for check-in/check-out functionality
 * Centralized utilities for check-in/out operations
 */
import { type Checkin } from '@prisma/client';
import prisma from './db.server';

/**
 * Interface for visitor with their active check-in data
 */
export interface ActiveVisitorCheckin {
  id: string;
  name: string;
  checkin: Checkin;
}

/**
 * Interface for park with active check-ins
 */
export interface ParkWithVisitors {
  id: string;
  name: string;
  visitors: ActiveVisitorCheckin[];
}

/**
 * Get all active check-ins grouped by park
 * Returns an array of parks with active visitors
 */
export async function getActiveCheckins(): Promise<ParkWithVisitors[]> {
  // Get all locations with active check-ins
  const locations = await prisma.location.findMany({
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

  // Transform results into ParkWithVisitors format
  return locations.map((location) => {
    const visitors = location.checkins.map((checkin) => ({
      id: checkin.visitor.id,
      name: checkin.visitor.name,
      checkin: {
        id: checkin.id,
        visitor_id: checkin.visitor_id,
        location_id: checkin.location_id,
        checkin_at: checkin.checkin_at,
        est_checkout_at: checkin.est_checkout_at,
        actual_checkout_at: checkin.actual_checkout_at,
        created_at: checkin.created_at,
        updated_at: checkin.updated_at,
        deleted_at: checkin.deleted_at,
      },
    }));

    // Sort visitors alphabetically by name
    visitors.sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: location.id,
      name: location.name,
      visitors,
    };
  });
}

// In-memory cache to reduce database load
let cachedParksWithVisitors: ParkWithVisitors[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds in milliseconds

/**
 * Get active check-ins with caching to reduce database load
 * Results are cached for 5 seconds
 */
export async function getCachedActiveCheckins(): Promise<ParkWithVisitors[]> {
  const now = Date.now();

  // If cache is valid, return it
  if (cachedParksWithVisitors && now - lastCacheTime < CACHE_TTL) {
    return cachedParksWithVisitors;
  }

  // Otherwise fetch fresh data from database
  const freshData = await getActiveCheckins();
  cachedParksWithVisitors = freshData;
  lastCacheTime = now;

  return freshData;
}

/**
 * Invalidate the cache to ensure fresh data on next request
 */
export function invalidateCache(): void {
  cachedParksWithVisitors = null;
  lastCacheTime = 0;
}

/**
 * Options for creating a new check-in
 */
export interface CreateCheckinOptions {
  visitorId: string;
  locationId: string;
  durationMinutes: number;
}

/**
 * Error types for check-in operations
 */
// eslint-disable-next-line no-shadow
export enum CheckinErrorType {
  ALREADY_CHECKED_IN = 'already_checked_in',
  VISITOR_NOT_FOUND = 'visitor_not_found',
  LOCATION_NOT_FOUND = 'location_not_found',
  UNAUTHORIZED = 'unauthorized',
  UNKNOWN = 'unknown',
}

/**
 * Custom error class for check-in operations
 */
export class CheckinError extends Error {
  type: CheckinErrorType;

  constructor(message: string, type: CheckinErrorType) {
    super(message);
    this.type = type;
    this.name = 'CheckinError';
  }
}

/**
 * Create check-ins for multiple visitors to a location
 * @param options Array of CreateCheckinOptions objects
 * @param userId ID of the user who owns the visitors
 * @returns Array of created Checkin objects
 * @throws CheckinError for various error conditions
 */
export async function createCheckins(
  options: CreateCheckinOptions[],
  userId: string
): Promise<Checkin[]> {
  if (!options.length) {
    return [];
  }

  // Get unique visitor and location IDs
  const visitorIds = [...new Set(options.map((opt) => opt.visitorId))];
  const locationIds = [...new Set(options.map((opt) => opt.locationId))];

  try {
    // Verify all visitors belong to the user
    const visitors = await prisma.visitor.findMany({
      where: {
        id: { in: visitorIds },
        owner_id: userId,
        deleted_at: null,
      },
    });

    if (visitors.length !== visitorIds.length) {
      throw new CheckinError(
        'One or more visitors not found or not owned by you',
        CheckinErrorType.UNAUTHORIZED
      );
    }

    // Verify all locations exist
    const locations = await prisma.location.findMany({
      where: {
        id: { in: locationIds },
        deleted_at: null,
      },
    });

    if (locations.length !== locationIds.length) {
      throw new CheckinError(
        'One or more locations not found',
        CheckinErrorType.LOCATION_NOT_FOUND
      );
    }

    // Check if any visitors are already checked in
    const activeCheckins = await prisma.checkin.findMany({
      where: {
        visitor_id: { in: visitorIds },
        actual_checkout_at: null,
        deleted_at: null,
      },
      include: {
        visitor: true,
      },
    });

    if (activeCheckins.length > 0) {
      // Get names of already checked in visitors
      const alreadyCheckedInVisitorNames = activeCheckins
        .map((c) => c.visitor.name)
        .join(', ');
      throw new CheckinError(
        `${alreadyCheckedInVisitorNames} ${activeCheckins.length > 1 ? 'are' : 'is'} already checked in somewhere`,
        CheckinErrorType.ALREADY_CHECKED_IN
      );
    }

    // Create checkins in a transaction
    const createdCheckins = await prisma.$transaction(
      options.map((opt) => {
        const checkinAt = new Date();
        const estCheckoutAt = new Date(
          checkinAt.getTime() + opt.durationMinutes * 60 * 1000
        );

        return prisma.checkin.create({
          data: {
            visitor_id: opt.visitorId,
            location_id: opt.locationId,
            checkin_at: checkinAt,
            est_checkout_at: estCheckoutAt,
            actual_checkout_at: null,
          },
        });
      })
    );

    // Clear cache to ensure fresh data
    invalidateCache();

    return createdCheckins;
  } catch (error) {
    if (error instanceof CheckinError) {
      throw error;
    }

    // Log error for server-side debugging
    // eslint-disable-next-line no-console
    console.error('Error creating checkins:', error);
    throw new CheckinError(
      'An unexpected error occurred while creating check-ins',
      CheckinErrorType.UNKNOWN
    );
  }
}

/**
 * End multiple check-ins by setting actual_checkout_at
 * @param checkinIds Array of check-in IDs to end
 * @param userId ID of the user who owns the visitors
 * @returns Array of updated Checkin objects
 * @throws CheckinError for various error conditions
 */
export async function endCheckins(
  checkinIds: string[],
  userId: string
): Promise<Checkin[]> {
  if (!checkinIds.length) {
    return [];
  }

  try {
    // Verify all check-ins belong to the user's visitors
    const checkins = await prisma.checkin.findMany({
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

    if (checkins.length !== checkinIds.length) {
      throw new CheckinError(
        'One or more check-ins not found or not owned by you',
        CheckinErrorType.UNAUTHORIZED
      );
    }

    // End all checkins in a transaction
    const now = new Date();
    const updatedCheckins = await prisma.$transaction(
      checkinIds.map((checkinId) =>
        prisma.checkin.update({
          where: { id: checkinId },
          data: { actual_checkout_at: now },
        })
      )
    );

    // Clear cache to ensure fresh data
    invalidateCache();

    return updatedCheckins;
  } catch (error) {
    if (error instanceof CheckinError) {
      throw error;
    }

    // Log error for server-side debugging
    // eslint-disable-next-line no-console
    console.error('Error ending checkins:', error);
    throw new CheckinError(
      'An unexpected error occurred while ending check-ins',
      CheckinErrorType.UNKNOWN
    );
  }
}
