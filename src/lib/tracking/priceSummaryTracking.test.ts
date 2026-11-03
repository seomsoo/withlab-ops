import { describe, it, expect } from 'vitest'

import {
  buildExportItems,
  buildPastePreview,
  sortByPriceSummaryOrder,
  toPasteHtml,
  toPasteText,
} from './priceSummaryTracking'

import type { AllocationWithOrder } from '@/lib/supabase/allocations'
import type { PriceRow, PriceSummary } from '@/lib/priceSummary/model'
import type {
  CourierMapping,
  Platform,
  Tracking,
  TrackingExportItem,
} from '@/types'

function makeRow(id: string): PriceRow {
  return {
    id,
    cells: ['', '', '', `주문-${id}`, '홍길동', '감귤', '5kg', 1],
    supplier: '뺵스팜',
    unitPrice: 6300,
    issues: [],
  }
}

function makeSummary(ids: string[], id = 'import-1'): PriceSummary {
  return {
    id,
    name: '쿠팡.xlsx',
    label: '쿠팡1',
    excluded: 0,
    rows: ids.map(makeRow),
  }
}

function makeItem(
  orderId: string,
  overrides: Partial<TrackingExportItem> = {}
): TrackingExportItem {
  return {
    trackingId: `t-${orderId}`,
    allocationId: `a-${orderId}`,
    orderId,
    orderNo: orderId,
    orderItemNo: orderId,
    matchingKey: orderId,
    trackingCompany: 'CJ대한통운',
    trackingNumber: `1234-${orderId}`,
    courierMapped: true,
    originalRow: {},
    originalRowValues: [],
    originalRowNumber: 2,
    ...overrides,
  }
}

function makeTracking(
  allocationId: string,
  overrides: Partial<Tracking> = {}
): Tracking {
  // as 사용 사유: 선택 로직이 읽는 필드만 필요한 테스트 데이터
  return {
    id: `t-${allocationId}`,
    allocationId,
    status: 'matched',
    trackingCompany: '대한통운',
    trackingNumber: '123456789012',
    sourceSupplierId: 'supplier-1',
    raw: {},
    ...overrides,
  } as Tracking
}

function makeAllocation(
  id: string,
  platform: Platform,
  label = '쿠팡1'
): AllocationWithOrder {
  // as 사용 사유: 선택 로직이 읽는 필드만 필요한 테스트 데이터
  return {
    id,
    orderId: `order-${id}`,
    supplierName: '뺵스팜',
    order: {
      platform,
      orderNo: id,
      orderItemNo: id,
      matchingKey: id,
      rawValues: [],
      rawRowNumber: 2,
      orderImportLabel: label,
    },
  } as unknown as AllocationWithOrder
}

// as 사용 사유: 변환에 쓰는 이름 필드만 필요한 테스트 데이터
const MAPPINGS = [
  { sourceName: '대한통운', coupangName: 'CJ대한통운', tossName: 'CJ택배' },
] as CourierMapping[]

describe('buildExportItems', () => {
  it('택배사를 플랫폼 표기로 변환한다', () => {
    const allocations = [
      makeAllocation('a1', 'coupang'),
      makeAllocation('a2', 'toss'),
    ]
    const trackings = [makeTracking('a1'), makeTracking('a2')]

    const coupang = buildExportItems(
      trackings,
      allocations,
      MAPPINGS,
      'coupang'
    )
    const toss = buildExportItems(trackings, allocations, MAPPINGS, 'toss')

    expect(coupang.items.map((i) => i.trackingCompany)).toEqual(['CJ대한통운'])
    expect(toss.items.map((i) => i.trackingCompany)).toEqual(['CJ택배'])
  })

  it('매핑이 없는 택배사는 원본을 쓰고 경고를 남긴다', () => {
    const result = buildExportItems(
      [makeTracking('a1', { trackingCompany: '롯데택배' })],
      [makeAllocation('a1', 'coupang')],
      MAPPINGS,
      'coupang'
    )
    expect(result.items[0]?.trackingCompany).toBe('롯데택배')
    expect(result.items[0]?.courierMapped).toBe(false)
    expect(result.warnings).toHaveLength(1)
  })

  it('매칭되지 않았거나 운송장번호가 없는 건과 다른 라벨은 제외한다', () => {
    const allocations = [
      makeAllocation('a1', 'coupang'),
      makeAllocation('a2', 'coupang'),
      makeAllocation('a3', 'coupang'),
      makeAllocation('a4', 'coupang', '쿠팡2'),
    ]
    const trackings = [
      makeTracking('a1'),
      makeTracking('a2', { status: 'unmatched' }),
      makeTracking('a3', { trackingNumber: '' }),
      makeTracking('a4'),
    ]
    const { items } = buildExportItems(
      trackings,
      allocations,
      MAPPINGS,
      'coupang',
      '쿠팡1'
    )
    expect(items.map((i) => i.allocationId)).toEqual(['a1'])
  })
})

describe('sortByPriceSummaryOrder', () => {
  it('가격정리 순서로 정렬하고 없는 주문은 뒤로 보낸다', () => {
    const items = [makeItem('x'), makeItem('c'), makeItem('a'), makeItem('b')]
    const sorted = sortByPriceSummaryOrder(items, [
      makeSummary(['a', 'b'], 'i1'),
      makeSummary(['c'], 'i2'),
    ])
    expect(sorted.map((i) => i.orderId)).toEqual(['a', 'b', 'c', 'x'])
  })

  it('추가 주문이 섞인 순서도 가격정리와 같다', () => {
    const summary = makeSummary(['original-2', 'appended-2', 'original-3'])
    const items = [
      makeItem('original-3'),
      makeItem('original-2'),
      makeItem('appended-2'),
    ]
    expect(
      sortByPriceSummaryOrder(items, [summary]).map((i) => i.orderId)
    ).toEqual(summary.rows.map((r) => r.id))
  })

  it('입력 배열을 바꾸지 않는다', () => {
    const items = [makeItem('b'), makeItem('a')]
    sortByPriceSummaryOrder(items, [makeSummary(['a', 'b'])])
    expect(items.map((i) => i.orderId)).toEqual(['b', 'a'])
  })
})

describe('buildPastePreview', () => {
  it('가격정리 행 수를 유지하고 미매칭 주문은 빈 줄로 둔다', () => {
    const preview = buildPastePreview(makeSummary(['a', 'b', 'c']), [
      makeItem('c'),
      makeItem('a'),
    ])
    expect(preview.rows.map((r) => r.trackingNumber)).toEqual([
      '1234-a',
      '',
      '1234-c',
    ])
    expect(preview.rows.map((r) => r.rowNumber)).toEqual([3, 4, 5])
    expect(preview.filledCount).toBe(2)
    expect(preview.emptyCount).toBe(1)
  })

  it('주문번호와 수령자를 가격정리 셀에서 가져온다', () => {
    const [row] = buildPastePreview(makeSummary(['a']), []).rows
    expect(row).toMatchObject({ orderNo: '주문-a', recipient: '홍길동' })
  })
})

describe('붙여넣기 형식', () => {
  const rows = buildPastePreview(makeSummary(['a', 'b', 'c']), [
    makeItem('a'),
    makeItem('c'),
  ]).rows

  it('택배사와 운송장번호를 탭으로 나누고 빈 줄을 유지한다', () => {
    expect(toPasteText(rows)).toBe('CJ대한통운\t1234-a\n\t\nCJ대한통운\t1234-c')
  })

  it('값 안의 탭과 줄바꿈이 칸을 밀지 않는다', () => {
    const [row] = buildPastePreview(makeSummary(['a']), [
      makeItem('a', {
        trackingCompany: 'CJ\n대한통운',
        trackingNumber: ' 12\t34 ',
      }),
    ]).rows
    expect(toPasteText(row ? [row] : [])).toBe('CJ 대한통운\t12 34')
  })

  it.each(['=HYPERLINK("http://x")', '+1+1', '-1+1', '@SUM(A1)'])(
    '일반 텍스트에서 %s는 수식으로 실행되지 않게 한다',
    (trackingNumber) => {
      const [row] = buildPastePreview(makeSummary(['a']), [
        makeItem('a', { trackingNumber }),
      ]).rows
      expect(toPasteText(row ? [row] : [])).toBe(
        `CJ대한통운\t'${trackingNumber}`
      )
    }
  )

  it('HTML은 텍스트 서식으로 내보내고 특수문자를 이스케이프한다', () => {
    const [row] = buildPastePreview(makeSummary(['a']), [
      makeItem('a', { trackingCompany: 'A&B<택배>' }),
    ]).rows
    const html = toPasteHtml(row ? [row] : [])
    expect(html).toContain("mso-number-format:'\\@'")
    expect(html).toContain('border:.5pt solid windowtext')
    expect(html).toContain('A&amp;B&lt;택배&gt;')
  })
})
