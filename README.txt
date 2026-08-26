Pamus Grit Study v1.1 패치

1) Supabase SQL Editor에서 supabase/content-structure-v2.sql 실행
2) GitHub에 아래 파일을 같은 경로로 덮어쓰기
   app/admin/page.tsx
   app/admin/actions.ts
   app/admin/LearningContentForm.tsx (새 파일)
   app/student/page.tsx
   app/globals.css
3) Commit 후 Vercel 자동 재배포

중요: app/actions/auth.ts는 건드리지 마세요. 현재 정상 로그인 파일을 그대로 유지합니다.
