import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'

import { generateTrackingExportExcel, validateNoDuplicateAllocations } from './trackingExportGenerator'

import type {
  StandardTrackingExport,
  TrackingExportItem,
  PlatformTrackingTemplate,
} from '@/types'

function makeItem(overrides: Partial<TrackingExportItem> = {}): TrackingExportItem {
  return {
    trackingId: 'trk-1',
    allocationId: 'alloc-1',
    orderId: 'order-1',
    orderNo: 'ORD001',
    orderItemNo: 'ITEM001',
    matchingKey: 'MK001',
    trackingCompany: 'CJ대한통운',
    trackingNumber: '1234567890',
    courierMapped: true,
    originalRow: {},
    originalRowValues: ['', '', 'MK001', '', '', '', ''],
    originalRowNumber: 2,
    ...overrides,
  }
}

function makeCoupangTemplate(overrides: Partial<PlatformTrackingTemplate> = {}): PlatformTrackingTemplate {
  return {
    id: 'ptpl-1',
    platform: 'coupang',
    templatePath: 'test.xlsx',
    templateFileName: 'coupang.xlsx',
    sheetName: 'Delivery',
    headerRow: 1,
    dataStartRow: 2,
    matchKeyColumnIndex: 3,
    matchKeyColumnName: '주문번호',
    trackingCompanyColumnIndex: 4,
    trackingCompanyColumnName: '택배사',
    trackingNumberColumnIndex: 5,
    trackingNumberColumnName: '운송장번호',
    ...overrides,
  }
}

function makeTossTemplate(overrides: Partial<PlatformTrackingTemplate> = {}): PlatformTrackingTemplate {
  return {
    id: 'ptpl-2',
    platform: 'toss',
    templatePath: 'test.xlsx',
    templateFileName: 'toss.xlsx',
    sheetName: '주문내역',
    headerRow: 3,
    dataStartRow: 5,
    matchKeyColumnIndex: 3,
    matchKeyColumnName: '주문상품번호',
    trackingCompanyColumnIndex: 6,
    trackingCompanyColumnName: '택배사',
    trackingNumberColumnIndex: 7,
    trackingNumberColumnName: '송장번호',
    statusColumnIndex: 4,
    statusColumnName: '주문상태',
    statusValue: '배송중',
    ...overrides,
  }
}

async function createCoupangBlob(dataRows = 3): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Delivery')
  ws.getRow(1).values = ['번호', '묶음배송', '주문번호', '택배사', '운송장번호']
  for (let i = 0; i < dataRows; i++) {
    ws.getRow(2 + i).values = [i + 1, '', `SAMPLE-${i}`, '', '']
  }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf])
}

async function createTossBlob(dataRows = 2): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('주문내역')
  ws.getRow(1).values = ['안내문구입니다']
  ws.getRow(2).values = ['그룹헤더']
  ws.getRow(3).values = ['', '', '주문상품번호', '주문상태', '결제금액', '택배사', '송장번호']
  ws.getRow(4).values = ['수정불가', '수정불가', '수정불가', '수정가능', '수정불가', '수정가능', '수정가능']
  for (let i = 0; i < dataRows; i++) {
    ws.getRow(5 + i).values = ['', '', `TOSS-ITEM-${i}`, '주문완료', 29900, '', '']
  }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf])
}

describe('trackingExportGenerator', () => {
  it('쿠팡 양식 — rawValues 복사 + D열 택배사 + E열 운송장번호', async () => {
    const blob = await createCoupangBlob()
    const exportData: StandardTrackingExport = {
      id: 'export-1',
      platform: 'coupang',
      createdAt: '2026-05-10',
      items: [makeItem({ originalRowValues: [1, '900001', 'MK001', '', ''] })],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeCoupangTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('Delivery')!

    expect(ws.getRow(2).getCell(3).value).toBe('MK001')
    expect(ws.getRow(2).getCell(4).value).toBe('CJ대한통운')
    expect(ws.getRow(2).getCell(5).value).toBe('1234567890')
  })

  it('토스 양식 — rawValues 복사 + D열 주문상태 "배송중" + F열 택배사 + G열 송장번호', async () => {
    const blob = await createTossBlob()
    const exportData: StandardTrackingExport = {
      id: 'export-2',
      platform: 'toss',
      createdAt: '2026-05-10',
      items: [makeItem({
        originalRowValues: ['', '', 'TOSS-001', '주문완료', 29900, '', ''],
      })],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeTossTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('주문내역')!

    expect(ws.getRow(5).getCell(4).value).toBe('배송중')
    expect(ws.getRow(5).getCell(6).value).toBe('CJ대한통운')
    expect(ws.getRow(5).getCell(7).value).toBe('1234567890')
  })

  it('토스 1~4행 보존 확인', async () => {
    const blob = await createTossBlob()
    const exportData: StandardTrackingExport = {
      id: 'export-3',
      platform: 'toss',
      createdAt: '2026-05-10',
      items: [makeItem({ originalRowValues: ['', '', 'T1', '', 0, '', ''] })],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeTossTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('주문내역')!

    expect(ws.getRow(1).getCell(1).value).toBe('안내문구입니다')
    expect(ws.getRow(3).getCell(3).value).toBe('주문상품번호')
  })

  it('택배사 변환 — courierMapping 적용 후 출력', async () => {
    const blob = await createCoupangBlob()
    const exportData: StandardTrackingExport = {
      id: 'export-4',
      platform: 'coupang',
      createdAt: '2026-05-10',
      items: [makeItem({
        trackingCompany: '씨제이대한통운',
        courierMapped: true,
        originalRowValues: [1, '', 'MK001', '', ''],
      })],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeCoupangTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('Delivery')!

    expect(ws.getRow(2).getCell(4).value).toBe('씨제이대한통운')
  })

  it('택배사 미매핑 — 원본 그대로 + courierMapped=false', async () => {
    const blob = await createCoupangBlob()
    const item = makeItem({
      trackingCompany: '원본택배사',
      courierMapped: false,
      originalRowValues: [1, '', 'MK001', '', ''],
    })

    const exportData: StandardTrackingExport = {
      id: 'export-5',
      platform: 'coupang',
      createdAt: '2026-05-10',
      items: [item],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeCoupangTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('Delivery')!

    expect(ws.getRow(2).getCell(4).value).toBe('원본택배사')
    expect(item.courierMapped).toBe(false)
  })

  it('중복 allocationId — 2건 이상 matched → 에러 throw', () => {
    const items = [
      makeItem({ allocationId: 'alloc-dup' }),
      makeItem({ allocationId: 'alloc-dup', trackingId: 'trk-2' }),
    ]
    expect(() => validateNoDuplicateAllocations(items)).toThrow('중복 매칭된 주문이 있습니다')
  })

  it('기존 데이터 clear — 양식에 남은 샘플 데이터 제거 확인', async () => {
    const blob = await createCoupangBlob(5)
    const exportData: StandardTrackingExport = {
      id: 'export-7',
      platform: 'coupang',
      createdAt: '2026-05-10',
      items: [makeItem({ originalRowValues: [1, '', 'MK001', '', ''] })],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeCoupangTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('Delivery')!

    expect(ws.getRow(3).getCell(3).value).toBeNull()
    expect(ws.getRow(4).getCell(3).value).toBeNull()
  })

  it('items < 기존 행 → 남은 행 값 clear', async () => {
    const blob = await createCoupangBlob(3)
    const exportData: StandardTrackingExport = {
      id: 'export-8',
      platform: 'coupang',
      createdAt: '2026-05-10',
      items: [makeItem({ originalRowValues: [1, '', 'NEW', '', ''] })],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeCoupangTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('Delivery')!

    expect(ws.getRow(2).getCell(3).value).toBe('NEW')
    expect(ws.getRow(3).getCell(3).value).toBeNull()
  })

  it('items > 기존 행 → 행 추가', async () => {
    const blob = await createCoupangBlob(1)
    const exportData: StandardTrackingExport = {
      id: 'export-9',
      platform: 'coupang',
      createdAt: '2026-05-10',
      items: [
        makeItem({ allocationId: 'a1', orderId: 'o1', originalRowValues: [1, '', 'MK001', '', ''] }),
        makeItem({ allocationId: 'a2', orderId: 'o2', originalRowValues: [2, '', 'MK002', '', ''], trackingNumber: '999' }),
        makeItem({ allocationId: 'a3', orderId: 'o3', originalRowValues: [3, '', 'MK003', '', ''], trackingNumber: '888' }),
      ],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeCoupangTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('Delivery')!

    expect(ws.getRow(2).getCell(5).value).toBe('1234567890')
    expect(ws.getRow(3).getCell(5).value).toBe('999')
    expect(ws.getRow(4).getCell(5).value).toBe('888')
  })

  it('rawValues가 짧으면 나머지 빈 셀 padding', async () => {
    const blob = await createCoupangBlob()
    const exportData: StandardTrackingExport = {
      id: 'export-10',
      platform: 'coupang',
      createdAt: '2026-05-10',
      items: [makeItem({ originalRowValues: [1] })],
    }

    const resultBlob = await generateTrackingExportExcel(exportData, makeCoupangTemplate(), blob)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await resultBlob.arrayBuffer())
    const ws = wb.getWorksheet('Delivery')!

    expect(ws.getRow(2).getCell(1).value).toBe(1)
    expect(ws.getRow(2).getCell(4).value).toBe('CJ대한통운')
    expect(ws.getRow(2).getCell(5).value).toBe('1234567890')
  })
})
