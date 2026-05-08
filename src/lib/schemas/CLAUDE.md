# src/lib/schemas/ — Zod 스키마

## 역할
모든 외부 데이터 경계에서 런타임 검증. 타입 안전성의 마지막 방어선.

## 검증 대상 (Zod를 적용해야 하는 곳)
1. **엑셀 파싱 결과** — 파서가 반환하는 각 행을 Zod로 검증 → 실패 시 invalidRow
2. **DB 응답** — Supabase에서 받은 데이터 파싱 (snake_case → camelCase 변환 포함)
3. **사용자 입력** — 폼 데이터 검증 (공급처 추가, 매핑 수정 등)

## 파일 구성
- `index.ts` — 모든 스키마를 한 파일에 (규모가 작으므로 분리 불필요)

## 작성 규칙
- 도메인 모델과 1:1 대응 (StandardOrder → standardOrderSchema)
- DB row 타입도 별도 정의 (SupplierRow 등 — snake_case 필드)
- 폼 스키마는 별도 (`supplierFormSchema` — id/createdAt 없는 입력용)
- `.default('')` 등으로 optional 필드 기본값 처리
- 에러 메시지 한국어로 (`{ message: '수량은 1 이상이어야 합니다' }`)
