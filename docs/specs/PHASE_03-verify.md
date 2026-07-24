# Phase 3 검증 결과
검증일시: 2026-05-10

## 완료 확인 기준 결과

### 파일 존재
- [x] `src/lib/supabase/workSessions.ts` — createWorkSession, getWorkSessions, getWorkSession, updateWorkSessionStatus
- [x] `src/lib/supabase/orders.ts` — createOrderImport, saveOrders, getOrders, getOrderImports, deleteOrderImport
- [x] `src/lib/parsers/coupangParser.ts` — parseCoupangOrders 함수
- [x] `src/lib/parsers/tossParser.ts` — parseTossOrders 함수
- [x] `src/lib/parsers/platformDetector.ts` — detectPlatform 함수
- [x] `src/lib/parsers/coupangParser.test.ts` — 16 테스트 전체 통과
- [x] `src/lib/parsers/tossParser.test.ts` — 13 테스트 전체 통과
- [x] `src/lib/parsers/platformDetector.test.ts` — 3 테스트 전체 통과
- [x] `src/hooks/useWorkSessions.ts` — 목록 조회 + 생성 훅
- [x] `src/hooks/useWorkSession.ts` — 개별 조회 훅 (sessionId 파라미터)
- [x] `src/hooks/useOrderUpload.ts` — prepare/commit 패턴 훅
- [x] `src/pages/orders/OrderUpload.tsx` — Placeholder 교체된 실제 페이지

### 타입 / 스키마
- [x] `ParseResult`에 `duplicateRows`, `meta` 포함 (types/index.ts:271-276)
- [x] `DuplicateRow`, `ParseMeta` 타입 추가 (types/index.ts:254-269)
- [x] `OrderImport` 타입에 total_rows/valid_count/invalid_count/duplicate_count/invalid_rows/duplicate_rows 반영 (types/index.ts:224-237)
- [x] 관련 Zod 스키마 + DB row 타입 + 변환 함수 업데이트 (schemas/index.ts:248-275, 365-378, 541-557)
- [x] order_imports 테이블 ALTER 마이그레이션 작성 (supabase/migrations/20260510_order_imports_add_columns.sql)

### 파싱 로직
- [x] 쿠팡 파싱: Delivery 시트, 1행 헤더, 2행부터 데이터, 40컬럼 매핑 — REF_엑셀_구조.md와 정확 일치
- [x] 토스 파싱: 주문내역 시트, 1~4행 스킵, 5행부터 데이터, 30컬럼 매핑 — REF_엑셀_구조.md와 정확 일치
- [x] 토스 matchingKey가 `주문상품번호` (orderItemNo, idx 2)인지 확인 — tossParser.ts:67, 141-142
- [x] 토스 주문번호 동일 + 주문상품번호 다름 → 중복이 아닌 별개 주문 라인 — tossParser.test.ts에 테스트 존재
- [x] 플랫폼 자동 감지 정상 동작 — platformDetector.ts, cellToString으로 trim 적용
- [x] 각 파서는 예상 시트가 없으면 명시적 에러 throw (빈 결과 반환 아님) — coupangParser.ts:53-54, tossParser.ts:50-51
- [x] invalidRow: 수량 NaN/0이하, 주문번호 누락, 수취인 누락, 주소 누락, 수취인 전화번호 누락/형식 오류
- [x] 빈 행은 스킵 (invalidRow가 아님, meta.skippedRows에만 카운트) — coupangParser.ts:72-74
- [x] 파일 내부 중복 matchingKey는 DB insert 전에 duplicateRows로 분리 — deduplicateOrders 함수
- [x] orders에는 중복 제거된 정상 주문만 포함
- [x] rawValues 고정 길이 (쿠팡 40개, 토스 30개) — normalizeRowValues로 padding
- [x] rawValues에는 trim 미적용 (엑셀 원본 보존), 표준 필드에는 trim 적용 (cellToString)
- [x] rawRowNumber에 1-based 엑셀 행 번호 저장 — coupangParser: i+2, tossParser: i+5
- [x] 전화번호 원본 보존 + digits 정확 추출 (extractDigits)
- [x] StandardOrder.id는 crypto.randomUUID()로 생성, DB orders.id에 그대로 저장
- [x] summary.total = valid + invalid + duplicate (빈 행 스킵은 제외)

### DB 저장
- [x] order_imports에 total/valid/invalid/duplicate count 저장 — orders.ts:28-33
- [x] order_imports에 invalid_rows/duplicate_rows jsonb 저장 — orders.ts:33-34
- [x] 재업로드는 파싱 성공 후에만 기존 데이터 삭제 — prepareUpload → ConfirmDialog → commitUpload
- [x] saveOrders 실패 시 반쪽 저장 상태를 남기지 않음 (보상 삭제) — useOrderUpload.ts:155-158
- [x] saveOrders는 빈 배열이면 insert 호출하지 않음 — orders.ts:46
- [x] 정상 주문 0건이면 DB 저장 진행하지 않음 — prepareUpload에서 throw

### UI
- [x] 작업건 생성/선택 UI 동작 (이름 자동 생성: Asia/Seoul 기준) — WorkSessionSelector.tsx:33-41
- [x] 파일 업로드 카드 2개 가로 배치 (expectedPlatform 검증 포함) — grid-cols-2
- [x] 업로드 상태별 UI 전환 (미업로드 → 업로드중 → 완료) — UploadCard 3 상태
- [x] 파싱 결과 요약 카드 (정상/오류/중복) — SummaryCell 3개
- [x] 오류 행 모달 (행 번호, 사유) + 중복 행 — Dialog, 2탭 구조
- [x] 주문 목록 테이블 (플랫폼 필터, 페이지네이션, 정렬: platform → rawRowNumber) — filteredOrders sort
- [x] 하단 CTA 바 (요약 + 다음 버튼) — sticky bottom
- [x] CTA 다음 경로: `/orders/:sessionId/allocation`
- [x] 탭 네비게이션 (업로드만 활성, 배정/다운로드 비활성)
- [x] status가 active인 작업건에서만 업로드/재업로드 가능 — isReadonly 체크
- [x] ordered/completed 작업건은 읽기 전용 + 안내 메시지 — 한국어 배너
- [x] ConfirmDialog는 페이지 컴포넌트에서 처리 (훅 내부 아님) — OrderUpload.tsx:398-411
- [x] 업로드 페이지 진입 시 기존 order_imports/orders/invalidRows/duplicateRows 복원

### 라우팅
- [x] `/orders/:sessionId/upload` 등 sessionId 기반 동적 라우트 — AppRoutes.tsx:46-54
- [x] WorkSession은 URL을 단일 진실로 사용 (전역 상태 미사용) — useParams → useWorkSession
- [x] 존재하지 않는 sessionId 접근 시 `/orders`로 리다이렉트 — OrderUpload.tsx:127-129

### 빌드 / 린트 / 테스트
- [x] `npm run build` 성공
- [x] `npm run typecheck` 성공
- [x] `npm run lint` 에러 없음
- [x] `npm run test:run` 전체 통과 — 4 files, 47 tests passed

---

## Phase별 전문 검증 결과

### check-types
- types ↔ REF 문서: ✅ — types/index.ts가 Phase 3 스펙 정의와 정확히 일치. REF_데이터_모델.md의 ParseResult/InvalidRow는 Phase 3 이전 버전이므로 스펙이 우선.
- schemas ↔ types: ✅ — standardOrderSchema, orderImportSchema, invalidRowSchema, duplicateRowSchema 모두 타입과 일치
- DB ↔ TS 변환: ✅ — OrderImportRow(snake_case) → toOrderImport(camelCase) 변환 정확, invalidRows/duplicateRows에 Zod 파싱 적용
- 매칭키 일관성: ✅ — 쿠팡(묶음배송번호=matchingKey), 토스(orderItemNo=matchingKey) 파서/타입/DB 전체 일관

### check-excel
- 쿠팡 파서: ✅ — 12개 컬럼 매핑 모두 REF_엑셀_구조.md와 정확 일치 (idx 2,9,10,11,22,24,25,26,27,28,29,30)
- 토스 파서: ✅ — 13개 컬럼 매핑 모두 REF_엑셀_구조.md와 정확 일치 (idx 0,1,2,8,11,12,15,16,17,18,19,20,21)
- HEADER_KEYS: ✅ — 쿠팡 40개, 토스 30개 컬럼명이 REF 문서와 일치
- normalizeRowValues: ✅ — 쿠팡 40, 토스 30 고정 길이 padding 적용

### generate-test
- 기존 테스트 파일이 충분한 커버리지로 이미 존재:
  - `coupangParser.test.ts` — 16 tests (정상/빈행/에러/중복/시트없음/meta)
  - `tossParser.test.ts` — 13 tests (정상/토스특수/중복/에러/시트없음)
  - `platformDetector.test.ts` — 3 tests (쿠팡/토스/미감지)
  - `phone.test.ts` — 15 tests (기존)
- 테스트 실행 결과: **47 passed / 0 failed**
- 추가 테스트 생성 불필요

---

## Codex 코드리뷰 결과

- **[P1] useOrderUpload.ts:134-135** — 재업로드 시 기존 데이터 선삭제 후 새 데이터 생성, 실패 시 데이터 손실 위험
  - 문제: `commitUpload`에서 `replaceExisting` 시 `deleteOrderImport`를 먼저 호출한 후 `createOrderImport`를 실행. `createOrderImport` 실패 시 기존 데이터가 이미 삭제되어 복구 불가.
  - 수정: 🔘 수용 안 함 — 스펙이 RPC 트랜잭션을 명시적으로 제외하고 보상 삭제 패턴을 선택함 (스펙 "이 Phase에서 하지 않는 것": "❌ Supabase RPC 트랜잭션"). DB unique 제약 `unique(work_session_id, platform)` 때문에 기존 삭제 전 새 import 생성이 불가능. 스펙 설계상 의도된 트레이드오프이며, RPC 트랜잭션 도입 시 해결 가능.

- **[P2] useOrderUpload.ts:48** — 세션 변경 시 이전 플랫폼 상태 미초기화
  - 문제: `workSessionId`가 변경될 때 이전 세션의 `coupangImport`/`tossImport` 및 파싱 결과가 클리어되지 않아, 새 세션에 해당 플랫폼 import가 없을 경우 이전 세션 데이터가 잔존.
  - 수정: ✅ 수정 완료 — useEffect 시작부에 `setCoupangImport(null)`, `setTossImport(null)`, `setCoupangParseResult(null)`, `setTossParseResult(null)`, `setOrders([])` 추가.

- **[P2] OrderUpload.tsx:71-75** — prepareUpload 유효성 검증 에러가 사용자에게 표시되지 않음
  - 문제: `prepareUpload`에서 발생하는 에러 (파일 형식 오류, 플랫폼 불일치, 정상 주문 0건 등)가 catch에서 무시되어 사용자에게 피드백 없음.
  - 수정: ✅ 수정 완료 — catch에서 `toast.error(err.message)` 호출로 변경. toast import 추가.

---

## 누락 (스펙에 있는데 구현 안 됨)
없음

## 스코프 크립 (구현했는데 스펙에 없음)
없음

## 컨벤션 위반
없음

## spec-reviewer 결과

spec-reviewer 서브에이전트 심층 비교 수행 완료.

### 🟢 양호 (전체 일치 확인)
- 데이터 흐름 (parse → save → restore): 정확
- 비즈니스 규칙 (matchingKey, 중복 감지): 정확
- 엣지케이스 (재업로드, 빈 파일, 잘못된 플랫폼): 정확
- 타입/스키마 정렬: 정확
- UI 스펙 준수 (탭, CTA, 모달, 테이블): 정확
- 라우팅: 정확

### 🔴 필수 수정
없음

### 🟡 권장 수정
1. **정상 주문 0건 시 상세 결과 미표시**: ✅ 수정 완료 — `prepareUpload`에서 throw 전에 parseResult를 상태에 저장하도록 변경. `hasUploads` 조건에 parseResult 존재 여부 추가. 이제 0건이어도 오류/중복 행 모달 확인 가능.
2. **REF_데이터_모델.md 미갱신**: ✅ 수정 완료 — ParseResult/InvalidRow/DuplicateRow/ParseMeta 정의를 Phase 3 구현에 맞게 갱신, OrderImport 섹션 신규 추가.

---

## 종합 판정
✅ 통과

- 빌드/타입체크/린트/테스트: 모두 성공 (47 tests)
- 스펙 완료 기준: 전 항목 충족
- Codex P1: 스펙 설계상 의도된 제약으로 수용 안 함 (미수정 P1 아님)
- Codex P2: 2건 모두 수정 완료
- spec-reviewer: RED 0건, YELLOW 2건 모두 수정 완료
- 누락/스코프크립/컨벤션 위반: 없음
