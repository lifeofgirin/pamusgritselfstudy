-- Pamus Grit Study v1.1
-- 기존 learning_contents 데이터를 지우지 않고 AI 출제용 구조 필드를 추가합니다.

alter table public.learning_contents
  add column if not exists major_topic text,
  add column if not exists sub_topic text,
  add column if not exists difficulty_level smallint not null default 3,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_contents_difficulty_level_check'
  ) then
    alter table public.learning_contents
      add constraint learning_contents_difficulty_level_check
      check (difficulty_level between 1 and 10);
  end if;
end $$;

create index if not exists learning_contents_unit_type_idx
  on public.learning_contents(unit_id, type);

create index if not exists learning_contents_tags_gin_idx
  on public.learning_contents using gin(tags);

create index if not exists learning_contents_metadata_gin_idx
  on public.learning_contents using gin(metadata);
