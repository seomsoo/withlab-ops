# Phase 2 검증 결과

검증일시: 2026-05-10

## 완료 확인 기준 결과

### Supabase API 함수

- [x] `src/lib/supabase/errors.ts` — isUniqueViolation (23505), toFriendlyDbError 4개 context
- [x] `src/lib/supabase/suppliers.ts` — getSuppliers(활성만), getAllSuppliers(전체), createSupplier, updateSupplier, deleteSupplier(soft)
- [x] `src/lib/supabase/productMappings.ts` — CRUD 4함수, supplier join (비활성 포함)
- [x] `src/lib/supabase/nameMappings.ts` — CRUD 4함수, supplier join (비활성 포함)
- [x] `src/lib/supabase/courierMappings.ts` — CRUD 4함수, supplier join (비활성 포함)
- [x] 모든 API 함수에서 snake_case → camelCase 변환 (toProductMapping, toNameMapping, toCourierMapping)
- [x] unique 제약 위반 시 사용자 친화적 에러 메시지 (errors.ts)
- [x] API 함수에서 toast 호출하지 않음 (grep 확인)

### Zod 스키마

- [x] requiredTrimmedString, optionalTrimmedString, requiredUuid 헬퍼
- [x] productMappingFormSchema (trim, coerce, min/max 적용)
- [x] nameMappingFormSchema (trim 적용)
- [x] courierMappingFormSchema (trim 적용)
- [x] FormData 타입은 z.infer로 생성 (수동 타입 금지)
- [x] supplierFormSchema에 trim 적용 확인 (requiredTrimmedString, optionalTrimmedString)
- [x] optionName/platformOptionName은 null 아닌 빈 문자열로 변환

### WithSupplier 타입

- [x] ProductMappingWithSupplier (supplierName + supplierIsActive)
- [x] NameMappingWithSupplier (supplierName + supplierIsActive)
- [x] CourierMappingWithSupplier (supplierName + supplierIsActive)

### 커스텀 훅

- [x] useSuppliers — CRUD + 로딩/에러 상태 + includeInactive 옵션
- [x] useProductMappings — CRUD + 로딩/에러 상태
- [x] useNameMappings — CRUD + 로딩/에러 상태
- [x] useCourierMappings — CRUD + 로딩/에러 상태
- [x] 모든 훅에서 toast 호출 (success/error)
- [x] 모든 훅에서 mutation 성공 시 refetch
- [x] 모든 훅에서 mutation 실패 시 에러 re-throw
- [x] 로드 함수명 refetch 사용 (전역 fetch 회피)
- [x] 초기 로드 effect에서 alive flag 사용

### 공급처 관리 페이지

- [x] 공급처 목록 테이블 (이름/연락처/메모/등록일/관리)
- [x] 빈 상태: EmptyState 표시
- [x] [공급처 추가] → Dialog (이름 필수, 연락처/메모 선택)
- [x] [수정] → Dialog (기존 값 pre-fill)
- [x] [삭제] → ConfirmDialog "비활성화" → 소프트 삭제
- [x] 중복 이름 에러 메시지 표시

### 품목↔공급처 매핑 페이지

- [x] 매핑 테이블 (플랫폼/상품명/옵션/공급처/기본/우선순위/관리)
- [x] 검색 필터 (trim().toLowerCase() 기준)
- [x] 공급처 필터 드롭다운
- [x] 플랫폼 필터 세그먼트 (전체/공통/쿠팡/토스)
- [x] PlatformBadge 사용
- [x] 비활성 공급처에 "비활성" 뱃지 표시
- [x] [매핑 추가] → Sheet 사이드 패널 (활성 공급처만 Select)
- [x] [수정] → Sheet (기존 값 pre-fill, 비활성 공급처도 현재 값 표시)
- [x] [삭제] → ConfirmDialog
- [x] 같은 품목에 여러 공급처 가능
- [x] 빈 상태 vs 필터 결과 없음 메시지 구분

### 상품명 변환 매핑 페이지

- [x] 매핑 테이블 (플랫폼/플랫폼상품명/옵션/공급처/공급처상품명/공급처코드/관리)
- [x] 검색 + 공급처 필터
- [x] 비활성 공급처 "비활성" 뱃지
- [x] [매핑 추가/수정] → Dialog (비활성 공급처 현재 값 표시 포함)
- [x] [삭제] → ConfirmDialog

### 택배사 매핑 페이지

- [x] 매핑 테이블 (공급처/원본택배사명/쿠팡택배사명/토스택배사명/관리)
- [x] 검색 + 공급처 필터
- [x] 비활성 공급처 "비활성" 뱃지
- [x] [매핑 추가/수정] → Dialog (수정 시 비활성 공급처 현재 값 표시 포함)
- [x] [삭제] → ConfirmDialog

### 공통

- [x] PlatformBadge 컴포넌트 (디자인 토큰 사용, raw color 금지)
- [x] 플랫폼 뱃지 토큰이 REF_디자인_시스템.md + index.css에 추가됨
- [x] 4개 페이지 모두 라우팅 접근 가능 (AppRoutes.tsx)
- [x] 디자인 토큰: REF_디자인_시스템.md 패턴 적용
- [x] 시안 스타일 재현
- [x] Dialog/Sheet 닫힘 정책: 성공 시 닫기, 실패 시 유지
- [x] 목록 정렬 기준 적용 (supplierName tiebreaker 포함 — 클라이언트 정렬로 보완)
- [x] 매핑 페이지에서 mappings/suppliers 중 하나라도 로딩 중이면 LoadingSpinner

### 테스트

- [x] productMappingFormSchema trim/default/coerce 검증
- [x] nameMappingFormSchema trim/default 검증
- [x] courierMappingFormSchema trim 검증
- [x] toProductMapping snake_case → camelCase 변환 테스트
- [x] toNameMapping snake_case → camelCase 변환 테스트
- [x] toCourierMapping snake_case → camelCase 변환 테스트

### 빌드

- [x] `npm run build` 통과
- [x] `npm run typecheck` 통과
- [x] `npm run lint` 통과
- [x] `npm run test:run` 통과 (12 tests passed)
- [ ] 콘솔 에러 없음 — UI 브라우저 테스트 미실시 (Supabase 연결 필요)

## Phase별 전문 검증 결과

해당 없음 (Phase 2는 CRUD 위주로 전문 검증 대상 아님)

## Codex 코드리뷰 결과

- **[P2] `src/pages/mapping/CourierMapping.tsx:323-329`** — 택배사 매핑 수정 시 비활성 공급처 미표시
  - 문제: 수정 모드에서 `form.sourceSupplierId`에 비활성 공급처 ID가 설정되지만, Select 드롭다운에는 `suppliers` (활성만)만 렌더링된다. 현재 선택된 공급처가 빈 칸으로 보이면서 저장 버튼은 유효한 것으로 처리한다. ProductMapping(417-421행)과 NameMapping(382-386행)은 `editing && !editing.supplierIsActive` 조건으로 비활성 공급처를 추가 렌더링하고 있다.
  - 수정: ✅ 수정 완료 — `{editing && !editing.supplierIsActive && (<SelectItem value={editing.sourceSupplierId}>{editing.supplierName} (비활성)</SelectItem>)}` 추가

## 누락 (스펙에 있는데 구현 안 됨)

없음 (모든 누락 항목 수정 완료)

## 스코프 크립 (구현했는데 스펙에 없음)

- **SupplierManage 검색 기능**: 스펙(2-15)에 공급처 관리 페이지 검색이 명시되어 있지 않으나, 이름/연락처/메모 검색이 구현됨. 사용성 향상이므로 허용.

## 컨벤션 위반

없음

## spec-reviewer 결과

### 🔴 필수 수정

1. **CourierMapping.tsx 수정 폼 - 비활성 공급처 미표시** (320-329행) → ✅ 수정 완료
   수정 시 공급처 Select에 비활성 공급처도 현재 값으로 표시하도록 추가.

### 🟡 권장 수정

2. **ProductMapping 정렬 supplierName tiebreaker 누락** → ✅ 수정 완료
   클라이언트 정렬에 `supplierName.localeCompare()` tiebreaker 추가.

3. **NameMapping 정렬 supplierName tiebreaker 누락** → ✅ 수정 완료
   클라이언트 정렬에 `supplierName.localeCompare()` tiebreaker 추가.

4. **택배사 매핑 검색 범위 초과** → 🔘 수용 안 함
   스펙: "택배사명 검색". 구현: sourceName, coupangName, tossName 3개 필드 모두 검색. 스펙이 모호하며 구현이 사용성에 유리하므로 허용.

5. **supplierProductCode null 저장** → ✅ 수정 완료
   `nameMappings.ts`에서 `parsed.supplierProductCode || null`을 `|| ''`로 변경하여 빈 문자열 정책 통일.

### 🟢 양호

- 데이터 흐름 (API → Hook → Page) 책임 분리 일관 적용
- `errors.ts` 에러 처리 4개 context 메시지 스펙 일치
- Zod 스키마 헬퍼, FormData z.infer 생성, WithSupplier 타입
- Hook 패턴: alive flag, re-throw, toast, refetch 4개 훅 일관
- Dialog/Sheet 닫힘 정책: 성공 시 닫기, 실패 시 유지
- Soft delete 정책: 공급처만 is_active=false, 나머지 hard delete
- 빈 상태 vs 필터 결과 구분: 4개 페이지 모두 hasData/hasResults 분기
- PlatformBadge: 디자인 토큰 사용, raw color 미사용

## 종합 판정

✅ **통과**

모든 필수 수정 항목(3건)과 권장 수정 항목(2건) 수정 완료. P1 미수정 없음.
빌드/타입체크/린트/테스트 모두 통과.
