# src/utils/ — 유틸리티 함수

## 파일 구성
- `phone.ts` — 전화번호 처리
- `excel.ts` — SheetJS 기반 엑셀 읽기 공통 함수
- `file.ts` — 파일 업로드 검증

## 전화번호 (`phone.ts`)

### 함수
```ts
export function extractDigits(phone: string): string
export function formatHyphen(digits: string): string
export function applyPhoneFormat(value: string, format?: 'raw' | 'hyphen' | 'digits'): string
```

### 포맷 규칙
- `raw`: 원본 그대로 (`"0504-3406-1054"` 또는 `"050877183460"`)
- `digits`: 숫자만 (`"05043406054"`)
- `hyphen`: 하이픈 삽입 (`"0504-3406-1054"`)

### 하이픈 삽입 규칙
- `050x`로 시작 (안심번호): `0504-3406-1054` (4-4-4)
- `010` (휴대폰): `010-1234-5678` (3-4-4)
- `02` (서울 지역번호): `02-1234-5678` (2-4-4)
- 기타 3자리 지역번호: `031-123-4567` (3-3-4)

### 핵심 원칙
- DB에 저장할 때는 항상 **원본 그대로**
- `*_phone_digits` 컬럼은 **검색/매칭용 보조 데이터**
- 출력(발주서 엑셀 등) 시점에 SupplierTemplate.columnMappings.format에 따라 변환

---

## 엑셀 읽기 (`excel.ts`)

### 함수
```ts
export function readExcelFile(file: File): Promise<XLSX.WorkBook>
export function sheetToRows(sheet: XLSX.WorkSheet): unknown[][]

/**
 * 헤더 행 → 컬럼명: 인덱스 Map.
 * ⚠️ 디버깅/검증/에러 메시지용으로만 사용한다.
 *    실제 파서의 컬럼 매핑은 0-based 인덱스 상수로 한다.
 */
export function buildHeaderMap(headerRow: unknown[]): Map<string, number>

export function cellToString(value: unknown): string
export function cellToInt(value: unknown): number | null
export function isEmptyRow(row: unknown[]): boolean
```

### 라이브러리 분리 원칙
- **SheetJS (`xlsx`)**: 읽기 전용 — 이 폴더의 `excel.ts`에서만 사용
- **ExcelJS**: 쓰기 전용 — `src/lib/generators/`에서만 사용

### 컬럼 매핑 원칙
- 내부 코드는 **0-based 인덱스 상수**를 사용
- 컬럼명 검색 금지 (B업체 양식에 빈 컬럼/중복 컬럼 존재)
- `buildHeaderMap`은 **사람이 읽는 에러 메시지** 생성 등 보조 용도로만 사용
  - 예: `"3행: '주문번호' 컬럼이 비어있습니다"` 메시지를 만들 때

```ts
// 좋은 예
const COUPANG_ORDER_COLUMNS = {
  orderNumber: 2,  // C열 (1-based: 3, 0-based: 2)
  carrier: 3,      // D열
  trackingNumber: 4, // E열
} as const

const orderNo = row[COUPANG_ORDER_COLUMNS.orderNumber]
```

```ts
// 나쁜 예 — 컬럼명으로 매핑
const headerMap = buildHeaderMap(headerRow)
const orderNo = row[headerMap.get('주문번호')!]  // 금지
```

상세 컬럼 인덱스는 `docs/REF_엑셀_구조.md` 참조.

---

## 파일 업로드 검증 (`file.ts`)

### 상수
```ts
export const ALLOWED_EXCEL_EXTENSIONS = ['xlsx', 'xls'] as const
export const MAX_UPLOAD_SIZE_MB = 10
```

### 함수
```ts
/** 파일명에서 확장자 추출 (소문자, 점 없이) */
export function getFileExtension(filename: string): string

/** 파일 크기 검증, 초과 시 한국어 에러 throw */
export function assertFileSize(file: File, maxMb: number): void

/** 엑셀 파일 종합 검증 (확장자 + 크기), 실패 시 한국어 에러 throw */
export function validateExcelFile(file: File): void
```

### 검증 규칙
- 확장자: `.xlsx`, `.xls`만 허용 (대소문자 무시)
- 크기: 10MB 초과 시 거부
- 실패 시 사람이 읽을 수 있는 한국어 에러 메시지 throw
  - 예: `"엑셀 파일만 업로드 가능합니다 (.xlsx, .xls)"`
  - 예: `"파일 크기가 10MB를 초과했습니다"`

### 사용처
모든 파일 업로드 진입점:
- 주문 엑셀 업로드 (Phase 3)
- 운송장 엑셀 업로드 (Phase 5)
- 양식 템플릿 업로드 (Phase 4, 5)
