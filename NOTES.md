# NOTES.md — agent handoff

Sucat Senior High School (SSHS) Inventory Management System. Read this before touching code.

## What it is
School inventory tracker for Sucat SSHS, Muntinlupa. Built as a school project, now in a
~1-month trial with the school. Live and in use — treat production data as real.

- **Live:** https://sucat-shs-inventory.vercel.app (verified 200, 2026-11-26)
- **Repo:** github.com/garcia111805-web/shs-inventory-keeper (`origin`)
- **Local:** `C:\PROJECTS\SUCAT ELEMENTARY INVENTORY SYSTEM`
- **Vercel project:** `sucat-seniorhigh-inventory` (team `justins-projects-d91d43d5`)

Naming is a mess and it bites: the local folder says "elementary", the Vercel project says
"seniorhigh", the live alias says "shs", and `sucat-elementary-inventory.vercel.app` is a **dead
404**. The working URL is `sucat-shs-inventory.vercel.app`. There are two Vercel projects from the
rebrand era (`sucat-shs-inventory`, older, and `sucat-seniorhigh-inventory`, current) — don't
deploy to the wrong one.

The app itself is rebranded to Sucat Senior High School — favicon + logo come from
`public/sshs-logo.jpg`.

## Stack
Vite + React + TypeScript + Tailwind + shadcn/ui. Backend Supabase. Hosting Vercel.
Tests via Vitest (`src/test/`).

## Commands
```bash
npm install        # deps (package-lock.json is authoritative)
npm run dev        # vite dev server
npm run build      # production build
npm run lint       # eslint
npm run test       # vitest run
```
Use **npm**, not bun or pnpm. `bun.lock` / `bun.lockb` are stale leftovers — ignore them,
don't regenerate. There is no pnpm lockfile.

## Layout
```
src/pages/        Dashboard, InventoryPage, Reports, Settings, TransactionLog,
                  LoginGateway, Index, NotFound
src/components/   modals per action (AddEditItem, CSVImport, BulkRestock, LogUsage,
                  ReturnItems, StockMovement, Quarantine, EditTransaction),
                  plus Sidebar, TopBar, StatusBadge, ToastContainer, SelfServicePortal
src/lib/          supabase.ts (client + isSupabaseConfigured guard)
api/keepalive.js  Vercel serverless function, returns 200 OK
supabase/         import_log.sql — run once in Supabase SQL editor
vercel.json       cron: /api/keepalive at "0 0 * * *"
```

## Supabase
- Project ref `ipmqmtjfnalnyqrvmvzz`. The `supabase` connector is connected in the `dev` profile,
  so schema and rows are readable directly — no need to guess.
- **Verified 2026-11-26** (`public` schema, 8 tables): `items` 73 rows, `transactions` 8,
  `import_log` 1, `categories` 2, `app_users` 0, `departments` 0, `locations` 0, `units` 0.
- `departments`, `locations`, `units`, `categories`, `app_users` are effectively empty — the app
  works off `items` + `transactions` alone. Any "filter by department/location" UI is currently
  filtering against nothing. Worth confirming with the school before building on those tables.
- Client uses **anon key only** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). No service_role
  key in the frontend, and none should ever be added there.
- RLS is enabled but policies are permissive (`using (true)`) — **the anon key can read and write
  everything.** This is a known/accepted tradeoff for a school tool, not an accident. Don't
  "fix" it without discussing auth first; the app has no real user accounts, only a PIN gate.
- Schema changes: there is no migrations folder. SQL lives in `supabase/*.sql`, applied by hand
  in the Supabase SQL editor. If you add one, add a matching `.sql` file here.

## Auth / login
- `sessionStorage`, not `localStorage` — every browser session requires login again.
- Admin: PIN `1234`. Staff: no PIN.
- Do not weaken this to localStorage; that was deliberately changed (commit f728621).

## CSV import — the dangerous one
**Full-replace, not merge.** Import = wipe all items, then load the file. There is no undo.
- Before changing import code, make sure the user has a current export.
- Spreadsheet error cells (`#REF!`, `#N/A`, etc.) are filtered out — keep that filter.
- Every successful import writes a row to `import_log` (file_name, item_count, imported_by,
  created_at). Surfaced in Settings → Import History. Don't break that write.
- Helper scripts at repo root (`clean_csv.py`, `fix-consumables.mjs`) are one-off utilities.

## Deploy
- Vercel auto-deploys `main`. Push to main = live in ~1 min. **Treat that as production.**
- Hobby plan: cron limited to **once per day**, hence the single 00:00 UTC keepalive. Don't add a
  second cron or a more frequent schedule — it will fail silently or get the project flagged.
- The keepalive exists to stop Supabase pausing on the free tier. Removing it risks a dead DB.

## Design system (ui-makeover branch)
Direction, if and when the makeover resumes:
- Institutional navy `#0d1b6e` + gold `#e8b400`, warm paper background `#f6f4ef`
- Public Sans (body) + Source Serif 4 (headings)
- Flat cards, no glow, no gradients, no glassmorphism, no stock Tailwind blue
- No Inter, no Outfit
- Semantic chips: in-stock green, low/use amber, out red, borrow blue, return teal
  (`#e0f4f5` bg / `#0e7c86` fg)
- Lucide icon `stroke-width: 2.4` — default 1.5 reads too thin / AI-generic

**Status:** branch `ui-makeover` is local-only, never merged, and explicitly **set aside by the
user for now.** Don't merge or push it without being asked. 7 files were left uncommitted
(index.html, index.css, tailwind.config.ts, Sidebar, SelfServicePortal, Dashboard, LoginGateway).

## Gotchas
- Transaction log renders `qtyChange` as `+N` / `-N` / plain `0` — negative-zero was a real bug
  (e2e8dfc). Don't reintroduce it.
- Branding string is "Sucat Senior High School" — a doubled "School School" already happened
  once (f59d141).
- `src/components/CSVImportModal.tsx.bak` is a backup. Don't import or build from it; delete or
  ignore, don't ship.
- `SYSTEM DEMO.mp4` and stray JPGs at repo root are demo assets, not app assets.

## Secrets
`.env` (gitignored, holds the two VITE_SUPABASE_* vars). Never commit it, never paste keys into
chat, never put a service_role key in a `VITE_` variable — anything prefixed `VITE_` is shipped
to the browser.

## Open items
- `ui-makeover`: uncommitted work, paused by user.
- `FUTURE_FEATURE_BORROW_SLIP.md` at root — planned borrow-slip feature, not started.
- No CI. Tests exist but don't gate deploys.
- Import has no undo and no pre-import backup step.
