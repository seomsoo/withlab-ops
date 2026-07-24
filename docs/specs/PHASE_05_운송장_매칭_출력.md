# Phase 5: 운송장 매칭 + 출력

## 목표
공급처에서 받은 운송장 엑셀을 파싱하고, 발주 주문과 자동 매칭한 뒤, 쿠팡/토스 플랫폼 양식에 맞는 운송장 엑셀을 생성하여 다운로드하는 전체 운송장 처리 파이프라인을 완성한다.

> ⚠️ Phase 5에서도 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> `docs/design/` 시안 파일은 **디자인(색상, 간격, 스타일)의 참조**로만 사용한다.
> 구조, 기능 범위, 데이터 흐름은 **스펙 문서가 우선**이며 시안과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 4 ✅ 검증 통과
- 작업건(work_session)이 `ordered` 상태일 때 운송장 처리 가능

---

## 시안 참조 가이드

| 구현 대상 | 참조 시안 파일 | 참조 범위 |
|----------|--------------|----------|
| 운송장 업로드 | `docs/design/tracking-upload.css/jsx` | 공급처 선택, 파일 업로드, 파싱 결과 테이블 |
| 매칭 결과 | `docs/design/tracking.css/jsx` | 매칭 요약 카드, 상태 필터, 결과 테이블, 수동 매칭 |
| 플랫폼 다운로드 | `docs/design/tracking-download.css/jsx` | 플랫폼별 다운로드 카드, 미매칭 경고 |
| 플랫폼 운송장 양식 | `docs/design/platform-form.css/jsx` | 양식 등록 흐름, 컬럼 설정, 미리보기 |

---

## 컬럼 인덱스 규칙

Phase 4와 동일하게 **모든 컬럼 인덱스는 1-based**로 저장한다.
ExcelJS의 `getCell(n)`도 1-based이므로 변환 없이 바로 사용한다.

### 실물 엑셀 기준 컬럼 위치 (참조)

#### 쿠팡 운송장 업로드 양식
```
시트명: Delivery, 헤더: 1행, 데이터: 2행~
C(3): 주문번호     → matchKeyColumnIndex = 3
D(4): 택배사       → trackingCompanyColumnIndex = 4
E(5): 운송장번호   → trackingNumberColumnIndex = 5
```

#### 토스 운송장 업로드 양식
```
시트명: 주문내역, 1~4행 보존, 데이터: 5행~
C(3): 주문상품번호 → matchKeyColumnIndex = 3
D(4): 주문상태     → statusColumnIndex = 4, statusValue = "배송중"
F(6): 택배사       → trackingCompanyColumnIndex = 6
G(7): 송장번호     → trackingNumberColumnIndex = 7
```

> 위 값은 실물 양식 기준 기본값이며, 사용자가 양식 관리 페이지에서 변경할 수 있다.

---

## DB 마이그레이션 (Phase 5 추가분)

### tracking_imports 테이블 ALTER

```sql
-- tracking_imports에 파싱 결과 요약 + invalidRows 저장
ALTER TABLE tracking_imports
  ADD COLUMN total_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN valid_count integer NOT NULL DEFAULT 0,
  ADD COLUMN invalid_count integer NOT NULL DEFAULT 0,
  ADD COLUMN skipped_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN detected_courier text,
  ADD COLUMN invalid_rows jsonb NOT NULL DEFAULT '[]';

-- 같은 작업건에서 같은 공급처의 운송장 import는 1개만 존재
ALTER TABLE tracking_imports
  ADD CONSTRAINT uniq_ti_session_supplier UNIQUE (work_session_id, source_supplier_id);
```

### trackings 테이블 partial unique index

```sql
-- 하나의 allocation에는 matched tracking이 최대 1개만 연결
CREATE UNIQUE INDEX uniq_matched_tracking_per_allocation
  ON trackings (allocation_id)
  WHERE status = 'matched' AND allocation_id IS NOT NULL;
```

### 관련 타입/스키마 업데이트

`TrackingImportRow`, `TrackingImport` 타입, Zod 스키마, `toTrackingImport` 변환 함수에 새 필드 반영.

---

## 작업 목록

### 5-1. 라우팅 변경

기존 `/tracking` 단일 라우트를 운송장 전용 탭 구조로 확장.

`src/AppRoutes.tsx` 변경:
```tsx
// 기존
<Route path="/tracking" element={<Tracking />} />

// 변경
<Route path="/tracking" element={<TrackingSessionSelector />} />
<Route path="/tracking/:sessionId/upload" element={<TrackingUpload />} />
<Route path="/tracking/:sessionId/match" element={<TrackingMatchResult />} />
<Route path="/tracking/:sessionId/download" element={<TrackingDownload />} />
```

**파일 구성**:
- `src/pages/tracking/TrackingSessionSelector.tsx` — 작업건 선택 (발주완료 상태만)
- `src/pages/tracking/TrackingUpload.tsx` — 운송장 업로드
- `src/pages/tracking/TrackingMatchResult.tsx` — 매칭 결과 + 수동 매칭
- `src/pages/tracking/TrackingDownload.tsx` — 플랫폼 파일 다운로드

기존 `src/pages/tracking/Tracking.tsx` 삭제.

---

### 5-2. TrackingTabs 공통 컴포넌트

`src/components/TrackingTabs.tsx`:

Phase 4의 `OrderTabs.tsx`와 동일 패턴. 3단계 탭 네비게이션.

```ts
type TrackingTabsProps = {
  sessionId: string
  currentTab: 'upload' | 'match' | 'download'
  canOpenMatch: boolean       // 부모가 계산하여 전달
  canOpenDownload: boolean    // 부모가 계산하여 전달
}
```

탭 구성:
1. 운송장 업로드 → `/tracking/:sessionId/upload`
2. 매칭 결과 → `/tracking/:sessionId/match`
3. 플랫폼 파일 다운로드 → `/tracking/:sessionId/download`

**TrackingTabs는 DB를 직접 조회하지 않는다.** 부모 페이지가 상태를 조회하여 `canOpenMatch`, `canOpenDownload`를 props로 전달한다.

활성 조건 (부모가 계산):
- `canOpenMatch`: tracking_imports가 1건 이상
- `canOpenDownload`: matched 상태 tracking이 1건 이상

---

### 5-3. 작업건 선택 페이지 (운송장용)

`src/pages/tracking/TrackingSessionSelector.tsx`:

**구성**:
- 모든 최근 작업건을 표시 (active / ordered / completed 모두)
- 상태별 클릭 가능 여부:
  - `ordered`: 클릭 가능, 운송장 처리 가능 (초록 뱃지 "발주완료")
  - `completed`: 클릭 가능, 조회/재다운로드만 가능 (회색 뱃지 "완료")
  - `active`: 표시되지만 클릭 불가 + "발주를 먼저 완료해 주세요" 안내 (파란 뱃지 "진행중")
- 작업건 선택 → `/tracking/:sessionId/upload`로 이동

---

### 5-4. 운송장 파서 — trackingParser

`src/lib/parsers/trackingParser.ts`:

공급처에서 받은 운송장 엑셀을 파싱하여 Tracking 원본 데이터를 추출.

```ts
type TrackingParseResult = {
  trackings: ParsedTracking[]
  invalidRows: InvalidRow[]
  meta: {
    totalRows: number
    validCount: number
    invalidCount: number
    skippedRows: number
    detectedCourier: string | null  // 가장 많이 등장한 택배사명
  }
}

type ParsedTracking = {
  rawOrderKey: string
  trackingCompany: string
  trackingNumber: string
  productName?: string          // 표시용 (있으면 추출)
  recipientName?: string        // 표시용 (있으면 추출)
  raw: Record<string, unknown>
  rawRowNumber: number
}
```

**공급처별 파싱 규칙:**

#### A업체 운송장
- 식별: 1행에 `업체주문번호` 컬럼 존재
- 헤더: 1행, 데이터: 2행부터
- 매핑:
  - `rawOrderKey` ← `업체주문번호` (B열, 플랫폼 주문번호, 매칭 키)
  - `trackingCompany` ← `택배사` (M열)
  - `trackingNumber` ← `송장번호` (N열)
  - `productName` ← `상품명` (D열, 표시용)
  - `recipientName` ← `수령인` (H열, 표시용)
- `주문번호`(A열, A업체 내부 번호, PO로 시작)는 무시

#### B업체 운송장
- 식별: 1행에 `거래처주문번호` 컬럼 존재
- 헤더: 1행, 데이터: 2행부터
- 매핑:
  - `rawOrderKey` ← `거래처주문번호` (D열)
  - `trackingCompany` ← `택배사` (Q열)
  - `trackingNumber` ← `운송장번호` (R열, A업체와 컬럼명 다름!)
  - `productName` ← `상품명` (E열, 표시용)
  - `recipientName` ← `수령인` (K열, 표시용)

#### 범용 컬럼 자동 감지
- 사용자가 업로드 시 공급처를 선택하므로, **컬럼명 자동 탐색 + fallback** 방식:
  1. `업체주문번호` 또는 `거래처주문번호` 컬럼 자동 탐색 → rawOrderKey
  2. `택배사` 컬럼 자동 탐색 → trackingCompany
  3. `송장번호` 또는 `운송장번호` 컬럼 자동 탐색 → trackingNumber
  4. `상품명` 컬럼 탐색 → productName (없으면 undefined)
  5. `수령인` 컬럼 탐색 → recipientName (없으면 undefined)
  6. 필수 컬럼(1~3) 감지 실패 시 에러 throw: "운송장 형식을 인식할 수 없습니다"

**파일 형식**: `.xlsx`, `.xls` 모두 허용 (SheetJS 파싱 대상)

**빈 행 스킵 규칙:**
- `rawOrderKey`와 `trackingNumber` 모두 비어있으면 스킵 (meta.skippedRows에만 카운트)
- 둘 중 하나만 있으면 invalidRow (reason: "필수값 누락")

**유효성 검증:**
- `rawOrderKey` 비어있음 → invalidRow, reason: "주문번호 누락"
- `trackingNumber` 비어있음 → invalidRow, reason: "운송장번호 누락"
- `trackingCompany` 비어있음 → invalidRow, reason: "택배사 누락"
- 모든 문자열 필드에 `.toString().trim()` 적용

**detectedCourier**: 유효 행의 `trackingCompany` 최빈값 반환

**parser invalidRows vs matching invalid 책임 구분:**
- **parser invalidRows**: 엑셀 행 자체에 필수 컬럼이 없음 → `tracking_imports.invalid_rows`에 저장 (trackings 테이블에 넣지 않음)
- **matching invalid**: ParsedTracking은 유효하지만 매칭 엔진에서 내부 오류 발생 → `trackings` 테이블에 `status='invalid'`로 저장

---

### 5-5. 운송장 파서 테스트

`src/lib/parsers/trackingParser.test.ts`:

최소 12개 테스트:

```
1. 정상: A업체 운송장 파싱 — rawOrderKey/trackingCompany/trackingNumber 추출
2. 정상: B업체 운송장 파싱 — 컬럼명 차이(운송장번호 vs 송장번호) 처리
3. 정상: productName/recipientName 추출 (있을 때)
4. 정상: 빈 행 스킵 — rawOrderKey+trackingNumber 모두 비어있는 행 → skippedRows
5. 에러: rawOrderKey만 있고 trackingNumber 없음 → invalidRow
6. 에러: trackingNumber만 있고 rawOrderKey 없음 → invalidRow
7. 에러: 택배사 누락 → invalidRow
8. 정상: 공백 trim 처리
9. 정상: rawRowNumber가 1-based 엑셀 행 번호
10. 정상: detectedCourier 최빈값 계산
11. 에러: 인식 불가 엑셀 형식 → 에러 throw
12. 정상: 모든 행이 빈 행이면 validCount=0
```

테스트 데이터는 SheetJS로 메모리 상 워크북 생성하여 사용 (실제 파일 불필요).

---

### 5-6. 매칭 엔진 — matchingEngine

`src/lib/matching/matchingEngine.ts`:

```ts
type MatchingInput = {
  parsedTrackings: ParsedTracking[]
  orders: StandardOrder[]           // 해당 작업건의 모든 주문
  allocations: Allocation[]         // 해당 작업건의 모든 배정 (orderId, supplierId, status 포함)
  existingTrackings: Tracking[]     // 이미 매칭된 운송장 (중복 체크용)
  sourceSupplierId: string          // 업로드 시 선택한 공급처 ID
}

type MatchingResult = {
  matched: MatchedTracking[]
  unmatched: UnmatchedTracking[]
  duplicated: DuplicatedTracking[]
  invalid: InvalidTracking[]
}

type MatchedTracking = ParsedTracking & {
  status: 'matched'
  allocationId: string
  orderId: string
}

type UnmatchedTracking = ParsedTracking & {
  status: 'unmatched'
  invalidReason: string
}

type DuplicatedTracking = ParsedTracking & {
  status: 'duplicated'
  invalidReason: string
  allocationId: string
}

type InvalidTracking = ParsedTracking & {
  status: 'invalid'
  invalidReason: string
}
```

**매칭 알고리즘 (순서 중요):**

```
for each parsedTracking:
  1. rawOrderKey 또는 trackingNumber 비어있음?
     → status = "invalid", reason = "필수값 누락"

  2. rawOrderKey로 orders에서 matching_key 일치하는 주문 찾기 (trim 후 비교)
     → 없으면 status = "unmatched", reason = "해당 주문 없음"

  3. 찾은 orderId + sourceSupplierId로 allocations에서 배정 찾기
     (기본 매칭 대상: allocation.status = 'ordered')
     → 없으면 status = "unmatched", reason = "해당 공급처 배정 없음"

  4. 해당 allocationId에 이미 matched Tracking 있는지 확인
     (existingTrackings + 현재 배치에서 이미 매칭된 것 모두 체크)
     → 있으면 status = "duplicated", reason = "이미 운송장 있음"

  5. 모두 통과 → status = "matched", allocationId 연결
```

**주의사항:**
- matchingKey로 매칭 (쿠팡=묶음배송번호, 토스=주문상품번호) — orders에 이미 올바른 matchingKey가 저장되어 있으므로 파서 레벨에서 구분 불필요
- 같은 작업건(work_session) 내에서만 매칭
- 하나의 공급처 파일에 쿠팡/토스 주문이 섞여 있을 수 있음 → matchingKey로 자동 판별, 플랫폼 출력 단계에서 order.platform 기준 분리
- 현재 배치 내 중복도 체크: 같은 rawOrderKey가 2회 이상 등장하고 같은 allocation에 매칭되면 첫 번째만 matched, 나머지는 duplicated
- **기본 매칭 대상 allocation.status는 'ordered'** (Phase 5는 발주 완료 후 운송장 처리)

---

### 5-7. 매칭 엔진 테스트

`src/lib/matching/matchingEngine.test.ts`:

최소 14개 테스트:

```
1. 정상: 1:1 매칭 성공 — rawOrderKey = order.matchingKey
2. 정상: 여러 건 매칭 — 복수 운송장 + 복수 주문
3. unmatched: 주문 없음 — rawOrderKey에 해당하는 주문이 없는 경우
4. unmatched: 배정 없음 — 주문은 있지만 해당 공급처 배정이 없는 경우
5. unmatched: sourceSupplierId가 다른 allocation은 매칭 안 됨
6. duplicated: 이미 매칭됨 — existingTrackings에 같은 allocationId
7. duplicated: 현재 배치 내 중복 — 같은 rawOrderKey 2회 등장
8. invalid: rawOrderKey 빈 문자열
9. invalid: trackingNumber 빈 문자열
10. 정상: 공백 trim 후 매칭 — " 12345 " = "12345"
11. 정상: 쿠팡 matchingKey(묶음배송번호)로 매칭
12. 정상: 토스 matchingKey(주문상품번호)로 매칭
13. 혼합: matched + unmatched + duplicated + invalid 혼합 결과
14. 정상: 하나의 공급처 파일에 쿠팡/토스 주문이 섞여도 매칭됨
```

---

### 5-8. Supabase API — 운송장

`src/lib/supabase/trackings.ts`:

```ts
// tracking_imports CRUD
createTrackingImport(input: {
  workSessionId: string
  sourceSupplierId: string
  fileName: string
  totalRows: number
  validCount: number
  invalidCount: number
  skippedRows: number
  detectedCourier: string | null
  invalidRows: InvalidRow[]
}): Promise<TrackingImport>

getTrackingImports(workSessionId: string): Promise<TrackingImport[]>

deleteTrackingImport(importId: string): Promise<void>
// cascade로 소속 trackings도 삭제됨

// trackings CRUD
saveTrackings(
  workSessionId: string,
  trackingImportId: string,
  trackings: Array<{
    allocationId: string | null
    status: TrackingStatus
    invalidReason: string | null
    trackingCompany: string | null
    trackingNumber: string | null
    sourceSupplierId: string
    rawOrderKey: string | null
    raw: Record<string, unknown>
    rawRowNumber: number
  }>
): Promise<void>
// MatchingResult의 4개 상태 (matched/unmatched/duplicated/invalid)를 모두 저장

getTrackings(workSessionId: string): Promise<Tracking[]>

getTrackingsByImport(trackingImportId: string): Promise<Tracking[]>

// 수동 매칭 업데이트
updateTrackingMatch(
  trackingId: string,
  allocationId: string
): Promise<void>
// 1. 같은 allocationId에 기존 matched tracking이 있으면 에러 throw (기본 차단)
// 2. status → 'matched', allocation_id → allocationId, matched_at → now()

// 수동 매칭 — 덮어쓰기
overwriteTrackingMatch(
  trackingId: string,
  allocationId: string
): Promise<void>
// 1. 기존 matched tracking → status='duplicated', invalid_reason='수동 매칭으로 대체됨'
// 2. 현재 tracking → status='matched', allocation_id=allocationId, matched_at=now()

// 매칭 통계
getTrackingStats(workSessionId: string): Promise<{
  total: number
  matched: number
  unmatched: number
  duplicated: number
  invalid: number
}>
```

`src/lib/supabase/platformTemplates.ts`:

```ts
getPlatformTemplate(platform: 'coupang' | 'toss'): Promise<PlatformTrackingTemplate | null>

upsertPlatformTemplate(input: {
  platform: 'coupang' | 'toss'
  templatePath: string
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  matchKeyColumnIndex: number       // 1-based
  matchKeyColumnName: string
  trackingCompanyColumnIndex: number // 1-based
  trackingCompanyColumnName: string
  trackingNumberColumnIndex: number  // 1-based
  trackingNumberColumnName: string
  statusColumnIndex?: number         // 1-based, 토스 전용
  statusColumnName?: string
  statusValue?: string
}): Promise<PlatformTrackingTemplate>

// Storage 파일 관리
uploadPlatformTemplateFile(
  platform: 'coupang' | 'toss',
  file: File
): Promise<string>
// 경로: templates/platform/{platform}_{timestamp}.xlsx
// 반환: storage path

downloadPlatformTemplateFile(
  templatePath: string
): Promise<Blob>

removePlatformTemplateFile(path: string): Promise<void>
```

---

### 5-9. 훅 — useTrackingUpload

`src/hooks/useTrackingUpload.ts`:

```ts
type UseTrackingUploadReturn = {
  // 상태
  trackingImports: TrackingImport[]
  isLoading: boolean

  // 업로드 액션
  uploadTracking: (
    file: File,
    supplierId: string,
    supplierName: string
  ) => Promise<void>

  // 재업로드
  reuploadTracking: (
    file: File,
    supplierId: string,
    supplierName: string,
    existingImportId: string
  ) => Promise<void>
}
```

**업로드 흐름:**

```
1. validateExcelFile(file)
2. SheetJS로 workbook 읽기
3. parseTracking(workbook) → TrackingParseResult
4. trackings가 0건이면 DB 저장하지 않고 UI에 결과만 표시
5. orders + allocations(status=ordered) + existingTrackings 조회
6. runMatching({ parsedTrackings, orders, allocations, existingTrackings, sourceSupplierId })
7. createTrackingImport (invalidRows/meta 포함) → DB 저장
8. saveTrackings (matched/unmatched/duplicated/invalid 모두) → DB 저장
9. saveTrackings 실패 시 → 방금 만든 tracking_import 삭제 (보상 처리)
10. 상태 갱신
```

**재업로드 흐름 (Phase 3 패턴 유지):**

```
1. 파싱 + 매칭 (위와 동일, 파싱 성공 확인)
2. 사용자 확인 (ConfirmDialog)
3. deleteTrackingImport(existingImportId) — cascade로 기존 trackings 삭제
4. createTrackingImport + saveTrackings
5. saveTrackings 실패 시 → 새 tracking_import 삭제 (보상 처리, 반쪽 저장 방지)
6. 상태 갱신
```

**초기 데이터 로드** (페이지 진입 시):
1. `getTrackingImports(workSessionId)` → 공급처별 업로드 상태
2. tracking_imports에 저장된 `invalidRows` / count로 파싱 결과 복원
3. 새로고침 후에도 업로드 완료 상태, 오류 행이 유지됨

---

### 5-10. 훅 — useTrackingMatch

`src/hooks/useTrackingMatch.ts`:

```ts
type UseTrackingMatchReturn = {
  // 상태
  trackings: Tracking[]
  stats: TrackingStats
  isLoading: boolean

  // 수동 매칭
  manualMatch: (trackingId: string, allocationId: string) => Promise<void>
  overwriteMatch: (trackingId: string, allocationId: string) => Promise<void>

  // 기존 매칭 체크
  checkExistingMatch: (allocationId: string) => Tracking | undefined

  // 필터
  filteredTrackings: Tracking[]
  filter: TrackingStatus | 'all'
  setFilter: (filter: TrackingStatus | 'all') => void
}
```

**수동 매칭 정책:**
1. 기본은 **덮어쓰기 차단**: `updateTrackingMatch` 호출, 같은 allocation에 기존 matched가 있으면 에러
2. 사용자가 명시적으로 덮어쓰기 선택 시: `overwriteTrackingMatch` 호출
3. 성공 → trackings 재조회 + stats 재계산 + toast

---

### 5-11. 훅 — useTrackingExport

`src/hooks/useTrackingExport.ts`:

```ts
type UseTrackingExportReturn = {
  // 상태
  exportData: {
    coupang: { count: number; unmatchedCount: number }
    toss: { count: number; unmatchedCount: number }
  }
  isLoading: boolean
  courierWarnings: CourierWarning[]

  // 다운로드
  downloadPlatformFile: (platform: 'coupang' | 'toss') => Promise<void>
}

type CourierWarning = {
  trackingId: string
  platform: 'coupang' | 'toss'
  supplierId: string
  supplierName: string
  originalCourier: string
  trackingNumber: string
}
```

**다운로드 흐름 (책임 분리):**

```
useTrackingExport (훅 — 오케스트레이션):
1. matched trackings 조회 → target platform 필터링 (order.platform 기준)
2. allocation → order 조인 (rawValues 포함)
3. trackingNumber 없는 건 제외
4. 같은 allocationId 중복 matched 검증
5. courierConverter로 택배사명 변환 + CourierWarning 수집
6. StandardTrackingExport 구성
7. getPlatformTemplate(platform)
8. downloadPlatformTemplateFile(template.templatePath) → templateBlob
9. generateTrackingExportExcel(exportData, template, templateBlob)
10. downloadBlob(blob, fileName)

trackingExportGenerator (generator — ExcelJS 작업만):
- templateBlob을 ExcelJS로 로드
- 기존 데이터 영역 clear
- rawValues 복사 + 운송장 컬럼 덮어쓰기
- Blob 반환
```

파일명: `{platform}_운송장_{YYYYMMDD}.xlsx` (예: `쿠팡_운송장_20260510.xlsx`)

---

### 5-12. 택배사 변환 로직

`src/lib/matching/courierConverter.ts`:

```ts
function convertCourierName(
  tracking: Tracking,
  platform: 'coupang' | 'toss',
  courierMappings: CourierMapping[]
): { name: string; isMapped: boolean }
```

- `courierMappings`에서 `(sourceSupplierId, sourceName)` 검색
- 매핑 있으면 → `platform === 'coupang' ? mapping.coupangName : mapping.tossName`
- 매핑 없으면 → 원본 반환 + `isMapped: false` (경고 플래그)

**택배사 미매핑 정책 (최종):**
- 택배사 매핑이 없어도 플랫폼 파일 출력은 **허용**
- 원본 택배사명으로 출력하고 UI에 경고 표시
- 플랫폼에서 원본명을 인식하지 못할 수 있으므로 사용자가 확인해야 함
- **출력 시점에만 변환** — DB `trackings.tracking_company`에는 공급처 원본값만 저장

---

### 5-13. 운송장 엑셀 생성기

`src/lib/generators/trackingExportGenerator.ts`:

```ts
async function generateTrackingExportExcel(
  exportData: StandardTrackingExport,
  template: PlatformTrackingTemplate,
  templateBlob: Blob                    // ← 훅에서 Storage 다운로드 후 전달
): Promise<Blob>
```

**generator는 Supabase Storage를 직접 호출하지 않는다.** 훅이 blob을 다운로드하여 전달.

**핵심 원칙:**
1. **새 워크북 생성 금지** — templateBlob을 ExcelJS로 로드
2. 양식의 헤더/안내행 **그대로 보존** (토스 1~4행 절대 수정 안 함)
3. 기존 데이터 영역 **먼저 clear** (dataStartRow ~ 마지막 행)
4. 데이터 행에 **rawValues 전체를 셀 배열로 복사** (원본 보존)
5. 운송장 관련 컬럼만 **덮어쓰기** (1-based 인덱스로 직접 사용)
6. 토스는 주문상태 컬럼도 변경

**생성 흐름:**

```ts
// 1. templateBlob → ExcelJS 워크북 로드
const wb = new ExcelJS.Workbook()
await wb.xlsx.load(await templateBlob.arrayBuffer())
const ws = wb.getWorksheet(template.sheetName)

// 2. 사전 검증: 중복 매칭 체크
validateNoDuplicateAllocations(exportData.items)

// 3. 기존 데이터 영역 clear (dataStartRow ~ 실제 마지막 행)
clearDataRows(ws, template.dataStartRow)

// 4. 각 item 채우기
exportData.items.forEach((item, i) => {
  const targetRow = ws.getRow(template.dataStartRow + i)

  // 4-1. rawValues 복사 (원본 보존)
  // rawValues가 짧으면 나머지 빈 셀, 길면 필요 범위만 복사
  item.originalRowValues.forEach((val, idx) => {
    targetRow.getCell(idx + 1).value = val  // 1-based
  })

  // 4-2. 운송장 컬럼 덮어쓰기 (1-based 인덱스 직접 사용)
  targetRow.getCell(template.trackingCompanyColumnIndex).value = item.trackingCompany
  targetRow.getCell(template.trackingNumberColumnIndex).value = item.trackingNumber

  // 4-3. 토스: 주문상태 변경
  if (template.statusColumnIndex && template.statusValue) {
    targetRow.getCell(template.statusColumnIndex).value = template.statusValue
  }

  targetRow.commit()
})

// 5. items < 기존 행 → 남은 행 값 clear
// 6. items > 기존 행 → 행 추가 + 첫 데이터 행 스타일 복사

// 7. Blob 반환
const buffer = await wb.xlsx.writeBuffer()
return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
```

**출력 전 검증:**
1. matched 상태 + allocation_id 있음 + trackingNumber 있음 + target platform 일치 → 출력 대상
2. 같은 allocationId에 matched Tracking 2개 이상 → **출력 차단 + 에러**
3. 택배사 매핑 안 된 건 → 경고 표시, 원본명으로 출력 허용
4. unmatched/duplicated/invalid/parser invalidRows → **모두 출력에서 제외**

---

### 5-14. 운송장 엑셀 생성기 테스트

`src/lib/generators/trackingExportGenerator.test.ts`:

최소 10개 테스트:

```
1. 정상: 쿠팡 양식 — rawValues 복사 + D열 택배사 + E열 운송장번호
2. 정상: 토스 양식 — rawValues 복사 + D열 주문상태 "배송중" + F열 택배사 + G열 송장번호
3. 정상: 토스 1~4행 보존 확인
4. 정상: 택배사 변환 — courierMapping 적용 후 출력
5. 정상: 택배사 미매핑 — 원본 그대로 + courierMapped=false
6. 에러: 중복 allocationId — 2건 이상 matched → 에러 throw
7. 정상: 기존 데이터 clear — 양식에 남은 샘플 데이터 제거 확인
8. 정상: items < 기존 행 → 남은 행 값 clear
9. 정상: items > 기존 행 → 행 추가
10. 정상: rawValues가 짧으면 나머지 빈 셀 padding
```

---

### 5-15. 운송장 업로드 페이지 UI

`src/pages/tracking/TrackingUpload.tsx`:

Phase 1의 Placeholder를 교체.

**작업건 status별 제한:**
- `ordered`: 업로드/재업로드 가능
- `completed`: 조회만 가능, 업로드 비활성, 안내: "완료된 작업건은 수정할 수 없습니다"

**구성** (시안 `tracking-upload.jsx` 참조):

#### 상단: 현재 작업건 + 탭
- 현재 작업건 이름 표시 + [작업건 변경] 링크 → `/tracking`
- `TrackingTabs` 컴포넌트 (upload 활성, canOpenMatch/canOpenDownload 계산하여 전달)

#### 01. 공급처 선택 섹션
- 공급처 드롭다운 (활성 공급처만)
- "어느 공급처에서 받은 운송장인지 선택하세요" 안내
- **이미 업로드된 공급처**: 공급처명 옆에 체크 뱃지 + 건수 표시

#### 공급처 스트립 (시안 참조)
- 선택된 공급처 카드: 이름 + "파싱 완료 N건" 또는 "미업로드"
- 다른 업로드된 공급처도 가로 스트립으로 표시

#### 02. 파일 업로드 섹션
- 공급처 미선택 시: 드롭존 비활성 + "공급처를 먼저 선택해 주세요"
- 공급처 선택 시: 드래그앤드롭 + 파일 선택 버튼
- 업로드 완료 시: 파일명 + 파싱 건수 + [다시 업로드] 버튼

**파일 업로드 흐름:**
1. 파일 선택
2. 파싱 + 매칭 실행 (파싱 성공 확인)
3. 해당 공급처에 기존 업로드가 있으면 → ConfirmDialog: "기존 {공급처명} 운송장 데이터가 대체되고, 매칭 결과도 새로 계산됩니다."
4. 확인 → DB 저장 (기존 삭제 → 새로 저장, 보상 처리 포함)
5. 파싱 실패 → toast.error, 기존 데이터 보존

#### 파싱 결과 요약 (시안 ParseSummary 참조)
- 정상 파싱 N건 / 오류 N건 / 감지된 택배사: {detectedCourier}

#### 운송장 목록 테이블 (시안 TrackingTable 참조)
- 컬럼: # / 원본 주문번호 / 상품명 / 수령인 / 택배사 / 운송장번호
- 상품명/수령인: ParsedTracking에서 추출된 값 표시, 없으면 "-"
- 최대 20건 표시, 나머지는 "... 외 N건" 표시

#### 하단 CTA 바 (시안 FooterCTA 참조)
- 좌측: 업로드 요약 ("운송장 N건이 정상적으로 업로드됐어요")
- 우측: [다음: 매칭 결과 →]
- 다음 버튼 활성 조건: tracking_imports가 1건 이상

---

### 5-16. 매칭 결과 페이지 UI

`src/pages/tracking/TrackingMatchResult.tsx`:

**구성** (시안 `tracking.jsx` 참조):

#### 상단: 작업건 + 탭
- `TrackingTabs` 컴포넌트 (match 활성)

#### 매칭 요약 카드 4개 (시안 StatCards 참조)
- 매칭됨: N건 (초록)
- 미매칭: N건 (빨강)
- 중복: N건 (주황)
- 오류: N건 (회색)

#### 상태 필터 바 (시안 FilterBar 참조)
- 전체 / 매칭됨 / 미매칭 / 중복 / 오류
- 각 필터에 건수 표시

#### 택배사 매핑 경고 배너
- 택배사 매핑이 안 된 건이 있으면 상단에 경고 배너 표시
- "택배사 매핑이 되지 않은 운송장이 N건 있습니다. 원본 택배사명으로 출력됩니다."
- [택배사 매핑 관리] 링크 → `/mapping/couriers`

#### 결과 테이블 (시안 MatchTable 참조)

**매칭됨 (matched) 행:**
- 컬럼: # / 주문번호 / 상품명 / 수취인 / 택배사 / 운송장번호 / 상태
- 택배사 매핑 안 된 경우: "매핑 필요" 경고 뱃지 (주황)
- 상태: 초록 뱃지 "매칭됨"

**미매칭 (unmatched) 행:**
- 컬럼: # / 원본키 / 상품명(raw에서) / 수취인(raw에서) / 사유 / [수동 매칭]
- 사유: "해당 주문 없음" / "해당 공급처 배정 없음"
- [수동 매칭] 버튼 → 수동 매칭 모달

**중복 (duplicated) 행:**
- 컬럼: # / 원본키 / 상품명 / 수취인 / 택배사 / 운송장번호 / 사유
- 상태: 주황 뱃지 "중복"

**오류 (invalid) 행:**
- 컬럼: # / 행번호 / 사유
- 상태: 회색 뱃지 "오류"

#### 수동 매칭 모달 (Dialog)

트리거: 미매칭 행의 [수동 매칭] 버튼.

**구성:**
- 현재 운송장 정보: 원본키 / 택배사 / 운송장번호
- 주문 검색 입력: 주문번호 또는 수취인 이름으로 검색
- 검색 결과 테이블: 주문번호 / 상품명 / 수취인 / 공급처 / [연결] 버튼
- **검색 범위**: 해당 작업건 + 해당 공급처에 배정된 주문만 표시

**수동 매칭 흐름:**
1. 주문 선택 → `checkExistingMatch(allocationId)` 호출
2. 기존 matched tracking 없음 → `manualMatch(trackingId, allocationId)` 실행
3. 기존 matched tracking 있음 → ConfirmDialog: "이 주문에 이미 운송장이 연결되어 있습니다. 기존 운송장을 대체하시겠습니까?"
   - 확인 → `overwriteMatch(trackingId, allocationId)` 실행
   - 기존 matched tracking → status='duplicated', reason='수동 매칭으로 대체됨'
4. 모달 닫기 + 테이블 갱신 + toast: "수동 매칭 완료"

#### 하단 CTA 바
- 좌측:
  - 처리 안 된 항목 있을 때: "⚠️ 처리되지 않은 항목이 N건 있어요"
  - 전부 매칭됨: "✅ 모든 운송장이 정상 매칭되었어요"
- 우측: [이전] [다음: 플랫폼 파일 다운로드 →]
- 다음 버튼 활성 조건: matched 건이 1건 이상

---

### 5-17. 플랫폼 파일 다운로드 페이지 UI

`src/pages/tracking/TrackingDownload.tsx`:

**구성** (시안 `tracking-download.jsx` 참조):

#### 상단: 작업건 + 탭
- `TrackingTabs` 컴포넌트 (download 활성)

#### 미매칭 경고 배너
- 미매칭/중복/오류 건이 있으면: "미매칭 N건은 파일에서 제외됩니다"

#### 택배사 매핑 경고 배너
- 매핑 안 된 택배사가 있으면 경고 배너
- "일부 택배사명이 매핑되지 않아 원본명으로 출력됩니다" + [택배사 매핑 관리] 링크

#### 플랫폼별 다운로드 카드 (시안 DownloadCard 참조)

**쿠팡 카드:**
- 로고 아이콘
- "쿠팡 운송장" + 작업건명
- 매칭 건수 (matched 중 쿠팡 주문만 카운트)
- 미매칭 건수 (있으면 "미매칭 N건은 파일에서 제외" 표시)
- 파일명 미리보기: `쿠팡_운송장_{YYYYMMDD}.xlsx`
- [다운로드] 버튼
- 양식 미등록 시: 버튼 비활성 + "운송장 양식을 먼저 등록해 주세요" + [양식 등록하러 가기] 링크

**토스 카드:** 동일 구조, 파일명: `토스_운송장_{YYYYMMDD}.xlsx`

#### 작업 완료 처리
- [운송장 처리 완료] 버튼
- 사전 검증:
  - matched 0건 → 차단
  - 미매칭/중복/오류 존재 → 경고 표시
- ConfirmDialog:
  - "플랫폼 업로드 파일을 다운로드했습니다" **체크박스 선택 필수** → 완료 버튼 활성
  - 미매칭 건수 표시
- 확인 → `completeWorkSession(sessionId)`
  - `status='ordered'`인 작업건만 `completed`로 변경
  - 이미 `completed`이면 no-op
- 완료 후 → 읽기 전용 전환, **재다운로드는 가능**

**completed 상태 정책:**
- 운송장 업로드/재업로드 불가
- 수동 매칭 불가
- 운송장 처리 완료 버튼 비활성
- 기존 매칭 결과 조회 가능
- **플랫폼 파일 재다운로드 가능** (completed는 수정 불가이지, 조회/재생성은 허용)

---

### 5-18. 플랫폼 운송장 양식 관리 페이지

`src/pages/settings/PlatformTemplate.tsx`:

Phase 1의 Placeholder를 교체.

**구성** (시안 `platform-form.jsx` 참조):

#### 플랫폼 탭
- 쿠팡 / 토스 탭 전환

#### 양식 미등록 상태
- "운송장 양식이 등록되지 않았습니다"
- [양식 등록] 버튼 → 등록 흐름 시작

#### 양식 등록 흐름

**Step 1: 파일 업로드**
- 빈 양식 엑셀 파일 업로드 (드래그앤드롭 + 파일 선택)
- **`.xlsx`만 허용** (ExcelJS 출력 템플릿용, `.xls` 거부)
- "플랫폼에서 다운로드한 빈 운송장 업로드 양식을 올려주세요"

**Step 2: 시트/행 설정**
- SheetJS로 시트 목록 읽기 → 시트 선택 드롭다운
- 헤더 행 번호 입력 (기본값: 쿠팡 1, 토스 3)
- 데이터 시작 행 번호 입력 (기본값: 쿠팡 2, 토스 5)

**Step 3: 컬럼 매핑**
- 헤더를 읽어 컬럼 목록 표시
- 각 필수 컬럼의 위치(인덱스) 지정 (드롭다운 — 헤더 목록에서 선택):
  - 매칭키 컬럼 (필수)
  - 택배사 컬럼 (필수)
  - 운송장번호 컬럼 (필수)
  - **토스 전용**: 주문상태 컬럼 (필수) + 변경값 입력 (기본값: "배송중")
- 선택된 컬럼의 1-based 인덱스를 저장

**필수 컬럼 중복 선택 검증:**
- 쿠팡: matchKey / trackingCompany / trackingNumber columnIndex 중복 금지
- 토스: matchKey / status / trackingCompany / trackingNumber columnIndex 중복 금지
- 중복 시 저장 차단 + "같은 컬럼을 여러 필드에 선택할 수 없습니다" 에러

**Step 4: 미리보기**
- 샘플 데이터 1~3행을 보여주며 매핑 확인
- "이 컬럼이 매칭키입니다", "이 컬럼에 택배사를 채웁니다" 등 시각적 가이드

**[저장] (순서 중요):**
1. 새 양식 파일 → Supabase Storage 업로드 (`uploadPlatformTemplateFile`)
2. `upsertPlatformTemplate` → DB 저장
3. DB upsert 성공 → 기존 Storage 파일 삭제 (`removePlatformTemplateFile`)
4. DB upsert 실패 → 새로 업로드한 파일 삭제 (보상 처리)
5. toast: "양식이 저장되었습니다"

#### 양식 등록 완료 상태
- 양식 정보 카드: 파일명 / 시트명 / 헤더 행 / 데이터 시작 행
- 컬럼 매핑 표시: 매칭키 컬럼명(인덱스) / 택배사 / 운송장번호 / (토스: 주문상태)
- [양식 변경] 버튼 → 등록 흐름 재시작
- [미리보기] → 샘플 데이터 표시

---

### 5-19. 훅 — usePlatformTemplate

`src/hooks/usePlatformTemplate.ts`:

```ts
type UsePlatformTemplateReturn = {
  template: PlatformTrackingTemplate | null
  isLoading: boolean
  saveTemplate: (input: PlatformTemplateInput) => Promise<void>
}
```

---

### 5-20. 운송장 완료 처리

`src/lib/supabase/workSessions.ts`에 추가:

```ts
completeWorkSession(sessionId: string): Promise<void>
// 1. work_session.status가 'ordered'인지 확인 (아니면 에러)
// 2. matched tracking이 1건 이상인지 확인 (0건이면 에러)
// 3. status → 'completed', completed_at → now()
// 이미 completed이면 no-op
```

---

## 데이터 흐름 정리

### 운송장 업로드 시

```
공급처 선택
    ↓
파일 업로드 → validateExcelFile
    ↓
SheetJS로 workbook 읽기
    ↓
parseTracking(workbook)
    ↓
TrackingParseResult { trackings, invalidRows, meta }
    ↓
trackings가 0건이면 DB 저장 없이 UI에 결과만 표시
    ↓
orders + allocations(status=ordered) + existingTrackings 조회
    ↓
runMatching(parsedTrackings, orders, allocations, existingTrackings, supplierId)
    ↓
MatchingResult { matched, unmatched, duplicated, invalid }
    ↓
기존 tracking_import 존재 여부 확인
    ↓ (있으면 ConfirmDialog)
재업로드: 기존 삭제 → 새로 저장 (보상 처리 포함)
신규: 바로 저장
    ↓
tracking_imports에 invalidRows/meta 저장
trackings에 matched/unmatched/duplicated/invalid 모두 저장
    ↓
UI 갱신
```

### 수동 매칭 시

```
미매칭 행에서 [수동 매칭] 클릭
    ↓
수동 매칭 모달 → 주문 검색
    ↓
사용자가 allocation 선택
    ↓
checkExistingMatch(allocationId)
    ├─ 없음 → manualMatch(trackingId, allocationId)
    └─ 있음 → ConfirmDialog "덮어쓰시겠습니까?"
               └─ 확인 → overwriteMatch(trackingId, allocationId)
                          (기존 matched → duplicated, 새 tracking → matched)
    ↓
trackings + stats 재조회
    ↓
toast.success("수동 매칭 완료")
```

### 플랫폼 파일 다운로드 시

```
[쿠팡/토스 다운로드] 클릭
    ↓
matched trackings 조회
    ↓
allocation → order 조인 (rawValues 포함)
    ↓
target platform 필터링 (order.platform 기준)
    ↓
trackingNumber 없는 건 제외
    ↓
같은 allocationId 중복 matched 검증 → 있으면 에러
    ↓
courierConverter로 택배사명 변환 + CourierWarning 수집
    ↓
StandardTrackingExport 구성
    ↓
getPlatformTemplate(platform)
    ↓
downloadPlatformTemplateFile(template.templatePath) → templateBlob
    ↓
generateTrackingExportExcel(exportData, template, templateBlob)
    ↓
기존 데이터 clear → rawValues 복사 → 운송장 컬럼 덮어쓰기
    ↓
downloadBlob(blob, fileName)
```

### 운송장 완료 처리 시

```
[운송장 처리 완료] 클릭
    ↓
사전 검증 (matched 0건 → 차단, 미매칭 → 경고)
    ↓
ConfirmDialog + "플랫폼 업로드 파일을 다운로드했습니다" 체크 필수
    ↓
completeWorkSession(sessionId) — status='completed'
    ↓
성공 toast → 읽기 전용 전환 (재다운로드 가능)
```

---

## 엣지케이스 처리

### 운송장 파싱
- 인식 불가 엑셀 형식 → 에러 throw, toast 에러 메시지
- 모든 행이 빈 행 → validCount=0, "파싱할 데이터가 없습니다" 안내, DB 저장 안 함
- 택배사 누락 행 → parser invalidRow (trackings에 넣지 않고 tracking_imports.invalid_rows에 저장)
- 동일 공급처 재업로드 → 기존 tracking_import + trackings cascade 삭제 후 새로 저장 (보상 처리)
- 여러 공급처 운송장 → 공급처별로 각각 업로드 (하나의 파일에 하나의 공급처)
- 공급처 운송장 파일은 `.xlsx`, `.xls` 모두 허용 (SheetJS 파싱 대상)

### 매칭 엔진
- 하나의 공급처 파일에 쿠팡/토스 주문이 섞임 → matchingKey로 자동 판별, 플랫폼 출력에서 분리
- 같은 rawOrderKey 중복 → 첫 번째만 matched, 나머지 duplicated
- 이미 다른 공급처에서 매칭된 allocation → duplicated
- 공급처 변경(Phase 4 "오늘만 변경") 후 매칭 → sourceSupplierId로 정확히 필터링
- rawOrderKey 앞뒤 공백 → trim 후 비교
- 기본 매칭 대상 allocation.status = 'ordered'

### 택배사 변환
- 매핑 없는 택배사 → 원본명 그대로 출력 + UI에 "매핑 필요" 경고
- 같은 공급처에서 여러 택배사 사용 → 각각 변환
- sourceSupplierId가 다르면 같은 sourceName이어도 다른 매핑 사용

### 플랫폼 출력
- 같은 allocationId에 matched Tracking 2개 이상 → **출력 차단 + 에러**
- 양식 미등록 → 다운로드 버튼 비활성 + "운송장 양식을 먼저 등록해 주세요"
- matched 0건 → 다운로드 버튼 비활성 + "매칭된 운송장이 없습니다"
- rawValues 길이가 양식 컬럼 수와 다름 → 짧으면 나머지 빈 셀, 길면 필요 범위만 복사
- 기존 데이터 clear → items 적으면 남은 행 clear, 많으면 행 추가 + 스타일 복사
- 토스 1~4행 절대 수정 안 함

### 수동 매칭
- 이미 매칭된 tracking → [수동 매칭] 버튼 미표시 (matched 상태에서는 불필요)
- 선택한 allocation에 기존 matched tracking 있음 → **기본 차단**, 사용자 확인 시 덮어쓰기
- 덮어쓰기 시 기존 matched → duplicated (reason: "수동 매칭으로 대체됨")

### 양식 관리
- `.xls` 파일 → 거부 (플랫폼 템플릿은 `.xlsx`만 허용)
- 시트가 없는 파일 → 에러
- 필수 컬럼 미지정 → 저장 차단
- 필수 컬럼 중복 선택 → 저장 차단
- 저장 순서: 새 파일 업로드 → DB upsert → 기존 파일 삭제 (보상 처리)

### completed 상태
- 업로드/재업로드 불가
- 수동 매칭 불가
- 완료 버튼 비활성
- 매칭 결과 조회 가능
- **플랫폼 파일 재다운로드 가능**

---

## 완료 기준

### 파일 존재
- [ ] `src/lib/parsers/trackingParser.ts` — parseTracking 함수
- [ ] `src/lib/parsers/trackingParser.test.ts` — 테스트 12개 이상
- [ ] `src/lib/matching/matchingEngine.ts` — runMatching 함수
- [ ] `src/lib/matching/matchingEngine.test.ts` — 테스트 14개 이상
- [ ] `src/lib/matching/courierConverter.ts` — convertCourierName 함수
- [ ] `src/lib/generators/trackingExportGenerator.ts` — generateTrackingExportExcel 함수
- [ ] `src/lib/generators/trackingExportGenerator.test.ts` — 테스트 10개 이상
- [ ] `src/lib/supabase/trackings.ts` — tracking CRUD 8개+ 함수
- [ ] `src/lib/supabase/platformTemplates.ts` — platform template CRUD 5개 함수 (get/upsert/upload/download/remove)
- [ ] `src/hooks/useTrackingUpload.ts` — 업로드 + 재업로드 훅
- [ ] `src/hooks/useTrackingMatch.ts` — 매칭 조회 + 수동 매칭(overwrite 포함) + 필터 훅
- [ ] `src/hooks/useTrackingExport.ts` — 플랫폼 다운로드 훅
- [ ] `src/hooks/usePlatformTemplate.ts` — 양식 관리 훅
- [ ] `src/components/TrackingTabs.tsx` — 3단계 탭 네비게이션 (props 기반 활성/비활성)
- [ ] `src/pages/tracking/TrackingSessionSelector.tsx` — 작업건 선택
- [ ] `src/pages/tracking/TrackingUpload.tsx` — Placeholder 교체된 실제 페이지
- [ ] `src/pages/tracking/TrackingMatchResult.tsx` — 매칭 결과 + 수동 매칭
- [ ] `src/pages/tracking/TrackingDownload.tsx` — 플랫폼 파일 다운로드
- [ ] `src/pages/settings/PlatformTemplate.tsx` — Placeholder 교체된 실제 페이지

### DB 마이그레이션
- [ ] tracking_imports ALTER: total_rows, valid_count, invalid_count, skipped_rows, detected_courier, invalid_rows 추가
- [ ] tracking_imports에 unique(work_session_id, source_supplier_id) 제약 존재
- [ ] trackings에 matched allocation 중복 방지 partial unique index 존재

### 라우팅
- [ ] `/tracking` → TrackingSessionSelector (기존 Tracking.tsx 교체)
- [ ] `/tracking/:sessionId/upload` → TrackingUpload
- [ ] `/tracking/:sessionId/match` → TrackingMatchResult
- [ ] `/tracking/:sessionId/download` → TrackingDownload
- [ ] 기존 Tracking.tsx 삭제

### 운송장 파싱
- [ ] A업체: 업체주문번호 → rawOrderKey, 택배사 → trackingCompany, 송장번호 → trackingNumber
- [ ] B업체: 거래처주문번호 → rawOrderKey, 운송장번호 → trackingNumber (컬럼명 차이)
- [ ] 범용 컬럼 자동 감지 (업체주문번호/거래처주문번호 + 택배사 + 송장번호/운송장번호)
- [ ] productName/recipientName 추출 가능하면 ParsedTracking에 포함
- [ ] 빈 행 스킵 (skippedRows), invalidRow 분류, detectedCourier 계산
- [ ] rawRowNumber 1-based, 문자열 trim 적용
- [ ] 인식 불가 형식 → 에러 throw
- [ ] 공급처 운송장 업로드는 .xlsx/.xls 허용
- [ ] parser invalidRows는 tracking_imports.invalid_rows에 저장 (trackings 테이블 아님)
- [ ] 새로고침 후에도 파싱 오류 행 확인 가능

### 매칭 엔진
- [ ] rawOrderKey → orders.matching_key 일치 매칭 (trim 후 비교)
- [ ] orderId + sourceSupplierId → allocations 검색
- [ ] 기본 매칭 대상 allocation.status = 'ordered'
- [ ] 기존 matched tracking + 현재 배치 내 중복 체크
- [ ] 4가지 상태 분류: matched / unmatched / duplicated / invalid
- [ ] 각 상태에 invalidReason 포함
- [ ] MatchingResult 4개 상태를 모두 trackings에 저장
- [ ] 하나의 tracking_import에 쿠팡/토스 주문이 섞여도 매칭됨

### UI 동작
- [ ] 공급처 선택 → 파일 업로드 → 파싱 + 매칭 자동 실행
- [ ] 재업로드 → ConfirmDialog → 파싱/매칭 성공 후 기존 삭제 → 새로 저장 (보상 처리)
- [ ] 재업로드 실패 시 반쪽 저장 상태를 남기지 않음
- [ ] 매칭 결과 필터 (전체/매칭됨/미매칭/중복/오류)
- [ ] 수동 매칭 모달: 주문 검색 → 선택 → 기존 매칭 체크 → DB 업데이트
- [ ] 수동 매칭 시 allocation에 기존 matched tracking 있으면 기본 차단, 덮어쓰기 확인 후 처리
- [ ] 택배사 매핑 경고 배너 + 택배사 매핑 페이지 링크
- [ ] 택배사 미매핑 시 원본명으로 출력, 경고에 원본 택배사명 표시
- [ ] 플랫폼별 다운로드 카드 (건수, 미매칭 제외 표시, 양식 미등록 비활성)
- [ ] unmatched/duplicated/invalid/parser invalidRows는 플랫폼 출력에서 제외
- [ ] 다운로드 페이지에 제외 건수 표시
- [ ] 운송장 처리 완료 → 확인 체크박스("플랫폼 파일 다운로드 완료") 필수 → work_session status='completed'
- [ ] completed 상태 → 업로드/수동매칭 불가, 플랫폼 파일 재다운로드 가능
- [ ] TrackingTabs는 DB 조회 없이 props 기반 활성/비활성
- [ ] TrackingSessionSelector는 active/ordered/completed 모두 표시, active는 클릭 불가

### 플랫폼 운송장 양식 관리
- [ ] 쿠팡/토스 탭 전환
- [ ] 빈 양식 파일 업로드 → 시트/행 설정 → 컬럼 매핑 → 저장
- [ ] 매칭키/택배사/운송장번호 컬럼 위치 지정 (드롭다운, 1-based 인덱스)
- [ ] 토스: 주문상태 컬럼 + 변경값("배송중") 설정
- [ ] 필수 컬럼 미지정 시 저장 차단
- [ ] 필수 컬럼 중복 선택 시 저장 차단
- [ ] 플랫폼 운송장 템플릿은 .xlsx만 허용
- [ ] 저장: 새 파일 업로드 → DB upsert → 기존 파일 삭제 (보상 처리)
- [ ] DB upsert 실패 시 새로 업로드한 파일 삭제

### 엑셀 생성
- [ ] generateTrackingExportExcel은 templateBlob을 인자로 받음 (Storage 직접 호출 안 함)
- [ ] ExcelJS로 templateBlob 로드 (새 워크북 생성 아님)
- [ ] rawValues 셀 배열 그대로 복사 (원본 보존)
- [ ] rawValues 짧으면 빈 셀 padding, 길면 필요 범위만 복사
- [ ] 택배사/운송장번호 컬럼만 덮어쓰기 (1-based 인덱스 직접 사용)
- [ ] 토스: 주문상태 컬럼 "배송중"으로 변경
- [ ] 토스: 1~4행 보존, 데이터는 5행부터
- [ ] 기존 데이터 영역 clear → items 적으면 남은 행 clear, 많으면 행 추가 + 스타일 복사
- [ ] 중복 allocationId matched → 출력 차단
- [ ] 택배사 변환: courierMappings 적용, 미매핑 시 원본 + 경고
- [ ] 출력 대상: matched + allocation 있음 + trackingNumber 있음 + target platform 일치
- [ ] 파일명: `{platform}_운송장_{YYYYMMDD}.xlsx`
- [ ] CourierWarning에 platform/supplierName/trackingNumber 포함
- [ ] TrackingExportItem에 originalRowValues/courierMapped 포함
- [ ] 쿠팡 기본 컬럼: 주문번호 3, 택배사 4, 운송장번호 5 (1-based)
- [ ] 토스 기본 컬럼: 주문상품번호 3, 주문상태 4, 택배사 6, 송장번호 7 (1-based)

### 완료 처리
- [ ] completeWorkSession은 status='ordered'인 작업건만 completed로 변경
- [ ] matched tracking 0건이면 완료 차단
- [ ] 운송장 완료 처리 시 다운로드 확인 체크 필요

### 빌드 / 린트 / 테스트
- [ ] `npm run build` 성공
- [ ] `npm run typecheck` 성공
- [ ] `npm run lint` 에러 없음
- [ ] `npm run test:run` 전체 통과 (기존 테스트 + 새 테스트 36건+)

---

## 이 Phase에서 하지 않는 것

- ❌ 대시보드 (Phase 6)
- ❌ 실제 데이터 E2E 테스트 (Phase 6)
- ❌ Vercel 배포 (Phase 6)
- ❌ 운송장 이메일 전송
- ❌ 운송장 PDF 출력
- ❌ 운송장 매칭 이력/로그 관리
- ❌ 자동 재매칭 (수동만)
- ❌ 운송장 파일 ZIP 일괄 다운로드
- ❌ 운송장 파싱 양식 커스터마이징 (하드코딩 컬럼 감지)
- ❌ 다운로드 이력 추적 테이블
