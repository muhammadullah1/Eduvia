import type { FeeReport, FeeReportColumn } from "@/api/fees/fee-reports.service"
import { type PrintBrand, printDocument } from "@/lib/print"

export const isNumeric = (column: FeeReportColumn) =>
  column.type === "money" || column.type === "number" || column.type === "percent"

export function reportCell(value: string | number | null | undefined, type?: string) {
  if (value === null || value === undefined || value === "") return "—"
  if (type === "money") return Number(value).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  if (type === "percent") return `${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%`
  return String(value)
}

/** Every row (not just the visible page) with the filters and totals, through the portal print window. */
export function printReport(report: FeeReport, brand: PrintBrand) {
  const lines = [
    ...report.meta.map(([label, value]) => `${label}: ${value}`),
    ...(report.summary ?? []).map(([label, value]) => `${label}: ${value}`),
  ]
  return printDocument(report.title, lines, {
    columns: report.columns.map((c) => c.label),
    rows: report.rows.map((row) => report.columns.map((c) => reportCell(row[c.key], c.type))),
  }, brand)
}
