# Parkbench MVP – Phase 1 Implementation Plan

_Last updated: 2025-06-20_

## 1. Goals

Phase 1 establishes the project foundation and core data model so that
subsequent phases can focus on features, not plumbing.

- Scaffold a **Remix (v7) + Vite** codebase with TypeScript.
- Install and configure **Prisma**, **Tailwind**, **ESLint/Prettier**, and
  testing tools (**Vitest**, **Cypress**).
- Define and migrate the initial database schema
  (`User`, `Visitor`, `Location`, `Checkin`).
- Provide a reproducible development environment with seed data.

## 2. Deliverables

| ID                                        | Deliverable                                                            | Acceptance ‑ criteria      |
| ----------------------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| D1                                        | Git repo with Remix project bootstrapped                               | `npm run dev` starts       |
| working dev server with blank index route |
| D2                                        | Tooling config committed (`eslint`, `prettier`, `tailwind.config.*`,   |
| `tsconfig.json`)                          | `npm run lint` and `npm run typecheck` pass                            |
| D3                                        | `schema.prisma` containing four models with common fields, indexes and |
| soft-delete strategy                      | `prisma validate` passes                                               |
| D4                                        | Initial migration applied in local DB                                  | tables exist with expected |
| columns                                   |
| D5                                        | `scripts/seed.ts` populates at least two parks, one user, three        |
| visitors, and one check-in                | running seed then querying returns records                             |

## 3. Work Breakdown Structure

### 3.1 Repository & Project Setup (WBS-1)

1.  (**WBS-1.1**) ✅ Remote Git repo `parkbench` exists with docs (completed).
2.  (**WBS-1.2**) ✅ Run `npx create-remix@latest` with Vite + TypeScript.
3.  (**WBS-1.3**) ✅ Add `.gitignore` (use Remix/Vite template + OS artifacts).
4.  (**WBS-1.4**) ✅ Configure `pre-commit` with **lint-staged** to run prettier
    and eslint.

### 3.2 Tooling Configuration (WBS-2)

1.  (**WBS-2.1**) ✅ Add ESLint (Airbnb config) and Prettier.
2.  (**WBS-2.2**) ✅ Add Tailwind ◦ generate `tailwind.config.ts` and include in
    Remix `root.tsx`.
3.  (**WBS-2.3**) ✅ Set up Vitest with `@testing-library/react` and configure
    `npm run test`.
4.  (**WBS-2.4**) ✅ Install Cypress and add basic smoke E2E test placeholder.

### 3.3 Prisma & Database (WBS-3)

1.  (**WBS-3.1**) ✅ Install Prisma CLI and generate `schema.prisma`.
2.  (**WBS-3.2**) ✅ Model common fields via `@@map` + model-level `@@index`s.
3.  (**WBS-3.3**) ✅ Define models:

    - `User` – id (UUID), name, email (unique), timestamps, `deleted_at`.
    - `Visitor` – id, name, `owner_id` → `User`.
    - `Location` – id, name, nickname.
    - `Checkin` – id, `visitor_id`, `location_id`, `checkin_at`,
      `est_checkout_at`, `actual_checkout_at` (nullable).
      - Unique composite on (`visitor_id`, `actual_checkout_at`=`NULL`).
      - Index on (`visitor_id`, `actual_checkout_at`).

4.  (**WBS-3.4**) ✅ Create migration `001_init` and run `prisma migrate dev`.
5.  (**WBS-3.5**) ✅ Add global Prisma middleware to exclude soft-deleted rows.

### 3.4 Seed & Dev Utilities (WBS-4)

1.  (**WBS-4.1**) Create `scripts/seed.ts` using Prisma Client.
2.  (**WBS-4.2**) Insert seed data listed in D5.
3.  (**WBS-4.3**) Add `npm run db:reset` script: drop DB, run migrate, seed.

### 3.5 Verification & CI (WBS-5)

1.  (**WBS-5.1**) Add GitHub Actions workflow `ci.yml` running:
    - `npm ci`
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test -- --run` (Vitest)
2.  (**WBS-5.2**) Ensure workflow passes on main branch.

## 4. Timeline (1 week target)

| Day | Tasks                          |
| --- | ------------------------------ |
| 1   | WBS-1.1 → 1.3                  |
| 2   | WBS-1.4, WBS-2.1               |
| 3   | WBS-2.2 → 2.4                  |
| 4   | WBS-3.1 → 3.3                  |
| 5   | WBS-3.4 → 3.5                  |
| 6   | WBS-4.1 → 4.3                  |
| 7   | WBS-5.1 → 5.2, buffer & review |

## 5. Acceptance Tests

- Run `npm run dev`; landing page loads without errors.
- `npm run lint` returns no errors.
- `npm run test` passes.
- `prisma migrate dev` followed by `npm run seed` succeeds.
- Select `* from "Checkin"` shows seeded rows.

## 6. Risks & Mitigations

| Risk                          | Impact          | Mitigation                         |
| ----------------------------- | --------------- | ---------------------------------- |
| Team unfamiliar with Remix v7 | Delay           | Pair-program kickoff, link to      |
| Remix docs                    |
| Incorrect schema indices      | Runtime perf    | Review DDL generated by Prisma     |
| migration                     |
| Local DB conflicts            | Onboarding pain | Provide `docker-compose.yml` for a |
| containerised Postgres        |

## 7. Reference Commands (quick copy/paste)

```bash
# Create project
npx create-remix@latest

# Tooling
npm i -D eslint prettier eslint-config-airbnb
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Prisma
npm i @prisma/client
npm i -D prisma
npx prisma init --datasource-provider postgresql
npx prisma migrate dev --name init

# Seed
npm run db:reset
```

---

Phase 1 completion unblocks Phase 2 (authentication) by providing a working
application skeleton, validated schema, and developer workflow.
