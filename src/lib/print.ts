function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] as string
  )
}

export type PrintTable = { columns: string[]; rows: string[][] }

/** Letterhead and closing lines: the school's own name (Settings → School profile) and, on receipts, the receipt template. */
export type PrintBrand = { school?: string; logoUrl?: string | null; footer?: string[] }

/** Opens a clean, printable page (receipt or day sheet) and triggers the print dialog. */
export function printDocument(
  title: string,
  lines: string[],
  table?: PrintTable,
  brand: PrintBrand = {}
) {
  const win = window.open("", "_blank", "width=820,height=900")
  if (!win) return false
  const head = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
  let letterhead = ""
  if (brand.school) letterhead = `<h1>${escapeHtml(brand.school)}</h1>`
  if (brand.school && brand.logoUrl) {
    letterhead = `<div class="brand"><img src="${escapeHtml(brand.logoUrl)}" alt="" />${letterhead}</div>`
  }
  const foot = (brand.footer ?? []).map((line) => `<p class="foot">${escapeHtml(line)}</p>`).join("")
  const grid = table
    ? `<table><thead><tr>${table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${table.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody></table>`
    : ""
  win.document
    .write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:system-ui,sans-serif;color:#102636;margin:32px}
    h1{font-size:20px;margin:0 0 4px;color:#0f4c5c} p{margin:2px 0;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}
    th,td{border:1px solid #cfd8dc;padding:6px 8px;text-align:left} th{background:#eef4f5}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:6px} .brand img{width:48px;height:48px;object-fit:contain}
    .foot{margin-top:18px;color:#4a5b66}
  </style></head><body>${letterhead}<p><strong>${escapeHtml(title)}</strong></p>${head}${grid}${foot}</body></html>`)
  win.document.close()
  win.focus()
  win.print()
  return true
}
