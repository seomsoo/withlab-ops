# Phase 3: 주문 업로드 + 파싱

## 목표
작업건(WorkSession) 관리, 쿠팡/토스 주문 엑셀 파싱 로직 구현 및 테스트, 주문 업로드 페이지 UI를 완성한다. 파싱된 주문 데이터는 Supabase에 저장되며, 재업로드/중복 감지/플랫폼 자동 감지를 지원한다.

> ⚠️ 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> `docs/design/` 시안 파일은 **디자인(색상, 간격, 스타일)의 참조**로만 사용한다.
> 구조, 필드 구성, 기능 범위는 **스펙 문서가 우선**이며 시안과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 2 ✅ 검증 통과

---

## 참조 문서

| 문서 | 참조 범위 |
|------|----------|
| `docs/REF_엑셀_구조.md` | 쿠팡/토스 전체 컬럼 인덱스, 시트명, 헤더 위치, 샘플 데이터 |
| `docs/REF_데이터_모델.md` | StandardOrder, WorkSession, OrderImport, InvalidRow, ParseResult 타입 |
| `docs/REF_DB_스키마.md` | work_sessions, order_imports, orders 테이블 + 제약조건 |
| `docs/REF_디자인_시스템.md` | 디자인 토큰, 컴포넌트 className 패턴 |
| `src/lib/parsers/CLAUDE.md` | 파서 구현 규칙 (SheetJS 읽기, 반환 형태, 빈 행 처리 등) |
| `src/lib/schemas/CLAUDE.md` | Zod 스키마 검증 규칙 |

---

## 주문 라인 단위 정의

> `orders` 테이블의 **1 row = 주문 라인 1개**를 의미한다. 플랫폼 주문 1건이 아니다.
>
> - 쿠팡: 한 주문번호에 여러 배송 묶음 가능 → 묶음배송번호로 행 구분
> - 토스: 1주문에 여러 상품 가능 → 주문번호 동일 + 주문상품번호 다름 = **서로 다른 주문 라인**
>
> DB unique 제약: `unique(work_session_id, platform, matching_key)`

---

## 시안 참조 가이드

| 구현 대상 | 참조 시안 파일 | 참조 범위 |
|----------|--------------|----------|
| 주문 업로드 | `docs/design/app.jsx`, `docs/design/styles.css` | 업로드 카드 2개 가로 배치, 파싱 결과 테이블, 하단 CTA 바 |

> **주의**: 시안의 탭 구조(업로드/배정/다운로드 3탭)는 Phase 3에서 "업로드" 탭만 구현한다.
> 배정/다운로드 탭은 Phase 4에서 구현하므로, 탭 UI 자체는 만들되 해당 탭은 비활성 또는 placeholder로 둔다.

---

## API / Hook / Page 책임 분리 원칙

이 Phase 전체에 적용되는 원칙:

- **Supabase API 함수**: Supabase 호출 → snake_case ↔ camelCase 변환 → Zod 검증 → 실패 시 Error throw. **toast를 호출하지 않는다.**
- **Hook**: API 호출 → loading/error 상태 관리 → toast 표시 → 에러 재throw
- **Page**: 파일 선택 UI → ConfirmDialog 표시 → 업로드 plan 보관 → 성공/실패에 따른 UI 제어

---

## 작업 목록

### 3-1. DB 스키마 보완 — order_imports 컬럼 추가

기존 `order_imports` 테이블에 업로드 결과를 저장하는 컬럼을 추가한다.
새로고침 후에도 오류 행/중복 행을 다시 확인할 수 있도록 하기 위함.

```sql
alter table order_imports
  add column total_rows integer not null default 0,
  add column valid_count integer not null default 0,
  add column invalid_count integer not null default 0,
  add column duplicate_count integer not null default 0,
  add column invalid_rows jsonb not null default '[]',
  add column duplicate_rows jsonb not null default '[]';
```

> 관련 타입(`OrderImport`, `OrderImportRow`, Zod 스키마, 변환 함수)도 함께 업데이트한다.

---

### 3-2. ParseResult 타입 확장

중복 주문은 invalidRow와 분리한다. `src/types/index.ts`에 추가/수정:

```ts
type ParseResult = {
  orders: StandardOrder[]
  invalidRows: InvalidRow[]
  duplicateRows: DuplicateRow[]
  meta: ParseMeta
}

type DuplicateRow = {
  rowNumber: number
  reason: string
  matchingKey: string
  firstRowNumber: number
  rawData: unknown[]
}

type ParseMeta = {
  platform: Platform
  totalRows: number      // valid + invalid + duplicate (스킵 제외)
  skippedRows: number    // 빈 행 스킵 수
  validRows: number
  invalidRows: number
  duplicateRows: number
}
```

기존 `InvalidRow`는 그대로 유지:
```ts
type InvalidRow = {
  rowNumber: number
  reason: string
  rawData: unknown[]
}
```

**중복 처리 정책**:
- `orders`에는 중복이 아닌 정상 주문만 포함
- 같은 파일 내 동일 `platform + matchingKey`가 2회 이상 → 첫 번째만 `orders`, 나머지는 `duplicateRows`
- 중복 감지는 **파서 단계에서 완료** — DB unique 제약은 최후의 안전장치
- **주의**: 토스에서 주문번호가 같고 주문상품번호가 다른 2건은 중복이 아니라 별개 주문 라인

---

### 3-3. Supabase API 함수 — WorkSession

`src/lib/supabase/workSessions.ts`:

```ts
async function createWorkSession(name: string): Promise<WorkSession>
async function getWorkSessions(): Promise<WorkSession[]>           // 최신순 정렬
async function getWorkSession(id: string): Promise<WorkSession>
async function updateWorkSessionStatus(
  id: string,
  status: WorkSessionStatus
): Promise<void>
```

**DB 테이블**: `work_sessions`
- `status` check: `'active' | 'ordered' | 'completed'`
- `completed_at`: status가 'completed'로 변경될 때 `now()` 설정
- 조회 시 `WorkSessionRow` → `toWorkSession()` 변환

**작업건 이름 자동 생성 규칙**:
- 형식: `YYYY-MM-DD 오전/오후` (예: `2026-05-10 오전`)
- **Asia/Seoul 기준** 12시 기준 오전/오후 구분
- 사용자가 원하면 직접 입력 가능
- 같은 이름 중복 허용 — UI에서 생성일시를 함께 표시

---

### 3-4. Supabase API 함수 — OrderImport + Orders

`src/lib/supabase/orders.ts`:

```ts
type CreateOrderImportInput = {
  workSessionId: string
  platform: Platform
  fileName: string
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  invalidRows: InvalidRow[]
  duplicateRows: DuplicateRow[]
}

async function createOrderImport(
  input: CreateOrderImportInput
): Promise<OrderImport>

async function saveOrders(
  workSessionId: string,
  orderImportId: string,
  orders: StandardOrder[]
): Promise<void>

async function getOrders(workSessionId: string): Promise<StandardOrder[]>
async function getOrderImports(workSessionId: string): Promise<OrderImport[]>
async function deleteOrderImport(orderImportId: string): Promise<void>
```

**DB 제약조건 주의**:
- `order_imports`: `unique(work_session_id, platform)` — 같은 작업건에 같은 플랫폼 파일 1개만
- `orders`: `unique(work_session_id, platform, matching_key)` — 주문 라인 중복 방지
- `order_imports → orders`: `on delete cascade` — OrderImport 삭제 시 소속 orders도 삭제

**saveOrders 구현 주의**:
- `StandardOrder` → `OrderRow` 변환 (camelCase → snake_case)
- `StandardOrder.id`를 DB `orders.id`에 그대로 저장 (클라이언트 생성 UUID 유지)
- `raw`와 `rawValues`는 jsonb로 저장
- 대량 insert: Supabase `insert(rows)` 한 번에 (250건 수준이므로 단일 호출 가능)
- **빈 배열이면 insert를 호출하지 않는다**: `if (orders.length === 0) return`
- insert 전 Zod 검증: `standardOrderSchema.array().parse(orders)`

---

### 3-5. 쿠팡 주문 엑셀 파서

`src/lib/parsers/coupangParser.ts`:

```ts
function parseCoupangOrders(workbook: WorkBook): ParseResult
```

**파싱 규칙** (`docs/REF_엑셀_구조.md` 기준):

| 항목 | 값 |
|------|-----|
| 시트명 | `Delivery` |
| 헤더 | 1행 |
| 데이터 시작 | 2행 |
| 총 컬럼 수 | 40개 |

**시트 검증**: `Delivery` 시트가 없으면 에러를 throw한다:
```
"쿠팡 주문 시트(Delivery)를 찾을 수 없습니다"
```
빈 결과를 반환하지 않는다.

**컬럼 매핑 (0-indexed)**:
```
idx  2: 주문번호       → orderNo, orderItemNo, matchingKey
idx  9: 주문일         → orderDate
idx 10: 등록상품명     → productName
idx 11: 등록옵션명     → optionName
idx 22: 구매수(수량)   → quantity
idx 24: 구매자         → buyerName
idx 25: 구매자전화번호  → buyerPhone, buyerPhoneDigits
idx 26: 수취인이름     → recipientName
idx 27: 수취인전화번호  → recipientPhone, recipientPhoneDigits
idx 28: 우편번호       → zipCode
idx 29: 수취인 주소    → address
idx 30: 배송메세지     → deliveryMessage
```

**핵심 규칙**:
1. `platform`은 고정값 `"coupang"`
2. 쿠팡은 `orderNo = 주문번호`, `orderItemNo = matchingKey = 묶음배송번호`
3. `quantity`: `cellToInt()` 사용 → `null`이면 invalidRow, 0 이하면 invalidRow
4. 빈 행 판정: `orderNo`와 `productName` 모두 빈 문자열 → 스킵 (invalidRow 아님, `meta.skippedRows`에만 카운트)
5. `orderNo` 또는 `productName` 둘 중 하나만 비어있으면 → invalidRow (사유: "주문번호 또는 상품명 누락")
6. `recipientName`이 빈 문자열이면 → invalidRow (사유: "수취인 이름 누락")
7. `address`가 빈 문자열이면 → invalidRow (사유: "주소 누락")
8. `recipientPhone`이 빈 문자열이면 → invalidRow (사유: "수취인 전화번호 누락")
9. `extractDigits(recipientPhone).length < 8`이면 → invalidRow (사유: "수취인 전화번호 형식 오류")
   - 안심번호(0502/0504/0508 등) 고려하여 최소 8자리만 검증
10. 전화번호: 원본 그대로 `buyerPhone`/`recipientPhone`에 저장, `extractDigits()`로 숫자만 추출해서 `*PhoneDigits`에 저장
11. **표준 필드는 trim 적용** (`orderNo`, `productName`, `optionName`, `recipientName`, `address` 등)
12. `raw`: `{ 주문번호: "...", 등록상품명: "...", ... }` 형태 — 헤더명을 키로 사용
13. `rawValues`: 40개 셀의 값 배열, **trim 적용하지 않음** (엑셀 원본 보존)
14. `rawValues` 고정 길이 보장: SheetJS가 trailing empty cell을 누락할 수 있으므로 padding 적용
    ```ts
    function normalizeRowValues(row: unknown[], columnCount: number): unknown[] {
      return Array.from({ length: columnCount }, (_, i) => row[i] ?? null)
    }
    ```
15. `rawRowNumber`: 엑셀 행 번호 (1-based, 데이터 첫 행=2)
16. `id`: 파싱 시점에 `crypto.randomUUID()` 생성 → DB `orders.id`에 동일하게 저장
17. **파일 내 중복 감지**: 파싱 완료 후 `matchingKey` 기준으로 중복 체크 → 첫 번째만 `orders`, 나머지는 `duplicateRows`에 분리

---

### 3-6. 토스 주문 엑셀 파서

`src/lib/parsers/tossParser.ts`:

```ts
function parseTossOrders(workbook: WorkBook): ParseResult
```

**파싱 규칙** (`docs/REF_엑셀_구조.md` 기준):

| 항목 | 값 |
|------|-----|
| 시트명 | `주문내역` |
| 1행 | 안내문구 → **스킵** |
| 2행 | 그룹 헤더 → **스킵** |
| 3행 | **진짜 컬럼 헤더** |
| 4행 | "수정 가능/불가" 표시 → **스킵** |
| 데이터 시작 | **5행** |
| 총 컬럼 수 | 30개 |

**시트 검증**: `주문내역` 시트가 없으면 에러를 throw한다:
```
"토스 주문 시트(주문내역)를 찾을 수 없습니다"
```

**컬럼 매핑 (0-indexed, 3행 헤더 기준)**:
```
idx  0: 주문일시       → orderDate
idx  1: 주문번호       → orderNo
idx  2: 주문상품번호   → orderItemNo, matchingKey  ★ 핵심!
idx  8: 상품명         → productName
idx 11: 옵션명         → optionName
idx 12: 주문건수       → quantity
idx 15: 구매자명       → buyerName
idx 16: 구매자 연락처   → buyerPhone, buyerPhoneDigits
idx 17: 수령인명       → recipientName
idx 18: 수령인 연락처   → recipientPhone, recipientPhoneDigits
idx 19: 배송지         → address
idx 20: 우편번호       → zipCode
idx 21: 주문요청사항   → deliveryMessage
```

**핵심 규칙**:
1. `platform`은 고정값 `"toss"`
2. **⚠️ matchingKey = 주문상품번호 (idx 2), 주문번호(idx 1)가 아님!**
   - 토스는 1주문에 여러 상품 가능 → 주문번호만으로 개별 상품을 구분할 수 없음
3. `orderNo`와 `orderItemNo`가 다른 값 (쿠팡과 다름)
4. 빈 행 판정: `matchingKey`(주문상품번호)와 `productName` 모두 빈 문자열 → 스킵
5. 둘 중 하나만 비어있으면 → invalidRow
6. 나머지 검증 규칙은 쿠팡과 동일 (quantity, recipientName, address, recipientPhone)
7. 토스 전화번호는 하이픈 없음 (예: `050877183460`) — 원본 그대로 저장
8. `rawValues`: 30개 셀 고정 길이 (`normalizeRowValues` 적용)
9. `rawRowNumber`: 엑셀 행 번호 (1-based, 데이터 첫 행 = 5)
10. **중복 감지 주의**: 주문번호가 같아도 주문상품번호가 다르면 **별개 주문 라인** (중복 아님)

---

### 3-7. 플랫폼 자동 감지

`src/lib/parsers/platformDetector.ts`:

```ts
type DetectedPlatform = 'coupang' | 'toss' | null

function detectPlatform(workbook: WorkBook): DetectedPlatform
```

**감지 로직**:
1. 시트 이름이 `Delivery`이고, 1행에 `번호`, `묶음배송번호`, `주문번호` 중 2개 이상 존재 → `"coupang"`
2. 시트 이름이 `주문내역`이고, 3행에 `주문일시`, `주문번호`, `주문상품번호` 중 2개 이상 존재 → `"toss"`
3. 어느 쪽에도 해당 안 되면 → `null`

**주의**: 컬럼명 비교 시 `trim()` 적용.

감지 실패 시 (`null`) UI에서 사용자에게 안내: "지원하지 않는 파일 형식입니다."

> `detectPlatform()`은 UI 편의를 위한 사전 감지이며, 각 파서 내부의 시트 존재 검증을 대체하지 않는다.

---

### 3-8. 테스트 작성

#### 쿠팡 파서 테스트
`src/lib/parsers/coupangParser.test.ts`:

```ts
describe('parseCoupangOrders', () => {
  // 정상 케이스
  it('정상: 기본 주문 1건 파싱', () => { ... })
  it('정상: 여러 건 파싱', () => { ... })
  it('정상: matchingKey와 orderItemNo는 묶음배송번호', () => { ... })

  // 필드 검증
  it('정상: 전화번호 원본 보존 + digits 추출', () => { ... })
  it('정상: rawValues에 40개 셀 고정 길이로 저장 (trailing empty padding)', () => { ... })
  it('정상: rawRowNumber에 엑셀 행 번호 저장 (2부터)', () => { ... })
  it('정상: 표준 필드는 trim, rawValues는 원본 보존', () => { ... })

  // 빈 행 / invalidRow
  it('스킵: orderNo + productName 모두 비어있는 행', () => { ... })
  it('에러: orderNo만 비어있는 행 → invalidRow', () => { ... })
  it('에러: productName만 비어있는 행 → invalidRow', () => { ... })
  it('에러: quantity가 NaN → invalidRow', () => { ... })
  it('에러: quantity가 0 이하 → invalidRow', () => { ... })
  it('에러: recipientName 빈 문자열 → invalidRow', () => { ... })
  it('에러: address 빈 문자열 → invalidRow', () => { ... })
  it('에러: recipientPhone 빈 문자열 → invalidRow', () => { ... })
  it('에러: recipientPhoneDigits 길이 8 미만 → invalidRow', () => { ... })

  // 중복
  it('중복: 같은 matchingKey 2건 → 첫 번째만 orders, 두 번째는 duplicateRows', () => { ... })

  // 구조 검증
  it('에러: Delivery 시트 없으면 throw', () => { ... })
  it('정상: 빈 파일 (데이터 행 0건) → orders 빈 배열', () => { ... })

  // meta
  it('정상: meta에 totalRows/skippedRows/validRows/invalidRows/duplicateRows 정확', () => { ... })
})
```

#### 토스 파서 테스트
`src/lib/parsers/tossParser.test.ts`:

```ts
describe('parseTossOrders', () => {
  // 정상 케이스
  it('정상: 기본 주문 1건 파싱', () => { ... })
  it('정상: matchingKey는 주문상품번호 (orderItemNo)', () => { ... })
  it('정상: orderNo와 orderItemNo가 다른 값', () => { ... })

  // 토스 특수 구조
  it('정상: 1~4행 스킵, 5행부터 데이터 파싱', () => { ... })
  it('정상: 하이픈 없는 전화번호 처리', () => { ... })
  it('정상: rawValues에 30개 셀 고정 길이로 저장', () => { ... })
  it('정상: rawRowNumber는 5부터 시작', () => { ... })

  // 토스 중복 특이 케이스
  it('정상: 주문번호 같고 주문상품번호 다른 2건은 중복 아님 (별개 주문 라인)', () => { ... })
  it('중복: 주문상품번호 같은 2건 → 첫 번째만 orders', () => { ... })

  // 에러 케이스
  it('스킵: matchingKey + productName 모두 빈 행', () => { ... })
  it('에러: quantity가 NaN → invalidRow', () => { ... })
  it('에러: 주문내역 시트 없으면 throw', () => { ... })
})
```

#### 플랫폼 감지 테스트
`src/lib/parsers/platformDetector.test.ts`:

```ts
describe('detectPlatform', () => {
  it('쿠팡 파일 감지', () => { ... })
  it('토스 파일 감지', () => { ... })
  it('알 수 없는 파일 → null', () => { ... })
})
```

**테스트 데이터 생성**:
- SheetJS의 `XLSX.utils.aoa_to_sheet()`로 메모리상 워크북 생성
- 실제 샘플 파일의 컬럼 구조를 기반으로 최소 테스트 데이터 구성

---

### 3-9. 커스텀 훅 — useWorkSessions / useWorkSession

작업건 관련 훅을 목록 조회와 개별 조회로 분리한다. WorkSession은 **URL을 단일 진실**로 사용하며 전역 상태(`currentSession`)에 의존하지 않는다.

`src/hooks/useWorkSessions.ts`:

```ts
function useWorkSessions() {
  return {
    sessions: WorkSession[]
    loading: boolean
    createSession: (name: string) => Promise<WorkSession>
    refreshSessions: () => Promise<void>
  }
}
```

`src/hooks/useWorkSession.ts`:

```ts
function useWorkSession(sessionId: string | undefined) {
  return {
    session: WorkSession | null
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
  }
}
```

업로드 페이지는 `useParams()`에서 `sessionId`를 읽고, `useWorkSession(sessionId)`로 작업건을 조회한다.

---

### 3-10. 커스텀 훅 — useOrderUpload

`src/hooks/useOrderUpload.ts`:

**ConfirmDialog는 훅이 직접 표시하지 않는다.** prepare/commit 패턴으로 UI와 분리한다.

```ts
type UploadPlan = {
  file: File
  platform: Platform
  existingImport: OrderImport | null
  parseResult: ParseResult
}

function useOrderUpload(workSessionId: string) {
  return {
    // 상태
    coupangImport: OrderImport | null
    tossImport: OrderImport | null
    orders: StandardOrder[]
    loading: boolean

    // 파싱 결과 (DB에서 복원 또는 방금 파싱한 것)
    parseResult: {
      coupang: ParseResult | null
      toss: ParseResult | null
    }

    // 액션 — prepare/commit 분리
    prepareUpload: (file: File, expectedPlatform: Platform) => Promise<UploadPlan>
    commitUpload: (plan: UploadPlan, options?: { replaceExisting?: boolean }) => Promise<void>

    // 요약
    summary: {
      total: number   // valid + invalid + duplicate
      valid: number
      invalid: number
      duplicate: number
    }
  }
}
```

**prepareUpload 흐름**:
1. `validateExcelFile(file)` — 확장자/크기 검증
2. `readExcelFile(file)` — SheetJS로 워크북 로드
3. `detectPlatform(workbook)` — 플랫폼 감지
4. 감지 실패(`null`) → throw: "지원하지 않는 파일 형식입니다"
5. **expectedPlatform과 감지 결과 비교**: 불일치 → throw: "쿠팡 주문 카드에는 쿠팡 주문 엑셀만 업로드할 수 있습니다" (또는 토스)
6. `parseCoupangOrders(workbook)` 또는 `parseTossOrders(workbook)` 실행
7. 정상 주문 0건이면 throw: "저장 가능한 정상 주문이 없습니다" (invalidRows/duplicateRows는 UI에 표시하되 DB 저장은 안 함)
8. 기존 업로드 확인 (`coupangImport` 또는 `tossImport` 존재 여부)
9. `UploadPlan` 반환

**commitUpload 흐름**:
1. `replaceExisting`이면 `deleteOrderImport(existingImportId)` 실행
2. `createOrderImport(input)` — order_imports 행 생성 (결과 요약 + invalidRows/duplicateRows 포함)
3. `saveOrders(workSessionId, importId, parseResult.orders)` — orders 일괄 insert
4. **saveOrders 실패 시 보상 처리**: 방금 만든 order_import를 삭제하여 반쪽 저장 방지
5. 상태 갱신

**초기 데이터 로드** (페이지 진입 시):
1. `getOrderImports(workSessionId)` → coupangImport / tossImport 세팅
2. `getOrders(workSessionId)` → orders 세팅
3. order_imports에 저장된 `invalidRows` / `duplicateRows`로 parseResult 복원
4. summary 계산

이로써 **새로고침 후에도 업로드 완료 상태, 오류 행, 중복 행이 유지**된다.

---

### 3-11. 작업건 선택/생성 UI

`src/pages/orders/WorkSessionSelector.tsx` (또는 `/orders` 페이지):

**구성**:
- 작업건 목록 (최신순, `status='active'`만 드롭다운 또는 리스트)
- [새 작업건 만들기] 버튼
- 새 작업건: 이름 입력 모달 (기본값: `YYYY-MM-DD 오전/오후`, Asia/Seoul 기준)
- 작업건 선택 → `/orders/:sessionId/upload`로 이동

**상태 표시**:
- `active`: 진행중 (파란 뱃지)
- `ordered`: 발주완료 (초록 뱃지)
- `completed`: 완료 (회색 뱃지)

---

### 3-12. 주문 업로드 페이지 UI

`src/pages/orders/OrderUpload.tsx`:

Phase 1에서 만든 Placeholder 페이지를 교체.

**작업건 status별 제한**:
- `active`: 업로드/재업로드 가능
- `ordered`: 주문 목록 조회만 가능, 업로드 비활성, 안내: "발주 완료된 작업건은 주문을 변경할 수 없습니다"
- `completed`: 읽기 전용, 안내: "완료된 작업건은 수정할 수 없습니다"

**구성**:

#### 상단: 현재 작업건 + 탭
- 현재 작업건 이름 표시 + [작업건 변경] 링크 → `/orders`
- 탭 네비게이션: `[주문 업로드(활성)]` / `[공급처 배정(비활성)]` / `[발주서 다운로드(비활성)]`
- Phase 3에서는 "주문 업로드" 탭만 활성

#### 파일 업로드 영역 (가로 2열 배치)
- 쿠팡 주문 엑셀 카드 (`expectedPlatform='coupang'`):
  - 미업로드: 드래그앤드롭 + 파일 선택 버튼 (Phase 1의 `FileUpload` 컴포넌트 활용)
  - 업로드 중: 로딩 스피너
  - 업로드 완료: 파일명 + 파싱 건수 + [다시 업로드] 링크
- 토스 주문 엑셀 카드 (`expectedPlatform='toss'`): 동일 구조

**파일 업로드 시 UI 흐름** (Page 컴포넌트에서 제어):
1. 사용자가 파일 선택
2. `prepareUpload(file, expectedPlatform)` 호출
3. `plan.existingImport`가 있으면 ConfirmDialog: "기존 쿠팡(또는 토스) 주문 데이터 N건이 삭제되고 새 파일로 대체됩니다. 계속하시겠습니까?"
4. 확인 → `commitUpload(plan, { replaceExisting: true })`
5. 기존 없으면 → `commitUpload(plan)` 바로 실행

#### 파싱 결과 요약
- 양쪽 중 하나라도 업로드 완료 시 표시
- 요약 카드 3개: 정상 N건 / 오류 N건 / 중복 N건
- 오류 카드 클릭 → 오류 행 모달

#### 오류 행 모달
- 오류 행 목록: 행 번호 / 사유 / 원본 데이터 (주요 필드만)
- 중복 행 탭: 행 번호 / matchingKey / 첫 번째 행 번호
- 스크롤 가능 테이블

#### 주문 목록 테이블
- 컬럼: 플랫폼 (아이콘) / 주문번호 / 상품명 / 옵션 / 수량 / 수취인 / 주소 (truncate)
- 페이지네이션 (클라이언트 사이드, 20건/페이지)
- 필터: 전체 / 쿠팡 / 토스
- **정렬 기준**: 플랫폼 (coupang → toss) → rawRowNumber 오름차순

#### 하단 CTA 바 (시안의 footcta 참조)
- 좌측: 결과 요약 텍스트
  - 오류 있을 때: "⚠️ 오류 N건이 있어요. 그대로 진행하면 해당 건은 제외됩니다."
  - 오류 없을 때: "✅ 정상 N건이 다음 단계로 넘어갑니다."
- 우측: [취소] [다음: 공급처 배정 →]
- 다음 버튼 활성 조건: 정상 주문이 1건 이상
- 다음 클릭: **`/orders/:sessionId/allocation`** 으로 이동 (Phase 4에서 구현, Phase 3에서는 라우팅만)

---

### 3-13. 라우팅

기존 React Router 설정에 추가. **모든 경로에 sessionId를 포함**한다:

```
/orders                              → 작업건 목록/선택 (WorkSessionSelector)
/orders/:sessionId/upload            → 주문 업로드 (OrderUpload)
/orders/:sessionId/allocation        → 공급처 배정 (Placeholder — Phase 4)
/orders/:sessionId/download          → 발주서 다운로드 (Placeholder — Phase 4)
```

**라우트 가드**:
- `/orders/:sessionId/*` 접근 시 해당 작업건이 존재하지 않으면 `/orders`로 리다이렉트

---

## 데이터 흐름 정리

```
사용자: 엑셀 파일 드롭
    ↓
validateExcelFile(file)  → 실패 시 에러 토스트
    ↓
readExcelFile(file)      → SheetJS WorkBook
    ↓
detectPlatform(workbook) → "coupang" | "toss" | null (null이면 에러)
    ↓
expectedPlatform과 비교  → 불일치면 에러 토스트
    ↓
parseCoupangOrders() 또는 parseTossOrders()
    ↓
ParseResult {
  orders (중복 제거된 정상 주문),
  invalidRows,
  duplicateRows,
  meta
}
    ↓
정상 주문 0건이면 → UI에 결과 표시만 (DB 저장 안 함)
    ↓
기존 업로드 확인 → 있으면 페이지에서 ConfirmDialog
    ↓
확인 시 → deleteOrderImport (기존 삭제)
    ↓
createOrderImport({ summary, invalidRows, duplicateRows })
    ↓
saveOrders(orders)
    ↓
실패 시 → 방금 만든 order_import 보상 삭제
    ↓
UI 상태 갱신
```

---

## 엣지케이스 처리

### 파일 검증
- `.xlsx` / `.xls` 외 확장자 → 에러 토스트: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다"
- 10MB 초과 → 에러 토스트: "파일 크기는 10MB 이하여야 합니다"
- 빈 파일 (데이터 행 0건) → 에러 토스트: "주문 데이터가 없는 파일입니다"
- expectedPlatform 불일치 → 에러 토스트: "쿠팡 주문 카드에는 쿠팡 주문 엑셀만 업로드할 수 있습니다"

### 파싱 에러
- 시트명이 다른 경우 → 파서에서 throw ("쿠팡 주문 시트(Delivery)를 찾을 수 없습니다")
- 전체 행이 invalidRow인 경우 → 정상 주문 0건 → DB 저장 안 함 + "다음" 버튼 비활성
- 수량 셀에 소수점 (예: "1.5") → `cellToInt()`에서 `null` 반환 → invalidRow

### 재업로드
- 같은 플랫폼 재업로드 → ConfirmDialog: "기존 쿠팡(또는 토스) 주문 데이터 N건이 삭제되고 새 파일로 대체됩니다. 계속하시겠습니까?"
- 확인 → 기존 삭제 후 새 업로드 진행
- 취소 → 아무 동작 없음
- **순서**: 새 파일 파싱 성공 확인 → 사용자 확인 → 기존 삭제 → 새 데이터 저장 (파싱 실패 시 기존 데이터 보존)
- **보상 처리**: saveOrders 실패 시 방금 만든 order_import 삭제하여 반쪽 저장 방지

### 중복 주문
- 같은 파일 내 중복 (`platform + matchingKey`가 2회 이상 등장):
  - 첫 번째 건만 `orders`, 나머지는 `duplicateRows`
  - DB insert 대상은 `orders`만
- 토스 특이 케이스: 주문번호 같고 주문상품번호 다름 → **중복 아님** (별개 주문 라인)
- 쿠팡/토스 파일 간 중복: 서로 다른 platform이므로 중복 아님

### 특수문자
- 상품명에 이모지/특수문자 (❤️, ◆, ☆ 등): 파싱 시 그대로 보존, trim만 적용
- 주문번호에 공백: trim 적용

---

## 완료 기준

### 파일 존재
- [ ] `src/lib/supabase/workSessions.ts` — createWorkSession, getWorkSessions, getWorkSession, updateWorkSessionStatus
- [ ] `src/lib/supabase/orders.ts` — createOrderImport, saveOrders, getOrders, getOrderImports, deleteOrderImport
- [ ] `src/lib/parsers/coupangParser.ts` — parseCoupangOrders 함수
- [ ] `src/lib/parsers/tossParser.ts` — parseTossOrders 함수
- [ ] `src/lib/parsers/platformDetector.ts` — detectPlatform 함수
- [ ] `src/lib/parsers/coupangParser.test.ts` — 테스트 전체 통과
- [ ] `src/lib/parsers/tossParser.test.ts` — 테스트 전체 통과
- [ ] `src/lib/parsers/platformDetector.test.ts` — 테스트 전체 통과
- [ ] `src/hooks/useWorkSessions.ts` — 목록 조회 훅
- [ ] `src/hooks/useWorkSession.ts` — 개별 조회 훅 (sessionId 파라미터)
- [ ] `src/hooks/useOrderUpload.ts` — prepare/commit 패턴 훅
- [ ] `src/pages/orders/OrderUpload.tsx` — Placeholder 교체된 실제 페이지

### 타입 / 스키마
- [ ] `ParseResult`에 `duplicateRows`, `meta` 포함
- [ ] `DuplicateRow`, `ParseMeta` 타입 추가
- [ ] `OrderImport` 타입에 total_rows/valid_count/invalid_count/duplicate_count/invalid_rows/duplicate_rows 반영
- [ ] 관련 Zod 스키마 + DB row 타입 + 변환 함수 업데이트
- [ ] order_imports 테이블 ALTER 마이그레이션 작성

### 파싱 로직
- [ ] 쿠팡 파싱: Delivery 시트, 1행 헤더, 2행부터 데이터, 40컬럼 매핑
- [ ] 토스 파싱: 주문내역 시트, 1~4행 스킵, 5행부터 데이터, 30컬럼 매핑
- [ ] 토스 matchingKey가 `주문상품번호` (orderItemNo)인지 확인
- [ ] 토스 주문번호 동일 + 주문상품번호 다름 → 중복이 아닌 별개 주문 라인
- [ ] 플랫폼 자동 감지 정상 동작
- [ ] 각 파서는 예상 시트가 없으면 명시적 에러 throw (빈 결과 반환 아님)
- [ ] invalidRow: 수량 NaN/0이하, 주문번호 누락, 수취인 누락, 주소 누락, 수취인 전화번호 누락/형식 오류
- [ ] 빈 행은 스킵 (invalidRow가 아님, meta.skippedRows에만 카운트)
- [ ] 파일 내부 중복 matchingKey는 DB insert 전에 duplicateRows로 분리
- [ ] orders에는 중복 제거된 정상 주문만 포함
- [ ] rawValues 고정 길이 (쿠팡 40개, 토스 30개) — normalizeRowValues로 padding
- [ ] rawValues에는 trim 미적용 (엑셀 원본 보존), 표준 필드에는 trim 적용
- [ ] rawRowNumber에 1-based 엑셀 행 번호 저장
- [ ] 전화번호 원본 보존 + digits 정확 추출
- [ ] StandardOrder.id는 crypto.randomUUID()로 생성, DB orders.id에 그대로 저장
- [ ] summary.total = valid + invalid + duplicate (빈 행 스킵은 제외)

### DB 저장
- [ ] order_imports에 total/valid/invalid/duplicate count 저장
- [ ] order_imports에 invalid_rows/duplicate_rows jsonb 저장
- [ ] 재업로드는 파싱 성공 후에만 기존 데이터 삭제
- [ ] saveOrders 실패 시 반쪽 저장 상태를 남기지 않음 (보상 삭제)
- [ ] saveOrders는 빈 배열이면 insert 호출하지 않음
- [ ] 정상 주문 0건이면 DB 저장 진행하지 않음

### UI
- [ ] 작업건 생성/선택 UI 동작 (이름 자동 생성: Asia/Seoul 기준)
- [ ] 파일 업로드 카드 2개 가로 배치 (expectedPlatform 검증 포함)
- [ ] 업로드 상태별 UI 전환 (미업로드 → 업로드중 → 완료)
- [ ] 파싱 결과 요약 카드 (정상/오류/중복)
- [ ] 오류 행 모달 (행 번호, 사유) + 중복 행
- [ ] 주문 목록 테이블 (플랫폼 필터, 페이지네이션, 정렬: platform → rawRowNumber)
- [ ] 하단 CTA 바 (요약 + 다음 버튼)
- [ ] CTA 다음 경로: `/orders/:sessionId/allocation`
- [ ] 탭 네비게이션 (업로드만 활성, 배정/다운로드 비활성)
- [ ] status가 active인 작업건에서만 업로드/재업로드 가능
- [ ] ordered/completed 작업건은 읽기 전용 + 안내 메시지
- [ ] ConfirmDialog는 페이지 컴포넌트에서 처리 (훅 내부 아님)
- [ ] 업로드 페이지 진입 시 기존 order_imports/orders/invalidRows/duplicateRows 복원

### 라우팅
- [ ] `/orders/:sessionId/upload` 등 sessionId 기반 동적 라우트
- [ ] WorkSession은 URL을 단일 진실로 사용 (전역 상태 미사용)
- [ ] 존재하지 않는 sessionId 접근 시 `/orders`로 리다이렉트

### 빌드 / 린트 / 테스트
- [ ] `npm run build` 성공
- [ ] `npm run typecheck` 성공
- [ ] `npm run lint` 에러 없음
- [ ] `npm run test:run` 전체 통과

---

## 이 Phase에서 하지 않는 것

- ❌ 공급처 배정 로직 (Phase 4)
- ❌ 발주서 엑셀 생성 (Phase 4)
- ❌ 공급처 배정 / 발주서 다운로드 탭 구현 (Phase 4 — placeholder만)
- ❌ 운송장 관련 일체 (Phase 5)
- ❌ 대시보드 (Phase 6)
- ❌ Supabase RPC 트랜잭션 (재업로드 원자성은 보상 삭제로 처리)
- ❌ 파일 hash (SHA-256) 저장
- ❌ 테이블명 변경 (orders → order_lines)
