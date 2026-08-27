-- Pamus Grit Study v1.4
-- 1) 문제 생성 시 목표 난이도 Lv.1~10
-- 2) PDF 업로드 -> AI 자동 분류 -> 관리자 검수 -> 학습자료 등록

alter table public.generated_questions
  add column if not exists target_difficulty_level int;

update public.generated_questions
set target_difficulty_level = difficulty_level
where target_difficulty_level is null;

alter table public.generated_questions
  drop constraint if exists generated_questions_target_difficulty_level_check;

alter table public.generated_questions
  add constraint generated_questions_target_difficulty_level_check
  check (target_difficulty_level is null or target_difficulty_level between 1 and 10);

create table if not exists public.pdf_imports (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  storage_bucket text not null default 'study-pdfs',
  storage_path text not null unique,
  original_filename text not null,
  file_size_bytes bigint,
  status text not null default 'uploaded' check (status in ('uploaded','analyzing','review','registered','error')),
  ai_summary text,
  ai_result jsonb not null default '{}'::jsonb,
  error_message text,
  ai_model text,
  created_by uuid references public.profiles(id) on delete set null,
  analyzed_at timestamptz,
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pdf_imports enable row level security;

create index if not exists pdf_imports_unit_id_idx on public.pdf_imports(unit_id);
create index if not exists pdf_imports_status_idx on public.pdf_imports(status);

alter table public.learning_contents
  add column if not exists source_pdf_import_id uuid references public.pdf_imports(id) on delete set null;

-- 관리자 서버(service role)가 Signed Upload URL을 발급하고,
-- 브라우저는 그 일회성 토큰으로만 PDF를 올린다.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'study-pdfs',
  'study-pdfs',
  false,
  26214400,
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
