import type { CourierMapping, Platform } from '@/types'

export function convertCourierName(
  trackingCompany: string,
  sourceSupplierId: string,
  platform: Platform,
  courierMappings: CourierMapping[]
): { name: string; isMapped: boolean } {
  const mapping = courierMappings.find(
    (m) =>
      m.sourceSupplierId === sourceSupplierId &&
      m.sourceName === trackingCompany
  )

  if (!mapping) {
    return { name: trackingCompany, isMapped: false }
  }

  return {
    name: platform === 'coupang' ? mapping.coupangName : mapping.tossName,
    isMapped: true,
  }
}
