/**
 * Check-out flow for visitors
 * Allows users to check out their visitors who are currently checked in
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
import { withRateLimit } from '~/utils/limiter.server';

// Form validation schema
const CheckOutSchema = z.object({
  checkinIds: z
    .array(z.string().uuid())
    .min(1, 'Select at least one check-in to end'),
});

type ActionErrors = {
  checkinIds?: string;
  form?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  // Get all active check-ins for the user's visitors
  const [activeCheckins] = await Promise.all([
    // User query removed as part of WBS-62
    prisma.checkin.findMany({
      where: {
        deleted_at: null,
        actual_checkout_at: null,
        visitor: {
          owner_id: userId,
          deleted_at: null,
        },
      },
      include: {
        visitor: true,
        location: true,
      },
      orderBy: [{ location: { name: 'asc' } }, { visitor: { name: 'asc' } }],
    }),
  ]);

  return json({
    activeCheckins,
  });
}

export const action = withRateLimit(async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  // Parse form data
  const selectedCheckinIds = formData.getAll('checkinIds').map(String);

  const validationResult = CheckOutSchema.safeParse({
    checkinIds: selectedCheckinIds,
  });

  if (!validationResult.success) {
    const { fieldErrors } = validationResult.error.flatten();
    const errors: ActionErrors = {
      checkinIds: fieldErrors.checkinIds?.[0],
    };

    return json(
      { errors, values: { checkinIds: selectedCheckinIds } },
      { status: 400 }
    );
  }

  try {
    const { checkinIds } = validationResult.data;

    // Verify all check-ins belong to the current user's visitors
    const checkins = await prisma.checkin.findMany({
      where: {
        id: { in: checkinIds },
        visitor: {
          owner_id: userId,
        },
        deleted_at: null,
        actual_checkout_at: null,
      },
      include: {
        visitor: true,
      },
    });

    if (checkins.length !== checkinIds.length) {
      const errors: ActionErrors = {
        form: "One or more selected check-ins don't belong to your visitors or are already checked out",
      };
      return json({ errors, values: { checkinIds } }, { status: 403 });
    }

    // End all selected check-ins
    const now = new Date();
    await prisma.$transaction(
      checkinIds.map((checkinId) =>
        prisma.checkin.update({
          where: { id: checkinId },
          data: { actual_checkout_at: now },
        })
      )
    );

    return redirect('/?checkoutSuccess=true');
  } catch (error) {
    const errors: ActionErrors = {
      form: 'Failed to check out. Please try again.',
    };
    return json(
      { errors, values: { checkinIds: selectedCheckinIds } },
      { status: 500 }
    );
  }
});

// Email verification component removed as part of WBS-62

export default function CheckOutPage() {
  const { activeCheckins } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [selectedCheckinIds, setSelectedCheckinIds] = useState<string[]>(
    actionData?.values?.checkinIds || []
  );

  const handleCheckinChange = (checkinId: string) => {
    setSelectedCheckinIds((prev) =>
      prev.includes(checkinId)
        ? prev.filter((id) => id !== checkinId)
        : [...prev, checkinId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCheckinIds.length === activeCheckins.length) {
      // If all are selected, deselect all
      setSelectedCheckinIds([]);
    } else {
      // Otherwise, select all
      setSelectedCheckinIds(activeCheckins.map((c) => c.id));
    }
  };

  // Group check-ins by location
  const checkinsByLocation = activeCheckins.reduce(
    (acc, checkin) => {
      const { location } = checkin;
      if (!acc[location.id]) {
        acc[location.id] = [];
      }
      acc[location.id].push(checkin);
      return acc;
    },
    {} as Record<string, typeof activeCheckins>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Check-out</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Email verification banner removed as part of WBS-62 */}

          {actionData?.errors && 'form' in actionData.errors && (
            <div className="mb-4 p-3 border border-red-400 bg-red-50 rounded-md text-red-700">
              {actionData.errors.form}
            </div>
          )}

          {activeCheckins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                You don&apos;t have any visitors currently checked in.
              </p>
              <p className="mt-2">
                <a href="/checkin" className="text-blue-600 hover:underline">
                  Check-in a visitor
                </a>
              </p>
            </div>
          ) : (
            <fieldset className="space-y-6">
              <Form method="post" className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Select check-ins to end
                    </h2>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      {
                        // eslint-disable-next-line no-nested-ternary
                        selectedCheckinIds.length === activeCheckins.length
                          ? 'Deselect All'
                          : 'Select All'
                      }
                    </button>
                  </div>

                  {actionData?.errors && 'checkinIds' in actionData.errors && (
                    <p className="mt-1 text-sm text-red-600">
                      {actionData.errors.checkinIds}
                    </p>
                  )}

                  <div className="space-y-6">
                    {Object.keys(checkinsByLocation).map((locationId) => {
                      const { location } = checkinsByLocation[locationId][0];
                      return (
                        <div
                          key={locationId}
                          className="border border-gray-200 rounded-md p-4"
                        >
                          <h3 className="font-medium text-gray-900 mb-3">
                            {location.name}
                          </h3>

                          <div className="space-y-2">
                            {checkinsByLocation[locationId].map((checkin) => {
                              const checkinTime = new Date(
                                checkin.checkin_at
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              });

                              return (
                                <div
                                  key={checkin.id}
                                  className="flex items-center justify-between py-2 border-t border-gray-100"
                                >
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`checkin-${checkin.id}`}
                                      name="checkinIds"
                                      value={checkin.id}
                                      checked={selectedCheckinIds.includes(
                                        checkin.id
                                      )}
                                      onChange={() =>
                                        handleCheckinChange(checkin.id)
                                      }
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded-sm focus:ring-blue-500"
                                    />
                                    <label
                                      htmlFor={`checkin-${checkin.id}`}
                                      className="ml-2 block text-sm text-gray-900"
                                    >
                                      <span className="font-medium">
                                        {checkin.visitor.name}
                                      </span>
                                      <span className="ml-2 text-sm text-gray-500">
                                        (Checked in at {checkinTime})
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <a
                    href="/"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </a>
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedCheckinIds.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-xs text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Checking out...' : 'Check Out'}
                  </button>
                </div>
              </Form>
            </fieldset>
          )}
        </div>
      </main>
    </div>
  );
}
