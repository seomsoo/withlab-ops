import { z } from 'zod/v4'

import type {
  ProductMapping,
  NameMapping,
  CourierMapping,
  SupplierProductTemplate,
  SupplierProduct,
  FruitDictionary,
  SynonymGroup,
} from '@/types'

const platformSchema = z.enum(['coupang', 'toss'])
const platformWithCommonSchema = z.enum(['coupang', 'toss', 'common'])
const allocationStatusSchema = z.enum(['pending', 'ordered'])
const trackingStatusSchema = z.enum([
  'matched',
  'unmatched',
  'duplicated',
  'invalid',
])
const workSessionStatusSchema = z.enum(['active', 'ordered', 'completed'])
const phoneFormatSchema = z.enum(['raw', 'hyphen', 'digits'])
const systemFieldSchema = z.enum([
  'matchingKey',
  'orderNo',
  'orderItemNo',
  'supplierProductName',
  'supplierProductCode',
  'platformProductName',
  'quantity',
  'recipientName',
  'recipientPhone',
  'zipCode',
  'address',
  'deliveryMessage',
  'buyerName',
  'buyerPhone',
  'orderDate',
  'senderAddress',
  'empty',
])

const stockStatusSchema = z.enum(['available', 'soldout', 'unknown'])
const supplierProductSystemFieldSchema = z.enum([
  'productCode',
  'productName',
  'optionName',
  'category',
  'price',
  'stockStatus',
  'courier',
  'empty',
])

const uuidString = z.uuid()

export const standardOrderSchema = z.object({
  id: uuidString,
  platform: platformSchema,
  orderNo: z.string(),
  orderItemNo: z.string(),
  matchingKey: z.string(),
  orderDate: z.string(),
  productName: z.string(),
  optionName: z.string(),
  displayProductName: z.string(),
  quantity: z.number().int().min(1),
  buyerName: z.string(),
  buyerPhone: z.string(),
  buyerPhoneDigits: z.string(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  recipientPhoneDigits: z.string(),
  zipCode: z.string(),
  address: z.string(),
  deliveryMessage: z.string(),
  raw: z.record(z.string(), z.unknown()),
  rawValues: z.array(z.unknown()),
  rawRowNumber: z.number().int(),
})

export const allocationSchema = z.object({
  id: uuidString,
  orderId: uuidString,
  supplierId: uuidString,
  supplierProductName: z.string(),
  supplierProductCode: z.string().optional(),
  allocatedQuantity: z.number().int().min(1),
  status: allocationStatusSchema,
  isTemporaryOverride: z.boolean(),
  nameMappingApplied: z.boolean(),
  smartAllocationApplied: z.boolean(),
  supplierPrice: z.number().optional(),
  createdAt: z.string(),
  orderedAt: z.string().optional(),
})

export const trackingSchema = z.object({
  id: uuidString,
  allocationId: uuidString.nullable(),
  status: trackingStatusSchema,
  invalidReason: z.string().optional(),
  trackingCompany: z.string(),
  trackingNumber: z.string(),
  sourceSupplierId: uuidString,
  rawOrderKey: z.string(),
  raw: z.record(z.string(), z.unknown()),
  rawRowNumber: z.number().int(),
  uploadedAt: z.string(),
  matchedAt: z.string().optional(),
})

export const supplierSchema = z.object({
  id: uuidString,
  name: z.string(),
  contact: z.string().optional(),
  memo: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// --- 폼 스키마 헬퍼 ---
const requiredTrimmedString = (message: string) =>
  z.string().trim().min(1, message)

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((v) => v?.trim() ?? '')

const requiredUuid = (message: string) =>
  z.string().min(1, message).uuid('올바른 값을 선택해주세요')

export const supplierFormSchema = z.object({
  name: requiredTrimmedString('공급처명을 입력해주세요'),
  contact: optionalTrimmedString,
  memo: optionalTrimmedString,
})

export const productMappingSchema = z.object({
  id: uuidString,
  platform: platformWithCommonSchema,
  productName: z.string(),
  optionName: z.string(),
  supplierId: uuidString,
  isDefault: z.boolean(),
  priority: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const nameMappingSchema = z.object({
  id: uuidString,
  platform: platformWithCommonSchema,
  platformProductName: z.string(),
  platformOptionName: z.string(),
  supplierId: uuidString,
  supplierProductName: z.string(),
  supplierProductCode: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const courierMappingSchema = z.object({
  id: uuidString,
  sourceSupplierId: uuidString,
  sourceName: z.string(),
  coupangName: z.string(),
  tossName: z.string(),
  createdAt: z.string(),
})

export type SupplierFormData = z.infer<typeof supplierFormSchema>

export const productMappingFormSchema = z.object({
  platform: platformWithCommonSchema,
  productName: requiredTrimmedString('상품명을 입력해주세요'),
  optionName: optionalTrimmedString,
  supplierId: requiredUuid('공급처를 선택해주세요'),
  isDefault: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(999).default(0),
})

export type ProductMappingFormData = z.infer<typeof productMappingFormSchema>

export const nameMappingFormSchema = z.object({
  platform: platformWithCommonSchema,
  platformProductName: requiredTrimmedString('플랫폼 상품명을 입력해주세요'),
  platformOptionName: optionalTrimmedString,
  supplierId: requiredUuid('공급처를 선택해주세요'),
  supplierProductName: requiredTrimmedString('공급처 상품명을 입력해주세요'),
  supplierProductCode: optionalTrimmedString,
})

export type NameMappingFormData = z.infer<typeof nameMappingFormSchema>

export const courierMappingFormSchema = z.object({
  sourceSupplierId: requiredUuid('공급처를 선택해주세요'),
  sourceName: requiredTrimmedString('원본 택배사명을 입력해주세요'),
  coupangName: requiredTrimmedString('쿠팡 택배사명을 입력해주세요'),
  tossName: requiredTrimmedString('토스 택배사명을 입력해주세요'),
})

export type CourierMappingFormData = z.infer<typeof courierMappingFormSchema>

// --- WithSupplier 타입 (join 결과) ---

export type ProductMappingWithSupplier = ProductMapping & {
  supplierName: string
  supplierIsActive: boolean
}

export type NameMappingWithSupplier = NameMapping & {
  supplierName: string
  supplierIsActive: boolean
}

export type CourierMappingWithSupplier = CourierMapping & {
  supplierName: string
  supplierIsActive: boolean
}

export const columnMappingItemSchema = z.object({
  targetColumnIndex: z.number().int(),
  targetHeaderName: z.string(),
  systemField: systemFieldSchema,
  format: phoneFormatSchema.optional(),
})

export const supplierTemplateSchema = z.object({
  id: uuidString,
  supplierId: uuidString,
  templatePath: z.string(),
  templateFileName: z.string(),
  sheetName: z.string(),
  headerRow: z.number().int(),
  dataStartRow: z.number().int(),
  columnMappings: z.array(columnMappingItemSchema),
})

export const platformTrackingTemplateSchema = z.object({
  id: uuidString,
  platform: platformSchema,
  templatePath: z.string(),
  templateFileName: z.string(),
  sheetName: z.string(),
  headerRow: z.number().int(),
  dataStartRow: z.number().int(),
  matchKeyColumnIndex: z.number().int(),
  matchKeyColumnName: z.string(),
  trackingCompanyColumnIndex: z.number().int(),
  trackingCompanyColumnName: z.string(),
  trackingNumberColumnIndex: z.number().int(),
  trackingNumberColumnName: z.string(),
  statusColumnIndex: z.number().int().optional(),
  statusColumnName: z.string().optional(),
  statusValue: z.string().optional(),
})

export const workSessionSchema = z.object({
  id: uuidString,
  name: z.string(),
  status: workSessionStatusSchema,
  createdAt: z.string(),
  createdBy: uuidString.optional(),
  completedAt: z.string().optional(),
})

export const invalidRowSchema = z.object({
  rowNumber: z.number().int(),
  reason: z.string(),
  rawData: z.array(z.unknown()),
})

export const duplicateRowSchema = z.object({
  rowNumber: z.number().int(),
  reason: z.string(),
  matchingKey: z.string(),
  firstRowNumber: z.number().int(),
  rawData: z.array(z.unknown()),
})

export const orderImportSchema = z.object({
  id: uuidString,
  workSessionId: uuidString,
  platform: platformSchema,
  fileName: z.string(),
  label: z.string(),
  totalRows: z.number().int(),
  validCount: z.number().int(),
  invalidCount: z.number().int(),
  duplicateCount: z.number().int(),
  invalidRows: z.array(invalidRowSchema),
  duplicateRows: z.array(duplicateRowSchema),
  uploadedBy: uuidString.optional(),
  uploadedAt: z.string(),
})

export const trackingImportSchema = z.object({
  id: uuidString,
  workSessionId: uuidString,
  sourceSupplierId: uuidString,
  fileName: z.string(),
  totalRows: z.number().int(),
  validCount: z.number().int(),
  invalidCount: z.number().int(),
  skippedRows: z.number().int(),
  detectedCourier: z.string().optional(),
  invalidRows: z.array(invalidRowSchema),
  uploadedBy: uuidString.optional(),
  uploadedAt: z.string(),
})

// --- DB Row 타입 (snake_case) ---

export type SupplierRow = {
  id: string
  name: string
  contact: string | null
  memo: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WorkSessionRow = {
  id: string
  name: string
  status: string
  created_at: string
  created_by: string | null
  completed_at: string | null
}

export type OrderRow = {
  id: string
  work_session_id: string
  order_import_id: string
  platform: string
  order_no: string
  order_item_no: string
  matching_key: string
  order_date: string | null
  product_name: string
  option_name: string
  display_product_name: string | null
  quantity: number
  buyer_name: string | null
  buyer_phone: string | null
  buyer_phone_digits: string | null
  recipient_name: string
  recipient_phone: string | null
  recipient_phone_digits: string | null
  zip_code: string | null
  address: string
  delivery_message: string | null
  raw: Record<string, unknown>
  raw_values: unknown[]
  raw_row_number: number
  created_at: string
}

export type AllocationRow = {
  id: string
  work_session_id: string
  order_id: string
  supplier_id: string
  supplier_product_name: string
  supplier_product_code: string | null
  allocated_quantity: number
  status: string
  is_temporary_override: boolean
  name_mapping_applied: boolean
  smart_allocation_applied: boolean
  supplier_price: number | null
  allocation_reason: string | null
  created_at: string
  ordered_at: string | null
}

export type TrackingRow = {
  id: string
  work_session_id: string
  tracking_import_id: string
  allocation_id: string | null
  status: string
  invalid_reason: string | null
  ignored: boolean
  ignored_reason: string | null
  tracking_company: string | null
  tracking_number: string | null
  source_supplier_id: string
  raw_order_key: string | null
  raw: Record<string, unknown>
  raw_row_number: number
  uploaded_at: string
  matched_at: string | null
}

export type OrderImportRow = {
  id: string
  work_session_id: string
  platform: string
  file_name: string
  label: string
  total_rows: number
  valid_count: number
  invalid_count: number
  duplicate_count: number
  invalid_rows: unknown
  duplicate_rows: unknown
  uploaded_by: string | null
  uploaded_at: string
}

export type TrackingImportRow = {
  id: string
  work_session_id: string
  source_supplier_id: string
  file_name: string
  total_rows: number
  valid_count: number
  invalid_count: number
  skipped_rows: number
  detected_courier: string | null
  invalid_rows: unknown
  uploaded_by: string | null
  uploaded_at: string
}

export type ProductMappingRow = {
  id: string
  platform: string
  product_name: string
  option_name: string
  supplier_id: string
  is_default: boolean
  priority: number
  created_at: string
  updated_at: string
}

export type NameMappingRow = {
  id: string
  platform: string
  platform_product_name: string
  platform_option_name: string
  supplier_id: string
  supplier_product_name: string
  supplier_product_code: string | null
  created_at: string
  updated_at: string
}

export type CourierMappingRow = {
  id: string
  source_supplier_id: string
  source_name: string
  coupang_name: string
  toss_name: string
  created_at: string
}

export type SupplierTemplateRow = {
  id: string
  supplier_id: string
  template_path: string
  template_file_name: string
  sheet_name: string
  header_row: number
  data_start_row: number
  column_mappings: unknown
  created_at: string
  updated_at: string
}

export type PlatformTemplateRow = {
  id: string
  platform: string
  template_path: string
  template_file_name: string
  sheet_name: string
  header_row: number
  data_start_row: number
  match_key_column_index: number
  match_key_column_name: string
  tracking_company_column_index: number
  tracking_company_column_name: string
  tracking_number_column_index: number
  tracking_number_column_name: string
  status_column_index: number | null
  status_column_name: string | null
  status_value: string | null
  created_at: string
  updated_at: string
}

export type SupplierProductTemplateRow = {
  id: string
  supplier_id: string
  template_path: string
  template_file_name: string
  sheet_name: string
  header_row: number
  data_start_row: number
  column_mappings: unknown
  last_uploaded_file_name: string | null
  last_uploaded_at: string | null
  last_uploaded_count: number
  last_invalid_count: number
  created_at: string
  updated_at: string
}

export type SupplierProductRow = {
  id: string
  supplier_id: string
  product_code: string
  product_name: string
  option_name: string
  category: string
  price: number | null
  stock_status: string
  stock_raw: string
  courier: string
  extra: Record<string, unknown>
  uploaded_at: string
}

// --- snake_case → camelCase 변환 함수 ---

export function toSupplier(row: SupplierRow) {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact ?? undefined,
    memo: row.memo ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toWorkSession(row: WorkSessionRow) {
  return {
    id: row.id,
    name: row.name,
    status: row.status as 'active' | 'ordered' | 'completed',
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    completedAt: row.completed_at ?? undefined,
  }
}

export function toStandardOrder(row: OrderRow) {
  return {
    id: row.id,
    platform: row.platform as 'coupang' | 'toss',
    orderNo: row.order_no,
    orderItemNo: row.order_item_no,
    matchingKey: row.matching_key,
    orderDate: row.order_date ?? '',
    productName: row.product_name,
    optionName: row.option_name,
    displayProductName: row.display_product_name ?? '',
    quantity: row.quantity,
    buyerName: row.buyer_name ?? '',
    buyerPhone: row.buyer_phone ?? '',
    buyerPhoneDigits: row.buyer_phone_digits ?? '',
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone ?? '',
    recipientPhoneDigits: row.recipient_phone_digits ?? '',
    zipCode: row.zip_code ?? '',
    address: row.address,
    deliveryMessage: row.delivery_message ?? '',
    raw: row.raw,
    rawValues: row.raw_values,
    rawRowNumber: row.raw_row_number,
  }
}

export function toAllocation(row: AllocationRow) {
  return {
    id: row.id,
    orderId: row.order_id,
    supplierId: row.supplier_id,
    supplierProductName: row.supplier_product_name,
    supplierProductCode: row.supplier_product_code ?? undefined,
    allocatedQuantity: row.allocated_quantity,
    // as 사용 사유: DB text 컬럼 → 유니온 리터럴, check 제약으로 값 보장
    status: row.status as 'pending' | 'ordered',
    isTemporaryOverride: row.is_temporary_override,
    nameMappingApplied: row.name_mapping_applied,
    smartAllocationApplied: row.smart_allocation_applied,
    supplierPrice: row.supplier_price ?? undefined,
    allocationReason: row.allocation_reason ?? undefined,
    createdAt: row.created_at,
    orderedAt: row.ordered_at ?? undefined,
  }
}

export function toTracking(row: TrackingRow) {
  return {
    id: row.id,
    allocationId: row.allocation_id,
    // as 사용 사유: DB text 컬럼 → 유니온 리터럴, check 제약으로 값 보장
    status: row.status as 'matched' | 'unmatched' | 'duplicated' | 'invalid',
    invalidReason: row.invalid_reason ?? undefined,
    ignored: row.ignored,
    ignoredReason: row.ignored_reason ?? undefined,
    trackingCompany: row.tracking_company ?? '',
    trackingNumber: row.tracking_number ?? '',
    sourceSupplierId: row.source_supplier_id,
    rawOrderKey: row.raw_order_key ?? '',
    raw: row.raw,
    rawRowNumber: row.raw_row_number,
    uploadedAt: row.uploaded_at,
    matchedAt: row.matched_at ?? undefined,
  }
}

export function toOrderImport(row: OrderImportRow) {
  return {
    id: row.id,
    workSessionId: row.work_session_id,
    // as 사용 사유: DB text 컬럼 → 유니온 리터럴, check 제약으로 값 보장
    platform: row.platform as 'coupang' | 'toss',
    fileName: row.file_name,
    label: row.label,
    totalRows: row.total_rows,
    validCount: row.valid_count,
    invalidCount: row.invalid_count,
    duplicateCount: row.duplicate_count,
    invalidRows: z.array(invalidRowSchema).parse(row.invalid_rows),
    duplicateRows: z.array(duplicateRowSchema).parse(row.duplicate_rows),
    uploadedBy: row.uploaded_by ?? undefined,
    uploadedAt: row.uploaded_at,
  }
}

export function toTrackingImport(row: TrackingImportRow) {
  return {
    id: row.id,
    workSessionId: row.work_session_id,
    sourceSupplierId: row.source_supplier_id,
    fileName: row.file_name,
    totalRows: row.total_rows,
    validCount: row.valid_count,
    invalidCount: row.invalid_count,
    skippedRows: row.skipped_rows,
    detectedCourier: row.detected_courier ?? undefined,
    invalidRows: z.array(invalidRowSchema).parse(row.invalid_rows),
    uploadedBy: row.uploaded_by ?? undefined,
    uploadedAt: row.uploaded_at,
  }
}

export function toProductMapping(row: ProductMappingRow) {
  return {
    id: row.id,
    // as 사용 사유: DB text 컬럼 → 유니온 리터럴, check 제약으로 값 보장
    platform: row.platform as 'coupang' | 'toss' | 'common',
    productName: row.product_name,
    optionName: row.option_name,
    supplierId: row.supplier_id,
    isDefault: row.is_default,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toNameMapping(row: NameMappingRow) {
  return {
    id: row.id,
    // as 사용 사유: DB text 컬럼 → 유니온 리터럴, check 제약으로 값 보장
    platform: row.platform as 'coupang' | 'toss' | 'common',
    platformProductName: row.platform_product_name,
    platformOptionName: row.platform_option_name,
    supplierId: row.supplier_id,
    supplierProductName: row.supplier_product_name,
    supplierProductCode: row.supplier_product_code ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toCourierMapping(row: CourierMappingRow) {
  return {
    id: row.id,
    sourceSupplierId: row.source_supplier_id,
    sourceName: row.source_name,
    coupangName: row.coupang_name,
    tossName: row.toss_name,
    createdAt: row.created_at,
  }
}

export function toSupplierTemplate(row: SupplierTemplateRow) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    templatePath: row.template_path,
    templateFileName: row.template_file_name,
    sheetName: row.sheet_name,
    headerRow: row.header_row,
    dataStartRow: row.data_start_row,
    columnMappings: z
      .array(columnMappingItemSchema)
      .parse(row.column_mappings),
  }
}

export function toPlatformTrackingTemplate(row: PlatformTemplateRow) {
  return {
    id: row.id,
    // as 사용 사유: DB text 컬럼 → 유니온 리터럴, unique + check 제약으로 값 보장
    platform: row.platform as 'coupang' | 'toss',
    templatePath: row.template_path,
    templateFileName: row.template_file_name,
    sheetName: row.sheet_name,
    headerRow: row.header_row,
    dataStartRow: row.data_start_row,
    matchKeyColumnIndex: row.match_key_column_index,
    matchKeyColumnName: row.match_key_column_name,
    trackingCompanyColumnIndex: row.tracking_company_column_index,
    trackingCompanyColumnName: row.tracking_company_column_name,
    trackingNumberColumnIndex: row.tracking_number_column_index,
    trackingNumberColumnName: row.tracking_number_column_name,
    statusColumnIndex: row.status_column_index ?? undefined,
    statusColumnName: row.status_column_name ?? undefined,
    statusValue: row.status_value ?? undefined,
  }
}

export const supplierProductColumnMappingSchema = z.object({
  targetColumnIndex: z.number().int(),
  targetHeaderName: z.string(),
  systemField: supplierProductSystemFieldSchema,
})

export const supplierProductTemplateSchema = z.object({
  id: uuidString,
  supplierId: uuidString,
  templatePath: z.string(),
  templateFileName: z.string(),
  sheetName: z.string(),
  headerRow: z.number().int(),
  dataStartRow: z.number().int(),
  columnMappings: z.array(supplierProductColumnMappingSchema),
  lastUploadedFileName: z.string().nullable(),
  lastUploadedAt: z.string().nullable(),
  lastUploadedCount: z.number(),
  lastInvalidCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const supplierProductSchema = z.object({
  id: uuidString,
  supplierId: uuidString,
  productCode: z.string(),
  productName: z.string(),
  optionName: z.string(),
  category: z.string(),
  price: z.number().nullable(),
  stockStatus: stockStatusSchema,
  stockRaw: z.string(),
  courier: z.string(),
  extra: z.record(z.string(), z.unknown()),
  uploadedAt: z.string(),
})

export function toSupplierProductTemplate(
  row: SupplierProductTemplateRow
): SupplierProductTemplate {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    templatePath: row.template_path,
    templateFileName: row.template_file_name,
    sheetName: row.sheet_name,
    headerRow: row.header_row,
    dataStartRow: row.data_start_row,
    columnMappings: z
      .array(supplierProductColumnMappingSchema)
      .parse(row.column_mappings),
    lastUploadedFileName: row.last_uploaded_file_name,
    lastUploadedAt: row.last_uploaded_at,
    lastUploadedCount: row.last_uploaded_count,
    lastInvalidCount: row.last_invalid_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toSupplierProduct(row: SupplierProductRow): SupplierProduct {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    productCode: row.product_code,
    productName: row.product_name,
    optionName: row.option_name,
    category: row.category,
    price: row.price,
    // as 사용 사유: DB text 컬럼 → 유니온 리터럴, check 제약으로 값 보장
    stockStatus: row.stock_status as 'available' | 'soldout' | 'unknown',
    stockRaw: row.stock_raw,
    courier: row.courier,
    extra: row.extra,
    uploadedAt: row.uploaded_at,
  }
}

// ── FruitDictionary ──

export type FruitDictionaryRow = {
  id: string
  category: string
  keywords: string[]
  grade_synonyms: Record<string, string[]>
  size_synonyms: Record<string, string[]>
  weight_aliases: Record<string, string[]>
  weight_mapping: Record<string, string>
  is_active: boolean
  created_at: string
  updated_at: string
}

function jsonbToSynonymGroups(
  jsonb: Record<string, string[]>
): SynonymGroup[] {
  return Object.entries(jsonb).map(([canonical, aliases]) => ({
    canonical,
    aliases,
  }))
}

function synonymGroupsToJsonb(
  groups: SynonymGroup[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const g of groups) {
    result[g.canonical] = g.aliases
  }
  return result
}

export function toFruitDictionary(row: FruitDictionaryRow): FruitDictionary {
  return {
    id: row.id,
    category: row.category,
    keywords: row.keywords,
    gradeSynonyms: jsonbToSynonymGroups(row.grade_synonyms),
    sizeSynonyms: jsonbToSynonymGroups(row.size_synonyms),
    weightAliases: row.weight_aliases,
    weightMapping: row.weight_mapping ?? {},
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromFruitDictionary(
  d: Omit<FruitDictionary, 'id' | 'createdAt' | 'updatedAt'>
) {
  return {
    category: d.category,
    keywords: d.keywords,
    grade_synonyms: synonymGroupsToJsonb(d.gradeSynonyms),
    size_synonyms: synonymGroupsToJsonb(d.sizeSynonyms),
    weight_aliases: d.weightAliases,
    weight_mapping: d.weightMapping,
    is_active: d.isActive,
  }
}

export const fruitDictionaryFormSchema = z.object({
  category: z.string().min(1, { message: '카테고리를 입력해주세요' }),
  keywords: z.array(z.string()).min(1, { message: '키워드를 1개 이상 입력해주세요' }),
  gradeSynonyms: z.array(
    z.object({
      canonical: z.string().min(1),
      aliases: z.array(z.string()),
    })
  ),
  sizeSynonyms: z.array(
    z.object({
      canonical: z.string().min(1),
      aliases: z.array(z.string()),
    })
  ),
  weightAliases: z.record(z.string(), z.array(z.string())),
  weightMapping: z.record(z.string(), z.string()),
})
