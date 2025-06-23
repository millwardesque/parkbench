import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { requireUserId } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  return json({ userId });
}

export default function ProfileLayout() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>
      <hr className="my-4" />
      <Outlet />
    </div>
  );
}
