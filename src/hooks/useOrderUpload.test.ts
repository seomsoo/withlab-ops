import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderUpload, type UploadPlan } from './useOrderUpload'
import {
  createOrderImport,
  appendOrdersToImport,
  deleteOrderImport,
  getOrderImports,
  getOrders,
  saveOrders,
} from '@/lib/supabase/orders'
import type { StandardOrder, OrderImport } from '@/types'

// 업로드 처리의 DB 호출 순서와 입력을 검증한다. 화면 상태 변경은 이 테스트의 범위 밖이다.
vi.mock('react', () => ({
  useState: (value: unknown) => [value, vi.fn()],
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/supabase/orders', () => ({
  createOrderImport: vi.fn(),
  appendOrdersToImport: vi.fn(),
  saveOrders: vi.fn(),
  getOrders: vi.fn(),
  getOrderImports: vi.fn(),
  deleteOrderImport: vi.fn(),
  updateOrderImportLabel: vi.fn(),
}))

function makeOrder(optionId: string, legacy = false): StandardOrder {
  return {
    id: optionId,
    platform: 'coupang',
    orderNo: 'ORDER-1',
    matchingKey: legacy ? 'BOX-1' : `BOX-1:${optionId}`,
    orderItemNo: legacy ? 'BOX-1' : `BOX-1:${optionId}`,
    orderDate: '',
    productName: optionId,
    optionName: '',
    displayProductName: optionId,
    quantity: 1,
    buyerName: '',
    buyerPhone: '',
    buyerPhoneDigits: '',
    recipientName: '테스트',
    recipientPhone: '01012345678',
    recipientPhoneDigits: '01012345678',
    zipCode: '',
    address: '테스트 주소',
    deliveryMessage: '',
    raw: { 묶음배송번호: 'BOX-1', 옵션ID: optionId },
    rawValues: [],
    rawRowNumber: 2,
  }
}

function makePlan(order: StandardOrder): UploadPlan {
  return {
    file: new File([], 'orders.xlsx'),
    platform: 'coupang',
    existingImports: [],
    parseResult: {
      orders: [order],
      invalidRows: [],
      duplicateRows: [],
      meta: {
        platform: 'coupang',
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        duplicateRows: 0,
        skippedRows: 0,
      },
    },
  }
}

function makeImport(id: string): OrderImport {
  return {
    id,
    workSessionId: 'SESSION-1',
    platform: 'coupang',
    fileName: `${id}.xlsx`,
    label: id,
    totalRows: 1,
    validCount: 1,
    invalidCount: 0,
    duplicateCount: 0,
    invalidRows: [],
    duplicateRows: [],
    uploadedAt: '',
  }
}

describe('기존 주문에 추가', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getOrderImports).mockResolvedValue([])
    vi.mocked(getOrders).mockResolvedValue([])
    vi.mocked(appendOrdersToImport).mockResolvedValue({
      insertedCount: 1,
      duplicateCount: 0,
      totalCount: 2,
    })
  })

  it('전체 파싱 결과를 RPC로 한 번만 전달하고 기존 주문을 삭제/재저장하지 않는다', async () => {
    const order = makeOrder('PEACH')
    const plan = {
      ...makePlan(order),
      existingImports: [makeImport('IMPORT-1')],
    }
    await useOrderUpload('SESSION-1').commitUpload(plan, {
      appendExisting: true,
    })
    expect(appendOrdersToImport).toHaveBeenCalledExactlyOnceWith({
      workSessionId: 'SESSION-1',
      orderImportId: 'IMPORT-1',
      platform: 'coupang',
      fileName: 'orders.xlsx',
      orders: [order],
      invalidRows: [],
      duplicateRows: [],
    })
    expect(createOrderImport).not.toHaveBeenCalled()
    expect(saveOrders).not.toHaveBeenCalled()
    expect(deleteOrderImport).not.toHaveBeenCalled()
  })

  it('RPC 실패 시 삭제 또는 재저장으로 우회하지 않는다', async () => {
    vi.mocked(appendOrdersToImport).mockRejectedValue(new Error('저장 실패'))
    const plan = {
      ...makePlan(makeOrder('PEACH')),
      existingImports: [makeImport('IMPORT-1')],
    }
    await expect(
      useOrderUpload('SESSION-1').commitUpload(plan, { appendExisting: true })
    ).rejects.toThrow('저장 실패')
    expect(deleteOrderImport).not.toHaveBeenCalled()
    expect(createOrderImport).not.toHaveBeenCalled()
    expect(saveOrders).not.toHaveBeenCalled()
    expect(getOrders).not.toHaveBeenCalled()
  })

  it('계정 파일이 여러 개면 사용자가 선택한 파일에 추가한다', async () => {
    const plan = {
      ...makePlan(makeOrder('PEACH')),
      existingImports: [makeImport('IMPORT-1'), makeImport('IMPORT-2')],
    }
    await useOrderUpload('SESSION-1').commitUpload(plan, {
      appendExisting: true,
      appendImportId: 'IMPORT-2',
    })
    expect(appendOrdersToImport).toHaveBeenCalledWith(
      expect.objectContaining({ orderImportId: 'IMPORT-2' })
    )
    expect(deleteOrderImport).not.toHaveBeenCalled()
  })

  it.each([undefined, 'UNKNOWN'])(
    '여러 계정 중 대상 파일을 선택하지 않았거나 잘못된 ID면 저장하지 않는다 (%s)',
    async (appendImportId) => {
      const plan = {
        ...makePlan(makeOrder('PEACH')),
        existingImports: [makeImport('IMPORT-1'), makeImport('IMPORT-2')],
      }
      await expect(
        useOrderUpload('SESSION-1').commitUpload(plan, {
          appendExisting: true,
          appendImportId,
        })
      ).rejects.toThrow('기존 파일을 선택')
      expect(appendOrdersToImport).not.toHaveBeenCalled()
      expect(deleteOrderImport).not.toHaveBeenCalled()
    }
  )
})

describe('별도 파일 업로드 중복 검사', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getOrderImports).mockResolvedValue([])
    vi.mocked(createOrderImport).mockResolvedValue({
      id: 'IMPORT-1',
    } as Awaited<ReturnType<typeof createOrderImport>>)
    vi.mocked(saveOrders).mockResolvedValue()
  })

  it.each([false, true])(
    '같은 상품의 별도 추가는 DB 변경 전에 거절한다 (이전 키: %s)',
    async (legacy) => {
      vi.mocked(getOrders).mockResolvedValue([makeOrder('APPLE', legacy)])
      const upload = useOrderUpload('SESSION-1')
      await expect(
        upload.commitUpload(makePlan(makeOrder('APPLE')), { addSeparate: true })
      ).rejects.toThrow('이미 동일한 주문')
      expect(createOrderImport).not.toHaveBeenCalled()
      expect(saveOrders).not.toHaveBeenCalled()
      expect(deleteOrderImport).not.toHaveBeenCalled()
    }
  )

  it('기존 묶음과 같아도 다른 상품은 별도 추가할 수 있다', async () => {
    vi.mocked(getOrders).mockResolvedValue([makeOrder('APPLE', true)])
    const order = makeOrder('PEACH')
    await useOrderUpload('SESSION-1').commitUpload(makePlan(order), {
      addSeparate: true,
    })
    expect(saveOrders).toHaveBeenCalledWith('SESSION-1', 'IMPORT-1', [order])
    expect(deleteOrderImport).not.toHaveBeenCalled()
  })

  it('기존 주문 조회 실패 시 DB를 변경하지 않는다', async () => {
    vi.mocked(getOrders).mockRejectedValue(new Error('조회 실패'))
    await expect(
      useOrderUpload('SESSION-1').commitUpload(makePlan(makeOrder('APPLE')), {
        addSeparate: true,
      })
    ).rejects.toThrow('조회 실패')
    expect(createOrderImport).not.toHaveBeenCalled()
    expect(deleteOrderImport).not.toHaveBeenCalled()
  })
})
