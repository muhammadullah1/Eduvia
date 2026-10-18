export function parseInterviewScore(raw: string) {
  const value = String(raw || "").trim()
  const pair = value.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (pair) {
    return { obtained: pair[1], total: pair[2] }
  }
  if (/^\d+$/.test(value)) {
    return { obtained: value, total: "" }
  }
  return { obtained: "", total: "" }
}

export function formatInterviewScore(obtained: string, total: string) {
  const o = obtained.replace(/\D/g, "")
  const t = total.replace(/\D/g, "")
  if (!o && !t) return ""
  if (o && t) return `${o}/${t}`
  return o
}

export function interviewMarksError(obtained: string, total: string) {
  const o = obtained.replace(/\D/g, "")
  const t = total.replace(/\D/g, "")
  if (!o && !t) return null
  if (o && !t) return "Enter total marks, or leave both blank if not assessed yet."
  if (!o && t) return "Enter obtained marks, or leave both blank."
  if (Number(o) > Number(t)) {
    return "Obtained marks cannot be greater than total marks."
  }
  return null
}

export function marksDigitsOnly(value: string, maxLen = 4) {
  return value.replace(/\D/g, "").slice(0, maxLen)
}
