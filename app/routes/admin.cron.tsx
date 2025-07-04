// app/routes/admin.cron.tsx
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import prisma from '~/utils/db.server';

export async function loader() {
  // This is a simple example. In a real app, you'd want to protect
  // this route with authentication and authorization.
  const cronJobRun = await prisma.cronJobRun.findUnique({
    where: { job_name: 'expire_stale_checkins' },
  });

  return json({ cronJobRun });
}

export default function AdminCron() {
  const { cronJobRun } = useLoaderData<typeof loader>();

  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Cron Job Status</h1>
      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold">Expire Stale Check-ins</h2>
        {cronJobRun ? (
          <p className="mt-2">
            Last run at:{' '}
            <time dateTime={cronJobRun.last_run_at}>
              {new Date(cronJobRun.last_run_at).toLocaleString()}
            </time>
          </p>
        ) : (
          <p className="mt-2 text-gray-500">This job has not run yet.</p>
        )}
      </div>
    </div>
  );
}
