import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit } from '../../app/utils/limiter.server';

// Create mock for RateLimiterMemory
const mockConsume = vi.fn();
const mockRateLimiterMemory = vi.fn().mockImplementation(() => ({
  consume: mockConsume,
}));

// Mock the module
vi.mock('rate-limiter-flexible', () => ({
  RateLimiterMemory: mockRateLimiterMemory,
}));

describe('Rate limiting', () => {
  let mockHeaders: Map<string, string>;

  beforeEach(() => {
    // Reset mocks for each test
    vi.resetAllMocks();

    // Setup mock headers for the request
    mockHeaders = new Map();
    mockHeaders.set('X-Forwarded-For', '127.0.0.1');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should allow requests within rate limits', async () => {
    // Mock successful rate limit check
    mockConsume.mockResolvedValue({
      remainingPoints: 90,
      consumedPoints: 10,
    });

    // Create mock request with only the necessary parts implemented
    const mockRequest = new Request('https://example.com', {
      headers: {
        'X-Forwarded-For': '127.0.0.1',
      },
    });

    // Execute & assert no error is thrown
    await expect(checkRateLimit(mockRequest)).resolves.toBeUndefined();

    // Verify consume was called with the correct IP
    expect(mockConsume).toHaveBeenCalledWith('127.0.0.1');
  });

  it('should throw 429 error when rate limit is exceeded', async () => {
    // Mock rate limit exceeded
    mockConsume.mockRejectedValue({
      remainingPoints: 0,
      consumedPoints: 100,
    });

    // Create mock request with only the necessary parts implemented
    const mockRequest = new Request('https://example.com', {
      headers: {
        'X-Forwarded-For': '127.0.0.1',
      },
    });

    // Execute & assert expected error is thrown
    await expect(checkRateLimit(mockRequest)).rejects.toThrow(
      'Too Many Requests'
    );
  });

  it('should do nothing if IP is not available', async () => {
    // Empty headers (no IP available)
    mockHeaders.clear();

    // Create mock request with empty headers
    const mockRequest = {
      headers: {
        get: (name: string) => mockHeaders.get(name) || null,
      },
    } as unknown as Request;

    // Execute & assert no error is thrown and consume is not called
    await expect(checkRateLimit(mockRequest)).resolves.toBeUndefined();
    expect(mockConsume).not.toHaveBeenCalled();
  });
});
