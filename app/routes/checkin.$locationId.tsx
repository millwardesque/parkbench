/**
 * Check-in flow for visitors
 * Allows users to check in visitors to a specific location
 */
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { useState } from 'react';
import { z } from 'zod';
import { requireUserId } from '~/utils/session.server';
import prisma from '~/utils/db.server';

// Form validation schema
const CheckInSchema = z.object({
  visitorIds: z.array(z.string().uuid()).min(1, 'Select at least one visitor'),
  locationId: z.string().uuid(),
  durationMinutes: z.coerce.number().int().min(15).max(240),
});

type ActionErrors = {
  visitorIds?: string;
  locationId?: string;
  durationMinutes?: string;
  form?: string;
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  // Get all locations and visitors that belong to the user
  const [locations, visitors] = await Promise.all([
    prisma.location.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
    }),
    prisma.visitor.findMany({
      where: {
        owner_id: userId,
        deleted_at: null,
        // Only include visitors who are not already checked in
        checkins: {
          none: {
            actual_checkout_at: null,
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Check if locationId param exists and is valid
  let preselectedLocationId = null;
  if (params.locationId) {
    const locationExists = locations.some(
      (location) => location.id === params.locationId
    );
    if (locationExists) {
      preselectedLocationId = params.locationId;
    }
  }

  return json({ locations, visitors, preselectedLocationId });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  // Parse form data
  const selectedVisitorIds = formData.getAll('visitorIds').map(String);
  const locationId = formData.get('locationId')?.toString();
  const durationMinutes = Number(formData.get('durationMinutes'));

  const validationResult = CheckInSchema.safeParse({
    visitorIds: selectedVisitorIds,
    locationId,
    durationMinutes,
  });

  if (!validationResult.success) {
    const { fieldErrors } = validationResult.error.flatten();
    const errors: ActionErrors = {
      visitorIds: fieldErrors.visitorIds?.[0],
      locationId: fieldErrors.locationId?.[0],
      durationMinutes: fieldErrors.durationMinutes?.[0],
    };

    return json(
      {
        errors,
        values: { visitorIds: selectedVisitorIds, locationId, durationMinutes },
      },
      { status: 400 }
    );
  }

  try {
    const {
      visitorIds: validatedVisitorIds,
      locationId: validatedLocationId,
      durationMinutes: validatedDurationMinutes,
    } = validationResult.data;

    // Calculate checkout time based on duration
    const checkinAt = new Date();
    const estCheckoutAt = new Date(
      checkinAt.getTime() + validatedDurationMinutes * 60 * 1000
    );

    // Verify all visitors belong to the current user
    const visitors = await prisma.visitor.findMany({
      where: {
        id: { in: validatedVisitorIds },
        owner_id: userId,
        deleted_at: null,
      },
    });

    if (visitors.length !== validatedVisitorIds.length) {
      return json(
        {
          errors: {
            form: "One or more selected visitors don't belong to you",
          },
          values: {
            visitorIds: validatedVisitorIds,
            locationId: validatedLocationId,
            durationMinutes: validatedDurationMinutes,
          },
        },
        { status: 403 }
      );
    }

    // Verify location exists
    const location = await prisma.location.findFirst({
      where: {
        id: validatedLocationId,
        deleted_at: null,
      },
    });

    if (!location) {
      return json(
        {
          errors: {
            locationId: "Selected location doesn't exist",
          },
          values: {
            visitorIds: validatedVisitorIds,
            locationId: validatedLocationId,
            durationMinutes: validatedDurationMinutes,
          },
        },
        { status: 404 }
      );
    }

    // Verify visitors aren't already checked in elsewhere
    const activeCheckins = await prisma.checkin.findMany({
      where: {
        visitor_id: { in: validatedVisitorIds },
        actual_checkout_at: null,
        deleted_at: null,
      },
    });

    if (activeCheckins.length > 0) {
      // Get the names of visitors who are already checked in
      const alreadyCheckedInVisitorIds = activeCheckins.map(
        (c) => c.visitor_id
      );
      const alreadyCheckedInVisitors = visitors.filter((v) =>
        alreadyCheckedInVisitorIds.includes(v.id)
      );
      const visitorNames = alreadyCheckedInVisitors
        .map((v) => v.name)
        .join(', ');

      return json(
        {
          errors: {
            form: `${visitorNames} ${alreadyCheckedInVisitors.length > 1 ? 'are' : 'is'} already checked in somewhere else`,
          },
          values: {
            visitorIds: validatedVisitorIds,
            locationId: validatedLocationId,
            durationMinutes: validatedDurationMinutes,
          },
        },
        { status: 400 }
      );
    }

    // Create check-ins for all selected visitors
    await prisma.checkin.createMany({
      data: validatedVisitorIds.map((visitorId) => ({
        visitor_id: visitorId,
        location_id: validatedLocationId,
        user_id: userId,
        checkin_at: checkinAt,
        est_checkout_at: estCheckoutAt,
        actual_checkout_at: null,
      })),
    });

    return redirect('/');
  } catch (error) {
    return json(
      {
        errors: {
          form: 'Failed to check in. Please try again.',
        },
        values: {
          visitorIds: validationResult.data.visitorIds,
          locationId: validationResult.data.locationId,
          durationMinutes: validationResult.data.durationMinutes,
        },
      },
      { status: 500 }
    );
  }
}

export default function CheckInPage() {
  const { locations, visitors, preselectedLocationId } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [selectedVisitorIds, setSelectedVisitorIds] = useState<string[]>(
    actionData?.values?.visitorIds || []
  );
  const [locationId, setLocationId] = useState<string>(
    actionData?.values?.locationId || preselectedLocationId || ''
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    actionData?.values?.durationMinutes || 60
  );

  const handleVisitorChange = (visitorId: string) => {
    setSelectedVisitorIds((prev) =>
      prev.includes(visitorId)
        ? prev.filter((id) => id !== visitorId)
        : [...prev, visitorId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Check In</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {visitors.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">
                No visitors available to check in. They may already be checked
                in elsewhere.
              </p>
            </div>
          ) : (
            <Form method="post" className="space-y-6">
              {actionData?.errors?.form && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {actionData.errors.form}
                </div>
              )}

              <div>
                <div className="block text-sm font-medium text-gray-700 mb-2">
                  Select Visitors
                </div>
                <div className="space-y-2">
                  {visitors.map((visitor) => (
                    <div key={visitor.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`visitor-${visitor.id}`}
                        name="visitorIds"
                        value={visitor.id}
                        checked={selectedVisitorIds.includes(visitor.id)}
                        onChange={() => handleVisitorChange(visitor.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`visitor-${visitor.id}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        {visitor.name}
                      </label>
                    </div>
                  ))}
                </div>
                {actionData?.errors?.visitorIds && (
                  <p className="mt-1 text-sm text-red-600">
                    {actionData.errors.visitorIds}
                  </p>
                )}
              </div>

              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  htmlFor="locationId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Park
                </label>
                <select
                  id="locationId"
                  name="locationId"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="" disabled>
                    Select a park...
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {actionData?.errors?.locationId && (
                  <p className="mt-1 text-sm text-red-600">
                    {actionData.errors.locationId}
                  </p>
                )}
              </div>

              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  htmlFor="durationMinutes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Duration (minutes)
                </label>
                <select
                  id="durationMinutes"
                  name="durationMinutes"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </select>
                {actionData?.errors?.durationMinutes && (
                  <p className="mt-1 text-sm text-red-600">
                    {actionData.errors.durationMinutes}
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <a
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    selectedVisitorIds.length === 0 ||
                    !locationId
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Checking in...' : 'Check In'}
                </button>
              </div>
            </Form>
          )}
        </div>
      </main>
    </div>
  );
}
