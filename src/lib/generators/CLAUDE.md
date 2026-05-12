# src/lib/generators/ — 엑셀 생성 모듈

## 역할
발주서 엑셀, 플랫폼 운송장 엑셀 생성.

## 파일 구성
- `purchaseOrderGenerator.ts` — 공급처별 발주서 엑셀 생성 (**ExcelJS**)
- `trackingExportGenerator.ts` — 플랫폼별 운송장 엑셀 생성 (**JSZip** — 시트 XML 직접 편집)

## 엑셀 라이브러리 사용 구분
- **발주서**: ExcelJS로 워크북 전체를 로드/수정/저장
- **운송장**: JSZip으로 XLSX를 zip으로 열고, 대상 시트 XML의 `<sheetData>`만 재구성
  - ExcelJS가 토스 양식을 재직렬화할 때 XML 구조가 변경되어 "내용에 문제가 있습니다" 경고 유발
  - JSZip 방식은 styles.xml, sharedStrings.xml, 패키지 구조를 원본 그대로 보존

## 핵심 원칙 (절대 규칙)
1. **새 워크북 만들지 않음** — 반드시 업로드된 빈 양식 템플릿을 Supabase Storage에서 로드
2. 템플릿의 헤더/서식 **그대로 유지**, 데이터 행만 채움
3. 컬럼 매핑은 **인덱스(위치) 기반** — 컬럼명으로 찾지 않음
4. 전화번호 포맷은 ColumnMappingItem.format에 따라 변환 (raw/hyphen/digits)

## 발주서 생성 흐름
```
1. pending 상태 Allocation → supplierId별 그룹핑 = PurchaseOrder
2. 각 Allocation → Order 조인 (수취인 정보) + name_mappings 조인 (상품명 변환)
3. SupplierTemplate 로드 → Storage에서 빈 양식 다운로드
4. columnMappings 순회하며 데이터 행 채우기
5. systemField가 "empty"면 빈 칸으로 둠 (보내는분 정보 등)
6. Blob 반환 → 다운로드
```

## 운송장 출력 흐름 (JSZip 방식)
```
1. matched 상태 Tracking → platform별 그룹핑
2. Tracking → Allocation → Order 조인
3. PlatformTrackingTemplate 로드 → Storage에서 빈 양식 다운로드
4. JSZip으로 XLSX 열기 → workbook.xml + rels에서 시트 XML 경로 찾기
5. 시트 XML의 <sheetData> 파싱 → 헤더 행 유지, 데이터 행 재구성
6. 각 행에 order.rawValues 전체 복사 (원본 보존, inlineStr 방식)
7. 택배사/운송장번호 컬럼만 덮어쓰기
8. 토스: 주문상태 컬럼 "배송중"으로 변경
9. dimension 갱신 + 데이터 영역 병합 제거
10. zip 패키지 재생성 → Blob 반환 → 다운로드
```

## 품목명 시스템 필드
- `supplierProductName`: 공급처 카탈로그 상품명 (속성 매칭 결과)
- `platformProductName`: 플랫폼 원본 상품명 (쿠팡=노출상품명(옵션명), 토스=상품명+옵션명)
- 두 필드 중 하나만 매핑하면 됨 (OR 관계 필수 검증)
- `senderAddress`: 보내는분 주소 = 수취인 주소와 동일

## 발주서 정렬
- 같은 공급처 내에서 쿠팡 주문 → 토스 주문 순으로 정렬

## 검증 사항
- 발주서: 템플릿 있는지, 품목명(supplierProductName 또는 platformProductName) + 필수 필드(matchingKey, quantity, recipientName, address) 매핑됐는지
- 운송장: 같은 allocationId에 matched Tracking 2개 이상이면 출력 차단
- 택배사 매핑 안 된 건: 경고만 표시, 원본명으로 출력 허용
