/**
 * Utilities for mass check-in/check-out functionality
 */
import { type Checkin } from '@prisma/client';
import prisma from './db.server';
import { invalidateCache } from './checkin.server';

/**
 * Check in all visitors for a specific user to a single location
 * If a visitor is already checked in somewhere, they will be skipped
 *
 * @param userId The ID of the user whose visitors should be checked in
 * @param locationId Optional location ID; if not provided, first available location will be used
 * @param durationMinutes Optional duration in minutes; defaults to 120 (2 hours)
 * @returns Array of created check-ins
 */
export async function checkInAllVisitors(
  userId: string,
  locationId?: string,
  durationMinutes = 120
): Promise<Checkin[]> {
  // Get all visitors belonging to the user
  const visitors = await prisma.visitor.findMany({
    where: {
      owner_id: userId,
      deleted_at: null,
    },
    include: {
      checkins: {
        where: {
          actual_checkout_at: null,
          deleted_at: null,
        },
      },
    },
  });

  // Filter out visitors who are already checked in
  const availableVisitors = visitors.filter(
    (visitor) => visitor.checkins.length === 0
  );

  // If no available visitors, return empty array
  if (availableVisitors.length === 0) {
    return [];
  }

  // If no locationId provided, find the first available location
  let targetLocationId = locationId;
  if (!targetLocationId) {
    // Find the most recently used location for this user (from active check-ins)
    const recentCheckin = await prisma.checkin.findFirst({
      where: {
        visitor: {
          owner_id: userId,
        },
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    if (recentCheckin) {
      targetLocationId = recentCheckin.location_id;
    } else {
      // If no recent check-in, use the first location in the system
      const firstLocation = await prisma.location.findFirst({
        where: { deleted_at: null },
        orderBy: { name: 'asc' },
      });

      if (!firstLocation) {
        throw new Error('No locations available for check-in');
      }

      targetLocationId = firstLocation.id;
    }
  }

  // Create check-ins in a transaction for all available visitors
  const now = new Date();
  const estCheckoutAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  try {
    const checkins = await prisma.$transaction(
      availableVisitors.map((visitor) =>
        prisma.checkin.create({
          data: {
            visitor_id: visitor.id,
            location_id: targetLocationId!,
            checkin_at: now,
            est_checkout_at: estCheckoutAt,
            expires_at: estCheckoutAt,
            actual_checkout_at: null,
          },
        })
      )
    );

    // Invalidate cache to ensure fresh data
    invalidateCache();

    return checkins;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in mass check-in:', error);
    throw new Error('Failed to check in visitors');
  }
}

/**
 * Check out all active check-ins for a specific user
 *
 * @param userId The ID of the user whose active check-ins should be ended
 * @returns Array of updated check-ins
 */
export async function checkOutAllVisitors(userId: string): Promise<Checkin[]> {
  // Find all active check-ins for the user's visitors
  const activeCheckins = await prisma.checkin.findMany({
    where: {
      visitor: {
        owner_id: userId,
        deleted_at: null,
      },
      actual_checkout_at: null,
      deleted_at: null,
    },
  });

  // If no active check-ins, return empty array
  if (activeCheckins.length === 0) {
    return [];
  }

  // Update all check-ins to be checked out
  const now = new Date();
  try {
    const updatedCheckins = await prisma.$transaction(
      activeCheckins.map((checkin) =>
        prisma.checkin.update({
          where: { id: checkin.id },
          data: { actual_checkout_at: now },
        })
      )
    );

    // Invalidate cache to ensure fresh data
    invalidateCache();

    return updatedCheckins;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in mass check-out:', error);
    throw new Error('Failed to check out visitors');
  }
}
