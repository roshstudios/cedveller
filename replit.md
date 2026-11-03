# Dərs Cədvəlim

Azerbaijani university timetable companion with AI-assisted PDF/image extraction, editable confirmation, alternating weeks and opt-in public sharing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend: `artifacts/ders-takvimim` (root preview).
- API contract: `lib/api-spec/openapi.yaml`; API handlers: `artifacts/api-server/src/routes`.
- Netlify setup and external database requirements: `NETLIFY.md`, `netlify.toml`, `deploy/schema.sql`.

## Architecture decisions

- No account system was requested. Device ownership uses an opaque HttpOnly cookie, not a user account; clearing cookies loses edit access. Public sharing is opt-in.
- Uploaded files are processed transiently for extraction, not retained as user file storage. Only explicitly confirmed lesson data is persisted.
- Replit preview uses managed OpenAI access; Netlify needs its own server-side Groq or OpenAI credentials and PostgreSQL. Do not imply a static-only upload supports AI/social sharing.

## Product

Today/current/next lessons, today-first weekly view, AI PDF/image import with correction and confirmation, private schedules, searchable public friend schedules, reference-week settings, and iPhone standalone installation.

## User preferences

- The user explicitly requested Azerbaijani as the app language, including forms, errors, dates and AI clarification messages. Preserve source lesson/teacher names and existing route identifiers.
- TT-11 is the user's class; the uploaded BDU 2026–2027 first-semester PDF is the source. Never fill blank days or move later lessons into empty earlier periods.
- The week starting 2026-11-02 is Alt Hafta, the next is Üst Hafta. **Why:** the user explicitly supplied this reference. Use Asia/Baku and alternate from the reference date, which remains editable.
- In split cells, top means Üst Hafta and bottom means Alt Hafta. Numbered teacher/student subgroups must not automatically become alternating weeks.
- Determine lecture/seminar from cell width, independently of week: spanning two or more group columns means mühazirə; confined to one group means seminar. Both halves of a split period can be lectures. **Why:** the user explicitly clarified this with the source example.
- Friday TT-11 10:15 has Riyazi analiz on Üst həftə and Proqramlaşdırmanın əsasları-1 on Alt həftə; both span TT-10 and TT-11. Friday 12:00 Xarici dil is a separate weekly seminar. Do not shift split halves into the next time slot.
- Selection controls should use the app's branded design, not native iPhone option sheets. DOCX timetables should be accepted while preserving merged table cells for visual extraction.
- First-time visitors must complete a real setup wizard: upload their timetable, review/edit extracted lessons, choose public/private visibility and their name, then save. Do not show TT-11 as a default/demo to everyone. Existing owners skip onboarding; public share links remain accessible without setup.
- The mobile bottom navigation should stay viewport-anchored through Safari toolbar changes and animate its active capsule smoothly between pages. Netlify's injected badge is controlled through the owner's Netlify settings, not the app's CSS.
- The original BDU source PDF has a reviewed TT-11 draft. Reuse it only after an exact file fingerprint match and explicitly label this source path; never silently substitute it for an unrelated document. **Why:** AI geometry recognition can still misread small full-page tables even with detailed rules.
- The user wants capsule-shaped, modern app-like design and intends to use iPhone Add to Home Screen and Netlify hosting.
- Accuracy and explicit review matter more than guessing; flag unresolved source ambiguities and require confirmation.

## Gotchas

- The source PDF does not state lesson end times; template ends and lesson types are provisional and are explicitly flagged for confirmation.
- Do not reuse the exposed credential from the original attached brief. It was not added to code or secrets; rotation was recommended.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
