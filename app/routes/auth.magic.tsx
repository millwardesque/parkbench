import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import prisma from '~/utils/db.server';
import { verifyMagicLinkToken } from '~/lib/auth.server';

// Schema to validate the query parameters
const MagicLinkQuerySchema = z.object({
  token: z.string(),
  email: z.string().email(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  const result = MagicLinkQuerySchema.safeParse(queryParams);

  if (!result.success) {
    return json({ error: 'Invalid magic link URL.' }, { status: 400 });
  }

  const { token, email } = result.data;

  const verifiedEmail = await verifyMagicLinkToken(token, email);

  if (!verifiedEmail) {
    return json({ error: 'Invalid or expired magic link.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: verifiedEmail },
  });

  if (!user) {
    // This case should be rare if the link was generated for a valid user.
    return json({ error: 'User not found.' }, { status: 404 });
  }

  // TODO: Create a user session and set the session cookie (WBS-9.1)
  // Will log user authentication after session implementation
  // User ${user.id} successfully authenticated

  // For now, we'll just redirect to a placeholder profile page.
  return redirect('/profile');
}

export default function AuthMagicRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-sm w-full">
        <h1 className="text-xl font-bold text-center mb-4">
          Magic Link Verification
        </h1>
        {data.error ? (
          <p className="text-red-600 text-center">{data.error}</p>
        ) : (
          <p className="text-gray-700 text-center">
            Please wait while we sign you in...
          </p>
        )}
      </div>
    </div>
  );
}
