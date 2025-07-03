# Parkbench MVP – Phase 3 Implementation Plan

_Last updated: 2025-06-27_

## 1. Goals

Phase 3 adds the **core check-in / check-out experience** that makes
Parkbench useful to signed-in parents.

- Public **park list** showing who is currently checked-in.
- Authenticated **check-in flow** – choose visitors, park, duration.
- Authenticated **check-out flow** – end one-or-many active check-ins.
- Deep-linkable URLs (`/checkin/:locationId`, `/checkout/:locationId`).
- Data refresh every 15 s without full page reload.
- Maintain test parity and CI green.

## 2. Deliverables

| ID  | Deliverable                                                                     | Acceptance criteria                                                                            |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D12 | `/` park list route with server loader + client auto-refresh                    | Visitors listed alphabetically within each park; list refreshes in <15 s without full reload   |
| D13 | `/api/parks` JSON endpoint & Prisma queries with soft-delete filter             | `GET /api/parks` returns array of parks → visitors structure in <200 ms local dev              |
| D14 | `/checkin/:locationId?` route (form, validation, action)                        | Submitting form creates `Checkin` records & redirects to `/`; duplicate active check-ins error |
| D15 | `/checkout/:locationId?` route (UI, action)                                     | Selecting visitors sets `actualCheckout` and redirects; disabled until ≥1 visitor selected     |
| D16 | Shared `checkin.server.ts` util functions (`createCheckins`, `endCheckins`)     | Covered by unit tests; correct DB writes verified                                              |
| D17 | E2E tests (Cypress) covering anonymous → sign-in → check-in → check-out journey | All tests pass in CI                                                                           |

## 3. Work Breakdown Structure

### 3.1 Park List (WBS-12)

1. (**12.1**) Prisma queries: `getActiveCheckins()` → grouping by park.
2. (**12.2**) Remix loader for `/` returning serialised structure.
3. (**12.3**) React components: `ParkList`, `VisitorBadge` with Tailwind.
4. (**12.4**) Client-side `useFetcher()` polling every 15 s.
5. (**12.5**) Accessibility pass (aria-live for refresh updates).

### 3.2 API Layer (WBS-13)

1. (**13.1**) `/routes/api/parks.ts` returning JSON (for future mobile app).
2. (**13.2**) Unit tests (Vitest) for shape/ordering guarantees.

### 3.3 Check-In Flow (WBS-14)

1. (**14.1**) Extend Prisma schema: add composite index `(visitorId, actualCheckout)`.
2. (**14.2**) Loader: fetch user visitors + parks, ensure session.
3. (**14.3**) Zod form schema (`visitorIds`, `locationId`, `durationMinutes`).
4. (**14.4**) Action: call `createCheckins()` util, handle duplicate error.
5. (**14.5**) Success redirect; error messages rendered inline.
6. (**14.6**) Deep-link QR: if `locationId` param present, pre-select park.

### 3.4 Check-Out Flow (WBS-15)

1. (**15.1**) Loader: list active visitor check-ins for user (+park filter).
2. (**15.2**) Form multi-select, disabled submit until selection.
3. (**15.3**) Action: `endCheckins()` util sets `actualCheckout` timestamp.
4. (**15.4**) Optimistic UI update on success.

### 3.5 Shared Utilities (WBS-16)

1. (**16.1**) `checkin.server.ts` with `createCheckins`, `endCheckins`, helpers.
2. (**16.2**) Vitest unit tests with test DB.

### 3.6 Testing (WBS-17)

2. (**17.2**) Edge cases: duplicate active check-in, invalid duration.
3. (**17.3**) GitHub Actions job matrix (`node:18`, `node:20`).

## 4. Timeline (1.5 weeks)

| Day | Tasks                 |
| --- | --------------------- |
| 1   | 12.1-12.3             |
| 2   | 12.4-12.5, 13.1       |
| 3   | 13.2, 14.1-14.2       |
| 4   | 14.3-14.4             |
| 5   | 14.5-14.6, 15.1       |
| 6   | 15.2-15.4, 16.1       |
| 7   | 16.2, 17.1-17.2       |
| 8   | 17.3, buffer & review |

## 5. Acceptance Tests

- Park list auto-refreshes without flicker; data matches DB after manual edit.
- Attempting second active check-in for same visitor returns validation error.
- Deep-link `/checkin/:locationId` pre-selects park in form.
- Check-out removes visitors from park list within ≤15 s.
- Cypress suite passes in CI.

## 6. Risks & Mitigations

| Risk                                    | Impact              | Mitigation                                             |
| --------------------------------------- | ------------------- | ------------------------------------------------------ |
| Polling every 15 s hammers DB           | Increased costs     | Cache results in memory for 5 s in loader              |
| Race conditions in concurrent check-ins | Duplicate rows      | Wrap `createCheckins()` in DB transaction + unique idx |
| Long park / visitor lists               | Slow initial render | Use lazy-loaded React `Suspense`, paginate if needed   |

## 7. Reference Commands

```bash
# Add composite index supporting duplicate-check logic
npx prisma migrate dev --name add_checkin_indexes

# Run Cypress E2E locally
npm run test:e2e
```

---

Phase 3 delivers the end-to-end check-in/out experience,
unlocking real-time visibility for parents at neighbourhood parks.
