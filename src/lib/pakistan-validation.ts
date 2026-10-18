/** Pakistani CNIC: 13 digits, display XXXXX-XXXXXXX-X */

const CNIC_DIGITS_ONLY = /^\d{13}$/

export function cnicDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 13)
}

export function formatCnic(value: string) {
  const d = cnicDigits(value)
  if (d.length <= 5) return d
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
}

export function isValidCnic(value: string) {
  return CNIC_DIGITS_ONLY.test(cnicDigits(value))
}

export function cnicError(value: string) {
  const d = cnicDigits(value)
  if (!d) return "CNIC is required."
  if (!CNIC_DIGITS_ONLY.test(d)) return "Enter a valid 13-digit CNIC (XXXXX-XXXXXXX-X)."
  return null
}

/** Mobile: 03XXXXXXXXX (11 digits) or normalize +92… */

export function phoneDigitsPk(value: string) {
  let raw = value.replace(/[^\d+]/g, "")
  if (raw.startsWith("+92")) raw = raw.slice(3)
  if (raw.startsWith("92") && raw.length >= 12) raw = raw.slice(2)
  if (raw.startsWith("0")) raw = raw.slice(1)
  return raw.replace(/\D/g, "").slice(0, 10)
}

export function formatPhonePk(value: string) {
  const d = phoneDigitsPk(value)
  if (!d) return ""
  return `0${d}`
}

export function normalizePhonePk(value: string) {
  return formatPhonePk(value)
}

export function isValidPhonePk(value: string) {
  const d = phoneDigitsPk(value)
  return /^3\d{9}$/.test(d)
}

export function phonePkError(value: string, label = "Phone number") {
  const trimmed = value.trim()
  if (!trimmed) return `${label} is required.`
  const invalidChars = trimmed.replace(/[\d\s+\-()]/g, "")
  if (invalidChars.length > 0) {
    return `${label} can only include digits, spaces, +, -, and parentheses.`
  }
  if (!isValidPhonePk(trimmed)) {
    return `${label} must be a valid Pakistani mobile (e.g. 03XX XXXXXXX).`
  }
  return null
}

export function digitsOnlyInput(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen)
}
