import { getToday } from "@/lib/dates"

export type EntryValues = {
  category: string
  amount: string
  date: string
  description: string
  referenceNo: string
  paymentMethod: string
}

export function validateEntry(v: EntryValues, today = getToday()) {
  const errors: Partial<Record<keyof EntryValues, string>> = {}
  const n = Number(v.amount)
  if (!v.category) errors.category = "Choose a category"
  if (!v.amount.trim()) errors.amount = "Enter the amount"
  else if (!Number.isFinite(n) || n <= 0) errors.amount = "Amount must be more than 0"
  else if (!/^\d+(\.\d{1,2})?$/.test(v.amount.trim())) errors.amount = "Use at most 2 decimal places"
  else if (n > 9999999999.99) errors.amount = "Amount is too large"
  if (!v.date) errors.date = "Choose the date"
  else if (v.date > today) errors.date = "The date can't be in the future"
  if (v.description.trim().length < 2) errors.description = "Describe this entry"
  return errors
}
