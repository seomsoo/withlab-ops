export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildPurchaseOrderFileName(
  supplierName: string,
  date?: Date
): string {
  const d = date ?? new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${supplierName}_발주서_${yyyy}${mm}${dd}.xlsx`
}

export function buildTrackingExportFileName(
  platform: 'coupang' | 'toss',
  date?: Date
): string {
  const d = date ?? new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const label = platform === 'coupang' ? '쿠팡' : '토스'
  return `${label}_운송장_${yyyy}${mm}${dd}.xlsx`
}
