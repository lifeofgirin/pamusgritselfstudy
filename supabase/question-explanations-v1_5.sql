-- Pamus Grit Study v1.5
-- 객관식 보기별 해설 + 복수정답 검수 데이터

alter table public.generated_questions
  add column if not exists correct_choice_no int not null default 0
    check (correct_choice_no between 0 and 5),
  add column if not exists choice_explanations jsonb not null default '[]'::jsonb,
  add column if not exists ambiguity_check text not null default '';

comment on column public.generated_questions.correct_choice_no is
  '객관식 정답 보기 번호(1~5). 서술형은 0';

comment on column public.generated_questions.choice_explanations is
  '각 보기에 대한 정오 판정, 해설, 한국어 해석';

comment on column public.generated_questions.ambiguity_check is
  'AI의 복수정답 가능성 최종 검수 결과';
