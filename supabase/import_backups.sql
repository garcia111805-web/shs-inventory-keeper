-- Pre-import backups for the Sucat SHS Inventory System
-- Run this ONCE in the Supabase SQL Editor.
--
-- Every full-replace import and every manual "Clear All Inventory" writes a snapshot of the
-- `items` table here BEFORE the wipe, so the wipe becomes reversible.
-- Restore = wipe again, then re-insert the snapshot's rows verbatim.

create table if not exists public.import_backups (
  id uuid primary key default gen_random_uuid(),
  file_name text not null default 'Manual backup',
  row_count integer not null default 0,
  payload jsonb not null default '[]'::jsonb,
  reason text not null default 'import',
  created_by text not null default 'System',
  created_at timestamptz not null default now()
);

comment on table public.import_backups is
  'Snapshots of public.items taken immediately before a destructive full-replace import.';

comment on column public.import_backups.reason is
  'import = file import, manual-clear = Clear All Inventory button, pre-restore = guard before a restore.';

-- Matches the rest of this app: RLS on, permissive policy (anon key can read/write).
alter table public.import_backups enable row level security;

drop policy if exists "public import_backups all" on public.import_backups;
create policy "public import_backups all"
  on public.import_backups
  for all
  using (true)
  with check (true);

create index if not exists import_backups_created_at_idx
  on public.import_backups (created_at desc);
