import { broadcastEvent } from '~/routes/api/events';
import prisma from './db.server';
import { getCachedActiveCheckins } from './checkin.server';

type CheckinInput = {
  visitorIds: string[];
  locationId: string;
  durationMinutes: number;
  userId: string;
};

type CheckinResult = {
  success: boolean;
  error?: {
    code: string;
    message: string;
    visitorNames?: string[];
  };
};

/**
 * Creates check-ins for multiple visitors at once
 * Handles validation and error cases
 */
export default async function createCheckins({
  visitorIds,
  locationId,
  durationMinutes,
  userId,
}: CheckinInput): Promise<CheckinResult> {
  try {
    // Verify all visitors belong to the current user
    const visitors = await prisma.visitor.findMany({
      where: {
        id: { in: visitorIds },
        owner_id: userId,
        deleted_at: null,
      },
    });

    if (visitors.length !== visitorIds.length) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: "One or more selected visitors don't belong to you",
        },
      };
    }

    // Verify location exists
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        deleted_at: null,
      },
    });

    if (!location) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Selected park not found',
        },
      };
    }

    // Calculate checkout time based on duration
    const checkinAt = new Date();
    const estCheckoutAt = new Date(
      checkinAt.getTime() + durationMinutes * 60 * 1000
    );

    // Check for any visitors already checked in
    const existingCheckins = await prisma.checkin.findMany({
      where: {
        visitor_id: { in: visitorIds },
        actual_checkout_at: null,
      },
      include: {
        visitor: true,
      },
    });

    if (existingCheckins.length > 0) {
      const checkedInVisitors = existingCheckins.map(
        (checkin) => checkin.visitor.name
      );
      const visitorNames = checkedInVisitors.join(', ');

      return {
        success: false,
        error: {
          code: 'ALREADY_CHECKED_IN',
          message: `${visitorNames} already checked in`,
          visitorNames: checkedInVisitors,
        },
      };
    }

    // Create check-ins for all visitors
    await Promise.all(
      visitorIds.map((visitorId) =>
        prisma.checkin.create({
          data: {
            visitor_id: visitorId,
            location_id: locationId,
            checkin_at: checkinAt,
            est_checkout_at: estCheckoutAt,
          },
        })
      )
    );

    // Broadcast event for real-time updates
    const updatedParks = await getCachedActiveCheckins();
    broadcastEvent('checkin:changed', { parksWithVisitors: updatedParks });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred while checking in',
      },
    };
  }
}
