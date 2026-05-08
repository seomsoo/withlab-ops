# src/pages/ — 페이지 컴포넌트

## 디자인 시스템
- 메인 컬러: `#3182F6` (토스 블루)
- 스타일: 토스 스타일 미니멀 — 화이트 + 그레이
- 상태 색상: 성공 `#34C759` / 에러 `#FF3B30` / 경고 `#FF9500`
- 폰트: Pretendard
- PC 전용 (1440px 기준)

## 페이지 구조
```
/ → Dashboard
/orders → 발주서 (탭: 주문 업로드 → 공급처 배정 → 발주서 다운로드)
/tracking → 운송장 (탭: 운송장 업로드 → 매칭 결과 → 플랫폼 다운로드)
/mapping → 매핑 관리 (서브탭: 공급처 / 품목 / 상품명 / 택배사)
/settings → 양식 관리 (서브탭: 발주서 양식 / 운송장 양식)
```

## UI 패턴
- 페이지 상단: h1 제목 + 설명 텍스트
- 카드: rounded-xl, border, bg-white, shadow-sm
- 테이블: border-collapse, 헤더 bg-gray-50, 행 hover:bg-gray-50
- 뱃지: 상태별 색상 (matched=success, unmatched=error, pending=warning)
- 모달: Dialog 컴포넌트, 확인/취소 버튼
- 토스트: 우상단, 3초 자동 닫힘
- 드래그앤드롭 파일 업로드: 점선 보더, 아이콘, "파일을 드래그하거나 클릭"

## Supabase 호출 규칙
- 페이지에서 supabase 직접 호출 금지
- `src/lib/supabase/` 안의 API 함수만 사용
- 또는 커스텀 훅 (useSuppliers, useWorkSession 등) 경유

## 로딩/에러 패턴
- 로딩: Spinner 또는 Skeleton
- 에러: toast.error() + 인라인 에러 메시지
- 빈 상태: 설명 텍스트 + 액션 버튼
