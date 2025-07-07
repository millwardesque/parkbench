/**
 * E2E tests for the soft-delete feature.
 * Tests that deletion operations perform soft deletes rather than hard deletes.
 */

/* eslint-disable no-console */

describe('Soft Delete Feature', () => {
  beforeEach(() => {
    // Reset test data
    cy.task('db:seed:softDeleteTest');

    // Sign in as admin
    cy.visit('/signin');
    cy.get('[data-cy="email-input"]').type('admin@example.com');
    cy.get('[data-cy="magic-link-submit"]').click();

    // Intercept the magic link and use it
    cy.task('getMagicLink', 'admin@example.com').then((token) => {
      // Type assertion to handle unknown type from Cypress .then()
      cy.visit(`/auth?token=${token as string}`);
    });
  });

  it('should hide soft-deleted visitors from the visitor list', () => {
    // Visit visitors page
    cy.visit('/visitors');

    // Should show active visitors
    cy.contains('Active Visitor');

    // Should not show deleted visitors
    cy.contains('Deleted Visitor').should('not.exist');
  });

  it('should perform soft delete when deleting a visitor', () => {
    // Visit visitors page
    cy.visit('/visitors');

    // Find and click delete button for Active Visitor
    cy.contains('tr', 'Active Visitor')
      .find('[data-cy="delete-visitor"]')
      .click();

    // Confirm deletion
    cy.get('[data-cy="confirm-delete"]').click();

    // Verify visitor is removed from the list
    cy.contains('Active Visitor').should('not.exist');

    // Verify it's actually soft-deleted in the database
    cy.task('checkVisitorDeletedAt', 'Active Visitor').then((deletedAt) => {
      // eslint-disable-next-line no-unused-expressions
      expect(deletedAt).to.not.be.null;
    });
  });

  it('should hide soft-deleted check-ins from the active list', () => {
    // Visit check-ins page
    cy.visit('/checkins');

    // Should show active check-ins
    cy.contains('Active Check-in');

    // Should not show deleted check-in
    cy.contains('Deleted Check-in').should('not.exist');
  });

  it('should soft-delete a check-in when deletion is requested', () => {
    // Visit check-ins page
    cy.visit('/checkins');

    // Find and click delete button for Active Check-in
    cy.contains('tr', 'Active Check-in')
      .find('[data-cy="delete-checkin"]')
      .click();

    // Confirm deletion
    cy.get('[data-cy="confirm-delete"]').click();

    // Verify check-in is removed from the list
    cy.contains('Active Check-in').should('not.exist');

    // Verify it's actually soft-deleted in the database
    cy.task('checkCheckinDeletedAt', 'Active Check-in').then((deletedAt) => {
      // eslint-disable-next-line no-unused-expressions
      expect(deletedAt).to.not.be.null;
    });
  });

  it('should show soft-deleted records when includeDeleted is true (admin functionality)', () => {
    // Visit admin page with soft-deleted records
    cy.visit('/admin/deleted-records');

    // Should show both active and deleted records
    cy.contains('Active Visitor');
    cy.contains('Deleted Visitor');
    cy.contains('Active Check-in');
    cy.contains('Deleted Check-in');
  });

  it('should allow hard delete of soft-deleted records (purge functionality)', () => {
    // Visit admin purge page
    cy.visit('/admin/purge');

    // Check the record to purge
    cy.contains('tr', 'Deleted Visitor')
      .find('[data-cy="select-record"]')
      .check();

    // Click purge button
    cy.get('[data-cy="purge-selected"]').click();

    // Confirm purge
    cy.get('[data-cy="confirm-purge"]').click();

    // Verify record is hard-deleted (no longer in the list)
    cy.contains('Deleted Visitor').should('not.exist');

    // Verify it's actually hard-deleted in the database
    cy.task('checkVisitorExists', 'Deleted Visitor').then((exists) => {
      // eslint-disable-next-line no-unused-expressions
      expect(exists).to.be.false;
    });
  });
});
