# src/lib/parsers/ — 엑셀 파싱 모듈

## 역할
쿠팡/토스 주문 엑셀, 공급처 운송장 엑셀 → 표준 데이터 구조로 변환.

## 파일 구성
- `coupangParser.ts` — 쿠팡 주문 엑셀 → StandardOrder[]
- `tossParser.ts` — 토스 주문 엑셀 → StandardOrder[]
- `trackingParser.ts` — 공급처 운송장 → Tracking 원본 데이터
- `platformDetector.ts` — 파일 → 플랫폼 자동 감지
- `*.test.ts` — 각 파서 테스트

## 핵심 규칙
1. SheetJS(xlsx)로 읽기만 함. 생성은 ExcelJS 사용.
2. 모든 파싱 결과는 `{ orders: [], invalidRows: [] }` 형태 반환.
3. 빈 행: orderNo + productName 모두 비어있으면 스킵, 하나만 있으면 invalidRow.
4. 수량: parseInt 후 NaN이거나 0 이하면 invalidRow.
5. 전화번호: 원본은 그대로 보존, digits는 숫자만 추출.
6. rawValues에 셀 배열 저장 (운송장 출력 시 원본 복원용).
7. rawRowNumber에 엑셀 행 번호 저장 (에러 표시용).

## 플랫폼 감지 로직
- 1행에 `번호`, `묶음배송번호`, `주문번호` → 쿠팡
- 3행에 `주문일시`, `주문번호`, `주문상품번호` → 토스
- 1행에 `업체주문번호` → A업체 운송장
- 1행에 `거래처주문번호` → B업체 운송장

## 토스 파싱 주의사항
- 1행 안내문구, 2행 그룹헤더, 4행 수정가능여부 → 전부 스킵
- 3행이 진짜 헤더, 5행부터 데이터
- matchingKey = 주문상품번호 (주문번호 아님!)

## 상세 컬럼 매핑은 `docs/REF_엑셀_구조.md` 참조
