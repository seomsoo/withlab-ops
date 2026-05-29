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

const pad2 = (v: string | number) => String(v).padStart(2, '0')

/**
 * 주문일/주문일시 셀 → DB timestamptz가 파싱 가능한 ISO 문자열로 정규화.
 * 두 가지 입력을 모두 처리한다:
 *  1) 숫자(엑셀 날짜 serial) — 토스가 주문일시를 셀 값은 숫자(46171.27...)로,
 *     화면 표시만 "2026. 05. 29. 06:29:30"으로 내보내는 케이스.
 *  2) 문자열 — "2026. 05. 29. 06:29:30"(점), "2026-05-12 07:04:35"(하이픈),
 *     "2026. 06. 02."(시각 없음) 등 구분자 무관.
 * 결과는 "YYYY-MM-DD" 또는 "YYYY-MM-DD HH:MM:SS".
 * 연-월-일을 확신할 수 없으면 빈 문자열 반환 → order_date는 null로 저장되어 insert가 깨지지 않음.
 */
export function cellToDateString(value: unknown): string {
  if (value == null || value === '') return ''

  // 1) 엑셀 날짜 serial (숫자)
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value)
    if (!d || !d.y) return ''
    const date = `${d.y}-${pad2(d.m)}-${pad2(d.d)}`
    if (d.H === 0 && d.M === 0 && d.S === 0) return date
    return `${date} ${pad2(d.H)}:${pad2(d.M)}:${pad2(d.S)}`
  }

  // 2) 문자열 — 구분자(점/하이픈/슬래시/공백) 무관하게 연·월·일·(시·분·초) 추출
  const m = String(value).match(
    /(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}))?)?/
  )
  if (!m) return ''
  const [, y, mo, d, h, mi, s] = m
  const date = `${y}-${pad2(mo!)}-${pad2(d!)}`
  if (h == null) return date
  return `${date} ${pad2(h)}:${pad2(mi!)}:${pad2(s ?? '0')}`
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
