// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Add any custom Cypress commands here

// Tab command for accessibility testing
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  const focusableElements =
    'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';

  // If a subject is provided, use it as the starting point; otherwise, start at the beginning
  if (subject) {
    cy.wrap(subject).trigger('keydown', { keyCode: 9, which: 9 });
  }

  // Simulate a Tab key press
  cy.document().then((doc) => {
    const { activeElement } = doc;
    const focusable = Array.from(
      doc.querySelectorAll(focusableElements)
    ).filter((el) => (el as HTMLElement).offsetParent !== null); // Filter out hidden elements

    const currentIndex = activeElement ? focusable.indexOf(activeElement) : -1;
    const nextIndex =
      currentIndex + 1 < focusable.length ? currentIndex + 1 : 0;
    const nextElement = focusable[nextIndex];

    if (nextElement) {
      cy.wrap(nextElement).focus();
    }
  });

  return cy.focused();
});

// Using ES2015 module syntax (preferred over namespace)
export {};

// Extend the Cypress types using namespace but with ESLint disabled for this specific case
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to simulate pressing the Tab key for accessibility testing
       * @example cy.tab()
       */
      tab(): Chainable<JQuery<HTMLElement>>;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
