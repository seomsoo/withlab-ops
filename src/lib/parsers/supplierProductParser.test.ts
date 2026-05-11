import { describe, it, expect } from 'vitest'
import {
  parseSupplierProducts,
  parsePrice,
  normalizeStockStatus,
} from './supplierProductParser'
import type { SupplierProductColumnMapping } from '@/types'

const BASE_MAPPINGS: SupplierProductColumnMapping[] = [
  { targetColumnIndex: 0, targetHeaderName: '상품코드', systemField: 'productCode' },
  { targetColumnIndex: 1, targetHeaderName: '상품명', systemField: 'productName' },
  { targetColumnIndex: 2, targetHeaderName: '분류', systemField: 'category' },
  { targetColumnIndex: 3, targetHeaderName: '공급가', systemField: 'price' },
  { targetColumnIndex: 4, targetHeaderName: '재고', systemField: 'stockStatus' },
]

describe('parseSupplierProducts', () => {
  it('1. 기본 파싱: productName, productCode, price 추출', () => {
    const result = parseSupplierProducts({
      rows: [
        ['상품코드', '상품명', '분류', '공급가', '재고'],
        ['A001', '한라봉 중과 5kg', '감귤류', 15000, '판매중'],
      ],
      columnMappings: BASE_MAPPINGS,
      headerRow: 1,
      dataStartRow: 2,
    })

    expect(result.products).toHaveLength(1)
    expect(result.products[0]!.productCode).toBe('A001')
    expect(result.products[0]!.productName).toBe('한라봉 중과 5kg')
    expect(result.products[0]!.price).toBe(15000)
    expect(result.products[0]!.category).toBe('감귤류')
  })

  it('2. 완전 빈 행 스킵', () => {
    const result = parseSupplierProducts({
      rows: [
        ['상품코드', '상품명', '분류', '공급가', '재고'],
        ['A001', '한라봉', '감귤', 15000, '판매중'],
        ['', '', '', '', ''],
        [null, null, null, null, null],
      ],
      columnMappings: BASE_MAPPINGS,
      headerRow: 1,
      dataStartRow: 2,
    })

    expect(result.products).toHaveLength(1)
    expect(result.meta.skippedRows).toBe(2)
    expect(result.invalidRows).toHaveLength(0)
  })

  it('3. 상품명 누락 + 다른 값 존재 → invalidRow', () => {
    const result = parseSupplierProducts({
      rows: [
        ['상품코드', '상품명', '분류', '공급가', '재고'],
        ['A001', '', '감귤', 15000, '판매중'],
      ],
      columnMappings: BASE_MAPPINGS,
      headerRow: 1,
      dataStartRow: 2,
    })

    expect(result.products).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('상품명 누락')
    expect(result.invalidRows[0]!.rowNumber).toBe(2)
  })

  it('4. 가격 콤마 제거: "15,000" → 15000', () => {
    expect(parsePrice('15,000')).toBe(15000)
  })

  it('5. 가격 통화기호: "15,000원" → 15000, "￦15,000" → 15000', () => {
    expect(parsePrice('15,000원')).toBe(15000)
    expect(parsePrice('￦15,000')).toBe(15000)
    expect(parsePrice('₩15,000')).toBe(15000)
  })

  it('6. 가격 단위 포함: "15,000 / 박스" → 15000', () => {
    expect(parsePrice('15,000 / 박스')).toBe(15000)
  })

  it('7. 가격 없음: 빈 셀 → null', () => {
    expect(parsePrice('')).toBeNull()
    expect(parsePrice(null)).toBeNull()
    expect(parsePrice(undefined)).toBeNull()
  })

  it('8. 가격 문자열: "미정" → null', () => {
    expect(parsePrice('미정')).toBeNull()
    expect(parsePrice('-')).toBeNull()
  })

  it('9. 가격 음수: "-1,000" → null', () => {
    expect(parsePrice('-1,000')).toBeNull()
  })

  it('10. 재고 available: "판매중" → available', () => {
    expect(normalizeStockStatus('판매중').status).toBe('available')
    expect(normalizeStockStatus('재고있음').status).toBe('available')
  })

  it('11. 재고 soldout: "품절" → soldout', () => {
    expect(normalizeStockStatus('품절').status).toBe('soldout')
    expect(normalizeStockStatus('재고없음').status).toBe('soldout')
  })

  it('12. 재고 숫자 0 → soldout', () => {
    expect(normalizeStockStatus(0).status).toBe('soldout')
  })

  it('13. 재고 숫자 양수: 150 → available', () => {
    expect(normalizeStockStatus(150).status).toBe('available')
  })

  it('14. 재고 unknown: "" → unknown', () => {
    expect(normalizeStockStatus('').status).toBe('unknown')
    expect(normalizeStockStatus(null).status).toBe('unknown')
  })

  it('15. 재고 다양한 표현: O, X, 있음, 없음', () => {
    expect(normalizeStockStatus('O').status).toBe('available')
    expect(normalizeStockStatus('X').status).toBe('soldout')
    expect(normalizeStockStatus('있음').status).toBe('available')
    expect(normalizeStockStatus('없음').status).toBe('soldout')
    expect(normalizeStockStatus('Y').status).toBe('available')
    expect(normalizeStockStatus('N').status).toBe('soldout')
  })

  it('16. extra 필드: 매핑 안 된 컬럼이 extra에 저장됨', () => {
    const mappings: SupplierProductColumnMapping[] = [
      { targetColumnIndex: 0, targetHeaderName: '상품명', systemField: 'productName' },
    ]

    const result = parseSupplierProducts({
      rows: [
        ['상품명', '출고지', '마감시간'],
        ['한라봉', '제주', '오후 3시'],
      ],
      columnMappings: mappings,
      headerRow: 1,
      dataStartRow: 2,
    })

    expect(result.products[0]!.extra).toEqual({
      '출고지': '제주',
      '마감시간': '오후 3시',
    })
  })

  it('17. extra 빈 헤더: 헤더명 비어있으면 column_{n+1}', () => {
    const mappings: SupplierProductColumnMapping[] = [
      { targetColumnIndex: 0, targetHeaderName: '상품명', systemField: 'productName' },
    ]

    const result = parseSupplierProducts({
      rows: [
        ['상품명', ''],
        ['한라봉', '비고내용'],
      ],
      columnMappings: mappings,
      headerRow: 1,
      dataStartRow: 2,
    })

    expect(result.products[0]!.extra).toEqual({
      column_2: '비고내용',
    })
  })

  it('18. dataStartRow 적용: 지정된 행부터 파싱 시작', () => {
    const result = parseSupplierProducts({
      rows: [
        ['상품코드', '상품명', '분류', '공급가', '재고'],
        ['설명', '이 행은 스킵됨', '', '', ''],
        ['A001', '한라봉', '감귤', 15000, '판매중'],
      ],
      columnMappings: BASE_MAPPINGS,
      headerRow: 1,
      dataStartRow: 3,
    })

    expect(result.products).toHaveLength(1)
    expect(result.products[0]!.productCode).toBe('A001')
    expect(result.meta.totalRows).toBe(1)
  })

  it('19. 빈 rows → 빈 결과', () => {
    const result = parseSupplierProducts({
      rows: [],
      columnMappings: BASE_MAPPINGS,
      headerRow: 1,
      dataStartRow: 2,
    })

    expect(result.products).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.meta.totalRows).toBe(0)
  })
})
