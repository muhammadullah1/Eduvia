export function pkr(amount: number) {
  return `₨ ${amount.toLocaleString("en-PK")}`
}

export function timeAgo(iso: string) {
  const then = new Date(iso).getTime()
  const delta = Date.now() - then
  const mins = Math.round(delta / 60000)
  if (Number.isNaN(mins)) return iso
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`
}

export function classLabel(classes: { id: string; label: string }[], id: string) {
  return classes.find((item) => item.id === id)?.label ?? id
}

export function gradeFromScore(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 90) return "A+"
  if (pct >= 80) return "A"
  if (pct >= 70) return "B"
  if (pct >= 60) return "C"
  if (pct >= 50) return "D"
  return "F"
}
