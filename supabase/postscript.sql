-- Postscript: additive, re-runnable migration (safe to run more than once).
-- Only ADDS tables and columns; nothing existing is renamed or dropped, because the
-- team's Fireside app shares this database.
--
-- Security note: like the rest of this app, these policies let the anon key read and write.
-- The "only the storyteller can see a sealed letter" rule is enforced in src/api.ts (demo-level),
-- not here. Real privacy needs auth + per-member row-level security.

-- 1. Intake: birthdays and special dates per person, and a link to a family member.
alter table people add column if not exists birthday date;
alter table people add column if not exists special_dates jsonb;   -- [{ "label": "Wedding day", "date": "2005-09-24" }]
alter table people add column if not exists member_id int;          -- family_members.id (no FK, to stay additive and loose)

-- 2. Chapters made from a "Now" letter remember which letter they came from.
alter table chapters add column if not exists letter_id uuid;

-- 3. Letters. Pieces, P.S. pieces and passages are jsonb so a letter is one row.
create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  family_code text not null,
  title text,
  stage_id int,                         -- life_stages.id
  created_at timestamptz not null default now(),
  status text not null default 'in_progress',     -- in_progress | finished
  origin text not null default 'normal',          -- normal | secret
  decided boolean not null default false,
  pieces jsonb not null default '[]'::jsonb,      -- [{ id, audioUrl, transcript, createdAt }]
  ps_pieces jsonb not null default '[]'::jsonb,   -- [{ id, audioUrl, transcript, createdAt, prompt }]
  release_mode text not null default 'private',   -- now | date | after | private
  release_at date,
  recipients jsonb not null default '[]'::jsonb,  -- ["12", "14"] or "all"
  keeper_id text,
  keeper_released_at timestamptz,
  sealed_at timestamptz,
  excluded jsonb not null default '[]'::jsonb,
  name_choices jsonb not null default '[]'::jsonb,
  sensitive jsonb,
  passages jsonb not null default '[]'::jsonb,
  opened_at jsonb not null default '{}'::jsonb,   -- { "<member id>": "<iso time>" }
  chapter_id int
);
create index if not exists letters_family_code_idx on letters (family_code);

-- 4. Voice replies to a letter.
create table if not exists letter_replies (
  id uuid primary key default gen_random_uuid(),
  family_code text not null,
  letter_id uuid not null references letters(id) on delete cascade,
  member_id text not null,
  member_name text,
  audio_url text,
  created_at timestamptz not null default now()
);
create index if not exists letter_replies_letter_idx on letter_replies (letter_id);

-- 5. Policies (same openness as the existing tables; see the note at the top).
alter table letters enable row level security;
alter table letter_replies enable row level security;

drop policy if exists "postscript letters anon access" on letters;
create policy "postscript letters anon access" on letters
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "postscript replies anon access" on letter_replies;
create policy "postscript replies anon access" on letter_replies
  for all to anon, authenticated using (true) with check (true);

-- 6. Letter audio is uploaded from the browser to the existing public "memos" bucket under letters/.
drop policy if exists "postscript letter audio upload" on storage.objects;
create policy "postscript letter audio upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'memos' and name like 'letters/%');

drop policy if exists "postscript letter audio delete" on storage.objects;
create policy "postscript letter audio delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'memos' and name like 'letters/%');
