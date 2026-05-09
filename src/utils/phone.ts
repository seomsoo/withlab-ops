export function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function formatHyphen(digits: string): string {
  const d = digits.replace(/\D/g, '')

  if (d.startsWith('02')) {
    if (d.length === 9) {
      return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    }
    if (d.length === 10) {
      return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
    }
  }

  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  }

  if (d.length === 11) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  }

  if (d.length === 12) {
    return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`
  }

  return d
}

export function applyPhoneFormat(
  value: string,
  format: 'raw' | 'hyphen' | 'digits' = 'raw'
): string {
  if (format === 'raw') {
    return value
  }
  if (format === 'digits') {
    return extractDigits(value)
  }
  return formatHyphen(extractDigits(value))
}
