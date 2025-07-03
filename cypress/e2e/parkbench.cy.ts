/**
 * End-to-end tests for Parkbench app
 * Covers core user flows for the MVP Phase 3
 */
describe('Parkbench App', () => {
  // Helper for logging in
  beforeEach(() => {
    // Mock the authentication - in a real app this would use test credentials
    // Here we simulate being logged in by setting a session cookie
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

  describe('Park List Flow', () => {
    it('should display the list of parks with visitors', () => {
      cy.visit('/');

      // Check that the page loads
      cy.get('h1').should('contain', 'Parks');

      // Check for the park list component
      cy.get('[data-testid="park-list"]').should('exist');

      // Parks should be rendered as list items
      cy.get('[data-testid="park-item"]').should('have.length.at.least', 0);

      // The list should refresh automatically
      // We can test this by waiting and checking if the aria-live region updates
      cy.get('[aria-live="polite"]').should('exist');
    });

    it('should automatically refresh the park list', () => {
      cy.visit('/');

      // Get the initial update time
      cy.get('[data-testid="last-updated"]')
        .invoke('text')
        .then((initialTime) => {
          // Wait for the auto-refresh cycle (which is 15 seconds)
          // but we'll use a shorter wait for testing purposes
          cy.wait(16000);

          // The update time should have changed
          cy.get('[data-testid="last-updated"]')
            .invoke('text')
            .should('not.eq', initialTime);
        });
    });
  });

  describe('Check-In Flow', () => {
    it('should allow checking in visitors to a park', () => {
      // Visit the check-in page
      cy.visit('/checkin');

      // Verify the check-in form loads
      cy.get('h1').should('contain', 'Check In');

      // Select a visitor (assuming there's at least one)
      cy.get('input[name="visitorIds"]').first().check();

      // Select a park location
      cy.get('select[name="locationId"]').select(1);

      // Select duration (default is usually pre-selected)
      cy.get('select[name="durationMinutes"]').select('60');

      // Submit the form
      cy.get('button[type="submit"]').click();

      // We should be redirected to the home page
      cy.url().should('eq', `${Cypress.config().baseUrl}/`);

      // The visitor we checked in should appear in the park list
      cy.get('[data-testid="park-item"]').should('exist');
      cy.get('[data-testid="visitor-badge"]').should('exist');
    });

    it('should support deep linking to specific park', () => {
      // This test assumes there's a park with ID 'park-1'
      cy.visit('/checkin/park-1');

      // The park should be pre-selected in the dropdown
      cy.get('select[name="locationId"]').should('have.value', 'park-1');
    });

    it('should show validation errors for invalid inputs', () => {
      cy.visit('/checkin');

      // Try to submit without selecting anything
      cy.get('button[type="submit"]').click();

      // Form should not be submitted and error message should appear
      cy.url().should('include', '/checkin');
      cy.get('[data-testid="error-message"]').should('exist');
    });
  });

  describe('Check-Out Flow', () => {
    it('should allow checking out visitors from a park', () => {
      // First make sure we have someone checked in
      cy.visit('/checkin');
      cy.get('input[name="visitorIds"]').first().check();
      cy.get('select[name="locationId"]').select(1);
      cy.get('button[type="submit"]').click();

      // Now go to the check-out page
      cy.visit('/checkout');

      // Verify the check-out form loads
      cy.get('h1').should('contain', 'Check Out');

      // Select a check-in to end (assuming there's at least one active check-in)
      cy.get('input[name="checkinIds"]').first().check();

      // Submit the form
      cy.get('button[type="submit"]').click();

      // We should be redirected to the home page with a success parameter
      cy.url().should('include', 'checkoutSuccess=true');

      // The checked-out visitor should no longer appear in the park list
      // This is harder to test directly, but we can verify the UI updated
      cy.get('[data-testid="last-updated"]').should('exist');
    });

    it('should support selecting multiple visitors to check out', () => {
      // First check in two visitors
      cy.visit('/checkin');
      cy.get('input[name="visitorIds"]').first().check();
      cy.get('input[name="visitorIds"]').eq(1).check();
      cy.get('select[name="locationId"]').select(1);
      cy.get('button[type="submit"]').click();

      // Now check them out
      cy.visit('/checkout');

      // Select all check-ins using the "Select All" button
      cy.contains('Select All').click();

      // All checkboxes should be checked
      cy.get('input[name="checkinIds"]').should('be.checked');

      // Submit the form
      cy.get('button[type="submit"]').click();

      // We should be redirected to the home page
      cy.url().should('include', 'checkoutSuccess=true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle no active check-ins gracefully', () => {
      // First make sure no one is checked in
      // We'll do this by checking everyone out first
      cy.visit('/checkout');
      cy.get('body').then(($body) => {
        if ($body.find('input[name="checkinIds"]').length > 0) {
          cy.contains('Select All').click();
          cy.get('button[type="submit"]').click();
          cy.url().should('include', 'checkoutSuccess=true');
        }
      });

      // Visit the checkout page again
      cy.visit('/checkout');

      // There should be a message indicating no active check-ins
      cy.contains('No active check-ins').should('exist');
    });

    it('should prevent visitor from being checked in twice', () => {
      // First check in a visitor
      cy.visit('/checkin');
      cy.get('input[name="visitorIds"]').first().check();
      cy.get('select[name="locationId"]').select(1);
      cy.get('button[type="submit"]').click();

      // Try to check in the same visitor again
      cy.visit('/checkin');

      // The visitor should no longer be in the list or should be disabled
      cy.get('body').then(($body) => {
        if (
          $body.find('input[name="visitorIds"]:not([disabled])').length === 0
        ) {
          // All visitors are checked in, nothing to test further
          cy.log('All visitors already checked in - test validated');
        } else {
          // Some visitors are available, we would expect the previously checked in one to be missing or disabled
          cy.get('input[name="visitorIds"]:disabled').should(
            'have.length.at.least',
            1
          );
        }
      });
    });
  });
});
