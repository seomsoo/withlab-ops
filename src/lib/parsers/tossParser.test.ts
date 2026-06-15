import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'

import { parseTossOrders } from './tossParser'

function makeTossWorkbook(dataRows: unknown[][]): XLSX.WorkBook {
  const groupHeader = ['일시 정보', '', '', '주문 정보', '', '', '', '', '상품 정보']
  const header = [
    '주문일시', '주문번호', '주문상품번호', '주문상태', '발송기한',
    '택배사', '송장번호', '상품ID', '상품명', '상품 관리 코드',
    '옵션 ID', '옵션명', '주문건수', '옵션 관리 코드', '받은 혜택',
    '구매자명', '구매자 연락처', '수령인명', '수령인 연락처', '배송지',
    '우편번호', '주문요청사항', '구매확정일', '희망배송일', '발송처리일시',
    '배송완료일시', '취소일시', '주문금액', '배송비 묶음 번호', '배송비 합계',
  ]
  const editableRow = [
    '수정 불가', '수정 불가', '수정 불가', '수정 불가', '수정 불가',
    '수정 가능', '수정 가능', '수정 불가', '수정 불가', '수정 불가',
    '수정 불가', '수정 불가', '수정 불가', '수정 불가', '수정 불가',
    '수정 불가', '수정 불가', '수정 불가', '수정 불가', '수정 불가',
    '수정 불가', '수정 불가', '수정 불가', '수정 불가', '수정 불가',
    '수정 불가', '수정 불가', '수정 불가', '수정 불가', '수정 불가',
  ]
  const aoa = [groupHeader, header, editableRow, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '주문내역')
  return wb
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}): unknown[] {
  const defaults: Record<string, unknown> = {
    '주문일시': '2026-05-06 18:20:21',
    '주문번호': '219778655',
    '주문상품번호': '242763861',
    '주문상태': '결제완료',
    '발송기한': '2026-05-09',
    '택배사': '',
    '송장번호': '',
    '상품ID': 'P001',
    '상품명': '성주 꿀참외, 가정용 참외',
    '상품 관리 코드': '',
    '옵션 ID': 'O001',
    '옵션명': '1박스, 5kg',
    '주문건수': 1,
    '옵션 관리 코드': '',
    '받은 혜택': '',
    '구매자명': '이한희',
    '구매자 연락처': '050877183460',
    '수령인명': '이한희',
    '수령인 연락처': '050877183460',
    '배송지': '서울특별시 구로구 고척로21가길 40',
    '우편번호': '08251',
    '주문요청사항': '부재 시 문 앞',
    '구매확정일': '',
    '희망배송일': '',
    '발송처리일시': '',
    '배송완료일시': '',
    '취소일시': '',
    '주문금액': 25000,
    '배송비 묶음 번호': '',
    '배송비 합계': 0,
  }

  const merged = { ...defaults, ...overrides }
  const keys = [
    '주문일시', '주문번호', '주문상품번호', '주문상태', '발송기한',
    '택배사', '송장번호', '상품ID', '상품명', '상품 관리 코드',
    '옵션 ID', '옵션명', '주문건수', '옵션 관리 코드', '받은 혜택',
    '구매자명', '구매자 연락처', '수령인명', '수령인 연락처', '배송지',
    '우편번호', '주문요청사항', '구매확정일', '희망배송일', '발송처리일시',
    '배송완료일시', '취소일시', '주문금액', '배송비 묶음 번호', '배송비 합계',
  ]
  return keys.map((k) => merged[k])
}

describe('parseTossOrders', () => {
  it('정상: 기본 주문 1건 파싱', () => {
    const wb = makeTossWorkbook([makeRow()])
    const result = parseTossOrders(wb)

    expect(result.orders).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.duplicateRows).toHaveLength(0)

    const order = result.orders[0]!
    expect(order.platform).toBe('toss')
    expect(order.orderNo).toBe('219778655')
    expect(order.productName).toBe('성주 꿀참외, 가정용 참외')
    expect(order.recipientName).toBe('이한희')
    expect(order.quantity).toBe(1)
  })

  it('정상: 헤더가 1행인 새 토스 양식 파싱', () => {
    const header = [
      '주문번호', '주문상품번호', '주문상태', '발송기한', '배송속성',
      '받은 혜택', '물류사', '택배사', '송장번호', '상품명',
      '옵션명', '주문건수', '상품ID', '상품 관리 코드', '옵션 ID',
      '옵션 관리 코드', '구매자명', '구매자 연락처', '수령인명', '수령인 연락처',
      '우편번호', '배송지', '주문요청사항', '주문일시', '구매확정일',
      '희망배송일', '발송처리일시', '배송완료일시', '주문금액', '배송비 묶음 번호',
      '배송비 합계',
    ]
    const editableRow = header.map(() => '수정 불가')
    const values: Record<string, unknown> = {
      '주문번호': '233408525',
      '주문상품번호': '257915173',
      '주문상태': '결제완료',
      '상품명': '성주 꿀참외, 가정용 참외',
      '옵션명': '1박스, 10kg',
      '주문건수': '1',
      '구매자명': '박경자',
      '구매자 연락처': '050876719447',
      '수령인명': '박경자',
      '수령인 연락처': '050876719447',
      '우편번호': '37605',
      '배송지': '경상북도 포항시 북구 새천년대로 1276',
      '주문요청사항': '집 앞에 놔주세요',
      '주문일시': 46188.34679398148,
    }
    const dataRow = header.map((h) => values[h] ?? '')
    const ws = XLSX.utils.aoa_to_sheet([header, editableRow, dataRow])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '주문내역')

    const result = parseTossOrders(wb)

    expect(result.orders).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.orders[0]!.rawRowNumber).toBe(3)
    expect(result.orders[0]!.matchingKey).toBe('257915173')
    expect(result.orders[0]!.displayProductName).toBe('성주 꿀참외, 가정용 참외 1박스, 10kg')
  })

  it('정상: matchingKey는 주문상품번호 (orderItemNo)', () => {
    const wb = makeTossWorkbook([makeRow()])
    const result = parseTossOrders(wb)
    const order = result.orders[0]!
    expect(order.matchingKey).toBe('242763861')
    expect(order.orderItemNo).toBe('242763861')
  })

  it('정상: orderNo와 orderItemNo가 다른 값', () => {
    const wb = makeTossWorkbook([
      makeRow({ '주문번호': 'ORD-100', '주문상품번호': 'ITEM-200' }),
    ])
    const result = parseTossOrders(wb)
    const order = result.orders[0]!
    expect(order.orderNo).toBe('ORD-100')
    expect(order.orderItemNo).toBe('ITEM-200')
    expect(order.matchingKey).toBe('ITEM-200')
  })

  it('정상: 1~3행 스킵, 4행부터 데이터 파싱', () => {
    const wb = makeTossWorkbook([makeRow()])
    const result = parseTossOrders(wb)
    expect(result.orders[0]!.rawRowNumber).toBe(4)
  })

  it('정상: 하이픈 없는 전화번호 처리', () => {
    const wb = makeTossWorkbook([
      makeRow({ '수령인 연락처': '050877183460' }),
    ])
    const result = parseTossOrders(wb)
    const order = result.orders[0]!
    expect(order.recipientPhone).toBe('050877183460')
    expect(order.recipientPhoneDigits).toBe('050877183460')
  })

  it('정상: rawValues에 30개 셀 고정 길이로 저장', () => {
    const wb = makeTossWorkbook([makeRow()])
    const result = parseTossOrders(wb)
    expect(result.orders[0]!.rawValues).toHaveLength(30)
  })

  it('정상: rawRowNumber는 4부터 시작', () => {
    const wb = makeTossWorkbook([
      makeRow({ '주문상품번호': 'A001' }),
      makeRow({ '주문상품번호': 'A002' }),
    ])
    const result = parseTossOrders(wb)
    expect(result.orders[0]!.rawRowNumber).toBe(4)
    expect(result.orders[1]!.rawRowNumber).toBe(5)
  })

  it('정상: 주문번호 같고 주문상품번호 다른 2건은 중복 아님 (별개 주문 라인)', () => {
    const wb = makeTossWorkbook([
      makeRow({ '주문번호': 'ORD-100', '주문상품번호': 'ITEM-1' }),
      makeRow({ '주문번호': 'ORD-100', '주문상품번호': 'ITEM-2' }),
    ])
    const result = parseTossOrders(wb)
    expect(result.orders).toHaveLength(2)
    expect(result.duplicateRows).toHaveLength(0)
  })

  it('중복: 주문상품번호 같은 2건 → 첫 번째만 orders', () => {
    const wb = makeTossWorkbook([
      makeRow({ '주문상품번호': 'DUP-ITEM' }),
      makeRow({ '주문상품번호': 'DUP-ITEM' }),
    ])
    const result = parseTossOrders(wb)
    expect(result.orders).toHaveLength(1)
    expect(result.duplicateRows).toHaveLength(1)
    expect(result.duplicateRows[0]!.matchingKey).toBe('DUP-ITEM')
  })

  it('스킵: matchingKey + productName 모두 빈 행', () => {
    const wb = makeTossWorkbook([
      makeRow(),
      makeRow({ '주문상품번호': '', '상품명': '' }),
    ])
    const result = parseTossOrders(wb)
    expect(result.orders).toHaveLength(1)
    expect(result.meta.skippedRows).toBe(1)
  })

  it('에러: quantity가 NaN → invalidRow', () => {
    const wb = makeTossWorkbook([
      makeRow({ '주문건수': 'abc' }),
    ])
    const result = parseTossOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수량 파싱 실패')
  })

  it('에러: 주문내역 시트 없으면 throw', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['dummy']])
    XLSX.utils.book_append_sheet(wb, ws, 'Other')
    expect(() => parseTossOrders(wb)).toThrow('토스 주문 시트(주문내역)를 찾을 수 없습니다')
  })
})
