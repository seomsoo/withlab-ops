import { describe, it, expect } from 'vitest'
import {
  productMappingFormSchema,
  nameMappingFormSchema,
  courierMappingFormSchema,
  toProductMapping,
  toNameMapping,
  toCourierMapping,
} from './index'
import type { ProductMappingRow, NameMappingRow, CourierMappingRow } from './index'

describe('productMappingFormSchema', () => {
  it('trims productName and converts optionName to empty string', () => {
    const result = productMappingFormSchema.parse({
      platform: 'coupang',
      productName: '  꿀참외  ',
      optionName: undefined,
      supplierId: '550e8400-e29b-41d4-a716-446655440000',
      isDefault: true,
      priority: '5',
    })
    expect(result.productName).toBe('꿀참외')
    expect(result.optionName).toBe('')
    expect(result.priority).toBe(5)
    expect(result.isDefault).toBe(true)
  })

  it('rejects empty productName', () => {
    const result = productMappingFormSchema.safeParse({
      platform: 'coupang',
      productName: '  ',
      supplierId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('coerces string priority to number', () => {
    const result = productMappingFormSchema.parse({
      platform: 'toss',
      productName: '참외',
      supplierId: '550e8400-e29b-41d4-a716-446655440000',
      priority: '10',
    })
    expect(result.priority).toBe(10)
  })

  it('defaults isDefault to true and priority to 0', () => {
    const result = productMappingFormSchema.parse({
      platform: 'common',
      productName: '참외',
      supplierId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.isDefault).toBe(true)
    expect(result.priority).toBe(0)
  })
})

describe('nameMappingFormSchema', () => {
  it('trims all string fields', () => {
    const result = nameMappingFormSchema.parse({
      platform: 'toss',
      platformProductName: '  샤인머스캣  ',
      platformOptionName: '  2kg  ',
      supplierId: '550e8400-e29b-41d4-a716-446655440000',
      supplierProductName: '  샤인 2kg  ',
      supplierProductCode: '  SMC-2K  ',
    })
    expect(result.platformProductName).toBe('샤인머스캣')
    expect(result.platformOptionName).toBe('2kg')
    expect(result.supplierProductName).toBe('샤인 2kg')
    expect(result.supplierProductCode).toBe('SMC-2K')
  })

  it('converts undefined optionName to empty string', () => {
    const result = nameMappingFormSchema.parse({
      platform: 'common',
      platformProductName: '한라봉',
      supplierId: '550e8400-e29b-41d4-a716-446655440000',
      supplierProductName: '한라봉 5kg',
    })
    expect(result.platformOptionName).toBe('')
    expect(result.supplierProductCode).toBe('')
  })
})

describe('courierMappingFormSchema', () => {
  it('trims all string fields', () => {
    const result = courierMappingFormSchema.parse({
      sourceName: '  대한통운  ',
      coupangName: '  CJ대한통운  ',
      tossName: '  CJ대한통운  ',
    })
    expect(result.sourceName).toBe('대한통운')
    expect(result.coupangName).toBe('CJ대한통운')
    expect(result.tossName).toBe('CJ대한통운')
  })

  it('rejects empty sourceName', () => {
    const result = courierMappingFormSchema.safeParse({
      sourceName: '',
      coupangName: 'CJ대한통운',
      tossName: 'CJ대한통운',
    })
    expect(result.success).toBe(false)
  })
})

describe('toProductMapping', () => {
  it('converts snake_case row to camelCase', () => {
    const row: ProductMappingRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      platform: 'coupang',
      product_name: '꿀참외',
      option_name: '5kg',
      supplier_id: '550e8400-e29b-41d4-a716-446655440001',
      is_default: true,
      priority: 1,
      created_at: '2026-05-10T00:00:00Z',
      updated_at: '2026-05-10T00:00:00Z',
    }
    const result = toProductMapping(row)
    expect(result.id).toBe(row.id)
    expect(result.platform).toBe('coupang')
    expect(result.productName).toBe('꿀참외')
    expect(result.optionName).toBe('5kg')
    expect(result.supplierId).toBe(row.supplier_id)
    expect(result.isDefault).toBe(true)
    expect(result.priority).toBe(1)
    expect(result.createdAt).toBe(row.created_at)
    expect(result.updatedAt).toBe(row.updated_at)
  })
})

describe('toNameMapping', () => {
  it('converts snake_case row to camelCase', () => {
    const row: NameMappingRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      platform: 'toss',
      platform_product_name: '샤인머스캣',
      platform_option_name: '2kg',
      supplier_id: '550e8400-e29b-41d4-a716-446655440001',
      supplier_product_name: '샤인 2kg',
      supplier_product_code: 'SMC-2K',
      created_at: '2026-05-10T00:00:00Z',
      updated_at: '2026-05-10T00:00:00Z',
    }
    const result = toNameMapping(row)
    expect(result.platform).toBe('toss')
    expect(result.platformProductName).toBe('샤인머스캣')
    expect(result.platformOptionName).toBe('2kg')
    expect(result.supplierProductName).toBe('샤인 2kg')
    expect(result.supplierProductCode).toBe('SMC-2K')
  })

  it('handles null supplierProductCode', () => {
    const row: NameMappingRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      platform: 'common',
      platform_product_name: '한라봉',
      platform_option_name: '',
      supplier_id: '550e8400-e29b-41d4-a716-446655440001',
      supplier_product_name: '한라봉 5kg',
      supplier_product_code: null,
      created_at: '2026-05-10T00:00:00Z',
      updated_at: '2026-05-10T00:00:00Z',
    }
    const result = toNameMapping(row)
    expect(result.supplierProductCode).toBeUndefined()
  })
})

describe('toCourierMapping', () => {
  it('converts snake_case row to camelCase', () => {
    const row: CourierMappingRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      source_name: '대한통운',
      coupang_name: 'CJ대한통운',
      toss_name: 'CJ대한통운',
      created_at: '2026-05-10T00:00:00Z',
    }
    const result = toCourierMapping(row)
    expect(result.sourceName).toBe('대한통운')
    expect(result.coupangName).toBe('CJ대한통운')
    expect(result.tossName).toBe('CJ대한통운')
    expect(result.createdAt).toBe(row.created_at)
  })
})
