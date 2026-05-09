# Phase 2: 매핑 관리

## 목표
공급처 CRUD, 품목↔공급처 매핑, 상품명 변환 매핑, 택배사 매핑의 4개 CRUD 페이지를 구현한다. Phase 1에서 만든 Placeholder 페이지를 실제 동작하는 페이지로 교체하고, Supabase API 함수와 커스텀 훅을 통해 데이터를 관리한다.

> ⚠️ 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> `docs/design/` 시안 파일은 **디자인(색상, 간격, 스타일)의 참조**로만 사용한다.
> 구조, 필드 구성, 기능 범위는 **스펙 문서가 우선**이며 시안과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 1 ✅ 검증 통과

---

## 매핑 테이블 역할 정의

Phase 2에서 관리하는 3개 매핑 테이블은 이후 Phase에서 각각 다른 시점에 사용된다. 역할이 겹쳐 보일 수 있으므로 명확히 구분한다.

### ProductMapping — "어느 공급처로 보낼지" 결정
- 사용 시점: Phase 4 — 주문 업로드 후 공급처 자동 배정
- 입력: platform + productName + optionName
- 출력: supplierId (배정할 공급처)

### NameMapping — "발주서에 어떤 상품명/코드로 출력할지" 결정
- 사용 시점: Phase 4 — 공급처별 발주서 엑셀 생성
- 입력: supplierId + platform + platformProductName + platformOptionName
- 출력: supplierProductName + supplierProductCode
- NameMapping이 없으면 원본 productName을 fallback으로 사용 (Phase 4에서 확정)

### CourierMapping — "택배사명을 플랫폼 정식명으로 변환"
- 사용 시점: Phase 5 — 운송장 매칭 후 플랫폼 업로드 파일 생성
- 입력: sourceSupplierId + sourceName (공급처 운송장에 적힌 택배사명)
- 출력: coupangName / tossName (플랫폼이 인식하는 정식명)
- CourierMapping이 없으면 해당 운송장은 미매핑 오류로 분류 (원본 택배사명을 임의로 사용하지 않음)

### 주문 처리 흐름에서의 매핑 사용 순서
```
주문 라인 추출 (Phase 3)
→ ProductMapping으로 supplierId 결정 (Phase 4)
→ supplierId 기준 NameMapping으로 출력 상품명/코드 변환 (Phase 4)
→ 발주서 생성 후 운송장 수령 (Phase 5)
→ CourierMapping으로 택배사명 변환 (Phase 5)
```

---

## common 플랫폼 매칭 우선순위

`platform = 'common'`은 쿠팡/토스 공통으로 적용되는 fallback 매핑이다. ProductMapping과 NameMapping 모두에 적용된다.

매칭 우선순위:
1. 실제 플랫폼과 일치하는 매핑 우선 (쿠팡 주문 → `platform = 'coupang'`)
2. 일치하는 플랫폼 매핑이 없으면 `platform = 'common'` 매핑 사용
3. 플랫폼별 매핑과 common 매핑이 모두 존재하면 플랫폼별 매핑 우선

> 이 우선순위는 Phase 4 자동 배정 구현에서 적용된다. Phase 2에서는 매핑 등록만 담당하며, 우선순위 로직은 구현하지 않는다.

---

## ProductMapping 자동 배정 우선순위 (Phase 4 참조용)

같은 상품에 여러 공급처가 연결될 수 있다. Phase 4 자동 배정 시 아래 우선순위를 따른다.

1. platform exact 매핑이 common 매핑보다 우선
2. 같은 platform/productName/optionName 내에서 `isDefault = true`인 매핑 우선
3. `isDefault = true`가 여러 개이면 `priority`가 낮은 값 우선 (0이 가장 높음)
4. priority도 같으면 `created_at`이 빠른 매핑 우선
5. 자동 결정이 불가능하면 미배정 상태로 남기고 사용자가 수동 선택

`priority`는 0~999 정수이며 기본값 0이다. 숫자가 낮을수록 우선순위가 높다.

> Phase 2에서는 같은 품목의 기본 공급처(`isDefault = true`) 중복을 코드 레벨에서 검증하지 않는다. Phase 4 구현 시 자동 배정 로직에서 위 우선순위를 적용한다.

---

## 디자인 토큰 사용 원칙

Phase 1과 동일. 구현 코드에서 사용하는 모든 색상, 배경, 보더, 그림자, 간격, radius, font 값은 `docs/REF_디자인_시스템.md`의 토큰명을 기준으로 한다.

Phase 2 시작 전에 `docs/REF_디자인_시스템.md`와 `src/index.css`의 `@theme` 블록에 플랫폼 뱃지 토큰을 추가한다:

```css
--color-platform-coupang-bg: #FEF0EF;
--color-platform-coupang-text: #E64C3C;
--color-platform-toss-bg: var(--color-primary-50);    /* #EFF6FF */
--color-platform-toss-text: var(--color-primary);      /* #3182F6 */
--color-platform-common-bg: var(--color-gray-200);     /* #F2F4F6 */
--color-platform-common-text: var(--color-t-mid);      /* #4E5968 */
```

---

## 시안 참조 가이드

Phase 2에서 디자인 참조할 시안 파일:

| 구현 대상 | 참조 시안 파일 | 참조 범위 |
|----------|--------------|----------|
| 공급처 관리 | `docs/design/supplier.css`, `docs/design/supplier.jsx` | 테이블 레이아웃, 추가/수정 모달, 카드 스타일 |
| 품목↔공급처 매핑 | `docs/design/mapping.css`, `docs/design/mapping.jsx` | 필터 바, 테이블, 사이드 패널, 검색/세그먼트 UI |
| 상품명 변환 매핑 | `docs/design/mapping-rename.css`, `docs/design/mapping-rename.jsx` | 테이블, 추가/수정 모달 |
| 택배사 매핑 | `docs/design/mapping-courier.css`, `docs/design/mapping-courier.jsx` | 테이블, 추가/수정 모달 |

> **주의**: 시안은 프로토타입이므로 구조를 복사하지 말고 React 컴포넌트로 재구현한다. 시안의 데이터(샘플 공급처명 등)는 무시하고, Supabase에서 실시간 로드한다.

---

## API / Hook / Page 책임 분리

### Supabase API 함수 (`src/lib/supabase/`)
- Zod 검증
- Supabase 호출
- snake_case ↔ camelCase 변환
- DB 에러 메시지 변환 (errors.ts 사용)
- 실패 시 `throw new Error(사용자 친화 메시지)`
- **toast 호출 금지**

### 커스텀 훅 (`src/hooks/`)
- API 함수 호출
- loading/error 상태 관리
- 성공 시 `toast.success()` + refetch
- 실패 시 `toast.error()` + error 상태 갱신 + **에러 re-throw** (페이지에서 Dialog 닫힘 제어용)

### 페이지 (`src/pages/`)
- 폼 상태 관리
- Dialog/Sheet 열림 상태 관리
- 훅 함수 호출
- try-catch로 성공/실패에 따라 Dialog/Sheet 닫힘 제어

---

## 삭제 정책

| 테이블 | 방식 | 사유 |
|--------|------|------|
| suppliers | soft delete (`is_active = false`) | 과거 주문/발주 기록과 연결될 수 있음 |
| product_mappings | hard delete | 기준정보, 잘못 등록 시 제거 용도 |
| name_mappings | hard delete | 동일 |
| courier_mappings | hard delete | 동일 |

---

## 공급처 soft delete 정책

공급처 삭제는 실제 삭제가 아니라 비활성화로 처리한다 (`is_active = false`).

- 기존 매핑은 삭제하지 않는다
- 매핑 목록에서는 비활성 공급처에 연결된 매핑도 계속 표시한다
- 비활성 공급처는 supplierName 옆에 "비활성" 뱃지(variant: `muted`)를 표시한다
- **새 매핑 생성** 폼의 공급처 Select에는 **활성 공급처만** 표시한다
- **기존 매핑 수정** 시 이미 연결된 비활성 공급처는 현재 값으로 표시하되, 다른 활성 공급처로 변경할 수 있게 한다

이를 위해 매핑 조회 시 suppliers를 join할 때 `is_active` 필터를 걸지 않는다 (비활성 포함).

---

## Dialog / Sheet 닫힘 정책

모든 4개 페이지에 공통 적용:

**생성/수정 성공 시:**
- toast.success 표시
- 목록 refetch
- Dialog 또는 Sheet 닫기
- 폼 상태 초기화

**생성/수정 실패 시:**
- toast.error 표시
- Dialog 또는 Sheet **닫지 않음**
- 사용자가 입력한 값 유지 (재시도 가능)

**삭제 성공/실패:** 동일 패턴 (ConfirmDialog 닫기/유지)

---

## 빈 상태 vs 필터 결과 구분

| 상태 | 메시지 | 액션 |
|------|--------|------|
| 데이터 자체 없음 | "등록된 공급처가 없습니다" / "등록된 매핑이 없습니다" | [추가] 버튼 |
| 필터 결과 없음 | "검색 조건에 맞는 결과가 없습니다" | [필터 초기화] 또는 액션 없음 |

---

## 작업 목록

### 2-1. shadcn/ui 추가 컴포넌트

```bash
npx shadcn@latest add table select sheet badge tooltip popover checkbox
```

- `table`: 매핑 테이블 기반
- `select`: 플랫폼/공급처 선택 드롭다운
- `sheet`: 사이드 패널 (품목 매핑 추가/수정)
- `badge`: 플랫폼 뱃지, 상태 뱃지
- `tooltip`: 긴 텍스트 말줄임 시 툴팁
- `popover`: 필터 드롭다운
- `checkbox`: 기본 공급처 여부

---

### 2-2. 플랫폼 뱃지 토큰 추가

`docs/REF_디자인_시스템.md`와 `src/index.css`의 `@theme` 블록에 플랫폼 뱃지 전용 토큰을 추가한다 (위 "디자인 토큰 사용 원칙" 섹션 참조).

---

### 2-3. DB 에러 메시지 공통 유틸

`src/lib/supabase/errors.ts`:

```ts
export function isUniqueViolation(error: unknown): boolean
// PostgreSQL code '23505' 감지

export function toFriendlyDbError(
  error: unknown,
  context: 'supplier' | 'product_mapping' | 'name_mapping' | 'courier_mapping'
): string
// context별 사용자 친화 메시지 반환
```

중복 에러 메시지:
- suppliers: "같은 이름의 공급처가 이미 있습니다"
- product_mappings: "이 품목+공급처 조합의 매핑이 이미 있습니다"
- name_mappings: "이 상품명+공급처 조합의 변환 매핑이 이미 있습니다"
- courier_mappings: "이 공급처의 같은 택배사 매핑이 이미 있습니다"

DB 원문 에러를 UI에 직접 노출하지 않는다.

---

### 2-4. Zod Form 스키마 추가

`src/lib/schemas/index.ts`에 폼 검증용 스키마와 헬퍼 추가:

```ts
// --- 헬퍼 ---
const requiredTrimmedString = (message: string) =>
  z.string().trim().min(1, message)

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((v) => v?.trim() ?? '')

const requiredUuid = (message: string) =>
  z.string().min(1, message).uuid('올바른 값을 선택해주세요')

// --- 폼 스키마 ---
export const productMappingFormSchema = z.object({
  platform: platformWithCommonSchema,
  productName: requiredTrimmedString('상품명을 입력해주세요'),
  optionName: optionalTrimmedString,
  supplierId: requiredUuid('공급처를 선택해주세요'),
  isDefault: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(999).default(0),
})

export const nameMappingFormSchema = z.object({
  platform: platformWithCommonSchema,
  platformProductName: requiredTrimmedString('플랫폼 상품명을 입력해주세요'),
  platformOptionName: optionalTrimmedString,
  supplierId: requiredUuid('공급처를 선택해주세요'),
  supplierProductName: requiredTrimmedString('공급처 상품명을 입력해주세요'),
  supplierProductCode: optionalTrimmedString,
})

export const courierMappingFormSchema = z.object({
  sourceSupplierId: requiredUuid('공급처를 선택해주세요'),
  sourceName: requiredTrimmedString('원본 택배사명을 입력해주세요'),
  coupangName: requiredTrimmedString('쿠팡 택배사명을 입력해주세요'),
  tossName: requiredTrimmedString('토스 택배사명을 입력해주세요'),
})

// --- FormData 타입은 z.infer로 생성 (수동 타입 금지) ---
export type ProductMappingFormData = z.infer<typeof productMappingFormSchema>
export type NameMappingFormData = z.infer<typeof nameMappingFormSchema>
export type CourierMappingFormData = z.infer<typeof courierMappingFormSchema>
```

> `supplierFormSchema`는 Phase 0에서 이미 정의됨. `.trim()` 적용 여부만 확인하고 필요 시 보완.

**빈 옵션명 저장 정책:**
- `optionName`, `platformOptionName`은 빈 값이 가능하지만 DB에는 `null`이 아니라 빈 문자열 `''`로 저장한다
- `optionalTrimmedString`이 이를 보장 (undefined/빈값 → `''`)
- PostgreSQL unique 제약에서 `NULL`은 중복으로 취급되지 않으므로, `NULL` 저장을 금지한다

---

### 2-5. WithSupplier 타입 + 변환 함수

`src/lib/schemas/index.ts`에 join 결과용 타입 추가:

```ts
// WithSupplier 타입 — 모든 매핑에서 공통 사용
export type ProductMappingWithSupplier = ProductMapping & {
  supplierName: string
  supplierIsActive: boolean
}

export type NameMappingWithSupplier = NameMapping & {
  supplierName: string
  supplierIsActive: boolean
}

export type CourierMappingWithSupplier = CourierMapping & {
  supplierName: string
  supplierIsActive: boolean
}
```

변환 함수는 각 API 파일 내부에서 처리:
- supplier가 null이면 `supplierName = '알 수 없음'`, `supplierIsActive = false`

---

### 2-6. Supabase API 함수 — 공급처

`src/lib/supabase/suppliers.ts`:

```ts
// 활성 공급처 목록 조회 (is_active=true만, name 오름차순) — 폼 Select용
export async function getSuppliers(): Promise<Supplier[]>

// 전체 공급처 조회 (비활성 포함) — 공급처 관리 테이블용
export async function getAllSuppliers(): Promise<Supplier[]>

// 공급처 생성
export async function createSupplier(data: SupplierFormData): Promise<Supplier>

// 공급처 수정
export async function updateSupplier(id: string, data: SupplierFormData): Promise<Supplier>

// 공급처 소프트 삭제 (is_active = false)
export async function deleteSupplier(id: string): Promise<void>
```

**규칙:**
- Supabase 응답은 `SupplierRow` (snake_case)로 받아서 `toSupplier()` 변환 후 반환
- 생성/수정 시 `supplierFormSchema`로 Zod 검증
- 에러 시 `toFriendlyDbError()` 사용
- `getSuppliers()`: 매핑 폼 Select용 (활성만)
- `getAllSuppliers()`: 공급처 관리 테이블용 (비활성 포함)
- Supplier.contact는 자유 텍스트로 저장. 전화번호 정규화 미적용 (운영 참고용)

---

### 2-7. Supabase API 함수 — 품목↔공급처 매핑

`src/lib/supabase/productMappings.ts`:

```ts
// 전체 매핑 목록 조회 (supplier join — 비활성 포함)
export async function getProductMappings(): Promise<ProductMappingWithSupplier[]>

// 매핑 생성
export async function createProductMapping(data: ProductMappingFormData): Promise<ProductMapping>

// 매핑 수정
export async function updateProductMapping(id: string, data: ProductMappingFormData): Promise<ProductMapping>

// 매핑 삭제 (hard delete)
export async function deleteProductMapping(id: string): Promise<void>
```

**조회 쿼리 패턴:**
```ts
const { data, error } = await supabase
  .from('product_mappings')
  .select('*, supplier:suppliers(id, name, is_active)')
  .order('platform')
  .order('product_name')
  .order('option_name')
  .order('priority')
```

---

### 2-8. Supabase API 함수 — 상품명 변환 매핑

`src/lib/supabase/nameMappings.ts`:

동일 패턴. `NameMappingWithSupplier[]` 반환. join에 supplier 비활성 포함.

정렬: platform → platform_product_name → platform_option_name

NameMapping은 같은 플랫폼 상품이 같은 공급처로 발주될 때 출력 상품명/코드는 하나만 허용한다. 다른 코드로 바꾸려면 기존 매핑을 수정한다.

---

### 2-9. Supabase API 함수 — 택배사 매핑

`src/lib/supabase/courierMappings.ts`:

동일 패턴. `CourierMappingWithSupplier[]` 반환.

정렬: supplier name → source_name (클라이언트에서 supplierName 기준 정렬)

---

### 2-10. 커스텀 훅 — useSuppliers

`src/hooks/useSuppliers.ts`:

```ts
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => { ... }, [])

  useEffect(() => {
    let alive = true
    // refetch with alive guard
    return () => { alive = false }
  }, [])

  const create = async (data: SupplierFormData) => {
    try {
      await createSupplier(data)
      toast.success('공급처를 추가했습니다')
      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(message)
      toast.error(message)
      throw err  // 페이지에서 Dialog 닫힘 제어용
    }
  }

  // update, remove 동일 패턴

  return { suppliers, loading, error, refetch, create, update, remove }
}
```

**규칙:**
- 로드 함수명: `refetch` (전역 `fetch`와 혼동 방지)
- 초기 로드 effect에서 alive flag 사용
- mutation 실패 시 에러 re-throw
- 공급처 관리 페이지에서는 `getAllSuppliers()` 사용, 매핑 폼에서는 `getSuppliers()` 사용
  → 훅에 `includeInactive` 옵션을 받거나, 페이지에서 직접 API를 선택

---

### 2-11. 커스텀 훅 — useProductMappings

`src/hooks/useProductMappings.ts`:

동일 패턴. `ProductMappingWithSupplier[]` 반환.

---

### 2-12. 커스텀 훅 — useNameMappings

`src/hooks/useNameMappings.ts`:

동일 패턴. `NameMappingWithSupplier[]` 반환.

---

### 2-13. 커스텀 훅 — useCourierMappings

`src/hooks/useCourierMappings.ts`:

동일 패턴. `CourierMappingWithSupplier[]` 반환.

---

### 2-14. PlatformBadge 컴포넌트

`src/components/PlatformBadge.tsx`:

```ts
type PlatformBadgeProps = {
  platform: 'coupang' | 'toss' | 'common'
}
```

| platform | 라벨 | 배경 | 텍스트 |
|----------|------|------|--------|
| common | 공통 | `var(--color-platform-common-bg)` | `var(--color-platform-common-text)` |
| coupang | 쿠팡 | `var(--color-platform-coupang-bg)` | `var(--color-platform-coupang-text)` |
| toss | 토스 | `var(--color-platform-toss-bg)` | `var(--color-platform-toss-text)` |

`REF_디자인_시스템.md` §7 Badge 패턴 (pill) 적용: 11px/600~700, padding 3px 8px, radius 6px.

raw color를 직접 사용하지 않고 디자인 토큰만 사용한다.

---

### 2-15. 공급처 관리 페이지

`src/pages/mapping/SupplierManage.tsx` — Phase 1의 Placeholder를 교체.

> **시안 참조**: `docs/design/supplier.css`, `docs/design/supplier.jsx`

**구조:**
```
PageHeader: "공급처 관리" + description + [공급처 추가] 버튼
├─ 로딩 중: LoadingSpinner
├─ 빈 상태: EmptyState ("등록된 공급처가 없습니다" + [공급처 추가] 액션)
└─ 공급처 테이블
    ├─ 헤더: 이름 / 연락처 / 메모 / 등록일 / 관리
    └─ 행: name / contact / memo / createdAt / [수정][삭제]
```

**테이블 규칙:**
- `REF_디자인_시스템.md` §7 Table 패턴 적용
- 헤더: 배경 `var(--color-gray-50)`, 12px/600, letter-spacing 0.02em
- 행: padding `14px 24px`
- 빈 연락처/메모: `—` 표시, color `var(--color-t-mute)`
- 정렬: name 오름차순
- `getAllSuppliers()` 사용 (비활성 포함 표시)

**[공급처 추가] 버튼:**
- PageHeader의 `actions` prop으로 전달
- 클릭 → 추가 Dialog 열기

**추가/수정 Dialog:**
- `Dialog` (shadcn/ui) 직접 사용 (폼이 있으므로)
- 필드: 이름(필수), 연락처(선택, 자유 텍스트), 메모(선택)
- 수정 시 기존 값 pre-fill
- 저장 시: `supplierFormSchema`로 검증 → API 호출 → 성공 시 Dialog 닫기 + toast.success
- 실패 시: Dialog 유지 + toast.error
- 저장 중: 버튼 disabled + "저장 중..."

**삭제:**
- `ConfirmDialog` 사용
- title: "공급처 비활성화"
- description: "{공급처명}을(를) 비활성화하시겠습니까? 기존 매핑과 과거 데이터는 유지되지만, 새 매핑 생성 시에는 선택할 수 없습니다."
- variant: `destructive`
- 확인 → 소프트 삭제 (`is_active = false`)

---

### 2-16. 품목↔공급처 매핑 페이지

`src/pages/mapping/ProductMapping.tsx` — Phase 1의 Placeholder를 교체.

> **시안 참조**: `docs/design/mapping.css`, `docs/design/mapping.jsx`

**사용 훅:**
- `useProductMappings()` — 매핑 목록
- `useSuppliers()` — 폼 Select용 (활성만)

두 훅 중 하나라도 초기 로딩 중이면 LoadingSpinner 표시.

**구조:**
```
PageHeader: "품목 ↔ 공급처 매핑" + description + [매핑 추가] 버튼
├─ 필터 바
│   ├─ 검색 입력 (상품명, 옵션 검색)
│   ├─ 공급처 필터 (Select: 전체 / 각 공급처)
│   └─ 플랫폼 필터 (세그먼트 버튼: 전체 / 공통 / 쿠팡 / 토스)
├─ 로딩 중: LoadingSpinner
├─ 빈/필터 결과 없음: EmptyState (메시지 구분)
└─ 매핑 테이블
    ├─ 헤더: 플랫폼 / 상품명 / 옵션 / 공급처 / 기본 / 우선순위 / 관리
    └─ 행: PlatformBadge / productName / optionName / supplierName(+비활성뱃지) / isDefault / priority / [수정][삭제]
```

**플랫폼 뱃지:** `PlatformBadge` 컴포넌트 사용.

**공급처 열:**
- `supplierIsActive = false`이면 supplierName 옆에 StatusBadge(variant: `muted`, "비활성") 표시

**필터 동작:**
- 검색: `productName` 또는 `optionName`에 검색어 포함 (`trim().toLowerCase()` 기준, 클라이언트 필터링)
- 공급처: `supplierId`로 필터
- 플랫폼: `platform`으로 필터
- 모든 필터는 AND 조합
- 검색어 비어있으면 검색 필터 미적용
- 초성 검색, 공백 제거 검색, 퍼지 검색은 Phase 2 범위에서 제외

**기본 공급처 표시:**
- `isDefault = true` → 체크 아이콘 (Lucide `Check`, color success)
- `isDefault = false` → `—`

**정렬:** platform → productName → optionName → priority → supplierName

**[매핑 추가] / [수정]:**
- `Sheet` (사이드 패널) 사용 — 시안 참조
- 필드:
  - 플랫폼 (Select: 공통/쿠팡/토스)
  - 상품명 (Input, 필수)
  - 옵션명 (Input, 빈 문자열 허용)
  - 공급처 (Select, 필수 — **활성 공급처만 표시**, 수정 시 현재 비활성 공급처도 현재 값으로 표시)
  - 기본 공급처 여부 (Checkbox)
  - 우선순위 (Number Input, 기본값 0, 0~999)
- 수정 시 기존 값 pre-fill

**삭제:**
- `ConfirmDialog`, variant `destructive`
- description: "이 매핑을 삭제하시겠습니까?"

---

### 2-17. 상품명 변환 매핑 페이지

`src/pages/mapping/NameMapping.tsx` — Phase 1의 Placeholder를 교체.

> **시안 참조**: `docs/design/mapping-rename.css`, `docs/design/mapping-rename.jsx`

**사용 훅:** `useNameMappings()` + `useSuppliers()`

**구조:**
```
PageHeader: "상품명 변환 매핑" + description + [매핑 추가] 버튼
├─ 필터 바
│   ├─ 검색 입력 (플랫폼 상품명, 공급처 상품명 검색)
│   └─ 공급처 필터 (Select: 전체 / 각 공급처)
├─ 로딩 중: LoadingSpinner
├─ 빈/필터 결과 없음: EmptyState (메시지 구분)
└─ 매핑 테이블
    ├─ 헤더: 플랫폼 / 플랫폼 상품명 / 옵션 / 공급처 / 공급처 상품명 / 공급처 상품코드 / 관리
    └─ 행: PlatformBadge / platformProductName / platformOptionName / supplierName(+비활성뱃지) / supplierProductName / supplierProductCode / [수정][삭제]
```

**정렬:** platform → platformProductName → platformOptionName → supplierName

**[매핑 추가] / [수정]:**
- `Dialog` 사용
- 필드:
  - 플랫폼 (Select: 공통/쿠팡/토스)
  - 플랫폼 상품명 (Input, 필수)
  - 플랫폼 옵션명 (Input, 빈 문자열 허용)
  - 공급처 (Select, 필수 — 활성만, 수정 시 비활성도 현재 값 표시)
  - 공급처 상품명 (Input, 필수)
  - 공급처 상품코드 (Input, 선택)

---

### 2-18. 택배사 매핑 페이지

`src/pages/mapping/CourierMapping.tsx` — Phase 1의 Placeholder를 교체.

> **시안 참조**: `docs/design/mapping-courier.css`, `docs/design/mapping-courier.jsx`

**사용 훅:** `useCourierMappings()` + `useSuppliers()`

**구조:**
```
PageHeader: "택배사 매핑" + description + [매핑 추가] 버튼
├─ 필터 바
│   ├─ 검색 입력 (택배사명 검색)
│   └─ 공급처 필터 (Select: 전체 / 각 공급처)
├─ 로딩 중: LoadingSpinner
├─ 빈/필터 결과 없음: EmptyState (메시지 구분)
└─ 매핑 테이블
    ├─ 헤더: 공급처 / 원본 택배사명 / 쿠팡 택배사명 / 토스 택배사명 / 관리
    └─ 행: supplierName(+비활성뱃지) / sourceName / coupangName / tossName / [수정][삭제]
```

**정렬:** supplierName → sourceName

**[매핑 추가] / [수정]:**
- `Dialog` 사용
- 필드:
  - 공급처 (Select, 필수 — 활성만)
  - 원본 택배사명 (Input, 필수) — 공급처 운송장에 적히는 이름
  - 쿠팡 택배사명 (Input, 필수) — 쿠팡이 인식하는 정식 이름
  - 토스 택배사명 (Input, 필수) — 토스가 인식하는 정식 이름

---

## DB 제약 조건 참조

Phase 2에서 주의해야 할 DB unique 제약:

| 테이블 | unique 제약 | 의미 |
|--------|-----------|------|
| suppliers | `uniq_active_supplier_name` (name WHERE is_active=true) | 활성 공급처 이름 중복 방지 |
| product_mappings | `(platform, product_name, option_name, supplier_id)` | 같은 품목+공급처 조합 중복 방지 |
| name_mappings | `(platform, platform_product_name, platform_option_name, supplier_id)` | 같은 변환+공급처 조합 중복 방지 |
| courier_mappings | `(source_supplier_id, source_name)` | 같은 공급처의 같은 택배사명 중복 방지 |

---

## 완료 기준

### Supabase API 함수
- [ ] `src/lib/supabase/errors.ts` — isUniqueViolation, toFriendlyDbError 공통화
- [ ] `src/lib/supabase/suppliers.ts` — getSuppliers(활성만), getAllSuppliers(전체), createSupplier, updateSupplier, deleteSupplier
- [ ] `src/lib/supabase/productMappings.ts` — CRUD 4함수, supplier join (비활성 포함)
- [ ] `src/lib/supabase/nameMappings.ts` — CRUD 4함수, supplier join (비활성 포함)
- [ ] `src/lib/supabase/courierMappings.ts` — CRUD 4함수, supplier join (비활성 포함)
- [ ] 모든 API 함수에서 snake_case → camelCase 변환
- [ ] unique 제약 위반 시 사용자 친화적 에러 메시지 (errors.ts)
- [ ] API 함수에서 toast 호출하지 않음

### Zod 스키마
- [ ] requiredTrimmedString, optionalTrimmedString, requiredUuid 헬퍼
- [ ] productMappingFormSchema (trim, coerce, min/max 적용)
- [ ] nameMappingFormSchema (trim 적용)
- [ ] courierMappingFormSchema (trim 적용)
- [ ] FormData 타입은 z.infer로 생성 (수동 타입 금지)
- [ ] supplierFormSchema에 trim 적용 확인
- [ ] optionName/platformOptionName은 null 아닌 빈 문자열로 변환

### WithSupplier 타입
- [ ] ProductMappingWithSupplier (supplierName + supplierIsActive)
- [ ] NameMappingWithSupplier (supplierName + supplierIsActive)
- [ ] CourierMappingWithSupplier (supplierName + supplierIsActive)

### 커스텀 훅
- [ ] useSuppliers — CRUD + 로딩/에러 상태
- [ ] useProductMappings — CRUD + 로딩/에러 상태
- [ ] useNameMappings — CRUD + 로딩/에러 상태
- [ ] useCourierMappings — CRUD + 로딩/에러 상태
- [ ] 모든 훅에서 toast 호출 (success/error)
- [ ] 모든 훅에서 mutation 성공 시 refetch
- [ ] 모든 훅에서 mutation 실패 시 에러 re-throw
- [ ] 로드 함수명 refetch 사용 (전역 fetch 회피)
- [ ] 초기 로드 effect에서 alive flag 사용

### 공급처 관리 페이지
- [ ] 공급처 목록 테이블 (이름/연락처/메모/등록일/관리)
- [ ] 빈 상태: EmptyState 표시
- [ ] [공급처 추가] → Dialog (이름 필수, 연락처/메모 선택)
- [ ] [수정] → Dialog (기존 값 pre-fill)
- [ ] [삭제] → ConfirmDialog "비활성화" → 소프트 삭제
- [ ] 중복 이름 에러 메시지 표시

### 품목↔공급처 매핑 페이지
- [ ] 매핑 테이블 (플랫폼/상품명/옵션/공급처/기본/우선순위/관리)
- [ ] 검색 필터 (trim().toLowerCase() 기준)
- [ ] 공급처 필터 드롭다운
- [ ] 플랫폼 필터 세그먼트 (전체/공통/쿠팡/토스)
- [ ] PlatformBadge 사용
- [ ] 비활성 공급처에 "비활성" 뱃지 표시
- [ ] [매핑 추가] → Sheet 사이드 패널 (활성 공급처만 Select)
- [ ] [수정] → Sheet (기존 값 pre-fill, 비활성 공급처도 현재 값 표시)
- [ ] [삭제] → ConfirmDialog
- [ ] 같은 품목에 여러 공급처 가능
- [ ] 빈 상태 vs 필터 결과 없음 메시지 구분

### 상품명 변환 매핑 페이지
- [ ] 매핑 테이블 (플랫폼/플랫폼상품명/옵션/공급처/공급처상품명/공급처코드/관리)
- [ ] 검색 + 공급처 필터
- [ ] 비활성 공급처 "비활성" 뱃지
- [ ] [매핑 추가/수정] → Dialog
- [ ] [삭제] → ConfirmDialog

### 택배사 매핑 페이지
- [ ] 매핑 테이블 (공급처/원본택배사명/쿠팡택배사명/토스택배사명/관리)
- [ ] 검색 + 공급처 필터
- [ ] 비활성 공급처 "비활성" 뱃지
- [ ] [매핑 추가/수정] → Dialog
- [ ] [삭제] → ConfirmDialog

### 공통
- [ ] PlatformBadge 컴포넌트 (디자인 토큰 사용, raw color 금지)
- [ ] 플랫폼 뱃지 토큰이 REF_디자인_시스템.md + index.css에 추가됨
- [ ] 4개 페이지 모두 라우팅 접근 가능
- [ ] 디자인 토큰: REF_디자인_시스템.md 패턴 적용
- [ ] 시안 스타일 재현
- [ ] Dialog/Sheet 닫힘 정책: 성공 시 닫기, 실패 시 유지
- [ ] 목록 정렬 기준 적용
- [ ] 매핑 페이지에서 mappings/suppliers 중 하나라도 로딩 중이면 LoadingSpinner

### 테스트
- [ ] productMappingFormSchema trim/default/coerce 검증
- [ ] nameMappingFormSchema trim/default 검증
- [ ] courierMappingFormSchema trim 검증
- [ ] toProductMapping snake_case → camelCase 변환 테스트
- [ ] toNameMapping snake_case → camelCase 변환 테스트
- [ ] toCourierMapping snake_case → camelCase 변환 테스트

### 빌드
- [ ] `npm run build` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run test:run` 통과
- [ ] 콘솔 에러 없음

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `docs/REF_디자인_시스템.md` | 토큰/패턴 — 최우선 |
| `docs/REF_데이터_모델.md` | Supplier, ProductMapping, NameMapping, CourierMapping 타입 |
| `docs/REF_DB_스키마.md` | 테이블 제약조건, 인덱스 |
| `docs/design/supplier.css` | 공급처 관리 디자인 |
| `docs/design/supplier.jsx` | 공급처 관리 디자인 |
| `docs/design/mapping.css` | 품목 매핑 디자인 |
| `docs/design/mapping.jsx` | 품목 매핑 디자인 |
| `docs/design/mapping-rename.css` | 상품명 변환 디자인 |
| `docs/design/mapping-rename.jsx` | 상품명 변환 디자인 |
| `docs/design/mapping-courier.css` | 택배사 매핑 디자인 |
| `docs/design/mapping-courier.jsx` | 택배사 매핑 디자인 |
| `src/hooks/CLAUDE.md` | 훅 규칙 |
| `src/pages/CLAUDE.md` | 페이지 규칙 |
| `src/components/CLAUDE.md` | 컴포넌트 규칙 |

---

## 산출물

### 신규 파일
- `src/lib/supabase/errors.ts`
- `src/lib/supabase/suppliers.ts`
- `src/lib/supabase/productMappings.ts`
- `src/lib/supabase/nameMappings.ts`
- `src/lib/supabase/courierMappings.ts`
- `src/hooks/useSuppliers.ts`
- `src/hooks/useProductMappings.ts`
- `src/hooks/useNameMappings.ts`
- `src/hooks/useCourierMappings.ts`
- `src/components/PlatformBadge.tsx`
- shadcn/ui 컴포넌트 파일 (table, select, sheet, badge, tooltip, popover, checkbox)

### 수정 파일
- `docs/REF_디자인_시스템.md` — 플랫폼 뱃지 토큰 추가
- `src/index.css` — @theme 블록에 플랫폼 뱃지 토큰 추가
- `src/lib/schemas/index.ts` — form 스키마 + 헬퍼 + FormData 타입 추가
- `src/pages/mapping/SupplierManage.tsx` — Placeholder → 실제 구현
- `src/pages/mapping/ProductMapping.tsx` — Placeholder → 실제 구현
- `src/pages/mapping/NameMapping.tsx` — Placeholder → 실제 구현
- `src/pages/mapping/CourierMapping.tsx` — Placeholder → 실제 구현
