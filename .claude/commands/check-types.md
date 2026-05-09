---
description: 타입 정의가 REF 문서 및 DB 스키마와 일치하는지 검증합니다
---

타입 정의 정합성을 검증해줘.

## 검증 항목

### 1. src/types/index.ts ↔ docs/REF_데이터_모델.md
- REF 문서에 정의된 모든 타입이 `src/types/index.ts`에 존재하는가?
- 각 타입의 필드명, 타입, optional 여부가 정확히 일치하는가?
- 유니온 리터럴 값이 동일한가? (예: Platform이 정확히 "coupang" | "toss")
- 빠진 필드, 추가된 필드, 타입이 다른 필드를 모두 나열

### 2. src/lib/schemas/index.ts ↔ src/types/index.ts
- 모든 도메인 타입에 대응하는 Zod 스키마가 있는가?
- Zod 스키마의 필드가 타입과 1:1 대응하는가?
- 검증 규칙(min, positive, email 등)이 적절한가?

### 3. DB snake_case ↔ TS camelCase 변환
- `docs/REF_DB_스키마.md`의 모든 테이블 컬럼에 대응하는 TS 필드가 있는가?
- snake_case → camelCase 변환 함수(toXxx)가 누락 없이 모든 컬럼을 처리하는가?
- DB nullable 컬럼이 TS에서 optional(?)로 처리되어 있는가?

### 4. 매칭키 일관성 (특별 검증)
프로젝트 전체에서 matchingKey 사용을 검색하여:
- 쿠팡: 항상 orderNo를 matchingKey로 사용하는가?
- 토스: 항상 orderItemNo를 matchingKey로 사용하는가?
- 이 규칙이 파서, 매칭엔진, 발주서 생성, 운송장 출력 모든 경로에서 일관되는가?

## 출력
```
## 타입 정합성 검증 결과

### types ↔ REF 문서
✅ 일치 / ❌ 불일치 항목 나열

### schemas ↔ types
✅ 일치 / ❌ 누락 스키마 나열

### DB ↔ TS 변환
✅ 일치 / ❌ 누락 변환 나열

### 매칭키 일관성
✅ 전체 일관 / ❌ 불일치 위치 나열
```
