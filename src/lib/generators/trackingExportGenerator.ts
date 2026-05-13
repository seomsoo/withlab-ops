import JSZip from 'jszip'

import type {
  StandardTrackingExport,
  TrackingExportItem,
  PlatformTrackingTemplate,
} from '@/types'

export function filterExportItemsByImportLabel(
  items: TrackingExportItem[],
  label: string
): TrackingExportItem[] {
  return items.filter((item) => item.orderImportLabel === label)
}

type CellStyleMap = Map<number, string>

export function validateNoDuplicateAllocations(items: TrackingExportItem[]): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.allocationId) continue
    if (seen.has(item.allocationId)) {
      throw new Error(`중복 매칭된 주문이 있습니다: ${item.matchingKey}`)
    }
    seen.add(item.allocationId)
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getXmlAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${escapeRegExp(name)}=(["'])(.*?)\\1`))
  return match?.[2] ?? null
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnNameToIndex(name: string): number {
  let result = 0
  for (const char of name) {
    result = result * 26 + char.charCodeAt(0) - 64
  }
  return result
}

function columnIndexToName(index: number): string {
  let n = index
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function getCellColumnIndex(ref: string): number {
  const match = ref.match(/^[A-Z]+/)
  return match ? columnNameToIndex(match[0]!) : 0
}

function getRowNumber(rowXml: string): number | null {
  const match = rowXml.match(/^<row\b[^>]*\br=(["'])(\d+)\1/)
  return match ? Number(match[2]) : null
}

function replaceRowNumber(rowOpenTag: string, rowNumber: number): string {
  if (/\br=(["'])\d+\1/.test(rowOpenTag)) {
    return rowOpenTag.replace(/\br=(["'])\d+\1/, `r="${rowNumber}"`)
  }
  return rowOpenTag.replace(/^<row\b/, `<row r="${rowNumber}"`)
}

function extractRows(sheetXml: string): string[] {
  const sheetDataMatch = sheetXml.match(/<sheetData>([\s\S]*?)<\/sheetData>/)
  const sheetData = sheetDataMatch?.[1] ?? ''
  return Array.from(
    sheetData.matchAll(/<row\b[^>]*(?:\/>|>[\s\S]*?<\/row>)/g),
    (match) => match[0]
  )
}

function getTemplateRow(rows: string[], dataStartRow: number): string {
  return (
    rows.find((rowXml) => getRowNumber(rowXml) === dataStartRow) ??
    `<row r="${dataStartRow}"></row>`
  )
}

function getRowOpenTag(rowXml: string): string {
  return rowXml.match(/^<row\b[^>]*>/)?.[0] ?? '<row>'
}

function getCellStyles(rowXml: string): CellStyleMap {
  const styles: CellStyleMap = new Map()
  for (const match of rowXml.matchAll(/<c\b[^>]*>/g)) {
    const cellTag = match[0]
    const ref = getXmlAttr(cellTag, 'r')
    const style = getXmlAttr(cellTag, 's')
    if (ref && style != null) {
      styles.set(getCellColumnIndex(ref), style)
    }
  }
  return styles
}

function isEmptyValue(value: unknown): boolean {
  return value == null || value === ''
}

function buildCellXml(
  rowNumber: number,
  colIndex: number,
  value: unknown,
  styles: CellStyleMap
): string {
  const ref = `${columnIndexToName(colIndex)}${rowNumber}`
  const style = styles.get(colIndex)
  const styleAttr = style != null ? ` s="${style}"` : ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`
  }

  return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
}

function buildRowXml(
  templateRowOpenTag: string,
  rowNumber: number,
  item: TrackingExportItem,
  template: PlatformTrackingTemplate,
  styles: CellStyleMap
): string {
  const values = new Map<number, unknown>()
  item.originalRowValues.forEach((value, idx) => {
    if (!isEmptyValue(value)) {
      values.set(idx + 1, value)
    }
  })

  values.set(template.trackingCompanyColumnIndex, item.trackingCompany)
  values.set(template.trackingNumberColumnIndex, item.trackingNumber)
  if (template.statusColumnIndex && template.statusValue) {
    values.set(template.statusColumnIndex, template.statusValue)
  }

  const cells = Array.from(values.entries())
    .sort(([a], [b]) => a - b)
    .map(([colIndex, value]) => buildCellXml(rowNumber, colIndex, value, styles))
    .join('')

  return `${replaceRowNumber(templateRowOpenTag, rowNumber)}${cells}</row>`
}

function getSheetPath(workbookXml: string, relsXml: string, sheetName: string): string {
  for (const match of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    const sheetTag = match[0]
    if (getXmlAttr(sheetTag, 'name') !== sheetName) continue

    const relId = getXmlAttr(sheetTag, 'r:id')
    if (!relId) break

    const relPattern = new RegExp(
      `<Relationship\\b[^>]*\\bId=(["'])${escapeRegExp(relId)}\\1[^>]*>`,
      'g'
    )
    const relTag = relPattern.exec(relsXml)?.[0]
    const target = relTag ? getXmlAttr(relTag, 'Target') : null
    if (!target) break

    if (target.startsWith('/')) return target.slice(1)
    return `xl/${target.replace(/^\.\//, '')}`
  }

  throw new Error(`시트 "${sheetName}"를 찾을 수 없습니다`)
}

function getMaxColumn(
  items: TrackingExportItem[],
  template: PlatformTrackingTemplate,
  styles: CellStyleMap
): number {
  return Math.max(
    template.trackingCompanyColumnIndex,
    template.trackingNumberColumnIndex,
    template.statusColumnIndex ?? 0,
    ...items.map((item) => item.originalRowValues.length),
    ...styles.keys()
  )
}

function updateDimension(sheetXml: string, maxColumn: number, lastRow: number): string {
  const ref = `A1:${columnIndexToName(maxColumn)}${lastRow}`
  if (/<dimension\b[^>]*\/>/.test(sheetXml)) {
    return sheetXml.replace(/<dimension\b[^>]*\/>/, `<dimension ref="${ref}"/>`)
  }
  return sheetXml.replace(/<worksheet\b[^>]*>/, (tag) => `${tag}<dimension ref="${ref}"/>`)
}

function maxRowInRange(range: string): number {
  const refs = range.split(':')
  return Math.max(
    ...refs.map((ref) => Number(ref.match(/\d+$/)?.[0] ?? 0))
  )
}

function dropDataRowMerges(sheetXml: string, dataStartRow: number): string {
  return sheetXml.replace(
    /<mergeCells\b[^>]*>([\s\S]*?)<\/mergeCells>/,
    (_full, inner: string) => {
      const mergeCells = Array.from(
        inner.matchAll(/<mergeCell\b[^>]*\/>/g),
        (match) => match[0]
      ).filter((tag) => {
        const ref = getXmlAttr(tag, 'ref')
        return ref ? maxRowInRange(ref) < dataStartRow : false
      })

      if (mergeCells.length === 0) return ''
      return `<mergeCells count="${mergeCells.length}">${mergeCells.join('')}</mergeCells>`
    }
  )
}

function replaceSheetData(
  sheetXml: string,
  template: PlatformTrackingTemplate,
  items: TrackingExportItem[]
): string {
  const rows = extractRows(sheetXml)
  const headerRows = rows.filter((rowXml) => {
    const rowNumber = getRowNumber(rowXml)
    return rowNumber != null && rowNumber < template.dataStartRow
  })
  const templateRow = getTemplateRow(rows, template.dataStartRow)
  const templateRowOpenTag = getRowOpenTag(templateRow)
  const styles = getCellStyles(templateRow)

  const dataRows = items.map((item, idx) =>
    buildRowXml(
      templateRowOpenTag,
      template.dataStartRow + idx,
      item,
      template,
      styles
    )
  )

  const lastRow = template.dataStartRow + items.length - 1
  const maxColumn = getMaxColumn(items, template, styles)
  const nextSheetXml = sheetXml.replace(
    /<sheetData>[\s\S]*?<\/sheetData>/,
    `<sheetData>${headerRows.join('')}${dataRows.join('')}</sheetData>`
  )

  return dropDataRowMerges(updateDimension(nextSheetXml, maxColumn, lastRow), template.dataStartRow)
}

export async function generateTrackingExportExcel(
  exportData: StandardTrackingExport,
  template: PlatformTrackingTemplate,
  templateBlob: Blob
): Promise<Blob> {
  validateNoDuplicateAllocations(exportData.items)

  const arrayBuffer = await templateBlob.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string')
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string')

  if (!workbookXml || !relsXml) {
    throw new Error('운송장 양식 파일을 읽을 수 없습니다')
  }

  const sheetPath = getSheetPath(workbookXml, relsXml, template.sheetName)
  const sheetFile = zip.file(sheetPath)
  const sheetXml = await sheetFile?.async('string')
  if (!sheetFile || !sheetXml) {
    throw new Error(`시트 "${template.sheetName}"를 찾을 수 없습니다`)
  }

  zip.file(sheetPath, replaceSheetData(sheetXml, template, exportData.items))

  const outputBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
  })

  return new Blob([outputBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
