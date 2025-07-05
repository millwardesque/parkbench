# Parkbench MVP – Phase 5 Implementation Plan

_Last updated: 2025-07-03_

## 1. Goals

Phase 5 introduces **backend processes & refinements** that keep data
consistent and the platform resilient under higher traffic.

- Automatically expire stale check-ins without manual intervention.
- Prevent accidental hard-deletes using soft-delete enforcement.
- Throttle abusive traffic to protect infrastructure & quota limits.
- Require email verification before privileged actions.
- Maintain accessibility, performance and test coverage standards.

## 2. Deliverables

| ID  | Deliverable                                                           | Acceptance criteria                                                     |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| D23 | Scheduled job **auto-expires** check-ins past `durationMinutes`       | Runs hourly in prod; local dev command; unit tests pass                 |
| D24 | Prisma **soft-delete middleware** (`deleted_at` columns)              | All models honour soft deletes; queries exclude deleted rows by default |
| D25 | **Rate limiting** on auth & mutation routes (Sliding Window ≤ 10/min) | 429 returned on excess requests; passes k6 load test                    |
| D26 | **Email verification** flow (token email, verify, resend)             | Unverified accounts limited; verification link expires in 24 h          |
| D27 | Vitest + Cypress tests for the above                                  | CI green                                                                |

## 3. Work Breakdown Structure

### 3.1 Auto-Expire Check-ins (WBS-24)

1. (**24.1**) Add `expires_at` column to `Checkin` (migration).
2. (**24.2**) Create util `expireStaleCheckins()` (Prisma transaction).
3. (**24.3**) Vite script `npm run cron:expire` calling util; logs summary.
4. (**24.4**) Use Fly.io cron (or Render Job) schedule: `@hourly`.
5. (**24.5**) Add health page `/admin/cron` listing last run timestamp.

### 3.2 Soft-Delete Middleware (WBS-25)

1. (**25.1**) Add `deleted_at TIMESTAMP` to all relevant tables.
2. (**25.2**) Prisma middleware: on `delete` turn into `update { deleted_at }`.
3. (**25.3**) Middleware filters: add `deleted_at IS NULL` to find queries.
4. (**25.4**) Data-retention script to purge hard-deleted rows >30 days.

### 3.3 Rate Limiting (WBS-26)

1. (**26.1**) Introduce `@fastify/rate-limit` plugin wrapper.
2. (**26.2**) Apply to routes: `/signin`, `/checkin`, `/checkout`, `/api/*`.
3. (**26.3**) Sliding window store backed by Redis (Fly Postgres redis-lite).
4. (**26.4**) Config env vars: `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX`.
5. (**26.5**) Return JSON error + Retry-After header on 429.

### 3.4 Email Verification (WBS-27)

1. (**27.1**) Extend `User` schema: `emailVerifiedAt` nullable timestamp.
2. (**27.2**) Token table `EmailVerificationToken` (uuid, userId, expiresAt).
3. (**27.3**) On signup, send verification email via Resend API + template.
4. (**27.4**) Route `/verify-email?token=…` validates & sets timestamp.
5. (**27.5**) Protect privileged actions (`/checkin`, `/checkout`) behind
   verification check; show banner with resend link.
6. (**27.6**) Job `cron:prune-verification-tokens` purges expired tokens.
7. (**27.7**) Disable the eslint prop-spreading rule globally and remove any
   eslint-disable-\* comments to bypass it.

### 3.5 Testing (WBS-28)

1. (**28.1**) Vitest unit tests for middleware & util functions.
2. (**28.2**) Integration test: simulate cron expiry against SQLite memory DB.
3. (**28.3**) Cypress E2E: unverified user restriction, rate-limit 429 path.
4. (**28.4**) k6 script `k6 run rate-limit.js` part of load-test CI step.

## 4. Timeline (1 week)

| Day | Tasks                     |
| --- | ------------------------- |
| 1   | 24.1-24.3                 |
| 2   | 24.4-24.5, 25.1           |
| 3   | 25.2-25.4                 |
| 4   | 26.1-26.3                 |
| 5   | 26.4-26.5, 27.1-27.3      |
| 6   | 27.4-27.6, 28.1-28.2      |
| 7   | 28.3-28.4, buffer, review |

## 5. Acceptance Tests

- Check-in older than its `durationMinutes` is absent from list within 1 h.
- Hard delete calls set `deleted_at`, record still query-hidden thereafter.
- Excess POSTs to `/checkin` beyond 10/min from same IP receive 429.
- Unverified user cannot access check-in form; after verifying, access works.
- CI Vitest, Cypress & k6 suites pass.

## 6. Risks & Mitigations

| Risk                                | Impact               | Mitigation                                            |
| ----------------------------------- | -------------------- | ----------------------------------------------------- |
| Cron job fails silently             | Stale check-ins show | Heartbeat logging + admin page alert                  |
| Middleware bug hides legit data     | Broken UI            | Feature-flag rollout; staged deployment               |
| Redis unavailable for rate limiting | Routes unprotected   | Fallback to in-memory store with lower ceiling        |
| Email deliverability issues         | User blocked         | SPF/DKIM setup, resend & expiration extension options |

## 7. Reference Commands

```bash
# Run cron job locally (watch mode)
npm run cron:expire -- --watch

# Trigger soft-delete purge preview
ts-node scripts/purge-soft-deletes.ts --dry-run

# Load test rate limiting (k6)
k6 run tests/load/rate-limit.js

# Cypress Phase 5 E2E
npm run test:e2e -- --spec "**/phase-5/**"
```

---

Phase 5 hardens the backend, ensuring Parkbench remains reliable,
secure and maintainable as adoption grows.
