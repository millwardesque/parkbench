# Parkbench MVP – Phase 6: Extras Implementation Plan

_Last updated: 2025-07-08_

## 1. Goals

Deliver quality-of-life features requested by pilot users and streamline the
sign-in flow, without introducing breaking schema changes.

- One-click mass check-in/check-out reduce front-desk friction.
- Magic-link sign-in no longer requires email verification.
- Transactional email analytics visible to admins via Resend webhook.
- All automated tests remain green.

## 2. Deliverables

| ID  | Deliverable                          | Acceptance criteria                                                     |
| --- | ------------------------------------ | ----------------------------------------------------------------------- |
| D60 | **Check-in everyone** button         | Current user’s visitors receive new check-ins                           |
| D61 | **Check-out everyone** button        | Active check-ins close; durations computed correctly                    |
| D62 | **Resend analytics** for magic-links | Webhook ingests events; admin panel shows delivery/open stats           |
| D63 | **Retire email-verification** flow   | Verification routes + DB columns removed; no banners or flags in the UI |
| D64 | Updated **Vitest + Cypress** suites  | CI passes                                                               |

## 3. Work Breakdown Structure

### 6.1 Mass Check-in (WBS-60)

1. `POST /checkin-all` Remix action.
2. Service util `checkInAllVisitors(userId)` in a transaction.
3. Button on `/` visible to signed-in users.
4. Toast shows total checked-in.
5. Vitest unit + Cypress E2E tests.

### 6.2 Mass Check-out (WBS-61)

1. `POST /checkout-all` looping over existing util.
2. Button on `/` visible to signed-in users.
3. Tests.

### 6.3 Resend Analytics (WBS-62)

1. `/webhooks/resend` route verifying signature.
2. Prisma model `EmailEvent` (id, emailId, type, deliveredAt…).
3. Admin UI panel displaying stats.
4. Env secret for webhook sign key.
5. Load-test handler (k6) – 50 req/s.

### 6.4 Remove Verification (WBS-63)

1. Migration: drop verification columns/table.
2. Delete routes/components/tests.
3. Update docs and onboarding email copy.
4. Export old data to S3; schedule hard delete in 30 days.

### 6.5 Tests & Docs (WBS-64)

1. Update Vitest suites.
2. New Cypress folder `phase-6`.
3. Remove obsolete tests.
4. Update this doc and phase checklist in `docs/MVP-PLAN.md`.

## 4. Timeline (5 days)

| Day | Tasks                            |
| --- | -------------------------------- |
| 1   | 60.1-60.3, 61.1                  |
| 2   | 60.4-60.5, 61.2-61.4             |
| 3   | 62.1-62.5                        |
| 4   | 63.1-63.3                        |
| 5   | 63.4, 64.1-64.4, buffer & review |

## 5. Acceptance Tests

- Mass check-in creates the correct number of active check-ins, instantly visible.
- Mass check-out moves all check-ins to history with accurate durations.
- Magic-link email events appear in admin dashboard within 60 s of webhook.
- No verification artefacts remain; migration drops table successfully.
- All Vitest, Cypress and k6 suites pass.

## 6. Risks & Mitigations

| Risk                                | Impact                    | Mitigation                                                    |
| ----------------------------------- | ------------------------- | ------------------------------------------------------------- |
| Accidental mass actions             | Incorrect visitor records | Clear labeling and secondary confirmation to prevent mistakes |
| Webhook spoofing                    | False analytics data      | Verify `x-resend-signature` HMAC header                       |
| Data needed after migration removal | Loss of history           | Export to S3 prior; defer hard delete 30 days                 |

## 7. Reference Commands

```bash
# Mass check-in all (CLI util)
npm run checkin:all

# Listen for Resend webhooks locally via ngrok
ngrok http 3000  # then set webhook URL in Resend

# Run Phase 6 Cypress specs
npm run test:e2e -- --spec "**/phase-6/**"
```

---

Phase 6 delivers polished workflow shortcuts and cleans up legacy
verification logic, ensuring a smoother experience for hosts and visitors
alike.
