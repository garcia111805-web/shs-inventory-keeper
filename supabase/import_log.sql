-- Import History table for Sucat SHS Inventory System
-- Run this ONCE in the Supabase SQL Editor, then connect that editor to the project.
-- After running, no action needed on the app side beyond redeploying the new build.

create table if not exists public.import_log (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  item_count integer not null default 0,
  imported_by text not null default 'System',
  created_at timestamptz not null default now()
);

-- Allow any authenticated / anon API call to read & write (matches the rest of this app)
alter table public.import_log enable row level security;

drop policy if exists "public import_log all" on public.import_log;
create policy "public import_log all"
  on public.import_log
  for all
  using (true)
  with check (true);
