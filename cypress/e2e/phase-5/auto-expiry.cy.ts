/**
 * E2E tests for the auto-expiry check-ins feature.
 * Tests that stale check-ins are automatically expired.
 */

describe('Auto-Expire Check-ins', () => {
  beforeEach(() => {
    // Reset test data
    cy.task('db:seed:expiryTest');

    // Sign in as a verified admin user
    cy.visit('/signin');
    cy.get('[data-cy="email-input"]').type('admin@example.com');
    cy.get('[data-cy="magic-link-submit"]').click();

    // Intercept the magic link and use it (mock email client)
    cy.task('getMagicLink', 'admin@example.com').then((token) => {
      // Type assertion to handle unknown type from Cypress .then()
      cy.visit(`/auth?token=${token as string}`);
    });
  });

  it('should show active check-ins that have not expired', () => {
    // Visit active check-ins page
    cy.visit('/checkins');

    // Should show the active check-ins
    cy.contains('Active Check-ins');
    cy.contains('Recent Visitor'); // This is a visitor that just checked in
    cy.get('[data-cy="checkin-list"]')
      .find('tr')
      .should('have.length.at.least', 1);
  });

  it('should not show expired check-ins in active list', () => {
    // Visit active check-ins page
    cy.visit('/checkins');

    // Should not show expired visitors
    cy.contains('Expired Visitor').should('not.exist');
  });

  it('should mark check-ins as expired after running the cron job', () => {
    // First verify that stale check-in is still active
    cy.visit('/checkins');
    cy.contains('Stale Visitor'); // Should exist before expiry

    // Run the expiry cron job (simulated)
    cy.task('runExpiryCron');

    // Check that the stale check-in is now gone from active list
    cy.reload();
    cy.contains('Stale Visitor').should('not.exist');

    // Check that it appears in expired list
    cy.visit('/checkins/history');
    cy.contains('Stale Visitor');
    cy.contains('Auto-expired');
  });

  it('should show expiry time correctly for auto-expired check-ins', () => {
    // Run the expiry cron job
    cy.task('runExpiryCron');

    // Visit the history page
    cy.visit('/checkins/history');

    // Find the expired check-in and verify checkout time
    cy.contains('tr', 'Stale Visitor')
      .find('[data-cy="checkout-time"]')
      .should('contain', 'Auto-expired');

    // Verify the date shown is correct
    cy.contains('tr', 'Stale Visitor')
      .find('[data-cy="checkout-date"]')
      .invoke('text')
      .should('match', /\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD format
  });

  it('should not expire check-ins that are within their duration window', () => {
    // Run the expiry cron job
    cy.task('runExpiryCron');

    // Visit active check-ins page
    cy.visit('/checkins');

    // Recent check-in should still be active
    cy.contains('Recent Visitor');

    // Verify check-in is shown as active
    cy.contains('tr', 'Recent Visitor')
      .find('[data-cy="status"]')
      .should('contain', 'Active');
  });
});
