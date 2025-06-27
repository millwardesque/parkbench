import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { User, Visitor, Location, Checkin } from '@prisma/client';
import prisma from '~/utils/db.server';
import * as sessionServer from '~/utils/session.server';
import { action } from './check-action';

// Mock session server utilities
vi.mock('~/utils/session.server', async () => {
  const actual = await vi.importActual('~/utils/session.server');
  return {
    ...actual,
    requireUserId: vi.fn(),
    validateCsrfToken: vi.fn(),
  };
});

const mockedRequireUserId = vi.mocked(sessionServer.requireUserId);
const mockedValidateCsrfToken = vi.mocked(sessionServer.validateCsrfToken);

describe('Check-in/Check-out Action', () => {
  let user: User;
  let visitor: Visitor;
  let location: Location;

  beforeEach(async () => {
    // Reset mocks
    vi.resetAllMocks();

    // Clean the database, bypassing the soft-delete middleware
    await prisma.$executeRawUnsafe('DELETE FROM "checkins";');
    await prisma.$executeRawUnsafe('DELETE FROM "magic_link_tokens";');
    await prisma.$executeRawUnsafe('DELETE FROM "visitors";');
    await prisma.$executeRawUnsafe('DELETE FROM "users";');
    await prisma.$executeRawUnsafe('DELETE FROM "locations";');

    // Seed test data
    user = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Test User' },
    });
    visitor = await prisma.visitor.create({
      data: { name: 'Test Visitor', owner_id: user.id },
    });
    location = await prisma.location.create({
      data: { name: 'Test Park' },
    });

    // Mock session to return our test user's ID
    mockedRequireUserId.mockResolvedValue(user.id);
    // Mock CSRF validation to always succeed
    mockedValidateCsrfToken.mockResolvedValue();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('Check-in', () => {
    it('should create a new check-in record', async () => {
      const formData = new FormData();
      formData.append('intent', 'check-in');
      formData.append('visitorId', visitor.id);
      formData.append('locationId', location.id);

      const request = new Request('http://localhost/check-action', {
        method: 'POST',
        body: formData,
      });

      const response = await action({ request, context: {}, params: {} });

      expect(response.status).toBe(302); // Redirect status
      expect(response.headers.get('Location')).toBe('/');

      const checkin = await prisma.checkin.findFirst({
        where: { visitor_id: visitor.id },
      });
      expect(checkin).not.toBeNull();
      expect(checkin?.location_id).toBe(location.id);
      expect(checkin?.actual_checkout_at).toBeNull();
    });

    it('should return 404 if visitor does not belong to user', async () => {
      const otherUser = await prisma.user.create({
        data: { email: 'other@test.com', name: 'Other User' },
      });
      mockedRequireUserId.mockResolvedValue(otherUser.id);

      const formData = new FormData();
      formData.append('intent', 'check-in');
      formData.append('visitorId', visitor.id); // Visitor belongs to original user
      formData.append('locationId', location.id);

      const request = new Request('http://localhost/check-action', {
        method: 'POST',
        body: formData,
      });

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(404);
      // Just verify that the error message is somewhere in the response
      expect(JSON.stringify(data)).toContain('Visitor not found');
    });
  });

  describe('Check-out', () => {
    let checkin: Checkin;

    beforeEach(async () => {
      checkin = await prisma.checkin.create({
        data: {
          visitor_id: visitor.id,
          location_id: location.id,
          checkin_at: new Date(),
          est_checkout_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      });
    });

    it('should update an existing check-in with a checkout time', async () => {
      const formData = new FormData();
      formData.append('intent', 'check-out');
      formData.append('checkinId', checkin.id);

      const request = new Request('http://localhost/check-action', {
        method: 'POST',
        body: formData,
      });

      const response = await action({ request, context: {}, params: {} });

      expect(response.status).toBe(302); // Redirect status
      expect(response.headers.get('Location')).toBe('/');

      const updatedCheckin = await prisma.checkin.findUnique({
        where: { id: checkin.id },
      });
      expect(updatedCheckin?.actual_checkout_at).not.toBeNull();
    });

    it('should return 404 if check-in does not belong to user', async () => {
      const otherUser = await prisma.user.create({
        data: { email: 'other@test.com', name: 'Other User' },
      });
      mockedRequireUserId.mockResolvedValue(otherUser.id);

      const formData = new FormData();
      formData.append('intent', 'check-out');
      formData.append('checkinId', checkin.id);

      const request = new Request('http://localhost/check-action', {
        method: 'POST',
        body: formData,
      });

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(404);
      // Just verify that the error message is somewhere in the response
      expect(JSON.stringify(data)).toContain('Check-in not found');
    });
  });
});
