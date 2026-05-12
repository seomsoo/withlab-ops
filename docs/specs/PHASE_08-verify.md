# Phase 8 검증 결과

검증일시: 2026-05-12

## 완료 확인 기준 결과

### 빌드/테스트

- [x] `npm run build` 성공 (2,402 kB bundle, chunk size warning만 존재)
- [x] `npm run typecheck` 에러 0건
- [x] `npm run lint` 에러 0건
- [x] `npm run test:run` 전체 통과 (198 tests, 15 files)

### 기능 검증

- [x] 배정 페이지: SupplierPickerPopover로 공급처별 가격/재고 비교 확인
- [x] 배정 페이지: 스마트배정 뱃지 Tooltip으로 이유 확인 (TooltipProvider + allocationReason)
- [x] 배정 페이지: 그룹 확장 시 후보 비교 카드 표시 확인 (candidateMap)
- [x] 매핑관리: MappingLayout 서브 네비로 페이지 전환 + 카운트 (getMappingStats 단일 API)
- [x] 매핑관리: OnboardingChecklist 5단계 진행률 표시
- [x] 과일 사전: FruitDictionary.tsx CRUD UI + soft delete (is_active=false)
- [x] 속성 추출: attributeExtractor + normalizer 구현 + 테스트 통과
- [x] 속성 추출: fruit null (ambiguous) 시 자동 적용 안 함
- [x] 자동배정: strict exact → normalized exact → attribute match 순서 보장
- [x] 자동배정: score 0.5~0.8 제안은 DB allocations에 저장 안 함 (UI state — setSuggested)
- [x] 자동배정: fruit 불일치 → score 0, fruit null → 자동 적용 안 함
- [x] 운송장: 벌크 건너뛰기 → ignored=true 저장 (bulkIgnoreTrackings)
- [x] 업로드: 통합 드롭존 prepareUploadAutoDetect 구현
- [x] 업로드: 파싱 결과 품목수 표시 (`총 100건 · 12개 품목`)
- [x] 다운로드: 전체 다운로드 순차 방식 + 비용 요약 (totalCost, unknownCount 별도 표시)
- [x] 운송장: 공급처 필터 추가 (supplierFilter)
- [x] 운송장: 전체 다운로드 (순차)
- [x] 운송장: 세션 정보 보강 (orderCount, supplierCount, matchedCount)
- [x] 운송장: 공급처별 진행 표시 (supplierProgress 배지 스트립)
- [x] 글로벌: TopBar 브레드크럼 구현 (buildBreadcrumbs + ChevronRight)
- [x] 글로벌: PageSkeleton + CardGridSkeleton 컴포넌트로 스켈레톤 교체

### 하위호환

- [x] 기존 autoAllocator 테스트 전부 통과 (fruitDictionary 미전달 시 기존 로직만 작동)
- [x] strict exact match가 normalized/attribute match보다 항상 먼저 실행
- [x] 과일 사전이 비어있어도 기존 exact match 동작에 영향 없음
- [x] MappingLayout 적용 후 기존 매핑 페이지 URL 유지 (`/mapping/suppliers` 등)

---

## Phase별 전문 검증 결과

해당 없음 (Phase 8은 Phase 0~6 자동 호출 테이블에 포함되지 않음. 매칭 엔진 테스트는 npm test:run에서 198개 전체 통과로 확인.)

---

## Codex 코드리뷰 결과

- **[P1] src/lib/supabase/orders.ts:61** — `display_product_name` 마이그레이션 누락
  - 문제: 코드에서 `display_product_name` 컬럼에 읽기/쓰기를 하지만, `supabase/migrations/`에 해당 컬럼을 추가하는 ALTER TABLE 마이그레이션이 존재하지 않았음. 배포 시 orders 테이블에 컬럼이 없어 주문 업로드가 실패.
  - 수정: ✅ 수정 완료 — `20260512_phase8_orders_display_product_name.sql` 마이그레이션 추가

- **[P2] src/pages/orders/SupplierAllocation.tsx:313** — suggested 그룹 공급처 변경 시 allocation 미생성
  - 문제: `handleSupplierChange`에서 `group.status === 'unmapped'`만 검사하여 `assignUnmatched`를 호출함. `suggested` 상태의 그룹도 DB에 allocation이 없지만, else 분기로 빠져 `updateGroupSupplier`를 호출하여 0건을 업데이트함. UI는 성공을 표시하지만 실제 DB에는 배정 미생성.
  - 수정: ✅ 수정 완료 — 조건을 `group.status === 'unmapped' || group.status === 'suggested'`로 변경

- **[P2] src/lib/matching/attributeMatcher.ts:31-40** — 품절 상품이 속성 후보에 포함됨
  - 문제: `findCandidatesByAttributes`에서 `supplier?.isActive`만 검사하고 `stockStatus === 'soldout'`인 상품을 필터링하지 않음. autoAllocator의 `selectBestSupplier`는 품절 필터링을 하지만, 속성 매칭 3단계에서는 품절 상품이 최고 점수 후보가 되어 자동 적용될 수 있었음.
  - 수정: ✅ 수정 완료 — `if (sp.stockStatus === 'soldout') continue` 조건 추가

---

## 누락 (스펙에 있는데 구현 안 됨)

없음 — 모든 항목 수정 완료

---

## 스코프 크립 (구현했는데 스펙에 없음)

없음

---

## 컨벤션 위반

없음 — ESLint `no-control-regex` 위반은 `eslint-disable-next-line` 주석으로 해결 (의도적 XML 새니타이징)

---

## spec-reviewer 결과

### 🔴 필수 수정 (2건 → 모두 수정 완료)

1. **handleSupplierChange가 suggested 상태를 처리하지 않음** — ✅ 수정 완료. `suggested`를 `unmapped`과 동일하게 `assignUnmatched` 호출.

2. **display_product_name ALTER TABLE 마이그레이션 누락** — ✅ 수정 완료. `20260512_phase8_orders_display_product_name.sql` 추가.

### 🟡 권장 수정 (2건 → 1건 수정, 1건 수용)

1. **attributeMatcher 품절 상품 미필터링** — ✅ 수정 완료. `stockStatus === 'soldout'` 필터 추가.

2. **both-null 속성 매칭 점수 부풀림** — 🔘 수용 안 함. 스펙의 "fruit/weight 필수 일치"는 `matchedAttributes`에 포함 여부로 검사하며, both-null도 "불일치가 아님"이므로 현재 로직이 스펙에 부합. 또한 자동 적용은 1위/2위 gap ≥ 0.15 조건이 추가로 있어 오탐 위험이 낮음.

### 🟢 양호 항목 (6건)

1. 3단계 fallback (strict → normalized → attribute) 정확히 구현
2. SuggestedAllocation은 DB 저장 안 함, UI state만 사용 (applySuggested에서 allocation 생성)
3. 과일 사전 DB jsonb ↔ SynonymGroup[] 변환 정확
4. displayProductName 데이터 흐름: parser → orders → allocations → purchaseOrderGenerator 정확
5. allocationReason 마이그레이션 + 코드 전 레이어 정확
6. 스코어링 가중치(0.4/0.25/0.2/0.15) + 임계값(AUTO 0.8, SUGGEST 0.5, GAP 0.15) 스펙 일치

---

## 종합 판정

✅ **통과**

- P1 1건 수정 완료 (display_product_name 마이그레이션)
- P2 2건 수정 완료 (suggested 그룹 처리, 품절 필터링)
- 린트 에러 해결 (eslint-disable)
- 누락 1건 수정 완료 (품목수 표시)
- 빌드/타입/린트/테스트 전체 통과 (198 tests)
