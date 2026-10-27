import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { Field } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { getToday } from "@/lib/dates"
import { formatDate } from "@/lib/format"

import { type EntryValues, validateEntry } from "./entry"
import { amount as fmt } from "./format"


type Option = { key: string; label: string }

const NONE = "__none__"
const blank = (category: string): EntryValues => ({ category, amount: "", date: getToday(), description: "", referenceNo: "", paymentMethod: "" })


/**
 * Right-side drawer for Add / Edit Other Income and Add / Edit Expense (Figma):
 * Category, Amount, Date, Description, Reference, optional Payment Method.
 * Submitting asks for confirmation first; `onSubmit` saves and closes.
 */
export function EntrySheet({
  open,
  kind,
  mode,
  categories,
  methods,
  initial,
  saving,
  onSubmit,
  onClose,
}: {
  open: boolean
  kind: "income" | "expense"
  mode: "add" | "edit"
  categories: readonly Option[]
  methods?: readonly Option[]
  initial?: EntryValues | null
  saving: boolean
  onSubmit: (values: EntryValues) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<EntryValues>(() => initial ?? blank(categories[0].key))
  const [touched, setTouched] = useState(false)
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (open) {
      setValues(initial ?? blank(categories[0].key))
      setTouched(false)
      setConfirming(false)
    } else {
      setConfirming(false)
    }
  }, [open, initial, categories])

  const errors = validateEntry(values)
  const hasErrors = Object.keys(errors).length > 0
  const set = (key: keyof EntryValues) => (value: string) => setValues((v) => ({ ...v, [key]: value }))
  const noun = kind === "income" ? "Other Income" : "Expense"
  const title = `${mode === "add" ? "Add" : "Edit"} ${noun}`
  const categoryLabel = categories.find((c) => c.key === values.category)?.label ?? values.category
  const show = (key: keyof EntryValues) => (touched ? errors[key] : undefined)

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && !saving && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 border-[var(--cls-border)] p-0 sm:max-w-md" data-testid={`${kind}-sheet`}>
          <SheetHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
            <SheetTitle className="text-lg font-semibold text-[var(--cls-brand)]">{title}</SheetTitle>
            <SheetDescription className="text-[13px]">
              {kind === "income"
                ? "Donations, grants and other non-fee income. Fee income is added automatically from fee collection."
                : "Record money spent by the school. Fields marked * are required."}
            </SheetDescription>
          </SheetHeader>
          <form
            id={`${kind}-form`}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
            onSubmit={(e) => {
              e.preventDefault()
              setTouched(true)
              if (!hasErrors) setConfirming(true)
            }}
          >
            <Field label="Category *" error={show("category")}>
              <Select value={values.category} onValueChange={set("category")}>
                <SelectTrigger aria-label="Category" className="w-full border-[var(--cls-border)] bg-white">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount (PKR) *" error={show("amount")}>
              <Input
                inputMode="decimal"
                value={values.amount}
                onChange={(e) => set("amount")(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder={kind === "income" ? "e.g. 50000" : "e.g. 320000"}
                aria-label="Amount (PKR)"
                aria-invalid={Boolean(show("amount"))}
              />
            </Field>
            <Field label="Date *" error={show("date")}>
              <DatePicker value={values.date} onChange={set("date")} maxDate={getToday()} defaultMonthKind="today" aria-label="Date" className="w-full" />
            </Field>
            <Field label="Description *" error={show("description")}>
              <Textarea
                value={values.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder={kind === "income" ? "Describe this income" : "Describe this expense"}
                maxLength={255}
                aria-label="Description"
                aria-invalid={Boolean(show("description"))}
              />
            </Field>
            <Field label={kind === "income" ? "Reference No." : "Reference / Invoice No."}>
              <Input value={values.referenceNo} onChange={(e) => set("referenceNo")(e.target.value)} placeholder="Optional" maxLength={100} aria-label="Reference" />
            </Field>
            {methods ? (
              <Field label="Payment Method">
                <Select value={values.paymentMethod || NONE} onValueChange={(v) => set("paymentMethod")(v === NONE ? "" : v)}>
                  <SelectTrigger aria-label="Payment Method" className="w-full border-[var(--cls-border)] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Select (optional)</SelectItem>
                    {methods.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </form>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-[var(--cls-border)] px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={`${kind}-form`} disabled={saving || (touched && hasErrors)}>
              {mode === "add" ? title : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={confirming} onOpenChange={(v) => !v && !saving && setConfirming(false)}>
        <DialogContent className="sm:max-w-md" data-testid={`${kind}-confirm`}>
          <DialogHeader>
            <DialogTitle>{mode === "add" ? `Record this ${kind}?` : "Save these changes?"}</DialogTitle>
            <DialogDescription>Check the details before saving. Every change is kept in the audit log.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)] p-3 text-sm">
            <dt className="text-[var(--cls-muted)]">Category</dt>
            <dd className="font-medium">{categoryLabel}</dd>
            <dt className="text-[var(--cls-muted)]">Amount</dt>
            <dd className="font-semibold tabular-nums">PKR {fmt(Number(values.amount))}</dd>
            <dt className="text-[var(--cls-muted)]">Date</dt>
            <dd>{values.date ? formatDate(values.date) : "—"}</dd>
            <dt className="text-[var(--cls-muted)]">Description</dt>
            <dd className="break-words">{values.description.trim()}</dd>
            {values.referenceNo.trim() ? (
              <>
                <dt className="text-[var(--cls-muted)]">Reference</dt>
                <dd className="break-all">{values.referenceNo.trim()}</dd>
              </>
            ) : null}
            {values.paymentMethod ? (
              <>
                <dt className="text-[var(--cls-muted)]">Method</dt>
                <dd>{methods?.find((m) => m.key === values.paymentMethod)?.label}</dd>
              </>
            ) : null}
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={saving}>
              Back
            </Button>
            <Button onClick={() => onSubmit(values)} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
              {saving ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
