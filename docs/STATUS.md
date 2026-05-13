# 프로젝트 진행 상태

> 이 파일은 `/project:verify`와 `/project:next-phase` 커맨드가 자동으로 갱신합니다.
> 수동 편집도 가능하지만, "현재 단계" 값은 커맨드의 기준이 되므로 정확히 유지할 것.

## 현재 단계

10

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

### Phase 7: 공급처 상품 카탈로그 + 스마트 배정

- **상태**: ✅ 검증 통과
- **시작일**: 2026-05-11
- **완료일**: 2026-05-11
- **스펙 문서**: `docs/specs/PHASE_07_공급처_상품_스마트배정.md`
- **검증 결과**: `docs/specs/PHASE_07-verify.md` — ✅ 통과 (P1: 2건 수정 완료, P2: 2건 수정 완료)
- **선행 조건**: Phase 6 ✅
- **산출물**:
  - [x] DB 마이그레이션 4건 (supplier_product_templates, supplier_products, allocations ALTER, RPC 2개)
  - [x] 타입 + Zod 스키마 추가 (SupplierProduct, SupplierProductTemplate, StockStatus 등)
  - [x] Supabase API 2개 (supplierProductTemplates.ts, supplierProducts.ts)
  - [x] 공급처 상품 파서 + 테스트 (19개)
  - [x] 자동 매칭 제안 로직 + 테스트 (12개)
  - [x] 스마트 배정 로직 확장 + 테스트 (10개 신규, 기존 19개 하위호환 = 29개)
  - [x] Hook 3개 (useSupplierProducts, useMatchSuggestions, useAllocation 확장)
  - [x] UI: SupplierDetail 상품 목록 섹션
  - [x] UI: NameMapping 자동 매칭 제안 + 자동완성
  - [x] UI: SupplierAllocation 가격/재고 표시 + 상품 갱신 섹션
  - [x] UI: SupplierManage 상품 수 + 빠른 업로드
  - [x] UI: Dashboard totalProductCount
  - [x] 문서 업데이트 (REF*데이터*모델, REF*DB*스키마, REF*엑셀*구조)
  - [x] `npm run build` + `npm run typecheck` + `npm run lint` + `npm run test:run` 전체 통과 (159 tests)
- **이슈/메모**: useMatchSuggestions 인터페이스가 스펙과 미세하게 다름 (기능적 동치, 수용)

### Phase 8: UX 전면 개선 + 상품명 매칭 엔진

- **상태**: ✅ 검증 통과
- **시작일**: 2026-05-11
- **완료일**: 2026-05-12
- **스펙 문서**: `docs/specs/PHASE_08_UX_매칭엔진.md`
- **검증 결과**: `docs/specs/PHASE_08-verify.md` — ✅ 통과 (P1: 1건 수정 완료, P2: 2건 수정 완료)
- **선행 조건**: Phase 7 ✅
- **산출물**:
  - [x] 실데이터 테스트: displayProductName + platformProductName + senderAddress + 발주서 정렬 + 배치 toast
  - [x] ExcelJS richText 손상 수정 (발주서/운송장 생성기)
  - [x] 작업건 삭제 + 발주 되돌리기 + 공급처별 배정 삭제 (revert_order_session RPC)
  - [x] 8-C: 상품명 매칭 엔진 (정규화 + 속성 추출 + 속성 매칭 + autoAllocator 통합)
  - [x] 8-C: 과일 사전 DB + 타입 + CRUD API + Hook + 관리 UI
  - [x] 8-A: 배정 페이지 (SupplierPickerPopover + allocationReason Tooltip + 후보 비교 + 대시보드)
  - [x] 8-B: 매핑관리 (MappingLayout + 온보딩 + 일괄등록 + 인라인 매핑)
  - [x] 8-F: 운송장 (공급처 진행 + 필터 + 벌크 액션 + 전체 다운로드)
  - [x] 8-D+E: 업로드 통합 드롭존 + 다운로드 비용 요약
  - [x] 8-G: 글로벌 UX (브레드크럼 + 스켈레톤)
  - [x] 8-UI: 디자인 품질 개선 (반응형 + 접근성 + 일관성)
    - 사이드바 SVG 로고 제거 (showIcon prop)
    - cursor-pointer 글로벌 CSS 적용 (button, a, select, ARIA role)
    - 테이블 반응형 (8곳 overflow-x-auto + min-width)
    - 사이드바 ↔ TopBar 가로선 정렬 (h-16 통일)
    - 매칭됨 뱃지 whitespace-nowrap
    - truncate 요소 14곳에 title 속성 추가
    - favicon.svg 추가 (public/)
  - [x] `npm run build` + `npm run typecheck` + `npm run lint` + `npm run test:run` 전체 통과 (198 tests)
- **이슈/메모**: -

### Phase 9: 폴리싱 + 성능 최적화

- **상태**: ✅ 완료
- **시작일**: 2026-05-12
- **완료일**: 2026-05-12
- **선행 조건**: Phase 8 ✅
- **산출물**:
  - [x] 플랫폼 로고: FileSpreadsheet 아이콘 → 쿠팡/토스 실제 로고 이미지 (TrackingDownload)
  - [x] `src/components/PlatformLogo.tsx` — 플랫폼 로고 이미지 컴포넌트
  - [x] `public/images/coupang-logo.png` — 쿠팡 로고 (흰배경 투명 처리)
  - [x] `public/images/toss-logo.png` — 토스 로고
  - [x] WithLab 사이드바 폰트 크기 증가 (text-base → text-xl)
  - [x] 로그인 페이지 SVG 아이콘 제거 (showIcon={false})
  - [x] 테이블 한글 깨짐 수정: `break-keep` + 헤더 `whitespace-nowrap` (table.tsx)
  - [x] Dialog 접근성 경고 수정: `aria-describedby={undefined}` (dialog.tsx)
  - [x] OG 메타태그 추가 (og:title, og:description — 카카오톡 공유 대응)
  - [x] 라우트별 코드 스플리팅: React.lazy + Suspense (초기 번들 2,403KB → 304KB, 87% 감소)
  - [x] `npm run build` 통과
- **이슈/메모**: -

### Phase 10: 운송장 워크플로우 분리 + 간편 운송장 + 쿠팡 분리

- **상태**: ✅ 검증 통과
- **시작일**: 2026-05-13
- **완료일**: 2026-05-13
- **스펙 문서**: `docs/specs/PHASE_10_운송장_워크플로우_분리.md`
- **검증 결과**: `docs/specs/PHASE_10-verify.md` — ✅ 통과 (P1: 1건 수정 완료, P2: 1건 수정 완료)
- **선행 조건**: Phase 9 ✅
- **산출물**:
  - [x] Part A: 매칭 엔진 `ordered` 필터 제거 → `pending` + `ordered` 모두 매칭 대상 + 테스트
  - [x] Part A: TrackingSessionSelector `active` 진입 허용 + UI 수정
  - [x] Part A: workSession 상태 전이 완화 (`active` → `completed`)
  - [x] Part C: 운송장 임포트 삭제 API (`deleteTrackingImport`) + 훅 + UI (확인 다이얼로그)
  - [x] Part D: DB 마이그레이션 (order_imports label + unique 제약 변경)
  - [x] Part D: 주문 업로드 "별도 파일" 옵션 + 라벨 자동 채번 (`쿠팡1`, `쿠팡2` 등)
  - [x] Part D: 운송장 다운로드 라벨별 분리 다운로드
  - [x] Part B: 직접 매칭 함수 (`directMatcher.ts`) + 테스트 10개
  - [x] Part B: 간편 운송장 페이지 (`SimpleTracking.tsx`) — 3단계 스텝 UI
  - [x] Part B: 라우트 (`/tracking/simple`) + TrackingSessionSelector 진입 버튼
  - [x] 전체 빌드/테스트 통과 (208 tests)
- **스펙 이후 추가 개선**:
  - [x] 간편 운송장 Step 2: 공급처별 운송장 카드 확장 상세 (매칭/미매칭 탭 + 테이블)
  - [x] 간편 운송장 Step 3: 공급처별 매칭 요약 칩 + 매칭 상세 테이블 (필터, 30행 제한)
  - [x] 일반 운송장 매칭결과: 공급처 컬럼 추가 (다중 공급처 시 자동 표시)
  - [x] 일반 운송장 매칭결과: 공급처 필터 드롭다운
  - [x] 엣지케이스 수정 — directMatcher 크로스파일 중복 감지 (`alreadyMatchedOrderIds`)
  - [x] 엣지케이스 수정 — 간편 운송장 주문 파일 삭제 시 운송장 결과 초기화
  - [x] 엣지케이스 수정 — 매칭결과 통계가 공급처 필터 반영하도록 (`displayStats`)
  - [x] 엣지케이스 수정 — 매칭결과 레이아웃 (공급처 드롭다운 + 벌크 액션 우측 그룹)
  - [x] 엣지케이스 수정 — `t.raw` 컬럼명 하드코딩 → 복수 후보 키 탐색 (`extractFromRaw`)
- **이슈/메모**: -

### Phase 11: 품목 검토 + UX 폴리싱

- **상태**: 🔵 진행중
- **시작일**: 2026-05-13
- **완료일**: -
- **선행 조건**: Phase 10 ✅
- **산출물**:
  - [x] **품목 검토 (Item Review) 단계 추가**
    - [x] `src/pages/orders/ItemReview.tsx` — 품목별 공급처 사전 선택 UI
    - [x] `src/hooks/useItemReview.ts` — 품목 집계, 추천, 선택 상태 관리
    - [x] `src/lib/allocation/itemSummary.ts` — 품목 그룹핑 순수 함수 + `extractSimpleKeyword` 폴백
    - [x] `src/lib/supabase/allocationHistory.ts` — 전날 발주/빈도 이력 조회 API
    - [x] `src/lib/allocation/autoAllocator.ts` — `keywordOverrides` 파라미터 추가 + 공급처 상품 해소 체인
    - [x] `src/components/OrderTabs.tsx` — 4탭 구조 (업로드 → 품목 검토 → 공급처 배정 → 다운로드)
    - [x] `src/AppRoutes.tsx` — `/orders/:sessionId/review` 라우트 추가
    - [x] `src/types/index.ts` — `ItemSummary`, `SupplierRecommendation` 타입 추가
  - [x] **공급처 배정 버그 수정 + 최적화**
    - [x] "발주:" 품목명 표시 조건 수정 (`group.supplierId` 기준)
    - [x] GroupRow `React.memo` + custom comparator — 공급처 변경 시 불변 그룹 re-render 방지
    - [x] `keywordOverrides` 경로에서 공급처 상품명 해소 누락 수정 (findSupplierProduct → findSupplierProductByAttributes 체인)
    - [x] 공급처 변경 시 가격 정보 누락 수정 (handleUpdateGroupSupplier, assignUnmatched, distributeGroup)
    - [x] 분배(distribute) 후 그룹 미분리 수정 — 그룹핑 키에 `supplierId` 포함
    - [x] `fetchAllocations`에서 `setLoading(true)` 제거 — skeleton 깜빡임으로 인한 전체 re-render 방지
  - [x] **발주서 다운로드 UX 개선**
    - [x] "매핑누락 N건" 경고 제거 (노이즈 — nameMappingApplied는 대부분 false)
    - [x] "243건 246개" → "주문 243건 · 수량 246개" 라벨 추가
    - [x] readonly 세션 탭 내비게이션 수정 (completedTabs에 download 포함)
  - [x] **운송장 다운로드 UX 개선**
    - [x] "전체 다운로드" 동작 변경 — 합친 파일 1개 → 라벨별 개별 파일 다운로드
    - [x] "다운로드 후 업로드 방법" 가이드 박스 제거
    - [x] `src/components/SupplierProgressChips.tsx` — 공급처별 매칭 진행 칩 공통 컴포넌트
    - [x] 칩 UI 개선: 원형 프로그레스 링 + "매칭 N/M" 라벨 추가
    - [x] "다운로드 미리보기" 섹션 제거 (매칭결과와 중복 정보)
  - [x] **DB 스키마 수정 + 감사**
    - [x] `work_sessions.ordered_at` 컬럼 DB 추가 (마이그레이션 누락 — completeWorkSession에서 사용)
    - [x] `WorkSessionRow`, `WorkSession`, `toWorkSession`, `workSessionSchema`에 `orderedAt` 추가
    - [x] 전체 15테이블 DB ↔ 코드 컬럼 감사 완료 (ordered_at 외 불일치 없음)
  - [x] **다크모드 / 라이트모드 색상 수정**
    - [x] `bg-status-success` → `bg-success` 수정 (OrderTabs, TrackingTabs — 존재하지 않는 클래스)
    - [x] TrackingMatchResult StatCard: 파스텔 배경 제거 → 흰색 카드 + 아이콘/숫자만 색상
    - [x] TrackingMatchResult StatusPill: 컬러 배경 제거 → 테두리 + 텍스트 색상만 (emerald 톤)
    - [x] TrackingMatchResult/Download 경고 배너: `dark:` 변형 추가
    - [x] 테이블 행 배경: `dark:` 변형 추가
  - [x] `npm run typecheck` 통과
- **이슈/메모**: -

---

## 의사결정 로그

> Phase 진행 중 스펙과 다른 판단을 내린 경우 여기에 기록.
> 회귀 방지 + 리뷰 시 컨텍스트 제공 목적.

| 날짜       | 단계 | 결정 내용                                              | 사유                                                                                                                      |
| ---------- | ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-12 | 8    | 발주서 품목명에 `platformProductName` 시스템 필드 추가 | B업체는 플랫폼 원본 상품명 사용 (쿠팡=노출상품명, 토스=상품명+옵션명). A업체용 `supplierProductName`도 유지               |
| 2026-05-12 | 8    | 토스 헤더 동적 감지 (고정 인덱스 → 0~9행 스캔)         | 토스가 안내문구 행을 추가하여 헤더 위치 변동                                                                              |
| 2026-05-12 | 8    | 같은 플랫폼 파일 합치기(append) 기능 추가              | 쿠팡 주문목록 1+2 두 파일을 합쳐서 업로드하는 실제 운영 패턴                                                              |
| 2026-05-12 | 8    | 발주서 정렬: 쿠팡 → 토스 순                            | 수동 작업과 동일한 순서 유지                                                                                              |
| 2026-05-12 | 8    | `senderAddress` 시스템 필드 추가 (= 수취인 주소)       | B업체 발주서 양식에 보내는분 주소 필요, 실제 데이터는 수취인 주소와 동일                                                  |
| 2026-05-12 | 8    | 작업건 삭제 기능 추가 (cascade)                        | 잘못 생성한 작업건을 목록에서 제거할 수 있어야 함                                                                         |
| 2026-05-12 | 8    | 발주 되돌리기 RPC 추가 (revert_order_session)          | 발주 완료 후에도 배정 수정이 필요한 경우 대비                                                                             |
| 2026-05-12 | 8    | 공급처별 배정 삭제 기능 추가                           | 특정 공급처 배정만 제거하고 재배정할 수 있어야 함                                                                         |
| 2026-05-12 | 8    | 운송장 생성을 ExcelJS → JSZip 방식으로 전환            | ExcelJS 재직렬화 시 토스 양식 XML 구조 변경 → "내용에 문제가 있습니다" 경고. JSZip으로 시트 XML만 편집하여 원본 구조 보존 |
| 2026-05-13 | 운영 | 발주서 양식에 `orderDate` 시스템 필드 추가             | 공급처가 주문일시 정보를 발주서에 필요로 함                                                                               |
| 2026-05-13 | 운영 | 과일사전에 `weightMapping` (무게 변환) 기능 추가       | 고객이 4.5kg 주문을 5kg 상품으로 보내는 등 무게 변환 규칙 필요. 플랫폼 주문에만 적용, 공급처 상품 무게는 변환하지 않음    |
| 2026-05-13 | 운영 | 공급처/과일사전 활성화 복원 + 완전삭제 기능 추가       | 비활성화 후 복원 UI 없었음. 완전삭제는 confirm 확인 후 물리 삭제, 공급처는 배정/운송장 데이터 있으면 FK로 차단            |
| 2026-05-14 | 11   | 품목 검토 단계 추가 (업로드 → 품목 검토 → 배정 → 다운로드) | 매일 수백 건 주문 중 주요 과일만 빠르게 공급처 지정하는 워크플로우 필요. 건너뛰기 가능 (기존 플로우 유지)                |
| 2026-05-14 | 11   | 그룹핑 키에 `supplierId` 포함                          | 분배 후 같은 상품이 다른 공급처로 갈 때 그룹이 분리되어야 함. 기존 `productName\|\|optionName`만으론 합쳐져 보임           |
| 2026-05-14 | 11   | `fetchAllocations`에서 loading 상태 제거               | refresh 시 `setLoading(true)` → skeleton 표시 → 전체 unmount/remount. memo 최적화가 무효화되는 근본 원인                  |
| 2026-05-14 | 11   | 운송장 "전체 다운로드"를 라벨별 개별 파일로 변경        | 기존엔 모든 라벨을 합친 1개 파일 다운로드. 실운영에서 각 파일을 따로 플랫폼에 업로드해야 함                               |
| 2026-05-14 | 11   | StatCard 파스텔 배경 제거                               | 라이트모드에서 4색 파스텔 배경이 토스 스타일과 안 맞음. 흰색 카드 + 아이콘/숫자 색상만으로 정리                           |
| 2026-05-14 | 11   | `work_sessions.ordered_at` DB 컬럼 추가                 | REF_DB_스키마와 코드에 정의되어 있었지만 실제 마이그레이션 누락. completeWorkSession에서 발주 시점 기록용                  |
| 2026-05-14 | 11   | 운송장 "다운로드 미리보기" 섹션 제거                     | 매칭 결과 탭의 정보와 완전히 중복. 불필요한 노이즈 제거                                                                   |

## 알려진 이슈

> 해결되면 행을 지우지 말고 상태를 "해결됨"으로 변경하고 해결일 기록.

| 등록일 | 단계 | 이슈 | 상태 | 해결일 |
| ------ | ---- | ---- | ---- | ------ |
| -      | -    | -    | -    | -      |

## 상태 범례

- ⬜ 대기 — 스펙 미작성 또는 선행 단계 미완료
- 🔵 진행중 — 구현 진행 중
- 🟡 검증중 — 구현 완료, `/project:verify` 실행 중
- ❌ 검증 실패 — 수정 필요 항목 있음
- ✅ 완료 — 검증 통과, `/project:next-phase` 실행됨
