-- Phase 8: 과일 사전 테이블
create table fruit_dictionary (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  keywords text[] not null,
  grade_synonyms jsonb not null default '{}',
  size_synonyms jsonb not null default '{}',
  weight_aliases jsonb not null default '{"kg": ["키로","KG","킬로"]}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fruit_dictionary enable row level security;

create policy "Authenticated can read fruit_dictionary"
  on fruit_dictionary for select to authenticated using (true);

create policy "Authenticated can insert fruit_dictionary"
  on fruit_dictionary for insert to authenticated with check (true);

create policy "Authenticated can update fruit_dictionary"
  on fruit_dictionary for update to authenticated using (true);

create policy "Authenticated can delete fruit_dictionary"
  on fruit_dictionary for delete to authenticated using (true);
