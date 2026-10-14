/** Shorten class labels for dense table chips (CLS-style). */
export function shortenClassLabel(label: string) {
  const trimmed = label.trim()
  const classMatch = /^class\s+(\d+)/i.exec(trimmed)
  if (classMatch) return `Cl.${classMatch[1]}`
  const gradeMatch = /^(\d+)/.exec(trimmed)
  if (gradeMatch && trimmed.length <= 6) return `Cl.${gradeMatch[1]}`
  return trimmed
}
