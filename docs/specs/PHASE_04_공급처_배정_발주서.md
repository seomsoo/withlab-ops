# Phase 4: 공급처 배정 + 발주서

## 목표
주문 업로드 후 자동 배정 로직, 공급처 배정 UI, 양식 관리(공급처 발주서 템플릿), 발주서 엑셀 생성/다운로드, 발주 완료 처리를 구현한다. Phase 3에서 파싱된 주문 데이터를 기반으로 공급처별 발주서를 생성하는 전체 파이프라인을 완성한다.

> ⚠️ 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> `docs/design/` 시안 파일은 **디자인(색상, 간격, 스타일)의 참조**로만 사용한다.
> 구조, 필드 구성, 기능 범위는 **스펙 문서가 우선**이며 시안과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 3 ✅ 검증 통과

---

## 참조 문서

| 문서 | 참조 범위 |
|------|----------|
| `docs/REF_데이터_모델.md` | Allocation, StandardPurchaseOrder, PurchaseOrderItem, SupplierTemplate, ColumnMappingItem 타입 |
| `docs/REF_DB_스키마.md` | allocations, supplier_templates 테이블 + 제약조건, Storage 정책 |
| `docs/REF_엑셀_구조.md` | A업체/B업체 발주서 양식 컬럼 인덱스, 시트명, 헤더 위치 |
| `docs/REF_디자인_시스템.md` | 디자인 토큰, 컴포넌트 className 패턴 |
| `07_엑셀_생성_및_비즈니스_로직.md` | 자동 배정, 상품명 변환, 오늘만/기본 변경, 주문 라인 분배, 발주 완료 로직 |
| `05_화면_흐름.md` | 3-2 공급처 배정 탭, 3-3 발주서 다운로드 탭, 6-1 양식 관리 |
| `src/lib/generators/CLAUDE.md` | 발주서 생성 규칙 (ExcelJS, 템플릿 로드, 컬럼 매핑) |
| `src/lib/schemas/CLAUDE.md` | Zod 스키마 검증 규칙 |

---

## 핵심 정책

### 주문 라인 단위 배정 (수량 분할 금지)

```
한 주문 라인 = 한 공급처만 배정
수량 분할 금지 — DB unique(order_id) 제약으로 강제
Allocation.allocatedQuantity는 항상 order.quantity와 동일

허용: 같은 품목+옵션의 주문 라인 100건을 A 60건 + B 40건으로 분배
금지: 1건의 주문 라인(수량 3개)을 A 2개 + B 1개로 분할
```

> ⚠️ "수량 분배"라는 표현은 오해의 소지가 있으므로 **"주문 라인 분배"**로 용어를 통일한다.
> 분배 UI에서 입력하는 숫자는 "수량"이 아니라 "주문 라인 건수"이다.

### Allocation은 배정 시점 스냅샷

```
Allocation에는 배정 시점의 supplierId, supplierProductName, supplierProductCode를 스냅샷으로 저장한다.
이후 ProductMapping 또는 NameMapping이 변경되어도 기존 Allocation에는 자동 반영하지 않는다.
오늘 작업건의 발주서 출력 안정성을 우선한다.
```

---

## 시안 참조 가이드

| 구현 대상 | 참조 시안 파일 | 참조 범위 |
|----------|--------------|----------|
| 공급처 배정 | `docs/design/assign.css`, `docs/design/assign.jsx` | 아코디언 그룹 테이블, 필터 바, 분배 모달, 하단 CTA |
| 발주서 다운로드 | `docs/design/download.css`, `docs/design/download.jsx` | 공급처별 카드, 미리보기 모달, 완료 확인 모달 |
| 공급처 발주서 양식 | `docs/design/form-mgmt.css`, `docs/design/form-mgmt.jsx` | 양식 등록 흐름, 컬럼 매핑 테이블, 미리보기 |

> **주의**: 시안은 프로토타입이므로 구조를 복사하지 말고 React 컴포넌트로 재구현한다.

---

## API / Hook / Page 책임 분리 원칙

Phase 3과 동일:

- **Supabase API 함수**: Supabase 호출 → snake_case ↔ camelCase 변환 → Zod 검증 → 실패 시 Error throw. **toast를 호출하지 않는다.**
- **Hook**: API 호출 → loading/error 상태 관리 → toast 표시 → 에러 re-throw
- **Page**: UI 상태 관리 → ConfirmDialog/모달 제어 → 훅 함수 호출

---

## 작업 목록

### 4-1. 자동 배정 로직

`src/lib/allocation/autoAllocator.ts`

주문 목록과 매핑 데이터를 받아 각 주문에 공급처를 배정한다. **순수 함수**로 구현 — DB 호출 없이 인자로 받은 데이터만 사용.

```ts
type AutoAllocationInput = {
  orders: StandardOrder[]
  productMappings: ProductMapping[]
  nameMappings: NameMapping[]
  suppliers: Supplier[]
}

type AllocationResult = {
  allocated: PendingAllocation[]   // 자동 배정 성공
  unmatched: UnmatchedOrder[]      // 매핑 없음 (미분류)
}

type PendingAllocation = {
  orderId: string
  supplierId: string
  supplierProductName: string
  supplierProductCode?: string
  allocatedQuantity: number
  isTemporaryOverride: false
  nameMappingApplied: boolean       // NameMapping 적용 여부
}

type UnmatchedOrder = {
  orderId: string
  reason: string  // "매핑 없음" 등
}
```

**배정 우선순위 (ProductMapping 검색 순서)**:

1. `platform`이 정확히 일치하는 매핑 (`coupang` or `toss`)
2. `platform = 'common'` 매핑 (fallback)
3. 같은 platform/productName/optionName 내에서 `isDefault = true`인 매핑 우선
4. `isDefault = true`가 여러 개이면 `priority`가 낮은 값 우선 (0이 가장 높음)
5. priority도 같으면 `createdAt`이 빠른 매핑 우선
6. 자동 결정이 불가능하면 → `unmatched`

> 비활성 공급처(`isActive=false`)에 연결된 매핑도 자동 배정에 **포함**한다. 기존 매핑은 삭제하지 않으므로 과거 매핑이 여전히 동작할 수 있다. UI에서 비활성 뱃지를 표시한다.

**상품명 변환 (NameMapping 검색)**:

배정된 공급처에 대해 NameMapping 조회:
- 조건: `supplierId` + `platformProductName` + `platformOptionName`
- platform 우선순위: exact match → common fallback
- 결과 있으면: `supplierProductName`, `supplierProductCode` 사용, `nameMappingApplied = true`
- 없으면: 원본 `order.productName`을 fallback, `supplierProductCode = undefined`, `nameMappingApplied = false`

---

### 4-2. 자동 배정 테스트

`src/lib/allocation/autoAllocator.test.ts`

테스트 케이스:

1. **기본 배정**: 매핑이 있는 주문 → 올바른 공급처에 배정됨
2. **미분류**: 매핑이 없는 주문 → unmatched에 포함
3. **platform 우선순위**: coupang 주문에 coupang 매핑과 common 매핑 모두 존재 → coupang 매핑 우선
4. **common fallback**: coupang 매핑 없고 common 매핑만 있는 경우 → common 매핑 사용
5. **common은 exact 없을 때만**: exact platform이 있으면 common 무시
6. **isDefault 우선**: 같은 품목에 여러 공급처, isDefault=true인 것 우선
7. **priority 순서**: isDefault=true가 여러 개일 때 priority가 낮은 것 우선
8. **상품명 변환 + nameMappingApplied=true**: NameMapping이 있으면 변환된 상품명 사용
9. **상품명 fallback + nameMappingApplied=false**: NameMapping이 없으면 원본 productName 사용
10. **NameMapping platform 우선순위**: exact platform NameMapping이 common NameMapping보다 우선
11. **빈 주문 목록**: orders가 빈 배열 → allocated/unmatched 모두 빈 배열
12. **빈 매핑 목록**: 매핑이 없으면 전부 unmatched
13. **옵션명 포함 매칭**: productName + optionName 조합으로 매칭
14. **옵션명 빈 문자열 매칭**: 옵션 없는 상품 ↔ optionName='' 매핑
15. **비활성 공급처 매핑 포함**: is_active=false 공급처 매핑도 자동 배정에 포함
16. **스냅샷 저장**: Allocation에 supplierProductName/supplierProductCode가 스냅샷으로 저장됨
17. **allocatedQuantity 검증**: Allocation.allocatedQuantity === order.quantity

---

### 4-3. Supabase API — 배정(Allocation) 관련

`src/lib/supabase/allocations.ts`

```ts
// 배정 생성 (일괄)
async function createAllocations(
  workSessionId: string,
  allocations: PendingAllocation[]
): Promise<Allocation[]>

// 배정 조회 (작업건 전체)
async function getAllocations(
  workSessionId: string
): Promise<AllocationWithOrder[]>

// 그룹 단위 공급처 변경 (품목+옵션 그룹의 모든 주문 라인)
async function updateGroupSupplier(
  input: {
    workSessionId: string
    orderIds: string[]
    newSupplierId: string
    supplierProductName: string
    supplierProductCode?: string
    isTemporaryOverride: boolean
    nameMappingApplied: boolean
  }
): Promise<Allocation[]>

// 그룹 단위 allocation 교체 (주문 라인 분배용)
async function replaceAllocationsForGroup(
  workSessionId: string,
  orderIds: string[],
  newAllocations: PendingAllocation[]
): Promise<Allocation[]>
// 전달된 orderIds의 기존 allocation 삭제 → 각 orderId당 정확히 1개 allocation 생성
// DB unique(order_id) 제약으로 강제

// 발주 완료 처리 (RPC 트랜잭션)
async function completeOrder(
  workSessionId: string
): Promise<void>
// Supabase RPC: complete_order_session(work_session_id uuid)

// 미배정 주문 조회 (allocation이 없는 order)
async function getUnallocatedOrders(
  workSessionId: string
): Promise<StandardOrder[]>
```

**AllocationWithOrder 타입**:
```ts
type AllocationWithOrder = Allocation & {
  order: Pick<StandardOrder, 
    'platform' | 'productName' | 'optionName' | 'quantity' | 
    'matchingKey' | 'orderNo' | 'recipientName' | 'recipientPhone' |
    'address' | 'zipCode' | 'deliveryMessage' | 'buyerName' | 'buyerPhone' |
    'rawValues' | 'rawRowNumber' | 'orderItemNo'
  >
  supplierName: string
}
```

DB 조회 시 `orders` 테이블과 `suppliers` 테이블을 join하여 한 번에 가져온다.

**completeOrder RPC 마이그레이션**:

```sql
create or replace function complete_order_session(p_work_session_id uuid)
returns void as $$
begin
  -- 1. work_session.status가 active인지 확인
  if not exists (
    select 1 from work_sessions
    where id = p_work_session_id and status = 'active'
  ) then
    raise exception 'work_session is not active';
  end if;

  -- 2. 미배정 주문이 없는지 확인
  if exists (
    select 1 from orders o
    where o.work_session_id = p_work_session_id
      and not exists (
        select 1 from allocations a where a.order_id = o.id
      )
  ) then
    raise exception 'unallocated orders exist';
  end if;

  -- 3. allocations 상태 변경
  update allocations
  set status = 'ordered', ordered_at = now()
  where order_id in (
    select id from orders where work_session_id = p_work_session_id
  ) and status = 'pending';

  -- 4. work_session 상태 변경
  update work_sessions
  set status = 'ordered', completed_at = now()
  where id = p_work_session_id;
end;
$$ language plpgsql;
```

---

### 4-4. Supabase API — 양식(SupplierTemplate) 관련

`src/lib/supabase/supplierTemplates.ts`

```ts
// 양식 조회 (공급처별)
async function getSupplierTemplate(
  supplierId: string
): Promise<SupplierTemplate | null>

// 전체 양식 조회
async function getAllSupplierTemplates(): Promise<SupplierTemplate[]>

// 양식 생성/업데이트 (upsert — 공급처당 1양식 unique)
async function upsertSupplierTemplate(
  input: {
    supplierId: string
    templatePath: string
    templateFileName: string
    sheetName: string
    headerRow: number
    dataStartRow: number
    columnMappings: ColumnMappingItem[]
  }
): Promise<SupplierTemplate>

// 양식 삭제 (DB + Storage)
async function deleteSupplierTemplate(templateId: string): Promise<void>

// Storage에 템플릿 파일 업로드
async function uploadTemplateFile(supplierId: string, file: File): Promise<string>
// 경로: `supplier-templates/{supplierId}/{timestamp}_{fileName}`

// Storage에서 템플릿 파일 다운로드
async function downloadTemplateFile(templatePath: string): Promise<Blob>
```

**Storage 템플릿 교체 순서** (기존 양식 수정 시):
```
1. 새 파일을 Storage에 업로드 (새 경로)
2. DB supplier_templates upsert (새 templatePath)
3. DB upsert 성공 → 기존 Storage 파일 삭제
4. DB upsert 실패 → 새로 업로드한 파일 삭제 (보상 처리)
```

---

### 4-5. 발주서 생성 로직

`src/lib/generators/purchaseOrderGenerator.ts`

**ExcelJS 사용** (SheetJS는 읽기만). npm 패키지: `exceljs`

```ts
async function generatePurchaseOrderExcel(
  po: StandardPurchaseOrder,
  template: SupplierTemplate,
  templateBlob: Blob
): Promise<Blob>
```

**ExcelJS 구현 방식**:
```ts
import ExcelJS from 'exceljs'

const arrayBuffer = await templateBlob.arrayBuffer()
const workbook = new ExcelJS.Workbook()
await workbook.xlsx.load(arrayBuffer)

const worksheet = workbook.getWorksheet(template.sheetName)

// ... 기존 데이터 clear + 새 데이터 채우기 ...

const outputBuffer = await workbook.xlsx.writeBuffer()
return new Blob([outputBuffer], {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
})
```

**생성 흐름**:

1. `templateBlob`에서 ExcelJS Workbook 로드
2. `template.sheetName`으로 시트 찾기
3. **기존 데이터 영역 clear** (아래 상세 규칙 참조)
4. `po.items`를 순회하며 `template.dataStartRow`부터 행 채우기
5. `template.columnMappings` 순회:
   - `systemField`에 해당하는 값을 `PurchaseOrderItem`에서 추출
   - `systemField === "empty"` → 해당 셀 값을 `null`로 설정 (기존 샘플 데이터 제거)
   - `format`이 있으면 전화번호 포맷 변환 적용
6. Blob 반환

**⚠️ 템플릿 기존 데이터 clear 규칙**:

실제 A/B업체 발주서 양식에는 샘플 데이터가 들어 있을 수 있다. 새 발주 데이터만 덮어쓰면 남은 샘플 행이 그대로 출력될 수 있으므로:

```
- headerRow 이전/헤더 행은 보존한다.
- dataStartRow부터 worksheet.lastRow까지 기존 cell value를 clear한다.
- style, border, number format, row height는 가능한 한 보존한다.
- 새 데이터 작성 시 첫 번째 데이터 행(dataStartRow)의 스타일을 기준으로 복사한다.
- po.items.length > 기존 데이터 행 수 → 필요한 행 추가 + 첫 번째 데이터 행 스타일 복사.
- po.items.length < 기존 데이터 행 수 → 남은 기존 데이터 행의 값을 비워둔다 (clear).
```

**ColumnMappingItem.targetColumnIndex 기준**:

`targetColumnIndex`는 **1-based** (REF_데이터_모델.md 정의 기준). ExcelJS도 1-based이므로 변환 없이 직접 사용:

```ts
template.columnMappings.forEach(mapping => {
  const cell = row.getCell(mapping.targetColumnIndex) // 1-based, ExcelJS와 일치
  // ...
})
```

UI에서는 1-based 컬럼 번호와 엑셀 컬럼 문자(A, B, C...)를 함께 표시한다.

> 참고: 파서 코드의 컬럼 상수는 **0-based** (CLAUDE.md 규칙). ColumnMappingItem은 양식 관리용 별도 체계로, ExcelJS API와 일치하는 **1-based**를 사용한다.

**동일 systemField 다중 매핑 허용**:

```
하나의 systemField를 여러 컬럼에 매핑하는 것을 허용한다.
예: address, recipientPhone 등을 여러 컬럼에 반복 출력 가능.
필수 필드 검증은 "최소 1회 이상 매핑되었는지"만 확인한다.
```

**getValueBySystemField 매핑**:
```
systemField → PurchaseOrderItem 필드:
  matchingKey       → item.matchingKey
  orderNo           → item.orderNo
  orderItemNo       → item.orderItemNo
  supplierProductName → item.supplierProductName
  supplierProductCode → item.supplierProductCode ?? ""
  quantity          → item.quantity
  recipientName     → item.recipientName
  recipientPhone    → item.recipientPhone (format 적용)
  zipCode           → item.zipCode
  address           → item.address
  deliveryMessage   → item.deliveryMessage ?? ""
  buyerName         → item.buyerName
  buyerPhone        → item.buyerPhone (format 적용)
  empty             → null (셀 clear)
```

**전화번호 포맷 (applyPhoneFormat)**:
- `raw` → 원본 그대로
- `hyphen` → `formatHyphen()` 적용
- `digits` → `extractDigits()` 적용
- `format` 미지정 → `raw`와 동일

**StandardPurchaseOrder 조립**:
```ts
function buildPurchaseOrders(
  allocationsWithOrders: AllocationWithOrder[],
  options?: { includeStatuses?: AllocationStatus[] }
): StandardPurchaseOrder[]
```
- 기본값: `includeStatuses = ['pending', 'ordered']`
- `supplierId`별로 그룹핑
- items에 PurchaseOrderItem 매핑

> ⚠️ `pending`과 `ordered` 모두 포함해야 발주 완료 후에도 재다운로드가 가능하다.

---

### 4-6. 발주서 생성 테스트

`src/lib/generators/purchaseOrderGenerator.test.ts`

1. **템플릿 로드**: 전달받은 템플릿을 로드하고 새 워크북을 만들지 않는지
2. **데이터 시작 행**: dataStartRow부터 값이 들어가는지
3. **기존 데이터 clear**: 기존 샘플 데이터가 clear되는지
4. **empty 필드**: systemField="empty"인 셀이 null로 비워지는지
5. **columnIndex 기준**: targetColumnIndex(1-based)로 ExcelJS에 올바르게 접근하는지
6. **전화번호 포맷**: raw/hyphen/digits가 정확히 적용되는지
7. **적은 항목**: po.items < 기존 데이터 행 → 남은 행 값 clear
8. **많은 항목**: po.items > 기존 데이터 행 → 행 추가 + 스타일 복사
9. **다중 매핑**: 하나의 systemField를 여러 컬럼에 매핑 가능

---

### 4-7. 타입 확장 — nameMappingApplied

**DB 컬럼 추가 마이그레이션**:
```sql
alter table allocations
  add column name_mapping_applied boolean not null default false;
```

**타입 업데이트** (`src/types/index.ts`):
```ts
type Allocation = {
  // ... 기존 필드 ...
  nameMappingApplied: boolean
}
```

**PurchaseOrderItem 확장**:
```ts
type PurchaseOrderItem = {
  // ... 기존 필드 ...
  nameMappingApplied: boolean
}
```

관련 Zod 스키마, DB Row 타입, 변환 함수도 함께 업데이트.

**매핑 누락 판단 기준**:
- `nameMappingApplied === false` → "매핑 누락"
- `nameMappingApplied === true` → "매핑 완료"
- `supplierProductName === productName` 문자열 비교로 판단하지 않는다.

---

### 4-8~4-10. Hooks

**useAllocation** (`src/hooks/useAllocation.ts`):
- `runAutoAllocation()`: product_mappings + name_mappings + suppliers 로드 → autoAllocator → DB 저장
- `updateGroupSupplier(orderIds, newSupplierId, mode)`: 그룹 내 모든 allocation 업데이트 + 매핑 변경
- `assignUnmatched(orderId, supplierId)`: allocation 생성 + product_mapping 자동 추가
- `distributeGroup(productName, optionName, distribution)`: 기존 allocation 삭제 → 새 allocation 생성
- 자동 배정: allocation이 없고 orders가 있을 때만 실행, 이미 있으면 실행 안 함

**useSupplierTemplate** (`src/hooks/useSupplierTemplate.ts`):
- `saveTemplate(input)`: Storage 업로드 → DB upsert → 기존 파일 삭제 → toast
- `deleteTemplate(templateId)`: DB + Storage 삭제 → toast

**usePurchaseOrder** (`src/hooks/usePurchaseOrder.ts`):
- `downloadOne(supplierId)`: template → Storage 파일 → generatePurchaseOrderExcel → 브라우저 다운로드
- `downloadAll()`: 템플릿 있는 공급처 순차 다운로드, `DownloadAllResult` 반환
- `getValidationResult()`: `OrderCompletionValidation` 반환

```ts
type DownloadAllResult = {
  success: string[]
  failed: { supplierId: string; supplierName: string; reason: string }[]
}

type OrderCompletionValidation = {
  canComplete: boolean
  unallocatedCount: number
  missingTemplateSuppliers: string[]
}
```

---

### 4-11. 공급처 배정 페이지 UI

`src/pages/orders/SupplierAllocation.tsx` — Phase 3의 Placeholder를 교체.

> **시안 참조**: `docs/design/assign.css`, `docs/design/assign.jsx`

**작업건 status별 제한**:
- `active`: 배정/수정 가능
- `ordered`: 읽기 전용
- `completed`: 읽기 전용

**구조**:
```
상단: 탭 네비게이션 (업로드 → [공급처 배정(활성)] → 발주서 다운로드)
├─ 주문 없음: EmptyState ("주문을 먼저 업로드해주세요" + [주문 업로드] 링크)
├─ 로딩 중: LoadingSpinner
├─ 상단 알림 배너 (미분류 N건, 있을 때만)
├─ 안내 텍스트: "분배 기준: 주문 라인 단위"
├─ 필터 바: 전체 / 자동배정 / 미분류 / 수정됨
├─ 배정 요약 카드
├─ 품목+옵션 그룹 테이블 (아코디언)
│   ├─ 접힘: 상품명 / 옵션 / 주문건수 / 총수량 / 공급처(드롭다운) / 상태뱃지
│   ├─ 펼침: 개별 주문 라인 테이블
│   └─ [분배] 버튼
└─ 하단 CTA 바
    └─ 다음 버튼: 미분류 0건일 때만 활성
```

**공급처 드롭다운 변경 시** (그룹 단위 변경):

이미 배정된 그룹 → ChangeSupplierDialog:
- [오늘만 적용]: allocation.isTemporaryOverride=true, 매핑 변경 없음
- [기본 매핑도 변경]: isDefault 전환 방식 (supplier_id 직접 수정 아님)

미분류 → 바로 배정 + 실제 platform 기준 product_mapping 자동 추가

**기본 매핑 변경 정책**:
```
1. platform + productName + optionName 기준 매핑 검색
2. 기존 isDefault=true 매핑 → isDefault=false로 변경
3. newSupplierId 매핑이 이미 있으면 → isDefault=true, priority=0으로 업데이트
4. newSupplierId 매핑이 없으면 → 새 product_mapping 생성 (isDefault=true, priority=0)
5. common 매핑 직접 수정 안 함 → 실제 platform 기준 매핑 생성/수정
```

---

### 4-12. 주문 라인 분배 모달

**DistributionDialog**:
```
"참외 5kg 가정용 — 총 100건 분배"
A업체: [60] 건  /  B업체: [40] 건
합계: 100건 ✅
```
- "건"은 주문 라인 건수 (수량 아님)
- 합계 불일치 → [적용] 비활성
- `replaceAllocationsForGroup` 호출: 각 orderId당 정확히 1개 allocation

---

### 4-13. 발주서 다운로드 페이지 UI

`src/pages/orders/OrderDownload.tsx` — Phase 3의 Placeholder를 교체.

- `ordered` 상태에서도 **재다운로드 가능**
- 매핑 누락 판단: `nameMappingApplied=false` 기준
- downloadAll: 성공/실패 수집 후 결과 표시

**발주 완료 처리 흐름**:
- 미배정 주문 → **차단**
- 양식 미등록 공급처 → 경고 + "수동 발주 완료했습니다" **체크박스** 확인 후 완료 가능
- `complete_order_session` RPC 트랜잭션 호출

---

### 4-14. 양식 관리 페이지

`src/pages/settings/SupplierTemplate.tsx` — Phase 1의 Placeholder를 교체.

양식 등록 흐름: 파일 업로드 → 시트/행 설정 → 컬럼 매핑 → 저장

**필수 필드 미매핑 시 저장 차단**:
- 필수: `matchingKey`, `supplierProductName`, `quantity`, `recipientName`, `recipientPhone`, `address`
- 권장 (경고만): `orderNo`, `orderItemNo`, `supplierProductCode`, `zipCode`, `deliveryMessage`, `buyerName`, `buyerPhone`

---

### 4-15~4-18. 기반 작업

- **4-15**: 라우팅 업데이트 (Placeholder → 실제 컴포넌트)
- **4-16**: `npm install exceljs` (쓰기 전용)
- **4-17**: `OrderTabs.tsx` 공통 컴포넌트
- **4-18**: `src/utils/download.ts` — `downloadBlob` 유틸, 파일명: `{supplierName}_발주서_{YYYYMMDD}.xlsx`

---

## 데이터 흐름 정리

### 공급처 배정 페이지 진입 시
```
페이지 진입 → workSession 로드 → orders 로드 → allocations 로드
    ↓
allocations 비어있고 orders 있으면 → 자동 배정 실행
    → product_mappings + name_mappings + suppliers 로드
    → autoAllocator → AllocationResult
    → allocated만 createAllocations → DB 저장
    → unmatched는 미분류 표시
    → allocationsWithOrders 재조회
    ↓
품목+옵션 그룹으로 그룹핑 → UI 렌더링
```

### 발주서 다운로드 흐름
```
[엑셀 다운로드] → supplierId 필터
    → buildPurchaseOrders({ includeStatuses: ['pending', 'ordered'] })
    → getSupplierTemplate → downloadTemplateFile
    → generatePurchaseOrderExcel (기존 데이터 clear → 새 데이터 작성)
    → downloadBlob
```

### 발주 완료 처리 흐름
```
[발주 완료 처리] → 사전 검증 (미배정 차단, 양식 미등록 경고)
    → OrderCompleteDialog (체크박스 포함)
    → complete_order_session RPC (트랜잭션)
    → 성공 toast → 페이지 refetch → 읽기 전용 + 재다운로드 가능
```

---

## 엣지케이스 처리

### 자동 배정
- 매핑 전혀 없음 → 전부 미분류 (allocation 없음, 재진입 시 자동 배정 재실행)
- 비활성 공급처 매핑 → 배정에 포함, UI에서 비활성 뱃지 표시

### 공급처 변경
- "기본 매핑도 변경" → isDefault 전환 방식 (supplier_id 직접 수정 아님, unique 충돌 방지)
- common 매핑 직접 수정 안 함 → 실제 platform 기준 매핑 생성/수정
- 미분류 수동 배정 → 실제 platform 기준 product_mapping 자동 추가

### 발주서 생성
- 템플릿 기존 데이터 clear → 남은 샘플 데이터 없음 보장
- systemField="empty" → 셀 값 null로 clear (아무것도 안 하는 것이 아님)
- po.items < 기존 행 → 남은 행 값 clear
- po.items > 기존 행 → 행 추가 + 스타일 복사

### 발주 완료
- 미배정 주문 → 차단
- 양식 미등록 → 체크박스 확인 후 완료 가능
- 이미 ordered → RPC no-op, UI 버튼 비활성
- 발주 완료 후 → buildPurchaseOrders가 ordered 포함하므로 재다운로드 가능

### 양식 등록
- 필수 필드 미매핑 → **저장 차단**
- Storage 교체: 새 파일 업로드 → DB upsert → 기존 파일 삭제 (유실 방지)
- downloadAll 실패 → 성공/실패 결과 수집 후 표시

---

## 완료 기준

### 파일 존재
- [ ] `src/lib/allocation/autoAllocator.ts` — autoAllocate 함수
- [ ] `src/lib/allocation/autoAllocator.test.ts` — 테스트 17개 이상, 전체 통과
- [ ] `src/lib/generators/purchaseOrderGenerator.ts` — generatePurchaseOrderExcel 함수
- [ ] `src/lib/generators/purchaseOrderGenerator.test.ts` — 테스트 9개 이상, 전체 통과
- [ ] `src/lib/supabase/allocations.ts` — createAllocations, getAllocations, updateGroupSupplier, replaceAllocationsForGroup, completeOrder, getUnallocatedOrders
- [ ] `src/lib/supabase/supplierTemplates.ts` — 6개 함수
- [ ] `src/hooks/useAllocation.ts`, `useSupplierTemplate.ts`, `usePurchaseOrder.ts`
- [ ] `src/pages/orders/SupplierAllocation.tsx`, `OrderDownload.tsx`
- [ ] `src/pages/settings/SupplierTemplate.tsx`
- [ ] `src/components/OrderTabs.tsx`
- [ ] `src/utils/download.ts`

### DB 마이그레이션
- [ ] `allocations` 테이블에 `name_mapping_applied boolean not null default false` 컬럼 추가
- [ ] `complete_order_session(uuid)` RPC 함수 생성

### 자동 배정 로직
- [ ] ProductMapping 검색 우선순위 정확 (platform exact → common → isDefault → priority → createdAt)
- [ ] common ProductMapping은 exact platform이 없을 때만 사용
- [ ] NameMapping 검색 동작 (platform 우선순위 포함)
- [ ] NameMapping 없으면 원본 fallback + nameMappingApplied=false
- [ ] NameMapping 있으면 변환 + nameMappingApplied=true
- [ ] 비활성 공급처 매핑도 배정에 포함
- [ ] Allocation에 스냅샷 저장 (supplierId, supplierProductName, supplierProductCode)
- [ ] Allocation.allocatedQuantity === order.quantity (항상 동일)
- [ ] 순수 함수 (DB 호출 없음)
- [ ] 테스트 17개 이상 전체 통과

### 공급처 배정 UI
- [ ] 품목+옵션 그룹 아코디언
- [ ] 그룹 단위 공급처 변경 (단건 아닌 그룹)
- [ ] "오늘만 적용" → isTemporaryOverride=true, 매핑 변경 없음
- [ ] "기본 매핑도 변경" → isDefault 전환 방식 (supplier_id 직접 수정 아님)
- [ ] 미분류 → 실제 platform 기준 product_mapping 자동 추가
- [ ] 필터 동작
- [ ] 주문 라인 분배 모달: 건수(라인 수) 기준, 합계 검증
- [ ] replaceAllocationsForGroup: 각 orderId당 정확히 1개 allocation
- [ ] 하단 CTA: 미분류 0건일 때만 "다음" 활성
- [ ] ordered/completed → 읽기 전용

### 발주서 다운로드 UI
- [ ] 매핑 누락 판단: nameMappingApplied=false 기준 (문자열 비교 아님)
- [ ] buildPurchaseOrders: pending/ordered 모두 포함 (재다운로드 지원)
- [ ] 발주 완료 후 ordered 상태에서도 재다운로드 가능
- [ ] downloadAll: 성공/실패 수집 후 결과 표시
- [ ] 발주 완료: RPC 트랜잭션으로 처리
- [ ] 미배정 주문 → 완료 차단
- [ ] 양식 미등록 → 수동 발주 확인 체크 후 완료 가능

### 양식 관리
- [ ] 동일 systemField 여러 컬럼 매핑 허용
- [ ] 필수 필드 미매핑 시 저장 차단 (matchingKey, supplierProductName, quantity, recipientName, recipientPhone, address)
- [ ] 저장: 새 파일 업로드 → DB upsert → 기존 파일 삭제 (순서 보장)

### 발주서 엑셀 생성
- [ ] ExcelJS로 템플릿 로드 (새 워크북 생성 아님)
- [ ] 기존 데이터 영역 clear 후 새 데이터 작성
- [ ] systemField="empty" → 셀 값 null로 clear
- [ ] po.items < 기존 행 → 남은 샘플 데이터 제거
- [ ] po.items > 기존 행 → 행 추가 + 첫 번째 데이터 행 스타일 복사
- [ ] targetColumnIndex(1-based) 매핑
- [ ] 동일 systemField 여러 컬럼 매핑 지원
- [ ] 전화번호 포맷 변환
- [ ] matchingKey 포함
- [ ] 파일명: `{supplierName}_발주서_{YYYYMMDD}.xlsx`
- [ ] 테스트 9개 이상 전체 통과

### DB 제약 확인
- [ ] allocations 테이블에 unique(order_id) 제약 존재
- [ ] replaceAllocationsForGroup은 각 orderId당 정확히 1개 allocation

### 빌드 / 린트 / 테스트
- [ ] `npm run build` 성공
- [ ] `npm run typecheck` 성공
- [ ] `npm run lint` 에러 없음
- [ ] `npm run test:run` 전체 통과

---

## 이 Phase에서 하지 않는 것

- ❌ 운송장 파싱/매칭 (Phase 5)
- ❌ 운송장 업로드/매칭 결과/플랫폼 다운로드 UI (Phase 5)
- ❌ 플랫폼 운송장 양식 관리 (Phase 5)
- ❌ 대시보드 (Phase 6)
- ❌ 발주서 전체 ZIP 다운로드
- ❌ 발주서 이메일 전송 / PDF 출력
- ❌ 배정 이력/로그 관리
- ❌ 공급처 간 자동 분배 (수동만)
- ❌ 자동 배정 실행 이력 관리 (추후 필요 시 추가)
