PDF Invalid key 수정 패치

원인:
Supabase Storage object key에 원본 한글 PDF 파일명을 포함해서 일부 파일명에서 Invalid key 오류가 발생했습니다.

수정:
- Storage 내부 경로: <unit UUID>/<import UUID>.pdf
- 화면/DB의 original_filename에는 원래 한글 파일명을 그대로 보존
- OpenAI 임시 업로드 파일명도 ASCII UUID 기반으로 사용

적용:
1. ZIP 안의 app/admin/actions.ts를 GitHub의 같은 경로에 덮어쓰기
2. Commit
3. Vercel 자동 재배포 완료 후 같은 PDF 다시 업로드

SQL 추가 실행이나 환경변수 수정은 필요 없습니다.
