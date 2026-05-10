export type Platform = 'coupang' | 'toss'

export type AllocationStatus = 'pending' | 'ordered'

export type TrackingStatus = 'matched' | 'unmatched' | 'duplicated' | 'invalid'

export type WorkSessionStatus = 'active' | 'ordered' | 'completed'

export type PhoneFormat = 'raw' | 'hyphen' | 'digits'

export type SystemField =
  | 'matchingKey'
  | 'orderNo'
  | 'orderItemNo'
  | 'supplierProductName'
  | 'supplierProductCode'
  | 'quantity'
  | 'recipientName'
  | 'recipientPhone'
  | 'zipCode'
  | 'address'
  | 'deliveryMessage'
  | 'buyerName'
  | 'buyerPhone'
  | 'empty'

export type StandardOrder = {
  id: string
  platform: Platform
  orderNo: string
  orderItemNo: string
  matchingKey: string
  orderDate: string

  productName: string
  optionName: string
  quantity: number

  buyerName: string
  buyerPhone: string
  buyerPhoneDigits: string

  recipientName: string
  recipientPhone: string
  recipientPhoneDigits: string
  zipCode: string
  address: string
  deliveryMessage: string

  raw: Record<string, unknown>
  rawValues: unknown[]
  rawRowNumber: number
}

export type Allocation = {
  id: string
  orderId: string
  supplierId: string
  supplierProductName: string
  supplierProductCode?: string
  allocatedQuantity: number
  status: AllocationStatus
  isTemporaryOverride: boolean
  nameMappingApplied: boolean
  createdAt: string
  orderedAt?: string
}

export type Tracking = {
  id: string
  allocationId: string | null
  status: TrackingStatus
  invalidReason?: string

  trackingCompany: string
  trackingNumber: string

  sourceSupplierId: string
  rawOrderKey: string

  raw: Record<string, unknown>
  rawRowNumber: number
  uploadedAt: string
  matchedAt?: string
}

export type StandardPurchaseOrder = {
  id: string
  supplierId: string
  supplierName: string
  createdAt: string
  items: PurchaseOrderItem[]
}

export type PurchaseOrderItem = {
  allocationId: string
  orderId: string
  platform: Platform
  orderNo: string
  orderItemNo: string
  matchingKey: string

  supplierProductName: string
  supplierProductCode?: string
  quantity: number

  recipientName: string
  recipientPhone: string
  zipCode: string
  address: string
  deliveryMessage: string
  buyerName: string
  buyerPhone: string

  nameMappingApplied: boolean
}

export type StandardTrackingExport = {
  id: string
  platform: Platform
  createdAt: string
  items: TrackingExportItem[]
}

export type TrackingExportItem = {
  trackingId: string
  allocationId: string
  orderId: string
  orderNo: string
  orderItemNo: string
  matchingKey: string
  trackingCompany: string
  trackingNumber: string
  courierMapped: boolean
  originalRow: Record<string, unknown>
  originalRowValues: unknown[]
  originalRowNumber: number
}

export type Supplier = {
  id: string
  name: string
  contact?: string
  memo?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductMapping = {
  id: string
  platform: Platform | 'common'
  productName: string
  optionName: string
  supplierId: string
  isDefault: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

export type NameMapping = {
  id: string
  platform: Platform | 'common'
  platformProductName: string
  platformOptionName: string
  supplierId: string
  supplierProductName: string
  supplierProductCode?: string
  createdAt: string
  updatedAt: string
}

export type CourierMapping = {
  id: string
  sourceSupplierId: string
  sourceName: string
  coupangName: string
  tossName: string
  createdAt: string
}

export type ColumnMappingItem = {
  targetColumnIndex: number
  targetHeaderName: string
  systemField: SystemField
  format?: PhoneFormat
}

export type SupplierTemplate = {
  id: string
  supplierId: string
  templatePath: string
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  columnMappings: ColumnMappingItem[]
}

export type PlatformTrackingTemplate = {
  id: string
  platform: Platform
  templatePath: string
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  matchKeyColumnIndex: number
  matchKeyColumnName: string
  trackingCompanyColumnIndex: number
  trackingCompanyColumnName: string
  trackingNumberColumnIndex: number
  trackingNumberColumnName: string
  statusColumnIndex?: number
  statusColumnName?: string
  statusValue?: string
}

export type WorkSession = {
  id: string
  name: string
  status: WorkSessionStatus
  createdAt: string
  createdBy?: string
  completedAt?: string
}

export type OrderImport = {
  id: string
  workSessionId: string
  platform: Platform
  fileName: string
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  invalidRows: InvalidRow[]
  duplicateRows: DuplicateRow[]
  uploadedBy?: string
  uploadedAt: string
}

export type TrackingImport = {
  id: string
  workSessionId: string
  sourceSupplierId: string
  fileName: string
  totalRows: number
  validCount: number
  invalidCount: number
  skippedRows: number
  detectedCourier?: string
  invalidRows: InvalidRow[]
  uploadedBy?: string
  uploadedAt: string
}

export type InvalidRow = {
  rowNumber: number
  reason: string
  rawData: unknown[]
}

export type DuplicateRow = {
  rowNumber: number
  reason: string
  matchingKey: string
  firstRowNumber: number
  rawData: unknown[]
}

export type ParseMeta = {
  platform: Platform
  totalRows: number
  skippedRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
}

export type ParseResult = {
  orders: StandardOrder[]
  invalidRows: InvalidRow[]
  duplicateRows: DuplicateRow[]
  meta: ParseMeta
}

export type ParsedTracking = {
  rawOrderKey: string
  trackingCompany: string
  trackingNumber: string
  productName?: string
  recipientName?: string
  raw: Record<string, unknown>
  rawRowNumber: number
}

export type TrackingParseMeta = {
  totalRows: number
  validCount: number
  invalidCount: number
  skippedRows: number
  detectedCourier: string | null
}

export type TrackingParseResult = {
  trackings: ParsedTracking[]
  invalidRows: InvalidRow[]
  meta: TrackingParseMeta
}

export type MatchedTracking = ParsedTracking & {
  status: 'matched'
  allocationId: string
  orderId: string
}

export type UnmatchedTracking = ParsedTracking & {
  status: 'unmatched'
  invalidReason: string
}

export type DuplicatedTracking = ParsedTracking & {
  status: 'duplicated'
  invalidReason: string
  allocationId: string
}

export type InvalidTracking = ParsedTracking & {
  status: 'invalid'
  invalidReason: string
}

export type MatchingResult = {
  matched: MatchedTracking[]
  unmatched: UnmatchedTracking[]
  duplicated: DuplicatedTracking[]
  invalid: InvalidTracking[]
}

export type TrackingStats = {
  total: number
  matched: number
  unmatched: number
  duplicated: number
  invalid: number
}

export type CourierWarning = {
  trackingId: string
  platform: Platform
  supplierId: string
  supplierName: string
  originalCourier: string
  trackingNumber: string
}

export type OrderGroup = {
  productName: string
  optionName: string
  platform: Platform
  orders: StandardOrder[]
  totalQuantity: number
}
