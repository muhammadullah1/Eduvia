import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * Keeps a page's sub-tab in the URL (`?tab=`), so deep links, refresh and
 * browser back/forward all land on the same tab. Unknown values fall back to
 * the first allowed tab. Other query params are kept as they are.
 */
export function useUrlTab<T extends string>(allowed: readonly T[], param = "tab"): [T, (next: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(param)
  const fallback = allowed[0]
  const tab = (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback
  const setTab = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (next === fallback) out.delete(param)
          else out.set(param, next)
          return out
        },
        { replace: false }
      )
    },
    [setSearchParams, param, fallback]
  )
  return [tab, setTab]
}
