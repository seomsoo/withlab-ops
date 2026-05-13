import ExcelJS from 'exceljs'
import { applyPhoneFormat } from '@/utils/phone'

import type {
  StandardPurchaseOrder,
  PurchaseOrderItem,
  SupplierTemplate,
  ColumnMappingItem,
  AllocationStatus,
} from '@/types'
import type { AllocationWithOrder } from '@/lib/supabase/allocations'

export async function generatePurchaseOrderExcel(
  po: StandardPurchaseOrder,
  template: SupplierTemplate,
  templateBlob: Blob
): Promise<Blob> {
  const arrayBuffer = await templateBlob.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.getWorksheet(template.sheetName)
  if (!worksheet) {
    throw new Error(`시트 "${template.sheetName}"를 찾을 수 없습니다`)
  }

  for (let r = 1; r < template.dataStartRow; r++) {
    const row = worksheet.getRow(r)
    row.eachCell((cell) => {
      if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
        const plainText = cell.value.richText
          .map((part: { text: string }) => part.text)
          .join('')
        cell.value = plainText
      }
    })
  }

  const lastRowNum = worksheet.lastRow?.number ?? template.dataStartRow

  const firstDataRow = worksheet.getRow(template.dataStartRow)
  const firstRowStyles: Map<number, Partial<ExcelJS.Style>> = new Map()
  template.columnMappings.forEach((mapping) => {
    const cell = firstDataRow.getCell(mapping.targetColumnIndex)
    firstRowStyles.set(mapping.targetColumnIndex, {
      font: cell.font ? { ...cell.font } : undefined,
      alignment: cell.alignment ? { ...cell.alignment } : undefined,
      border: cell.border ? { ...cell.border } : undefined,
      numFmt: cell.numFmt,
    })
  })

  for (let rowNum = template.dataStartRow; rowNum <= lastRowNum; rowNum++) {
    const row = worksheet.getRow(rowNum)
    template.columnMappings.forEach((mapping) => {
      row.getCell(mapping.targetColumnIndex).value = null
    })
  }

  for (let i = 0; i < po.items.length; i++) {
    const rowNum = template.dataStartRow + i
    const row = worksheet.getRow(rowNum)
    const item = po.items[i]!

    template.columnMappings.forEach((mapping) => {
      const cell = row.getCell(mapping.targetColumnIndex)
      const value = getValueBySystemField(item, mapping)
      cell.value = value

      const style = firstRowStyles.get(mapping.targetColumnIndex)
      if (style) {
        if (style.font) cell.font = style.font
        if (style.alignment) cell.alignment = style.alignment
        if (style.border) cell.border = style.border
        if (style.numFmt) cell.numFmt = style.numFmt
      }
    })

    row.commit()
  }

  const outputBuffer = await workbook.xlsx.writeBuffer()
  return new Blob([outputBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function getValueBySystemField(
  item: PurchaseOrderItem,
  mapping: ColumnMappingItem
): string | number | null {
  switch (mapping.systemField) {
    case 'matchingKey':
      return item.matchingKey
    case 'orderNo':
      return item.orderNo
    case 'orderItemNo':
      return item.orderItemNo
    case 'supplierProductName':
      return item.supplierProductName
    case 'supplierProductCode':
      return item.supplierProductCode ?? ''
    case 'quantity':
      return item.quantity
    case 'recipientName':
      return item.recipientName
    case 'recipientPhone':
      return applyPhoneFormat(item.recipientPhone, mapping.format)
    case 'zipCode':
      return item.zipCode
    case 'address':
      return item.address
    case 'deliveryMessage':
      return item.deliveryMessage ?? ''
    case 'buyerName':
      return item.buyerName
    case 'buyerPhone':
      return applyPhoneFormat(item.buyerPhone, mapping.format)
    case 'senderAddress':
      return item.address
    case 'orderDate':
      return item.orderDate
    case 'platformProductName':
      return item.displayProductName
    case 'empty':
      return null
  }
}

export function buildPurchaseOrders(
  allocationsWithOrders: AllocationWithOrder[],
  options?: { includeStatuses?: AllocationStatus[] }
): StandardPurchaseOrder[] {
  const statuses = options?.includeStatuses ?? ['pending', 'ordered']

  const filtered = allocationsWithOrders.filter((a) =>
    statuses.includes(a.status)
  )

  const grouped = new Map<string, { supplierName: string; items: AllocationWithOrder[] }>()
  for (const alloc of filtered) {
    const existing = grouped.get(alloc.supplierId)
    if (existing) {
      existing.items.push(alloc)
    } else {
      grouped.set(alloc.supplierId, {
        supplierName: alloc.supplierName,
        items: [alloc],
      })
    }
  }

  const result: StandardPurchaseOrder[] = []
  for (const [supplierId, group] of grouped) {
    result.push({
      id: `po-${supplierId}`,
      supplierId,
      supplierName: group.supplierName,
      createdAt: new Date().toISOString(),
      items: group.items
        .sort((a, b) => {
          const platformOrder = { coupang: 0, toss: 1 }
          return (platformOrder[a.order.platform] ?? 2) - (platformOrder[b.order.platform] ?? 2)
        })
        .map((a) => ({
        allocationId: a.id,
        orderId: a.orderId,
        platform: a.order.platform,
        orderNo: a.order.orderNo,
        orderItemNo: a.order.orderItemNo,
        matchingKey: a.order.matchingKey,
        supplierProductName: a.supplierProductName,
        supplierProductCode: a.supplierProductCode,
        productName: a.order.productName,
        optionName: a.order.optionName,
        displayProductName: a.order.displayProductName,
        quantity: a.order.quantity,
        recipientName: a.order.recipientName,
        recipientPhone: a.order.recipientPhone,
        zipCode: a.order.zipCode,
        address: a.order.address,
        deliveryMessage: a.order.deliveryMessage,
        buyerName: a.order.buyerName,
        buyerPhone: a.order.buyerPhone,
        orderDate: a.order.orderDate,
        nameMappingApplied: a.nameMappingApplied,
      })),
    })
  }

  return result
}
