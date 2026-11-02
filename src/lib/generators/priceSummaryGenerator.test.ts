import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { describe, it, expect } from 'vitest'
import { generatePriceSummary } from './priceSummaryGenerator'
import type { PriceRow } from '@/lib/priceSummary/model'
const row: PriceRow = {
  id: '1',
  supplier: '',
  unitPrice: 9000,
  issues: [],
  cells: [
    '택배',
    '000123',
    '2026-10-29',
    '00123',
    '테스트',
    '=상품<&',
    '옵션',
    3,
    '010-0000-0000',
    '01234',
    '주소',
    27000,
    30000,
  ],
}
describe('가격정리 양식 출력', () => {
  it('예시를 지우고 3행부터 출력하며 나머지 셀과 수식을 보존한다', async () => {
    const source = await readFile('templates/price-summary-v1.xlsx')
    const result = await generatePriceSummary(Uint8Array.from(source).buffer, [
      row,
    ])
    const workbook = XLSX.read(result, { type: 'array' })
    const sheet = workbook.Sheets['X월']!
    expect(sheet.A2?.v).toBeUndefined()
    expect(sheet.L3?.v).toBe(27000)
    expect(sheet.M3?.v).toBe(30000)
    expect(sheet.J3?.v).toBe('01234')
    expect(sheet.F3?.v).toBe('=상품<&')
    expect(sheet.F3?.f).toBeUndefined()
    const original = await JSZip.loadAsync(source)
    const output = await JSZip.loadAsync(result)
    const before = await original
      .file('xl/worksheets/sheet1.xml')!
      .async('string')
    const after = await output.file('xl/worksheets/sheet1.xml')!.async('string')
    const untouched = (s: string) =>
      [...s.matchAll(/<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g)]
        .filter((m) =>
          /^([N-Z]|[A-Z]{2,})\d+$/.test(
            m[1]?.match(/\br="([A-Z]+\d+)"/)?.[1] ?? ''
          )
        )
        .map((m) => m[0])
    expect(untouched(after)).toEqual(untouched(before))
    const originalStyles = await original.file('xl/styles.xml')!.async('string')
    const outputStyles = await output.file('xl/styles.xml')!.async('string')
    const oldCount = Number(
      originalStyles.match(/<dxfs\b[^>]*count="(\d+)"/)?.[1]
    )
    const redFont = '<dxf><font><color rgb="FFFF0000"/></font></dxf>'
    expect(outputStyles).toContain(`${redFont}</dxfs>`)
    expect(
      outputStyles
        .replace(`${redFont}</dxfs>`, '</dxfs>')
        .replace(`<dxfs count="${oldCount + 1}"`, `<dxfs count="${oldCount}"`)
    ).toBe(originalStyles)
    expect(after).toContain(
      `sqref="P3:P1048576"><cfRule type="expression" dxfId="${oldCount}"`
    )
    expect(after).toContain('<formula>AND(ISNUMBER(P3),P3&lt;0)</formula>')
    expect(after.indexOf('<conditionalFormatting')).toBeLessThan(
      after.indexOf('<dataValidations')
    )
  })
  it('양식보다 많은 주문도 끝까지 출력한다', async () => {
    const source = await readFile('templates/price-summary-v1.xlsx')
    const result = await generatePriceSummary(
      Uint8Array.from(source).buffer,
      Array.from({ length: 3800 }, (_, i) => ({ ...row, id: String(i) }))
    )
    const sheet = XLSX.read(result, { type: 'array' }).Sheets['X월']!
    expect(sheet.L3802?.v).toBe(27000)
  })
})
