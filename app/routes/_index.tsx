import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
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
import VisitorBadge from './_index/VisitorBadge';

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
    return json({ userId, parksWithVisitors });
  }

  return json({ locations, userId, visitors, parksWithVisitors });
}

/**
 * Component to display the list of parks with visitors
 */
function ParkList({
  parks,
  userId,
}: {
  parks: ParkWithVisitors[] | Array<Record<string, unknown>>;
  userId: string;
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
          <h3 className="font-medium text-gray-900">{park.name?.toString()}</h3>
          <div className="flex flex-wrap gap-2">
            {park.visitors.map((visitor: Record<string, unknown>) => {
              // Safely extract checkin data with proper type checking
              const checkinData =
                visitor.checkin && typeof visitor.checkin === 'object'
                  ? {
                      checkin_at: new Date(
                        (visitor.checkin as Record<string, unknown>)
                          .checkin_at as Date | string
                      ),
                      est_checkout_at: new Date(
                        (visitor.checkin as Record<string, unknown>)
                          .est_checkout_at as Date | string
                      ),
                    }
                  : null;

              return (
                <VisitorBadge
                  key={visitor.id?.toString()}
                  name={visitor.name?.toString() || ''}
                  checkInAt={checkinData!.checkin_at}
                  estimatedCheckoutAt={checkinData!.est_checkout_at}
                  isMyVisitor={visitor.owner_id === userId}
                  parentName={visitor.parent_name?.toString() || ''}
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
  const userId = 'userId' in loaderData ? loaderData.userId : '';
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
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                              className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                              className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
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
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              aria-live="polite"
              aria-atomic="true"
            >
              <ParkList
                parks={
                  parksWithVisitors.length > 0
                    ? parksWithVisitors
                    : initialParksWithVisitors || []
                }
                userId={userId}
              />
            </div>

            {locations.length > 0 && (
              <div className="mt-6 text-center space-x-4">
                <Form
                  action="/checkin-all"
                  method="post"
                  className="inline"
                  onSubmit={() => setTimeout(refreshParks, 500)}
                >
                  <input type="hidden" name="csrf" value={csrf} />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    aria-label="Check in all visitors at once"
                  >
                    Check-in Everyone
                  </button>
                </Form>

                <Form
                  action="/checkout-all"
                  method="post"
                  className="inline"
                  onSubmit={() => setTimeout(refreshParks, 500)}
                >
                  <input type="hidden" name="csrf" value={csrf} />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
