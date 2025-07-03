/**
 * Accessibility tests for Parkbench app
 * Uses axe-core to check for accessibility issues
 * For MVP Phase 4
 */
describe('Accessibility Testing', () => {
  // Helper for logging in
  beforeEach(() => {
    // Mock the authentication
    cy.session('authenticated-user', () => {
      cy.visit('/');

      // This assumes there's an auth endpoint we can use for testing
      cy.request({
        method: 'POST',
        url: '/auth/test-login',
        body: {
          email: 'test@example.com',
          password: 'test-password',
        },
      });

      // Verify we're logged in
      cy.getCookie('__session').should('exist');
    });
  });

  describe('Home Page', () => {
    it('should pass accessibility checks', () => {
      cy.visit('/');
      cy.injectAxe();

      // Basic check with default configuration
      cy.checkA11y();

      // Check just the navigation component
      cy.get('nav').should('exist');
      cy.checkA11y('nav');

      // Check the park list component
      cy.get('[data-testid="park-list"]').should('exist');
      cy.checkA11y('[data-testid="park-list"]');
    });
  });

  describe('Check-In Page', () => {
    it('should pass accessibility checks', () => {
      cy.visit('/checkin');
      cy.injectAxe();

      // Basic check with default configuration
      cy.checkA11y();

      // Check the form specifically
      cy.get('form').should('exist');
      cy.checkA11y('form');

      // Check form elements for proper labeling
      cy.checkA11y('select[name="locationId"]', {
        runOnly: ['label'],
      });

      cy.checkA11y('select[name="durationMinutes"]', {
        runOnly: ['label'],
      });

      cy.checkA11y('input[name="visitorIds"]', {
        runOnly: ['label'],
      });
    });

    it('should handle form errors accessibly', () => {
      cy.visit('/checkin');
      cy.injectAxe();

      // Submit form without selecting anything to trigger errors
      cy.get('button[type="submit"]').click();

      // Check that error messages are accessible
      cy.get('[data-testid="error-message"]').should('exist');
      cy.checkA11y('[data-testid="error-message"]');
    });
  });

  describe('Check-Out Page', () => {
    it('should pass accessibility checks', () => {
      cy.visit('/checkout');
      cy.injectAxe();

      // Basic check with default configuration
      cy.checkA11y();

      // Check the form specifically if it exists
      cy.get('body').then(($body) => {
        if ($body.find('form').length > 0) {
          cy.checkA11y('form');
        } else {
          // If no form (no active check-ins), check the message
          cy.contains('No active check-ins').should('exist');
          cy.checkA11y();
        }
      });
    });
  });

  describe('Navigation Component', () => {
    it('should be accessible across screen sizes', () => {
      cy.visit('/');
      cy.injectAxe();

      // Check on desktop
      cy.viewport(1200, 800);
      cy.checkA11y('nav');

      // Check on tablet
      cy.viewport(768, 1024);
      cy.checkA11y('nav');

      // Check on mobile
      cy.viewport(375, 667);
      cy.checkA11y('nav');

      // Check hamburger menu functionality on mobile
      cy.viewport(375, 667);
      cy.get('[aria-label="Open menu"]').should('be.visible').click();
      cy.get('[aria-label="Close menu"]').should('be.visible');
      cy.checkA11y('nav');
    });
  });

  describe('Toast Notifications', () => {
    it('should have accessible toast notifications', () => {
      // Visit check-in page and perform an action that triggers a toast
      cy.visit('/checkin');

      // Select a visitor and park if available
      cy.get('body').then(($body) => {
        if ($body.find('input[name="visitorIds"]:not([disabled])').length > 0) {
          cy.get('input[name="visitorIds"]:not([disabled])').first().check();
          cy.get('select[name="locationId"]').select(1);
          cy.get('button[type="submit"]').click();

          // Check toast notification accessibility
          cy.injectAxe();
          cy.get('[aria-live]').should('exist');
          cy.checkA11y('[aria-live]', {
            rules: {
              'color-contrast': { enabled: true },
              'aria-roles': { enabled: true },
            },
          });
        }
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation', () => {
      cy.visit('/');
      cy.injectAxe();

      // Tab through navigation items
      cy.get('body').focus().tab();
      cy.focused().should('exist');

      // Skip link should appear when tabbing
      cy.get('body').focus().tab();
      cy.get('a[href="#main-content"]').should('exist');

      // Check that the Check-in button is focusable
      cy.get('nav').contains('Check-in').focus();
      cy.focused().should('contain', 'Check-in');

      // Press Enter to navigate
      cy.focused().type('{enter}');
      cy.url().should('include', '/checkin');
    });
  });
});
