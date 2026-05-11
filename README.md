# WithLab — 과일 발주 관리 시스템

쿠팡/토스 플랫폼 주문을 업로드하여 공급처별 발주서를 자동 생성하고, 운송장을 매칭하는 내부 관리자 시스템.

## 주요 기능

- **주문 업로드**: 쿠팡/토스 주문 엑셀 파싱 + 중복/오류 감지
- **공급처 배정**: 품목별 자동 배정 + 수동 조정
- **발주서 생성**: 공급처 양식 템플릿 기반 엑셀 자동 생성
- **운송장 매칭**: 공급처 운송장 → 플랫폼 양식 자동 변환
- **매핑 관리**: 공급처, 품목, 상품명, 택배사 매핑
- **대시보드**: 최근 작업건 현황, 빠른 작업 시작, 바로가기
- **다크모드**: 시스템/라이트/다크 테마 지원

## 기술 스택

- **Frontend**: React 19 + TypeScript (Vite)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **배포**: Vercel

## 로컬 실행

```bash
# Node.js 20 이상 필요
nvm use

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 Supabase URL과 Anon Key 입력

# 개발 서버
npm run dev
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (http://localhost:5173) |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |
| `npm run typecheck` | 타입 체크 |
| `npm run test:run` | 테스트 실행 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 포맷팅 |

## 환경변수

| 변수 | 설명 | 환경 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 로컬 / Vercel |
| `VITE_SUPABASE_ANON_KEY` | Supabase 퍼블릭 anon 키 | 로컬 / Vercel |

## 프로젝트 구조

```
src/
├── components/
│   ├── ui/              # shadcn/ui 공통 컴포넌트
│   ├── layout/          # 사이드바, 페이지 헤더
│   └── work-session/    # 작업건 공통 컴포넌트
├── pages/
│   ├── orders/          # 발주서 (업로드 → 배정 → 다운로드)
│   ├── tracking/        # 운송장 (업로드 → 매칭 → 출력)
│   ├── mapping/         # 매핑 관리
│   └── settings/        # 양식 관리
├── lib/
│   ├── parsers/         # 엑셀 파싱
│   ├── matching/        # 운송장 매칭 엔진
│   ├── generators/      # 엑셀 생성
│   ├── allocation/      # 자동 배정
│   ├── schemas/         # Zod 스키마
│   └── supabase/        # Supabase 클라이언트 + API
├── hooks/               # 커스텀 훅
├── types/               # TypeScript 타입
└── utils/               # 유틸 함수
```

## 배포 (Vercel)

### 설정

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: 20.x

### 환경변수 설정

Vercel 프로젝트 Settings → Environment Variables에서 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 Production, Preview 환경에 설정.

### SPA 라우팅

`vercel.json`에 모든 경로를 `/index.html`로 리라이트하는 설정이 포함되어 있어, 직접 URL 접근 시에도 404가 발생하지 않습니다.

### 플랜 주의

이 프로젝트는 내부 B2B 운영 도구입니다. 실제 운영 배포 전 Vercel 플랜 정책(상업적 사용 제한)을 확인하세요. 상업적 운영 환경에서는 Pro 이상 또는 대체 호스팅(Cloudflare Pages 등)을 검토하세요.

## 문서 구분

- `README.md`: 개발/배포/환경변수 설정 (개발자용)
- `docs/USER_GUIDE.md`: 운영자 사용 가이드
- `docs/REF_*.md`: 스펙/레퍼런스
