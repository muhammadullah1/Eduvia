import { useEffect, useMemo, useState } from "react"

import type { PaginationWithHandlers } from "@/components/common/pagination-component"
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination"

export function useClientPagination<T>(
  items: T[],
  options?: { initialPageSize?: number }
) {
  const initialPageSize = options?.initialPageSize ?? DEFAULT_PAGE_SIZE
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  useEffect(() => {
    setPage(1)
  }, [items])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const pagination: PaginationWithHandlers = useMemo(
    () => ({
      total,
      page,
      pageSize,
      totalPages,
      onPageChange: setPage,
      onPageSizeChange: (size: number) => {
        setPageSize(size)
        setPage(1)
      },
    }),
    [total, page, pageSize, totalPages]
  )

  return { paginatedItems, pagination, page, pageSize, setPage }
}
