# 프로젝트 진행 상태

> 이 파일은 `/project:verify`와 `/project:next-phase` 커맨드가 자동으로 갱신합니다.
> 수동 편집도 가능하지만, "현재 단계" 값은 커맨드의 기준이 되므로 정확히 유지할 것.

## 현재 단계
6

## 진행 단계 전체 흐름

```
Phase 0 → [디자인 시스템 추출] → Phase 1 → 2 → 3 → 4 → 5 → 6
```

`[디자인 시스템 추출]`은 코드 단계가 아니라 **Claude Design으로 시각 디자인을 만들고 그 결과를 코드 토큰으로 옮기는 작업**이다.
Phase 0 검증 통과 후, Phase 1 시작 전에 반드시 거쳐야 한다.

---

## 단계별 진행 현황

### Phase 0: 프로젝트 셋업
- **상태**: ✅ 완료
- **시작일**: 2026-05-08
- **완료일**: 2026-05-08
- **스펙 문서**: `docs/specs/PHASE_00_프로젝트_셋업.md`
- **검증 결과**: `docs/specs/PHASE_00-verify.md` — ✅ 통과 (P1: 0건, P2: 2건 수용/보류)
- **산출물**:
  - [x] Vite + React + TypeScript 프로젝트 초기화
  - [x] Tailwind CSS + shadcn/ui (디자인 토큰은 임시값)
  - [x] Supabase DB 12테이블 마이그레이션 + RLS
  - [x] Storage 버킷 (templates)
  - [x] TypeScript 타입 정의 (`src/types/index.ts`)
  - [x] Zod 스키마 (`src/lib/schemas/index.ts`)
  - [x] 유틸 함수 (phone.ts, excel.ts, lib/utils.ts)
  - [x] Supabase 클라이언트
  - [x] ESLint + Prettier + Vitest 설정
  - [x] .env.example, .gitignore, package.json scripts
- **이슈/메모**: -

### 디자인 시스템 추출 (Phase 0 ↔ Phase 1 사이)
- **상태**: ✅ 완료
- **시작일**: 2026-05-09
- **완료일**: 2026-05-09
- **유형**: 비-코드 작업 (디자인 → 추출 → 토큰 교체)
- **산출물**:
  - [x] Claude Design으로 핵심 화면 시안 1~2개 생성
        (예: 대시보드, 발주서 공급처 배정 화면)
  - [x] 시안에서 색상/타이포/스페이싱/라운딩/그림자 값 추출
  - [x] `docs/REF_디자인_시스템.md` 작성
        (색상 토큰 전체, 타이포 스케일, 스페이싱 체계,
         컴포넌트별 className 패턴 — Button, Input, Card, Badge, Modal, Table 등)
  - [x] `src/index.css`의 `@theme` 블록을 추출한 정식 토큰으로 교체
  - [x] `npm run build` 통과 확인
- **이슈/메모**: -

### Phase 1: 인증 + 레이아웃
- **상태**: ✅ 완료
- **시작일**: 2026-05-09
- **완료일**: 2026-05-09
- **스펙 문서**: `docs/specs/PHASE_01_인증_레이아웃.md`
- **검증 결과**: `docs/specs/PHASE_01-verify.md` — ✅ 통과 (P1: 0건, P2: 2건 수정 완료)
- **산출물**:
  - [x] 로그인 페이지 (시안 재현, form/trim/aria/에러 처리)
  - [x] AppLayout (240px 사이드바 + 메인 그리드)
  - [x] AuthProvider + useAuth 훅 (세션 복원/구독/cleanup)
  - [x] ProtectedRoute / PublicRoute (인증 가드)
  - [x] Sidebar (9개 메뉴 + 2개 섹션 라벨 + 로그아웃)
  - [x] TopBar (라우트 기반 제목)
  - [x] 공통 컴포넌트 (Logo, PageHeader, StatusBadge, EmptyState, LoadingSpinner, FileUpload, ConfirmDialog)
  - [x] shadcn/ui (button, input, label, dialog, dropdown-menu, separator, sonner)
  - [x] ErrorBoundary (class component)
  - [x] Placeholder 페이지 9개
  - [x] 웹폰트 (Pretendard + JetBrains Mono)
- **이슈/메모**: shadcn 기본 토큰(bg-popover 등) 미정의 → 권장 수정

### Phase 2: 매핑 관리
- **상태**: ✅ 완료
- **시작일**: 2026-05-09
- **완료일**: 2026-05-10
- **스펙 문서**: `docs/specs/PHASE_02_매핑_관리.md`
- **검증 결과**: `docs/specs/PHASE_02-verify.md` — ✅ 통과 (P1: 0건, P2: 1건 수정 완료)
- **선행 조건**: Phase 1 ✅
- **산출물**:
  - [x] `src/lib/supabase/errors.ts` — DB 에러 공통 유틸
  - [x] `src/lib/supabase/suppliers.ts` — 공급처 CRUD API
  - [x] `src/lib/supabase/productMappings.ts` — 품목 매핑 CRUD API
  - [x] `src/lib/supabase/nameMappings.ts` — 상품명 변환 CRUD API
  - [x] `src/lib/supabase/courierMappings.ts` — 택배사 매핑 CRUD API
  - [x] `src/hooks/useSuppliers.ts` — 공급처 훅
  - [x] `src/hooks/useProductMappings.ts` — 품목 매핑 훅
  - [x] `src/hooks/useNameMappings.ts` — 상품명 변환 훅
  - [x] `src/hooks/useCourierMappings.ts` — 택배사 매핑 훅
  - [x] `src/components/PlatformBadge.tsx` — 플랫폼 뱃지
  - [x] shadcn/ui 컴포넌트 (table, select, sheet, badge, tooltip, popover, checkbox)
  - [x] Zod 폼 스키마 + WithSupplier 타입
  - [x] 매핑 관리 4개 페이지 UI (공급처/품목/상품명/택배사)
- **이슈/메모**: -

### Phase 3: 주문 업로드 + 파싱
- **상태**: ✅ 완료
- **시작일**: 2026-05-10
- **완료일**: 2026-05-10
- **스펙 문서**: `docs/specs/PHASE_03_주문_업로드_파싱.md`
- **검증 결과**: `docs/specs/PHASE_03-verify.md` — ✅ 통과 (P1: 0건 수용안함, P2: 2건 수정 완료, YELLOW: 2건 수정 완료)
- **선행 조건**: Phase 2 ✅
- **산출물**:
  - [x] DB 마이그레이션 (order_imports 컬럼 추가)
  - [x] ParseResult 타입 확장 (DuplicateRow, ParseMeta)
  - [x] OrderImport 타입/스키마/Row 타입/변환 함수 업데이트
  - [x] `src/lib/supabase/workSessions.ts` — CRUD 4함수
  - [x] `src/lib/supabase/orders.ts` — createOrderImport, saveOrders, getOrders, getOrderImports, deleteOrderImport
  - [x] `src/lib/parsers/coupangParser.ts` — Delivery 시트, 40컬럼, 중복 감지
  - [x] `src/lib/parsers/tossParser.ts` — 주문내역 시트, 1~4행 스킵, matchingKey=주문상품번호
  - [x] `src/lib/parsers/platformDetector.ts` — 쿠팡/토스 자동 감지
  - [x] `src/lib/parsers/coupangParser.test.ts` — 16 테스트
  - [x] `src/lib/parsers/tossParser.test.ts` — 13 테스트
  - [x] `src/lib/parsers/platformDetector.test.ts` — 3 테스트
  - [x] `src/hooks/useWorkSessions.ts` — 목록 조회 + 생성
  - [x] `src/hooks/useWorkSession.ts` — 개별 조회 (URL 기반)
  - [x] `src/hooks/useOrderUpload.ts` — prepare/commit 패턴
  - [x] `src/pages/orders/WorkSessionSelector.tsx` — 작업건 생성/선택
  - [x] `src/pages/orders/OrderUpload.tsx` — 업로드 카드, 파싱 결과, 주문 테이블, CTA
  - [x] 라우팅 업데이트 (sessionId 기반 동적 라우트 4개)
  - [x] `npm run build` 통과
  - [x] `npm run typecheck` 통과
  - [x] `npm run lint` 통과
  - [x] `npm run test:run` 전체 통과 (47 tests)
- **이슈/메모**: -

### Phase 4: 공급처 배정 + 발주서
- **상태**: ✅ 완료
- **시작일**: 2026-05-10
- **완료일**: 2026-05-10
- **스펙 문서**: `docs/specs/PHASE_04_공급처_배정_발주서.md`
- **검증 결과**: `docs/specs/PHASE_04-verify.md` — ✅ 통과 (P1: 3건 수정 완료, P2: 7건 수정 완료 + 1건 수용 안 함)
- **선행 조건**: Phase 3 ✅
- **산출물**:
  - [x] DB 마이그레이션 2건 (allocations.name_mapping_applied, complete_order_session RPC)
  - [x] `src/lib/allocation/autoAllocator.ts` — 자동 배정 순수 함수 + 와일드카드 매칭
  - [x] `src/lib/allocation/autoAllocator.test.ts` — 19 테스트 전체 통과
  - [x] `src/lib/generators/purchaseOrderGenerator.ts` — ExcelJS 기반 발주서 생성
  - [x] `src/lib/generators/purchaseOrderGenerator.test.ts` — 9 테스트 전체 통과
  - [x] `src/lib/supabase/allocations.ts` — 배정 CRUD 6개 함수
  - [x] `src/lib/supabase/supplierTemplates.ts` — 양식 CRUD 7개 함수
  - [x] `src/lib/supabase/productMappings.ts` — switchDefaultSupplier, createAutoProductMapping 추가
  - [x] `src/hooks/useAllocation.ts` — 자동 배정, 공급처 변경(NameMapping 재조회 + isDefault 전환), 미분류 배정(product_mapping 자동 추가), 분배
  - [x] `src/hooks/useSupplierTemplate.ts` — 양식 저장/삭제 + Storage 보상 처리
  - [x] `src/hooks/usePurchaseOrder.ts` — 다운로드, 전체 다운로드, 검증, 완료 처리
  - [x] `src/pages/orders/SupplierAllocation.tsx` — 아코디언 그룹, 필터, 분배 모달, 공급처 변경 다이얼로그
  - [x] `src/pages/orders/OrderDownload.tsx` — 공급처별 카드, 전체 다운로드, 완료 확인 다이얼로그
  - [x] `src/pages/settings/SupplierTemplate.tsx` — 양식 등록/수정, 시트 변경 매핑 갱신
  - [x] `src/components/OrderTabs.tsx` — 3단계 탭 네비게이션
  - [x] `src/utils/download.ts` — downloadBlob + 파일명 생성
- **이슈/메모**: useEffect 의존성 구조는 running 가드로 방어 — 현 상태 유지

### Phase 5: 운송장 매칭 + 출력
- **상태**: ✅ 완료
- **시작일**: 2026-05-10
- **완료일**: 2026-05-10
- **스펙 문서**: `docs/specs/PHASE_05_운송장_매칭_출력.md`
- **검증 결과**: `docs/specs/PHASE_05-verify.md` — ✅ 통과
- **선행 조건**: Phase 4 ✅
- **산출물**:
  - [x] DB 마이그레이션 (tracking_imports ALTER)
  - [x] `src/lib/parsers/trackingParser.ts` — A/B업체 운송장 파싱 + 테스트
  - [x] `src/lib/matching/matchingEngine.ts` — matchingKey 기반 매칭 + 테스트
  - [x] `src/lib/matching/courierConverter.ts` — 택배사 변환 + 테스트
  - [x] `src/lib/generators/trackingExportGenerator.ts` — 원본 양식 보존 출력 + 테스트
  - [x] `src/lib/supabase/trackings.ts` — 운송장 CRUD API
  - [x] `src/lib/supabase/platformTemplates.ts` — 플랫폼 양식 CRUD API
  - [x] `src/hooks/useTrackingUpload.ts` — 운송장 업로드 훅
  - [x] `src/hooks/useTrackingMatch.ts` — 매칭 실행/수동매칭 훅
  - [x] `src/hooks/useTrackingExport.ts` — 플랫폼 출력 훅
  - [x] `src/hooks/usePlatformTemplate.ts` — 플랫폼 양식 관리 훅
  - [x] `src/pages/tracking/TrackingUpload.tsx` — 운송장 업로드 페이지
  - [x] `src/pages/tracking/TrackingMatchResult.tsx` — 매칭 결과 페이지
  - [x] `src/pages/tracking/TrackingDownload.tsx` — 플랫폼 다운로드 페이지
  - [x] `src/pages/settings/PlatformTemplate.tsx` — 플랫폼 운송장 양식 관리
  - [x] `src/components/TrackingTabs.tsx` — 운송장 3단계 탭 네비게이션
  - [x] 브라우저 테스트 완료 (Phase 1~5 전체)
  - [x] 버그 수정: 자동배정 토스트 중복 (useRef 가드), Storage 파일명 sanitize
- **이슈/메모**: -

### Phase 6: 대시보드 + 마무리
- **상태**: ✅ 완료
- **시작일**: 2026-05-10
- **완료일**: 2026-05-11
- **스펙 문서**: `docs/specs/PHASE_06_대시보드_마무리.md`
- **검증 결과**: `docs/specs/PHASE_06-verify.md` — ✅ 통과 (P1: 0건, P2: 2건 수정 완료, P3: 1건 수정 완료)
- **선행 조건**: Phase 5 ✅
- **산출물**:
  - [x] DB View `work_session_dashboard_view` 생성
  - [x] `src/lib/supabase/dashboard.ts` — DashboardWorkSession, DashboardStats 타입 + API
  - [x] `src/hooks/useDashboard.ts` — 대시보드 훅 (error, refetch 포함)
  - [x] `src/utils/workSession.ts` — getDefaultWorkSessionName, getSessionProgress, getSessionEntryPath
  - [x] `src/components/work-session/CreateWorkSessionDialog.tsx` — 공통 다이얼로그
  - [x] WorkSessionSelector 공통 다이얼로그로 리팩터링
  - [x] `src/pages/Dashboard.tsx` — 인사말, 빠른 작업, 최근 작업건, 바로가기
  - [x] `src/components/theme-provider.tsx` + `theme-context.ts` — ThemeProvider (Vite SPA)
  - [x] `src/hooks/useTheme.ts` — useTheme 훅
  - [x] `src/components/ModeToggle.tsx` — DropdownMenu 방식 테마 전환
  - [x] App.tsx에 ThemeProvider 래핑
  - [x] `src/index.css` `.dark` — semantic token 다크 테마 토큰
  - [x] `bg-white` → `bg-card` 하드코딩 색상 교체 (전체)
  - [x] ModeToggle → Sidebar 하단 배치
  - [x] `vercel.json` — SPA 리라이트 설정
  - [x] `docs/USER_GUIDE.md` — 운영자 사용 가이드
  - [x] `README.md` — 배포 가이드, 문서 구분 추가
  - [x] `npm run build` 통과
  - [x] `npm run typecheck` 통과
  - [x] `npm run lint` 통과
  - [x] `npm run test:run` 전체 통과 (118 tests)
  - [x] 브라우저 테스트 (대시보드 UI, 다크모드 전환)
  - [x] Codex P2/P3 지적사항 수정 (DB View 마이그레이션, 미매칭 쿼리, 다이얼로그 초기화)
  - [x] `docs/REF_디자인_시스템.md` 다크 테마 토큰 섹션 추가
- **이슈/메모**: -

---

## 의사결정 로그

> Phase 진행 중 스펙과 다른 판단을 내린 경우 여기에 기록.
> 회귀 방지 + 리뷰 시 컨텍스트 제공 목적.

| 날짜 | 단계 | 결정 내용 | 사유 |
|------|------|----------|------|
| - | - | - | - |

## 알려진 이슈

> 해결되면 행을 지우지 말고 상태를 "해결됨"으로 변경하고 해결일 기록.

| 등록일 | 단계 | 이슈 | 상태 | 해결일 |
|--------|------|------|------|--------|
| - | - | - | - | - |

## 상태 범례
- ⬜ 대기 — 스펙 미작성 또는 선행 단계 미완료
- 🔵 진행중 — 구현 진행 중
- 🟡 검증중 — 구현 완료, `/project:verify` 실행 중
- ❌ 검증 실패 — 수정 필요 항목 있음
- ✅ 완료 — 검증 통과, `/project:next-phase` 실행됨
