import JSZip from 'jszip'
import type { PriceRow } from '@/lib/priceSummary/model'

const xml = (s: string) =>
  Array.from(s)
    .filter((c) => {
      const n = c.charCodeAt(0)
      return n >= 32 || n === 9 || n === 10 || n === 13
    })
    .join('')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Only A:M cell values change; shared formulas and styles elsewhere stay intact. */
export async function generatePriceSummary(
  template: ArrayBuffer,
  rows: PriceRow[]
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(template)
  const sheet = zip.file('xl/worksheets/sheet1.xml')
  const book = zip.file('xl/workbook.xml')
  if (!sheet || !book) throw new Error('가격정리 양식 구조를 확인해주세요')
  const source = await sheet.async('string')
  const bookXml = await book.async('string')
  if (!bookXml.includes('name="X월"'))
    throw new Error('가격정리 양식의 X월 시트를 찾을 수 없습니다')
  const styles = new Map<string, string>()
  const third =
    source.match(/<row\b[^>]*\br="3"[^>]*>[\s\S]*?<\/row>/)?.[0] ?? ''
  for (const c of third.matchAll(/<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g)) {
    const col = c[1]?.match(/\br="([A-M])3"/)?.[1]
    if (col) styles.set(col, c[1]?.match(/\bs="(\d+)"/)?.[1] ?? '0')
  }
  const makeCells = (r: number) => {
    const row = rows[r - 3]
    if (!row) return ''
    return row.cells
      .map((value, i) => {
        const col = String.fromCharCode(65 + i)
        const attrs = `r="${col}${r}" s="${styles.get(col) ?? '0'}"`
        if (value === null) return `<c ${attrs}/>`
        return typeof value === 'number'
          ? `<c ${attrs}><v>${value}</v></c>`
          : `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`
      })
      .join('')
  }
  let maxRow = 1
  let output = source.replace(
    /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g,
    (whole: string, attrs: string, body: string | undefined) => {
      const r = Number(attrs.match(/\br="(\d+)"/)?.[1])
      maxRow = Math.max(maxRow, r)
      if (r < 2) return whole
      const rest = (body ?? '').replace(
        /<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g,
        (cell: string, a: string) => {
          if (!/^[A-M]\d+$/.test(a.match(/\br="([A-Z]+\d+)"/)?.[1] ?? ''))
            return cell
          return rows[r - 3] ? '' : `<c${a.replace(/\s+t="[^"]*"/g, '')}/>`
        }
      )
      return `<row${attrs}>${makeCells(r)}${rest}</row>`
    }
  )
  let added = ''
  for (let r = maxRow + 1; r <= rows.length + 2; r++)
    added += `<row r="${r}">${makeCells(r)}</row>`
  output = output
    .replace('</sheetData>', `${added}</sheetData>`)
    .replace(
      /<dimension\b[^>]*\/>/,
      `<dimension ref="A1:Z${Math.max(maxRow, rows.length + 2)}"/>`
    )
  zip.file('xl/worksheets/sheet1.xml', output)
  const calc = '<calcPr calcId="0" fullCalcOnLoad="1" forceFullCalc="1"/>'
  zip.file(
    'xl/workbook.xml',
    /<calcPr\b[^>]*\/>/.test(bookXml)
      ? bookXml.replace(/<calcPr\b[^>]*\/>/, calc)
      : bookXml.replace('</workbook>', `${calc}</workbook>`)
  )
  return zip.generateAsync({ type: 'uint8array' })
}
