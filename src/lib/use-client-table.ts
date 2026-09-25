import { useState } from "react"

export function useClientTable<T>(rows: T[], resetKey: string, pageSize = 8) {
  const [page, setPage] = useState(1)
  const [seenKey, setSeenKey] = useState(resetKey)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))

  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setPage(1)
  }

  const current = Math.min(page, pages)
  const start = (current - 1) * pageSize
  return {
    page: current,
    pages,
    slice: rows.slice(start, start + pageSize),
    setPage,
    total: rows.length,
    from: rows.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, rows.length),
  }
}
