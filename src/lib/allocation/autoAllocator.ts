import type {
  StandardOrder,
  ProductMapping,
  NameMapping,
  Supplier,
  SupplierProduct,
  Platform,
} from '@/types'

export type AutoAllocationInput = {
  orders: StandardOrder[]
  productMappings: ProductMapping[]
  nameMappings: NameMapping[]
  suppliers: Supplier[]
  supplierProducts?: SupplierProduct[]
}

export type PendingAllocation = {
  orderId: string
  supplierId: string
  supplierProductName: string
  supplierProductCode?: string
  allocatedQuantity: number
  isTemporaryOverride: false
  nameMappingApplied: boolean
  smartAllocationApplied: boolean
  supplierPrice?: number
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
  const { orders, productMappings, nameMappings, suppliers, supplierProducts } =
    input
  const allocated: PendingAllocation[] = []
  const unmatched: UnmatchedOrder[] = []

  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))
  const useSmartAllocation =
    supplierProducts !== undefined && supplierProducts.length > 0

  for (const order of orders) {
    if (useSmartAllocation) {
      const candidates = findProductMappingCandidates(
        order.platform,
        order.productName,
        order.optionName,
        productMappings
      )

      if (candidates.length === 0) {
        unmatched.push({ orderId: order.id, reason: '매핑 없음' })
        continue
      }

      const result = selectBestSupplier(
        candidates,
        nameMappings,
        supplierProducts,
        order,
        supplierMap
      )

      if (result) {
        allocated.push(result)
      } else {
        unmatched.push({
          orderId: order.id,
          reason: '모든 후보 공급처 품절',
        })
      }
    } else {
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
        smartAllocationApplied: false,
      })
    }
  }

  return { allocated, unmatched }
}

function findProductMappingCandidates(
  platform: Platform,
  productName: string,
  optionName: string,
  mappings: ProductMapping[]
): ProductMapping[] {
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

  if (candidates.length === 0) return []

  const exactPlatform = candidates.filter((m) => m.platform === platform)
  const commonPlatform = candidates.filter((m) => m.platform === 'common')

  const pool = exactPlatform.length > 0 ? exactPlatform : commonPlatform
  if (pool.length === 0) return []

  const sorted = [...pool].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.createdAt.localeCompare(b.createdAt)
  })

  return sorted
}

function findSupplierProduct(
  supplierId: string,
  supplierProductName: string,
  supplierProductCode: string | undefined,
  supplierProducts: SupplierProduct[]
): SupplierProduct | null {
  const forSupplier = supplierProducts.filter(
    (sp) => sp.supplierId === supplierId
  )

  if (supplierProductCode) {
    const byCode = forSupplier.find(
      (sp) => sp.productCode === supplierProductCode
    )
    if (byCode) return byCode
  }

  const byName = forSupplier.find(
    (sp) => sp.productName === supplierProductName
  )
  return byName ?? null
}

function selectBestSupplier(
  candidates: ProductMapping[],
  nameMappings: NameMapping[],
  supplierProducts: SupplierProduct[],
  order: StandardOrder,
  supplierMap: Map<string, Supplier>
): PendingAllocation | null {
  type CandidateInfo = {
    mapping: ProductMapping
    nameResult: {
      supplierProductName: string
      supplierProductCode?: string
      applied: boolean
    }
    sp: SupplierProduct | null
  }

  const infos: CandidateInfo[] = []

  for (const mapping of candidates) {
    if (!supplierMap.has(mapping.supplierId)) continue

    const nameResult = findNameMapping(
      order.platform,
      order.productName,
      order.optionName,
      mapping.supplierId,
      nameMappings
    )

    const sp = findSupplierProduct(
      mapping.supplierId,
      nameResult.supplierProductName,
      nameResult.supplierProductCode,
      supplierProducts
    )

    infos.push({ mapping, nameResult, sp })
  }

  if (infos.length === 0) return null

  const defaultInfo = infos.find((c) => c.mapping.isDefault)
  if (defaultInfo) {
    const stock = defaultInfo.sp?.stockStatus ?? 'unknown'
    if (stock !== 'soldout') {
      return buildAllocation(order, defaultInfo, true)
    }
  }

  const nonSoldout = infos.filter((c) => {
    const stock = c.sp?.stockStatus ?? 'unknown'
    return stock !== 'soldout'
  })

  if (nonSoldout.length === 0) return null

  nonSoldout.sort((a, b) => {
    const priceA = a.sp?.price ?? Infinity
    const priceB = b.sp?.price ?? Infinity
    return priceA - priceB
  })

  return buildAllocation(order, nonSoldout[0]!, true)
}

function buildAllocation(
  order: StandardOrder,
  info: {
    mapping: ProductMapping
    nameResult: {
      supplierProductName: string
      supplierProductCode?: string
      applied: boolean
    }
    sp: SupplierProduct | null
  },
  smart: boolean
): PendingAllocation {
  return {
    orderId: order.id,
    supplierId: info.mapping.supplierId,
    supplierProductName: info.nameResult.supplierProductName,
    supplierProductCode: info.nameResult.supplierProductCode,
    allocatedQuantity: order.quantity,
    isTemporaryOverride: false,
    nameMappingApplied: info.nameResult.applied,
    smartAllocationApplied: smart,
    supplierPrice: info.sp?.price ?? undefined,
  }
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
