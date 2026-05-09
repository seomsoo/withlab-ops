type DbErrorContext =
  | 'supplier'
  | 'product_mapping'
  | 'name_mapping'
  | 'courier_mapping'

const UNIQUE_MESSAGES: Record<DbErrorContext, string> = {
  supplier: '같은 이름의 공급처가 이미 있습니다',
  product_mapping: '이 품목+공급처 조합의 매핑이 이미 있습니다',
  name_mapping: '이 상품명+공급처 조합의 변환 매핑이 이미 있습니다',
  courier_mapping: '이 공급처의 같은 택배사 매핑이 이미 있습니다',
}

export function isUniqueViolation(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false
  const code =
    'code' in error ? (error as { code: unknown }).code : undefined
  return code === '23505'
}

export function toFriendlyDbError(
  error: unknown,
  context: DbErrorContext
): string {
  if (isUniqueViolation(error)) {
    return UNIQUE_MESSAGES[context]
  }
  if (error instanceof Error) return error.message
  return '오류가 발생했습니다'
}
