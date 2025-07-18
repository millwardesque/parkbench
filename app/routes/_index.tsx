import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import { useState } from 'react';
import { requireUserId } from '~/utils/session.server';
import prisma from '~/utils/db.server';
import {
  type ParkWithVisitors,
  getCachedActiveCheckins,
} from '~/utils/checkin.server';
import type { Location, Visitor, Checkin } from '@prisma/client';
import useParkList from '~/utils/useParkList';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const [locations, visitors, parksWithVisitors] = await Promise.all([
    prisma.location.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
    }),
    prisma.visitor.findMany({
      where: { owner_id: userId, deleted_at: null },
      include: {
        checkins: {
          where: { actual_checkout_at: null },
          orderBy: { checkin_at: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    getCachedActiveCheckins(),
  ]);

  // For API requests, return only the parks data
  const url = new URL(request.url);
  if (
    url.searchParams.has('_data') &&
    url.searchParams.get('_data')?.includes('routes/_index')
  ) {
    return json({ parksWithVisitors });
  }

  return json({ locations, visitors, parksWithVisitors });
}

/**
 * Component to display a visitor badge with duration information
 */
function VisitorBadge({
  name,
  checkin,
}: {
  name: string;
  checkin: {
    checkin_at: Date | string;
    est_checkout_at?: Date | string;
    actual_checkout_at?: Date | string | null;
  } | null;
}) {
  // If no checkin data is provided, just show the name
  if (!checkin) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {name}
      </span>
    );
  }

  // Parse dates to ensure they are Date objects
  const checkinTime =
    checkin.checkin_at instanceof Date
      ? checkin.checkin_at
      : new Date(checkin.checkin_at);

  // Handle est_checkout_at with simpler conditional logic
  let estCheckoutTime = null;
  if (checkin.est_checkout_at) {
    estCheckoutTime =
      checkin.est_checkout_at instanceof Date
        ? checkin.est_checkout_at
        : new Date(checkin.est_checkout_at);
  }

  // Current time for calculations
  const now = new Date();

  // Calculate time since check-in
  const elapsedMs = now.getTime() - checkinTime.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  // Format elapsed time
  let elapsedText = '';
  if (elapsedMinutes < 60) {
    elapsedText = `${elapsedMinutes}m`;
  } else {
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    elapsedText = `${hours}h${mins ? ` ${mins}m` : ''}`;
  }

  // Calculate remaining time if est_checkout_at is available
  let remainingText = '';
  if (estCheckoutTime) {
    const remainingMs = estCheckoutTime.getTime() - now.getTime();

    // Only show remaining time if it's positive
    if (remainingMs > 0) {
      const remainingMinutes = Math.floor(remainingMs / (1000 * 60));

      if (remainingMinutes < 60) {
        remainingText = `${remainingMinutes}m left`;
      } else {
        const hours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;
        remainingText = `${hours}h${mins ? ` ${mins}m` : ''} left`;
      }
    } else {
      remainingText = 'Overdue';
    }
  }

  return (
    <span className="inline-flex flex-col items-start px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
      <span className="font-semibold">{name}</span>
      <span className="text-xs text-blue-600">
        {elapsedText} {remainingText && `• ${remainingText}`}
      </span>
    </span>
  );
}

/**
 * Component to display the list of parks with visitors
 */
function ParkList({
  parks,
}: {
  parks: ParkWithVisitors[] | Array<Record<string, unknown>>;
}) {
  // Convert serialized data back to the expected format if needed
  const normalizedParks = parks.map((park) => ({
    id: park.id,
    name: park.name,
    visitors: Array.isArray(park.visitors)
      ? park.visitors.map((v: Record<string, unknown>) => ({
          id: v.id,
          name: v.name,
          checkin: v.checkin,
        }))
      : [],
  }));
  if (normalizedParks.length === 0) {
    return (
      <div className="px-6 py-4 text-center text-gray-500">
        No one is currently checked in at any park
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {normalizedParks.map((park) => (
        <li key={park.id?.toString()} className="px-6 py-4">
          <div className="flex justify-between items-center mb-2">
            <p className="font-medium text-gray-900">{park.name?.toString()}</p>
            <Link
              to={`/checkin?parkId=${encodeURIComponent(park.id?.toString() || '')}`}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label={`Check in a visitor to ${park.name?.toString()}`}
            >
              Check-in visitor
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {park.visitors.map((visitor: Record<string, unknown>) => {
              // Safely extract checkin data with proper type checking
              const checkinData =
                visitor.checkin && typeof visitor.checkin === 'object'
                  ? {
                      checkin_at: (visitor.checkin as Record<string, unknown>)
                        .checkin_at as Date | string,
                      est_checkout_at: (
                        visitor.checkin as Record<string, unknown>
                      ).est_checkout_at as Date | string | undefined,
                      actual_checkout_at: (
                        visitor.checkin as Record<string, unknown>
                      ).actual_checkout_at as Date | string | null | undefined,
                    }
                  : null;

              return (
                <VisitorBadge
                  key={visitor.id?.toString()}
                  name={visitor.name?.toString() || ''}
                  checkin={checkinData}
                />
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  // Handle both full data and partial refresh data
  const locations =
    'locations' in loaderData ? (loaderData.locations as Location[]) : [];
  const visitors =
    'visitors' in loaderData
      ? (loaderData.visitors as Array<Visitor & { checkins: Checkin[] }>)
      : [];
  const initialParksWithVisitors =
    'parksWithVisitors' in loaderData ? loaderData.parksWithVisitors : [];
  const csrf = useAuthenticityToken();
  const [selectedLocations, setSelectedLocations] = useState<
    Record<string, string>
  >({});

  // Use our custom hook for park list data with automatic refresh
  const { parks: parksWithVisitors, refresh: refreshParks } = useParkList();

  // We'll use refreshParks directly in the form onSubmit handlers

  // Real-time updates will be implemented with polling later

  const visitorCheckinMap = new Map<string, string | null>();
  visitors.forEach((visitor: Visitor & { checkins: Checkin[] }) => {
    if (visitor.checkins.length > 0) {
      const location = locations.find(
        (loc: Location) => loc.id === visitor.checkins[0].location_id
      );
      visitorCheckinMap.set(visitor.id, location?.name ?? 'Unknown Location');
    } else {
      visitorCheckinMap.set(visitor.id, null);
    }
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Your Visitors
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {visitors.map((visitor: Visitor & { checkins: Checkin[] }) => {
                  const isCheckedIn = visitor.checkins.length > 0;
                  const checkedInLocationName = isCheckedIn
                    ? visitorCheckinMap.get(visitor.id)
                    : null;

                  return (
                    <li
                      key={visitor.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {visitor.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {isCheckedIn
                            ? `Checked in at ${checkedInLocationName}`
                            : 'Not checked in'}
                        </p>
                      </div>
                      <div>
                        {isCheckedIn ? (
                          <Form
                            method="post"
                            action="/check-action"
                            onSubmit={() => setTimeout(refreshParks, 500)}
                          >
                            <input type="hidden" name="csrf" value={csrf} />
                            <input
                              type="hidden"
                              name="intent"
                              value="check-out"
                            />
                            <input
                              type="hidden"
                              name="checkinId"
                              value={visitor.checkins[0].id}
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Check Out
                            </button>
                          </Form>
                        ) : (
                          <Form
                            action="/check-action"
                            method="post"
                            className="flex space-x-2 items-center"
                            onSubmit={() => setTimeout(refreshParks, 500)}
                          >
                            <input type="hidden" name="csrf" value={csrf} />
                            <input
                              type="hidden"
                              name="intent"
                              value="check-in"
                            />
                            <input
                              type="hidden"
                              name="visitorId"
                              value={visitor.id}
                            />
                            <select
                              name="locationId"
                              value={selectedLocations[visitor.id] || ''}
                              onChange={(e) =>
                                setSelectedLocations((prev) => ({
                                  ...prev,
                                  [visitor.id]: e.target.value,
                                }))
                              }
                              className="text-sm rounded-md border-gray-300"
                            >
                              <option value="" disabled>
                                Select park...
                              </option>
                              {locations.map((location: Location) => (
                                <option key={location.id} value={location.id}>
                                  {location.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={!selectedLocations[visitor.id]}
                              className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
                            >
                              Check In
                            </button>
                          </Form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Parks</h2>
            <div
              className="bg-white rounded-lg shadow overflow-hidden"
              aria-live="polite"
              aria-atomic="true"
            >
              <ParkList
                parks={
                  parksWithVisitors.length > 0
                    ? parksWithVisitors
                    : initialParksWithVisitors || []
                }
              />
            </div>

            {/* Add navigation CTA buttons for Check-in and bulk operations */}
            {locations.length > 0 && (
              <div className="mt-6 text-center space-x-4">
                <Link
                  to="/checkin"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  aria-label="Check in a visitor to a park"
                >
                  Check-in
                </Link>

                {/* Mass check-in button (WBS-60) */}
                <Form
                  action="/checkin-all"
                  method="post"
                  className="inline"
                  onSubmit={() => setTimeout(refreshParks, 500)}
                >
                  <input type="hidden" name="csrf" value={csrf} />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    aria-label="Check in all visitors at once"
                  >
                    Check-in Everyone
                  </button>
                </Form>

                {/* Mass check-out button (WBS-61) */}
                <Form
                  action="/checkout-all"
                  method="post"
                  className="inline"
                  onSubmit={() => setTimeout(refreshParks, 500)}
                >
                  <input type="hidden" name="csrf" value={csrf} />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    aria-label="Check out all visitors at once"
                  >
                    Check-out Everyone
                  </button>
                </Form>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
