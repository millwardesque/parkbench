import { useEffect, useState } from 'react';

type EventCallback = (event: MessageEvent) => void;

/**
 * Custom hook for connecting to EventSource/SSE endpoint
 * Provides real-time updates with automatic reconnection
 */
export default function useEventSource(
  url: string,
  eventType: string,
  callback: EventCallback
) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    // Function to connect to the EventSource
    const connect = () => {
      try {
        eventSource = new EventSource(url);

        // Connection opened
        eventSource.onopen = () => {
          setConnected(true);
          // Connected to event source
        };

        // Listen for specific event type
        eventSource.addEventListener(eventType, callback);

        // Handle connection errors and attempt reconnection
        eventSource.onerror = () => {
          // Error with event source
          setConnected(false);

          // Close current connection
          eventSource?.close();
          eventSource = null;

          // Attempt to reconnect after a delay
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (error) {
        // Failed to create event source
        setConnected(false);
      }
    };

    // Initial connection
    connect();

    // Cleanup when component unmounts
    return () => {
      if (eventSource) {
        eventSource.removeEventListener(eventType, callback);
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [url, eventType, callback]);

  return { connected };
}
