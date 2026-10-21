import crest from "@/assets/cls-crest.png"
import { cn } from "@/lib/utils"

import type { DocColumn, PrintableDocument } from "./document-model"
import { formatDocDate } from "./document-model"

const ALIGN: Record<NonNullable<DocColumn["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

/** Paper-like, on-screen rendering of the same layout the PDF uses. */
export function DocumentPreview({ doc }: { doc: PrintableDocument }) {
  return (
    <article className="mx-auto w-full max-w-[880px] rounded-lg border border-[var(--cls-border)] bg-white px-8 py-7 text-[13px] text-[var(--cls-ink)] shadow-sm">
      <header className="flex items-center gap-4 border-b-2 border-[var(--primary-color)] pb-3">
        <img src={crest} alt="" className="size-14 object-contain" />
        <div>
          <p className="text-xl font-bold text-[var(--primary-hover)]">{doc.schoolName}</p>
          <p className="text-xs text-[var(--cls-muted)]">Examination department</p>
        </div>
      </header>

      <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold tracking-wide uppercase">{doc.title}</h2>
        {doc.provisional ? (
          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Provisional · not yet published
          </span>
        ) : null}
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-[var(--brand-border)] bg-[var(--secondary-color)] px-4 py-3 sm:grid-cols-4">
        {doc.facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-[10px] tracking-wide text-[var(--cls-muted)] uppercase">{fact.label}</dt>
            <dd className="font-semibold">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {doc.tables.map((table, index) => (
        <section key={table.heading ?? index} className="mb-5">
          {table.heading ? (
            <h3 className="mb-2 font-semibold text-[var(--primary-hover)]">{table.heading}</h3>
          ) : null}
          <div className="overflow-x-auto rounded-md border border-[var(--cls-border)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--primary-color)] text-[11px] text-white">
                  {table.columns.map((column) => (
                    <th
                      key={column.key}
                      className={cn("px-2 py-2 font-semibold whitespace-nowrap", ALIGN[column.align ?? "left"])}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-[var(--cls-border)] even:bg-slate-50">
                    {table.columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn("px-2 py-1.5 whitespace-pre-line", ALIGN[column.align ?? "left"])}
                      >
                        {row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
                {!table.rows.length ? (
                  <tr>
                    <td colSpan={table.columns.length} className="px-2 py-3 text-[var(--cls-muted)]">
                      No students on this sheet yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {table.caption ? <p className="mt-1.5 text-[11px] text-[var(--cls-muted)]">{table.caption}</p> : null}
        </section>
      ))}

      {doc.summary.length ? (
        <dl className="grid grid-cols-2 divide-[var(--brand-border)] overflow-hidden rounded-md border border-[var(--primary-color)] sm:grid-cols-5 sm:divide-x">
          {doc.summary.map((fact) => (
            <div key={fact.label} className="px-3 py-2">
              <dt className="text-[10px] tracking-wide text-[var(--cls-muted)] uppercase">{fact.label}</dt>
              <dd className="text-base font-bold text-[var(--primary-hover)]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-14 grid grid-cols-3 gap-10">
        {doc.signatures.map((label) => (
          <p key={label} className="border-t border-[var(--cls-ink)] pt-1 text-center text-xs text-[var(--cls-muted)]">
            {label}
          </p>
        ))}
      </div>

      <footer className="mt-6 border-t border-[var(--cls-border)] pt-2 text-[11px] text-[var(--cls-muted)]">
        {doc.schoolName} · Generated {formatDocDate(doc.generatedAt)}
      </footer>
    </article>
  )
}
