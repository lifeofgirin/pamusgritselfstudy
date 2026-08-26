-- Pamus Grit Study v1.3
-- AI 자료 분석 + 내신형 문제 생성 기본 구조

alter table public.learning_contents
  add column if not exists ai_analysis jsonb not null default '{}'::jsonb,
  add column if not exists ai_analyzed_at timestamptz,
  add column if not exists ai_model text;

create table if not exists public.generated_questions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  source_content_ids uuid[] not null default '{}',
  question_type text not null check (
    question_type in (
      'vocabulary',
      'grammar',
      'content_match',
      'blank',
      'order',
      'writing'
    )
  ),
  prompt text not null,
  choices jsonb not null default '[]'::jsonb,
  answer text not null,
  explanation text not null,
  concept_tags text[] not null default '{}',
  difficulty_level int not null check (difficulty_level between 1 and 10),
  difficulty_reason text not null,
  status text not null default 'draft' check (status in ('draft','approved')),
  created_by uuid references public.profiles(id) on delete set null,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generated_questions enable row level security;

create index if not exists generated_questions_unit_id_idx
  on public.generated_questions(unit_id);

create index if not exists generated_questions_status_idx
  on public.generated_questions(status);
