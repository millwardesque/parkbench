/* eslint-disable no-console */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sendEmail from '../../app/utils/email.server';

// Mock fetch for testing API calls
vi.stubGlobal('fetch', vi.fn());

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Email utilities', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore process.env after each test
    process.env = originalEnv;
  });

  // Email verification tests removed as part of WBS-62

  describe('sendEmail', () => {
    const emailOptions = {
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>HTML content</p>',
      text: 'Plain text content',
    };

    it('should log email content when no API key is present', async () => {
      // Setup - ensure RESEND_API_KEY is not set
      process.env.RESEND_API_KEY = undefined;

      // Execute
      await sendEmail(emailOptions);

      // Assert - check logs were called with right content
      expect(console.log).toHaveBeenCalledWith('--- Sending Email ---');
      expect(console.log).toHaveBeenCalledWith(`To: ${emailOptions.to}`);
      expect(console.log).toHaveBeenCalledWith(
        `Subject: ${emailOptions.subject}`
      );
      expect(console.log).toHaveBeenCalledWith(`Content: ${emailOptions.text}`);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use custom from email when provided', async () => {
      // Setup
      process.env.RESEND_API_KEY = undefined;
      const customFrom = 'custom@example.com';

      // Execute
      await sendEmail({
        ...emailOptions,
        from: customFrom,
      });

      // Assert
      expect(console.log).toHaveBeenCalledWith(`From: ${customFrom}`);
    });

    it('should use EMAIL_FROM env var when no custom from is provided', async () => {
      // Setup
      process.env.RESEND_API_KEY = undefined;
      process.env.EMAIL_FROM = 'env@example.com';

      // Execute
      await sendEmail(emailOptions);

      // Assert
      expect(console.log).toHaveBeenCalledWith('From: env@example.com');
    });

    it('should call Resend API when API key is present', async () => {
      // Setup
      process.env.RESEND_API_KEY = 'fake-api-key';
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-id' }),
      };
      (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse
      );

      // Execute
      await sendEmail(emailOptions);

      // Assert
      expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer fake-api-key',
        },
        body: JSON.stringify({
          from: 'noreply@parkbench.example.com',
          to: emailOptions.to,
          subject: emailOptions.subject,
          html: emailOptions.html,
          text: emailOptions.text,
        }),
      });

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should throw an error when API returns error response', async () => {
      // Setup
      process.env.RESEND_API_KEY = 'fake-api-key';
      const errorMessage = 'Invalid API key';
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({ message: errorMessage }),
      };
      (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse
      );

      // Execute & Assert
      await expect(sendEmail(emailOptions)).rejects.toThrow(
        `Failed to send email: ${errorMessage}`
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error sending email:',
        expect.any(Error)
      );
    });

    it('should handle network errors', async () => {
      // Setup
      process.env.RESEND_API_KEY = 'fake-api-key';
      const networkError = new Error('Network failure');
      (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        networkError
      );

      // Execute & Assert
      await expect(sendEmail(emailOptions)).rejects.toThrow('Network failure');
      expect(console.error).toHaveBeenCalledWith(
        'Error sending email:',
        networkError
      );
    });
  });
});
