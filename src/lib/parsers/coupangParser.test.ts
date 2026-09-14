import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'

import { parseCoupangOrders } from './coupangParser'

function makeCoupangWorkbook(
  dataRows: unknown[][],
  options: {
    sheetName?: string
    prefixRows?: unknown[][]
  } = {}
): XLSX.WorkBook {
  const header = [
    '번호',
    '묶음배송번호',
    '주문번호',
    '택배사',
    '운송장번호',
    '분리배송 Y/N',
    '분리배송 출고예정일',
    '주문시 출고예정일',
    '출고일(발송일)',
    '주문일',
    '등록상품명',
    '등록옵션명',
    '노출상품명(옵션명)',
    '노출상품ID',
    '옵션ID',
    '최초등록등록상품명/옵션명',
    '업체상품코드',
    '바코드',
    '결제액',
    '배송비구분',
    '배송비',
    '도서산간 추가배송비',
    '구매수(수량)',
    '옵션판매가(판매단가)',
    '구매자',
    '구매자전화번호',
    '수취인이름',
    '수취인전화번호',
    '우편번호',
    '수취인 주소',
    '배송메세지',
    '상품별 추가메시지',
    '주문자 추가메시지',
    '배송완료일',
    '구매확정일자',
    '개인통관번호(PCCC)',
    '통관용수취인전화번호',
    '기타',
    '결제위치',
    '배송유형',
  ]
  const aoa = [...(options.prefixRows ?? []), header, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName ?? 'Delivery')
  return wb
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}): unknown[] {
  const defaults: Record<string, unknown> = {
    번호: 1,
    묶음배송번호: '900001',
    주문번호: '31100187326921',
    택배사: '',
    운송장번호: '',
    '분리배송 Y/N': 'N',
    '분리배송 출고예정일': '',
    '주문시 출고예정일': '2026-05-01',
    '출고일(발송일)': '',
    주문일: '2026-04-29 09:01:45',
    등록상품명: '산지직송 성주 꿀참외 5kg',
    등록옵션명: '가정용 혼합과 5KG',
    '노출상품명(옵션명)': '',
    노출상품ID: '',
    옵션ID: 'OPTION-1',
    '최초등록등록상품명/옵션명': '',
    업체상품코드: '',
    바코드: '',
    결제액: 29900,
    배송비구분: '무료',
    배송비: 0,
    '도서산간 추가배송비': 0,
    '구매수(수량)': 1,
    '옵션판매가(판매단가)': 29900,
    구매자: '최용훈',
    구매자전화번호: '0504-3406-1054',
    수취인이름: '최용훈',
    수취인전화번호: '0504-3406-1054',
    우편번호: '04129',
    '수취인 주소': '서울특별시 마포구 아현동 777',
    배송메세지: '문 앞',
    '상품별 추가메시지': '',
    '주문자 추가메시지': '',
    배송완료일: '',
    구매확정일자: '',
    '개인통관번호(PCCC)': '',
    통관용수취인전화번호: '',
    기타: '',
    결제위치: '',
    배송유형: '',
  }

  const merged = { ...defaults, ...overrides }
  const keys = [
    '번호',
    '묶음배송번호',
    '주문번호',
    '택배사',
    '운송장번호',
    '분리배송 Y/N',
    '분리배송 출고예정일',
    '주문시 출고예정일',
    '출고일(발송일)',
    '주문일',
    '등록상품명',
    '등록옵션명',
    '노출상품명(옵션명)',
    '노출상품ID',
    '옵션ID',
    '최초등록등록상품명/옵션명',
    '업체상품코드',
    '바코드',
    '결제액',
    '배송비구분',
    '배송비',
    '도서산간 추가배송비',
    '구매수(수량)',
    '옵션판매가(판매단가)',
    '구매자',
    '구매자전화번호',
    '수취인이름',
    '수취인전화번호',
    '우편번호',
    '수취인 주소',
    '배송메세지',
    '상품별 추가메시지',
    '주문자 추가메시지',
    '배송완료일',
    '구매확정일자',
    '개인통관번호(PCCC)',
    '통관용수취인전화번호',
    '기타',
    '결제위치',
    '배송유형',
  ]
  return keys.map((k) => merged[k])
}

describe('parseCoupangOrders', () => {
  it('동일 옵션의 수량 2는 한 주문 라인의 수량으로 보존한다', () => {
    const result = parseCoupangOrders(makeCoupangWorkbook([makeRow({ '구매수(수량)': 2 })]))
    expect(result.orders).toHaveLength(1)
    expect(result.orders[0]!.quantity).toBe(2)
  })

  it('같은 상품이 다른 배송 묶음에 있으면 둘 다 보존한다', () => {
    const result = parseCoupangOrders(makeCoupangWorkbook([
      makeRow({ 묶음배송번호: 'BOX-1' }),
      makeRow({ 묶음배송번호: 'BOX-2' }),
    ]))
    expect(result.orders).toHaveLength(2)
    expect(result.duplicateRows).toHaveLength(0)
  })

  it('숫자 셀과 문자열 셀로 표현된 같은 ID는 중복으로 인식한다', () => {
    const result = parseCoupangOrders(makeCoupangWorkbook([
      makeRow({ 묶음배송번호: 700000000000001, 옵션ID: 95000000001 }),
      makeRow({ 묶음배송번호: ' 700000000000001 ', 옵션ID: '95000000001' }),
    ]))
    expect(result.orders).toHaveLength(1)
    expect(result.duplicateRows).toHaveLength(1)
  })

  it('파일 순서나 다른 상품의 존재 여부에 따라 상품 키가 바뀌지 않는다', () => {
    const apple = makeRow({ 옵션ID: 'APPLE' })
    const peach = makeRow({ 옵션ID: 'PEACH' })
    const full = parseCoupangOrders(makeCoupangWorkbook([apple, peach]))
    const reversed = parseCoupangOrders(makeCoupangWorkbook([peach, apple]))
    const partial = parseCoupangOrders(makeCoupangWorkbook([peach]))
    expect(full.orders[1]!.matchingKey).toBe(reversed.orders[0]!.matchingKey)
    expect(full.orders[1]!.matchingKey).toBe(partial.orders[0]!.matchingKey)
  })

  it('옵션ID가 없으면 상품을 추측하거나 중복 처리하지 않고 오류로 표시한다', () => {
    const result = parseCoupangOrders(makeCoupangWorkbook([makeRow({ 옵션ID: '' })]))
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows[0]!.reason).toBe('옵션ID 누락')
  })

  it('상품명과 옵션명이 같아도 옵션ID가 다르면 별개 상품이다', () => {
    const result = parseCoupangOrders(makeCoupangWorkbook([
      makeRow({ 옵션ID: 'OPTION-1' }),
      makeRow({ 옵션ID: 'OPTION-2' }),
    ]))
    expect(result.orders).toHaveLength(2)
    expect(result.duplicateRows).toHaveLength(0)
  })

  it('같은 묶음과 옵션은 상품명이 바뀌어도 중복으로 처리한다', () => {
    const result = parseCoupangOrders(makeCoupangWorkbook([
      makeRow(),
      makeRow({ 등록상품명: '변경된 상품명' }),
    ]))
    expect(result.orders).toHaveLength(1)
    expect(result.duplicateRows).toHaveLength(1)
  })

  it('같은 배송 묶음의 서로 다른 상품을 누락하지 않는다', () => {
    const result = parseCoupangOrders(makeCoupangWorkbook([
      makeRow({ 묶음배송번호: 'BOX-1', 주문번호: 'ORDER-1', 등록상품명: '사과', 옵션ID: 'OPTION-1' }),
      makeRow({ 묶음배송번호: 'BOX-1', 주문번호: 'ORDER-1', 등록상품명: '복숭아', 옵션ID: 'OPTION-2' }),
    ]))

    expect(result.orders).toHaveLength(2)
    expect(result.duplicateRows).toHaveLength(0)
    expect(new Set(result.orders.map((order) => order.matchingKey)).size).toBe(2)
    expect(result.orders.map((order) => order.rawRowNumber)).toEqual([2, 3])
  })

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
      makeRow({ 묶음배송번호: 'SHIP-001', 주문번호: 'A001' }),
      makeRow({ 묶음배송번호: 'SHIP-002', 주문번호: 'A002' }),
      makeRow({ 묶음배송번호: 'SHIP-003', 주문번호: 'A003' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(3)
    expect(result.meta.validRows).toBe(3)
  })

  it('정상: matchingKey와 orderItemNo는 묶음배송번호 + 옵션ID, orderNo는 주문번호', () => {
    const wb = makeCoupangWorkbook([
      makeRow({
        묶음배송번호: 'SHIP-123',
        주문번호: 'ORDER-123',
      }),
    ])
    const result = parseCoupangOrders(wb)
    const order = result.orders[0]!
    expect(order.matchingKey).toBe('SHIP-123:OPTION-1')
    expect(order.orderNo).toBe('ORDER-123')
    expect(order.orderItemNo).toBe('SHIP-123:OPTION-1')
  })

  it('정상: 주문번호가 같아도 묶음배송번호가 다른 상품은 각각 파싱', () => {
    const wb = makeCoupangWorkbook([
      makeRow({
        묶음배송번호: '712620105383994',
        주문번호: '1101813469054',
        등록상품명: '국내산 꿀 자두',
        등록옵션명: '2kg',
      }),
      makeRow({
        묶음배송번호: '712620109578258',
        주문번호: '1101813469054',
        등록상품명: '고당도 딱딱이 복숭아',
        등록옵션명: '4kg',
      }),
    ])
    const result = parseCoupangOrders(wb)

    expect(result.orders).toHaveLength(2)
    expect(result.duplicateRows).toHaveLength(0)
    expect(result.orders.map((order) => order.matchingKey)).toEqual([
      '712620105383994:OPTION-1',
      '712620109578258:OPTION-1',
    ])
  })

  it('에러: 묶음배송번호 누락 → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ 묶음배송번호: '' })])
    const result = parseCoupangOrders(wb)

    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe(
      '묶음배송번호, 주문번호 또는 상품명 누락'
    )
  })

  it('정상: 전화번호 원본 보존 + digits 추출', () => {
    const wb = makeCoupangWorkbook([
      makeRow({
        구매자전화번호: '0504-3406-1054',
        수취인전화번호: '0504-3406-1054',
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
      makeRow({ 묶음배송번호: 'SHIP-001', 주문번호: 'A001' }),
      makeRow({ 묶음배송번호: 'SHIP-002', 주문번호: 'A002' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders[0]!.rawRowNumber).toBe(2)
    expect(result.orders[1]!.rawRowNumber).toBe(3)
  })

  it('정상: 헤더가 1행 아래로 내려가도 파싱', () => {
    const wb = makeCoupangWorkbook([makeRow({ 주문번호: 'A001' })], {
      prefixRows: [['다운로드 안내']],
    })
    const result = parseCoupangOrders(wb)

    expect(result.orders).toHaveLength(1)
    expect(result.orders[0]!.orderNo).toBe('A001')
    expect(result.orders[0]!.rawRowNumber).toBe(3)
  })

  it('정상: Delivery가 아닌 시트명에서도 쿠팡 헤더를 찾아 파싱', () => {
    const wb = makeCoupangWorkbook([makeRow({ 주문번호: 'A001' })], {
      sheetName: '주문배송관리',
    })
    const result = parseCoupangOrders(wb)

    expect(result.orders).toHaveLength(1)
    expect(result.orders[0]!.orderNo).toBe('A001')
  })

  it('정상: 표준 필드는 trim, rawValues는 원본 보존', () => {
    const wb = makeCoupangWorkbook([
      makeRow({
        주문번호: '  A001  ',
        등록상품명: '  참외  ',
        수취인이름: '  홍길동  ',
        '수취인 주소': '  서울시  ',
        수취인전화번호: '010-1234-5678',
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
      makeRow({
        묶음배송번호: '',
        주문번호: '',
        등록상품명: '',
      }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.meta.skippedRows).toBe(1)
  })

  it('에러: orderNo만 비어있는 행 → invalidRow', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ 주문번호: '', 등록상품명: '참외' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe(
      '묶음배송번호, 주문번호 또는 상품명 누락'
    )
  })

  it('에러: productName만 비어있는 행 → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ 등록상품명: '' })])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe(
      '묶음배송번호, 주문번호 또는 상품명 누락'
    )
  })

  it('에러: quantity가 NaN → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ '구매수(수량)': 'abc' })])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수량 파싱 실패')
  })

  it('에러: quantity가 0 이하 → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ '구매수(수량)': 0 })])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수량이 0 이하')
  })

  it('에러: recipientName 빈 문자열 → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ 수취인이름: '' })])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수취인 이름 누락')
  })

  it('에러: address 빈 문자열 → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ '수취인 주소': '' })])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('주소 누락')
  })

  it('에러: recipientPhone 빈 문자열 → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ 수취인전화번호: '' })])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수취인 전화번호 누락')
  })

  it('에러: recipientPhoneDigits 길이 8 미만 → invalidRow', () => {
    const wb = makeCoupangWorkbook([makeRow({ 수취인전화번호: '123' })])
    const result = parseCoupangOrders(wb)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]!.reason).toBe('수취인 전화번호 형식 오류')
  })

  it('중복: 같은 matchingKey 2건 → 첫 번째만 orders, 두 번째는 duplicateRows', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ 묶음배송번호: 'DUP-SHIP' }),
      makeRow({ 묶음배송번호: 'DUP-SHIP' }),
    ])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(1)
    expect(result.duplicateRows).toHaveLength(1)
    expect(result.duplicateRows[0]!.matchingKey).toBe('DUP-SHIP:OPTION-1')
    expect(result.duplicateRows[0]!.firstRowNumber).toBe(2)
    expect(result.duplicateRows[0]!.rowNumber).toBe(3)
  })

  it('에러: 쿠팡 헤더 행을 찾을 수 없으면 throw', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['dummy']])
    XLSX.utils.book_append_sheet(wb, ws, 'Other')
    expect(() => parseCoupangOrders(wb)).toThrow(
      '쿠팡 헤더 행을 찾을 수 없습니다'
    )
  })

  it('정상: 빈 파일 (데이터 행 0건) → orders 빈 배열', () => {
    const wb = makeCoupangWorkbook([])
    const result = parseCoupangOrders(wb)
    expect(result.orders).toHaveLength(0)
    expect(result.meta.totalRows).toBe(0)
  })

  it('정상: meta에 totalRows/skippedRows/validRows/invalidRows/duplicateRows 정확', () => {
    const wb = makeCoupangWorkbook([
      makeRow({ 묶음배송번호: 'SHIP-001', 주문번호: 'A001' }),
      makeRow({ 묶음배송번호: 'SHIP-002', 주문번호: 'A002' }),
      makeRow({ 묶음배송번호: 'SHIP-002', 주문번호: 'A002' }),
      makeRow({
        묶음배송번호: '',
        주문번호: '',
        등록상품명: '',
      }),
      makeRow({ 묶음배송번호: 'SHIP-003', '구매수(수량)': 'bad' }),
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
