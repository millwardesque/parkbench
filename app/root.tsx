import {
  json,
  type LinksFunction,
  type LoaderFunctionArgs,
  type HeadersFunction,
} from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react';

import { csrf, getUserId } from '~/utils/session.server';
import { ToastFromHeaders } from './components/Toast';
import Navigation from './components/Navigation';

import './global.css';

export async function loader({ request }: LoaderFunctionArgs) {
  const [token, cookieHeader] = await csrf.commitToken(request);
  // Check if user is authenticated (don't require it)
  const userId = await getUserId(request);

  return json(
    {
      csrf: token,
      isAuthenticated: Boolean(userId),
    },
    {
      headers: cookieHeader
        ? {
            'Set-Cookie': cookieHeader,
          }
        : undefined,
    }
  );
}

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export const headers: HeadersFunction = ({
  actionHeaders,
}: {
  loaderHeaders: Headers;
  parentHeaders: Headers;
  actionHeaders: Headers;
}) => {
  // Extract success/error headers from action to pass to client
  const responseHeaders = new Headers();

  // Check for success messages
  const successHeader = actionHeaders.get('X-Success');
  const successMessageHeader = actionHeaders.get('X-Success-Message');

  if (successHeader) {
    responseHeaders.append('X-Success', successHeader);
  }

  if (successMessageHeader) {
    responseHeaders.append('X-Success-Message', successMessageHeader);
  }

  // Check for error messages
  const errorHeader = actionHeaders.get('X-Error');
  const errorMessageHeader = actionHeaders.get('X-Error-Message');

  if (errorHeader) {
    responseHeaders.append('X-Error', errorHeader);
  }

  if (errorMessageHeader) {
    responseHeaders.append('X-Error-Message', errorMessageHeader);
  }

  return responseHeaders;
};

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <Navigation isAuthenticated={isAuthenticated} />
        {children}
        <ScrollRestoration />
        <ToastFromHeaders />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { csrf: token } = useLoaderData<typeof loader>();

  return (
    <Layout>
      <AuthenticityTokenProvider token={token}>
        <Outlet />
      </AuthenticityTokenProvider>
    </Layout>
  );
}
