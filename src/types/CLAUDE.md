# src/types/ — TypeScript 타입 정의

## 역할
모든 도메인 모델의 단일 진실 공급원(SSOT).

## 파일 구성
- `index.ts` — 전체 타입을 한 파일에 export

## 규칙
- 타입은 `type` 사용 (`interface` 아님 — 일관성)
- Enum 대신 유니온 리터럴 (`"coupang" | "toss"`)
- DB 필드 nullable → TS optional (`?`)
- DB row 타입(snake_case)은 `src/lib/schemas/`에 정의, 여기는 도메인 타입(camelCase)만
- 모든 타입 정의의 근거: `docs/REF_데이터_모델.md`
