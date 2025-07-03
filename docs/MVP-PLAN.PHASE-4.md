# Parkbench MVP – Phase 4 Implementation Plan

_Last updated: 2025-07-02_

## 1. Goals

Phase 4 focuses on **polishing the user experience** for parents checking in/out
visitors from neighbourhood parks. The emphasis is on faster perceived
updates and a streamlined, generic check-in entry point.

- Instant **park-list refresh** after any check-in/out action.
- **Generic check-in page** that works for _any_ park – no deep-link required.
- Clear navigation from the main park list to the new generic check-in flow.
- Maintain a11y, responsiveness and performance budgets established earlier.

## 2. Deliverables

| ID  | Deliverable                                                      | Acceptance criteria                                                   |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| D18 | Park list instant refresh (client React state + SWR fallback)    | List reflects DB changes ≤ 2 s after check-in/out without full reload |
| D19 | `/checkin` generic route (form, validation, action)              | Selecting park + visitors creates check-ins and redirects to `/`      |
| D20 | Main-page CTA button **“Check-in”** linking to `/checkin`        | Visible to authenticated users, keyboard focusable, a11y-labelled     |
| D21 | Navigation link(s) from park rows → pre-selected `/checkin` page | Clicking "Check-in" on a park pre-selects that park in the form       |
| D22 | Vitest unit/E2E tests covering the above UX flows                | CI green                                                              |

## 3. Work Breakdown Structure

### 3.1 Instant Park-List Refresh (WBS-18)

1. (**18.1**) Extract `useParkList()` hook wrapping `useFetcher()` polling.
2. (**18.2**) Add `useEventSource()` / WebSocket fallback listening for
   `checkin:changed` events (sent by actions via `event-stream` header).
3. (**18.3**) Optimistically update local cache on successful check-in/out
   (invalidate on failure).
4. (**18.4**) Performance budget: <150 ms DOM diff, no layout shift.

### 3.2 Generic Check-In Page (WBS-19)

1. (**19.1**) New route file `/routes/checkin.tsx` (no `:locationId`).
2. (**19.2**) Loader: fetch all parks & visitors for user session.
3. (**19.3**) Zod schema (`visitorIds`, `locationId`, `durationMinutes`).
4. (**19.4**) Action: reuse `createCheckins()` util; handle duplicate error.
5. (**19.5**) Success redirect + toast; inline error summary.
6. (**19.6**) a11y review (label associations, keyboard reachability).

### 3.3 Navigation Updates (WBS-20 / WBS-21)

1. (**20.1**) Add primary **“Check-in”** button to nav bar (desktop + mobile).
2. (**20.2**) Button visible only when `isAuthenticated`.
3. (**21.1**) In park list row, add link **“Check-in visitor”** → `/checkin?parkId={id}`.
4. (**21.2**) Update generic check-in loader to honour optional `parkId` query
   param and pre-select park.

### 3.4 Bugs (WBS-22)

1. (**22.1**) The park-list refresh only seems to work for the first visitor listed. Checking in / out the second visitor listed does not refresh the list.
2. (**22.2**) `npm run typecheck` fails with multiple errors. Fix them, and make sure we run `npm run typecheck` as part of our CI pipeline.

### 3.5 Testing (WBS-23)

1. (**23.1**) Vitest unit tests for `useParkList()` cache invalidation.
2. (**23.2**) Cypress E2E: main-page list refreshes immediately after check-in.
3. (**23.3**) Axe-core accessibility checks for new check-in page & buttons.

## 4. Timeline (1 week)

| Day | Tasks                  |
| --- | ---------------------- |
| 1   | 18.1-18.2              |
| 2   | 18.3-18.4, 19.1        |
| 3   | 19.2-19.4              |
| 4   | 19.5-19.6, 20.1        |
| 5   | 20.2, 21.1-21.2        |
| 6   | 22.1-22.3              |
| 7   | Buffer, polish, review |

## 5. Acceptance Tests

- After submitting check-in form, new visitor appears in list ≤ 2 s.
- Clicking main **Check-in** button opens generic form with no park pre-selected.
- Clicking park-row **Check-in visitor** opens form with park pre-selected.
- All forms pass axe accessibility audit; keyboard only path works.
- CI Vitest + Cypress suites pass.

## 6. Risks & Mitigations

| Risk                                   | Impact           | Mitigation                                      |
| -------------------------------------- | ---------------- | ----------------------------------------------- |
| SSE/WebSocket fallback fails on prod   | Stale UI         | Retain polling every 15 s as safety net         |
| Large visitor list in select component | Slow form        | Virtualise list, search-as-you-type filter      |
| Optimistic update diverges from server | UI inconsistency | Revalidate via `/api/parks` after event or 15 s |

## 7. Reference Commands

```bash
# Preview SSE events locally
curl -N http://localhost:3000/api/events

# Run Cypress E2E for Phase 4 flows
npm run test:e2e -- --spec "**/phase-4/**"
```

---

Phase 4 polishes the core experience, making check-ins faster
and more discoverable for parents using Parkbench.
