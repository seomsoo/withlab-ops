# REF: 데이터 모델

> 모든 Phase에서 참조하는 도메인 타입 정의. 구현 시 `src/types/index.ts`에 작성.

## 1. StandardOrder (주문 원본 — 불변)

플랫폼 주문 데이터를 통일된 형태로 변환한 것. 파싱 후 변경하지 않음.

```ts
type StandardOrder = {
  id: string                   // uuid
  platform: "coupang" | "toss"
  orderNo: string              // 플랫폼 주문번호
  orderItemNo: string          // 쿠팡: orderNo와 동일 / 토스: 주문상품번호 (별도값)
  matchingKey: string          // 운송장 매칭 기준 — 쿠팡: orderNo / 토스: orderItemNo
  orderDate: string

  productName: string          // 등록상품명(쿠팡) / 상품명(토스)
  optionName: string           // 등록옵션명(쿠팡) / 옵션명(토스)
  quantity: number             // 1 이상 정수

  buyerName: string
  buyerPhone: string           // 원본 그대로 (하이픈 포함 가능)
  buyerPhoneDigits: string     // 숫자만 추출

  recipientName: string
  recipientPhone: string
  recipientPhoneDigits: string
  zipCode: string
  address: string
  deliveryMessage: string

  raw: Record<string, unknown>  // { 컬럼명: 값 } — 디버깅용
  rawValues: unknown[]          // [셀값, 셀값, ...] — 운송장 출력 시 원본 복원용
  rawRowNumber: number          // 원본 엑셀 행 번호 (에러 표시용)
}
```

### ⚠️ matchingKey 규칙 (가장 중요)
| 플랫폼 | matchingKey 출처 | 이유 |
|--------|-----------------|------|
| 쿠팡 | `주문번호` | 쿠팡은 상품마다 주문번호가 따로 발급 |
| 토스 | `주문상품번호` | 토스는 1주문에 여러 상품 → 주문번호만으로는 구분 불가 |

---

## 2. Allocation (공급처 배정)

주문 1건 : 배정 1건 (1:1). 수량 분할 금지 — DB unique(order_id)로 강제.

```ts
type Allocation = {
  id: string
  orderId: string              // → StandardOrder.id
  supplierId: string           // → Supplier.id
  supplierProductName: string  // 공급처가 인식하는 상품명 (name_mappings에서 변환)
  supplierProductCode?: string // 공급처 상품코드 (optional)
  allocatedQuantity: number    // = order.quantity (항상 동일)
  status: "pending" | "ordered"
  isTemporaryOverride: boolean // true = "오늘만 변경"
  createdAt: string
  orderedAt?: string           // 발주 완료 처리 시점
}
```

### 수량 분배 정책
- **허용**: 같은 품목 주문 100건 중 60건→A, 40건→B (주문 라인 단위 배분)
- **금지**: 1건의 수량 3개를 A 2개 + B 1개로 쪼개기

---

## 3. Tracking (운송장)

```ts
type Tracking = {
  id: string
  allocationId: string | null  // null이면 미매칭
  status: "matched" | "unmatched" | "duplicated" | "invalid"
  invalidReason?: string

  trackingCompany: string      // 공급처 원본 택배사명 (변환은 출력 시점에)
  trackingNumber: string

  sourceSupplierId: string     // 어느 공급처에서 받은 운송장인지
  rawOrderKey: string          // 매칭 시도한 원본 키 값

  raw: Record<string, unknown>
  rawRowNumber: number
  uploadedAt: string
  matchedAt?: string
}
```

---

## 4. StandardPurchaseOrder (발주서 — 출력용)

Allocation들을 공급처별로 그룹핑한 것. DB 저장 아닌 메모리상 조립.

```ts
type StandardPurchaseOrder = {
  id: string
  supplierId: string
  supplierName: string
  createdAt: string
  items: PurchaseOrderItem[]
}

type PurchaseOrderItem = {
  allocationId: string
  orderId: string
  platform: "coupang" | "toss"
  orderNo: string
  orderItemNo: string
  matchingKey: string          // 발주서에 반드시 포함 → 운송장 매칭 기준

  supplierProductName: string
  supplierProductCode?: string
  quantity: number

  recipientName: string
  recipientPhone: string
  zipCode: string
  address: string
  deliveryMessage: string
  buyerName: string
  buyerPhone: string
}
```

---

## 5. StandardTrackingExport (운송장 출력용)

매칭된 운송장을 플랫폼별로 그룹핑. 역시 메모리상 조립.

```ts
type StandardTrackingExport = {
  id: string
  platform: "coupang" | "toss"
  createdAt: string
  items: TrackingExportItem[]
}

type TrackingExportItem = {
  trackingId: string
  orderId: string
  orderNo: string
  orderItemNo: string
  matchingKey: string
  trackingCompany: string      // 플랫폼용으로 변환된 택배사명
  trackingNumber: string
  originalRow: Record<string, unknown>
  originalRowValues: unknown[] // 원본 셀 배열 (양식 복원용)
  originalRowNumber: number
}
```

---

## 6. 설정/매핑 모델

### Supplier (공급처)
```ts
type Supplier = {
  id: string
  name: string
  contact?: string
  memo?: string
  isActive: boolean            // false = 소프트 삭제
  createdAt: string
  updatedAt: string
}
```

### ProductMapping (품목→공급처)
```ts
type ProductMapping = {
  id: string
  platform: "coupang" | "toss" | "common"  // common = 양쪽 공통
  productName: string          // 플랫폼 상품명
  optionName: string           // 플랫폼 옵션명 (빈 문자열 가능)
  supplierId: string
  isDefault: boolean           // 자동 배정 대상
  priority: number             // 낮을수록 우선
  createdAt: string
  updatedAt: string
}
```

### NameMapping (상품명 변환)
```ts
type NameMapping = {
  id: string
  platform: "coupang" | "toss" | "common"
  platformProductName: string
  platformOptionName: string
  supplierId: string
  supplierProductName: string  // 공급처가 인식하는 상품명
  supplierProductCode?: string // 공급처 상품코드
  createdAt: string
  updatedAt: string
}
```

### CourierMapping (택배사 매핑)
```ts
type CourierMapping = {
  id: string
  sourceSupplierId: string
  sourceName: string           // 공급처 운송장에 적힌 이름 (예: "CJ대한통운")
  coupangName: string          // 쿠팡이 받는 정식명 (예: "CJ 대한통운")
  tossName: string             // 토스가 받는 정식명
  createdAt: string
}
```

### SupplierTemplate (공급처 발주서 양식)
```ts
type ColumnMappingItem = {
  targetColumnIndex: number    // 1-based
  targetHeaderName: string     // UI 표시용
  systemField: SystemField     // 아래 enum 참조
  format?: "raw" | "hyphen" | "digits"  // 전화번호 전용
}

type SystemField =
  | "matchingKey" | "orderNo" | "orderItemNo"
  | "supplierProductName" | "supplierProductCode"
  | "quantity" | "recipientName" | "recipientPhone"
  | "zipCode" | "address" | "deliveryMessage"
  | "buyerName" | "buyerPhone" | "empty"

type SupplierTemplate = {
  id: string
  supplierId: string
  templatePath: string         // Supabase Storage 경로
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  columnMappings: ColumnMappingItem[]
}
```

### PlatformTrackingTemplate (플랫폼 운송장 양식)
```ts
type PlatformTrackingTemplate = {
  id: string
  platform: "coupang" | "toss"
  templatePath: string
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  matchKeyColumnIndex: number
  matchKeyColumnName: string
  trackingCompanyColumnIndex: number
  trackingCompanyColumnName: string
  trackingNumberColumnIndex: number
  trackingNumberColumnName: string
  statusColumnIndex?: number   // 토스 전용
  statusColumnName?: string
  statusValue?: string         // 토스: "배송중"
}
```

---

## 7. WorkSession (작업건)
```ts
type WorkSession = {
  id: string
  name: string                 // 자동 생성 예: "2026-05-08 오전 발주"
  status: "active" | "ordered" | "completed"
  createdAt: string
  createdBy?: string
  completedAt?: string
}
```

상태 전이: `active → ordered (발주 완료) → completed (운송장 완료, 선택)`

---

## 8. ParseResult (파싱 결과)
```ts
type InvalidRow = {
  rowIndex: number             // 엑셀 행 번호
  reason: string               // "수량 파싱 실패" 등
  raw: Record<string, unknown>
}

type ParseResult = {
  orders: StandardOrder[]
  invalidRows: InvalidRow[]
}
```

---

## DB ↔ TS 변환 규칙

DB 컬럼은 `snake_case`, TS 타입은 `camelCase`.
Supabase API 레이어(`src/lib/supabase/`)에서 변환 함수를 두고, 컴포넌트는 항상 camelCase로만 작업.

```ts
// 예시
function toSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact ?? undefined,
    memo: row.memo ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```
