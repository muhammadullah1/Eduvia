import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { ALL_ROLES } from "@/lib/auth"
import { PERMISSION_ENTRIES, ROLE_LABELS } from "@/lib/permissions"

export function RolesPanel() {
  const [search, setSearch] = useState("")

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return PERMISSION_ENTRIES
    return PERMISSION_ENTRIES.filter(([key]) => key.toLowerCase().includes(q))
  }, [search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-[var(--cls-muted)]">
          CLS uses fixed school roles. This matrix is the product capability view —
          the API enforces the same rules at every endpoint. Attendance is a product
          permission, not a settings page. Fine-grained per-user grants are not part
          of this product.
        </p>
        <div className="w-full sm:w-72">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search capabilities (e.g. fee, exam)..."
            aria-label="Search capabilities"
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--cls-muted)]">
        <span>
          Showing {filteredEntries.length} of {PERMISSION_ENTRIES.length} capabilities
        </span>
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-[var(--cls-brand)] hover:underline"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--cls-border)] bg-white shadow-xs">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--page-wash)] text-xs uppercase tracking-wider text-[var(--cls-muted)]">
            <tr>
              <th className="px-3.5 py-2.5 font-semibold">Capability</th>
              {ALL_ROLES.map((role) => (
                <th key={role} className="px-3.5 py-2.5 font-semibold">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cls-border)]">
            {filteredEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={ALL_ROLES.length + 1}
                  className="px-4 py-8 text-center text-sm text-[var(--cls-muted)]"
                >
                  No capabilities match &ldquo;{search}&rdquo;.
                </td>
              </tr>
            ) : (
              filteredEntries.map(([key, roles]) => (
                <tr
                  key={key}
                  className="transition-colors hover:bg-[var(--page-wash)]/50"
                >
                  <td className="px-3.5 py-2.5 font-mono text-xs font-medium text-[var(--cls-ink)]">
                    {key}
                  </td>
                  {ALL_ROLES.map((role) => (
                    <td key={role} className="px-3.5 py-2.5">
                      {roles.includes(role) ? (
                        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Yes
                        </span>
                      ) : (
                        <span className="text-[var(--cls-muted)]/60">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
