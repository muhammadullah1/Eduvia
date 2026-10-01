function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string)
}

export type PrintTable = { columns: string[]; rows: string[][] }

/** Opens a clean, printable page (receipt or day sheet) and triggers the print dialog. */
export function printDocument(title: string, lines: string[], table?: PrintTable) {
  const win = window.open("", "_blank", "width=820,height=900")
  if (!win) return false
  const head = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
  const grid = table
    ? `<table><thead><tr>${table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${table.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`
    : ""
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:system-ui,sans-serif;color:#102636;margin:32px}
    h1{font-size:20px;margin:0 0 4px;color:#0f4c5c} p{margin:2px 0;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}
    th,td{border:1px solid #cfd8dc;padding:6px 8px;text-align:left} th{background:#eef4f5}
  </style></head><body><h1>Creative Leaders School</h1><p><strong>${escapeHtml(title)}</strong></p>${head}${grid}</body></html>`)
  win.document.close()
  win.focus()
  win.print()
  return true
}
