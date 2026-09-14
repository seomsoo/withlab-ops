# src/lib/matching/ — 운송장 매칭 엔진

## 역할
공급처에서 받은 운송장의 rawOrderKey를 주문 데이터와 매칭.

## 파일 구성
- `matchingEngine.ts` — 핵심 매칭 로직
- `matchingEngine.test.ts` — 테스트

## 매칭 알고리즘 (순서 중요)

```
for each tracking row:
  1. rawOrderKey 또는 trackingNumber 비어있음?
     → status = "invalid", reason = "필수값 누락"

  2. rawOrderKey로 orders 테이블에서 matching_key 일치하는 주문 찾기
     → 없으면 status = "unmatched", reason = "해당 주문 없음"

  3. 찾은 orderId + sourceSupplierId로 allocations에서 배정 찾기
     → 없으면 status = "unmatched", reason = "해당 공급처 배정 없음"

  4. 해당 allocationId에 이미 matched Tracking 있는지 확인
     → 있으면 status = "duplicated", reason = "이미 운송장 있음"

  5. 모두 통과 → allocationId 연결, status = "matched"
```

## 택배사 변환 (출력 시점에만)
- trackingCompany에는 공급처 원본값만 저장 (예: "CJ대한통운")
- 플랫폼 엑셀 출력할 때 courier_mappings에서 변환
- 매핑 없으면 원본 그대로 + "매핑 필요" 경고 플래그

## 주의사항
- matchingKey로 매칭 (쿠팡=묶음배송번호:옵션ID, 토스=주문상품번호)
- 쿠팡 원본 묶음배송번호도 검색하되 여러 상품이 해당하면 미매칭 처리. 이전 주문도 raw 옵션ID로 상품별 키를 검색할 수 있음.
- 같은 작업건(work_session) 내에서만 매칭
- 다른 날짜/플랫폼 주문이 섞여 들어올 수 있음 → 정상적으로 unmatched 처리
