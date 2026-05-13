# src/components/ — 공통 컴포넌트

## UI 라이브러리
shadcn/ui 기반. `npx shadcn@latest add [component]`로 추가.

## 공통 컴포넌트 목록
- `ui/` — shadcn/ui 컴포넌트 (Button, Input, Card, Badge, Dialog, Table, Select, Tabs, DropdownMenu, Tooltip, Skeleton)
- `layout/AppLayout.tsx` — 사이드바 + Outlet
- `layout/PageHeader.tsx` — 페이지 상단 (제목 + 설명 + 액션 버튼)
- `FileUpload.tsx` — 드래그앤드롭 + 파일 선택 (엑셀 전용)
- `StatusBadge.tsx` — 상태별 색상 뱃지
- `ConfirmModal.tsx` — 확인/취소 모달 (destructive 옵션)
- `EmptyState.tsx` — 빈 상태 표시 (아이콘 + 텍스트 + CTA)
- `ErrorBoundary.tsx` — React 에러 경계
- `DataTable.tsx` — 정렬, 페이지네이션 포함 테이블 (선택 사항)
- `SupplierProgressChips.tsx` — 공급처별 운송장 매칭 진행 칩 (원형 프로그레스 + 매칭 N/M)
- `PlatformBadge.tsx` — 플랫폼 뱃지 (쿠팡/토스)
- `PlatformLogo.tsx` — 플랫폼 로고 이미지
- `OrderTabs.tsx` — 발주서 4단계 탭 (업로드 → 품목 검토 → 공급처 배정 → 다운로드)
- `TrackingTabs.tsx` — 운송장 3단계 탭 (업로드 → 매칭 → 다운로드)

## 스타일 규칙
- Tailwind 유틸리티 클래스 사용
- cn() 함수로 조건부 클래스 결합
- 색상은 CSS 변수 참조 (text-primary, bg-surface 등)
- 하드코딩 색상값 금지

## FileUpload 컴포넌트 스펙
```ts
type FileUploadProps = {
  accept?: string          // ".xlsx,.xls"
  maxSizeMB?: number       // 기본 10
  label: string            // "쿠팡 주문 엑셀"
  onFile: (file: File) => void
  currentFile?: string     // 현재 업로드된 파일명
  onReset?: () => void     // 다시 업로드
  disabled?: boolean
  loading?: boolean
}
```
- 드래그앤드롭 + 클릭 모두 지원
- 파일 타입 검증: .xlsx, .xls만 허용
- 파일 크기 검증: 10MB 이하
- 업로드 완료 시: 파일명 표시 + "다시 업로드" 링크
