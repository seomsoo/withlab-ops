# Phase 10: 운송장 워크플로우 분리 + 간편 운송장 + 쿠팡 분리

## 목표

고객 피드백 기반으로 운송장 기능의 유연성을 확보한다:

1. **발주 완료 없이 운송장 접근** — 기존 작업건에서 `ordered` 상태가 아니어도 운송장 매칭 가능
2. **간편 운송장 모드** — 주문 엑셀 + 운송장 엑셀만으로 DB write 없이 바로 매칭/다운로드
3. **운송장 삭제** — 잘못 올린 운송장 임포트를 삭제하고 다시 올릴 수 있도록
4. **쿠팡 파일 분리** — 쿠팡 계정 2개 사용 시 주문/운송장을 각각 분리 업로드·다운로드

---

## 선행 조건

- Phase 9 ✅ 완료 (폴리싱 + 성능 최적화)

---

## 참조 문서

| 문서 | 참조 범위 |
|------|----------|
| `docs/REF_DB_스키마.md` | order_imports unique 제약, tracking_imports 구조 |
| `src/lib/matching/CLAUDE.md` | 매칭 알��리즘 순서 |
| `src/pages/CLAUDE.md` | UI 패턴, Supabase 호출 규칙 |
| `src/hooks/CLAUDE.md` | 훅 패턴 |

---

## 핵심 정책 결정

### 상태별 운송장 권한

| work_session.status | 업로드 | 삭제 | 수동매칭 | 완료처리 | 재다운로드 |
|---------------------|--------|------|----------|----------|-----------|
| active (배정 있음) | ✅ | ✅ | ✅ | ✅ (확인 필요) | ✅ |
| active (배정 없음) | ❌ 진입 불가 | - | - | - | - |
| ordered | ✅ | ✅ | ✅ | ✅ | ✅ |
| completed | ❌ | ❌ | ❌ | ❌ (이미 완료) | ✅ |

### 간편 운송장 모드는 "No-write 모드"

간편 운송장 모드는 DB에 업무 데이터를 저장하지 않는다.
- **Write 금지 테이블**: work_sessions, order_imports, orders, allocations, tracking_imports, trackings
- **Read 허용 (기준정보)**: suppliers, courier_mappings, platform_templates, Storage(템플릿 파일)
- 페이지 이탈/새로고침 시 메모리 데이터가 사라짐을 UI에 안내

### 쿠��� 라벨 분리는 출력 분리용

쿠팡 라벨은 운송장 다운로드 파일을 계정별로 분리하기 위한 기능이다.
- `orders unique(work_session_id, platform, matching_key)`는 유지
- 라벨이 달라도 같은 matchingKey 중복 주문은 허용하지 않음 (duplicate 처리)
- 라벨은 order_import 생성 시 확정, Phase 10에서는 수정 기능 제외

### 합치기/교체/별도 파일 정책

| 모드 | DB 동작 | label |
|------|---------|-------|
| 교체 | 기존 order_import cascade 삭제 → 새 import 생성 | 기존 label 유지 |
| 합치기 | 기존 order_import에 orders만 추가 (import row 유지) | 기존 label 유지 |
| 별도 파일 | 새 order_import 생성 | 새 label 부여 |

---

## Part A: 발주 연결 — 발주 완료 없이 운송장 접근

### 컨셉
기존 작업건에서 발주서를 완료(`ordered`)하지 않아도 운송장 매칭을 진행할 수 있게 한다.
배정(allocation)이 `pending` 또는 `ordered` 상태이면 매칭 대상이 된다.

### A-1. 매칭 엔진 필터 변경

**파일**: `src/lib/matching/matchingEngine.ts`
**변경**: 명시적 allowlist 방식으로 매칭 대상 allocation 제한

```typescript
// Before:
for (const alloc of allocations) {
  if (alloc.status === 'ordered') {
    const key = `${alloc.orderId}:${alloc.supplierId}`
    allocationByOrderAndSupplier.set(key, alloc)
  }
}

// After:
const MATCHABLE_STATUSES: Allocation['status'][] = ['pending', 'ordered']
for (const alloc of allocations) {
  if (!MATCHABLE_STATUSES.includes(alloc.status)) continue
  const key = `${alloc.orderId}:${alloc.supplierId}`
  allocationByOrderAndSupplier.set(key, alloc)
}
```

### A-2. 매칭 엔진 테스트 추가

**파일**: `src/lib/matching/matchingEngine.test.ts`

| 테스트 케이스 | 기대 |
|--------------|------|
| pending 상태 배정도 매칭 대상에 포함 | matched |
| pending + ordered 혼합 배정 매칭 | 각각 matched |
| ordered allocation은 기존처럼 매칭됨 (회귀) | matched |
| allocation 없는 주문은 unmatched | unmatched |

### A-3. TrackingSessionSelector UI 변경

**파일**: `src/pages/tracking/TrackingSessionSelector.tsx`

| 변경 | 내용 |
|------|------|
| clickable 조건 | `active`는 `allocationCount > 0`일 때만 clickable |
| 빈 상태 문구 | "주문을 업로드하고 배정한 작업건에서 운송장 매칭을 진행할 수 있습니다" |
| active + 배정 없음 | "공급처 배정을 먼��� 완료해 주���요" 표시 |
| active + 배정 있음 | 날짜/건수 정보 표시, 클릭 가능 |

필요 데이터: 각 session의 `allocationCount`를 `fetchSessionInfos`에서 함께 조회.

### A-4. workSessions 상태 전이 — active→completed

**파일**: `src/lib/supabase/workSessions.ts`

active 상태에서 운송장 완료 시, ordered_at이 없으면 함께 기록한다.

```typescript
// completeWorkSession 함수 내부:
if (session.status !== 'ordered' && session.status !== 'active') {
  throw new Error('진행중 또는 발주완료 상태의 작업건만 완료할 수 있습니다')
}

// active → completed 시 ordered_at/allocations 처리
if (session.status === 'active') {
  // pending allocations → ordered로 변경
  await supabase
    .from('allocations')
    .update({ status: 'ordered' })
    .eq('work_session_id', sessionId) // allocations는 order → work_session 경유
    .eq('status', 'pending')
  // ordered_at 기록
  await supabase
    .from('work_sessions')
    .update({ ordered_at: new Date().toISOString() })
    .eq('id', sessionId)
}
```

**UI 확인 문구** (TrackingDownload에서 완료 버튼 클릭 시):
```
이 작업건은 아직 발주 완료 처리되지 않았습니다.
운송장 처리를 완료하면 발주 완료와 운송장 완료를 함께 처리합니다.
계속하시겠습니까?
```

### A-5. workSession 진행률/경로

**파일**: `src/utils/workSession.ts`
- `getSessionProgress()`: `active` 상태에서 tracking 데이터 있으면 → "운송장 매칭 중"
- `getSessionEntryPath()`: `active` + tracking → `/tracking/${id}/upload`

---

## Part B: 간편 운송장 모드 (No-write)

### 컨셉
DB에 업무 데이터를 저장하지 않는다. 파일 업로드 → 메모리에서 매칭 → 결과 다운로드. 기준정보(공급처, 택배사 매핑, 플랫폼 템플릿)만 DB에서 읽는다.

### 사용자 플로우
```
운송장 탭 → [간편 운송장] 버튼 클릭
  → Step 1: 쿠팡/토스 주문 엑셀 업로드 (파싱, 메모리)
  → Step 2: 공급처 선택 + 운송�� 엑셀 업로드 (파싱 + 직접 매칭, 메모리)
  → Step 3: 매칭 결과 확인 + 플랫폼 운송장 다운로드
```

### B-1. 메모리 상태 타입

**파일**: `src/pages/tracking/SimpleTracking.tsx` (컴포넌트 내부 또는 별도 types)

```typescript
type SimpleOrderFile = {
  id: string              // crypto.randomUUID()
  platform: Platform
  label: string           // 자동 채번: "쿠팡1", "쿠팡2" ...
  fileName: string
  orders: StandardOrder[]
  errorMessage?: string   // 파싱 실패 시
}

type SimpleTrackingFile = {
  id: string
  supplierId: string
  supplierName: string
  fileName: string
  matchingResult: DirectMatchingResult
}

type SimpleTrackingState = {
  orderFiles: SimpleOrderFile[]
  trackingFiles: SimpleTrackingFile[]
}
```

### B-2. 직접 매칭 함수

**파일**: `src/lib/matching/directMatcher.ts` (새 파일)

```typescript
type DirectMatchingInput = {
  parsedTrackings: ParsedTracking[]
  orders: StandardOrder[]     // 전체 주문 (복수 파일 합산)
}

type DirectMatchedTracking = ParsedTracking & {
  status: 'matched'
  orderId: string
  order: StandardOrder
}

type DirectMatchingResult = {
  matched: DirectMatchedTracking[]
  unmatched: UnmatchedTracking[]
  duplicated: DuplicatedTracking[]
  invalid: InvalidTracking[]
}

export function runDirectMatching(input: DirectMatchingInput): DirectMatchingResult
```

**매칭 알고리즘**:
1. rawOrderKey/trackingNumber 비어있음 → invalid ("필수값 누락")
2. rawOrderKey로 orders에서 matchingKey 검색
   - 0건 → unmatched ("해당 주문 없음")
   - 2건 이상 → unmatched ("동일 주문키가 여러 주문에 존재")
3. 같은 orderId에 이미 매칭된 tracking 있는지 (배치 내 중복) → duplicated
4. 모두 통과 → matched, order 데이터 연결

**핵심**: `sourceSupplierId`는 매칭에 사용하지 않음. 택배사 변환(`courierConverter`) 단계에서만 사용.

### B-3. 주문 중복 감지

간편 모드에서 복수 주문 파일 업로드 시 중복 처리:
- 중복 기준: `platform + matchingKey`
- 같은 matchingKey가 여러 파일에 존재하면 첫 번째 파일의 주문을 사용
- 이후 중복은 UI에서 경고 표시 (매칭 대상에서 제외하지는 않음 — 파일 삭제/수정으로 해결 유도)

### B-4. 직접 매칭 테스트

**파일**: `src/lib/matching/directMatcher.test.ts` (새 파일)

| 테스트 케이스 | 기대 |
|--------------|------|
| 정상 매칭 | matched, order 데이터 포함 |
| rawOrderKey 빈값 | invalid |
| 주문 없는 키 | unmatched ("해당 주문 없음") |
| 동일 orderId 중복 | 두 번째부터 duplicated |
| 같은 matchingKey가 여러 order에 존재 | unmatched ("동일 주문키가 여러 주문에 존재") |
| 복수 주문 + 복수 운송장 혼합 | 각각 올바른 상태 |

### B-5. 간편 운송장 페이지

**파일**: `src/pages/tracking/SimpleTracking.tsx` (새 파일)

3단계 스텝 UI (UX 상세 섹션 참조).

**Step 1 — 주문 엑셀 업로드:**
- `FileUpload` 컴포넌트 (기존 재사용, `multiple: true`)
- `platformDetector` → `coupangParser` / `tossParser` 호출
- 파싱 결과 `SimpleOrderFile[]`로 메모리 저장
- 같은 플랫폼 복수 파일 → 라벨 자동 채번 ("쿠팡1", "쿠팡2")
- platform + matchingKey 중복 감지 → 경고 표시

**Step 2 — 운송장 엑셀 업로드:**
- 공급처 선택 (Select 컴포넌트, `useSuppliers` 훅)
- `FileUpload` + `parseTracking()` 호출
- `runDirectMatching()` 실행
- 결과를 `SimpleTrackingFile`에 저장
- 복수 공급처: "+ 다른 공급처 운송장 추가" 버튼

**Step 3 — 결과 확인 + 다운로드:**
- 매칭 결과 테이블 (상태별 색상 뱃지)
- 플랫폼별 다운로드 버튼
- `generateTrackingExportExcel()` 호출 (기존 재사용)
- TrackingExportItem 생성 시 `allocationId: null` (제너레이터 내부 미사용)
- 택배사 변환: `courierConverter(supplierId)` — supplierId는 trackingFile에서 가져옴
- 쿠팡 라벨 2개 이상 → 분리 다운로드 지원
- 플랫폼 템플릿 미등록 시 해당 플랫폼 다운로드 비활성 + 양식 관리 링크

**페이지 이탈 경고:**
- `beforeunload` 이벤트: 데이터 존재 시 브라우저 기본 경고
- 내부 라우팅은 Phase 10에서 `beforeunload`만 우선 적용

### B-6. 라우트 추가

**파일**: `src/AppRoutes.tsx`

```tsx
<Route path="/tracking/simple" element={<SimpleTracking />} />
```

### B-7. 진입 버튼

**파일**: `src/pages/tracking/TrackingSessionSelector.tsx`

PageHeader 영역에 "간편 운송장" 버튼 추가 → `/tracking/simple`로 이동

---

## Part C: 운송장 삭제 기능

### 컨셉
발주 연결 모드에서 잘못 올린 운송장을 삭제하고 다시 올릴 수 있도록 한다.
`tracking_imports` 삭제 시 소속 `trackings`는 cascade 삭제.

**제한**: `completed` 상태 작업건에서는 삭제 불가.

### C-1. API 함수

**파일**: `src/lib/supabase/trackings.ts`

```typescript
export async function deleteTrackingImport(importId: string): Promise<void> {
  const { error } = await supabase
    .from('tracking_imports')
    .delete()
    .eq('id', importId)
  if (error) {
    console.error('tracking_import 삭제 실패:', error)
    throw new Error('운송장 파일 삭제에 실패했습니다')
  }
}
```

### C-2. 훅 확장

**파일**: `src/hooks/useTrackingUpload.ts`

- `deleteImport(importId: string)` 콜백 추가
- 삭제 후 `refetch()` 호출

### C-3. UI — 삭제 버튼

**파일**: `src/pages/tracking/TrackingUpload.tsx`

- `completed` 상태면 삭제 버튼 숨김
- `active`/`ordered` 상태: 삭제 아이콘 버튼 (Trash2, 빨간색)
- 확인 모달:
  ```
  운송장 파일을 삭제하시겠습니까?
  이 파일의 매칭 결과 N건도 함께 삭제됩니다.
  삭제 후 플랫폼 운송장 다운로드 파일에서 해당 건이 제외됩니다.
  ```
- 파괴적 액션 → 확인 버튼 destructive variant
- 확인 → `deleteImport()` → toast.success

---

## Part D: 쿠팡 파일 분리

### 컨셉
고객이 쿠팡 계정을 2개 사용 (��팡1, 쿠팡2). 각 계정의 주문을 별도로 업로드하고, 운송장도 계정별로 분리 다운로드해야 한다.

### 현재 제약
- `order_imports`: `unique(work_session_id, platform)` — 작업건당 쿠팡 1개만
- 이미 "합치기(append)" 기능이 존재하지만, 다운로드 시 분리 불가

### D-1. DB 마이그레이션

```sql
-- order_imports에 label 컬럼 추가
alter table order_imports add column label text;

-- 기존 데이터 backfill (NULL 방지)
update order_imports
set label = case
  when platform = 'coupang' then '쿠팡1'
  when platform = 'toss' then '토스1'
  else platform || '1'
end
where label is null;

-- NOT NULL 제약 추가
alter table order_imports alter column label set not null;

-- 기존 unique 제약 삭제 후 재생성 (label 포함)
-- 주의: 실제 constraint 이름은 pg_constraint에서 확인 후 사용
alter table order_imports
  drop constraint if exists order_imports_work_session_id_platform_key;
alter table order_imports
  add constraint uq_order_import_ws_platform_label
  unique (work_session_id, platform, label);

-- orders에도 order_import 라벨을 쉽게 조회하기 위한 인덱스
create index if not exists idx_orders_import on orders(order_import_id);
```

**핵심**:
- `label`은 NOT NULL — NULL 중복 허용 문제 방지
- 기존 데이터는 `쿠팡1`/`토스1`로 backfill
- `orders unique(work_session_id, platform, matching_key)`는 변경하지 않음
  - 라벨이 달라도 같은 matchingKey 중복은 허용하지 않음 (운송장 매칭 시 ambiguous 방지)

### D-2. 타입 확장

**파일**: `src/types/index.ts`

```typescript
export type OrderImport = {
  id: string
  workSessionId: string
  platform: Platform
  fileName: string
  label: string          // NOT NULL: "쿠팡1", "쿠팡2" 등
  uploadedAt: string
}

// TrackingExportItem에 orderImportLabel 추가
export type TrackingExportItem = {
  trackingId: string
  allocationId: string | null   // null = 간편 모드
  orderId: string
  orderNo: string
  orderItemNo: string
  matchingKey: string
  trackingCompany: string
  trackingNumber: string
  courierMapped: boolean
  originalRow: Record<string, unknown>
  originalRowValues: unknown[]
  originalRowNumber: number
  orderImportLabel?: string     // 쿠팡 분리 다운로드용
}
```

### D-3. 주문 업로드 UI 변경

**파일**: `src/pages/orders/OrderUpload.tsx`

같은 플랫폼 파일이 이미 있을 때 3가지 선택지:
- **교체** — 기존 import cascade 삭제 + 새 import (기존 label 유지)
- **합치기** — 기존 import에 orders 추가 (import row, label 유지)
- **별도 파일** — 새 import 생성 + 새 label

"별도 파일" 선택 시:
- 기존 import 중 label이 `쿠팡1`이 아니면 `쿠팡1`로 업데이트 (최초 분리 시)
- 새 label 자동 채번: "쿠팡2", "쿠팡3" ...
- 사용자 편집 가능 (1~20자, sanitize 적용)

### D-4. 주문 업로드 훅/API 변경

**파일**: `src/hooks/useOrderUpload.ts`, `src/lib/supabase/orders.ts`

- `createOrderImport`에 `label: string` 파라미터 추가
- `commitUpload`에 `addSeparate` 모드 추가 (기존 import 유지 + 새 import 생성)
- 기존 import의 라벨 업데이트 API: `updateOrderImportLabel(importId, label)`

### D-5. 라벨 유효성 검증

```typescript
function validateLabel(label: string): string {
  const trimmed = label.trim()
  if (trimmed.length === 0 || trimmed.length > 20) {
    throw new Error('라벨은 1~20자여야 합니다')
  }
  return trimmed
}

function sanitizeFileNamePart(value: string): string {
  return value.replace(/[\/\\:*?"<>|]/g, '_').trim()
}
```

### D-6. 운송장 다운로드 분리

**파일**: `src/pages/tracking/TrackingDownload.tsx`

- TrackingExportItem 생성 시 `order → order_import.label` join으로 `orderImportLabel` 포함
- 쿠팡 라벨이 2개 이상이면 분리 다운로드 버튼 표시
- 같은 플랫폼 import가 1개뿐이면 라벨 UI 강조하지 않음 (기존과 동일)

### D-7. export 필터 함수

**파일**: `src/lib/generators/trackingExportGenerator.ts`

```typescript
export function filterExportItemsByImportLabel(
  items: TrackingExportItem[],
  label: string
): TrackingExportItem[] {
  return items.filter((item) => item.orderImportLabel === label)
}
```

### D-8. 라벨 자동 채번은 플랫폼별 공통

```typescript
function getNextLabel(platform: Platform, existingLabels: string[]): string {
  const prefix = platform === 'coupang' ? '쿠팡' : '토스'
  let n = existingLabels.length + 1
  while (existingLabels.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}
```

### D-9. 간편 운송장에서의 분리

**파일**: `src/pages/tracking/SimpleTracking.tsx`

- Step 1에서 같은 플랫폼 파일 여러 개 업로드 → 라벨 자동 부여
- Step 3에서 `orderImportLabel` 기준 분리 다운로드 지원
- 간편 모드의 `TrackingExportItem.allocationId`는 `null`
- 간편 모드 중복 검증은 orderId 기준 (allocationId 없으므로)

---

## 재사용 목록

| 기존 코드 | 용도 | 수정 필요 |
|-----------|------|----------|
| `coupangParser.ts` | 주문 파싱 | ���음 |
| `tossParser.ts` | 주문 파싱 | 없음 |
| `platformDetector.ts` | 플랫폼 감지 | 없음 |
| `trackingParser.ts` | 운송장 파싱 | 없음 |
| `generateTrackingExportExcel()` | 엑셀 생성 | allocationId null 허용 확인 |
| `courierConverter.ts` | 택배사 변환 | 없음 |
| `FileUpload` 컴포넌트 | 파일 업로드 UI | 없음 |
| `useSuppliers` 훅 | 공급처 목록 | 없음 |
| `getPlatformTemplate` | 양식 조회 | 없음 |
| `getCourierMappings` | 택배사 매핑 | 없음 |

---

## 변경 불필요

| 파일 | 이유 |
|------|------|
| 기존 운송장 페이지 (Match/Download 기존 로직) | Part A는 필터만 변경, 기존 로직 유지 |
| 발주서 관련 코드 전체 | 건드리지 않음 |
| `matchingEngine.ts` 함수 시그니처 | 내부 조건만 변경, 인터페이스 유지 |
| 쿠팡/토스 파서 | 그대로 재사용 |

---

## UX 상세 — 간편 운송장 모드 (Part B)

> 시니어 UX 디자이너 관점에서의 인터랙션 디테일.
> 기존 디자인 시스템(토스 스타일 미니멀)과 일관성을 유지한다.

### 레이아웃

```
┌──────────────────────────────────────────────────────┐
│ PageHeader: "간편 운송장"                              │
│ description: "주문 엑셀과 운송장 엑셀만��로 바로 매칭합니다" │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ① 주문 업로드 ─── ② 운송장 업로드 ─── ③ 결과 확인     │
│  ●━━━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━━━━━○              │
│                                                      │
│  [현재 스텝 콘텐츠 영역]                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 스텝 인디케이터
- 수평 3단계 스텝퍼 (토스 스타일: 번호 원 + 라벨 + 연결 라인)
- 완료 스텝: 파란 원(`--color-primary`) + 체크 아이콘 + 파란 라인
- 현재 스텝: 파란 원 + 번호 + 볼드 라벨
- 미완료 스텝: 회색 원(`--color-gray-500`) + 번호 + 회색 라벨
- 클릭으로 이전 스텝 돌아가기 가능 (데이터 유지)
- 다음 스텝은 클릭 불가 (순차 진���)

### Step 1: 주문 엑셀 업로드

**초기 상태:**
- 드래그앤드롭 영역 (점선 보더, 높이 200px)
- "플랫폼 주문 엑셀을 업로드해 주세요" + "쿠팡, 토스 파일을 함께 올릴 수 있습니다"
- 복수 파일 허용 (`multiple: true`)

**업로드 후:**
- 파일별 카드 (가로 나열, 태그: 쿠팡/토스 자동감지)
  - 플랫폼 로고 + 파일명 + "N건 파싱됨"
  - 라벨 입력 필드 (같은 플랫폼 2개 이상일 때만 표시)
    - 기본값: "쿠팡1", "쿠팡2" 자동 채번
    - 편집 가능 (연필 아이콘 → 인라인 수정)
  - 삭제 버튼 (X 아이콘, 확인 없이 즉시 — 메모리 데이터라 복구 = 재업로드)
- 추가 업로드 버튼: "+ 파일 추가"
- 하단 요약: "총 N건 (쿠팡 X건, 토스 Y건)"
- "다음" 버튼 활성화 (파일 1개 이상 업로드 시)

**에러:**
- 파싱 실패 → 카드에 빨간 보더 + 에러 메시지 인라인
- "지원하지 않는 형식입니다" / "데이터 행이 없습니다"

### Step 2: 운송장 엑셀 업로드

**초기 상태:**
- 공급처 선택 드롭다운 (상단)
  - placeholder: "운송장을 보낸 공급처를 선택해 주세요"
  - 선택 후 → 드래그앤드롭 영역 표시
- 파일 업로드 영역 (공급처 선택 후)
  - "운송장 엑셀을 업로드해 주세요"

**업로드 후:**
- 즉시 매칭 실행 (스피너 표시 0.5초 미만이면 안 보임)
- 결과 요약 카드 (4칸 그리드):
  - 매칭됨: 초록 숫자 + 체크 아이콘
  - 미매칭: 빨간 숫자 + X 아이콘
  - 중복: 주황 숫자 + 경고 아이콘
  - 오류: 회색 숫자 + 알림 아이콘
- 미매칭 건이 있으면 노란 안내 배너: "N건의 주문번호가 일치하지 않습니다. 주문 엑셀을 확인해 주세요."
- "이전" / "다음" 버튼
- "다음"은 matched > 0일 때만 활성화

**복수 공급처 지원:**
- 한 공급처 업로드 후 → "+ 다른 공급처 운송장 추가" 버튼
- 공급처별로 구분된 카드 표시 (공급처명 + 파일명 + 결과 요약)
- 삭제 가능

### Step 3: 결과 확인 + 다운로드

**레이아웃:**
```
┌─ 매칭 요약 (4칸) ──────────────────────────────────┐
│ [매칭됨 128건] [미매칭 3건] [중복 0건] [오류 1건]      │
└────────────────────────────────────────────────────┘

��─ 다운로드 ─────────────────────────────────────────┐
│ 플랫폼별 다운로드 카드:                               │
│                                                    │
│ ┌───────────────────┐ ┌───────────────────┐        │
│ │ 쿠팡               │ │ 토스               │        │
│ │ 45건              │ │ 83건              │        │
│ │ [전체 다운로드]    │ �� [다운로드]          │        │
│ │ [쿠팡1] [쿠팡2]   │ │                    │        │
│ └───────────────────┘ └───────────────────┘        │
└────────────────────────────────────────────────────┘

┌─ 상세 테이블 (접기/펼치기) ──────���─────────────────┐
│ 필터 탭: [전체] [매칭됨] [미매칭] [중복] [오류]       │
│ 테이블: 주문번호 | 상품명 | 운송장번호 | 택배사 | 상태 │
└────────────────────────────────────────────────────┘
```

**다운로드 카드:**
- 플랫폼 로고 + 건수
- "다운로드" 버튼 (primary)
- 쿠팡 라벨이 2개 이상이면 분리 다운로드 버튼 추가 (secondary, 라벨별)
- 플랫폼 템플릿 미등록: 다운로드 비활성 + "양식 관리에서 등록해 주세요" 링크
- 택배사 매핑 경고: "N건 택배사 매핑 필요" 노란 배너 (매핑 페이지 링크 포함)
- 다운로드 완료 시 체크 표시 + "다운로드됨" 텍스트

**하단 액션:**
- "처음부터 다시하기" 버튼 (ghost) — 모든 상태 초기화
- 페이지 이탈 시: `beforeunload` 경고 (데이터 존재 시)

### 진입점 (TrackingSessionSelector)

```
┌─ PageHeader ─────────────────────────────────────┐
│ 운송장                  [간편 운송장] 버튼 (primary)  │
└──────────────────────────────────────────────────┘
```

- "간편 운송장" 버튼: primary variant, Zap 아이콘
- 툴팁: "주문 엑셀 + 운송장 엑셀만으로 바로 매칭"
- 기존 작업건 목록과 시각적으로 분리 (간편 = 상단 독립 버튼)

### 마이크로 인터랙션
- 파일 드래그 오버 시: 점선 → 파란 실선 + 배경 primary-50
- 매칭 실행 중: 작은 스피너 (느낄 정도면 표시)
- 다운로드 버튼 클릭 → 잠깐 로딩 → 체크 아이콘 전환 (0.3초 transition)
- 스텝 전환: 수평 슬라이드 animation (150ms ease-out)

---

## UX 상세 — 쿠팡 분리 (Part D)

### 주문 업로드 시

같은 플랫폼 파일이 이미 존재할 때 3가지 선택지:

```
┌─ 모달: "쿠팡 주문이 이미 있습니다" ─────────────────┐
│                                                    │
│ 기존 파일: 쿠팡_주문_5:12.xlsx (37건)               │
│                                                    │
│ ○ 교체 — 기존 파일을 삭제하고 새 파일로 대체          │
│ ○ 합치기 — 기존 주문에 새 주문을 추가                 ���
│ ● 별도 파일 — 다른 계정의 주문으로 추가               │
│                                                    │
│ 라벨: [쿠팡2_________]  (별도 파일 선택 시만 표시)    │
│                                                    │
│ [취소]                              [확인] (primary) │
└────────────────────────────────────────────────────┘
```

- "별도 파일" 선택 시: 기존 파일에 라벨이 기본값이면 그대로 유지
- 라벨 기본값 자동 채번: "쿠팡2", "쿠팡3" ...
- 라벨은 사용자 편집 가능 (1~20자, sanitize 적용)

### 운송장 다운로드 시

쿠팡 라벨이 2개 이상인 경우:

```
┌─ 쿠팡 다운로드 카드 ──────────────────────────────┐
│ 쿠팡 운송장                                        │
│ 총 45건 (쿠팡1: 37건, 쿠팡2: 8건)                  │
│                                                    │
│ [전체 다운로드]  [쿠팡1 다운로드]  [쿠팡2 다운로드]    │
│   (primary)      (secondary)     (secondary)      │
└────────────────────────────────────────────────────┘
```

- 전체 다운로드: 모든 쿠팡 운송장을 1파일로
- 분리 다운로드: 라벨별로 해당 주문만 포함된 별도 파일
- 파일명에 라벨 포함: `쿠팡_운송장_쿠팡1.xlsx`
- 같은 플랫폼 import가 1개뿐이면 분리 UI 표시하지 않음

---

## UX 상세 — 운송장 삭��� (Part C)

### 삭제 버튼 위치
운송장 업로드 카드(TrackingUpload) 내 각 임포트 항목의 우측:

```
┌─ 운송장 임포트 카드 ──────────────────────────────┐
│ A업체 (운송장_A_5:12.xlsx)  37건 업로드  [삭제]    │
│ B업체 (운송장_B_5:12.xlsx)  8건 업로드   [삭제]    │
└────────────────────────────────────────────────────┘
```

- 삭제 버튼: ghost variant, Trash2 아이콘, 빨간색 (#FF3B30)
- hover: 배경 error-light
- `completed` 상태: 삭제 버튼 숨김
- 확인 모달:
  ```
  운송장 파일을 삭제하시겠습니까?
  이 파일의 매칭 결과 N건도 함께 삭제됩니다.
  삭제 후 플랫폼 운송장 다운로드 파일에서 해당 건이 제외됩니다.
  ```
- 파괴적 액션 → 확인 버튼 빨간색 (destructive variant)

---

## 데이터 흐름 요약

### 발주 완료 없이 운송장 매칭 (Part A)

```
TrackingSessionSelector 진입
  → sessions 조회 + allocationCount
  → active + allocationCount > 0 → 클릭 가능
  → /tracking/:sessionId/upload
  → 운송장 업로드
  → matchingEngine (MATCHABLE_STATUSES: pending, ordered)
  → 매칭 결과
```

### active → completed 전이 (Part A)

```
[운송장 처리 완료] 클릭
  → session.status === 'active' → 발주 완료 스킵 확인 모달
  → 사용자 확인
  → pending allocations → ordered 변경
  → ordered_at 기록 (없으면)
  → status = completed, completed_at = now()
```

### 간편 운송장 (Part B)

```
/tracking/simple
  → Step 1: 파일 업로드 → platformDetector → parser → SimpleOrderFile[] (메모리)
  → Step 2: 공급처 선택 → 운송장 파일 → trackingParser → runDirectMatching → SimpleTrackingFile[]
  → Step 3: matched items → courierConverter(supplierId) → generateTrackingExportExcel → downloadBlob
```

### 쿠팡 별도 파일 (Part D)

```
주문 업로드 → 기존 쿠팡 import 존재
  → 모달: 교체/합치기/별도 파일
  → 별도 파일 → label 자동 채번 → createOrderImport(label)
  → orders insert (matchingKey unique 유지)
```

### 쿠팡 분리 다운로드 (Part D)

```
TrackingDownload
  → matched trackings → order → order_import.label join
  → TrackingExportItem에 orderImportLabel 포함
  → 쿠팡 labels 2개 이상 → 분리 버튼 표시
  → filterExportItemsByImportLabel(items, label)
  → generateTrackingExportExcel → downloadBlob
```

---

## 작업 순서

```
Part A (발주 연결) → Part C (운송장 삭제) → Part D (쿠팡 분리) → Part B (간편 운송장)
```

**이유**:
- Part A는 매칭 엔진 + UI 수정으로 빠르게 완료
- Part C는 Part A와 함께 사용되는 기능
- Part D는 DB 변경이 있어 먼저 적용해야 Part B에서 활용 가능
- Part B는 가장 큰 신규 기능, Part D의 분리 다운로드 활용

---

## 완료 기준

### 빌드/테스트
- [ ] `npm run typecheck` 통과
- [ ] `npm run test:run` 통과 (기존 + 새 테스트, 기존 + 새 테스트)
- [ ] `npm run build` 성공

### Part A 검증
- [ ] `active` 상태 작업건에서 allocationCount > 0이면 운송장 탭 진입 가능
- [ ] `active` + allocationCount = 0이면 진입 불가 + 안내 표시
- [ ] `pending` 상태 배정도 매칭 대상에 포함
- [ ] `ordered` 상태 매칭 기존과 동일 (회귀 테스트)
- [ ] `active` 상태에서 운송장 완료 시 발주 스킵 확인 모달 표시
- [ ] `active` → `completed` 전이 시 pending alloc → ordered + ordered_at 기록
- [ ] `completed` 상태에서 발주서 재다운로드 가능

### Part B 검증
- [ ] 간편 운송장 페이지 접근 가능 (`/tracking/simple`)
- [ ] 쿠팡 주문 엑셀 업로드 → 파싱 성공
- [ ] 토스 주문 엑셀 업로드 → 파싱 성공
- [ ] 복수 파일 업로드 + 플랫폼 자동 감지
- [ ] platform + matchingKey 중복 감지 → 경고 표시
- [ ] 같은 matchingKey가 여러 주문에 존재 → unmatched ("동일 주문키가 여러 주문에 존재")
- [ ] 공급처 선택 + 운송장 업로드 → 매칭 결과 표시
- [ ] 복수 공급처 운송장 추가 가능
- [ ] 매칭된 건 플랫폼 엑셀 다운로드 → 정상 파일
- [ ] 업무 데이터 테이블에 write 없음 (기준정보 read만)
- [ ] 플랫폼 템플릿 미등록 시 다운로드 비활성 + 양식 관리 링크
- [ ] 택배사 미매핑 시 원본명 출력 + 경고 표시
- [ ] 페이지 새로고침/탭 닫기 시 beforeunload 경고
- [ ] 간편 모드 export item은 allocationId null

### Part C 검증
- [ ] active/ordered에서 운송장 임포트 삭제 버튼 표시
- [ ] completed에서는 삭제 버튼 숨김
- [ ] 삭제 확인 모달에 건수 + 다운로드 영향 안내
- [ ] 삭제 → 소속 trackings cascade 삭제
- [ ] 삭제 후 재업로드 정상 동작
- [ ] deleteTrackingImport은 DB 원문 에러를 UI에 직접 노출하지 않음

### Part D 검증
- [ ] order_imports.label NOT NULL + 기존 데이터 backfill
- [ ] unique(work_session_id, platform, label) 제약 동작
- [ ] 같은 플랫폼 주문 파일 "별도 파일로 추가" 가능
- [ ] 라벨 자동 채번 (플랫폼별 공통 로직)
- [ ] label은 1~20자 검증 + 파일명 sanitize
- [ ] 기존 "교���/합치기" 동작 영향 없음
- [ ] 라벨이 달라도 같은 matchingKey 중복 주문은 duplicate 처리
- [ ] 운송장 다운로드 시 라벨별 분리 다운로드 가능
- [ ] 같은 플랫폼 import 1개뿐이면 분리 UI 미표시
- [ ] TrackingExportItem에 orderImportLabel 포함
- [ ] filterExportItemsByImportLabel은 orderImportLabel 기준 필터링
- [ ] 간편 운송장에서도 분리 다운로드 가능

### 테스트 추가

**matchingEngine 테스트:**
- [ ] pending allocation 매칭 성공
- [ ] pending + ordered 혼합 매칭
- [ ] ordered allocation 기존 동작 유지 (회귀)

**directMatcher 테스트:**
- [ ] 정상 매칭 시 order 데이터 포함
- [ ] rawOrderKey 빈값 → invalid
- [ ] 주문 없는 키 → unmatched
- [ ] 동일 orderId 중복 → duplicated
- [ ] 같은 matchingKey 여러 order → unmatched (ambiguous)
- [ ] 복수 주문 + 복수 운송장 혼합

---

## Part E: 스펙 이후 추가 구현 (2026-05-13)

스펙 구현 완료 후 사용자 피드백 및 엣지케이스 분석으로 추가된 작업.

### E-1. 공급처 가시성 — 간편 운송장

**파일**: `src/pages/tracking/SimpleTracking.tsx`

**Step 2 — 공급처별 운송장 확장 상세:**
- 각 운송장 카드에 ChevronDown 버튼 추가
- 클릭 시 `TrackingFileDetail` 컴포넌트 확장 표시
- 매칭/미매칭 탭 전환 + 테이블 (주문번호, 상품명, 택배사, 운송장번호)
- 최대 20행 표시 + "외 N건" 표시

**Step 3 — 공급처별 매칭 요약 + 상세 테이블:**
- 공급처가 2개 이상일 때 요약 칩 표시 (공급처명 + 매칭/미매칭 건수)
- `MatchedTrackingTable` 컴포넌트: 전체/매칭/미매칭 필터 + 공급처 컬럼(다중 시) + 30행 제한

### E-2. 공급처 가시성 — 일반 운송장 매칭결과

**파일**: `src/pages/tracking/TrackingMatchResult.tsx`

- 공급처가 2개 이상일 때 테이블에 `공급처` 컬럼 자동 표시
- 공급처명은 `supplierProgress`에서 조회
- 공급처 필터 드롭다운 (Select 컴포넌트, 전체/공급처별)
- 공급처 필터 적용 시 stat cards + 필터 탭 카운트도 해당 공급처 기준으로 변경 (`displayStats` memo)

### E-3. directMatcher — 크로스파일 중복 감지

**파일**: `src/lib/matching/directMatcher.ts`

```typescript
export type DirectMatchingInput = {
  parsedTrackings: ParsedTracking[]
  orders: StandardOrder[]
  alreadyMatchedOrderIds?: Set<string>  // 추가
}
```

- `matchedOrderIds`를 `alreadyMatchedOrderIds`로 seed하여 이전 파일에서 매칭된 주문을 중복 처리
- SimpleTracking에서 새 운송장 업로드 시 기존 `trackingFiles`의 매칭된 orderId를 수집하여 전달

**테스트 추가** (`directMatcher.test.ts`):
- `alreadyMatchedOrderIds`에 포함된 orderId → duplicated 처리
- `alreadyMatchedOrderIds`에 없는 orderId → 정상 매칭

### E-4. 간편 운송장 — 주문 파일 삭제 시 운송장 결과 초기화

**파일**: `src/pages/tracking/SimpleTracking.tsx`

- `removeOrderFile` 시 `trackingFiles.length > 0`이면 `setTrackingFiles([])` + `toast.info` 안내
- 주문 데이터가 변경되면 기존 매칭 결과가 stale해지므로 초기화 필수

### E-5. 일반 매칭결과 — 레이아웃 수정

**파일**: `src/pages/tracking/TrackingMatchResult.tsx`

- 기존: `justify-between`에 자식 3개 (필터탭, 공급처 드롭다운, 벌크 액션) → 가운데 어색
- 수정: 공급처 드롭다운 + 벌크 액션을 하나의 우측 `div`에 그룹화

### E-6. 일반 매칭결과 — raw 컬럼명 하드코딩 제거

**파일**: `src/pages/tracking/TrackingMatchResult.tsx`

```typescript
const PRODUCT_NAME_KEYS = ['상품명', '품목명', '품명', '제품명']
const RECIPIENT_KEYS = ['수령인', '수취인', '받는분', '받는사람']

function extractFromRaw(raw: Record<string, unknown>, keys: string[]): string
```

- `t.raw['상품명']` 하드코딩 → `extractFromRaw(t.raw, PRODUCT_NAME_KEYS)` 로 변경
- 공급처마다 다를 수 있는 컬럼명을 복수 후보로 탐색

---

## 커밋 계획

```
feat(matching): pending 배정도 매칭 대상에 포함 (Part A-1, A-2)
feat(tracking): active 상태 작업건 운송장 진입 허용 (Part A-3~A-5)
feat(tracking): 운송장 임포트 삭제 기능 (Part C)
feat(db): order_imports label 컬럼 + unique 제약 변경 (Part D-1, D-2)
feat(orders): 같은 플랫폼 별도 ��일 추가 기능 (Part D-3~D-5)
feat(tracking): 쿠�� 라벨별 분리 다운로드 (Part D-6~D-9)
feat(matching): 간편 운송장 직접 매칭 함수 (Part B-1~B-4)
feat(tracking): 간편 운송장 페이지 (Part B-5~B-7)
```
