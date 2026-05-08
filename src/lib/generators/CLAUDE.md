# src/lib/generators/ — 엑셀 생성 모듈

## 역할
발주서 엑셀, 플랫폼 운송장 엑셀 생성. 반드시 **ExcelJS** 사용 (SheetJS는 읽기만).

## 파일 구성
- `purchaseOrderGenerator.ts` — 공급처별 발주서 엑셀 생성
- `trackingExportGenerator.ts` — 플랫폼별 운송장 엑셀 생성

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

## 운송장 출력 흐름
```
1. matched 상태 Tracking → platform별 그룹핑
2. Tracking → Allocation → Order 조인
3. PlatformTrackingTemplate 로드 → Storage에서 빈 양식 다운로드
4. 각 행에 order.rawValues 전체 복사 (원본 보존)
5. 택배사/운송장번호 컬럼만 덮어쓰기
6. 토스: 주문상태 컬럼 "배송중"으로 변경
7. Blob 반환 → 다운로드
```

## 검증 사항
- 발주서: 템플릿 있는지, 필수 필드(matchingKey, supplierProductName, quantity, recipientName, address) 매핑됐는지
- 운송장: 같은 allocationId에 matched Tracking 2개 이상이면 출력 차단
- 택배사 매핑 안 된 건: 경고만 표시, 원본명으로 출력 허용
