/**
 * API endpoint for park data
 * Provides JSON for external clients (e.g., mobile apps)
 */
import { json } from '@remix-run/node';
import { getCachedActiveCheckins } from '~/utils/checkin.server';

/**
 * GET /api/parks
 * Returns list of parks with active check-ins
 */
export async function loader() {
  // Use the same cached function we use for the UI to reduce DB load
  const parksWithVisitors = await getCachedActiveCheckins();

  // Set appropriate headers
  const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=5'); // Can be cached for 5 seconds
  headers.set('Content-Type', 'application/json');

  // Return the data as JSON
  return json(
    {
      parks: parksWithVisitors,
      lastUpdated: new Date().toISOString(),
      total: parksWithVisitors.length,
    },
    { headers }
  );
}

/**
 * All other HTTP methods return 405 Method Not Allowed
 */
export function action() {
  return new Response('Method not allowed', {
    status: 405,
    headers: {
      Allow: 'GET',
    },
  });
}
