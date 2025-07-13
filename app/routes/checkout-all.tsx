import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { requireUserId, validateCsrfToken } from '~/utils/session.server';
import { checkOutAllVisitors } from '~/utils/mass-checkin.server';

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  await validateCsrfToken(formData, request.headers);

  try {
    const checkins = await checkOutAllVisitors(userId);

    const headers = new Headers();
    headers.set('X-Success', 'true');
    headers.set(
      'X-Success-Message',
      `${checkins.length} ${checkins.length === 1 ? 'visitor' : 'visitors'} checked out successfully`
    );

    return json(
      { success: true, count: checkins.length },
      { status: 200, headers }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in mass check-out:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}

// Redirect to home if someone tries to visit this URL directly
export async function loader() {
  return redirect('/');
}

export default function CheckoutAllForm() {
  return (
    <Form method="post">
      <button
        type="submit"
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow"
      >
        Check Out Everyone
      </button>
    </Form>
  );
}
