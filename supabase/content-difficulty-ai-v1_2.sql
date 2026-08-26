-- Pamus Grit Study v1.2
-- 관리자 수동 난이도를 제거하고, AI가 나중에 난이도를 기록할 수 있도록
-- difficulty_level을 NULL 허용 상태로 바꿉니다.
-- 기존에 수동으로 입력된 난이도도 초기화합니다.

alter table public.learning_contents
  alter column difficulty_level drop not null,
  alter column difficulty_level drop default;

update public.learning_contents
set difficulty_level = null;

-- 기존 1~10 CHECK 제약은 그대로 둡니다.
-- NULL은 CHECK를 통과하므로, 이후 AI가 분석을 완료했을 때만 1~10 값을 기록하면 됩니다.
