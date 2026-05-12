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

---

## 버그 픽스

_(아직 없음)_

---

## 기능 추가

_(아직 없음)_

---

## 예정 작업

### [ ] Phase 7: 공급처 상품 카탈로그 + 스마트 배정

**스펙 문서**: `docs/specs/PHASE_07_공급처_상품_스마트배정.md`

**요약**:

- 공급처별 상품 목록(가격, 재고, 택배사 등)을 엑셀 업로드로 DB 저장
- 상품명 변환(NameMapping) 등록 시 공급처 상품을 토큰 유사도 기반으로 자동 제안
- 주문 배정 시 재고 있는 공급처 중 최저가 자동 선택 (스마트 배정)
- 기존 배정 로직과 하위호환 유지 (supplierProducts 없으면 기존 동작)

**주요 변경**: DB 테이블 2개 추가, allocations 컬럼 2개 추가, 파서 1개, 매칭 로직 1개, 배정 로직 확장, UI 3개 페이지 수정
