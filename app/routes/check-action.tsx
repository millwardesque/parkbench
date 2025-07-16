/* eslint-disable import/prefer-default-export */
import { parseWithZod } from '@conform-to/zod';
import { ActionFunctionArgs, redirect } from '@remix-run/node';
import { z } from 'zod';
import prisma from '~/utils/db.server';
import { requireUserId, validateCsrfToken } from '~/utils/session.server';
import { broadcastEvent } from '~/routes/api.events';
import { getCachedActiveCheckins } from '~/utils/checkin.server';
import { withRateLimit } from '~/utils/limiter.server';

const checkInSchema = z.object({
  intent: z.literal('check-in'),
  visitorId: z.string(),
  locationId: z.string(),
});

const checkOutSchema = z.object({
  intent: z.literal('check-out'),
  checkinId: z.string(),
});

const schema = z.union([checkInSchema, checkOutSchema]);

export const action = withRateLimit(async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  await validateCsrfToken(formData, request.headers);

  const submission = parseWithZod(formData, { schema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { intent } = submission.value;

  if (intent === 'check-in') {
    const { visitorId, locationId } = submission.value;
    // Ensure the visitor belongs to the current user
    const visitor = await prisma.visitor.findFirst({
      where: { id: visitorId, owner_id: userId },
    });

    if (!visitor) {
      return new Response(
        JSON.stringify(submission.reply({ formErrors: ['Visitor not found'] })),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create the check-in record
    await prisma.checkin.create({
      data: {
        visitor_id: visitorId,
        location_id: locationId,
        checkin_at: new Date(),
        // Estimate checkout to be 2 hours from now
        est_checkout_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    // Get updated parks data and broadcast the event
    const updatedParks = await getCachedActiveCheckins();
    broadcastEvent('checkin:changed', { parksWithVisitors: updatedParks });
  } else if (intent === 'check-out') {
    const { checkinId } = submission.value;
    // Ensure the check-in record belongs to a visitor of the current user
    const checkin = await prisma.checkin.findFirst({
      where: {
        id: checkinId,
        visitor: { owner_id: userId },
      },
    });

    if (!checkin) {
      return new Response(
        JSON.stringify(
          submission.reply({ formErrors: ['Check-in not found'] })
        ),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Update the check-in record
    await prisma.checkin.update({
      where: { id: checkinId },
      data: { actual_checkout_at: new Date() },
    });

    // Get updated parks data and broadcast the event
    const updatedParks = await getCachedActiveCheckins();
    broadcastEvent('checkin:changed', { parksWithVisitors: updatedParks });
  }

  return redirect('/');
});
