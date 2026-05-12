# Phase 8: UX 전면 개선 + 상품명 매칭 엔진

## 목표

시스템 전반의 사용성을 개선하고, 상품명 속성 추출 기반 매칭 엔진을 구현하여:

1. 배정 페이지에서 가격/재고/배정 이유를 한눈에 볼 수 있게 한다
2. 매핑관리 페이지들을 통합 레이아웃으로 묶고, 온보딩 가이드를 제공한다
3. 플랫폼 상품명(마케팅 문구)에서 과일종류/무게/등급을 자동 추출하여 매핑 제안한다
4. 운송장 흐름에서 공급처별 진행 상황, 벌크 액션을 추가한다
5. 업로드/다운로드 흐름을 간소화한다

> ⚠️ 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> 디자인 시안(`docs/design/`)의 패턴을 최대한 따르되, 스펙과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 7 ✅ 검증 통과

---

## 실데이터 테스트 결과 (2026-05-12)

### 테스트 파일
- 쿠팡1: `5:12 쿠팡1 리스트.xlsx` (37건)
- 쿠팡2: `5:12 쿠팡2 리스트.xlsx` (8건) — 합치기(append)로 업로드
- 토스: `5:12 토스 리스트.xlsx` (198건)
- 수동 발주서: `발주서_b업체_5:12 .xlsx` (243건)

### 검증 결과
- 243건 전체 주문번호 일치 (누락 0건)
- 품목명 외 모든 컬럼 243건 **100% 일치** (이름, 전화번호, 주소, 배송메시지, 수량)
- 쿠팡 45건: 완전 일치
- 토스 198건: 품목명만 차이 — 수동은 옵션명만, 시스템은 상품명+옵션명 (동료 요청 반영)

### 테스트 중 발견/수정 항목
1. **토스 헤더 위치 변동**: 안내문구 행 추가로 헤더가 이동 → 동적 감지로 수정
2. **같은 플랫폼 다중 파일**: 쿠팡 주문목록 1+2 → 합치기(append)/교체(replace) 선택 UI 추가
3. **발주서 품목명**: B업체는 플랫폼 원본 상품명 사용 → `platformProductName` 시스템 필드 추가
4. **보내는분 주소**: 수취인 주소와 동일 → `senderAddress` 시스템 필드 추가
5. **발주서 정렬**: 쿠팡 → 토스 순으로 정렬 추가
6. **미분류 배정 toast**: N건씩 개별 toast → 1회 묶음 toast로 수정

---

## 참조 문서

| 문서 | 참조 범위 |
|------|----------|
| `docs/REF_디자인_시스템.md` | 색상/타이포/스페이싱 토큰, 컴포넌트 패턴 |
| `docs/design/assign.jsx` | 배정 페이지 시안 (SupplierPicker Popover 패턴) |
| `docs/design/mapping.jsx` | 매핑관리 시안 (SubNav 패턴) |
| `src/lib/allocation/autoAllocator.ts` | 기존 배정 로직 (속성 매칭 fallback 추가 대상) |
| `src/pages/orders/SupplierAllocation.tsx` | 배정 페이지 (Popover + 비교 테이블 추가 대상) |
| `src/pages/mapping/*.tsx` | 매핑관리 4개 페이지 (MappingLayout 래핑 대상) |
| `src/pages/tracking/*.tsx` | 운송장 4개 페이지 (진행 상황 + 벌크 액션 추가 대상) |
| `docs/sample/*.xlsx` | 실제 샘플 엑셀 (속성 추출 테스트 데이터) |

---

## 핵심 설계 결정

### 1. 속성 추출 기반 매칭 (3단계 fallback)

```
주문 1건 처리:
  1단계: strict exact ProductMapping (기존 로직, 변경 없음)
      → 성공 시 종료
  2단계: normalized exact ProductMapping (정규화 후 재시도)
      → 성공 시 종료
  3단계: attribute match (과일 사전 기반 속성 추출)
      → score ≥ 0.8 + fruit/weight 필수 일치 + 1위/2위 gap ≥ 0.15: 자동 적용
      → score 0.5~0.8: "제안" (SuggestedAllocation, DB 저장 안 함)
      → score < 0.5 또는 fruit 불일치: "미분류"

핵심: strict exact match가 있으면 2,3단계는 실행되지 않음 (하위호환 보장)
```

### 1-1. SuggestedAllocation은 DB allocations에 저장하지 않음

```
AllocationResult = {
  allocated: PendingAllocation[]    → DB 저장 대상
  suggested: SuggestedAllocation[]  → UI state로만 보관
  unmatched: UnmatchedOrder[]
}

사용자가 배정 페이지에서 "추천 적용" 클릭 → 그때 allocation 생성
```

### 1-2. 스코어링 규칙

```
fruit gate: fruit가 다르면 score = 0 (필수)
fruit가 null이면 자동 적용 안 함
다중 과일 키워드 감지 시 fruit = null (ambiguous) → 자동 배정 안 함

가중치: 과일 0.4 + 무게 0.25 + 등급 0.2 + 크기 0.15
자동 적용 추가 조건: 1위/2위 후보 score 차이 ≥ 0.15
weight는 normalized string 비교 (g↔kg 환산 제외)
```

### 2. 과일 사전 DB 관리 (하드코딩 금지)

```
과일 키워드, 등급 동의어, 크기 동의어를 DB 테이블로 관리.
새 과일/채소 추가 시 코드 변경 없이 UI에서 등록.
삭제는 hard delete 아닌 is_active=false (soft delete).
extractAttributes는 is_active=true인 사전만 사용.

DB: jsonb 그대로 저장
  grade_synonyms: {"가정용": ["못난이","랜덤","렌덤","혼합","흠과"]}

도메인 타입: SynonymGroup[] (폼 편집 친화적)
  type SynonymGroup = { canonical: string; aliases: string[] }
  gradeSynonyms: [{ canonical: "가정용", aliases: ["못난이","랜덤","렌덤","혼합","흠과"] }]

DB ↔ 도메인 변환 함수를 src/lib/supabase/fruitDictionary.ts에 구현.
```

### 3. 상품명 정규화 전처리

```
매칭 전 모든 상품명에 적용:
1. 이모지 제거 — emoji-regex 라이브러리 사용 (유니코드 표준 자동 생성, ~1KB)
   + variation selector (U+FE00~FE0F) 별도 제거
   + 딩뱃/기호 문자 (☆◆★●○◎♡♥ 등) 별도 제거
2. 특수기호 제거 (~!@#$%^&*+=|<>?;:"'` 등)
3. 대괄호 [] 마케팅 문구 제거 ([타임특가], [노마진특가] 등)
4. 일반 괄호 () 안의 규격 정보는 보존 (공백 구분자로 변환)
5. 다중 공백 → 단일 공백
6. 소문자 변환
7. trim

정규화는 2단계(normalized exact match)에서 사용.
strict exact match를 대체하지 않고, strict 실패 후에만 시도.
```

### 4. 발주서 품목명 — 공급처별 선택 가능

```
SystemField에 platformProductName 추가:
  - 쿠팡: 노출상품명(옵션명) [col 12] — 상품명+옵션명이 합쳐진 값
  - 토스: 상품명 + 옵션명을 공백으로 합침

파서에서 displayProductName 필드로 저장:
  - 쿠팡 파서: COL.displayProductName = 12
  - 토스 파서: [productName, optionName].filter(Boolean).join(' ')

양식 설정에서 공급처별로 선택:
  - B업체: platformProductName (플랫폼 원본)
  - A업체: supplierProductName (공급처 카탈로그)

필수 검증: supplierProductName OR platformProductName 둘 중 하나 필수
```

### 5. 발주서 정렬

```
같은 공급처 내에서 쿠팡 주문 → 토스 주문 순으로 정렬.
수동 작업 순서와 동일하게 유지.
```

### 7. 토스 파서 동적 헤더 감지

```
토스가 안내문구 행을 추가하여 헤더 위치가 변동됨.
고정 인덱스(DATA_START_INDEX=3) → 동적 감지로 변경:
  - findHeaderRowIndex(): 0~9행 스캔, 주문일시/주문번호/주문상품번호 마커 2개 이상 매칭
  - 데이터 시작 = headerIdx + 2 (헤더 다음 행은 수정가능여부)
  - platformDetector도 동일하게 1~4행 스캔으로 변경
```

### 9. 작업건 삭제 + 발주 되돌리기 + 공급처별 배정 삭제

```
1. 작업건 삭제: WorkSessionSelector에서 작업건 자체를 삭제
   - DB cascade로 orders, allocations, trackings 전부 삭제
   - 확인 다이얼로그 필수 (되돌릴 수 없음 경고)

2. 발주 되돌리기: ordered → active/pending
   - revert_order_session RPC (complete_order_session의 역함수)
   - allocations.status: ordered → pending, ordered_at: null
   - work_sessions.status: ordered → active, completed_at: null
   - 배정 데이터는 유지 (재다운로드/수정 가능)

3. 공급처별 배정 삭제: 특정 공급처의 allocations만 삭제
   - 해당 주문들이 미분류 상태로 복귀
   - 발주 완료 전(active 상태)에만 가능
```

### 8. ChangeSupplierDialog → Popover 통합

```
기존: 공급처 변경 시 별도 Dialog (ChangeSupplierDialog)
개선: SupplierPickerPopover 내부 Stage 2로 흡수

Stage 1: 공급처 리스트 (가격/재고 비교)
Stage 2: 범위 선택 ("오늘만 적용" / "기본 매핑도 변경")

ChangeSupplierDialog 컴포넌트는 삭제.
```

---

## 작업 목록

### 8-A. 배정 페이지 개선

#### 8-A-1. 공급처 비교 Popover

- [ ] `src/pages/orders/SupplierAllocation.tsx` — GroupRow 내 `<Select>` (line 648)를 `<Popover>` 기반 `SupplierPickerPopover`로 교체
  - 트리거 버튼: `w-[280px]`, 현재 공급처명 + 가격 + 재고뱃지
  - PopoverContent `w-[400px]`: 검색 Input + 공급처 리스트 (이름/가격/재고/최저가뱃지/기본뱃지)
  - 미분류 시 추천 배너: 속성 매칭 제안 표시
  - 클릭 시 Stage 2: "오늘만 적용" / "기본 매핑도 변경" 인라인 선택
- [ ] 기존 `ChangeSupplierDialog` (line 759-794) 삭제
- [ ] 데이터: `supplierProducts` (`useAllocation`에서 `allSp`로 이미 로드됨)

#### 8-A-2. 스마트배정 이유 Tooltip

- [ ] `src/lib/allocation/autoAllocator.ts` — `PendingAllocation`에 `allocationReason?: string` 추가
  - `selectBestSupplier` (line 183-247)에서 이유 설정:
    - `"기본 공급처 (재고 있음)"`
    - `"최저가 ₩{price} (후보 {n}곳 중)"`
    - `"유일한 공급처"`
    - `"기본 공급처({name}) 품절 → 차선 최저가"`
    - `"속성 매칭 (참외/가정용/5kg)"`
- [ ] `src/pages/orders/SupplierAllocation.tsx` — "스마트배정" 뱃지 (line 638-642)를 `<Tooltip>` 래핑
- [ ] DB: `allocations` 테이블에 `allocation_reason text` 컬럼 추가 (nullable, 마이그레이션)

#### 8-A-3. 확장 영역 후보 비교 테이블

- [ ] `src/pages/orders/SupplierAllocation.tsx` — GroupRow 확장 영역 (line 698-730)에 "공급처 비교" 섹션 추가
  - 주문 라인 테이블 위에 후보 카드 나열: 공급처명 / 가격 / 재고뱃지 / 선택됨 표시
  - `supplierProducts.filter(sp => sp.productName matches group)`로 후보 구성

#### 8-A-4. 요약 대시보드 강화

- [ ] `src/pages/orders/SupplierAllocation.tsx` — 4칸 → 5칸 그리드
  - 기존: 총 품목 / 자동배정 / 미분류 / 수정됨
  - 추가: 예상 발주금액 (supplierPrice 있는 건만 합산, null인 건은 "가격 미확인 N건" 별도 표시)

---

### 8-B. 매핑관리 페이지 개선

#### 8-B-1. MappingLayout 서브 네비게이션

- [ ] **새 파일** `src/components/layout/MappingLayout.tsx` — 서브 네비(220px) + Outlet
  - 네비 항목: 공급처 관리 / 품목 매핑 / 상품명 변환 / 택배사 매핑 / 과일 사전 (각각 카운트 표시)
  - 하단 팁: "매핑이 정확할수록 자동배정 정확도가 올라갑니다"
- [ ] `src/AppRoutes.tsx` — `/mapping` 하위를 MappingLayout으로 래핑
  ```
  <Route path="/mapping" element={<MappingLayout />}>
    <Route index element={<Navigate to="suppliers" />} />
    <Route path="suppliers" element={<SupplierManage />} />
    <Route path="suppliers/:id" element={<SupplierDetail />} />
    <Route path="products" element={<ProductMapping />} />
    <Route path="names" element={<NameMapping />} />
    <Route path="couriers" element={<CourierMapping />} />
    <Route path="dictionary" element={<FruitDictionary />} />
  </Route>
  ```
- [ ] `src/components/layout/Sidebar.tsx` — "설정" 섹션의 매핑 4개 항목을 "매핑관리" 하나로 통합 (`/mapping`)

#### 8-B-2. 매핑 온보딩 가이드

- [ ] `src/components/layout/MappingLayout.tsx` — 서브 네비에 설정 진행 체크리스트
  - Step 1: 공급처 등록 (`suppliers.length > 0`)
  - Step 2: 양식 등록 (`templates.length / activeSuppliers.length`)
  - Step 3: 카탈로그 업로드 (`supplierProducts` 존재 여부)
  - Step 4: 품목 매핑 등록 (`productMappings.length > 0`)
  - Step 5: 과일 사전 등록 (`fruitDictionary.length > 0`)

#### 8-B-3. 매핑 상태 대시보드

- [ ] **새 함수** `src/lib/supabase/mappingStats.ts` — `getMappingStats()` 단일 API로 전체 카운트 조회 (N+1 방지)
- [ ] `src/components/layout/MappingLayout.tsx` — 서브 네비 상단에 요약 카드 (getMappingStats 사용)
  - 공급처 N곳 / 양식 N% / 카탈로그 N개 / 품목 매핑 N건 / 상품명 변환 N건

#### 8-B-4. 품목 매핑 일괄 등록

- [ ] `src/pages/mapping/ProductMapping.tsx` — "미매핑 품목 감지" 버튼 추가
  - 최근 주문에서 매핑 안 된 상품명/옵션 목록 조회
  - 결과 테이블: 상품명 | 옵션 | 플랫폼 | 공급처 Select → 일괄 저장
- [ ] `src/lib/supabase/productMappings.ts` — `createProductMappingsBulk()` 함수 추가

#### 8-B-5. 배정 페이지에서 인라인 매핑 등록

- [ ] `src/pages/orders/SupplierAllocation.tsx` — 미분류 품목의 Popover에 "매핑 등록" 옵션 추가
  - Sheet 오픈 → 상품명/옵션 자동 채움 → 공급처 선택 → 품목 매핑 + 상품명 변환 동시 등록
  - `useProductMappings.create()` + `useNameMappings.create()` 재사용

#### 8-B-6. 공급처 테이블 정보 보강

- [ ] `src/pages/mapping/SupplierManage.tsx` — 테이블 컬럼 추가
  - 매핑 수: 해당 공급처에 연결된 품목 매핑 건수
  - 최근 발주: 마지막 발주서 생성일
  - 평균 단가: 등록된 상품 평균 가격

---

### 8-C. 상품명 매칭 엔진

#### 8-C-1. 과일 사전 DB 테이블

- [ ] Supabase 마이그레이션: `fruit_dictionary` 테이블 생성
  ```sql
  create table fruit_dictionary (
    id uuid primary key default gen_random_uuid(),
    category text not null unique,
    keywords text[] not null,
    grade_synonyms jsonb not null default '{}',
    size_synonyms jsonb not null default '{}',
    weight_aliases jsonb not null default '{"kg": ["키로","KG","킬로"]}',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  -- RLS
  alter table fruit_dictionary enable row level security;
  create policy "Authenticated can read" on fruit_dictionary for select to authenticated using (true);
  create policy "Authenticated can write" on fruit_dictionary for all to authenticated using (true);
  ```
- [ ] **새 파일** `src/types/fruitDictionary.ts` — 타입 정의
- [ ] **새 파일** `src/lib/schemas/fruitDictionary.ts` — Zod 스키마
- [ ] **새 파일** `src/lib/supabase/fruitDictionary.ts` — CRUD API (getAll, create, update, delete)
- [ ] **새 파일** `src/hooks/useFruitDictionary.ts` — 훅

#### 8-C-2. 상품명 정규화 함수

- [ ] **새 파일** `src/lib/matching/normalizer.ts`
  - `normalizeProductName(name: string): string` — emoji-regex + 딩뱃/특수기호/대괄호/공백/대소문자 정규화
  - `normalizeWeight(text: string, aliases: Record<string, string[]>): string | null` — "5키로" → "5kg"
- [ ] **새 파일** `src/lib/matching/__tests__/normalizer.test.ts` — 테스트
  - `"⭐️가정용 성주참외 랜덤과 5kg(9-36과 내외)"` → `"가정용 성주참외 랜덤과 5kg 9-36과 내외"`
  - `"[타임특가] 고당도 제주 한라봉"` → `"고당도 제주 한라봉"`
  - `"참외 소과 5키로"` → weight: `"5kg"`

#### 8-C-3. 속성 추출 파서

- [ ] **새 파일** `src/lib/matching/attributeExtractor.ts`
  ```ts
  type ProductAttributes = {
    fruit: string | null     // '참외'
    weight: string | null    // '5kg'
    grade: string | null     // '가정용'
    size: string | null      // '소과'
    raw: string              // 정규화된 원본
  }
  
  export function extractAttributes(
    name: string,
    option: string,
    dictionary: FruitDictionary[]
  ): ProductAttributes
  ```
  - 정규화 적용 후 사전에서 키워드 매칭 → 과일 판별
  - 무게 정규식: `/(\d+(?:\.\d+)?)\s*(?:kg|키로|KG|킬로)/i` (aliases 적용)
  - 등급: `grade_synonyms`에서 역방향 매칭
  - 크기: `size_synonyms`에서 역방향 매칭
- [ ] **새 파일** `src/lib/matching/__tests__/attributeExtractor.test.ts`
  - 쿠팡: `"산지직송 성주 꿀참외 고당도 가정용"` + `"1박스 특가혼합과 5kg"` → `{fruit:"참외", weight:"5kg", grade:"가정용"}`
  - 토스: `"성주 꿀참외, 가정용 참외"` + `"1박스, 5kg"` → `{fruit:"참외", weight:"5kg", grade:"가정용"}`
  - A업체: `"⭐️가정용 성주참외 랜덤과 5kg(9-36과 내외)"` → `{fruit:"참외", weight:"5kg", grade:"가정용"}`
  - B업체: `"참외 소과 5키로"` → `{fruit:"참외", weight:"5kg", size:"소과"}`
  - 사과: `"껍질채먹는 간편한 세척사과"` + `"1개 5kg(24-28과 내외)"` → `{fruit:"사과", weight:"5kg"}`
  - 한라봉: `"[타임특가] 고당도 제주 한라봉"` + `"1개 10kg"` → `{fruit:"한라봉", weight:"10kg"}`

#### 8-C-4. 속성 기반 매칭 함수

- [ ] **새 파일** `src/lib/matching/attributeMatcher.ts`
  ```ts
  type MatchCandidate = {
    supplierProduct: SupplierProduct
    supplier: Supplier
    score: number             // 0~1
    matchedAttributes: string[]
  }
  
  export function findCandidatesByAttributes(
    platformAttrs: ProductAttributes,
    supplierProducts: SupplierProduct[],
    suppliers: Supplier[],
    dictionary: FruitDictionary[]
  ): MatchCandidate[]
  ```
  - fruit gate: fruit 불일치 → score 0 (필수)
  - fruit null 또는 ambiguous → 자동 적용 안 함
  - 가중치: 과일 0.4 + 무게 0.25 + 등급 0.2 + 크기 0.15
  - 자동 적용 추가 조건: 1위/2위 score 차이 ≥ 0.15
  - 결과는 score DESC 정렬
- [ ] **새 파일** `src/lib/matching/__tests__/attributeMatcher.test.ts`

#### 8-C-5. autoAllocator 통합

- [ ] `src/lib/allocation/autoAllocator.ts` — 3단계 fallback 구현
  - `AutoAllocationInput`에 `fruitDictionary?: FruitDictionary[]` 추가
  - `AllocationResult`에 `suggested: SuggestedAllocation[]` 추가
  - 매칭 순서: strict exact → normalized exact → attribute match
  - score ≥ 0.8 + fruit/weight 필수 + 1/2위 gap ≥ 0.15: `allocated` (allocationReason 포함)
  - score 0.5~0.8: `suggested` 배열에 추가 (DB 저장 안 함, UI state로만)
  - score < 0.5: `unmatched`
  - `fruitDictionary` 미전달 시 속성 매칭 비활성 (하위호환)
- [ ] `src/hooks/useAllocation.ts` — `runAutoAllocation`에서 fruitDictionary fetch + suggested 상태 관리
- [ ] 배정 페이지에서 사용자가 "추천 적용" → 그때 allocation 생성
- [ ] 기존 autoAllocator 테스트 (29개) 전부 통과 확인

#### 8-C-6. 과일 사전 관리 UI

- [ ] **새 파일** `src/pages/mapping/FruitDictionary.tsx`
  - 사전 목록: 카테고리명 / 키워드 / 등급 동의어 / 크기 동의어 / 수정·삭제
  - 추가/수정: Sheet 또는 Dialog — 카테고리명 + 키워드 입력 + 동의어 그룹 편집
  - 초기 데이터: 참외/사과/한라봉/카라향/천혜향 기본 등록 가이드

#### 8-C-7. normalized exact match (2단계)

- [ ] `src/lib/allocation/autoAllocator.ts` — strict exact match 실패 후 별도 단계로 normalized match
  - **strict exact match를 대체하지 않음** — strict 실패 후에만 시도
  - 새 함수 `findProductMappingCandidatesNormalized()` 또는 기존 함수 내부 2차 시도
  - `normalizeProductName(m.productName) === normalizeProductName(productName)`
  - normalized match에서 여러 후보 시 isDefault/priority 기존 규칙 적용
  - 성공 시 속성 추출(3단계)까지 갈 필요 없음

---

### 8-D. 업로드 흐름 간소화

#### 8-D-0. 같은 플랫폼 다중 파일 합치기 ✅ 구현 완료 (2026-05-12)

- [x] `src/hooks/useOrderUpload.ts` — `commitUpload`에 `appendExisting` 옵션 추가
  - 기존 주문과 matchingKey 기준 중복 제거 후 합침
  - toast: `${label} 주문 ${newCount}건 추가 (총 ${totalCount}건)`
- [x] `src/pages/orders/OrderUpload.tsx` — 교체/합치기 선택 Dialog
  - "합치기" (파란색, Plus 아이콘) / "교체하기" (회색, Replace 아이콘)
  - 기존 N건 + 새 파일 N건 표시

#### 8-D-1. 통합 드롭존

- [ ] `src/pages/orders/OrderUpload.tsx` — 쿠팡/토스 별도 카드 2개 → 통합 드롭존
  - 파일 1~2개 드래그 → `detectPlatform()` 자동 감지 (이미 존재)
  - 감지 성공: 플랫폼 뱃지 + 건수 표시
  - 감지 실패: 저장하지 않고 수동 선택 폴백
  - **platform별 최대 1개 파일만 허용** — 같은 platform 파일 2개 시 사용자 선택 요구
  - 기존 업로드 교체 확인은 플랫폼별로 처리 (Phase 3 expectedPlatform 안전장치 유지)
- [ ] `src/hooks/useOrderUpload.ts` — `prepareUploadAutoDetect(file: File)` 메서드 추가

#### 8-D-2. 파싱 결과 요약 개선

- [ ] `src/pages/orders/OrderUpload.tsx` — 플랫폼별 + 상품별 요약
  - `"쿠팡 62건 + 토스 38건 = 총 100건 · 12개 품목"`

---

### 8-E. 다운로드 흐름 개선

#### 8-E-1. "전체 다운로드" + 비용 요약

- [ ] `src/pages/orders/OrderDownload.tsx`
  - 상단 요약 카드: 공급처 N곳 / 총 N건 / 예상 ₩금액
  - 하단 sticky footer: "전체 다운로드" 버튼 (primary) + "발주 완료"

#### 8-E-2. 공급처 카드에 비용/수량 표시

- [ ] `src/pages/orders/OrderDownload.tsx` — 각 카드에 품목 수 / 주문 건수 / 예상 비용 / 다운로드 상태
  - 데이터: `allocations`의 `supplierPrice * quantity` 합산

---

### 8-F. 운송장 흐름 개선

#### 8-F-1. 공급처별 진행 상황 표시

- [ ] `src/pages/tracking/TrackingUpload.tsx` — 기존 업로드 완료 strip 강화
- [ ] `src/pages/tracking/TrackingMatchResult.tsx` — 상단 또는 사이드에 공급처 진행 사이드바
  - `✅ A농장 45건 · 43매칭` / `✅ B농장 30건 · 30매칭` / `⬜ C농장 미업로드`
- [ ] `src/pages/tracking/TrackingDownload.tsx` — 동일한 진행 사이드바

#### 8-F-2. 매칭 결과에 공급처 필터

- [ ] `src/pages/tracking/TrackingMatchResult.tsx`
  - 필터 탭에 공급처별 필터 추가
  - 수동 매칭 모달에 공급처 드롭다운 필터
  - 미매칭 행에 "어떤 공급처에서 온 운송장인지" 표시

#### 8-F-3. 벌크 액션

- [ ] DB: `trackings` 테이블에 `ignored boolean default false` + `ignored_reason text` 컬럼 추가
- [ ] `src/pages/tracking/TrackingMatchResult.tsx`
  - "무효 건 전체 건너뛰기" → `ignored=true, ignored_reason='무효 건 일괄 건너뛰기'`
  - "중복 건 자동 처리" → 같은 allocationId의 duplicated 중 tracking_import.created_at 최신 1건 → matched, 나머지 → ignored
  - 체크박스 선택 → 일괄 처리

#### 8-F-4. 전체 다운로드 + 프리뷰

- [ ] `src/pages/tracking/TrackingDownload.tsx`
  - "전체 다운로드" = **순차 다운로드** (쿠팡 파일 → 토스 파일, ZIP 아님)
  - 다운로드 전 운송장 데이터 미리보기 테이블

#### 8-F-5. 세션 선택 화면 정보 보강

- [ ] `src/pages/tracking/TrackingSessionSelector.tsx`
  - 각 세션에 주문 수, 공급처 수, 운송장 진행률 표시

---

### 8-G. 글로벌 UX

#### 8-G-1. TopBar 브레드크럼

- [ ] `src/components/layout/TopBar.tsx` — 경로 기반 브레드크럼
  - 예: `발주서 > 2026-05-11 오전 발주 > 공급처 배정`

#### 8-G-2. 스켈레톤 로딩

- [ ] 주요 페이지의 `<LoadingSpinner />` → 스켈레톤 UI로 교체
  - SupplierAllocation, OrderUpload, OrderDownload, TrackingMatchResult 등

---

## 완료 기준

### 빌드/테스트
- [ ] `npm run build` 성공
- [ ] `npm run typecheck` 에러 0건
- [ ] `npm run lint` 에러 0건
- [ ] `npm run test:run` 전체 통과 (기존 159개 + 매칭 엔진 신규 테스트)

### 기능 검증
- [ ] 배정 페이지: Popover에서 공급처별 가격/재고 비교 확인
- [ ] 배정 페이지: 스마트배정 뱃지 Tooltip으로 이유 확인
- [ ] 배정 페이지: 그룹 확장 시 후보 비교 카드 표시 확인
- [ ] 매핑관리: 서브 네비로 페이지 전환 + 카운트 정확성 (getMappingStats 단일 API)
- [ ] 매핑관리: 온보딩 체크리스트 진행률 정확성
- [ ] 과일 사전: CRUD 동작 + soft delete (is_active=false)
- [ ] 속성 추출: 실제 샘플 엑셀 상품명 파싱 → 예상 속성 일치
- [ ] 속성 추출: 다중 과일 키워드 감지 시 ambiguous 처리 → 자동 배정 안 함
- [ ] 자동배정: strict exact → normalized exact → attribute match 순서 보장
- [ ] 자동배정: score 0.5~0.8 제안은 DB allocations에 저장 안 함 (UI state만)
- [ ] 자동배정: fruit 불일치 → score 0, fruit null → 자동 적용 안 함
- [ ] 운송장: 벌크 건너뛰기 → ignored=true 저장
- [ ] 업로드: 통합 드롭존에서 platform별 1개 파일 제한 + 감지 실패 시 저장 안 함
- [ ] 다운로드: 전체 다운로드 = 순차 (ZIP 아님) + 비용 요약 (null 건 별도 표시)

### 하위호환
- [ ] 기존 autoAllocator 테스트 (29개) 전부 통과 (supplierProducts 없이 호출)
- [ ] strict exact match가 normalized/attribute match보다 항상 먼저 실행
- [ ] 과일 사전이 비어있어도 기존 exact match 동작에 영향 없음
- [ ] MappingLayout 적용 후 기존 매핑 페이지 URL 유지 (`/mapping/suppliers` 등)

---

## 구현 순서

> 8-A를 먼저 구현한다. allocationReason, Popover, 비교 테이블은 기존 데이터만으로 동작.
> "속성 매칭" 이유 타입만 8-C 완료 후 추가.

| 순서 | Phase | 핵심 항목 | 예상 시간 |
|------|-------|----------|----------|
| 1 | 8-A | 배정 Popover + 이유 Tooltip + 비교 테이블 + 대시보드 | 4h |
| 2 | 8-C | 매칭 엔진: 사전 DB + 정규화 + 속성 추출 + 매칭 + allocator 통합 | 5h |
| 3 | 8-B | 매핑관리: MappingLayout + 온보딩 + 사전 UI + 일괄등록 + 인라인 | 5h |
| 4 | 8-F | 운송장: 진행 상황 + 공급처 필터 + 벌크 액션 + 전체 다운로드 | 4h |
| 5 | 8-D+E | 업로드 통합 드롭존 + 다운로드 비용 요약 | 2h |
| 6 | 8-G | 글로벌: 브레드크럼 + 스켈레톤 | 2h |
| | | **합계** | **~22h** |

---

## 신규 파일 목록

| 파일 | 설명 |
|------|------|
| `src/components/layout/MappingLayout.tsx` | 매핑관리 서브 네비 레이아웃 |
| `src/pages/mapping/FruitDictionary.tsx` | 과일 사전 관리 페이지 |
| `src/types/fruitDictionary.ts` | 과일 사전 타입 |
| `src/lib/schemas/fruitDictionary.ts` | 과일 사전 Zod 스키마 |
| `src/lib/supabase/fruitDictionary.ts` | 과일 사전 CRUD API (DB jsonb ↔ SynonymGroup[] 변환 포함) |
| `src/lib/supabase/mappingStats.ts` | getMappingStats() 단일 카운트 API |
| `src/hooks/useFruitDictionary.ts` | 과일 사전 훅 |
| `src/lib/matching/normalizer.ts` | 상품명 정규화 |
| `src/lib/matching/attributeExtractor.ts` | 속성 추출 파서 |
| `src/lib/matching/attributeMatcher.ts` | 속성 기반 매칭 |
| `src/lib/matching/__tests__/normalizer.test.ts` | 정규화 테스트 |
| `src/lib/matching/__tests__/attributeExtractor.test.ts` | 속성 추출 테스트 |
| `src/lib/matching/__tests__/attributeMatcher.test.ts` | 속성 매칭 테스트 |

## 수정 파일 목록 (주요)

### ✅ 이미 수정 완료 (2026-05-12 실데이터 테스트)

| 파일 | 변경 내용 |
|------|----------|
| `src/types/index.ts` | `displayProductName` (StandardOrder, PurchaseOrderItem), `platformProductName`/`senderAddress` (SystemField) |
| `src/lib/schemas/index.ts` | `displayProductName` (standardOrderSchema, OrderRow, toStandardOrder), `platformProductName`/`senderAddress` (systemFieldSchema) |
| `src/lib/parsers/coupangParser.ts` | `COL.displayProductName = 12` (노출상품명) 추가 |
| `src/lib/parsers/tossParser.ts` | 동적 헤더 감지 (`findHeaderRowIndex`), `displayProductName` = 상품명+옵션명 |
| `src/lib/parsers/platformDetector.ts` | 토스 감지 1~4행 스캔으로 변경 |
| `src/lib/generators/purchaseOrderGenerator.ts` | `platformProductName` 처리, 쿠팡→토스 정렬, `displayProductName` 전달 |
| `src/lib/supabase/orders.ts` | `display_product_name` 저장 |
| `src/lib/supabase/allocations.ts` | `display_product_name` 조회/전달 |
| `src/hooks/useOrderUpload.ts` | `appendExisting` 옵션 (합치기) |
| `src/hooks/useAllocation.ts` | `assignUnmatched` 배치 처리 (N건 1회 toast) |
| `src/pages/orders/OrderUpload.tsx` | 합치기/교체 선택 Dialog |
| `src/pages/mapping/SupplierDetail.tsx` | `platformProductName`/`senderAddress` 시스템 필드, 품목명 OR 필수 검증 |
| `src/lib/supabase/workSessions.ts` | `deleteWorkSession()` 추가 |
| `src/lib/supabase/allocations.ts` | `revertOrder()`, `deleteSupplierAllocations()` 추가 |
| `src/hooks/useWorkSessions.ts` | `removeSession()` 추가 |
| `src/hooks/usePurchaseOrder.ts` | `revertOrder()`, `deleteSupplierAllocations()` 추가 |
| `src/pages/orders/WorkSessionSelector.tsx` | 작업건 삭제 버튼 + 확인 Dialog |
| `src/pages/orders/OrderDownload.tsx` | 발주 되돌리기 버튼 + 공급처별 배정 삭제 버튼 + 확인 Dialog |
| `src/pages/Dashboard.tsx` | 바로가기 key 충돌 수정 (id 기반) |
| `src/lib/generators/trackingExportGenerator.ts` | ExcelJS → JSZip 방식으로 전면 재작성 (양식 XML 구조 보존) |
| `src/lib/generators/trackingExportGenerator.test.ts` | JSZip 방식에 맞게 테스트 수정 |

### 미수정 (예정)

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/allocation/autoAllocator.ts` | 정규화 적용 + 속성 매칭 fallback + allocationReason |
| `src/hooks/useAllocation.ts` | fruitDictionary fetch + 전달 |
| `src/pages/orders/SupplierAllocation.tsx` | Popover + Tooltip + 비교 테이블 + 대시보드 + 인라인 매핑 |
| `src/pages/orders/OrderUpload.tsx` | 통합 드롭존 + 요약 개선 |
| `src/pages/orders/OrderDownload.tsx` | 전체 다운로드 + 비용 요약 |
| `src/pages/mapping/ProductMapping.tsx` | 일괄 등록 기능 |
| `src/pages/mapping/SupplierManage.tsx` | 테이블 정보 보강 |
| `src/pages/tracking/TrackingMatchResult.tsx` | 공급처 필터 + 벌크 액션 + 진행 사이드바 |
| `src/pages/tracking/TrackingDownload.tsx` | 전체 다운로드 + 진행 사이드바 |
| `src/pages/tracking/TrackingUpload.tsx` | 진행 표시 강화 |
| `src/pages/tracking/TrackingSessionSelector.tsx` | 정보 보강 |
| `src/AppRoutes.tsx` | MappingLayout 래핑 + dictionary 라우트 |
| `src/components/layout/Sidebar.tsx` | 매핑 항목 통합 |
| `src/components/layout/TopBar.tsx` | 브레드크럼 |

## DB 마이그레이션

1. `fruit_dictionary` 테이블 생성 + RLS
2. `allocations` 테이블에 `allocation_reason text` 컬럼 추가 (nullable)
3. `trackings` 테이블에 `ignored boolean default false` + `ignored_reason text` 컬럼 추가
4. ✅ `orders` 테이블에 `display_product_name text` 컬럼 추가 (발주서 품목명용)
5. ✅ `revert_order_session` RPC 생성 (발주 되돌리기: ordered → active/pending)
