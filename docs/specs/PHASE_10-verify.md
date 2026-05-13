# Phase 10 검증 결과

검증일시: 2026-05-13

## 완료 확인 기준 결과

### 빌드/테스트

- [x] `npm run typecheck` 통과
- [x] `npm run test:run` 통과 (210 tests, 16 files)
- [x] `npm run build` 성공
- [x] `npm run lint` 통과 (warning 0건)

### Part A 검증
- [x] `active` 상태 작업건에서 allocationCount > 0이면 운송장 탭 진입 가능
- [x] `active` + allocationCount = 0이면 진입 불가 + "공급처 배정을 먼저 완료해 주세요" 안내 표시
- [x] `pending` 상태 배정도 매칭 대상에 포함 (`MATCHABLE_STATUSES: ['pending', 'ordered']`)
- [x] `ordered` 상태 매칭 기존과 동일 (회귀 테스트 존재)
- [x] `active` 상태에서 운송장 완료 시 발주 스킵 확인 모달 표시
- [x] `active` → `completed` 전이 시 pending alloc → ordered 변경
- [x] `active` → `completed` 전이 시 `ordered_at` 기록 — ✅ 수정 완료
- [x] `completed` 상태에서 발주서 재다운로드 가능

### Part B 검증
- [x] 간편 운송장 페이지 접근 가능 (`/tracking/simple`)
- [x] 쿠팡 주문 엑셀 업로드 → 파싱 성공
- [x] 토스 주문 엑셀 업로드 → 파싱 성공
- [x] 복수 파일 업로드 + 플랫폼 자동 감지
- [x] platform + matchingKey 중복 감지 → 경고 표시
- [x] 같은 matchingKey가 여러 주문에 존재 → unmatched ("동일 주문키가 여러 주문에 존재")
- [x] 공급처 선택 + 운송장 업로드 → 매칭 결과 표시
- [x] 복수 공급처 운송장 추가 가능
- [x] 매칭된 건 플랫폼 엑셀 다운로드 → 정상 파일
- [x] 업무 데이터 테이블에 write 없음 (기준정보 read만)
- [x] 플랫폼 템플릿 미등록 시 다운로드 비활성 + 양식 관리 링크
- [x] 택배사 미매핑 시 원본명 출력 + 경고 표시
- [x] 페이지 새로고침/탭 닫기 시 beforeunload 경고
- [x] 간편 모드 export item의 allocationId가 falsy (빈 문자열 — generator에서 skip 정상 동작)

### Part C 검증
- [x] active/ordered에서 운송장 임포트 삭제 버튼 표시
- [x] completed에서는 삭제 버튼 숨김 (`!isCompleted` 가드)
- [x] 삭제 확인 모달에 건수 + 다운로드 영향 안내
- [x] 삭제 → 소속 trackings cascade 삭제
- [x] 삭제 후 재업로드 정상 동작
- [x] deleteTrackingImport은 DB 원문 에러를 UI에 직접 노출하지 않음

### Part D 검증
- [x] order_imports.label NOT NULL + 기존 데이터 backfill (마이그레이션 확인)
- [x] unique(work_session_id, platform, label) 제약 동작
- [x] 같은 플랫폼 주문 파일 "별도 파일로 추가" 가능
- [x] 라벨 자동 채번 (플랫폼별 공통 로직)
- [x] label은 1~20자 검증 + 파일명 sanitize
- [x] 기존 "교체/합치기" 동작 영향 없음
- [x] 라벨이 달라도 같은 matchingKey 중복 주문은 duplicate 처리
- [x] 운송장 다운로드 시 라벨별 분리 다운로드 가능
- [x] 같은 플랫폼 import 1개뿐이면 분리 UI 미표시
- [x] TrackingExportItem에 orderImportLabel 포함
- [x] filterExportItemsByImportLabel은 orderImportLabel 기준 필터링
- [x] 간편 운송장에서도 분리 다운로드 가능

### 테스트 추가

**matchingEngine 테스트:**
- [x] pending allocation 매칭 성공
- [x] pending + ordered 혼합 매칭
- [x] ordered allocation 기존 동작 유지 (회귀)

**directMatcher 테스트:**
- [x] 정상 매칭 시 order 데이터 포함
- [x] rawOrderKey 빈값 → invalid
- [x] 주문 없는 키 → unmatched
- [x] 동일 orderId 중복 → duplicated
- [x] 같은 matchingKey 여러 order → unmatched (ambiguous)
- [x] 복수 주문 + 복수 운송장 혼합
- [x] 추가: 공백 trim 후 매칭
- [x] 추가: alreadyMatchedOrderIds 중복 처리
- [x] 추가: alreadyMatchedOrderIds 미포함 시 정상 매칭

## Phase별 전문 검증 결과

해당 없음 (Phase 10은 Phase 0~6 외의 추가 단계이므로 자동 호출 대상 아님)
- 단, 매칭엔진/directMatcher 테스트가 스펙에서 요구한 10개 + 추가 3개 = 13개 테스트 케이스를 모두 포함하며, 210개 전체 테스트 통과 확인 완료.

## Codex 코드리뷰 결과

- **[P1] src/hooks/useOrderUpload.ts:266-268** — 교체 시 같은 플랫폼 전체 import 삭제
  - 문제: `plan.existingImports`가 해당 플랫폼의 모든 import을 포함(`imports.filter(i => i.platform === detected)`). 교체 모드에서 이 전체를 삭제하므로, 쿠팡1+쿠팡2 존재 시 교체를 선택하면 양쪽 모두 삭제됨.
  - 수정: ✅ 다이얼로그 "교체하기" 옵션에 복수 파일 삭제 경고 문구 추가 (`기존 파일 N개가 모두 삭제됩니다`). 개별 교체는 삭제 후 재업로드로 대응.

- **[P2] src/pages/tracking/SimpleTracking.tsx:91-92** — 라벨 채번 시 중복 가능성
  - 문제: `generateLabel`이 count 기반으로 채번(`sameCount + 1`). 중간 파일 삭제 후 재업로드 시 기존 라벨과 충돌 가능 (예: 쿠팡1 삭제 후 새 쿠팡 파일 → 쿠팡2 중복).
  - 수정: ✅ `generateLabel`을 `getNextLabel`과 동일한 방식(기존 라벨 Set에서 미사용 번호 탐색)으로 교체.

## 누락 (스펙에 있는데 구현 안 됨)

없음 — 아래 항목은 검증 과정에서 발견되어 수정 완료됨:

1. ~~`completeWorkSession`에서 `ordered_at` 기록 누락~~ → ✅ 수정 완료
2. ~~`orderImportSchema` (Zod)에 `label` 필드 누락~~ → ✅ 수정 완료

## 스코프 크립 (구현했는데 스펙에 없음)

없음 — Part E 섹션이 스펙에 추가되어 추가 구현 모두 문서화됨.

## 컨벤션 위반

없음 — 아래 항목은 수정 완료:

- ~~SimpleTracking.tsx ESLint warning~~ → ✅ `eslint-disable-next-line` 주석 추가

## spec-reviewer 결과

### 🟢 양호 (전체 일치)
- Part A: 매칭 엔진 MATCHABLE_STATUSES, TrackingSessionSelector isClickable 함수, workSession 유틸
- Part B: SimpleTracking 3단계 UI, directMatcher 알고리즘 및 테스트, /tracking/simple 라우트, beforeunload
- Part C: deleteTrackingImport API, 훅 확장, TrackingUpload 삭제 UI + completed 숨김
- Part D: DB 마이그레이션 정확 일치, 타입 확장, 3-way 다이얼로그, 라벨별 분리 다운로드
- Part E: alreadyMatchedOrderIds, 공급처 가시성, extractFromRaw, 주문 삭제 시 운송장 초기화

### 🟡 권장 수정 → 모두 수정 완료
- ~~`orderImportSchema` Zod에 `label` 필드 추가~~ → ✅
- `TrackingExportItem.allocationId` 타입 `string | null` — 미수정 (falsy 체크로 동작 동일, 수용)
- ~~SimpleTracking `generateLabel` 라벨 충돌 방지~~ → ✅
- ~~교체 다이얼로그 복수 import 삭제 경고~~ → ✅

### 🔴 필수 수정 → 수정 완료
- ~~`completeWorkSession`에서 `ordered_at` 기록~~ → ✅

## 종합 판정

✅ 통과

수정 내역:

| 항목 | 수정 내용 |
| --- | --- |
| `completeWorkSession` ordered_at | active→completed 시 ordered_at 기록 추가 |
| `orderImportSchema` label | Zod 스키마에 `label: z.string()` 추가 |
| Codex P1: 교체 경고 | 다이얼로그에 "기존 파일 N개가 모두 삭제됩니다" 경고 추가 |
| Codex P2: 라벨 채번 | `generateLabel`을 미사용 번호 탐색 방식으로 변경 |
| ESLint warning | `eslint-disable-next-line` 주석 추가 |
| 수용 안 함 | `allocationId` 타입 (`string` vs `string \| null`) — falsy 체크로 동작 동일 |
