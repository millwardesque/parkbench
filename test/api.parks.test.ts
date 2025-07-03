/**
 * Unit tests for the /api/parks endpoint
 * Verifies shape and ordering guarantees
 */
import { test, expect, beforeAll, afterAll, describe } from 'vitest';

import { loader } from '~/routes/api/parks';
import prisma from '~/utils/db.server';

// Define interfaces for test data shapes
interface Visitor {
  id: string;
  name: string;
}

interface Park {
  id: string;
  name: string;
  visitors: Visitor[];
}

// Test data
const testUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
};

const testVisitors = [
  { id: 'visitor-1', name: 'Alice', owner_id: testUser.id },
  { id: 'visitor-2', name: 'Bob', owner_id: testUser.id },
  { id: 'visitor-3', name: 'Charlie', owner_id: testUser.id },
];

const testLocations = [
  { id: 'location-1', name: 'Central Park' },
  { id: 'location-2', name: 'Riverside Park' },
];

const testCheckins = [
  {
    id: 'checkin-1',
    visitor_id: 'visitor-1',
    location_id: 'location-1',
    checkin_at: new Date(),
    est_checkout_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    actual_checkout_at: null,
  },
  {
    id: 'checkin-2',
    visitor_id: 'visitor-2',
    location_id: 'location-1',
    checkin_at: new Date(),
    est_checkout_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    actual_checkout_at: null,
  },
  {
    id: 'checkin-3',
    visitor_id: 'visitor-3',
    location_id: 'location-2',
    checkin_at: new Date(),
    est_checkout_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    actual_checkout_at: null,
  },
];

describe('/api/parks endpoint', () => {
  // Set up test data before tests
  beforeAll(async () => {
    // Clear any existing data
    await prisma.checkin.deleteMany({});
    await prisma.visitor.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.location.deleteMany({});

    // Create test user
    await prisma.user.create({ data: testUser });

    // Create test visitors
    await prisma.visitor.createMany({ data: testVisitors });

    // Create test locations
    await prisma.location.createMany({ data: testLocations });

    // Create test check-ins
    await prisma.checkin.createMany({ data: testCheckins });
  });

  // Clean up after tests
  afterAll(async () => {
    await prisma.checkin.deleteMany({});
    await prisma.visitor.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.$disconnect();
  });

  test('GET /api/parks returns correct shape and status', async () => {
    // Call the loader
    const response = await loader();
    const data = await response.json();

    // Test response structure
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('parks');
    expect(data).toHaveProperty('lastUpdated');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.parks)).toBe(true);
    expect(data.total).toBe(data.parks.length);
  });

  test('Parks contain correct visitor information', async () => {
    // Call the loader
    const response = await loader();
    const data = await response.json();

    // Test park data structure
    const { parks } = data;

    // Should have exactly 2 parks
    expect(parks.length).toBe(2);

    // Each park should have the correct structure
    parks.forEach((park: Park) => {
      expect(park).toHaveProperty('id');
      expect(park).toHaveProperty('name');
      expect(park).toHaveProperty('visitors');
      expect(Array.isArray(park.visitors)).toBe(true);
    });

    // First park should have 2 visitors
    const centralPark = parks.find((park: Park) => park.id === 'location-1');
    expect(centralPark).toBeDefined();
    expect(centralPark?.visitors.length).toBe(2);

    // Second park should have 1 visitor
    const riversidePark = parks.find((park: Park) => park.id === 'location-2');
    expect(riversidePark).toBeDefined();
    expect(riversidePark?.visitors.length).toBe(1);
  });

  test('Visitors within parks are sorted alphabetically', async () => {
    // Call the loader
    const response = await loader();
    const data = await response.json();

    // Get Central Park with multiple visitors
    const centralPark = data.parks.find(
      (park: Park) => park.id === 'location-1'
    );
    expect(centralPark).toBeDefined();

    // Check that visitors are sorted alphabetically
    const visitorNames = centralPark!.visitors.map((v: Visitor) => v.name);
    const sortedNames = [...visitorNames].sort((a, b) => a.localeCompare(b));
    expect(visitorNames).toEqual(sortedNames);
  });

  test('Parks are sorted alphabetically by name', async () => {
    // Call the loader
    const response = await loader();
    const data = await response.json();

    // Get park names
    const parkNames = data.parks.map((park: Park) => park.name);

    // Check that parks are sorted alphabetically
    const sortedNames = [...parkNames].sort((a, b) => a.localeCompare(b));
    expect(parkNames).toEqual(sortedNames);
  });

  test('Cache-Control header is set correctly', async () => {
    // Call the loader
    const response = await loader();

    // Check cache header
    const cacheHeader = response.headers.get('Cache-Control');
    expect(cacheHeader).toContain('public');
    expect(cacheHeader).toContain('max-age=5');
  });

  test('Non-GET methods return 405 Method Not Allowed', async () => {
    // Import the action handler
    const { action } = await import('~/routes/api/parks');

    // Call the action (which handles non-GET methods)
    const response = await action();

    // Check response
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
  });
});
