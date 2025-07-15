import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { logout } from '~/utils/session.server';
import { withRateLimit } from '~/utils/limiter.server';

export const action = withRateLimit(async ({ request }: ActionFunctionArgs) =>
  logout(request)
);

export async function loader({ request }: LoaderFunctionArgs) {
  return logout(request);
}
