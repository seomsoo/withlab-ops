import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'

import { parseCoupangOrders } from './coupangParser'

function makeCoupangWorkbook(dataRows: unknown[][]): XLSX.WorkBook {
  const header = [
    '번호', '묶음배송번호', '주문번호', '택배사', '운송장번호',
    '분리배송 Y/N', '분리배송 출고예정일', '주문시 출고예정일', '출고일(발송일)',
    '주문일', '등록상품명', '등록옵션명', '노출상품명(옵션명)', '노출상품ID',
    '옵션ID', '최초등록등록상품명/옵션명', '업체상품코드', '바코드',
    '결제액', '배송비구분', '배송비', '도서산간 추가배송비',
    '구매수(수량)', '옵션판매가(판매단가)', '구매자', '구매자전화번호',
    '수취인이름', '수취인전화번호', '우편번호', '수취인 주소',
    '배송메세지', '상품별 추가메시지', '주문자 추가메시지', '배송완료일',
    '구매확정일자', '개인통관번호(PCCC)', '통관용수취인전화번호', '기타',
    '결제위치', '배송유형',
  ]
  const aoa = [header, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Delivery')
  return wb
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}): unknown[] {
  const defaults: Record<string, unknown> = {
    '번호': 1,
    '묶음배송번호': '900001',
    '주문번호': '31100187326921',
    '택배사': '',
    '운송장번호': '',
    '분리배송 Y/N': 'N',
    '분리배송 출고예정일': '',
    '주문시 출고예정일': '2026-05-01',
    '출고일(발송일)': '',
    '주문일': '2026-04-29 09:01:45',
    '등록상품명': '산지직송 성주 꿀참외 5kg',
    '등록옵션명': '가정용 혼합과 5KG',
    '노출상품명(옵션명)': '',
    '노출상품ID': '',
    '옵션ID': '',
    '최초등록등록상품명/옵션명': '',
    '업체상품코드': '',
    '바코드': '',
    '결제액': 29900,
    '배송비구분': '무료',
    '배송비': 0,
    '도서산간 추가배송비': 0,
    '구매수(수량)': 1,
    '옵션판매가(판매단가)': 29900,
    '구매자': '최용훈',
    '구매자전화번호': '0504-3406-1054',
    '수취인이름': '최용훈',
    '수취인전화번호': '0504-3406-1054',
    '우편번호': '04129',
    '수취인 주소': '서울특별시 마포구 아현동 777',
    '배송메세지': '문 앞',
    '상품별 추가메시지': '',
    '주문자 추가메시지': '',
    '배송완료일': '',
    '구매확정일자': '',
    '개인통관번호(PCCC)': '',
    '통관용수취인전화번호': '',
    '기타': '',
    '결제위치': '',
    '배송유형': '',
  }

  const merged = { ...defaults, ...overrides }
  const keys = [
    '번호', '묶음배송번호', '주문번호', '택배사', '운송장번호',
    '분리배송 Y/N', '분리배송 출고예정일', '주문시 출고예정일', '출고일(발송일)',
    '주문일', '등록상품명', '등록옵션명', '노출상품명(옵션명)', '노출상품ID',
    '옵션ID', '최초등록등록상품명/옵션명', '업체상품코드', '바코드',
    '결제액', '배송비구분', '배송비', '도서산간 추가배송비',
    '구매수(수량)', '옵션판매가(판매단가)', '구매자', '구매자전화번호',
    '수취인이름', '수취인전화번호', '우편번호', '수취인 주소',
    '배송메세지', '상품별 추가메시지', '주문자 추가메시지', '배송완료일',
    '구매확정일자', '개인통관번호(PCCC)', '통관용수취인전화번호', '기타',
    '결제위치', '배송유형',
  ]
  return keys.map((k) => merged[k])
}

describe('parseCoupangOrders', () => {
  it('정상: 기본 주문 1건 파싱', () => {
    const wb = makeCoupangWorkbook([makeRow()])
    const result = parseCoupangOrders(wb)

    expect(result.orders).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.duplicateRows).toHaveLength(0)

    const order = result.orders[0]!
    expect(order.platform).toBe('coupang')
    expect(order.orderNo).toBe('31100187326921')
    expect(order.productName).toBe('산지직송 성주 꿀참외 5kg')
    expect(order.quantity).toBe(1)
    expect(order.recipientName).toBe('최용훈')
    expect(order.address).toBe('서울특별시 마포구 아현동 777')
  })

  it('정상: 여러 건 파싱', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '주문번호': 'A001' }),
      makeRow({ '주문번호': 'A002' }),
      makeRow({ '주문번호': 'A003' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(3)
    expect(result.meta.validRows).toBe(3)
  })

  it('정상: matchingKey === orderNo === orderItemNo', () => {
    const wb = makeCoupangWorkbook([makeRow({ '주문번호': 'TEST123' })])
    const result = parseCoupangOrders(wb)
    const order = result.orders[0]!
    expect(order.matchingKey).toBe('TEST123')
    expect(order.orderNo).toBe('TEST123')
    expect(order.orderItemNo).toBe('TEST123')
  })

  it('정상: 전화번호 원본 보존 + digits 추출', () => {
    const wb = makeCoupangWorkbook([
      makeRow({
        '구매자전화번호': '0504-3406-1054',
        '수취인전화번호': '0504-3406-1054',
      }),
    ])
    const result = parseCoupangOrders(wb)
    const order = result.orders[0]!
    expect(order.buyerPhone).toBe('0504-3406-1054')
    expect(order.buyerPhoneDigits).toBe('050434061054')
    expect(order.recipientPhone).toBe('0504-3406-1054')
    expect(order.recipientPhoneDigits).toBe('050434061054')
  })

  it('정상: rawValues에 40개 셀 고정 길이로 저장 (trailing empty padding)', () => {
    const wb = makeCoupangWorkbook([makeRow()])
    const result = parseCoupangOrders(wb)
    expect(result.orders[0]!.rawValues).toHaveLength(40)
  })

  it('정상: rawRowNumber에 엑셀 행 번호 저장 (2부터)', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '주문번호': 'A001' }),
      makeRow({ '주문번호': 'A002' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders[0]!.rawRowNumber).toBe(2)
    expect(result.orders[1]!.rawRowNumber).toBe(3)
  })

  it('정상: 표준 필드는 trim, rawValues는 원본 보존', () => {
    const wb = makeCoupangWorkbook([
      makeRow({
        '주문번호': '  A001  ',
        '등록상품명': '  참외  ',
        '수취인이름': '  홍길동  ',
        '수취인 주소': '  서울시  ',
        '수취인전화번호': '010-1234-5678',
      }),
    ])
    const result = parseCoupangOrders(wb)
    const order = result.orders[0]!
    expect(order.orderNo).toBe('A001')
    expect(order.productName).toBe('참외')
    expect(order.recipientName).toBe('홍길동')
    expect(order.address).toBe('서울시')
  })

  it('스킵: orderNo + productName 모두 비어있는 행', () => {
    const wb = makeCoupangWorkbook([
      makeRow(),
      makeRow({ '주문번호': '', '등록상품명': '' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.meta.skippedRows).toBe(1)
  })

  it('에러: orderNo만 비어있는 행 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '주문번호': '', '등록상품명': '참외' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('주문번호 또는 상품명 누락')
  })

  it('에러: productName만 비어있는 행 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '등록상품명': '' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('주문번호 또는 상품명 누락')
  })

  it('에러: quantity가 NaN → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '구매수(수량)': 'abc' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수량 파싱 실패')
  })

  it('에러: quantity가 0 이하 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '구매수(수량)': 0 }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수량이 0 이하')
  })

  it('에러: recipientName 빈 문자열 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '수취인이름': '' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수취인 이름 누락')
  })

  it('에러: address 빈 문자열 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '수취인 주소': '' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('주소 누락')
  })

  it('에러: recipientPhone 빈 문자열 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '수취인전화번호': '' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수취인 전화번호 누락')
  })

  it('에러: recipientPhoneDigits 길이 8 미만 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '수취인전화번호': '123' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수취인 전화번호 형식 오류')
  })

  it('중복: 같은 matchingKey 2건 → 첫 번째만 orders, 두 번째는 duplicateRows', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '주문번호': 'DUP001' }),
      makeRow({ '주문번호': 'DUP001' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(1)
    expect(result.duplicateRows).toHaveLength(1)
    expect(result.duplicateRows[0]!.matchingKey).toBe('DUP001')
    expect(result.duplicateRows[0]!.firstRowNumber).toBe(2)
    expect(result.duplicateRows[0]!.rowNumber).toBe(3)
  })

  it('에러: Delivery 시트 없으면 throw', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['dummy']])
    XLSX.utils.book_append_sheet(wb, ws, 'Other')
    expect(() => parseCoupangOrders(wb)).toThrow('쿠팡 주문 시트(Delivery)를 찾을 수 없습니다')
  })

  it('정상: 빈 파일 (데이터 행 0건) → orders 빈 배열', () => {
    const wb = makeCoupangWorkbook([])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.meta.totalRows).toBe(0)
  })

  it('정상: meta에 totalRows/skippedRows/validRows/invalidRows/duplicateRows 정확', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ '주문번호': 'A001' }),
      makeRow({ '주문번호': 'A002' }),
      makeRow({ '주문번호': 'A002' }),
      makeRow({ '주문번호': '', '등록상품명': '' }),
      makeRow({ '구매수(수량)': 'bad' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.meta.validRows).toBe(2)
    expect(result.meta.invalidRows).toBe(1)
    expect(result.meta.duplicateRows).toBe(1)
    expect(result.meta.skippedRows).toBe(1)
    expect(result.meta.totalRows).toBe(4)
    expect(result.meta.platform).toBe('coupang')
  })
})
