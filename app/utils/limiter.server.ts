// app/utils/limiter.server.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  LoaderFunction,
  ActionFunction,
} from '@remix-run/node';

const rateLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

export async function checkRateLimit(request: Request) {
  const ip =
    request.headers.get('X-Forwarded-For') ??
    request.headers.get('REMOTE_ADDR');
  if (!ip) {
    // Cannot rate limit if IP is not available
    return;
  }

  try {
    await rateLimiter.consume(ip);
  } catch (error) {
    throw new Response('Too Many Requests', { status: 429 });
  }
}

type RemixHandler = (
  args: LoaderFunctionArgs | ActionFunctionArgs
) => ReturnType<LoaderFunction | ActionFunction>;

export function withRateLimit(handler: RemixHandler) {
  return async (args: LoaderFunctionArgs | ActionFunctionArgs) => {
    await checkRateLimit(args.request);
    return handler(args);
  };
}
