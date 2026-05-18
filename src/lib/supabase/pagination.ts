export const SUPABASE_PAGE_SIZE = 1000
export const SUPABASE_WRITE_BATCH_SIZE = 500

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  errorPrefix: string,
  options: { pageSize?: number; maxRows?: number } = {}
): Promise<T[]> {
  const pageSize = options.pageSize ?? SUPABASE_PAGE_SIZE
  const allRows: T[] = []
  let from = 0

  while (true) {
    const remaining =
      options.maxRows === undefined
        ? pageSize
        : options.maxRows - allRows.length
    if (remaining <= 0) break

    const currentPageSize = Math.min(pageSize, remaining)
    const { data, error } = await fetchPage(from, from + currentPageSize - 1)

    if (error) throw new Error(`${errorPrefix}: ${error.message}`)

    const rows = data ?? []
    allRows.push(...rows)
    if (rows.length < currentPageSize) break
    from += currentPageSize
  }

  return allRows
}

export function chunkArray<T>(
  items: T[],
  size = SUPABASE_WRITE_BATCH_SIZE
): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
