# src/lib/supabase/ — Supabase API 레이어

## 역할
Supabase 클라이언트 생성 + 모든 DB/Storage 호출을 함수로 추상화.
컴포넌트에서 supabase를 직접 import하거나 호출하면 안 됨.

## 파일 구성
- `client.ts` — createClient 단일 인스턴스
- `api.ts` — DB CRUD 함수 모음 (또는 도메인별로 분리: suppliers.ts, orders.ts 등)
- `storage.ts` — Supabase Storage 파일 업로드/다운로드

## DB 호출 패턴
- 기존 주문에 추가는 `orders.ts`의 `appendOrdersToImport`만 사용. RPC 실패 시 기존 주문을 삭제하거나 개별 INSERT로 우회하지 않는다. RPC 마이그레이션을 프론트엔드보다 먼저 배포한다.
```ts
// 항상 이 패턴: query → error 체크 → snake_case→camelCase 변환
export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(`공급처 조회 실패: ${error.message}`)
  return (data ?? []).map(toSupplier)
}
```

## 변환 규칙
- DB row는 snake_case (예: `is_active`, `created_at`)
- TS 도메인 타입은 camelCase (예: `isActive`, `createdAt`)
- 변환 함수 `toXxx(row)` / `fromXxx(domain)` 을 이 폴더 안에서 관리
- null → undefined 변환 포함 (DB nullable → TS optional)

## Storage 패턴
```ts
export async function uploadTemplate(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from('templates').upload(path, file)
  if (error) throw new Error(`템플릿 업로드 실패: ${error.message}`)
  return path
}

export async function downloadTemplate(path: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from('templates').download(path)
  if (error) throw new Error(`템플릿 다운로드 실패: ${error.message}`)
  return await data.arrayBuffer()
}
```
