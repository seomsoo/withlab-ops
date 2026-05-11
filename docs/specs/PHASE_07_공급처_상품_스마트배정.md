# Phase 7: 공급처 상품 카탈로그 + 스마트 배정

## 목표

공급처별 상품 목록(가격, 재고, 택배사 등)을 엑셀 업로드로 DB에 저장하고, 이를 활용하여:

1. 상품명 변환(NameMapping) 등록 시 공급처 상품을 자동 제안
2. 주문 배정 시 재고/가격 기반으로 최적 공급처를 자동 선택

기존 Phase 0-6의 배정 로직(ProductMapping + priority)은 그대로 유지하되, 공급처 상품 데이터가 있으면 가격/재고 정보를 추가로 활용하는 **하위호환** 확장이다.

> ⚠️ 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> 구조, 필드 구성, 기능 범위는 **스펙 문서가 우선**이며 시안과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 6 ✅ 검증 통과
- Post-Launch: 공급처 관리 + 발주서 양식 통합 완료 (`/mapping/suppliers/:id` 상세 페이지 존재)

---

## 참조 문서

| 문서 | 참조 범위 |
|------|----------|
| `docs/REF_데이터_모델.md` | 기존 타입 정의 (NameMapping, ProductMapping, Allocation 등) |
| `docs/REF_DB_스키마.md` | 기존 12테이블 + 제약조건 |
| `docs/REF_엑셀_구조.md` § 9 | A업체/B업체 공급처 상품 목록 컬럼 구조 |
| `src/lib/allocation/autoAllocator.ts` | 기존 배정 로직 (변경 대상) |
| `src/pages/mapping/SupplierDetail.tsx` | 공급처 상세 페이지 (섹션 추가 대상) |
| `src/pages/mapping/NameMapping.tsx` | 상품명 변환 페이지 (자동 제안 추가 대상) |
| `src/pages/orders/SupplierAllocation.tsx` | 배정 페이지 (가격/재고 표시 추가 대상) |

---

## 핵심 설계 결정

### 1. Replace-on-Upload (교체 전략)

```
공급처 상품 목록 업로드 시:
1. 해당 공급처의 기존 supplier_products 전체 DELETE
2. 새 파일에서 파싱한 데이터를 INSERT

증분 관리(diff)하지 않음. 이유:
- 공급처마다 상품 수가 200~400개로 적음
- 가격/재고가 빈번하게 변동 → 증분 추적보다 전체 교체가 단순하고 정확
- Supabase 무료 플랜(500MB)에서 충분
```

### 2. 단순 가격 비교

```
같은 NameMapping을 가진 공급처 상품끼리만 가격 비교.
kg당 단가, 단위 환산 등 복잡한 정규화는 하지 않음.

예: NameMapping이 "한라봉 5kg" → A업체 "한라봉 중과 5kg"(15,000원)
                              → B업체 "한라봉 중과 5kg"(14,000원)
→ B업체가 더 저렴 → B업체 우선 배정

이유: NameMapping이 이미 같은 규격의 상품끼리 연결하므로 단순 비교로 충분
```

### 3. 하위호환

```
autoAllocate() 함수의 입력에 supplierProducts를 선택적(optional) 파라미터로 추가.
- supplierProducts가 없으면 → 기존 Phase 0-6 로직 그대로 동작
- supplierProducts가 있으면 → 스마트 배정 로직 활성화

기존 autoAllocator 테스트 19개는 supplierProducts 없이 호출 → 전부 통과해야 함
```

### 4. 재고 상태 정규화

```
공급처마다 재고 표현이 다름:
- "판매중", "재고있음", "O" → available
- "품절", "재고없음", "X", "0" → soldout
- 숫자 → 0이면 soldout, 1 이상이면 available
- 비어있음 / 해석 불가 → unknown

unknown은 "재고 있음"으로 간주 (보수적 접근 — 재고 없다고 확실하지 않으면 배정 허용)
```

### 5. 스마트 배정 우선순위

```
기존 배정 흐름:
  1. ProductMapping 검색 → 공급처 1곳 결정
  2. NameMapping 적용 → 상품명 변환

스마트 배정 흐름:
  1. ProductMapping 검색 → 후보 공급처 목록 (기존: 1곳만, 변경: 여러 곳)
  2. 후보별 NameMapping → 공급처 상품명 결정
  3. 후보별 SupplierProduct 조회 → 가격, 재고 확인
  4. 필터: 재고 soldout 제외 (available, unknown만)
  5. 정렬: 가격 ASC (가격 정보 없으면 뒤로)
  6. 1곳 선택

isDefault=true인 공급처가 있으면:
- 해당 공급처 재고가 available/unknown → 무조건 이 공급처 (가격 무시)
- 해당 공급처 재고가 soldout → 스마트 배정으로 fallback (나머지 중 최저가)

즉, isDefault는 "재고만 있으면 무조건 여기" 의미. 품절 시에만 대안 탐색.
```

---

## API / Hook / Page 책임 분리 원칙

Phase 4와 동일:

- **Supabase API 함수**: Supabase 호출 → snake_case ↔ camelCase 변환 → Zod 검증 → 실패 시 Error throw. **toast를 호출하지 않는다.**
- **Hook**: API 호출 → loading/error 상태 관리 → toast 표시 → 에러 re-throw
- **Page**: UI 상태 관리 → 훅 함수 호출

---

## DB 변경

### 테이블: `supplier_product_templates`

공급처 상품 목록 엑셀의 컬럼 매핑 설정. `supplier_templates`(발주서 양식)과 동일한 패턴이지만 별도 테이블.

```sql
create table supplier_product_templates (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  template_path text not null,
  template_file_name text not null,
  sheet_name text not null,
  header_row int not null default 1,
  data_start_row int not null default 2,
  column_mappings jsonb not null default '[]',
  -- 업로드 이력 (마지막 업로드 요약)
  last_uploaded_file_name text,
  last_uploaded_at timestamptz,
  last_uploaded_count integer not null default 0,
  last_invalid_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(supplier_id)
);

alter table supplier_product_templates enable row level security;
create policy "auth_all" on supplier_product_templates
  for all to authenticated using (true) with check (true);
```

`column_mappings` JSONB 구조:
```ts
type SupplierProductColumnMapping = {
  targetColumnIndex: number
  targetHeaderName: string
  systemField: SupplierProductSystemField
}
```

### 테이블: `supplier_products`

공급처별 상품 카탈로그. 업로드할 때마다 해당 공급처 전체 교체.

```sql
create table supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  product_code text not null default '',
  product_name text not null,
  option_name text not null default '',
  category text not null default '',
  price integer,                    -- 공급가 (원 단위, null=미입력)
  stock_status text not null default 'unknown'
    check (stock_status in ('available', 'soldout', 'unknown')),
  stock_raw text not null default '',  -- 원본 재고 텍스트 (정규화 전)
  courier text not null default '',    -- 택배사명
  extra jsonb not null default '{}',   -- 기타 정보 (출고지, 마감시간 등)
  uploaded_at timestamptz default now()
);

create index idx_sp_supplier on supplier_products(supplier_id);
create index idx_sp_name on supplier_products(supplier_id, product_name);
create index idx_sp_supplier_name_option
  on supplier_products(supplier_id, product_name, option_name);

alter table supplier_products enable row level security;
create policy "auth_all" on supplier_products
  for all to authenticated using (true) with check (true);
```

> 공급처 상품 중복 정책: 같은 공급처 내 동일 productCode/productName 중복을 허용한다.
> 스마트 배정에서 동일 코드로 복수 매칭 시 soldout 제외 + 최저가 우선.

### GRANT 권한 (기존 패턴)

```sql
grant all on supplier_product_templates to authenticated;
grant all on supplier_products to authenticated;
```

---

## 타입 정의

`src/types/index.ts`에 추가:

```ts
export type StockStatus = 'available' | 'soldout' | 'unknown'

export type SupplierProductSystemField =
  | 'productCode'
  | 'productName'
  | 'optionName'
  | 'category'
  | 'price'
  | 'stockStatus'
  | 'courier'
  | 'empty'

export type SupplierProductColumnMapping = {
  targetColumnIndex: number
  targetHeaderName: string
  systemField: SupplierProductSystemField
}

export type SupplierProductTemplate = {
  id: string
  supplierId: string
  templatePath: string
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  columnMappings: SupplierProductColumnMapping[]
  lastUploadedFileName: string | null
  lastUploadedAt: string | null
  lastUploadedCount: number
  lastInvalidCount: number
  createdAt: string
  updatedAt: string
}

export type SupplierProduct = {
  id: string
  supplierId: string
  productCode: string
  productName: string
  optionName: string
  category: string
  price: number | null
  stockStatus: StockStatus
  stockRaw: string
  courier: string
  extra: Record<string, unknown>
  uploadedAt: string
}
```

---

## Zod 스키마

`src/lib/schemas/index.ts`에 추가:

```ts
// SupplierProductTemplate row → 도메인 타입 변환
const supplierProductTemplateRowSchema = z.object({
  id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  template_path: z.string(),
  template_file_name: z.string(),
  sheet_name: z.string(),
  header_row: z.number(),
  data_start_row: z.number(),
  column_mappings: z.array(z.object({
    targetColumnIndex: z.number(),
    targetHeaderName: z.string(),
    systemField: z.string(),
  })),
  last_uploaded_file_name: z.string().nullable(),
  last_uploaded_at: z.string().nullable(),
  last_uploaded_count: z.number(),
  last_invalid_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

// SupplierProduct row → 도메인 타입 변환
const supplierProductRowSchema = z.object({
  id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  product_code: z.string(),
  product_name: z.string(),
  option_name: z.string(),
  category: z.string(),
  price: z.number().nullable(),
  stock_status: z.enum(['available', 'soldout', 'unknown']),
  stock_raw: z.string(),
  courier: z.string(),
  extra: z.record(z.unknown()),
  uploaded_at: z.string(),
})
```

Row 타입 및 변환 함수(`toSupplierProductTemplate`, `toSupplierProduct`)도 같은 패턴으로 정의.

---

## 작업 목록

### 7-1. DB 마이그레이션 — supplier_product_templates

Supabase MCP `apply_migration`으로 실행.

- `supplier_product_templates` 테이블 생성 (위 SQL)
- RLS 정책 + GRANT

---

### 7-2. DB 마이그레이션 — supplier_products

- `supplier_products` 테이블 생성 (위 SQL)
- 인덱스, RLS 정책 + GRANT

---

### 7-3. 타입 + Zod 스키마 추가

`src/types/index.ts`:
- `StockStatus`, `SupplierProductSystemField`, `SupplierProductColumnMapping`, `SupplierProductTemplate`, `SupplierProduct` 타입 추가

`src/lib/schemas/index.ts`:
- Row 스키마, Row 타입, 도메인 변환 함수 추가
- 기존 패턴(supplierTemplateRowSchema 등)과 동일한 구조

---

### 7-4. Supabase API — 공급처 상품 템플릿

`src/lib/supabase/supplierProductTemplates.ts`

```ts
// 공급처별 상품 목록 양식 조회
async function getSupplierProductTemplate(
  supplierId: string
): Promise<SupplierProductTemplate | null>

// 양식 저장 (upsert)
async function upsertSupplierProductTemplate(
  supplierId: string,
  data: { ... }
): Promise<SupplierProductTemplate>

// 양식 삭제
async function deleteSupplierProductTemplate(
  supplierId: string
): Promise<void>

// Storage 파일 업로드
async function uploadProductTemplateFile(
  file: File,
  supplierId: string
): Promise<string>  // path 반환

// Storage 파일 삭제
async function removeProductTemplateStorageFile(
  path: string
): Promise<void>
```

Storage 경로: `product-templates/{supplierId}/{timestamp}_{fileName}`
Storage 버킷: 기존 `templates` 버킷 공유 (별도 버킷 생성 불필요)

---

### 7-5. Supabase API — 공급처 상품 CRUD

`src/lib/supabase/supplierProducts.ts`

```ts
// 공급처별 상품 목록 조회
async function getSupplierProducts(
  supplierId: string
): Promise<SupplierProduct[]>

// 전체 공급처 상품 조회 (스마트 배정용)
async function getAllSupplierProducts(): Promise<SupplierProduct[]>

// 상품 목록 교체 (replace-on-upload)
// 트랜잭션: DELETE → INSERT
async function replaceSupplierProducts(
  supplierId: string,
  products: Omit<SupplierProduct, 'id' | 'uploadedAt'>[]
): Promise<{ count: number }>

// 공급처 상품 수 조회 (대시보드용)
async function getSupplierProductCount(
  supplierId: string
): Promise<number>

// 전체 공급처별 상품 수 조회 (SupplierManage용, N+1 방지)
async function getSupplierProductCounts(): Promise<Map<string, number>>
```

`replaceSupplierProducts` 구현 — **Supabase RPC로 원자 처리**:

```sql
-- DB 마이그레이션에 포함
create or replace function replace_supplier_products(
  p_supplier_id uuid,
  p_products jsonb
) returns integer
language plpgsql as $$
declare
  v_count integer;
begin
  delete from supplier_products where supplier_id = p_supplier_id;

  insert into supplier_products (
    supplier_id, product_code, product_name, option_name, category,
    price, stock_status, stock_raw, courier, extra
  )
  select
    p_supplier_id,
    coalesce(elem->>'productCode', ''),
    elem->>'productName',
    coalesce(elem->>'optionName', ''),
    coalesce(elem->>'category', ''),
    (elem->>'price')::integer,
    coalesce(elem->>'stockStatus', 'unknown'),
    coalesce(elem->>'stockRaw', ''),
    coalesce(elem->>'courier', ''),
    coalesce((elem->'extra')::jsonb, '{}'::jsonb)
  from jsonb_array_elements(p_products) as elem;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
```

클라이언트 호출:
```ts
const { data, error } = await supabase.rpc('replace_supplier_products', {
  p_supplier_id: supplierId,
  p_products: JSON.stringify(products),
})
```

> 파싱 성공(validCount > 0)한 경우에만 RPC 호출. 파싱 실패 시 기존 데이터를 삭제하지 않는다.

---

### 7-6. 공급처 상품 엑셀 파서

`src/lib/parsers/supplierProductParser.ts`

발주서 양식 파서(`purchaseOrderGenerator.ts`)와 다른, 새로운 파서. 컬럼 매핑 기반으로 동작.

```ts
type SupplierProductParseResult = {
  products: ParsedSupplierProduct[]
  invalidRows: InvalidRow[]
  meta: {
    totalRows: number
    validCount: number
    invalidCount: number
    skippedRows: number
  }
}

type ParsedSupplierProduct = {
  productCode: string
  productName: string
  optionName: string
  category: string
  price: number | null
  stockStatus: StockStatus
  stockRaw: string
  courier: string
  extra: Record<string, unknown>
}

function parseSupplierProducts(input: {
  rows: unknown[][]
  columnMappings: SupplierProductColumnMapping[]
  headerRow: number       // extra key 생성에 사용
  dataStartRow: number
}): SupplierProductParseResult
```

**파싱 규칙**:

빈 행 처리:
- 모든 셀이 비어있는 행 → `skippedRows++` (invalidRow에 넣지 않음)
- `productName`이 비어있지만 다른 셀에 값이 있는 행 → `invalidRow` (reason="상품명 누락")
- `productName`이 있는 행 → 정상 파싱

가격 파싱 (`parsePrice` 함수):
- 통화기호/단위 제거 후 숫자 추출: `"15,000원"` → 15000, `"￦15,000"` → 15000, `"15,000 / 박스"` → 15000
- 콤마 제거: `"15,000"` → 15000
- 숫자가 없으면 null: `"미정"` → null, `"-"` → null
- 음수 → null, 소수점 → null
- `stockStatus`: `normalizeStockStatus(rawValue)` 함수로 정규화
- 매핑에 없는 컬럼은 `extra`에 `{ headerName: value }` 형태로 저장 (headerRow에서 헤더명 추출, 빈 헤더는 `column_{n+1}`)

**재고 정규화 함수**:

```ts
function normalizeStockStatus(raw: unknown): { status: StockStatus; rawText: string }
```

| 입력 | 결과 |
|------|------|
| `"판매중"`, `"재고있음"`, `"O"`, `"Y"`, `"있음"` | `available` |
| `"품절"`, `"재고없음"`, `"X"`, `"N"`, `"없음"`, `"0"` | `soldout` |
| 숫자 `0` | `soldout` |
| 숫자 `> 0` | `available` |
| `null`, `undefined`, `""`, 기타 | `unknown` |

---

### 7-7. 공급처 상품 파서 테스트

`src/lib/parsers/supplierProductParser.test.ts`

테스트 케이스 (19개):

1. **기본 파싱**: productName, productCode, price 올바르게 추출
2. **완전 빈 행 스킵**: 모든 셀이 비어있는 행 → skippedRows 증가
3. **상품명 누락 + 다른 값 존재**: productName 없지만 price 등 있음 → invalidRow
4. **가격 콤마 제거**: "15,000" → 15000
5. **가격 통화기호**: "15,000원" → 15000, "￦15,000" → 15000
6. **가격 단위 포함**: "15,000 / 박스" → 15000
7. **가격 없음**: 빈 셀 → null
8. **가격 문자열**: "미정" → null
9. **가격 음수**: "-1,000" → null
10. **재고 available**: "판매중" → available
11. **재고 soldout**: "품절" → soldout
12. **재고 숫자 0**: 0 → soldout
13. **재고 숫자 양수**: 150 → available
14. **재고 unknown**: "" → unknown
15. **재고 다양한 표현**: "O", "X", "있음", "없음" 각각 올바르게 변환
16. **extra 필드**: 매핑 안 된 컬럼이 extra에 저장됨
17. **extra 빈 헤더**: 헤더명이 비어있으면 `column_{n+1}`으로 저장
18. **dataStartRow 적용**: 지정된 행부터 파싱 시작
19. **빈 rows**: 빈 배열 → products[], invalidRows[] 모두 빈 배열

---

### 7-8. 자동 매칭 제안 로직

`src/lib/matching/productMatcher.ts`

NameMapping 등록 시, 플랫폼 상품명과 공급처 상품명을 자동으로 매칭 제안하는 로직.

```ts
type MatchSuggestion = {
  supplierProduct: SupplierProduct
  score: number         // 0~1 (1이 완전 일치)
  matchType: 'exact' | 'fuzzy'
}

function suggestMatches(
  platformProductName: string,
  platformOptionName: string,
  supplierProducts: SupplierProduct[],
  options?: { threshold?: number; maxResults?: number }
): MatchSuggestion[]
```

**매칭 알고리즘 — 토큰 기반 Jaccard 유사도**:

1. **정규화**: `normalizeProductText(text)` 적용
   - 대괄호 태그 제거: `[특가]`, `[핫딜]` → 삭제
   - 단위 통일: `㎏` → `kg`, `키로` → `kg`
   - 연속 공백 → 단일 공백, trim
   - 일반 괄호 `(중과)` 등은 유지 (규격 정보일 수 있음)
2. 토큰화: 정규화된 텍스트 → 공백/특수문자로 분리 → 소문자 → 숫자+단위 결합 (`5` + `kg` → `5kg`)
3. `platformTokens = tokenize(normalize(productName + " " + optionName))`
4. `supplierTokens = tokenize(normalize(supplierProduct.productName + " " + supplierProduct.optionName))`
5. Jaccard = |A ∩ B| / |A ∪ B|
6. 정확 일치(exact): Jaccard === 1.0 또는 정규화된 텍스트 완전 동일
7. 기본 threshold: 0.3 (30% 이상 겹치면 후보)
8. 기본 maxResults: 5

**토큰화 예시**:
```
"한라봉 중과 5kg" → ["한라봉", "중과", "5kg"]
"[특가] 정품 한라봉 중소과 5kg" → ["정품", "한라봉", "중소과", "5kg"]
"애호박 2개입" → ["애호박", "2개입"]
"5 kg" → ["5kg"]
```

---

### 7-9. 자동 매칭 제안 테스트

`src/lib/matching/productMatcher.test.ts`

테스트 케이스 (12개):

1. **정확 일치**: "한라봉 중과 5kg" ↔ "한라봉 중과 5kg" → score 1.0, matchType 'exact'
2. **높은 유사도**: "한라봉 중과 5kg" ↔ "정품 한라봉 중과 5kg" → score > 0.6
3. **낮은 유사도**: "한라봉 중과 5kg" ↔ "애호박 2개입" → score < 0.3 (threshold 미달 → 제외)
4. **threshold 적용**: threshold=0.5면 score<0.5인 결과 제외
5. **maxResults 적용**: maxResults=3이면 상위 3개만 반환
6. **정렬**: score 내림차순
7. **옵션명 포함 매칭**: productName + optionName이 함께 매칭에 사용
8. **빈 공급처 목록**: supplierProducts가 빈 배열 → 빈 결과
9. **숫자+단위 결합**: "5 kg" → "5kg"로 토큰화되어 "5kg"과 매칭
10. **대괄호 태그 제거**: "[특가] 한라봉 중과 5kg" ↔ "한라봉 중과 5kg" → 높은 점수
11. **단위 통일**: "5㎏" ↔ "5kg" → 동일 토큰으로 처리
12. **동점 안정 정렬**: score 동일 시 productName 오름차순

---

### 7-10. 스마트 배정 로직 확장

`src/lib/allocation/autoAllocator.ts` 수정

**입력 타입 확장**:

```ts
type AutoAllocationInput = {
  orders: StandardOrder[]
  productMappings: ProductMapping[]
  nameMappings: NameMapping[]
  suppliers: Supplier[]
  supplierProducts?: SupplierProduct[]   // ← 추가 (optional)
}
```

**스마트 배정 활성화 조건**: `supplierProducts`가 전달되고 길이 > 0

**변경되는 로직 흐름**:

기존 `findProductMapping()`은 1곳만 반환했는데, 스마트 배정 시 여러 후보를 반환하는 내부 함수 추가:

```ts
// 기존 (변경 없음 — supplierProducts 없을 때)
function findProductMapping(...): ProductMapping | null

// 신규 (supplierProducts 있을 때 사용)
function findProductMappingCandidates(
  platform: Platform,
  productName: string,
  optionName: string,
  mappings: ProductMapping[]
): ProductMapping[]
```

**`findProductMappingCandidates` 반환 순서**:
1. isDefault=true인 매핑 (있으면 첫 번째)
2. 나머지 매핑들 (priority ASC, createdAt ASC)

**스마트 배정 선택 로직**:

```ts
function selectBestSupplier(
  candidates: ProductMapping[],
  nameMappings: NameMapping[],
  supplierProducts: SupplierProduct[],
  order: StandardOrder,
  supplierMap: Map<string, Supplier>
): PendingAllocation | null
```

1. 각 후보 매핑에 대해:
   - NameMapping으로 공급처 상품명/코드 결정
   - supplierProducts에서 해당 공급처 상품 검색 (**검색 우선순위**):
     - ① `supplierProductCode`가 있으면 → `SupplierProduct.productCode`와 매칭
     - ② 코드 없으면 → `supplierProductName === SupplierProduct.productName`
     - ③ 찾지 못하면 → 가격/재고 정보 없음 (unknown 취급)
   - 가격, 재고 상태 수집
2. isDefault=true 매핑이 있고 재고가 soldout이 아니면 → 즉시 선택
3. isDefault 매핑의 재고가 soldout이면 → 나머지 후보로 진행
4. 나머지 후보 중:
   - soldout 제외
   - 가격 ASC 정렬 (null은 뒤로)
   - 최저가 선택
5. **모든 후보가 soldout이면 → unmatched** (reason="모든 후보 공급처 품절")
6. 후보가 아예 없으면 → unmatched

**`AllocationResult` 확장**:

```ts
type PendingAllocation = {
  // ... 기존 필드 ...
  smartAllocationApplied: boolean    // ← 추가: 스마트 배정 사용 여부
  supplierPrice?: number             // ← 추가: 배정 시점 가격 스냅샷
}
```

> DB `allocations` 테이블에 `smart_allocation_applied boolean default false`, `supplier_price integer` 컬럼 추가 필요.

---

### 7-11. DB 마이그레이션 — allocations 컬럼 추가

```sql
alter table allocations
  add column smart_allocation_applied boolean not null default false;

alter table allocations
  add column supplier_price integer;
```

---

### 7-12. 스마트 배정 테스트

`src/lib/allocation/autoAllocator.test.ts`에 추가

**기존 테스트 19개**: `supplierProducts` 없이 호출 → 전부 통과 (하위호환 검증)

**신규 테스트 케이스 (10개)**:

1. **스마트 배정 기본**: 2개 공급처 후보 중 저가 선택
2. **재고 soldout 제외**: A업체 5000원(soldout), B업체 6000원(available) → B업체 선택
3. **isDefault + available**: isDefault 공급처 재고 있음 → 가격 무관 isDefault 선택
4. **isDefault + soldout → fallback**: isDefault 공급처 품절 → 나머지 중 최저가 선택
5. **가격 null 처리**: 가격 정보 없는 공급처는 있는 공급처보다 후순위
6. **모든 후보 soldout → unmatched**: 전부 품절이면 unmatched (reason="모든 후보 공급처 품절")
7. **supplierProducts 빈 배열**: 스마트 배정 비활성화 → 기존 로직대로 동작
8. **supplierPrice 스냅샷**: PendingAllocation에 배정 시점 가격이 저장됨
9. **productCode 우선 매칭**: supplierProductCode가 있으면 productCode 기준으로 SupplierProduct 검색
10. **unknown 재고 허용**: stockStatus=unknown인 공급처도 배정 대상에 포함

---

### 7-13. Hook — 공급처 상품 템플릿 + 상품 관리

`src/hooks/useSupplierProducts.ts`

```ts
function useSupplierProducts(supplierId: string) {
  // 상태
  products: SupplierProduct[]
  template: SupplierProductTemplate | null
  loading: boolean
  productCount: number

  // 액션
  saveTemplate(data): Promise<void>     // 양식 저장
  removeTemplate(): Promise<void>       // 양식 삭제
  uploadProducts(file: File): Promise<void>  // 파싱 + replace
  refreshProducts(): Promise<void>      // 상품 목록 새로고침
}
```

`uploadProducts` 흐름:
1. 파일 검증 (엑셀, 10MB)
2. readExcelFile → sheetToRows
3. parseSupplierProducts (컬럼 매핑 기반)
4. replaceSupplierProducts (DB 교체)
5. toast 성공/실패
6. refreshProducts

---

### 7-14. Hook — 자동 매칭 제안

`src/hooks/useMatchSuggestions.ts`

```ts
function useMatchSuggestions(supplierId: string) {
  suggestions: MatchSuggestion[]
  loading: boolean

  // 특정 플랫폼 상품에 대한 매칭 제안 가져오기
  getSuggestions(
    platformProductName: string,
    platformOptionName: string
  ): Promise<MatchSuggestion[]>

  // 전체 미매핑 상품에 대한 일괄 자동 매칭 제안
  suggestAll(
    existingMappings: NameMapping[],
    platformProducts: { productName: string; optionName: string; platform: Platform }[]
  ): Promise<BulkSuggestion[]>
}

type BulkSuggestion = {
  platformProductName: string
  platformOptionName: string
  platform: Platform
  topMatch: MatchSuggestion | null
}
```

---

### 7-15. Hook — useAllocation 확장

`src/hooks/useAllocation.ts` 수정

`runAutoAllocation` 시:
1. 기존: `getAllocations` + `getProductMappings` + `getNameMappings` + `getSuppliers`
2. 추가: `getAllSupplierProducts()` 호출
3. `autoAllocate`에 `supplierProducts` 전달

기존 동작과의 차이: supplierProducts가 DB에 없으면 빈 배열 → 기존 로직 동작.

---

### 7-16. UI — SupplierDetail 상품 목록 섹션

`src/pages/mapping/SupplierDetail.tsx`에 **3번째 섹션** 추가

**섹션 구조**:

```
┌────────────────────────────────────────────┐
│ 📦 상품 목록                     [업로드]  │
│                                            │
│ ┌─ 양식 설정 ─────────────────────────┐    │
│ │ 파일: a업체_공급처_목록.xlsx         │    │
│ │ 시트: Sheet1 / 헤더: 1행 / 데이터: 2행 │    │
│ │                                      │    │
│ │ 컬럼 매핑:                           │    │
│ │  A열(상품코드) → 상품코드            │    │
│ │  B열(상품명)   → 상품명 ✱            │    │
│ │  C열(분류)     → 분류                │    │
│ │  D열(공급가)   → 가격                │    │
│ │  E열(가격구분) → (사용안함)           │    │
│ │  F열(재고)     → 재고상태            │    │
│ │                    [저장] [취소]      │    │
│ └──────────────────────────────────────┘    │
│                                            │
│ ┌─ 등록된 상품 (215개) ───────────────┐    │
│ │ 🔍 검색...                          │    │
│ │ ┌──────┬────────────┬──────┬──────┐ │    │
│ │ │코드  │상품명      │가격  │재고  │ │    │
│ │ ├──────┼────────────┼──────┼──────┤ │    │
│ │ │A001  │한라봉 중과..│15000 │판매중│ │    │
│ │ │A002  │천혜향 소과..│12000 │품절  │ │    │
│ │ └──────┴────────────┴──────┴──────┘ │    │
│ └──────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```

**상태 3가지**:
1. **양식 미등록**: EmptyState + "양식 설정" CTA
2. **양식 등록, 상품 없음**: 양식 정보 표시 + "상품 업로드" CTA
3. **양식 등록 + 상품 있음**: 양식 정보 + 상품 테이블 (검색, 페이지네이션)

**양식 설정 UI**: 발주서 양식(섹션 2)과 동일한 패턴
- 엑셀 파일 드래그앤드롭 업로드
- 시트 선택 / 헤더 행 / 데이터 시작 행
- 컬럼 매핑 테이블 (시스템 필드 드롭다운)
- 필수 필드: `productName` (1개만)

**시스템 필드 목록**:

| 값 | 라벨 | 필수 |
|----|------|------|
| `productName` | 상품명 | ✅ |
| `productCode` | 상품코드 | |
| `optionName` | 옵션명 | |
| `category` | 분류 | |
| `price` | 가격 | |
| `stockStatus` | 재고상태 | |
| `courier` | 택배사 | |
| `empty` | (사용 안 함) | |

**상품 업로드 버튼**: 양식 저장 후 활성화. 클릭 시 파일 선택 → 파싱 → DB 교체 → 테이블 갱신.

**상품 테이블**: 검색(상품명/코드), 재고 상태 뱃지, 가격은 `toLocaleString('ko-KR')` 포맷.

재고 뱃지:
- `available` → 초록 "재고있음"
- `soldout` → 빨강 "품절"
- `unknown` → 회색 "재고미확인" (available과 명확히 구분)

> 스마트 배정에서 unknown은 배정 허용 대상이지만, UI에서는 "재고있음"으로 표시하지 않는다.

---

### 7-17. UI — NameMapping 자동 매칭 제안

`src/pages/mapping/NameMapping.tsx` 수정

**변경 1: 등록/수정 다이얼로그에서 공급처 상품명 자동완성**

공급처를 선택하면 해당 공급처의 `supplierProducts`를 조회하여:
- "공급처 상품명" 입력 필드에 자동완성 드롭다운 추가
- 상품 선택 시 `supplierProductName`과 `supplierProductCode`를 자동 채움
- 수동 입력도 가능 (자동완성은 보조)

**변경 2: "자동 매칭 제안" 버튼**

테이블 상단에 "자동 매칭 제안" 버튼 추가.
클릭 시:
1. **미매핑 대상 산출**: ProductMapping row 기준으로, 동일 `platform + productName + optionName + supplierId` 조합의 NameMapping이 없는 항목을 추출
2. 각 미매핑 항목에 대해 해당 supplierId의 공급처 상품과 Jaccard 매칭
3. 결과를 다이얼로그에 리스트로 표시:
   ```
   ┌──────────────────────────────────────────────┐
   │ 자동 매칭 제안 (5건)                          │
   │                                              │
   │ ☐ 한라봉 5kg → [A업체] 한라봉 중과 5kg (87%) │
   │ ☐ 천혜향 3kg → [A업체] 천혜향 소과 3kg (92%) │
   │ ☐ 애호박 2개 → [B업체] 애호박 2개입    (85%) │
   │ ☐ 사과 5kg   → (매칭 없음)                   │
   │ ☐ 딸기 1kg   → [B업체] 딸기 500g 2팩  (45%) │
   │                                              │
   │ 선택한 3건의 매핑을 등록하시겠습니까?          │
   │                       [취소] [등록]           │
   └──────────────────────────────────────────────┘
   ```
4. 체크박스로 원하는 매칭만 선택
5. "등록" 클릭 → 선택된 항목을 NameMapping으로 일괄 생성
   - 이미 존재하는 NameMapping(동일 platform/productName/optionName/supplierId)은 skip
   - 결과: `{ createdCount, skippedCount, failedCount }` 토스트로 표시

> 이 기능은 공급처 상품이 1개 이상 등록된 경우에만 활성화. 없으면 버튼 disabled + 툴팁.

---

### 7-18. UI — SupplierAllocation 가격/재고 표시 + 상품 목록 갱신

`src/pages/orders/SupplierAllocation.tsx` 수정

**변경 0: 배정 전 "상품 목록 갱신" 섹션**

자동 배정 버튼 위에 공급처별 상품 목록 상태를 표시하고, 바로 갱신할 수 있는 섹션 추가.
매일 아침 상품 가격/재고가 변경될 수 있으므로, 배정 직전에 갱신 기회를 제공한다.

```
┌─ 상품 목록 갱신 ──────────────────────────────────────────┐
│                                                           │
│  A업체   215개 · 마지막 갱신: 2026-05-10 09:12   [갱신]  │
│  B업체   370개 · 마지막 갱신: 2026-05-10 09:15   [갱신]  │
│  C업체   양식 미등록                      [양식 설정 →]   │
│                                                           │
│  ℹ️ 안 바뀌었으면 갱신 없이 바로 배정해도 됩니다          │
└───────────────────────────────────────────────────────────┘
```

- 양식 등록된 공급처: [갱신] 클릭 → 파일 선택 → 파싱 → DB 교체 → 건수 갱신
- 양식 미등록 공급처: [양식 설정 →] 클릭 → `/mapping/suppliers/:id`로 이동
- 안 바뀌었으면 스킵 가능 (기존 데이터 유지)
- 이 섹션은 접을 수 있음 (Collapsible) — 갱신 불필요 시 한 번 접으면 됨

**변경 1: 공급처 Select에 가격/재고 정보 추가**

공급처를 변경할 때 Select 드롭다운의 각 옵션에:
```
A업체                       ← 기존
A업체 · ₩15,000 · 재고있음  ← 변경 후 (supplierProduct 있을 때)
A업체 · 가격정보 없음        ← 변경 후 (supplierProduct 없을 때)
```

**변경 2: 그룹 헤더에 배정 가격 표시**

스마트 배정이 적용된 그룹은:
```
🟢 한라봉 5kg          A업체   120건   ₩15,000   스마트배정
```
기존 배정:
```
🟢 한라봉 5kg          A업체   120건
```

`smartAllocationApplied` 여부로 구분. 작은 뱃지로 표시.

---

### 7-19. 문서 업데이트 — REF_데이터_모델.md

- `SupplierProduct`, `SupplierProductTemplate`, `SupplierProductColumnMapping`, `StockStatus`, `SupplierProductSystemField` 타입 설명 추가
- 기존 `Allocation` 타입에 `smartAllocationApplied`, `supplierPrice` 필드 추가 설명
- `PendingAllocation` 타입 업데이트

---

### 7-20. 문서 업데이트 — REF_DB_스키마.md

- `supplier_product_templates`, `supplier_products` 테이블 SQL + 제약조건 추가
- `allocations` 테이블 ALTER 문 추가
- 테이블 관계도 업데이트:
  ```
  suppliers ─────────────┬───── product_mappings
      │                  ├───── name_mappings
      │                  ├───── courier_mappings
      │                  ├───── supplier_templates
      │                  ├───── supplier_product_templates  ← 추가
      │                  └───── supplier_products           ← 추가
  ```

---

### 7-21. 문서 업데이트 — REF_엑셀_구조.md

§ 9 공급처 상품 목록 섹션에 파싱 규칙, 컬럼 매핑 대상 필드, 재고 정규화 규칙 보충.

---

### 7-22. Dashboard 바로가기 업데이트

`src/pages/Dashboard.tsx`의 Shortcuts 섹션:

"양식 관리" 바로가기에 공급처 상품 수 카운트 추가 (또는 별도 바로가기 불필요 — 공급처 상세에서 관리하므로 기존 "공급처 관리" 바로가기로 충분).

→ Dashboard `useDashboard` 훅에 `totalProductCount` 추가 (공급처 상품 총 수), Shortcuts에 표시.

---

### 7-23. SupplierManage 목록에 상품 수 표시

`src/pages/mapping/SupplierManage.tsx`

공급처 목록 테이블에 "상품" 컬럼 + "상품 업로드" 빠른 버튼 추가:

```
┌──────┬────┬──────┬────────────────────────────────┐
│이름  │양식│상품  │                                │
├──────┼────┼──────┼────────────────────────────────┤
│A업체 │등록│215개 │ [상품 업로드]  [수정] [비활성화]│
│B업체 │등록│370개 │ [상품 업로드]  [수정] [비활성화]│
│C업체 │미등│  -   │               [수정] [비활성화]│
└──────┴────┴──────┴────────────────────────────────┘
```

- "상품 업로드" 버튼: 양식 등록된 공급처만 활성화
- 클릭 → 파일 선택 → 파싱 → DB 교체 → 건수 갱신 (상세 페이지 안 거쳐도 됨)
- 상품 수 표시: `215개` / `0개` / `-` (양식 미등록)

**N+1 쿼리 방지**: `getSupplierProductCounts()` 함수로 전체 공급처의 상품 수를 한 번에 group by 조회. 공급처 row마다 개별 count 쿼리 호출 금지.

```ts
async function getSupplierProductCounts(): Promise<Map<string, number>>
// select supplier_id, count(*) from supplier_products group by supplier_id
```

---

### 7-24. TopBar + Allocation 타입 업데이트

- `AllocationWithOrder` 타입에 `smartAllocationApplied`, `supplierPrice` 추가
- `src/lib/supabase/allocations.ts`의 `createAllocations` 함수에 새 필드 포함

---

## 검증 시나리오

### 자동 테스트

| 파일 | 테스트 | 기대 결과 |
|------|--------|----------|
| `supplierProductParser.test.ts` | 19개 | 전부 통과 |
| `productMatcher.test.ts` | 12개 | 전부 통과 |
| `autoAllocator.test.ts` | 기존 19 + 신규 10 = 29개 | 전부 통과 |
| 총 | **60+개** (기존 118 + 신규 41) | `npm run test:run` 전체 통과 |

### 수동 검증 (브라우저)

1. **공급처 상세 → 상품 목록 양식 설정**: A업체 상품 목록 엑셀 업로드 → 시트/헤더/컬럼 매핑 설정 → 저장
2. **상품 업로드**: 양식 설정 후 상품 엑셀 업로드 → 215개 상품 파싱 → DB 저장 → 테이블 표시
3. **재업로드**: 같은 공급처에 다시 업로드 → 기존 데이터 교체 → 개수 갱신
4. **B업체도 동일하게**: B업체 370개 상품 업로드
5. **상품명 자동완성**: NameMapping 등록 다이얼로그 → 공급처 선택 → 상품명 자동완성 동작
6. **자동 매칭 제안**: 버튼 클릭 → 미매핑 상품에 대한 제안 표시 → 선택 → 일괄 등록
7. **공급처 목록에서 빠른 업로드**: SupplierManage에서 [상품 업로드] 클릭 → 파일 선택 → 갱신 완료
8. **배정 전 상품 갱신**: 배정 페이지에서 [갱신] 클릭 → 파일 업로드 → 건수 업데이트 확인
9. **갱신 없이 배정**: 상품 목록 갱신 안 하고 바로 자동 배정 → 전날 데이터로 배정됨
10. **스마트 배정**: 주문 업로드 → 자동 배정 실행 → 저가 공급처가 선택됨 확인
11. **isDefault + 품절 fallback**: isDefault 공급처를 soldout으로 설정 → 재배정 → 다른 공급처 선택됨
12. **모든 후보 품절**: 전부 soldout → unmatched 처리 확인
13. **하위호환**: 공급처 상품 미등록 공급처 → 기존 로직대로 배정됨
14. **배정 페이지 가격 표시**: 공급처 Select에 가격/재고 보임
15. **공급처 목록에 상품 수 표시**: SupplierManage 테이블에 상품 컬럼 + 업로드 버튼 표시됨
16. **빌드 통과**: `npm run build` + `npm run typecheck` + `npm run lint`

---

## 구현 순서 (권장)

```
7-1, 7-2, 7-11  → DB 마이그레이션 3건 (병렬 가능)
7-3              → 타입 + Zod 스키마
7-4, 7-5         → Supabase API (병렬)
7-6, 7-7         → 파서 + 테스트
7-8, 7-9         → 매칭 로직 + 테스트
7-10, 7-12       → 배정 로직 확장 + 테스트
7-13, 7-14, 7-15 → Hooks (3개)
7-16             → SupplierDetail UI (상품 목록 섹션)
7-17             → NameMapping UI (자동 매칭)
7-18             → SupplierAllocation UI (가격/재고)
7-22, 7-23, 7-24 → Dashboard, SupplierManage, 타입 업데이트
7-19, 7-20, 7-21 → 문서 업데이트 (마지막)
```
