type DbErrorContext =
  | 'supplier'
  | 'product_mapping'
  | 'name_mapping'
  | 'courier_mapping'
  | 'order'
  | 'order_import'
  | 'allocation'

const UNIQUE_MESSAGES: Record<DbErrorContext, string> = {
  supplier: '같은 이름의 공급처가 이미 있습니다',
  product_mapping: '이 품목+공급처 조합의 매핑이 이미 있습니다',
  name_mapping: '이 상품명+공급처 조합의 변환 매핑이 이미 있습니다',
  courier_mapping: '이 공급처의 같은 택배사 매핑이 이미 있습니다',
  order: '이미 동일한 주문이 존재합니다. 같은 파일을 중복 업로드했는지 확인해주세요.',
  order_import: '같은 플랫폼의 주문 파일이 이미 있습니다. 기존 파일을 대체하거나 병합해주세요.',
  allocation: '이 주문은 이미 공급처에 배정되어 있습니다.',
}

const FALLBACK_LABELS: Record<DbErrorContext, string> = {
  supplier: '공급처 처리',
  product_mapping: '품목 매핑',
  name_mapping: '상품명 변환',
  courier_mapping: '택배사 매핑',
  order: '주문 저장',
  order_import: '주문 파일 처리',
  allocation: '배정 처리',
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
  const label = FALLBACK_LABELS[context]
  if (
    error != null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const msg = (error as { message: string }).message
    if (msg.includes('violates') || msg.includes('constraint') || msg.includes('PGRST')) {
      return `${label}에 실패했습니다. 잠시 후 다시 시도해주세요.`
    }
    return `${label} 실패: ${msg}`
  }
  return `${label}에 실패했습니다. 잠시 후 다시 시도해주세요.`
}
