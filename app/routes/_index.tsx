import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import { useState } from 'react';
import { requireUserId } from '~/utils/session.server';
import prisma from '~/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const [locations, visitors] = await Promise.all([
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
  ]);

  return json({ locations, visitors });
}

export default function Index() {
  const { locations, visitors } = useLoaderData<typeof loader>();
  const csrf = useAuthenticityToken();
  const [selectedLocations, setSelectedLocations] = useState<
    Record<string, string>
  >({});

  const visitorCheckinMap = new Map<string, string | null>();
  visitors.forEach((visitor) => {
    if (visitor.checkins.length > 0) {
      const location = locations.find(
        (loc) => loc.id === visitor.checkins[0].location_id
      );
      visitorCheckinMap.set(visitor.id, location?.name ?? 'Unknown Location');
    } else {
      visitorCheckinMap.set(visitor.id, null);
    }
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Parkbench</h1>
          <div className="flex items-center gap-4">
            <Link
              to="/profile/visitors"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Profile
            </Link>
            <Form action="/sign-out" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </Form>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Your Visitors
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {visitors.map((visitor) => {
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
                          <Form method="post" action="/check-action">
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
                            method="post"
                            action="/check-action"
                            className="flex items-center gap-2"
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
                              {locations.map((location) => (
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {locations.map((location) => (
                  <li key={location.id} className="px-6 py-4">
                    <p className="font-medium text-gray-900">{location.name}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
