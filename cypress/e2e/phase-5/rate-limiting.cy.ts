/**
 * E2E tests for the rate limiting feature.
 * Tests that rate limits are applied appropriately.
 */

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limiter before each test
    cy.task('resetRateLimiter');
  });

  it('should rate limit check-ins after too many requests', () => {
    // Sign in as a verified user
    cy.visit('/signin');
    cy.get('[data-cy="email-input"]').type('verified@example.com');
    cy.get('[data-cy="magic-link-submit"]').click();

    // Intercept the magic link and use it (mock email client)
    cy.task('getMagicLink', 'verified@example.com').then((token) => {
      // Type assertion to handle unknown type from Cypress .then()
      cy.visit(`/auth?token=${token as string}`);
    });

    // Make multiple requests to a rate-limited endpoint
    // We'll test with 11 requests (exceeding the 10/min limit)
    cy.intercept('POST', '/checkin').as('checkinRequest');

    for (let i = 0; i < 10; i += 1) {
      // Submit the check-in form repeatedly
      cy.visit('/checkin');
      cy.get('[data-cy="visitor-name"]').type(`Test Visitor ${i}`);
      cy.get('[data-cy="visitor-email"]').type(`visitor${i}@example.com`);
      cy.get('[data-cy="location"]').select('Main Office');
      cy.get('[data-cy="checkin-submit"]').click();

      // Verify successful request
      cy.wait('@checkinRequest').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201, 302]);
      });
    }

    // The 11th request should be rate limited
    cy.visit('/checkin');
    cy.get('[data-cy="visitor-name"]').type('Rate Limited Visitor');
    cy.get('[data-cy="visitor-email"]').type('rate-limited@example.com');
    cy.get('[data-cy="location"]').select('Main Office');
    cy.get('[data-cy="checkin-submit"]').click();

    // Verify rate limit response
    cy.wait('@checkinRequest').then((interception) => {
      expect(interception.response?.statusCode).to.eq(429);
    });

    // Verify user sees an error message
    cy.contains('Too many requests');
    cy.contains('Please try again later');
  });

  it('should reset rate limit after the time window passes', () => {
    // Sign in as a verified user
    cy.visit('/signin');
    cy.get('[data-cy="email-input"]').type('verified@example.com');
    cy.get('[data-cy="magic-link-submit"]').click();

    // Intercept the magic link and use it (mock email client)
    cy.task('getMagicLink', 'verified@example.com').then((token) => {
      // Type assertion to handle unknown type from Cypress .then()
      cy.visit(`/auth?token=${token as string}`);
    });

    // Make enough requests to get close to the limit
    cy.intercept('POST', '/checkin').as('checkinRequest');

    for (let i = 0; i < 9; i += 1) {
      cy.visit('/checkin');
      cy.get('[data-cy="visitor-name"]').type(`Test Visitor ${i}`);
      cy.get('[data-cy="visitor-email"]').type(`visitor${i}@example.com`);
      cy.get('[data-cy="location"]').select('Main Office');
      cy.get('[data-cy="checkin-submit"]').click();
      cy.wait('@checkinRequest');
    }

    // Simulate time passing (rate window expiring)
    cy.task('fastForwardRateLimiter');

    // Should be able to make requests again
    cy.visit('/checkin');
    cy.get('[data-cy="visitor-name"]').type('Reset Test Visitor');
    cy.get('[data-cy="visitor-email"]').type('reset-test@example.com');
    cy.get('[data-cy="location"]').select('Main Office');
    cy.get('[data-cy="checkin-submit"]').click();

    // Verify request is not rate limited
    cy.wait('@checkinRequest').then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 201, 302]);
    });
  });
});
