# 프로젝트 진행 상태

> 이 파일은 `/project:verify`와 `/project:next-phase` 커맨드가 자동으로 갱신합니다.
> 수동 편집도 가능하지만, "현재 단계" 값은 커맨드의 기준이 되므로 정확히 유지할 것.

## 현재 단계
2

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
- **상태**: ✅ 검증 통과
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
- **상태**: ⬜ 대기
- **스펙 문서**: 미작성
- **주요 범위**: 작업건(WorkSession) 관리, 쿠팡/토스 주문 엑셀 파싱, 주문 업로드 UI, 재업로드 처리, 중복 감지, 플랫폼 자동 감지
- **선행 조건**: Phase 2 ✅
- **산출물 예정**:
  - coupangParser.ts + 테스트
  - tossParser.ts + 테스트
  - platformDetector.ts
  - WorkSession 관리 (생성/선택/상태 전이)
  - 주문 업로드 페이지 UI (드래그앤드롭 + 파싱 결과 표시)

### Phase 4: 공급처 배정 + 발주서
- **상태**: ⬜ 대기
- **스펙 문서**: 미작성
- **주요 범위**: 자동 배정 로직, 미분류 처리, 수량 분배(라인 단위), 오늘만변경/기본매핑변경, 공급처 발주서 양식 관리, 발주서 엑셀 생성, 발주 완료 처리
- **선행 조건**: Phase 3 ✅
- **산출물 예정**:
  - 자동 배정 로직 + 테스트
  - 공급처 배정 페이지 (아코디언 그룹 UI)
  - 양식 관리 페이지 (템플릿 업로드 + 컬럼 매핑 UI)
  - purchaseOrderGenerator.ts (ExcelJS 기반)
  - 발주서 다운로드 + 완료 처리 페이지

### Phase 5: 운송장 매칭 + 출력
- **상태**: ⬜ 대기
- **스펙 문서**: 미작성
- **주요 범위**: 운송장 파싱(A/B업체), 매칭 엔진, 수동 매칭 UI, 택배사 변환, 플랫폼 운송장 양식 관리, 플랫폼 엑셀 출력
- **선행 조건**: Phase 4 ✅
- **산출물 예정**:
  - trackingParser.ts + 테스트
  - matchingEngine.ts + 테스트
  - 운송장 업로드/매칭 결과/플랫폼 다운로드 3개 페이지
  - trackingExportGenerator.ts (원본 양식 보존 출력)
  - 플랫폼 운송장 양식 관리 페이지

### Phase 6: 대시보드 + 마무리
- **상태**: ⬜ 대기
- **스펙 문서**: 미작성
- **주요 범위**: 대시보드 UI, 실제 데이터 E2E 테스트, 전체 체크리스트 검증, Vercel 배포, 사용 가이드
- **선행 조건**: Phase 5 ✅
- **산출물 예정**:
  - 대시보드 (최근 작업건, 빠른 작업, 바로가기, 미매칭 알림)
  - Vercel 배포 설정 (vercel.json, 환경변수)
  - 사용 가이드 문서 (사용자용 README)

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
