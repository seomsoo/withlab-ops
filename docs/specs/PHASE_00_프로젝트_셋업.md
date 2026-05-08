# Phase 0: 프로젝트 셋업

## 목표
빌드/타입체크/테스트/린트가 통과하는 프로젝트 스켈레톤 + Supabase DB(12테이블) + RLS/Storage 정책 + 핵심 타입/스키마/유틸 준비.

> ⚠️ Phase 0은 **시각적 완성도가 아닌 인프라 준비**가 목적. 디자인 토큰은 임시값이며,
> Phase 0 검증 통과 후 "디자인 시스템 추출" 단계에서 정식 토큰으로 교체됨 (`docs/STATUS.md` 참조).

---

## 작업 목록

### 0-1. Vite + React 19 + TypeScript 프로젝트 생성
```bash
npm create vite@latest withlab -- --template react-ts
cd withlab && npm install
```

생성 후 `package.json`에서 React 버전이 19 계열인지 확인:
```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x"
  }
}
```

React 18로 다운그레이드하지 않는다. shadcn/ui, Tailwind v4, Vite 최신 템플릿 조합과의 정합성을 우선한다.

---

### 0-2. Node 버전 고정

`.nvmrc`:
```
20
```

`package.json`:
```json
{
  "engines": {
    "node": ">=20"
  }
}
```

---

### 0-3. tsconfig strict 설정

`tsconfig.app.json`에 추가/확인:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

> Vite React TS 템플릿은 `tsconfig.app.json` + `tsconfig.node.json` 프로젝트 레퍼런스 구조이므로
> 빌드/체크 시 `tsc -b`를 사용한다 (단독 `tsc` 아님).

---

### 0-4. 패키지 설치
```bash
# 런타임
npm install @supabase/supabase-js react-router-dom zod zustand xlsx exceljs file-saver lucide-react clsx tailwind-merge class-variance-authority sonner

# 개발 (path alias용 @types/node 포함)
npm install -D tailwindcss @tailwindcss/vite vitest @types/file-saver @types/node prettier eslint
```

---

### 0-5. Vite + Tailwind v4 설정

`vite.config.ts`:
```ts
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

### 0-6. 임시 디자인 토큰

> ⚠️ 이 단계의 토큰은 **임시값**이다. Phase 0 완료 후 Claude Design으로 시각 디자인을 만들고,
> 그 결과로부터 추출한 정식 디자인 시스템(`docs/REF_디자인_시스템.md`)으로 **이 토큰들을 모두 교체**하게 된다.

`src/index.css`:
```css
@import "tailwindcss";

/* ⚠️ Phase 0 임시 토큰 — 디자인 시스템 추출 단계에서 교체 예정 */
@theme {
  /* Primary (브랜드) — 토스 블루 임시 사용 */
  --color-primary: #3182F6;
  --color-primary-hover: #1B6AE5;
  --color-primary-light: #E8F1FD;

  /* Status (의미적 약속 — 톤은 디자인 단계에서 조정 가능) */
  --color-success: #34C759;
  --color-success-light: #E8F8ED;
  --color-error: #FF3B30;
  --color-error-light: #FFF0EF;
  --color-warning: #FF9500;
  --color-warning-light: #FFF5E5;

  /* Gray Scale */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Surface */
  --color-background: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-border: #E5E7EB;

  /* Font */
  --font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

---

### 0-7. shadcn/ui 초기화

```bash
npx shadcn@latest init
npx shadcn@latest add button input card badge dialog sonner
```

CLI가 동작하지 않으면 수동 설정.

---

### 0-8. Prettier + ESLint

`.prettierrc`:
```json
{ "semi": false, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5" }
```

`.prettierignore`:
```
dist
node_modules
*.log
```

ESLint는 Vite 템플릿 기본 설정 유지하되, 필요 시 추후 보강.

---

### 0-9. 환경변수

`.env.example` (커밋):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env` (gitignore):
```
VITE_SUPABASE_URL=실제값
VITE_SUPABASE_ANON_KEY=실제값
```

---

### 0-10. 디렉토리 구조 생성

```
src/
├── components/
│   ├── ui/             (shadcn/ui 자동 생성)
│   └── layout/
├── pages/
│   ├── orders/
│   ├── tracking/
│   ├── mapping/
│   └── settings/
├── lib/
│   ├── parsers/
│   ├── matching/
│   ├── generators/
│   ├── schemas/
│   └── supabase/
├── hooks/
├── types/
└── utils/
```

각 폴더에 `CLAUDE.md`가 있다면 그 폴더의 컨벤션을 따른다 (이 Phase에서는 폴더만 생성).

---

### 0-11. Supabase 셋업

1. Supabase 프로젝트 생성
2. SQL Editor에서 `docs/REF_DB_스키마.md`의 마이그레이션 SQL 전체 실행
   - 12테이블 생성
   - 트리거(updated_at)
   - 모든 테이블 RLS 활성화 + authenticated 정책
3. Storage 버킷 `templates` 생성 (Private)
4. `storage.objects`에 templates 정책 4개 적용 (REF_DB_스키마.md 참조)
5. Auth → Email/Password 활성화 → 테스트 계정 1개 이상 생성

---

### 0-12. Supabase 클라이언트

`src/lib/supabase/client.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (typeof supabaseUrl !== 'string' || supabaseUrl.length === 0) {
  throw new Error('VITE_SUPABASE_URL 환경변수 누락')
}

if (typeof supabaseAnonKey !== 'string' || supabaseAnonKey.length === 0) {
  throw new Error('VITE_SUPABASE_ANON_KEY 환경변수 누락')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

> 향후 Supabase 타입 자동 생성 도입 시 `createClient<Database>(...)`로 확장.
> Phase 0에서는 필수 아님.

---

### 0-13. TypeScript 도메인 타입

`src/types/index.ts` — `docs/REF_데이터_모델.md` 기준 전체 타입 정의.
타입 목록은 본 문서 "완료 기준 > 타입 정의" 참조.

---

### 0-14. Zod 스키마

`src/lib/schemas/index.ts`:
- 모든 도메인 모델의 Zod 스키마
- DB row 타입(snake_case) + camelCase 변환 함수
- 사용자 입력 폼 스키마 (`supplierFormSchema` 등)

스키마 목록은 "완료 기준 > Zod 스키마" 참조.

---

### 0-15. 유틸리티 함수

#### `src/utils/phone.ts`
```ts
export function extractDigits(phone: string): string
export function formatHyphen(digits: string): string
export function applyPhoneFormat(value: string, format?: 'raw' | 'hyphen' | 'digits'): string
```

#### `src/utils/excel.ts` (SheetJS 래퍼, 읽기 전용)
```ts
export function readExcelFile(file: File): Promise<XLSX.WorkBook>
export function sheetToRows(sheet: XLSX.WorkSheet): unknown[][]
export function buildHeaderMap(headerRow: unknown[]): Map<string, number>  // 디버깅/검증/에러 메시지용 (실제 컬럼 매핑은 인덱스 기반)
export function cellToString(value: unknown): string
export function cellToInt(value: unknown): number | null
export function isEmptyRow(row: unknown[]): boolean
```

> ⚠️ `buildHeaderMap`은 디버깅/검증/에러 메시지용으로만 사용한다.
> 실제 파서의 컬럼 매핑은 **0-based 인덱스 상수**로 한다 (REF_엑셀_구조.md 참조).

#### `src/utils/file.ts` (파일 업로드 검증)
```ts
export const ALLOWED_EXCEL_EXTENSIONS = ['xlsx', 'xls'] as const
export const MAX_UPLOAD_SIZE_MB = 10

export function getFileExtension(filename: string): string
export function assertFileSize(file: File, maxMb: number): void
export function validateExcelFile(file: File): void  // 확장자(.xlsx/.xls) + 크기(10MB) 검증, 실패 시 throw
```

검증 규칙:
- 확장자: `.xlsx`, `.xls`만 허용 (대소문자 무시)
- 크기: 10MB 초과 시 거부
- 실패 시 사람이 읽을 수 있는 한국어 에러 메시지 throw

#### `src/lib/utils.ts`
```ts
export function cn(...inputs: ClassValue[]): string  // clsx + tailwind-merge
```

---

### 0-16. Vitest 설정

`vitest.config.ts` — `globals: false` 사용 (명시적 import 방식):
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

테스트 파일에서는 명시적으로 import:
```ts
import { describe, expect, it } from 'vitest'
```

---

### 0-17. package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --noEmit",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

---

### 0-18. .gitignore

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.vercel/
```

`.env.example`은 커밋한다.

---

### 0-19. 기본 파일 정리
- `App.css` 삭제
- `App.tsx` → 빈 컴포넌트로 교체 (`<div className="p-8">WithLab</div>` 정도)
- 기본 Vite 에셋(react.svg 등) 삭제

---

## 완료 기준

### 환경 / 빌드
- [ ] React 19 사용 확인 (`package.json`에서 `^19.x`)
- [ ] Node.js 20 이상 사용 (`.nvmrc` 존재, `engines.node` 설정)
- [ ] `npm run build` 에러 없이 성공 (tsc -b + vite build)
- [ ] `npm run typecheck` 타입 에러 없이 통과
- [ ] `npm run test:run` 실행 가능 (테스트 0개 OK, 에러 없음)
- [ ] `npm run lint` 실행 가능
- [ ] `@types/node` 설치
- [ ] `vite.config.ts`에 `@/` alias 설정 (`node:path` 사용)
- [ ] `tsconfig.app.json`에 `@/*` paths 설정

### 디렉토리 구조 (15개)
- [ ] `src/components/ui/`, `src/components/layout/`
- [ ] `src/pages/orders/`, `tracking/`, `mapping/`, `settings/`
- [ ] `src/lib/parsers/`, `matching/`, `generators/`, `schemas/`, `supabase/`
- [ ] `src/hooks/`, `src/types/`, `src/utils/`

### Supabase DB
- [ ] `docs/REF_DB_스키마.md` 존재
- [ ] DB 12개 테이블 생성 완료
- [ ] 모든 테이블 primary key + 필요한 foreign key
- [ ] 모든 테이블 `created_at`, 변경 가능 테이블에 `updated_at` 컬럼
- [ ] 모든 테이블 RLS 활성화
- [ ] 모든 테이블에 authenticated role 대상 select/insert/update/delete 정책
- [ ] **주문 테이블 1 row = 주문 라인** 의미 명시 (현재 테이블명은 `orders` 유지)
- [ ] 주문 라인 중복 방지: `unique(work_session_id, platform, matching_key)` 제약 존재
- [ ] 주문 라인 중복 배정 방지: `unique(order_id)` on `allocations` 제약 존재
- [ ] 매칭키 규칙 문서화: 쿠팡=주문번호, 토스=주문상품번호

### Supabase Storage
- [ ] Storage 버킷 `templates` 생성 완료 (Private)
- [ ] `storage.objects`에 templates 버킷 authenticated select/insert/update/delete 정책 4개 적용
- [ ] 로그인한 테스트 계정으로 템플릿 파일 업로드/다운로드 동작 확인

### Supabase Auth & Client
- [ ] Email/Password 로그인 활성화
- [ ] 테스트 계정 최소 1개 생성
- [ ] `.env`에 실제 URL/Key 설정
- [ ] `src/lib/supabase/client.ts`에서 환경변수 누락 시 명시적 에러 throw
- [ ] `supabase.from('suppliers').select('*')` 호출 시 에러 없음

### 타입 정의 (`src/types/index.ts`) — 14개 타입
- [ ] `Platform` ("coupang" | "toss")
- [ ] `AllocationStatus`, `TrackingStatus`, `WorkSessionStatus`, `PhoneFormat`, `SystemField`
- [ ] `StandardOrder` (matchingKey, rawValues, rawRowNumber 필드 포함)
- [ ] `Allocation` (isTemporaryOverride 필드 포함)
- [ ] `Tracking` (allocationId nullable, status 4종)
- [ ] `StandardPurchaseOrder` + `PurchaseOrderItem`
- [ ] `StandardTrackingExport` + `TrackingExportItem`
- [ ] `Supplier`, `ProductMapping`, `NameMapping`, `CourierMapping`
- [ ] `SupplierTemplate` + `ColumnMappingItem`
- [ ] `PlatformTrackingTemplate`
- [ ] `WorkSession`, `OrderImport`, `TrackingImport`
- [ ] `InvalidRow` + `ParseResult` + `TrackingParseResult`
- [ ] `OrderGroup` (UI 헬퍼)

### Zod 스키마 (`src/lib/schemas/index.ts`)
- [ ] `standardOrderSchema`, `allocationSchema`, `trackingSchema`
- [ ] `supplierSchema`, `supplierFormSchema`
- [ ] `productMappingSchema`, `nameMappingSchema`, `courierMappingSchema`
- [ ] `columnMappingItemSchema`, `supplierTemplateSchema`, `platformTrackingTemplateSchema`
- [ ] `workSessionSchema`
- [ ] DB row 타입 최소 3개: `SupplierRow`, `WorkSessionRow`, `OrderRow`

### 유틸리티 함수
- [ ] `src/utils/phone.ts` — `extractDigits("0504-3406-1054")` → `"05043406054"` 동작
- [ ] `src/utils/phone.ts` — `formatHyphen("05043406054")` → `"0504-3406-1054"` 동작
- [ ] `src/utils/phone.ts` — `formatHyphen("01012345678")` → `"010-1234-5678"` 동작
- [ ] `src/utils/excel.ts` — 6개 함수 존재 (`readExcelFile`, `sheetToRows`, `buildHeaderMap`, `cellToString`, `cellToInt`, `isEmptyRow`)
- [ ] **`buildHeaderMap`은 디버깅/검증용으로만 사용** 한다고 주석 또는 JSDoc에 명시
- [ ] `src/utils/file.ts` — `validateExcelFile`, `getFileExtension`, `assertFileSize` 존재
- [ ] `validateExcelFile`이 `.xlsx`/`.xls` 외 확장자 거부 (대소문자 무관)
- [ ] `validateExcelFile`이 10MB 초과 파일 거부
- [ ] `src/lib/utils.ts` — `cn()` 함수 존재

### CSS 디자인 토큰 (임시값)
- [ ] `src/index.css`에 `@import "tailwindcss"` 선언
- [ ] `@theme` 블록에 `⚠️ Phase 0 임시 토큰` 주석 명시
- [ ] `--color-primary: #3182F6` 정의
- [ ] `--color-success`, `--color-error`, `--color-warning` + 각 light 변형 정의
- [ ] `--color-gray-50` ~ `--color-gray-900` 10단계 정의
- [ ] `--font-sans`에 Pretendard 포함
- [ ] `--radius-sm/md/lg/xl` 4단계 정의

### 설정 파일
- [ ] `.prettierrc` — semi: false, singleQuote: true, tabWidth: 2, trailingComma: es5
- [ ] `.prettierignore` 존재
- [ ] `.env.example` — VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (실제 값 없음)
- [ ] `.gitignore` — .env, node_modules, dist, .vercel 포함
- [ ] `.nvmrc` — `20`
- [ ] `vitest.config.ts` — `globals: false`, `environment: 'node'`, `include: ['src/**/*.test.ts']`
- [ ] `tsconfig.app.json` — strict, noUncheckedIndexedAccess, noImplicitReturns, paths
- [ ] `vite.config.ts` — `@tailwindcss/vite`, `node:path`, alias `@/`
- [ ] `package.json` scripts 8개 (dev, build, typecheck, preview, test, test:run, lint, format)
- [ ] `package.json` engines.node `>=20`

### 엑셀 컬럼 매핑 규칙 (이후 Phase에서 사용)
- [ ] 내부 코드는 **0-based 컬럼 인덱스** 사용 — 상수로 정의
- [ ] 문서(REF_엑셀_구조.md 등)에는 엑셀 컬럼 문자(C, D)와 1-based 위치 병기
- [ ] **컬럼명 기반 매핑 금지** 원칙이 루트 CLAUDE.md에 명시되어 있음

---

## 🔍 검증

> 아래 명령어 종류를 혼동하지 않는다.

### 로컬 검증 명령 (터미널에서 실행)
```bash
npm run build
npm run typecheck
npm run test:run
npm run lint
```

### Claude Code 슬래시 커맨드 (Claude Code 안에서 실행)
```
/project:verify       ← 종합 검증, PHASE_00-verify.md 생성
/project:next-phase   ← 검증 통과 후 다음 단계 전환 (디자인 시스템 추출 단계로)
/project:check-types  ← 타입 정합성 검증 (verify에서 자동 호출되기도 함)
```

`/project:verify` 통과 후 `/project:next-phase` 실행 → "디자인 시스템 추출" 단계로 진입.
