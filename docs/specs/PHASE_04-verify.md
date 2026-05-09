# Phase 4 검증 결과

검증일시: 2026-05-10
수정 후 재검증: 2026-05-10

## 빌드 / 린트 / 테스트 결과

| 항목                | 결과                           | 비고                                                     |
| ------------------- | ------------------------------ | -------------------------------------------------------- |
| `npm run build`     | ✅ 성공                        | chunk size 경고만 (2091KB > 500KB)                       |
| `npm run typecheck` | ✅ 성공                        |                                                          |
| `npm run test:run`  | ✅ 75 tests, 6 files 전체 통과 | 수정 전 73개 → 와일드카드 테스트 2개 추가                |
| `npm run lint`      | ⚠️ 1 error                     | `useOrderUpload.ts:39` — Phase 3 파일, Phase 4 범위 아님 |

## 완료 확인 기준 결과

### 파일 존재

- [x] `src/lib/allocation/autoAllocator.ts` — autoAllocate 함수 + findNameMapping export
- [x] `src/lib/allocation/autoAllocator.test.ts` — 19개 테스트 전체 통과 (와일드카드 2건 추가)
- [x] `src/lib/generators/purchaseOrderGenerator.ts` — generatePurchaseOrderExcel 함수
- [x] `src/lib/generators/purchaseOrderGenerator.test.ts` — 9개 테스트 전체 통과
- [x] `src/lib/supabase/allocations.ts` — 6개 함수 (createAllocations, getAllocations, updateGroupSupplier, replaceAllocationsForGroup, completeOrder, getUnallocatedOrders)
- [x] `src/lib/supabase/supplierTemplates.ts` — 7개 함수 (기존 6개 + removeStorageFile 추가)
- [x] `src/lib/supabase/productMappings.ts` — 기존 CRUD + switchDefaultSupplier, createAutoProductMapping 추가
- [x] `src/hooks/useAllocation.ts`, `useSupplierTemplate.ts`, `usePurchaseOrder.ts`
- [x] `src/pages/orders/SupplierAllocation.tsx`, `OrderDownload.tsx`
- [x] `src/pages/settings/SupplierTemplate.tsx`
- [x] `src/components/OrderTabs.tsx`
- [x] `src/utils/download.ts`

### DB 마이그레이션

- [x] `allocations` 테이블에 `name_mapping_applied boolean not null default false` 컬럼 추가
  - Supabase MCP로 적용 완료 + 로컬 파일: `supabase/migrations/20260510_add_name_mapping_applied_to_allocations.sql`
- [x] `complete_order_session(uuid)` RPC 함수 생성
  - Supabase MCP로 적용 완료 + 로컬 파일: `supabase/migrations/20260510_create_complete_order_session_rpc.sql`

### 자동 배정 로직

- [x] ProductMapping 검색 우선순위 (platform exact → common → isDefault → priority → createdAt)
- [x] common ProductMapping은 exact platform 없을 때만 사용
- [x] NameMapping 검색 동작 (platform 우선순위 포함)
- [x] NameMapping 없으면 원본 fallback + nameMappingApplied=false
- [x] NameMapping 있으면 변환 + nameMappingApplied=true
- [x] 비활성 공급처 매핑도 배정에 포함
- [x] Allocation에 스냅샷 저장 (supplierId, supplierProductName, supplierProductCode)
- [x] Allocation.allocatedQuantity === order.quantity
- [x] 순수 함수 (DB 호출 없음)
- [x] 빈 옵션명(optionName='') 와일드카드 매칭: exact 옵션 매핑 우선, 없으면 와일드카드 fallback
- [x] 테스트 19개 전체 통과 (기존 17 + 와일드카드 2)

### 공급처 배정 UI

- [x] 품목+옵션 그룹 아코디언
- [x] 그룹 단위 공급처 변경 (단건 아닌 그룹)
- [x] "오늘만 적용" → isTemporaryOverride=true, 매핑 변경 없음
- [x] "기본 매핑도 변경" → `switchDefaultSupplier`로 product_mappings isDefault 전환 구현
- [x] 미분류 → `createAutoProductMapping`으로 실제 platform 기준 product_mapping 자동 추가
- [x] 공급처 변경/배정/분배 시 NameMapping 재조회하여 supplierProductName 스냅샷 정확 저장
- [x] 필터 동작 (전체/자동배정/미분류/수정됨)
- [x] 주문 라인 분배 모달: 건수 기준, 합계 검증
- [x] replaceAllocationsForGroup: 각 orderId당 1개 allocation
- [x] 하단 CTA: 미분류 0건일 때만 "다음" 활성
- [x] ordered/completed → 읽기 전용

### 발주서 다운로드 UI

- [x] 매핑 누락 판단: nameMappingApplied=false 기준
- [x] buildPurchaseOrders: pending/ordered 모두 포함
- [x] 발주 완료 후 ordered 상태에서도 재다운로드 가능
- [x] downloadAll: 성공/실패 수집 후 결과 표시
- [x] 발주 완료: RPC 트랜잭션으로 처리
- [x] 미배정 주문 → 완료 차단
- [x] 양식 미등록 → 수동 발주 확인 체크 후 완료 가능

### 양식 관리

- [x] 동일 systemField 여러 컬럼 매핑 허용
- [x] 필수 필드 미매핑 시 저장 차단
- [x] 저장: 새 파일 업로드 → DB upsert → 기존 파일 삭제 (순서 보장)
- [x] 시트 변경 시 컬럼 매핑 자동 갱신 (`handleSheetChange` + `buildMappingsFromSheet`)
- [x] `.xlsx`만 허용 (`.xls` 제거)
- [x] empty systemField 매핑 저장 시 보존 (필터링 제거)

### 발주서 엑셀 생성

- [x] ExcelJS로 템플릿 로드 (새 워크북 생성 아님)
- [x] 기존 데이터 영역 clear 후 새 데이터 작성
- [x] systemField="empty" → 셀 값 null로 clear
- [x] po.items < 기존 행 → 남은 행 값 clear
- [x] po.items > 기존 행 → 행 추가 + 첫 번째 데이터 행 스타일 복사
- [x] targetColumnIndex(1-based) 매핑
- [x] 동일 systemField 여러 컬럼 매핑 지원
- [x] 전화번호 포맷 변환 (raw/hyphen/digits)
- [x] matchingKey 포함
- [x] 파일명: `{supplierName}_발주서_{YYYYMMDD}.xlsx`
- [x] 테스트 9개 전체 통과

### DB 제약 확인

- [x] allocations 테이블에 unique(order*id) 제약 (REF_DB*스키마.md 확인)
- [x] replaceAllocationsForGroup은 각 orderId당 1개 allocation

## Phase별 전문 검증 결과

### generate-test

- autoAllocator.test.ts: 19개 테스트 존재 (스펙 4-2 요구 17개 + 와일드카드 2개 추가)
- purchaseOrderGenerator.test.ts: 9개 테스트 존재, 스펙 4-6 요구사항과 일치
- 테스트 실행 결과: 28 passed / 0 failed
- 추가 생성 불필요

## Codex 코드리뷰 결과

### P1

- **[P1] src/lib/supabase/allocations.ts:46** — name_mapping_applied 컬럼 마이그레이션 누락
  - 문제: allocations 테이블에 `name_mapping_applied` 컬럼을 추가하는 ALTER TABLE 마이그레이션이 없음. 코드는 이 컬럼에 insert하므로 DB에서 missing-column 에러 발생
  - 수정: ✅ 수정 완료 — Supabase MCP로 `ALTER TABLE allocations ADD COLUMN name_mapping_applied boolean NOT NULL DEFAULT false` 적용. 로컬 파일 `supabase/migrations/20260510_add_name_mapping_applied_to_allocations.sql` 생성

- **[P1] src/lib/supabase/allocations.ts:150-152** — complete_order_session RPC 마이그레이션 누락
  - 문제: `complete_order_session` RPC 함수를 생성하는 마이그레이션이 없음. 발주 완료 시 function-not-found 에러 발생
  - 수정: ✅ 수정 완료 — Supabase MCP로 `CREATE OR REPLACE FUNCTION complete_order_session(uuid)` 적용. 로컬 파일 `supabase/migrations/20260510_create_complete_order_session_rpc.sql` 생성

### P2

- **[P2] src/lib/allocation/autoAllocator.ts:90-92** — 빈 옵션명 와일드카드 미지원
  - 문제: ProductMapping에서 `optionName === ''`인 매핑은 strict equality로만 매칭. UI(`ProductMapping.tsx:406`)에서는 "옵션을 비우면 모든 옵션에 적용됩니다"라고 안내하지만 코드는 이를 구현하지 않음
  - 수정: ✅ 수정 완료 — `findProductMapping`에서 exact 옵션 매칭 → 와일드카드(optionName='') fallback 로직 추가. 테스트 2건 추가 (17-1: 와일드카드 적용, 17-2: exact가 와일드카드보다 우선)

- **[P2] src/pages/orders/SupplierAllocation.tsx:197-203** — "기본 매핑도 변경" product_mappings 미반영
  - 문제: `mode === 'default'`일 때 allocation만 업데이트하고 product_mappings의 isDefault 전환은 수행하지 않음. 다음 자동 배정에서 원래 매핑으로 복귀
  - 수정: ✅ 수정 완료 — `useAllocation.handleUpdateGroupSupplier`에서 `isTemporaryOverride=false`일 때 `switchDefaultSupplier()` 호출. 스펙 4-11 "기본 매핑 변경 정책" 5단계 절차 구현 (`productMappings.ts`에 `switchDefaultSupplier` 함수 추가: 기존 isDefault 해제 → 새 공급처 매핑 생성/업데이트)

- **[P2] src/pages/settings/SupplierTemplate.tsx:358** — 시트 변경 시 컬럼 매핑 미갱신
  - 문제: 워크북 업로드 후 시트를 변경하면 `sheetName`만 업데이트되고 `columnMappings`는 첫 번째 시트 헤더 기준 그대로 유지. 다른 시트로 저장하면 잘못된 컬럼 매핑이 저장됨
  - 수정: ✅ 수정 완료 — workbook 상태 저장 + `handleSheetChange` 함수 추가. 시트 변경 시 `buildMappingsFromSheet`로 해당 시트 헤더를 읽어 컬럼 매핑 재생성

- **[P2] src/pages/settings/SupplierTemplate.tsx:337-340** — .xls 파일 허용하나 미지원
  - 문제: `accept=".xlsx,.xls"`로 .xls를 허용하지만, 발주서 생성기가 `workbook.xlsx.load()`로 XLSX만 처리. .xls 템플릿 저장 시 모든 다운로드 실패
  - 수정: ✅ 수정 완료 — `accept=".xlsx"`로 변경, .xls 제거

## 누락 (스펙에 있는데 구현 안 됨)

없음 — 모두 수정 완료

## 스코프 크립 (구현했는데 스펙에 없음)

없음

## 컨벤션 위반

없음 — 모두 수정 완료

- ~~`useSupplierTemplate.ts` supabase 직접 import~~ → `removeStorageFile` API 함수로 교체 완료
- ~~`SupplierTemplate.tsx` empty 매핑 필터링~~ → 필터링 제거, empty 매핑 보존 완료

## spec-reviewer 결과

### 🔴 필수 수정 (1건) → ✅ 수정 완료

- **공급처 변경/수동 배정/분배 시 NameMapping 미조회**: `SupplierAllocation.tsx`에서 공급처 변경(`handleChangeConfirm`), 미분류 배정(`assignUnmatched`), 분배(`distributeGroup`) 모두 raw platform productName을 그대로 사용. NameMapping을 조회하여 supplierProductName으로 변환해야 하지만 수행하지 않음. 결과적으로 발주서에 플랫폼 상품명이 그대로 출력됨
  - 수정: `useAllocation.ts`의 `handleUpdateGroupSupplier`, `assignUnmatched`, `distributeGroup` 모두 `findNameMapping`을 호출하여 NameMapping 재조회 후 정확한 supplierProductName/supplierProductCode 스냅샷 저장

### 🟡 권장 수정 (4건) → 3건 수정, 1건 잔여

- **empty systemField 매핑 필터링** → ✅ 수정 완료. 필터링 로직 제거, empty 매핑 보존
- **useSupplierTemplate supabase 직접 import** → ✅ 수정 완료. `removeStorageFile` API 함수 추가, 훅에서 직접 import 제거
- **getUnallocatedOrders SQL 서브쿼리** → ✅ 수정 완료. 병렬 쿼리(orders + allocations 각각 조회 후 클라이언트 필터링) 방식으로 변경
- **auto-allocation useEffect 의존성** → 🔘 수용 안 함. `running` 가드가 무한루프를 방어하고 있으며, 구조 변경 시 다른 사이드이펙트 위험이 더 큼. 실제 문제 발생 가능성이 극히 낮아 현 상태 유지

### 🟢 양호 (스펙 일치)

- autoAllocator: 우선순위 로직, NameMapping 검색, 순수 함수 구조, 와일드카드 매칭 모두 정확
- purchaseOrderGenerator: 템플릿 로드, 데이터 clear, 스타일 복사, 다중 매핑, 전화번호 포맷 모두 정확
- buildPurchaseOrders: pending/ordered 포함, supplierId 그룹핑 정확
- Types/Schemas: Allocation, PurchaseOrderItem에 nameMappingApplied 포함
- OrderDownload: 미배정 차단, 양식 미등록 체크박스, 재다운로드 지원 모두 정확
- Storage 교체 순서: 업로드 → upsert → 삭제, 보상 처리 포함
- 필수 필드 검증: 6개 필수 필드 정확
- 라우팅: 3개 서브라우트 정상 연결
- 파일명: `{supplierName}_발주서_{YYYYMMDD}.xlsx` 형식 정확
- ExcelJS 의존성 설치 확인

## 수정 이력

| 항목                       | 수정 전                           | 수정 후                                                   | 변경 파일                                                                   |
| -------------------------- | --------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| DB: name_mapping_applied   | 마이그레이션 없음                 | Supabase 적용 + 로컬 파일                                 | `supabase/migrations/20260510_add_name_mapping_applied_to_allocations.sql`  |
| DB: complete_order_session | RPC 없음                          | Supabase 적용 + 로컬 파일                                 | `supabase/migrations/20260510_create_complete_order_session_rpc.sql`        |
| NameMapping 재조회         | 수동 변경 시 raw productName 사용 | `findNameMapping` 호출하여 정확한 스냅샷                  | `src/hooks/useAllocation.ts`                                                |
| 기본 매핑 변경             | allocation만 변경                 | `switchDefaultSupplier`로 product_mappings isDefault 전환 | `src/hooks/useAllocation.ts`, `src/lib/supabase/productMappings.ts`         |
| 미분류 배정                | allocation만 생성                 | `createAutoProductMapping`으로 product_mapping 자동 추가  | `src/hooks/useAllocation.ts`, `src/lib/supabase/productMappings.ts`         |
| 옵션명 와일드카드          | strict equality만                 | exact 우선 → 와일드카드 fallback + 테스트 2건             | `src/lib/allocation/autoAllocator.ts`, `autoAllocator.test.ts`              |
| 시트 변경 매핑             | sheetName만 변경                  | `handleSheetChange`로 매핑 재생성                         | `src/pages/settings/SupplierTemplate.tsx`                                   |
| .xls 허용                  | `.xlsx,.xls`                      | `.xlsx`만                                                 | `src/pages/settings/SupplierTemplate.tsx`                                   |
| empty 매핑 필터링          | 새 양식 저장 시 제거              | 보존                                                      | `src/pages/settings/SupplierTemplate.tsx`                                   |
| getUnallocatedOrders       | SQL 서브쿼리 (항상 실패→fallback) | 병렬 쿼리                                                 | `src/lib/supabase/allocations.ts`                                           |
| supabase 직접 import       | 훅에서 직접 import                | `removeStorageFile` API 함수 경유                         | `src/hooks/useSupplierTemplate.ts`, `src/lib/supabase/supplierTemplates.ts` |

## 종합 판정

### ✅ 통과

- P1 3건 모두 수정 완료
- P2 8건 중 7건 수정, 1건 수용 안 함 (useEffect 의존성 — 실질적 영향 없음)
- `npm run build` ✅ / `npm run typecheck` ✅ / `npm run test:run` ✅ 75 tests / `npm run lint` ⚠️ (Phase 3 범위)
- 누락 항목 0건, 스코프 크립 0건, 컨벤션 위반 0건
