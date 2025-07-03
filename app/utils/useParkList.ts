import { useCallback, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import type { ParkWithVisitors } from './checkin.server';

/**
 * Custom hook for fetching and maintaining park list data
 * Handles automatic polling and provides a mechanism for manual refresh
 */
export default function useParkList() {
  const parksFetcher = useFetcher<{ parksWithVisitors: ParkWithVisitors[] }>();

  // Function to trigger a manual refresh
  const refreshParks = useCallback(() => {
    if (parksFetcher.state === 'idle') {
      parksFetcher.load('/?index');
    }
  }, [parksFetcher]);

  useEffect(() => {
    // Initial fetch if not already fetched
    if (parksFetcher.state === 'idle' && !parksFetcher.data) {
      refreshParks();
    }

    // Set up polling every 15 seconds as a fallback
    const interval = setInterval(() => {
      refreshParks();
    }, 15000);

    return () => clearInterval(interval);
  }, [parksFetcher, refreshParks]);

  return {
    parks: parksFetcher.data?.parksWithVisitors || [],
    loading: parksFetcher.state !== 'idle',
    refresh: refreshParks,
  };
}
