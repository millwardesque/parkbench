import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { verifyEmail } from '~/utils/user.server';

/**
 * Email verification page loader.
 * Verifies a user's email using the token in the query parameters.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return json({ success: false, error: 'Missing verification token' });
  }

  const success = await verifyEmail(token);

  return json({ success, error: success ? null : 'Invalid or expired token' });
}

/**
 * Email verification page component.
 * Shows success or error message based on verification result.
 */
export default function VerifyEmail() {
  const { success, error } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Email Verification</h1>

      {success ? (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-bold">Success!</strong>
          <p>
            Your email has been verified. You can now use all features of the
            app.
          </p>
          <div className="mt-4">
            <Link
              to="/"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Go to Home
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <p>{error}</p>
          <div className="mt-4">
            <Link
              to="/resend-verification"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Resend Verification Email
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
