# Parkbench MVP Implementation Plan

## Notes

- The project will be built using the Remix (v7) framework with Vite, Prisma for the ORM, and Tailwind for styling.
- Authentication will be handled via a passwordless magic-link flow, using httpOnly cookies and CSRF protection for security. We will not store auth info in localStorage.
- The database schema will use UUIDs for primary keys, include `created_at`/`updated_at` timestamps on all models, and implement soft deletes via a `deleted_at` field. All timestamps will be in UTC.
- A global Prisma middleware will be used to filter out soft-deleted records from queries.
- Testing will be done with Vitest for unit tests and Cypress for end-to-end tests.
- A deployment target needs to be chosen, with consideration for cron job support (e.g., Fly.io, Render).
- Styling and UX will be kept to a minimum for the initial implementation. A more polished, mobile-friendly theme will be a follow-up project.

## Task List

### Phase 1: Project Setup & Core Data Model

- [ ] Initialize Remix/Vite project.
- [ ] Set up .gitignore
- [ ] Configure tooling: Prisma, Tailwind, ESLint, Prettier.
- [ ] Define initial Prisma schema (`User`, `Visitor`, `Location`, `Checkin`) with common fields and constraints.
- [ ] Create initial database migration.
- [ ] Create a database seed script for development.

### Phase 2: Authentication & User Management

- [ ] Implement magic link sign-in/registration UI and backend logic.
- [ ] Set up an email sending service.
- [ ] Implement session management with `httpOnly` cookies.
- [ ] Create pages for user profile and visitor management.

### Phase 3: Core Check-in/Check-out Features

- [ ] Build the main page to display parks and checked-in visitors.
- [ ] Implement server-side data fetching for the main page with auto-refresh.
- [ ] Build the check-in page with its form and backend logic.
- [ ] Implement deep-linking for the check-in page.
- [ ] Build the check-out functionality.

### Phase 4: Additional UX polish

- [ ] Reload the Parks list on the main page after check-in and check-out on the main page
- [ ] Create a generic check-in page that provides a drop-down of parks and visitors, and a duration selector
- [ ] Link to the generic check-in page from the main page
- [ ] Add a "Check-in" button to the main page that links to the generic check-in page

### Phase 5: Backend Processes & Refinements

- [ ] Implement the cron job for auto-expiring check-ins.
- [ ] Implement Prisma middleware for soft deletes.
- [ ] Add rate limiting and email verification.

### Phase 6: Extras

- [ ] Add a "Check in everyone" feature on the homepage that checks in all of the current user's visitors
- [ ] Add a "Check out everyone" feature on the homepage that checks out all of the current user's visitors
- [ ] Implement resend integration for email for magic links
- [ ] Remove all email verification logic and features, the magic link is sufficient

### Phase 7: Testing & Deployment

- [ ] Write unit tests for critical backend logic.
- [ ] Write E2E tests for main user flows.
- [ ] Decide on a hosting provider and configure for deployment.
- [ ] Set up a CI/CD pipeline in GitHub Actions.

## Current Goal

Set up the project foundation and define the core database schema.
