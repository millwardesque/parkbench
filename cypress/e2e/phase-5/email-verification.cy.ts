/**
 * E2E tests for the email verification flow.
 * Tests the full verification process from unverified user to verified access.
 */

describe('Email Verification Flow', () => {
  beforeEach(() => {
    // Mock the verification process by setting up test routes and users
    cy.task('db:seed:verificationTest');

    // Sign in as unverified user
    cy.visit('/signin');
    cy.get('[data-cy="email-input"]').type('unverified@example.com');
    cy.get('[data-cy="magic-link-submit"]').click();

    // Intercept the magic link and use it (mock email client)
    cy.task('getMagicLink', 'unverified@example.com').then((token) => {
      // Type assertion to handle unknown type from Cypress .then()
      cy.visit(`/auth?token=${token as string}`);
    });
  });

  it('should redirect unverified user to verification required page', () => {
    // Try to access protected route
    cy.visit('/checkin');

    // Should be redirected to verification required page
    cy.url().should('include', '/verification-required');
    cy.contains('Email Verification Required');
    cy.contains('verify your email address');
  });

  it('should allow resending verification email', () => {
    // Visit verification required page
    cy.visit('/verification-required');

    // Click resend button
    cy.contains('Resend Verification Email').click();

    // Should show confirmation
    cy.contains('A new verification email has been sent');
  });

  it('should verify email with valid token', () => {
    // Get verification token for the unverified user
    cy.task('getEmailVerificationToken', 'unverified@example.com').then(
      (token) => {
        // Visit verification page with token
        cy.visit(`/verify-email?token=${token as string}`);

        // Should show success message
        cy.contains('Success!');
        cy.contains('Your email has been verified');

        // Now should be able to access protected route
        cy.visit('/checkin');
        cy.url().should('include', '/checkin');
      }
    );
  });

  it('should reject invalid verification token', () => {
    // Visit with invalid token
    cy.visit('/verify-email?token=invalid-token');

    // Should show error message
    cy.contains('Error:');
    cy.contains('Invalid or expired token');
  });

  it('should show error for expired token', () => {
    // Get expired verification token for testing
    cy.task('getExpiredEmailVerificationToken').then((token) => {
      // Visit verification page with expired token
      cy.visit(`/verify-email?token=${token as string}`);

      // Should show error message
      cy.contains('Error:');
      cy.contains('Invalid or expired token');
    });
  });
});
