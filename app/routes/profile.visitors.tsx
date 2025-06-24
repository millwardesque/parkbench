import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, useLoaderData, useFetcher } from '@remix-run/react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import { useState, useEffect } from 'react';
import { z } from 'zod';

import prisma from '~/utils/db.server';
import { requireUserId, validateCsrfToken } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const visitors = await prisma.visitor.findMany({
    where: { owner_id: userId },
    orderBy: { name: 'asc' },
  });
  return json({ visitors });
}

const VisitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export async function action({ request }: ActionFunctionArgs) {
  await validateCsrfToken(request);
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'create') {
    const result = VisitorSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    await prisma.visitor.create({
      data: {
        name: result.data.name,
        owner_id: userId,
      },
    });
    return json({ ok: true });
  }

  if (intent === 'update') {
    const visitorId = formData.get('visitorId');
    if (typeof visitorId !== 'string') {
      return json({ error: 'Invalid visitorId' }, { status: 400 });
    }
    const result = VisitorSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    await prisma.visitor.updateMany({
      where: { id: visitorId, owner_id: userId },
      data: { name: result.data.name },
    });
    return json({ ok: true });
  }

  if (intent === 'delete') {
    const visitorId = formData.get('visitorId');
    if (typeof visitorId !== 'string') {
      return json({ error: 'Invalid visitorId' }, { status: 400 });
    }
    await prisma.visitor.deleteMany({
      where: { id: visitorId, owner_id: userId },
    });
    return json({ ok: true });
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

export default function VisitorsRoute() {
  const { visitors } = useLoaderData<typeof loader>();
  const [editingVisitorId, setEditingVisitorId] = useState<string | null>(null);

  const fetcher = useFetcher<{ ok: boolean }>();
  const csrf = useAuthenticityToken();

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) {
      setEditingVisitorId(null);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Add a new visitor</h3>
        <Form method="post" className="flex items-center gap-4">
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="intent" value="create" />
          <label htmlFor="name" className="flex-grow">
            <span className="sr-only">Visitor Name</span>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Visitor Name"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Add Visitor
          </button>
        </Form>
      </div>

      <div>
        <h2 className="text-xl font-bold">Your Visitors</h2>
        {visitors.length === 0 ? (
          <p className="mt-4">You haven&apos;t added any visitors yet.</p>
        ) : (
          <ul className="space-y-2">
            {visitors.map((visitor) =>
              editingVisitorId === visitor.id ? (
                <li key={visitor.id} className="rounded-lg border p-4">
                  <fetcher.Form
                    method="post"
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="csrf" value={csrf} />
                    <input type="hidden" name="intent" value="update" />
                    <input type="hidden" name="visitorId" value={visitor.id} />
                    <div className="flex-grow">
                      <label htmlFor={`name-${visitor.id}`}>
                        <span className="sr-only">Visitor Name</span>
                        <input
                          type="text"
                          id={`name-${visitor.id}`}
                          name="name"
                          defaultValue={visitor.name}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingVisitorId(null)}
                      className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </fetcher.Form>
                </li>
              ) : (
                <li
                  key={visitor.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <span>{visitor.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingVisitorId(visitor.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      Edit
                    </button>
                    <Form method="post">
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="intent" value="delete" />
                      <input
                        type="hidden"
                        name="visitorId"
                        value={visitor.id}
                      />
                      <button
                        type="submit"
                        className="text-sm font-medium text-red-600 hover:text-red-500"
                        aria-label={`Delete ${visitor.name}`}
                      >
                        Delete
                      </button>
                    </Form>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
