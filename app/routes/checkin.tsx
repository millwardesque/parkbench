/**
 * Generic check-in flow for visitors
 * Allows users to check in visitors to any location
 * Can accept optional parkId query parameter to pre-select a park
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
  useSearchParams,
} from '@remix-run/react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { requireUserId } from '~/utils/session.server';
import prisma from '~/utils/db.server';
import createCheckins from '~/utils/createCheckins.server';
import { withRateLimit } from '~/utils/limiter.server';

// Form validation schema
const CheckInSchema = z.object({
  visitorIds: z
    .array(z.string().uuid())
    .min(1, 'Please select at least one visitor'),
  locationId: z.string().uuid().min(1, 'Please select a park'),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(15, 'Please select a valid duration'),
});

type CheckInFormData = z.infer<typeof CheckInSchema>;

type ActionErrors = {
  visitorIds?: string;
  locationId?: string;
  durationMinutes?: string;
  form?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const parkId = url.searchParams.get('parkId');

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

  // Check if parkId query param is valid
  let preselectedParkId = null;
  if (parkId) {
    const parkExists = locations.some((location) => location.id === parkId);
    if (parkExists) {
      preselectedParkId = parkId;
    }
  }

  return json({ locations, visitors, preselectedParkId });
}

export const action = withRateLimit(async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const rawVisitorIds = formData.getAll('visitorIds') as string[];
  const rawLocationId = formData.get('locationId') as string;
  const rawDurationMinutes = Number(formData.get('durationMinutes'));

  // Validate form data
  const validationResult = CheckInSchema.safeParse({
    visitorIds: rawVisitorIds,
    locationId: rawLocationId,
    durationMinutes: rawDurationMinutes,
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
        values: {
          visitorIds: rawVisitorIds,
          locationId: rawLocationId,
          durationMinutes: rawDurationMinutes,
        },
      },
      { status: 400 }
    );
  }

  // Use the createCheckins utility function to handle check-ins
  const validatedData: CheckInFormData = validationResult.data;

  const result = await createCheckins({
    visitorIds: validatedData.visitorIds,
    locationId: validatedData.locationId,
    durationMinutes: validatedData.durationMinutes,
    userId,
  });

  if (!result.success) {
    // Handle specific error cases
    const { error } = result;
    let status = 500;

    switch (error?.code) {
      case 'UNAUTHORIZED':
        status = 403;
        break;
      case 'NOT_FOUND':
        status = 404;
        break;
      case 'ALREADY_CHECKED_IN':
        status = 400;
        break;
      default:
        status = 500;
    }

    return json(
      {
        errors: {
          form: error?.message || 'An error occurred while checking in',
        },
        values: {
          visitorIds: validatedData.visitorIds,
          locationId: validatedData.locationId,
          durationMinutes: validatedData.durationMinutes,
        },
      },
      { status }
    );
  }

  // On success, redirect with success toast notification
  return redirect('/', {
    headers: {
      'X-Success': 'true',
      'X-Success-Message': 'Visitors checked in successfully',
    },
  });
});

export default function CheckInPage() {
  const { locations, visitors, preselectedParkId } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [selectedVisitorIds, setSelectedVisitorIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<string>(preselectedParkId || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  useSearchParams(); // Needed for URL-driven updates

  // Initialize form state from action data (in case of validation errors)
  // or from search params (for pre-selected park)
  useEffect(() => {
    if (actionData?.values) {
      setSelectedVisitorIds(actionData.values.visitorIds);
      setLocationId(actionData.values.locationId);
      setDurationMinutes(actionData.values.durationMinutes);
    } else if (preselectedParkId) {
      setLocationId(preselectedParkId);
      // Try to select the first visitor if available
      if (visitors.length > 0) {
        setSelectedVisitorIds([visitors[0].id]);
      }
    }
  }, [actionData, preselectedParkId, visitors]);

  // Handle visitor selection changes
  const handleVisitorChange = (visitorId: string) => {
    setSelectedVisitorIds((prev) =>
      prev.includes(visitorId)
        ? prev.filter((id) => id !== visitorId)
        : [...prev, visitorId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Check-in Visitors
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg p-6">
          {actionData?.errors && 'form' in actionData.errors && (
            <div className="mb-4 p-3 border border-red-400 bg-red-50 rounded-md text-red-700">
              {actionData.errors.form}
            </div>
          )}

          {visitors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                You don&apos;t have any visitors available to check in.
              </p>
              <p className="mt-2">
                <a
                  href="/profile/visitors"
                  className="text-blue-600 hover:underline"
                >
                  Add visitors to your profile
                </a>
              </p>
            </div>
          ) : (
            <Form method="post" className="space-y-6">
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Visitors
                </label>
                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {visitors.map((visitor) => (
                    <div
                      key={visitor.id}
                      className="flex items-center p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        id={`visitor-${visitor.id}`}
                        name="visitorIds"
                        value={visitor.id}
                        checked={selectedVisitorIds.includes(visitor.id)}
                        onChange={() => handleVisitorChange(visitor.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        aria-labelledby={`visitor-${visitor.id}-name`}
                      />
                      <label
                        id={`visitor-${visitor.id}-name`}
                        htmlFor={`visitor-${visitor.id}`}
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        {visitor.name}
                      </label>
                    </div>
                  ))}
                </div>
                {actionData?.errors && 'visitorIds' in actionData.errors && (
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
                {actionData?.errors && 'locationId' in actionData.errors && (
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
                {actionData?.errors &&
                  'durationMinutes' in actionData.errors && (
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
