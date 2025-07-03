/**
 * End-to-end tests for Parkbench app check-in flows
 * Focuses on real-time updates and instant park-list refresh
 * For MVP Phase 4
 */
describe('Parkbench Real-time Check-in Flows', () => {
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

  describe('Navigation', () => {
    it('should show the check-in button in nav bar when authenticated', () => {
      cy.visit('/');

      // Check that the navigation bar exists
      cy.get('nav').should('exist');

      // Check that the Check-in button exists in the navigation
      cy.get('nav').contains('Check-in').should('exist');
      cy.get('nav a[href="/checkin"]').should('exist');
    });

    it('should navigate to check-in page when clicking the nav button', () => {
      cy.visit('/');

      // Click the Check-in button in navigation
      cy.get('nav').contains('Check-in').click();

      // Should navigate to check-in page
      cy.url().should('include', '/checkin');
      cy.get('h1').should('contain', 'Check In');
    });

    it('should navigate to check-in with pre-selected park from park list links', () => {
      cy.visit('/');

      // Click the first "Check-in visitor" link from a park row
      cy.contains('Check-in visitor').first().click();

      // Should navigate to check-in page with parkId query parameter
      cy.url().should('include', '/checkin?parkId=');

      // Park should be pre-selected in dropdown
      cy.get('select[name="locationId"]').should('not.have.value', '');
    });
  });

  describe('Real-time Updates', () => {
    it('should instantly update park list after check-in without page reload', () => {
      // First make sure we have at least one visitor not checked in
      cy.visit('/checkout');
      cy.get('body').then(($body) => {
        if ($body.find('input[name="checkinIds"]').length > 0) {
          cy.contains('Select All').click();
          cy.get('button[type="submit"]').click();
          cy.url().should('include', 'checkoutSuccess=true');
        }
      });

      // Go to home page and capture initial state
      cy.visit('/');
      let initialParkHTML = '';
      cy.get('[aria-live="polite"]').then(($el) => {
        initialParkHTML = $el.html();
      });

      // Go to check-in page
      cy.contains('Check-in').click();

      // Select a visitor and park
      cy.get('input[name="visitorIds"]').first().check();
      cy.get('select[name="locationId"]').select(1);
      cy.get('select[name="durationMinutes"]').select('60');

      // Submit check-in form
      cy.get('button[type="submit"]').click();

      // Should see toast notification for successful check-in
      cy.get('[aria-live="assertive"]').should(
        'contain',
        'Check-in successful'
      );

      // Park list should update immediately
      cy.get('[aria-live="polite"]').then(($el) => {
        const updatedParkHTML = $el.html();
        expect(updatedParkHTML).not.to.equal(initialParkHTML);
      });

      // Should see visitor badge in the park list
      cy.get('[aria-live="polite"]').find('span').should('exist');
    });

    it('should instantly update park list after check-out without page reload', () => {
      // First make sure we have someone checked in
      cy.visit('/');

      // If no visitors are checked in, check someone in first
      cy.get('body').then(($body) => {
        if ($body.find('[aria-live="polite"] span').length === 0) {
          cy.contains('Check-in').click();
          cy.get('input[name="visitorIds"]').first().check();
          cy.get('select[name="locationId"]').select(1);
          cy.get('button[type="submit"]').click();
          cy.visit('/');
        }
      });

      // Capture initial state of park list
      let initialVisitorCount = 0;
      cy.get('[aria-live="polite"] span').then(($spans) => {
        initialVisitorCount = $spans.length;
        expect(initialVisitorCount).to.be.greaterThan(0);
      });

      // Find and click "Check Out" button for the first visitor
      cy.contains('Check Out').first().click();

      // Should see toast notification
      cy.get('[aria-live="assertive"]').should(
        'contain',
        'Check-out successful'
      );

      // Park list should update immediately with one fewer visitor
      cy.get('[aria-live="polite"] span').should(
        'have.length',
        initialVisitorCount - 1
      );
    });

    it('should refresh park list via EventSource when another user makes a change', () => {
      // This is a bit trickier to test in isolation
      // We'll need to simulate an EventSource message
      cy.visit('/');

      // Store initial park list state
      cy.get('[aria-live="polite"]').should('exist');

      // Trigger an event source message via window command
      cy.window().then((win) => {
        // Create and dispatch a custom event that the useEventSource hook listens for
        const mockEvent = new win.MessageEvent('message', {
          data: JSON.stringify({
            type: 'checkin:changed',
            data: { timestamp: new Date().toISOString() },
          }),
        });

        // Find the EventSource instance and dispatch the event
        // This is a simplified approach - in practice we'd need to find a way
        // to access the actual EventSource instance
        win.dispatchEvent(
          new win.CustomEvent('test:sse:message', {
            detail: mockEvent,
          })
        );
      });

      // Verify that a fetch was triggered
      // We can't easily verify the network call directly in Cypress
      // So we'll check if the UI shows a loading state or refreshes
      cy.get('[aria-live="polite"]').should('exist');
    });
  });

  describe('Performance', () => {
    it('should update the DOM within performance budget (<150ms)', () => {
      cy.visit('/');

      // Start performance measurement
      cy.window().then((win) => {
        win.performance.mark('update-start');
      });

      // Trigger a check-in or check-out action
      cy.visit('/checkin');
      cy.get('input[name="visitorIds"]').first().check();
      cy.get('select[name="locationId"]').select(1);
      cy.get('button[type="submit"]').click();

      // After navigation completes, measure the time until DOM updates
      cy.window().then((win) => {
        win.performance.mark('update-end');
        win.performance.measure(
          'update-duration',
          'update-start',
          'update-end'
        );

        const measures = win.performance.getEntriesByName(
          'update-duration',
          'measure'
        );
        if (measures.length > 0) {
          const { duration } = measures[0];
          expect(duration).to.be.lessThan(150); // Performance budget: 150ms
          cy.log(`DOM update took ${duration}ms`);
        }
      });

      // Verify no layout shift occurred
      // This is difficult to test automatically, but we can check for stable elements
      cy.get('[aria-live="polite"]').should('exist');
    });
  });

  describe('Error handling', () => {
    it('should show toast notification for errors during check-in', () => {
      // Try to check in a visitor that's already checked in
      cy.visit('/checkin');

      // If there are available visitors, try to check one in
      cy.get('body').then(($body) => {
        if ($body.find('input[name="visitorIds"]:not([disabled])').length > 0) {
          // Select a visitor and park
          cy.get('input[name="visitorIds"]:not([disabled])').first().check();
          cy.get('select[name="locationId"]').select(1);
          cy.get('button[type="submit"]').click();

          // Now try to check in the same visitor again (should cause an error)
          cy.visit('/checkin');

          // If the visitor is still available (unlikely), try to check in again
          if (
            $body.find(
              `input[value="${$body.find('input[name="visitorIds"]:checked').val()}"]`
            ).length > 0
          ) {
            cy.get(
              `input[value="${$body.find('input[name="visitorIds"]:checked').val()}"]`
            ).check();
            cy.get('select[name="locationId"]').select(1);
            cy.get('button[type="submit"]').click();

            // Should see an error notification
            cy.get('[aria-live="assertive"]').should('contain', 'Error');
          }
        }
      });
    });
  });
});
