import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '~/utils/db.server';
import { requireUserId } from '~/utils/session.server';
import { action, loader } from './profile.visitors';

// Mock prisma
vi.mock('~/utils/db.server', () => ({
  default: {
    visitor: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock session
vi.mock('~/utils/session.server', () => ({
  requireUserId: vi.fn(),
}));

const mockedRequireUserId = vi.mocked(requireUserId);
const mockedPrisma = vi.mocked(prisma);

describe('/profile/visitors route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loader', () => {
    it('should return visitors for an authenticated user', async () => {
      const testUserId = 'user-123';
      const testVisitors = [
        { id: 'visitor-1', name: 'Visitor A', owner_id: testUserId },
        { id: 'visitor-2', name: 'Visitor B', owner_id: testUserId },
      ];

      mockedRequireUserId.mockResolvedValue(testUserId);
      mockedPrisma.visitor.findMany.mockResolvedValue(testVisitors);

      const request = new Request('http://localhost/profile/visitors');
      const response = await loader({ request, params: {}, context: {} });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visitors).toEqual(testVisitors);
      expect(mockedPrisma.visitor.findMany).toHaveBeenCalledWith({
        where: { owner_id: testUserId },
        orderBy: { name: 'asc' },
      });
    });

    it('should throw a redirect if user is not authenticated', async () => {
      mockedRequireUserId.mockRejectedValue(
        new Response('Redirect', {
          status: 302,
          headers: { Location: '/sign-in' },
        })
      );

      const request = new Request('http://localhost/profile/visitors');

      await expect(
        loader({ request, params: {}, context: {} })
      ).rejects.toThrow();
    });
  });

  describe('action', () => {
    it('should create a new visitor', async () => {
      const testUserId = 'user-123';
      mockedRequireUserId.mockResolvedValue(testUserId);
      mockedPrisma.visitor.create.mockResolvedValue({
        id: 'new-visitor',
        name: 'New Visitor',
        owner_id: testUserId,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const formData = new FormData();
      formData.append('intent', 'create');
      formData.append('name', 'New Visitor');

      const request = new Request('http://localhost/profile/visitors', {
        method: 'POST',
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockedPrisma.visitor.create).toHaveBeenCalledWith({
        data: {
          name: 'New Visitor',
          owner_id: testUserId,
        },
      });
    });

    it('should update a visitor', async () => {
      const testUserId = 'user-123';
      mockedRequireUserId.mockResolvedValue(testUserId);

      const formData = new FormData();
      formData.append('intent', 'update');
      formData.append('name', 'Updated Visitor');
      formData.append('visitorId', 'visitor-1');

      const request = new Request('http://localhost/profile/visitors', {
        method: 'POST',
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockedPrisma.visitor.updateMany).toHaveBeenCalledWith({
        where: { id: 'visitor-1', owner_id: testUserId },
        data: { name: 'Updated Visitor' },
      });
    });

    it('should delete a visitor', async () => {
      const testUserId = 'user-123';
      mockedRequireUserId.mockResolvedValue(testUserId);

      const formData = new FormData();
      formData.append('intent', 'delete');
      formData.append('visitorId', 'visitor-1');

      const request = new Request('http://localhost/profile/visitors', {
        method: 'POST',
        body: formData,
      });

      const response = await action({ request, params: {}, context: {} });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockedPrisma.visitor.deleteMany).toHaveBeenCalledWith({
        where: { id: 'visitor-1', owner_id: testUserId },
      });
    });
  });
});
