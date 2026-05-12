# Post-Launch 개선 로그

> Phase 6 완료 이후 진행하는 UI/UX 개선, 버그 픽스, 기능 추가를 추적합니다.
> 각 항목은 카테고리별로 정리하고, 완료 시 체크 표시합니다.

---

## UI/UX 개선

### [x] 공급처 관리 + 발주서 양식 통합 (2026-05-11)

**문제**: 공급처 관리(`/mapping/suppliers`)와 발주서 양식(`/settings/supplier-template`)이 별도 페이지로 분리되어 있어, 공급처 정보와 양식을 따로 관리해야 하는 불편함.

**변경 내용**:

- 공급처 목록 → 클릭 → 상세 페이지(`/mapping/suppliers/:id`)로 통합
- 상세 페이지에서 기본 정보(이름, 연락처, 메모) + 발주서 양식(엑셀 업로드, 컬럼 매핑)을 한 화면에서 관리
- 목록 테이블에 "양식" 상태 컬럼(등록됨/미등록) 추가
- 새 공급처 생성 후 자동으로 상세 페이지로 이동
- 사이드바에서 "발주서 양식" 메뉴 제거 (6개 → 5개)
- `/settings/supplier-template` → `/mapping/suppliers` 리다이렉트 추가
- Dashboard, OrderDownload의 양식 관련 링크 업데이트

**변경 파일**:

- 생성: `src/pages/mapping/SupplierDetail.tsx`
- 수정: `SupplierManage.tsx`, `AppRoutes.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `Dashboard.tsx`, `OrderDownload.tsx`, `suppliers.ts`, `useSuppliers.ts`
- 삭제: `src/pages/settings/SupplierTemplate.tsx`

### [x] 플랫폼 로고 적용 (2026-05-12)

**변경 내용**:
- 운송장 플랫폼 다운로드 카드의 FileSpreadsheet 아이콘 → 쿠팡/토스 실제 로고 이미지로 교체
- 쿠팡 로고 흰 배경 투명 처리 (다크모드 대응)
- `src/components/PlatformLogo.tsx` 생성, `public/images/` 에 로고 파일 추가

### [x] WithLab 브랜딩 정리 (2026-05-12)

**변경 내용**:
- 사이드바 "WithLab" 폰트 크기 증가 (text-base → text-xl)
- 로그인 페이지 SVG 아이콘 제거

### [x] 테이블 한글 깨짐 수정 (2026-05-12)

**문제**: 화면 축소 시 테이블 헤더와 셀의 한글 텍스트가 음절 중간에서 줄바꿈되어 깨져 보임.

**변경 내용**:
- `table.tsx`의 `<table>`에 `break-keep` 추가 (한글 음절 단위 줄바꿈 방지)
- `<th>`에 `whitespace-nowrap` 추가 (헤더 줄바꿈 방지)

### [x] Dialog 접근성 경고 제거 (2026-05-12)

**문제**: Radix UI `DialogContent`에 `DialogDescription`이 없는 경우 콘솔 경고 발생.

**변경 내용**:
- `dialog.tsx`의 `DialogContent`에 `aria-describedby={undefined}` 추가

### [x] OG 메타태그 추가 (2026-05-12)

**변경 내용**:
- `index.html`에 og:title, og:description 추가 (카카오톡 공유 시 카드 표시)

---

## 성능 최적화

### [x] 라우트별 코드 스플리팅 (2026-05-12)

**문제**: 모든 페이지가 단일 청크(2,403KB)로 번들링되어 초기 로드가 느림.

**변경 내용**:
- `AppRoutes.tsx`에서 모든 페이지 컴포넌트를 `React.lazy()` + `Suspense`로 전환
- 초기 번들: 2,403KB → 304KB (87% 감소)
- 엑셀 관련 무거운 코드(xlsx 332KB, OrderDownload 945KB)는 해당 페이지 진입 시에만 로드

---

## 버그 픽스

_(아직 없음)_

---

## 기능 추가

### [x] Phase 7: 공급처 상품 카탈로그 + 스마트 배정 (2026-05-11)

**스펙 문서**: `docs/specs/PHASE_07_공급처_상품_스마트배정.md`

**요약**:
- 공급처별 상품 목록(가격, 재고, 택배사 등)을 엑셀 업로드로 DB 저장
- 상품명 변환(NameMapping) 등록 시 공급처 상품을 토큰 유사도 기반으로 자동 제안
- 주문 배정 시 재고 있는 공급처 중 최저가 자동 선택 (스마트 배정)
- 기존 배정 로직과 하위호환 유지

### [x] Phase 8: UX 전면 개선 + 상품명 매칭 엔진 (2026-05-12)

**스펙 문서**: `docs/specs/PHASE_08_UX_매칭엔진.md`

**요약**:
- 상품명 매칭 엔진 (정규화 + 속성 추출 + 속성 매칭 + 과일 사전)
- 작업건 삭제/발주 되돌리기/공급처별 배정 삭제
- 배정 페이지 UX (후보 비교, 공급처 변경 다이얼로그)
- 매핑관리 UX (온보딩, 일괄등록, 인라인 매핑)
- 운송장 UX (공급처 진행 표시, 필터, 벌크 액션)
- 글로벌 UX (브레드크럼, 스켈레톤, 반응형, 접근성)

---

## 예정 작업

_(없음)_
