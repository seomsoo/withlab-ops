import type {
  StandardOrder,
  ProductMapping,
  NameMapping,
  Supplier,
  Platform,
} from '@/types'

export type AutoAllocationInput = {
  orders: StandardOrder[]
  productMappings: ProductMapping[]
  nameMappings: NameMapping[]
  suppliers: Supplier[]
}

export type PendingAllocation = {
  orderId: string
  supplierId: string
  supplierProductName: string
  supplierProductCode?: string
  allocatedQuantity: number
  isTemporaryOverride: false
  nameMappingApplied: boolean
}

export type UnmatchedOrder = {
  orderId: string
  reason: string
}

export type AllocationResult = {
  allocated: PendingAllocation[]
  unmatched: UnmatchedOrder[]
}

export function autoAllocate(input: AutoAllocationInput): AllocationResult {
  const { orders, productMappings, nameMappings, suppliers } = input
  const allocated: PendingAllocation[] = []
  const unmatched: UnmatchedOrder[] = []

  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))

  for (const order of orders) {
    const mapping = findProductMapping(
      order.platform,
      order.productName,
      order.optionName,
      productMappings
    )

    if (!mapping) {
      unmatched.push({ orderId: order.id, reason: '매핑 없음' })
      continue
    }

    const supplier = supplierMap.get(mapping.supplierId)
    if (!supplier) {
      unmatched.push({ orderId: order.id, reason: '매핑 없음' })
      continue
    }

    const nameResult = findNameMapping(
      order.platform,
      order.productName,
      order.optionName,
      mapping.supplierId,
      nameMappings
    )

    allocated.push({
      orderId: order.id,
      supplierId: mapping.supplierId,
      supplierProductName: nameResult.supplierProductName,
      supplierProductCode: nameResult.supplierProductCode,
      allocatedQuantity: order.quantity,
      isTemporaryOverride: false,
      nameMappingApplied: nameResult.applied,
    })
  }

  return { allocated, unmatched }
}

function findProductMapping(
  platform: Platform,
  productName: string,
  optionName: string,
  mappings: ProductMapping[]
): ProductMapping | null {
  const exactCandidates = mappings.filter(
    (m) => m.productName === productName && m.optionName === optionName
  )

  const wildcardCandidates =
    optionName !== ''
      ? mappings.filter(
          (m) => m.productName === productName && m.optionName === ''
        )
      : []

  const candidates =
    exactCandidates.length > 0 ? exactCandidates : wildcardCandidates

  if (candidates.length === 0) return null

  const exactPlatform = candidates.filter((m) => m.platform === platform)
  const commonPlatform = candidates.filter((m) => m.platform === 'common')

  const pool = exactPlatform.length > 0 ? exactPlatform : commonPlatform
  if (pool.length === 0) return null

  const defaults = pool.filter((m) => m.isDefault)
  const finalPool = defaults.length > 0 ? defaults : pool

  finalPool.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.createdAt.localeCompare(b.createdAt)
  })

  return finalPool[0] ?? null
}

export function findNameMapping(
  platform: Platform,
  productName: string,
  optionName: string,
  supplierId: string,
  nameMappings: NameMapping[]
): { supplierProductName: string; supplierProductCode?: string; applied: boolean } {
  const candidates = nameMappings.filter(
    (m) =>
      m.supplierId === supplierId &&
      m.platformProductName === productName &&
      m.platformOptionName === optionName
  )

  if (candidates.length === 0) {
    return { supplierProductName: productName, applied: false }
  }

  const exactPlatform = candidates.filter((m) => m.platform === platform)
  const commonPlatform = candidates.filter((m) => m.platform === 'common')

  const match = exactPlatform[0] ?? commonPlatform[0]
  if (!match) {
    return { supplierProductName: productName, applied: false }
  }

  return {
    supplierProductName: match.supplierProductName,
    supplierProductCode: match.supplierProductCode,
    applied: true,
  }
}
