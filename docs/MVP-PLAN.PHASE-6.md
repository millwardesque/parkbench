# Parkbench MVP – Phase 6 Implementation Plan

_Last updated: 2025-07-07_

## 1. Goals

Phase&nbsp;6 focuses on **quality-of-life extras** requested by pilot users
and a simplification of the sign-in flow. These changes are purely
product-facing – no breaking schema work – and must keep performance and
accessibility standards established in previous phases.

- Mass check-in / check-out actions reduce front-desk friction.
- Magic-link sign-in is streamlined by removing the now-redundant
  email-verification loop.
- Resend’s transactional email analytics are available for magic links.
- Full automated test coverage is retained.

## 2. Deliverables

| ID  | Deliverable                                        | Acceptance criteria                                                |
| --- | -------------------------------------------------- | ------------------------------------------------------------------ |
| D30 | **Check-in everyone** button on homepage           | All active visitors receive new check-ins; audit log entry created |
| D31 | **Check-out everyone** button on homepage          | All active check-ins closed; durations computed correctly          |
| D32 | **Resend analytics** for magic-link emails         | Event webhook stored; dashboard link in admin                      |
| D33 | **Retire email-verification** flow                 | No verification banners; related tables + cron removed             |
| D34 | Updated **Vitest + Cypress** suites covering above | CI green                                                           |

## 3. Work Breakdown Structure

### 3.1 Mass Check-in (WBS-30)

1. (**30.1**) Add `POST /admin/checkin-all` Remix action.
2. (**30.2**) Service util `checkInAllVisitors(locationId?, durationMin)`.
3. (**30.3**) Link/button on `/` visible to `role = ADMIN` users only.
4. (**30.4**) Flash toast w/ count + undo link (24 h grace via soft delete).
5. (**30.5**) Vitest unit test for util; Cypress E2E clicking button.

### 3.2 Mass Check-out (WBS-31)

1. (**31.1**) Add `POST /admin/checkout-all` action utilising existing
   `checkoutVisitor()` util in loop/transaction.
2. (**31.2**) Button UI mirroring check-in-all; confirm modal.
3. (**31.3**) Ensure each checkout records `checked_out_by` (admin id).
4. (**31.4**) Update daily summary report to include mass check-outs.
5. (**31.5**) Unit + E2E tests.

### 3.3 Resend Analytics (WBS-32)

1. (**32.1**) Create `/webhooks/resend` route to accept signed events.
2. (**32.2**) Prisma model `EmailEvent` (id, emailId, type, deliveredAt…).
3. (**32.3**) Display delivery/open stats in `/admin/email` panel.
4. (**32.4**) Add SECRET in Fly.io env & local `.env` for webhook sign-key.
5. (**32.5**) Load-test webhook handler (k6) – sustain 50 req/s.

### 3.4 Retire Verification Flow (WBS-33)

1. (**33.1**) Remove `emailVerifiedAt`, token columns + cron job.
2. (**33.2**) Delete routes `/verify-email*`, `/verification-required`.
3. (**33.3**) Purge feature flags, components and tests for verification.
4. (**33.4**) Migration: drop `EmailVerificationToken` table.
5. (**33.5**) Update documentation & on-boarding emails copy.

### 3.5 Testing & Docs (WBS-34)

1. (**34.1**) Update Vitest suites for new utils/webhooks.
2. (**34.2**) New Cypress spec folder `phase-6` covering D30-D33 flows.
3. (**34.3**) Remove obsolete verification tests; snapshot CI baselines.
4. (**34.4**) Author this file & update `docs/MVP-PLAN.md` phase checklist.

## 4. Timeline (4 days)

| Day | Tasks                                 |
| --- | ------------------------------------- |
| 1   | 30.1-30.3, 31.1                       |
| 2   | 30.4-30.5, 31.2-31.4                  |
| 3   | 32.1-32.5, 33.1-33.3                  |
| 4   | 33.4-33.5, 34.1-34.4, buffer & review |

## 5. Acceptance Tests

- "Check-in everyone" creates the correct number of active check-ins and
  lists them immediately without page reload glitches.
- "Check-out everyone" results in all previous active check-ins moving to
  history view with accurate `durationMinutes`.
- Magic-link email send events appear in admin dashboard within 60 s of
  Resend webhook POST.
- No routes or UI references to email verification exist; database table
  dropped in migration.
- All Vitest, Cypress and k6 suites pass in CI.

## 6. Risks & Mitigations

| Risk                                | Impact                       | Mitigation                                 |
| ----------------------------------- | ---------------------------- | ------------------------------------------ |
| Mass actions executed accidentally  | Visitor records incorrect    | Confirmation modals + 24 h undo feature    |
| Webhook spoofing                    | False analytics data         | Verify `x-resend-signature` HMAC header    |
| Migration removes data still needed | Loss of verification history | Export to S3 and defer hard delete 30 days |

## 7. Reference Commands

```bash
# Mass check-in all (CLI util for smoke testing)
npm run checkin:all -- --location "Central Park" --duration 120

# Listen for Resend webhooks locally via ngrok
gnrok http 3000  # then set webhook URL in Resend dashboard

# Run Phase 6 Cypress specs
npm run test:e2e -- --spec "**/phase-6/**"
```

---

Phase&nbsp;6 delivers polished workflow shortcuts and cleans up
legacy verification logic, ensuring a smoother experience for hosts and
visitors alike.
