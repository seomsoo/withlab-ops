import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PostgrestError } from '@supabase/supabase-js'
import { appendOrdersToImport } from './orders'
import { supabase } from './client'
import type { StandardOrder } from '@/types'

vi.mock('./client', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }))

const sessionId = '00000000-0000-4000-8000-000000000001'
const importId = '00000000-0000-4000-8000-000000000010'
function input() {
  const order: StandardOrder = {
    id: '00000000-0000-4000-8000-000000000100',
    platform: 'coupang',
    orderNo: 'ORDER-1',
    matchingKey: 'BOX-1:PEACH',
    orderItemNo: 'BOX-1:PEACH',
    orderDate: '',
    productName: '복숭아',
    optionName: '4kg',
    displayProductName: '복숭아 4kg',
    quantity: 2,
    buyerName: '',
    buyerPhone: '',
    buyerPhoneDigits: '',
    recipientName: '테스트',
    recipientPhone: '01012345678',
    recipientPhoneDigits: '01012345678',
    zipCode: '',
    address: '테스트 주소',
    deliveryMessage: '',
    raw: { 묶음배송번호: 'BOX-1', 옵션ID: 'PEACH' },
    rawValues: ['복숭아', 2],
    rawRowNumber: 3,
  }
  return {
    workSessionId: sessionId,
    orderImportId: importId,
    platform: 'coupang' as const,
    fileName: '추가.xlsx',
    orders: [order],
    invalidRows: [],
    duplicateRows: [],
  }
}

describe('appendOrdersToImport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('주문 원본을 보존하여 단일 RPC로 저장하고 서버 집계 결과를 반환한다', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { inserted_count: 1, duplicate_count: 2, total_count: 21 },
      error: null,
      success: true,
      count: null, status: 200, statusText: 'OK',
    })
    expect(await appendOrdersToImport(input())).toEqual({
      insertedCount: 1,
      duplicateCount: 2,
      totalCount: 21,
    })
    expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith(
      'append_orders_to_import',
      {
        p_work_session_id: sessionId,
        p_order_import_id: importId,
        p_platform: 'coupang',
        p_file_name: '추가.xlsx',
        p_orders: [
          expect.objectContaining({
            matching_key: 'BOX-1:PEACH',
            order_date: null,
            quantity: 2,
            raw: { 묶음배송번호: 'BOX-1', 옵션ID: 'PEACH' },
            raw_values: ['복숭아', 2],
            raw_row_number: 3,
          }),
        ],
        p_invalid_rows: [],
        p_duplicate_rows: [],
      }
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('RPC 오류나 미설치 상태에서 개별 INSERT/DELETE로 우회하지 않는다', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new PostgrestError({ message: 'PGRST202 missing function', code: 'PGRST202', details: '', hint: '' }),
      success: false,
      count: null, status: 404, statusText: 'Not Found',
    })
    await expect(appendOrdersToImport(input())).rejects.toThrow(
      '주문 저장에 실패'
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('잘못된 주문은 RPC 호출 전에 거절한다', async () => {
    const request = input()
    request.orders[0]!.quantity = 0
    await expect(appendOrdersToImport(request)).rejects.toThrow()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('다른 플랫폼 주문이 섞이면 RPC 호출 전에 거절한다', async () => {
    const request = input()
    request.orders[0]!.platform = 'toss'
    await expect(appendOrdersToImport(request)).rejects.toThrow(
      '플랫폼이 일치하지 않습니다'
    )
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
