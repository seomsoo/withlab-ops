import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { generatePurchaseOrderExcel } from './purchaseOrderGenerator'
import type { StandardPurchaseOrder, SupplierTemplate, PurchaseOrderItem } from '@/types'

function makeItem(overrides: Partial<PurchaseOrderItem> = {}): PurchaseOrderItem {
  return {
    allocationId: 'alloc-1',
    orderId: 'order-1',
    platform: 'coupang',
    orderNo: 'ORD-001',
    orderItemNo: 'ITEM-001',
    matchingKey: 'ORD-001',
    supplierProductName: '성주참외 5kg',
    supplierProductCode: 'CF-5K',
    productName: '산지직송 성주 꿀참외 가정용',
    optionName: '1박스 5kg',
    displayProductName: '산지직송 성주 꿀참외 가정용(1박스 5kg)',
    quantity: 3,
    recipientName: '김철수',
    recipientPhone: '010-9876-5432',
    zipCode: '12345',
    address: '서울시 강남구',
    deliveryMessage: '부재시 문앞',
    buyerName: '홍길동',
    buyerPhone: '01012345678',
    orderDate: '2026-05-10 09:30:00',
    nameMappingApplied: true,
    ...overrides,
  }
}

function makeTemplate(overrides: Partial<SupplierTemplate> = {}): SupplierTemplate {
  return {
    id: 'tpl-1',
    supplierId: 'sup-A',
    templatePath: 'test/path.xlsx',
    templateFileName: 'test.xlsx',
    sheetName: 'Sheet1',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: [
      { targetColumnIndex: 1, targetHeaderName: '주문번호', systemField: 'matchingKey' },
      { targetColumnIndex: 2, targetHeaderName: '상품명', systemField: 'supplierProductName' },
      { targetColumnIndex: 3, targetHeaderName: '수량', systemField: 'quantity' },
      { targetColumnIndex: 4, targetHeaderName: '수취인', systemField: 'recipientName' },
      { targetColumnIndex: 5, targetHeaderName: '전화번호', systemField: 'recipientPhone', format: 'hyphen' },
      { targetColumnIndex: 6, targetHeaderName: '주소', systemField: 'address' },
    ],
    ...overrides,
  }
}

async function createTemplateBlob(opts?: {
  sheetName?: string
  dataRows?: number
  headerRow?: number
  dataStartRow?: number
}): Promise<Blob> {
  const sheetName = opts?.sheetName ?? 'Sheet1'
  const headerRow = opts?.headerRow ?? 1
  const dataStartRow = opts?.dataStartRow ?? 2
  const dataRows = opts?.dataRows ?? 3

  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet(sheetName)

  const hRow = ws.getRow(headerRow)
  hRow.getCell(1).value = '주문번호'
  hRow.getCell(2).value = '상품명'
  hRow.getCell(3).value = '수량'
  hRow.getCell(4).value = '수취인'
  hRow.getCell(5).value = '전화번호'
  hRow.getCell(6).value = '주소'
  hRow.commit()

  for (let i = 0; i < dataRows; i++) {
    const row = ws.getRow(dataStartRow + i)
    row.getCell(1).value = `SAMPLE-${i}`
    row.getCell(2).value = `샘플상품-${i}`
    row.getCell(3).value = i + 1
    row.getCell(4).value = `샘플수취인-${i}`
    row.getCell(5).value = '010-0000-0000'
    row.getCell(6).value = '샘플주소'
    row.getCell(1).font = { bold: true }
    row.commit()
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer])
}

async function readResultWorkbook(blob: Blob): Promise<ExcelJS.Workbook> {
  const arrayBuffer = await blob.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)
  return workbook
}

describe('generatePurchaseOrderExcel', () => {
  it('1. 템플릿 로드: 전달받은 템플릿을 로드하고 새 워크북을 만들지 않는다', async () => {
    const templateBlob = await createTemplateBlob()
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem()],
    }

    const result = await generatePurchaseOrderExcel(po, makeTemplate(), templateBlob)
    const wb = await readResultWorkbook(result)
    expect(wb.getWorksheet('Sheet1')).toBeDefined()
  })

  it('2. 데이터 시작 행: dataStartRow부터 값이 들어간다', async () => {
    const templateBlob = await createTemplateBlob()
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem()],
    }

    const result = await generatePurchaseOrderExcel(po, makeTemplate(), templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(2).getCell(1).value).toBe('ORD-001')
  })

  it('3. 기존 데이터 clear: 기존 샘플 데이터가 제거된다', async () => {
    const templateBlob = await createTemplateBlob({ dataRows: 5 })
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem()],
    }

    const result = await generatePurchaseOrderExcel(po, makeTemplate(), templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(3).getCell(1).value).toBeNull()
    expect(ws.getRow(4).getCell(1).value).toBeNull()
  })

  it('4. empty 필드: systemField="empty"인 셀이 null로 비워진다', async () => {
    const templateBlob = await createTemplateBlob()
    const template = makeTemplate({
      columnMappings: [
        { targetColumnIndex: 1, targetHeaderName: '주문번호', systemField: 'matchingKey' },
        { targetColumnIndex: 2, targetHeaderName: '빈칸', systemField: 'empty' },
      ],
    })
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem()],
    }

    const result = await generatePurchaseOrderExcel(po, template, templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(2).getCell(2).value).toBeNull()
  })

  it('5. columnIndex 기준: targetColumnIndex(1-based)로 올바르게 접근', async () => {
    const templateBlob = await createTemplateBlob()
    const template = makeTemplate({
      columnMappings: [
        { targetColumnIndex: 3, targetHeaderName: '수량', systemField: 'quantity' },
        { targetColumnIndex: 6, targetHeaderName: '주소', systemField: 'address' },
      ],
    })
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem({ quantity: 5, address: '부산시 해운대구' })],
    }

    const result = await generatePurchaseOrderExcel(po, template, templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(2).getCell(3).value).toBe(5)
    expect(ws.getRow(2).getCell(6).value).toBe('부산시 해운대구')
  })

  it('6. 전화번호 포맷: raw/hyphen/digits가 정확히 적용된다', async () => {
    const templateBlob = await createTemplateBlob()
    const template = makeTemplate({
      columnMappings: [
        { targetColumnIndex: 1, targetHeaderName: '원본', systemField: 'recipientPhone', format: 'raw' },
        { targetColumnIndex: 2, targetHeaderName: '하이픈', systemField: 'recipientPhone', format: 'hyphen' },
        { targetColumnIndex: 3, targetHeaderName: '숫자만', systemField: 'recipientPhone', format: 'digits' },
      ],
    })
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem({ recipientPhone: '01098765432' })],
    }

    const result = await generatePurchaseOrderExcel(po, template, templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(2).getCell(1).value).toBe('01098765432')
    expect(ws.getRow(2).getCell(2).value).toBe('010-9876-5432')
    expect(ws.getRow(2).getCell(3).value).toBe('01098765432')
  })

  it('7. 적은 항목: po.items < 기존 데이터 행 → 남은 행 값 clear', async () => {
    const templateBlob = await createTemplateBlob({ dataRows: 5 })
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem()],
    }

    const result = await generatePurchaseOrderExcel(po, makeTemplate(), templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(2).getCell(1).value).toBe('ORD-001')
    expect(ws.getRow(3).getCell(1).value).toBeNull()
    expect(ws.getRow(6).getCell(1).value).toBeNull()
  })

  it('8. 많은 항목: po.items > 기존 데이터 행 → 행 추가', async () => {
    const templateBlob = await createTemplateBlob({ dataRows: 1 })
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ allocationId: `alloc-${i}`, orderId: `order-${i}`, matchingKey: `KEY-${i}` })
    )
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items,
    }

    const result = await generatePurchaseOrderExcel(po, makeTemplate(), templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(2).getCell(1).value).toBe('KEY-0')
    expect(ws.getRow(6).getCell(1).value).toBe('KEY-4')
  })

  it('9. 다중 매핑: 하나의 systemField를 여러 컬럼에 매핑 가능', async () => {
    const templateBlob = await createTemplateBlob()
    const template = makeTemplate({
      columnMappings: [
        { targetColumnIndex: 1, targetHeaderName: '주소1', systemField: 'address' },
        { targetColumnIndex: 2, targetHeaderName: '주소2', systemField: 'address' },
      ],
    })
    const po: StandardPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-A',
      supplierName: 'A업체',
      createdAt: '2026-05-10',
      items: [makeItem({ address: '테스트 주소' })],
    }

    const result = await generatePurchaseOrderExcel(po, template, templateBlob)
    const wb = await readResultWorkbook(result)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(2).getCell(1).value).toBe('테스트 주소')
    expect(ws.getRow(2).getCell(2).value).toBe('테스트 주소')
  })
})
