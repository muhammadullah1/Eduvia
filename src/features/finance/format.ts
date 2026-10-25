/** Pure finance formatting helpers (kept out of component files for fast refresh). */
/** "743,600" / "2,500.25": amounts as the Figma tables show them. */
export const amount = (value: number) =>
  Number(value || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const pkrAmount = (value: number) => `PKR ${amount(value)}`
export const signedPkr = (value: number) => (value < 0 ? `-PKR ${amount(-value)}` : `+PKR ${amount(value)}`)

/** Chart / donut colours per category, matching the chips. */
export const CATEGORY_COLOR: Record<string, string> = {
  FeeIncome: "#1f5e3b",
  Grant: "#2f80ed",
  Donation: "#d4a017",
  Misc: "#6b7280",
  StaffSalary: "#1f5e3b",
  Supplies: "#7c3aed",
  Utilities: "#2f80ed",
  Maintenance: "#e0a106",
  Other: "#6b7280",
}

export const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback)
