import { LoaderFunctionArgs } from '@remix-run/node';
import { eventStream } from 'remix-utils/sse/server';
import { requireUserId } from '~/utils/session.server';

// Global event emitter for internal event broadcasting
// This is a singleton that allows cross-request communication
const EVENT_LISTENERS: Record<string, Set<(data: unknown) => void>> = {};

/**
 * Broadcast an event to all connected clients
 * @param type Event type/name
 * @param data Event payload
 */
export function broadcastEvent(type: string, data: unknown) {
  const listeners = EVENT_LISTENERS[type] || new Set();
  console.log('[CPM] broadcastEvent', type, data); // @DEBUG
  listeners.forEach((listener) => listener(data));
}

/**
 * Handles the SSE connection for real-time updates
 */
export async function loader({ request }: LoaderFunctionArgs) {
  console.log('[CPM] api.events loader'); // @DEBUG
  // Ensure user is authenticated
  await requireUserId(request);

  // Return an event stream
  return eventStream(request.signal, (send) => {
    // Create listener for check-in events
    const checkinListener = (data: unknown) => {
      send({ event: 'checkin:changed', data: JSON.stringify(data) });
    };

    // Add this listener to our registry
    if (!EVENT_LISTENERS['checkin:changed']) {
      EVENT_LISTENERS['checkin:changed'] = new Set();
    }
    EVENT_LISTENERS['checkin:changed'].add(checkinListener);

    // Clean up when the connection closes
    return function cleanup() {
      if (EVENT_LISTENERS['checkin:changed']) {
        EVENT_LISTENERS['checkin:changed'].delete(checkinListener);
      }
    };
  });
}
