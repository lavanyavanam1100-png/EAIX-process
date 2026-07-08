# Enterprise AI Experience Platform

Enterprise-grade monorepo workspace for the Process Application with a premium, animated UI baseline and AWS-ready architecture direction.

## Monorepo Structure

- `apps/web`: Next.js 16 + TypeScript frontend (MUI, Framer Motion, Lucide, Sonner, top loader)
- `apps/api`: NestJS API baseline with domain modules
- `packages/ui`: shared reusable UI components
- `packages/types`: shared domain models and master data seeds
- `packages/config`: shared config artifacts

## Prefilled Master Data

- Departments: `PSC`, `MFG`
- Roles: `Developer`, `Tester`, `SME`, `Manager`
- Sections: `Technical`, `Non-Technical`, `SME`

## Process Scope Implemented (Initial)

- Department and role selectors on the frontend shell
- Section-based workspace cards
- API endpoints for roles/departments
- Content metadata placeholders for:
	- uploader
	- last editor
	- file size
	- status
	- version
- Review queue and audit placeholders

## Setup

```bash
pnpm install --force
```

## Run

Run all apps from the workspace root:

```bash
pnpm dev
```

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## Quality Commands

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

## Environment Files

- Root: `.env.example`
- Web: `apps/web/.env.example`
- API: `apps/api/.env.example`

## MySQL Live Integration

The API now supports live MySQL interactions against schema `enterprise_app`.

1. Configure `apps/api/.env` from `apps/api/.env.example`.
2. Ensure `MYSQL_DATABASE=enterprise_app` is reachable.
3. Start API and verify connection:

```bash
GET http://localhost:3001/health/db
```

When MySQL is unavailable, the API automatically falls back to in-memory mode so development can continue.
