describe('Smoke Test', () => {
  it('should load the application', () => {
    // Visit the home page
    cy.visit('/');

    // Basic check to ensure the page loaded
    cy.get('html').should('exist');

    // Title should be visible (assumes there's a document title or heading)
    cy.get('head title').should('exist');
  });
});
