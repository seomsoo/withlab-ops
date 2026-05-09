export const ALLOWED_EXCEL_EXTENSIONS = ['xlsx', 'xls'] as const

export const MAX_UPLOAD_SIZE_MB = 10

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1]!.toLowerCase()
}

export function assertFileSize(file: File, maxMb: number): void {
  const maxBytes = maxMb * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(`파일 크기가 ${maxMb}MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
  }
}

export function validateExcelFile(file: File, maxSizeMb?: number): void {
  const ext = getFileExtension(file.name)
  const allowed: readonly string[] = ALLOWED_EXCEL_EXTENSIONS
  if (!allowed.includes(ext)) {
    throw new Error(
      `허용되지 않는 파일 형식입니다: .${ext} (허용: .xlsx, .xls)`
    )
  }
  assertFileSize(file, maxSizeMb ?? MAX_UPLOAD_SIZE_MB)
}
