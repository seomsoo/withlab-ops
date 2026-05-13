import { normalizeProductName } from '@/lib/matching/normalizer'
import { extractAttributes } from '@/lib/matching/attributeExtractor'
import {
  findCandidatesByAttributes,
  shouldAutoApply,
  SUGGEST_THRESHOLD,
} from '@/lib/matching/attributeMatcher'

import type { MatchCandidate } from '@/lib/matching/attributeMatcher'
import type {
  StandardOrder,
  ProductMapping,
  NameMapping,
  Supplier,
  SupplierProduct,
  FruitDictionary,
  Platform,
} from '@/types'

export type AutoAllocationInput = {
  orders: StandardOrder[]
  productMappings: ProductMapping[]
  nameMappings: NameMapping[]
  suppliers: Supplier[]
  supplierProducts?: SupplierProduct[]
  fruitDictionary?: FruitDictionary[]
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
  allocationReason?: string
}

export type SuggestedAllocation = {
  orderId: string
  candidates: MatchCandidate[]
  platformProductName: string
  platformOptionName: string
}

export type UnmatchedOrder = {
  orderId: string
  reason: string
}

export type AllocationResult = {
  allocated: PendingAllocation[]
  suggested: SuggestedAllocation[]
  unmatched: UnmatchedOrder[]
}

export function autoAllocate(input: AutoAllocationInput): AllocationResult {
  const {
    orders,
    productMappings,
    nameMappings,
    suppliers,
    supplierProducts,
    fruitDictionary,
  } = input
  const allocated: PendingAllocation[] = []
  const suggested: SuggestedAllocation[] = []
  const unmatched: UnmatchedOrder[] = []

  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))
  const useSmartAllocation =
    supplierProducts !== undefined && supplierProducts.length > 0
  const useAttributeMatch =
    useSmartAllocation &&
    fruitDictionary !== undefined &&
    fruitDictionary.length > 0

  for (const order of orders) {
    if (useSmartAllocation) {
      // Stage 1: strict exact match
      let candidates = findProductMappingCandidates(
        order.platform,
        order.productName,
        order.optionName,
        productMappings
      )

      // Stage 2: normalized exact match
      if (candidates.length === 0) {
        candidates = findProductMappingCandidatesNormalized(
          order.platform,
          order.productName,
          order.optionName,
          productMappings
        )
      }

      if (candidates.length > 0) {
        const result = selectBestSupplier(
          candidates,
          nameMappings,
          supplierProducts,
          order,
          supplierMap,
          fruitDictionary
        )

        if (result) {
          allocated.push(result)
        } else {
          unmatched.push({
            orderId: order.id,
            reason: '모든 후보 공급처 품절',
          })
        }
        continue
      }

      // Stage 3: attribute match
      if (useAttributeMatch) {
        const attrs = extractAttributes(
          order.productName,
          order.optionName,
          fruitDictionary,
          true
        )

        const attrCandidates = findCandidatesByAttributes(
          attrs,
          supplierProducts,
          suppliers,
          fruitDictionary
        )

        if (attrCandidates.length > 0 && shouldAutoApply(attrCandidates)) {
          const best = attrCandidates[0]!
          const matchedStr = attrs.fruit
            ? [attrs.fruit, attrs.grade, attrs.weight].filter(Boolean).join('/')
            : ''
          allocated.push({
            orderId: order.id,
            supplierId: best.supplier.id,
            supplierProductName: best.supplierProduct.productName,
            supplierProductCode: best.supplierProduct.productCode || undefined,
            allocatedQuantity: order.quantity,
            isTemporaryOverride: false,
            nameMappingApplied: false,
            smartAllocationApplied: true,
            supplierPrice: best.supplierProduct.price ?? undefined,
            allocationReason: `속성 매칭 (${matchedStr})`,
          })
          continue
        }

        if (
          attrCandidates.length > 0 &&
          attrCandidates[0]!.score >= SUGGEST_THRESHOLD
        ) {
          suggested.push({
            orderId: order.id,
            candidates: attrCandidates,
            platformProductName: order.productName,
            platformOptionName: order.optionName,
          })
          unmatched.push({ orderId: order.id, reason: '매핑 없음 (추천 있음)' })
          continue
        }
      }

      unmatched.push({ orderId: order.id, reason: '매핑 없음' })
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

  return { allocated, suggested, unmatched }
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

function findProductMappingCandidatesNormalized(
  platform: Platform,
  productName: string,
  optionName: string,
  mappings: ProductMapping[]
): ProductMapping[] {
  const normName = normalizeProductName(productName)
  const normOption = normalizeProductName(optionName)

  const exactCandidates = mappings.filter(
    (m) =>
      normalizeProductName(m.productName) === normName &&
      normalizeProductName(m.optionName) === normOption
  )

  const wildcardCandidates =
    normOption !== ''
      ? mappings.filter(
          (m) =>
            normalizeProductName(m.productName) === normName &&
            m.optionName === ''
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
  supplierMap: Map<string, Supplier>,
  fruitDictionary?: FruitDictionary[]
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

    let sp = findSupplierProduct(
      mapping.supplierId,
      nameResult.supplierProductName,
      nameResult.supplierProductCode,
      supplierProducts
    )

    if (!sp && !nameResult.applied && fruitDictionary && fruitDictionary.length > 0) {
      sp = findSupplierProductByAttributes(
        order,
        mapping.supplierId,
        supplierProducts,
        fruitDictionary
      )
    }

    infos.push({ mapping, nameResult, sp })
  }

  if (infos.length === 0) return null

  const defaultInfo = infos.find((c) => c.mapping.isDefault)
  if (defaultInfo) {
    const stock = defaultInfo.sp?.stockStatus ?? 'unknown'
    if (stock !== 'soldout') {
      return buildAllocation(order, defaultInfo, true, '기본 공급처 (재고 있음)')
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

  const best = nonSoldout[0]!
  const defaultName = defaultInfo
    ? supplierMap.get(defaultInfo.mapping.supplierId)?.name
    : undefined

  let reason: string
  if (nonSoldout.length === 1) {
    reason = '유일한 공급처'
  } else if (defaultInfo) {
    const price = best.sp?.price
    reason = price != null
      ? `기본 공급처(${defaultName ?? ''}) 품절 → 차선 최저가 ₩${price.toLocaleString('ko-KR')}`
      : `기본 공급처(${defaultName ?? ''}) 품절 → 차선`
  } else {
    const price = best.sp?.price
    reason = price != null
      ? `최저가 ₩${price.toLocaleString('ko-KR')} (후보 ${nonSoldout.length}곳 중)`
      : `후보 ${nonSoldout.length}곳 중 선택`
  }

  return buildAllocation(order, best, true, reason)
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
  smart: boolean,
  reason?: string
): PendingAllocation {
  return {
    orderId: order.id,
    supplierId: info.mapping.supplierId,
    supplierProductName: info.sp?.productName ?? info.nameResult.supplierProductName,
    supplierProductCode: info.sp?.productCode ?? info.nameResult.supplierProductCode,
    allocatedQuantity: order.quantity,
    isTemporaryOverride: false,
    nameMappingApplied: info.nameResult.applied,
    smartAllocationApplied: smart,
    supplierPrice: info.sp?.price ?? undefined,
    allocationReason: reason,
  }
}

function findSupplierProductByAttributes(
  order: StandardOrder,
  supplierId: string,
  supplierProducts: SupplierProduct[],
  fruitDictionary: FruitDictionary[]
): SupplierProduct | null {
  const attrs = extractAttributes(
    order.productName,
    order.optionName,
    fruitDictionary,
    true
  )
  if (!attrs.fruit) return null

  const forSupplier = supplierProducts.filter(
    (sp) => sp.supplierId === supplierId
  )
  if (forSupplier.length === 0) return null

  const scored: { sp: SupplierProduct; score: number }[] = []
  for (const sp of forSupplier) {
    const spAttrs = extractAttributes(sp.productName, '', fruitDictionary)
    if (!spAttrs.fruit || spAttrs.fruit !== attrs.fruit) continue

    let score = 0.4
    if (attrs.weight && spAttrs.weight && attrs.weight === spAttrs.weight) score += 0.25
    if (attrs.grade && spAttrs.grade && attrs.grade === spAttrs.grade) score += 0.2
    if (attrs.size && spAttrs.size && attrs.size === spAttrs.size) score += 0.15

    scored.push({ sp, score })
  }

  if (scored.length === 0) return null
  scored.sort((a, b) => b.score - a.score)
  return scored[0]!.sp
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
