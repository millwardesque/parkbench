# Parkbench MVP – Phase 2 Implementation Plan

_Last updated: 2025-06-22_

## 1. Goals

Phase 2 brings **authentication & user-management** to the working Phase 1
foundation.

- Implement password-less **magic-link** sign-in / registration.
- Persist authenticated sessions with **httpOnly cookies + CSRF** tokens.
- Integrate **email delivery** (Resend/Postmark sandbox initially).
- Provide **profile & visitor management** pages for signed-in users.
- Maintain parity in automated tests and CI.

## 2. Deliverables

| ID  | Deliverable                                                                       | Acceptance criteria                                                 |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| D6  | `/auth/register` & `/auth/signin` routes (forms & validation)                     | Submitting forms triggers magic-link email; error states rendered   |
| D7  | Email service integration layer (`email.server.ts`)                               | `sendMagicLinkEmail()` logs or sends email in dev; returns success  |
| D8  | Magic-link token table & Prisma model `MagicLinkToken` with 15-min TTL            | `prisma validate` passes; migration applied                         |
| D9  | `/auth/magic` callback route consuming token and creating session                 | Valid token sets cookie & redirects; invalid shows error            |
| D10 | Session util (`session.server.ts`) providing `requireUserSession()`, CSRF helpers | Protected route redirects when session missing; CSRF header present |
| D11 | `/profile` page with visitor CRUD (add / rename / delete soft)                    | UI updates reflect DB after mutation                                |

## 3. Work Breakdown Structure

### 3.1 Auth Forms & Validation (WBS-6)

1. (**6.1**) Build `/auth/register` Remix route with Zod validation.
2. (**6.2**) Build `/auth/signin` route (email only) sharing components.
3. (**6.3**) Add generic `AuthForm` component with Tailwind styling.
4. (**6.4**) Display server-side validation & duplicate-email errors.

### 3.2 Email Service Layer (WBS-7)

1. (**7.1**) Evaluate Resend vs Postmark → use environment var `EMAIL_PROVIDER`.
2. (**7.2**) Implement `email.server.ts` with provider-agnostic interface.
3. (**7.3**) Add dev fallback that logs magic-link URL to console.
4. (**7.4**) Configure ENV schema via `dotenv-safe` and document in `README`.

### 3.3 Magic-Link Flow (WBS-8)

1. (**8.1**) Extend Prisma schema with `MagicLinkToken` (id, userId, token,
   expiresAt, consumedAt).
2. (**8.2**) Mutation in register/sign-in actions: create token, send email.
3. (**8.3**) Create `/auth/magic` route loader/action verifying & consuming
   token; on success calls `createUserSession()`.
4. (**8.4**) Add unit tests for token util functions (Vitest).

### 3.4 Session & Security (WBS-9)

1. (**9.1**) Implement `session.server.ts` using Remix `createCookieSession`.
2. (**9.2**) Store userId & csrf token; set `httpOnly`, `secure`, `sameSite`.
3. (**9.3**) Add `requireUserSession(loaderArgs)` helper.
4. (**9.4**) Add CSRF verification middleware on POST actions.

### 3.5 Profile & Visitor Management (WBS-10)

1. (**10.1**) Create `/profile` parent route guarded by `requireUserSession`.
2. (**10.2**) Child route `/profile/visitors` listing current visitors.
3. (**10.3**) Actions to add, rename, soft-delete visitors.
4. (**10.4**) Prisma queries respect soft-delete middleware from Phase 1.

### 3.6 Testing Updates (WBS-11)

1. (**11.1**) Expand Vitest coverage for auth utilities and session management.

## 4. Timeline (1.5 weeks)

| Day | Tasks                 |
| --- | --------------------- |
| 1   | 6.1-6.3               |
| 2   | 6.4, 7.1-7.2          |
| 3   | 7.3-7.4, 8.1          |
| 4   | 8.2-8.3               |
| 5   | 8.4, 9.1-9.2          |
| 6   | 9.3-9.4, 10.1         |
| 7   | 10.2-10.4             |
| 8   | 11.1, buffer & review |

## 5. Acceptance Tests

- Registering new email sends magic-link email (console log in dev).
- Visiting magic-link logs user in, sets cookie, redirects to `/profile`.
- CSRF token present in profile mutations; invalid token returns 403.
- Visitor CRUD updates DB and UI without full reload.

## 6. Risks & Mitigations

| Risk                            | Impact           | Mitigation                                 |
| ------------------------------- | ---------------- | ------------------------------------------ |
| Email provider limitations      | Block sign-in    | Abstract interface, allow console fallback |
| Token replay attacks            | Account takeover | Consume token atomically; set short TTL    |
| Cookie mis-config (secure flag) | Session leakage  | Automated security check on build          |

## 7. Reference Commands

```bash
# Prisma add token model
npx prisma migrate dev --name add_magic_link_token
```

---

Phase 2 equips the app with secure authentication and basic user management,
enabling check-in/out functionality to be restricted to verified users in
Phase 3.
