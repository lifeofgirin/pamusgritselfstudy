create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login_id text not null unique,
  auth_email text not null unique,
  role text not null check (role in ('admin','student')),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  grade_code text not null check (grade_code in ('초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3')),
  grade_base_year int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.textbooks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publisher text,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  unit_no int not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique(textbook_id, unit_no)
);

create table if not exists public.class_textbooks (
  class_id uuid not null references public.classes(id) on delete cascade,
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, textbook_id)
);

create table if not exists public.class_units (
  class_id uuid not null references public.classes(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (class_id, unit_id)
);

create table if not exists public.learning_contents (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  type text not null check (type in ('vocabulary','grammar','dialogue','passage')),
  title text not null,
  content_text text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.textbooks enable row level security;
alter table public.units enable row level security;
alter table public.class_textbooks enable row level security;
alter table public.class_units enable row level security;
alter table public.learning_contents enable row level security;

-- 이 v1은 모든 앱 데이터 읽기/쓰기를 서버에서 service role로 처리한다.
-- 따라서 브라우저의 anon/authenticated role에는 데이터 테이블 정책을 열지 않는다.
