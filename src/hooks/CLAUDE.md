# src/hooks/ — 커스텀 훅

## 역할
Supabase API 함수를 래핑하여 로딩/에러/데이터 상태를 관리.
페이지 컴포넌트가 직접 API 호출하는 대신 훅을 사용.

## 파일 구성 (Phase에 따라 점진적 추가)
- `useAuth.tsx` — 인증 상태 + signIn/signOut (Phase 1)
- `useSuppliers.ts` — 공급처 CRUD (Phase 2)
- `useWorkSession.ts` — 작업건 생성/선택/상태관리 (Phase 3)
- `useOrders.ts` — 주문 업로드/조회 (Phase 3)
- `useAllocations.ts` — 공급처 배정 (Phase 4)
- `useTrackings.ts` — 운송장 매칭 (Phase 5)
- `useProductMappings.ts` — 품목↔공급처 매핑 (Phase 2)
- `useNameMappings.ts` — 상품명 변환 (Phase 2)
- `useCourierMappings.ts` — 택배사 매핑 (Phase 2)
- `useToast.ts` — toast 알림 (Phase 1, 또는 sonner 라이브러리 직접 사용)

## 훅 패턴
```ts
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getSuppliers()
      setSuppliers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  return { suppliers, loading, error, refetch: fetch }
}
```

## 규칙
- 훅 이름은 `use`로 시작
- 반환값: `{ data, loading, error, refetch, mutation함수들 }`
- 에러는 toast로도 표시 (사용자에게), error 상태로도 유지 (UI 표시용)
- 낙관적 업데이트: 간단한 CRUD에서만 (삭제/추가 시 즉시 UI 반영 → 실패 시 롤백)
