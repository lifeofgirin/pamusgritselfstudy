# Pamus Grit Study v1

첫 단계 기능만 구현한 독립형 학생 학습 사이트입니다.

## 현재 구현

- 하나의 로그인 화면
  - 관리자 로그인 → `/admin`
  - 학생 로그인 → `/student`
  - Supabase SSR 쿠키 세션으로 자동 로그인 유지
- 관리자
  - 학생 등록: 이름 / 학년 / 아이디 / 비밀번호
  - 학년은 `등록 당시 학년 + 기준연도`로 계산해 매년 1월 1일 자동 상승
  - 반 만들기 / 학생 배정
  - 교과서 등록
  - 교과서 유닛 등록
  - 반에 교과서 연결
  - 반별 허용 유닛 설정
  - 어휘 / 문법 / 대화문 / 본문 등록
- 학생
  - 자기 반에 허용된 유닛만 표시
  - 허용 유닛의 학습자료만 열람

AI 문제 출제, 채점, 취약점 분석은 아직 넣지 않았습니다. 현재 데이터 구조 위에 다음 단계로 붙이면 됩니다.

## 1. Supabase 준비

Supabase 프로젝트를 만든 뒤 SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.

## 2. 환경변수

`.env.example`을 `.env.local`로 복사하고 값을 입력합니다.

```bash
cp .env.example .env.local
```

필수 값:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_LOGIN_ID`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

`SUPABASE_SERVICE_ROLE_KEY`는 절대 브라우저에 노출하면 안 됩니다. 이 프로젝트에서는 서버 전용 코드에서만 읽습니다.

## 3. 관리자 최초 생성

```bash
npm install
npm run create-admin
```

## 4. 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 5. GitHub / Vercel

GitHub에 이 폴더를 push한 뒤 Vercel에 Import 합니다. Vercel의 Environment Variables에도 `.env.local`과 같은 키를 등록합니다.

## 학년 자동 상승 방식

예: 2026년에 `중1`로 등록한 학생은

- 2026: 중1
- 2027-01-01부터: 중2
- 2028-01-01부터: 중3
- 2029-01-01부터: 고1

처럼 별도 cron 없이 화면 계산으로 자동 반영됩니다. 현재 v1은 고3 이후에는 고3으로 유지됩니다. 추후 졸업 상태를 따로 둘 수 있습니다.

## 다음 단계 후보

1. 어휘 자료를 `단어 / 뜻 / 품사 / 예문` 구조형 입력으로 개선
2. 문법 개념 태그 및 난이도 축 추가
3. AI 문제 생성
4. 학생 풀이 / 자동 채점
5. 학생별 취약점 통계
