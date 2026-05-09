import * as XLSX from 'xlsx'

export function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      if (!data) {
        reject(new Error('파일을 읽을 수 없습니다'))
        return
      }
      const workbook = XLSX.read(data, { type: 'array' })
      resolve(workbook)
    }
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}

export function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  })
}

/** 디버깅/검증/에러 메시지용으로만 사용. 실제 파서 컬럼 매핑은 0-based 인덱스 상수로 한다. */
export function buildHeaderMap(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = 0; i < headerRow.length; i++) {
    const value = headerRow[i]
    if (value != null && String(value).trim() !== '') {
      map.set(String(value).trim(), i)
    }
  }
  return map
}

export function cellToString(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

export function cellToInt(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  return n
}

export function isEmptyRow(row: unknown[]): boolean {
  return row.every(
    (cell) => cell == null || String(cell).trim() === ''
  )
}
