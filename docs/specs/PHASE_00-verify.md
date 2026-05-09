# Phase 0 검증 결과
검증일시: 2026-05-08

## 완료 확인 기준 결과

### 환경 / 빌드
- [x] React 19 사용 확인 — `"react": "^19.2.5"`
- [x] Node.js 20 이상 — `.nvmrc`: 20, `engines.node`: ">=20"
- [x] `npm run build` 성공 — tsc -b + vite build 에러 없음
- [x] `npm run typecheck` 통과 — 타입 에러 없음
- [x] `npm run test:run` 실행 가능 — 테스트 0개, 에러 없음
- [x] `npm run lint` 실행 가능 — 에러 없음
- [x] `@types/node` 설치 — `"@types/node": "^24.12.2"`
- [x] `vite.config.ts`에 `@/` alias 설정 — `node:path` 사용
- [x] `tsconfig.app.json`에 `@/*` paths 설정

### 디렉토리 구조 (15개)
- [x] `src/components/ui/`, `src/components/layout/`
- [x] `src/pages/orders/`, `tracking/`, `mapping/`, `settings/`
- [x] `src/lib/parsers/`, `matching/`, `generators/`, `schemas/`, `supabase/`
- [x] `src/hooks/`, `src/types/`, `src/utils/`

### Supabase DB
- [x] `docs/REF_DB_스키마.md` 존재
- [ ] DB 12개 테이블 생성 완료 — ⚠️ 원격 환경 검증 필요 (코드에서 확인 불가)
- [ ] 모든 테이블 primary key + foreign key — ⚠️ 원격 환경 검증 필요
- [ ] 모든 테이블 `created_at`, 변경 가능 테이블에 `updated_at` — ⚠️ 원격 환경 검증 필요
- [ ] 모든 테이블 RLS 활성화 — ⚠️ 원격 환경 검증 필요
- [ ] 모든 테이블 authenticated 정책 — ⚠️ 원격 환경 검증 필요
- [x] 주문 테이블 1 row = 주문 라인 의미 명시 — REF_DB_스키마.md에 기술됨
- [x] 주문 중복 방지 제약 — SQL에 `unique(work_session_id, platform, matching_key)` 정의됨
- [x] 배정 중복 방지 제약 — SQL에 `unique(order_id)` on allocations 정의됨
- [x] 매칭키 규칙 문서화 — REF_DB_스키마.md + REF_데이터_모델.md에 명시

### Supabase Storage
- [ ] Storage 버킷 `templates` 생성 완료 — ⚠️ 원격 환경 검증 필요
- [ ] storage.objects 정책 4개 적용 — ⚠️ 원격 환경 검증 필요
- [ ] 템플릿 업로드/다운로드 동작 확인 — ⚠️ 원격 환경 검증 필요

### Supabase Auth & Client
- [ ] Email/Password 로그인 활성화 — ⚠️ 원격 환경 검증 필요
- [ ] 테스트 계정 생성 — ⚠️ 원격 환경 검증 필요
- [ ] `.env`에 실제 URL/Key 설정 — ⚠️ .env 파일 미커밋 (보안상 정상)
- [x] `src/lib/supabase/client.ts` 환경변수 누락 시 에러 throw — 구현됨
- [ ] `supabase.from('suppliers').select('*')` 에러 없음 — ⚠️ 원격 환경 검증 필요

### 타입 정의 (`src/types/index.ts`) — 14개 타입
- [x] `Platform` ("coupang" | "toss")
- [x] `AllocationStatus`, `TrackingStatus`, `WorkSessionStatus`, `PhoneFormat`, `SystemField`
- [x] `StandardOrder` — matchingKey, rawValues, rawRowNumber 포함
- [x] `Allocation` — isTemporaryOverride 포함
- [x] `Tracking` — allocationId nullable, status 4종
- [x] `StandardPurchaseOrder` + `PurchaseOrderItem`
- [x] `StandardTrackingExport` + `TrackingExportItem`
- [x] `Supplier`, `ProductMapping`, `NameMapping`, `CourierMapping`
- [x] `SupplierTemplate` + `ColumnMappingItem`
- [x] `PlatformTrackingTemplate`
- [x] `WorkSession`, `OrderImport`, `TrackingImport`
- [x] `InvalidRow` + `ParseResult` + `TrackingParseResult`
- [x] `OrderGroup`

### Zod 스키마 (`src/lib/schemas/index.ts`)
- [x] `standardOrderSchema`, `allocationSchema`, `trackingSchema`
- [x] `supplierSchema`, `supplierFormSchema`
- [x] `productMappingSchema`, `nameMappingSchema`, `courierMappingSchema`
- [x] `columnMappingItemSchema`, `supplierTemplateSchema`, `platformTrackingTemplateSchema`
- [x] `workSessionSchema`
- [x] DB row 타입 3개: `SupplierRow`, `WorkSessionRow`, `OrderRow`
- [x] 변환 함수 3개: `toSupplier`, `toWorkSession`, `toStandardOrder`

### 유틸리티 함수
- [x] `extractDigits("0504-3406-1054")` → `"050434061054"` 동작 (스펙 예시 `"05043406054"`는 오타, 실제 12자리가 정확)
- [x] `formatHyphen("050434061054")` → `"0504-3406-1054"` 동작
- [x] `formatHyphen("01012345678")` → `"010-1234-5678"` 동작
- [x] `src/utils/excel.ts` — 6개 함수 존재
- [x] `buildHeaderMap` JSDoc에 디버깅/검증용 명시
- [x] `src/utils/file.ts` — `validateExcelFile`, `getFileExtension`, `assertFileSize` 존재
- [x] `.xlsx`/`.xls` 외 확장자 거부 (대소문자 무관)
- [x] 10MB 초과 거부
- [x] `src/lib/utils.ts` — `cn()` 존재

### CSS 디자인 토큰 (임시값)
- [x] `@import "tailwindcss"` 선언
- [x] `@theme` 블록에 `⚠️ Phase 0 임시 토큰` 주석 명시
- [x] `--color-primary: #3182F6` 정의
- [x] `--color-success`, `--color-error`, `--color-warning` + 각 light 변형
- [x] `--color-gray-50` ~ `--color-gray-900` 10단계
- [x] `--font-sans`에 Pretendard 포함
- [x] `--radius-sm/md/lg/xl` 4단계

### 설정 파일
- [x] `.prettierrc` — semi: false, singleQuote: true, tabWidth: 2, trailingComma: es5
- [x] `.prettierignore` 존재
- [x] `.env.example` — VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- [x] `.gitignore` — .env, node_modules, dist, .vercel 포함
- [x] `.nvmrc` — `20`
- [x] `vitest.config.ts` — environment: 'node', include 설정 (globals 미설정 = false 기본값)
- [x] `tsconfig.app.json` — strict, noUncheckedIndexedAccess, noImplicitReturns, paths
- [x] `vite.config.ts` — `@tailwindcss/vite`, `node:path`, alias `@/`
- [x] `package.json` scripts 8개
- [x] `package.json` engines.node `>=20`

### 엑셀 컬럼 매핑 규칙
- [x] 0-based 인덱스 원칙 — CLAUDE.md + utils/CLAUDE.md에 명시
- [x] 문서 병기 — REF_엑셀_구조.md 존재
- [x] 컬럼명 기반 매핑 금지 원칙 — CLAUDE.md에 명시

---

## Codex 코드리뷰 결과

- **[P2] src/index.css:30-33** — shadcn 컴포넌트에 필요한 시맨틱 토큰 누락
  - 문제: shadcn/ui 컴포넌트가 `bg-card`, `text-card-foreground`, `border-input`, `text-muted-foreground`, `ring-ring` 등 CSS 변수를 참조하나, `@theme` 블록에 해당 토큰이 정의되지 않아 배경/테두리/포커스 링이 누락됨
  - 수정: 🔘 수용 안 함 — Phase 0 스펙에서 디자인 토큰은 명시적으로 "임시값"이며, "디자인 시스템 추출 단계에서 교체 예정"으로 명시. 빌드 통과 + 기본 레이아웃 동작 확인이 목적이므로 shadcn 시맨틱 토큰은 다음 단계(디자인 시스템 추출)에서 추가

- **[P2] src/utils/excel.ts:44-48** — `cellToInt`가 빈 문자열을 0으로 처리
  - 문제: `sheetToRows`가 빈 셀을 `''`로 공급하는데, `Number('')`이 `0`을 반환하여 `cellToInt('')`이 `null` 대신 `0`을 반환. 또한 `Math.floor`가 소수를 정수로 잘라 `'1.9'` → `1`로 변환하여 부정확한 수량으로 파싱될 위험
  - 수정: ✅ 수정 완료 — 빈 문자열 → `null`, 소수/Infinity → `null` 반환하도록 `Number.isFinite` + `Number.isInteger` 검증 추가

---

## 누락 (스펙에 있는데 구현 안 됨)

- **Supabase 원격 환경 미검증**: DB 12테이블, RLS, Storage 버킷, Auth 설정은 코드만으로 확인 불가. `.env` 설정 + Supabase 대시보드에서 수동 확인 필요.
  - 이 항목들은 Supabase SQL Editor에서 마이그레이션 실행 + 대시보드 설정 작업이며, 로컬 코드 검증 범위 밖.

### check-types 후속 수정 (2026-05-08)
아래 항목은 check-types 검증에서 발견되어 추가 구현함:
- ✅ `orderImportSchema`, `trackingImportSchema` Zod 스키마 추가
- ✅ DB Row 타입 9개 추가: `AllocationRow`, `TrackingRow`, `OrderImportRow`, `TrackingImportRow`, `ProductMappingRow`, `NameMappingRow`, `CourierMappingRow`, `SupplierTemplateRow`, `PlatformTemplateRow`
- ✅ 변환 함수 9개 추가: `toAllocation`, `toTracking`, `toOrderImport`, `toTrackingImport`, `toProductMapping`, `toNameMapping`, `toCourierMapping`, `toSupplierTemplate`, `toPlatformTrackingTemplate`
- ✅ `toSupplierTemplate`에서 `column_mappings` jsonb → `z.array(columnMappingItemSchema).parse()` 런타임 검증
- ✅ Tracking nullable 필드 (`tracking_company`, `tracking_number`, `raw_order_key`) → `?? ''` 안전 변환

---

## 스코프 크립 (구현했는데 스펙에 없음)

- `vitest.config.ts`에 `passWithNoTests: true` 추가 — 스펙 원문에 없으나, Phase 0에 테스트 파일이 없는 상황에서 `vitest run` 정상 종료를 위해 실용적으로 필요. **허용.**
- `next-themes` 패키지 설치 — shadcn/ui 초기화 시 자동 설치된 것으로 추정. 현재 사용하지 않으나 빌드에 영향 없음.

---

## 컨벤션 위반

없음

---

## spec-reviewer 결과

스펙 파일 520줄(>200줄 기준) → spec-reviewer 호출함.

### 🟢 양호
- 14개 도메인 타입 전체 — REF_데이터_모델.md와 필드 단위 일치
- Zod 스키마 11개 + DB row 타입 3개 + 변환함수 3개 — 스펙 충족
- 유틸리티 함수 시그니처 및 동작 — 스펙 일치
- CSS 임시 토큰 — 스펙 0-6 정의와 동일
- 설정 파일 전체 — 스펙 일치
- 디렉토리 구조 15개 — 전부 생성

### 🟡 권장 수정
- `tsconfig.app.json`에 `baseUrl: "."` 누락 — Vite alias로 동작하므로 기능 문제 없음. IDE 자동완성 개선을 위해 추가 권장.
- `cellToInt` 빈 문자열/소수 처리 — Phase 3 전 수정 권장

### 🔴 필수 수정
없음

---

## 종합 판정

### ✅ 통과

코드 레벨 검증 항목 **전체 통과**. P1 미수정 항목 없음. P2 2건은 각각 합당한 사유로 수용/보류.

**다음 단계 진행 조건:**
1. Supabase 원격 환경 수동 검증 (DB 12테이블 + RLS + Storage + Auth) — 사용자가 직접 확인
2. ~~`cellToInt` 수정은 Phase 3 시작 전까지 해결 권장~~ → ✅ 수정 완료
3. shadcn 시맨틱 토큰은 "디자인 시스템 추출" 단계에서 일괄 추가
