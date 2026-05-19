import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'

import { parseTracking, parseTrackingWithTemplate } from './trackingParser'

import type { SupplierTrackingTemplate } from '@/types'

function makeWorkbook(
  headers: string[],
  dataRows: unknown[][],
  sheetName = 'Sheet1'
): XLSX.WorkBook {
  const aoa = [headers, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

const A_HEADERS = [
  '주문번호', '업체주문번호', '주문일', '상품명', '옵션명',
  '수량', '단가', '수령인', '연락처', '우편번호',
  '주소', '배송메시지', '택배사', '송장번호',
]

const B_HEADERS = [
  '주문번호', '주문일', '결제금액', '거래처주문번호', '상품명',
  '옵션명', '수량', '단가', '판매금액', '정산금액',
  '수령인', '연락처', '우편번호', '주소',
  '배송메시지', '비고', '택배사', '운송장번호',
]

function makeARow(overrides: Partial<{
  internalNo: string
  orderKey: string
  productName: string
  recipientName: string
  courier: string
  trackingNo: string
}> = {}): unknown[] {
  return [
    overrides.internalNo ?? 'PO001',
    overrides.orderKey ?? '31100187326921',
    '2026-05-01',
    overrides.productName ?? '성주 꿀참외 5kg',
    '가정용',
    1,
    29900,
    overrides.recipientName ?? '홍길동',
    '010-1234-5678',
    '12345',
    '서울시 강남구',
    '부재 시 문 앞에',
    overrides.courier ?? 'CJ대한통운',
    overrides.trackingNo ?? '1234567890',
  ]
}

function makeBRow(overrides: Partial<{
  orderKey: string
  productName: string
  recipientName: string
  courier: string
  trackingNo: string
}> = {}): unknown[] {
  return [
    'B001',
    '2026-05-01',
    29900,
    overrides.orderKey ?? '9900001234',
    overrides.productName ?? '딸기 1kg',
    '옵션A',
    1,
    29900,
    29900,
    28000,
    overrides.recipientName ?? '김철수',
    '010-9876-5432',
    '54321',
    '부산시 해운대구',
    '경비실',
    '',
    overrides.courier ?? '한진택배',
    overrides.trackingNo ?? '9876543210',
  ]
}

describe('trackingParser', () => {
  it('A업체 운송장 파싱 — rawOrderKey/trackingCompany/trackingNumber 추출', () => {
    const wb = makeWorkbook(A_HEADERS, [makeARow()])
    const result = parseTracking(wb)

    expect(result.trackings).toHaveLength(1)
    expect(result.trackings[0]!.rawOrderKey).toBe('31100187326921')
    expect(result.trackings[0]!.trackingCompany).toBe('CJ대한통운')
    expect(result.trackings[0]!.trackingNumber).toBe('1234567890')
  })

  it('B업체 운송장 파싱 — 컬럼명 차이(운송장번호 vs 송장번호) 처리', () => {
    const wb = makeWorkbook(B_HEADERS, [makeBRow()])
    const result = parseTracking(wb)

    expect(result.trackings).toHaveLength(1)
    expect(result.trackings[0]!.rawOrderKey).toBe('9900001234')
    expect(result.trackings[0]!.trackingCompany).toBe('한진택배')
    expect(result.trackings[0]!.trackingNumber).toBe('9876543210')
  })

  it('productName/recipientName 추출 (있을 때)', () => {
    const wb = makeWorkbook(A_HEADERS, [
      makeARow({ productName: '사과 3kg', recipientName: '박지성' }),
    ])
    const result = parseTracking(wb)

    expect(result.trackings[0]!.productName).toBe('사과 3kg')
    expect(result.trackings[0]!.recipientName).toBe('박지성')
  })

  it('빈 행 스킵 — rawOrderKey+trackingNumber 모두 비어있는 행 → skippedRows', () => {
    const emptyRow = new Array(A_HEADERS.length).fill('')
    const wb = makeWorkbook(A_HEADERS, [makeARow(), emptyRow, makeARow({ orderKey: '222' })])
    const result = parseTracking(wb)

    expect(result.trackings).toHaveLength(2)
    expect(result.meta.skippedRows).toBe(1)
  })

  it('rawOrderKey만 있고 trackingNumber 없음 → invalidRow', () => {
    const wb = makeWorkbook(A_HEADERS, [makeARow({ trackingNo: '' })])
    const result = parseTracking(wb)

    expect(result.trackings).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('운송장번호 누락')
  })

  it('trackingNumber만 있고 rawOrderKey 없음 → 스킵 (수량분할 연속행)', () => {
    const wb = makeWorkbook(A_HEADERS, [makeARow({ orderKey: '' })])
    const result = parseTracking(wb)

    expect(result.trackings).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.meta.skippedRows).toBe(1)
  })

  it('택배사 누락 → invalidRow', () => {
    const wb = makeWorkbook(A_HEADERS, [makeARow({ courier: '' })])
    const result = parseTracking(wb)

    expect(result.trackings).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('택배사 누락')
  })

  it('공백 trim 처리', () => {
    const wb = makeWorkbook(A_HEADERS, [
      makeARow({ orderKey: '  12345  ', trackingNo: ' 999 ', courier: ' CJ ' }),
    ])
    const result = parseTracking(wb)

    expect(result.trackings[0]!.rawOrderKey).toBe('12345')
    expect(result.trackings[0]!.trackingNumber).toBe('999')
    expect(result.trackings[0]!.trackingCompany).toBe('CJ')
  })

  it('rawRowNumber가 1-based 엑셀 행 번호', () => {
    const wb = makeWorkbook(A_HEADERS, [
      makeARow({ orderKey: '111' }),
      makeARow({ orderKey: '222' }),
    ])
    const result = parseTracking(wb)

    expect(result.trackings[0]!.rawRowNumber).toBe(2)
    expect(result.trackings[1]!.rawRowNumber).toBe(3)
  })

  it('detectedCourier 최빈값 계산', () => {
    const wb = makeWorkbook(A_HEADERS, [
      makeARow({ orderKey: '1', courier: 'CJ대한통운' }),
      makeARow({ orderKey: '2', courier: '한진택배' }),
      makeARow({ orderKey: '3', courier: 'CJ대한통운' }),
    ])
    const result = parseTracking(wb)

    expect(result.meta.detectedCourier).toBe('CJ대한통운')
  })

  it('인식 불가 엑셀 형식 → 에러 throw', () => {
    const wb = makeWorkbook(['A', 'B', 'C'], [['1', '2', '3']])

    expect(() => parseTracking(wb)).toThrow('운송장 형식을 인식할 수 없습니다')
  })

  it('모든 행이 빈 행이면 validCount=0', () => {
    const emptyRow = new Array(A_HEADERS.length).fill('')
    const wb = makeWorkbook(A_HEADERS, [emptyRow, emptyRow])
    const result = parseTracking(wb)

    expect(result.trackings).toHaveLength(0)
    expect(result.meta.validCount).toBe(0)
    expect(result.meta.skippedRows).toBe(2)
  })

  it('meta 필드가 올바르게 계산됨', () => {
    const emptyRow = new Array(A_HEADERS.length).fill('')
    const wb = makeWorkbook(A_HEADERS, [
      makeARow({ orderKey: '1' }),
      makeARow({ orderKey: '2' }),
      makeARow({ orderKey: '', trackingNo: '999' }),
      emptyRow,
    ])
    const result = parseTracking(wb)

    expect(result.meta.totalRows).toBe(4)
    expect(result.meta.validCount).toBe(2)
    expect(result.meta.invalidCount).toBe(0)
    expect(result.meta.skippedRows).toBe(2)
  })
})

// --- parseTrackingWithTemplate ---

const CUSTOM_HEADERS = ['No', '상품명', '수령인', '주문키', '택배사', '송장']

function makeTemplateWorkbook(
  headers: string[],
  dataRows: unknown[][],
  sheetName = 'Sheet1'
): XLSX.WorkBook {
  const aoa = [headers, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

function makeTemplate(overrides: Partial<SupplierTrackingTemplate> = {}): SupplierTrackingTemplate {
  return {
    id: 'tpl-1',
    supplierId: 'sup-1',
    sheetName: '',
    headerRow: 1,
    dataStartRow: 2,
    orderKeyColumn: 3,
    orderKeyHeader: '주문키',
    trackingNumberColumn: 5,
    trackingNumberHeader: '송장',
    courierColumn: 4,
    courierHeader: '택배사',
    defaultCourier: null,
    productNameColumn: 1,
    productNameHeader: '상품명',
    recipientColumn: 2,
    recipientHeader: '수령인',
    ...overrides,
  }
}

describe('parseTrackingWithTemplate', () => {
  it('기본 파싱 — 컬럼 인덱스로 데이터 추출', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과 3kg', '홍길동', 'ORD-001', 'CJ대한통운', '1234567890'],
    ])
    const result = parseTrackingWithTemplate(wb, makeTemplate())

    expect(result.trackings).toHaveLength(1)
    expect(result.trackings[0]!.rawOrderKey).toBe('ORD-001')
    expect(result.trackings[0]!.trackingCompany).toBe('CJ대한통운')
    expect(result.trackings[0]!.trackingNumber).toBe('1234567890')
    expect(result.trackings[0]!.productName).toBe('사과 3kg')
    expect(result.trackings[0]!.recipientName).toBe('홍길동')
  })

  it('택배사 컬럼 없음 → defaultCourier 사용', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', '', '1234567890'],
    ])
    const template = makeTemplate({
      courierColumn: null,
      courierHeader: null,
      defaultCourier: 'CJ대한통운',
    })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings).toHaveLength(1)
    expect(result.trackings[0]!.trackingCompany).toBe('CJ대한통운')
  })

  it('택배사 컬럼 매핑 + 빈 셀 → defaultCourier로 fallback', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', '', '1234567890'],
      [2, '배', '김철수', 'ORD-002', '한진택배', '9876543210'],
    ])
    const template = makeTemplate({ defaultCourier: 'CJ대한통운' })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings).toHaveLength(2)
    expect(result.trackings[0]!.trackingCompany).toBe('CJ대한통운')
    expect(result.trackings[1]!.trackingCompany).toBe('한진택배')
  })

  it('택배사 컬럼 매핑 + 빈 셀 + defaultCourier 없음 → 택배사 누락', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', '', '1234567890'],
    ])
    const template = makeTemplate({ defaultCourier: null })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('택배사 누락')
  })

  it('주문번호 누락 → 스킵 (수량분할 연속행)', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', '', 'CJ대한통운', '1234567890'],
    ])
    const result = parseTrackingWithTemplate(wb, makeTemplate())

    expect(result.trackings).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.meta.skippedRows).toBe(1)
  })

  it('운송장번호 누락 → invalidRow', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', ''],
    ])
    const result = parseTrackingWithTemplate(wb, makeTemplate())

    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('운송장번호 누락')
  })

  it('빈 행 스킵 — 주문번호+운송장번호 모두 비어있으면 skippedRows', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', '1234567890'],
      ['', '', '', '', '', ''],
      [3, '배', '김철수', 'ORD-002', '한진택배', '9876543210'],
    ])
    const result = parseTrackingWithTemplate(wb, makeTemplate())

    expect(result.trackings).toHaveLength(2)
    expect(result.meta.skippedRows).toBe(1)
  })

  it('시트명 지정 — template.sheetName으로 시트 선택', () => {
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.aoa_to_sheet([['A'], ['B']])
    const ws2 = XLSX.utils.aoa_to_sheet([
      CUSTOM_HEADERS,
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', '1234567890'],
    ])
    XLSX.utils.book_append_sheet(wb, ws1, '요약')
    XLSX.utils.book_append_sheet(wb, ws2, '운송장')
    const template = makeTemplate({ sheetName: '운송장' })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings).toHaveLength(1)
    expect(result.trackings[0]!.rawOrderKey).toBe('ORD-001')
  })

  it('시트명 빈 문자열 → 첫 번째 시트 사용', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', '1234567890'],
    ], '데이터')
    const template = makeTemplate({ sheetName: '' })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings).toHaveLength(1)
  })

  it('존재하지 않는 시트명 → 에러', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [[]], 'Sheet1')
    const template = makeTemplate({ sheetName: '없는시트' })

    expect(() => parseTrackingWithTemplate(wb, template)).toThrow('시트 "없는시트"을(를) 찾을 수 없습니다')
  })

  it('헤더행/데이터시작행 커스텀 — 2행 헤더, 4행 데이터 시작', () => {
    const aoa = [
      ['안내문구'],
      CUSTOM_HEADERS,
      ['수정불가'],
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', '1234567890'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    const template = makeTemplate({ headerRow: 2, dataStartRow: 4 })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings).toHaveLength(1)
    expect(result.trackings[0]!.rawOrderKey).toBe('ORD-001')
    expect(result.trackings[0]!.rawRowNumber).toBe(4)
  })

  it('데이터 행이 없으면 빈 결과 반환', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [])
    const template = makeTemplate({ dataStartRow: 5 })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings).toHaveLength(0)
    expect(result.meta.totalRows).toBe(0)
  })

  it('productNameColumn/recipientColumn null → undefined', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', '1234567890'],
    ])
    const template = makeTemplate({
      productNameColumn: null,
      productNameHeader: null,
      recipientColumn: null,
      recipientHeader: null,
    })
    const result = parseTrackingWithTemplate(wb, template)

    expect(result.trackings[0]!.productName).toBeUndefined()
    expect(result.trackings[0]!.recipientName).toBeUndefined()
  })

  it('rawRowNumber가 1-based 엑셀 행 번호', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', '111'],
      [2, '배', '김철수', 'ORD-002', '한진택배', '222'],
    ])
    const result = parseTrackingWithTemplate(wb, makeTemplate())

    expect(result.trackings[0]!.rawRowNumber).toBe(2)
    expect(result.trackings[1]!.rawRowNumber).toBe(3)
  })

  it('meta 필드 올바르게 계산', () => {
    const wb = makeTemplateWorkbook(CUSTOM_HEADERS, [
      [1, '사과', '홍길동', 'ORD-001', 'CJ대한통운', '111'],
      [2, '배', '김철수', '', 'CJ대한통운', '222'],
      ['', '', '', '', '', ''],
    ])
    const result = parseTrackingWithTemplate(wb, makeTemplate())

    expect(result.meta.totalRows).toBe(3)
    expect(result.meta.validCount).toBe(1)
    expect(result.meta.invalidCount).toBe(0)
    expect(result.meta.skippedRows).toBe(2)
    expect(result.meta.detectedCourier).toBe('CJ대한통운')
  })
})
