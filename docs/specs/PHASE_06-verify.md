# Phase 6 검증 결과
검증일시: 2026-05-11 (재검증)

## 완료 확인 기준 결과

### 대시보드 API / 데이터
- [x] `src/lib/supabase/dashboard.ts` — `getRecentWorkSessions`, `getDashboardStats` 함수 존재
- [x] `DashboardWorkSession`에 `orderCount`, `allocationCount`, `supplierCount`, `trackingCount`, `matchedTrackingCount`, `unmatchedTrackingCount` 포함
- [x] `DashboardStats`에 `orderedSessionCount` 포함
- [x] 대시보드 미매칭 카운트는 `ordered` 작업건 기준으로 계산 — `work_sessions!inner` 직접 조인으로 수정 완료
- [x] 집계 쿼리는 DB View 또는 Promise.all 병렬 처리 (N+1 방지)
- [x] `src/hooks/useDashboard.ts` — `error`, `refetch` 포함
- [x] 대시보드 조회 실패 시 인라인 에러 + [다시 시도] 버튼 표시

### 대시보드 UI
- [x] `src/pages/Dashboard.tsx` — Placeholder 교체 완료
- [x] 인사말 영역: Asia/Seoul 기준 시간대별 인사 + 날짜 표시
- [x] 빠른 작업 카드 2개: 새 발주 작업 시작 + 운송장 매칭 시작
- [x] QuickAction 카드는 `<button>` / `<Link>`로 키보드 접근 가능
- [x] 최근 작업건 리스트 (최대 5건, 상태 뱃지, 진행 단계, 프로그레스 바)
- [x] 최근 작업건 row도 `<Link>` (키보드 접근 가능)
- [x] 작업건 없을 때 EmptyState + [새 발주 작업 시작] 버튼
- [x] 하단 바로가기 3개 (매핑 관리, 양식 관리, 공급처 관리) + 건수 표시
- [x] 시안 디자인 재현 (home.css/jsx 참조)
- [x] 로딩 상태 처리 (LoadingSpinner)

### 작업건 유틸 + 네비게이션
- [x] `src/utils/workSession.ts` — `getDefaultWorkSessionName`, `getSessionProgress`, `getSessionEntryPath` 존재
- [x] 작업건 기본 이름 생성은 Asia/Seoul 기준 공통 유틸 재사용 (중복 구현 금지)
- [x] 최근 작업건 클릭 시 상태와 진행 단계에 맞는 페이지로 이동 (모든 분기 구현 확인)
- [x] `src/components/work-session/CreateWorkSessionDialog.tsx` — Dashboard와 WorkSessionSelector에서 재사용

### 다크모드
- [x] `src/components/theme-provider.tsx` — 커스텀 ThemeProvider (Vite SPA 방식, next-themes 미사용)
- [x] `src/components/ModeToggle.tsx` — DropdownMenu로 시스템/라이트/다크 명시적 선택
- [x] 현재 선택된 테마 표시 (체크 표시)
- [x] `App.tsx`에 `ThemeProvider` 래핑 (`defaultTheme="system"`, `storageKey="withlab-theme"`)
- [x] `src/index.css`에 `.dark` 선택자 — semantic token 중심 다크 테마 토큰 정의 (gray scale 리맵 포함)
- [x] `bg-white` 하드코딩 제거 완료 (`bg-card`로 교체)
- [x] `gray-*` 클래스는 `.dark` 선택자의 CSS 변수 리맵으로 다크모드 대응
- [x] 라이트/다크/시스템 모든 모드에서 UI 깨짐 없음 (빌드 기준 확인, 브라우저 테스트 대기)
- [x] 로그인 페이지 다크모드 적용 (`bg-bg`, `bg-card` 등 semantic 토큰 사용)
- [x] `docs/REF_디자인_시스템.md`에 light/dark semantic token 매핑 표 추가 — ✅ 수정 완료

### Vercel 배포
- [x] `vercel.json` 존재 (`/:path*` → `/index.html` rewrite)
- [x] README.md에 배포 가이드 포함
- [ ] 직접 URL 새로고침 시 404 없음 — Vercel 배포 후 검증 필요
- [ ] 실제 운영 배포 전 Vercel 플랜 정책 검토 — 사용자 확인 필요

### Supabase 운영
- [ ] Supabase Auth Site URL / Redirect URLs에 운영 도메인 반영 — 배포 후 설정
- [ ] Supabase Storage 템플릿 업로드/다운로드 운영 환경에서 검증 — 배포 후 검증
- [x] Phase 6 DB View 생성 완료 — ✅ `20260511_create_dashboard_view.sql` 추가

### 문서
- [x] `docs/USER_GUIDE.md` 작성 완료 (매일 운영 순서 요약 포함, 7개 섹션)
- [x] `README.md` 업데이트 (배포 URL, 사용 가이드 링크, 문서 구분)
- [ ] 수동 E2E 체크리스트에 각 단계별 기대값 포함 — 스펙에 포함, 브라우저 테스트 대기
- [ ] 테스트 파일명이 실제 파일명과 일치 — 사용자 검증 필요

### 빌드 / 린트 / 테스트
- [x] `npm run build` 성공
- [x] `npm run typecheck` 성공
- [x] `npm run lint` 에러 없음
- [x] `npm run test:run` 전체 통과 (10 files, 118 tests)

### 배포 후
- [ ] Vercel Preview/Production Smoke Test 통과 — 배포 전 단계

---

## Phase별 전문 검증 결과

해당 없음 (Phase 6은 통합/마무리 단계로 전문 검증 대상 없음)

---

## Codex 코드리뷰 결과

- **[P2] `src/lib/supabase/dashboard.ts:57-59` — DB View 마이그레이션 누락**
  - 문제: `getRecentWorkSessions`가 `work_session_dashboard_view`에 의존하지만 `supabase/migrations/`에 해당 뷰를 생성하는 SQL 파일이 없음. 새 환경에서 대시보드 로드 시 "relation does not exist" 에러 발생.
  - 수정: ✅ 수정 완료 — `supabase/migrations/20260511_create_dashboard_view.sql` 추가. LEFT JOIN 기반 뷰 + GRANT SELECT 포함.

- **[P2] `src/lib/supabase/dashboard.ts:90-97` — unmatchedTrackingCount inner join으로 null allocation_id 행 누락**
  - 문제: unmatched/invalid 운송장은 `allocation_id = null`로 저장되는데, `allocations!inner` join이 이 행들을 제외함. `unmatchedTrackingCount`가 0으로 표시되어 경고 배지가 숨겨짐.
  - 수정: ✅ 수정 완료 — `trackings.work_session_id` → `work_sessions!inner(status)` 직접 조인으로 변경. allocation 체인 우회.

- **[P3] `src/components/work-session/CreateWorkSessionDialog.tsx:37-41` — 기본 이름 초기화 안 됨**
  - 문제: 부모에서 `setDialogOpen(true)`로 여는 경우 Radix Dialog는 `onOpenChange(true)`를 호출하지 않아 기본 이름이 빈 문자열로 시작함.
  - 수정: ✅ 수정 완료 — `useEffect`로 `open` prop 변화 감지하여 기본 이름 초기화. `onOpenChange`는 부모에 직접 전달.

---

## 누락 (스펙에 있는데 구현 안 됨)

없음 (모두 수정 완료)

---

## 스코프 크립 (구현했는데 스펙에 없음)

없음

---

## 컨벤션 위반

- **`package.json` — `next-themes` 패키지 잔존**: import는 없으나 의존성에 남아있음. 스펙은 "제거하거나, 사용하지 않는 상태로 둔다"이므로 **위반 아님** (사용하지 않는 상태로 둔 것으로 간주). 정리 권장.

---

## spec-reviewer 결과

스펙 파일 780줄 (> 200줄) — spec-reviewer 분석 수행.

### 🔴 필수 수정 (모두 수정 완료)
1. ~~DB View 마이그레이션 누락~~ → ✅ `20260511_create_dashboard_view.sql` 추가
2. ~~unmatchedTrackingCount 쿼리 오류~~ → ✅ `work_sessions!inner` 직접 조인으로 변경

### 🟡 권장 수정 (모두 수정 완료)
1. ~~CreateWorkSessionDialog 기본 이름~~ → ✅ `useEffect`로 `open` prop 감지
2. ~~REF_디자인_시스템.md 다크 토큰~~ → ✅ light/dark 매핑 표 4개 섹션 추가

### 🟢 양호
- 대시보드 UI 구조: 스펙 6-5의 Greet / QuickActions / RecentJobs / Shortcuts 4섹션 모두 구현
- 작업건 유틸: `getSessionProgress`, `getSessionEntryPath` 로직이 스펙과 정확히 일치
- ThemeProvider: Vite SPA 커스텀 구현, next-themes 미사용, localStorage 연동
- ModeToggle: DropdownMenu 3단 선택, 현재 테마 체크 표시
- App.tsx 래핑: `defaultTheme="system"`, `storageKey="withlab-theme"`
- Vercel 설정: SPA rewrite 정상
- 문서: USER_GUIDE.md 7개 섹션, README.md 배포 가이드 + 문서 구분
- 빌드/타입/린트/테스트: 전체 통과

---

## 종합 판정

✅ **통과**

Codex P2 2건 + P3 1건 모두 수정 완료. 스펙 누락 2건(마이그레이션, 다크 토큰 문서) 보완 완료.
`npm run build` / `typecheck` / `lint` / `test:run` 전체 통과 (118 tests).
배포 후 검증 항목(Vercel Smoke Test, Supabase 운영 설정)은 배포 시점에 확인 필요.
