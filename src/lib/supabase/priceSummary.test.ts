import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  imports: [] as unknown[],
  orders: [] as unknown[],
  error: null as null | { message: string },
}))
vi.mock('./client', () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: mock.imports, error: mock.error }),
      }
      return query
    },
  },
}))
vi.mock('./pagination', () => ({ fetchAllPages: async () => mock.orders }))
import { getPriceSummaries } from './priceSummary'
describe('원본 목록 분리', () => {
  beforeEach(() => {
    mock.error = null
    mock.imports = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
      id,
      file_name: '원본.xlsx',
      original_file_name: '원본.xlsx',
      label: id,
      invalid_count: 1,
      duplicate_count: 1,
    }))
    mock.orders = ['a', 'a', 'b', 'c', 'd', 'e'].map((id, i) => ({
      id: String(i),
      order_import_id: id,
      raw: { 결제액: 1000 },
      raw_row_number: 2,
      created_at: '2026-10-30',
      platform: 'coupang',
      quantity: 1,
      allocations: null,
    }))
  })
  it('같은 파일명 5개도 ID로 분리하고 추가 주문은 원래 목록에 포함한다', async () => {
    const result = await getPriceSummaries('session')
    expect(result).toHaveLength(5)
    expect(result.map((r) => r.rows.length)).toEqual([2, 1, 1, 1, 1])
    expect(result[0]?.excluded).toBe(2)
    expect(result[0]?.rows[0]?.issues.length).toBe(1)
  })
  it('조회 실패를 빈 목록으로 반환하지 않는다', async () => {
    mock.error = { message: 'offline' }
    await expect(getPriceSummaries('session')).rejects.toThrow('offline')
  })
  it('최초 파일명 미확인 상태를 보존한다', async () => {
    mock.imports = [
      {
        id: 'a',
        file_name: 'a.xlsx + b.xlsx',
        original_file_name: null,
        label: 'a',
        invalid_count: 0,
        duplicate_count: 0,
      },
    ]
    expect((await getPriceSummaries('session'))[0]?.name).toBe('')
  })
})

describe('PostgREST 배정 응답 형태', () => {
  const allocation = {
    supplier_price: 9000,
    supplier_product_name: '사과',
    suppliers: { name: '공급처 A' },
  }
  const order = {
    id: 'order',
    order_import_id: 'a',
    raw: { 결제액: 30000 },
    raw_row_number: 2,
    created_at: '2026-10-30',
    platform: 'coupang',
    quantity: 3,
  }
  beforeEach(() => {
    mock.error = null
    mock.imports = [
      {
        id: 'a',
        file_name: '원본.xlsx',
        original_file_name: '원본.xlsx',
        label: 'a',
        invalid_count: 0,
        duplicate_count: 0,
      },
    ]
  })
  it.each([allocation, [allocation]])(
    '단일 배정 객체 또는 배열을 금액 계산에 연결한다',
    async (allocations) => {
      mock.orders = [{ ...order, allocations }]
      const row = (await getPriceSummaries('session'))[0]?.rows[0]
      expect(row?.unitPrice).toBe(9000)
      expect(row?.cells[11]).toBe(27000)
      expect(row?.supplier).toBe('공급처 A')
      expect(row?.issues).toEqual([])
    }
  )
  it('배정 객체와 null이 섞여 있어도 미배정 주문을 보존한다', async () => {
    mock.orders = [
      { ...order, allocations: allocation },
      { ...order, id: 'unassigned', allocations: null },
    ]
    const rows = (await getPriceSummaries('session'))[0]?.rows
    expect(rows).toHaveLength(2)
    expect(rows?.[1]?.cells[11]).toBeNull()
    expect(rows?.[1]?.issues).toContain('공급처 미배정 또는 배정 확인 필요')
  })
  it('잘못된 단가는 숨기지 않고 간단한 오류로 안내한다', async () => {
    mock.orders = [
      { ...order, allocations: { ...allocation, supplier_price: 'bad' } },
    ]
    await expect(getPriceSummaries('session')).rejects.toThrow(
      '가격정리 주문 정보 형식을 확인할 수 없습니다'
    )
  })
})
