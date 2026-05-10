import ExcelJS from 'exceljs'

import type {
  StandardTrackingExport,
  TrackingExportItem,
  PlatformTrackingTemplate,
} from '@/types'

export function validateNoDuplicateAllocations(items: TrackingExportItem[]): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.allocationId)) {
      throw new Error(`중복 매칭된 주문이 있습니다: ${item.matchingKey}`)
    }
    seen.add(item.allocationId)
  }
}

function clearDataRows(
  ws: ExcelJS.Worksheet,
  dataStartRow: number
): void {
  const lastRow = ws.lastRow?.number ?? dataStartRow
  for (let rowNum = dataStartRow; rowNum <= lastRow; rowNum++) {
    const row = ws.getRow(rowNum)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.value = null
    })
  }
}

export async function generateTrackingExportExcel(
  exportData: StandardTrackingExport,
  template: PlatformTrackingTemplate,
  templateBlob: Blob
): Promise<Blob> {
  const arrayBuffer = await templateBlob.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(arrayBuffer)

  const ws = wb.getWorksheet(template.sheetName)
  if (!ws) {
    throw new Error(`시트 "${template.sheetName}"를 찾을 수 없습니다`)
  }

  validateNoDuplicateAllocations(exportData.items)

  const firstDataRow = ws.getRow(template.dataStartRow)
  const colCount = ws.columnCount
  const firstRowStyles: Map<number, Partial<ExcelJS.Style>> = new Map()
  for (let col = 1; col <= colCount; col++) {
    const cell = firstDataRow.getCell(col)
    firstRowStyles.set(col, {
      font: cell.font ? { ...cell.font } : undefined,
      alignment: cell.alignment ? { ...cell.alignment } : undefined,
      border: cell.border ? { ...cell.border } : undefined,
      numFmt: cell.numFmt,
    })
  }

  clearDataRows(ws, template.dataStartRow)

  for (let i = 0; i < exportData.items.length; i++) {
    const item = exportData.items[i]!
    const targetRow = ws.getRow(template.dataStartRow + i)

    for (let idx = 0; idx < item.originalRowValues.length; idx++) {
      const colIndex = idx + 1
      targetRow.getCell(colIndex).value = item.originalRowValues[idx] as ExcelJS.CellValue
    }

    targetRow.getCell(template.trackingCompanyColumnIndex).value = item.trackingCompany
    targetRow.getCell(template.trackingNumberColumnIndex).value = item.trackingNumber

    if (template.statusColumnIndex && template.statusValue) {
      targetRow.getCell(template.statusColumnIndex).value = template.statusValue
    }

    for (let col = 1; col <= colCount; col++) {
      const style = firstRowStyles.get(col)
      if (style) {
        const cell = targetRow.getCell(col)
        if (style.font) cell.font = style.font
        if (style.alignment) cell.alignment = style.alignment
        if (style.border) cell.border = style.border
        if (style.numFmt) cell.numFmt = style.numFmt
      }
    }

    targetRow.commit()
  }

  const outputBuffer = await wb.xlsx.writeBuffer()
  return new Blob([outputBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
