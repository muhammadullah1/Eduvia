import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import concessionsService, {
  type ConcessionCategory,
  type ConcessionMode,
  type CreateConcessionInput,
} from "@/api/fees/concessions.service"
import familiesService, { FAMILIES_QUERY_KEY } from "@/api/fees/families.service"
import { FEE_TYPES, type FeeType } from "@/api/fees/fee-structure.service"
import studentsService from "@/api/students/students.service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { cn } from "@/lib/utils"

import { useSessionsList } from "../sessions/hooks/use-sessions"
import { CATEGORY_LABEL, errorText, MODE_LABEL, modeHint } from "./concession-rules"

const CONTENT = "max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"
const HEADER = "border-b border-[var(--cls-border)] px-6 py-4 text-left"
const BRAND = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
const TRIGGER = "w-full border-[var(--cls-border)] bg-white"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  defaultStudentId?: number
  onSubmit: (input: CreateConcessionInput) => Promise<void>
}

export function RequestConcessionDialog({ open, onOpenChange, saving, defaultStudentId, onSubmit }: Props) {
  const sessions = useSessionsList()
  const families = useQuery({ queryKey: [FAMILIES_QUERY_KEY], queryFn: () => familiesService.list(), enabled: open })
  const [studentSearch, setStudentSearch] = useState("")
  const students = useQuery({
    queryKey: ["students-pick", studentSearch],
    queryFn: () => studentsService.list({ search: studentSearch || undefined, pageSize: 30 }),
    enabled: open && !defaultStudentId,
  })
  const lockedStudent = useQuery({
    queryKey: ["student", defaultStudentId],
    queryFn: () => studentsService.get(defaultStudentId!),
    enabled: open && Boolean(defaultStudentId),
  })

  let currentSession = sessions.data?.find((s) => s.current)
  if (!currentSession && sessions.data?.length) {
    currentSession = sessions.data.find(() => true)
  }
  const [sessionId, setSessionId] = useState("")
  const [studentId, setStudentId] = useState(() => {
    if (defaultStudentId) return String(defaultStudentId)
    return ""
  })
  const [category, setCategory] = useState<ConcessionCategory>("Standard")
  const [mode, setMode] = useState<ConcessionMode>("percent")
  const [value, setValue] = useState("10")
  const [feeTypes, setFeeTypes] = useState<FeeType[]>(["Tuition"])
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [effectiveTo, setEffectiveTo] = useState("")
  const [familyId, setFamilyId] = useState("")
  const [reason, setReason] = useState("")
  const [stackable, setStackable] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const resolvedSessionId = sessionId || currentSession?.id || ""
  const sessionStart = useMemo(() => {
    const s = sessions.data?.find((x) => x.id === resolvedSessionId)
    return s?.start?.slice(0, 10) || ""
  }, [sessions.data, resolvedSessionId])

  function toggleType(type: FeeType) {
    setFeeTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type)
      return [...prev, type]
    })
  }

  async function submit() {
    const next: Record<string, string> = {}
    if (!resolvedSessionId) next.sessionId = "Choose a session."
    if (!studentId) next.studentId = "Choose a student."
    if (!feeTypes.length) next.feeTypes = "Select at least one fee type."
    if (!reason.trim() || reason.trim().length < 5) next.reason = "Reason needs at least 5 characters."
    if (mode !== "waiver") {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) next.value = "Enter a valid amount."
      if (mode === "percent" && (n < 0 || n > 100)) next.value = "Percent must be 0–100."
    }
    if (category === "Sibling" && !familyId) next.familyId = "Sibling concessions need a verified family."
    let from = effectiveFrom
    if (!from) from = sessionStart
    if (!from) next.effectiveFrom = "Set an effective start date."
    setErrors(next)
    if (Object.keys(next).length) return
    setServerError(null)

    let submitValue = Number(value)
    if (mode === "waiver") submitValue = 100

    let submitFamilyId: number | null = null
    if (familyId) submitFamilyId = Number(familyId)

    let submitEffectiveTo: string | null = null
    if (effectiveTo) submitEffectiveTo = effectiveTo

    try {
      await onSubmit({
        studentId: Number(studentId),
        sessionId: Number(resolvedSessionId),
        category,
        mode,
        value: submitValue,
        feeTypes,
        effectiveFrom: from,
        effectiveTo: submitEffectiveTo,
        familyId: submitFamilyId,
        reason: reason.trim(),
        stackable,
      })
    } catch (err) {
      setServerError(errorText(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className={CONTENT}>
        <DialogHeader className={HEADER}>
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">Request concession</DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Draft a student concession for selected fee types. Overlapping non-stackable concessions must be resolved
            before billing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Session" error={errors.sessionId}>
              <Select value={resolvedSessionId} onValueChange={setSessionId}>
                <SelectTrigger className={TRIGGER} aria-invalid={Boolean(errors.sessionId)}>
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.data?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.current ? " (Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={category} onValueChange={(v) => setCategory(v as ConcessionCategory)}>
                <SelectTrigger className={TRIGGER}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as ConcessionCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Student" error={errors.studentId}>
            {defaultStudentId ? (
              <Input
                readOnly
                value={
                  lockedStudent.data
                    ? `${lockedStudent.data.firstName} ${lockedStudent.data.lastName} · ${lockedStudent.data.admissionNo}`
                    : `Student #${defaultStudentId}`
                }
                className="border-[var(--cls-border)] bg-[var(--page-wash)]/50"
              />
            ) : (
              <>
                <Input
                  placeholder="Search by name or admission no."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="mb-2 border-[var(--cls-border)] bg-white"
                />
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className={TRIGGER} aria-invalid={Boolean(errors.studentId)}>
                    <SelectValue placeholder="Choose student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.data?.students.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.firstName} {s.lastName} · {s.admissionNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </Field>

          {category === "Sibling" ? (
            <Field label="Family" error={errors.familyId} hint="Family must be verified and include this student.">
              <Select value={familyId} onValueChange={setFamilyId}>
                <SelectTrigger className={TRIGGER} aria-invalid={Boolean(errors.familyId)}>
                  <SelectValue placeholder="Verified family" />
                </SelectTrigger>
                <SelectContent>
                  {(families.data || [])
                    .filter((f) => {
                      if (!studentId) return true
                      const sid = Number(studentId)
                      return f.members.some((m) => m.status === "Active" && m.studentId === sid)
                    })
                    .map((f) => (
                      <SelectItem key={f.id} value={String(f.id)} disabled={!f.verified}>
                        {f.displayName}{f.verified ? "" : " (unverified)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <Field label="Mode" hint={modeHint(mode)}>
            <Select value={mode} onValueChange={(v) => setMode(v as ConcessionMode)}>
              <SelectTrigger className={TRIGGER}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABEL) as ConcessionMode[]).map((m) => (
                  <SelectItem key={m} value={m}>{MODE_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {mode !== "waiver" ? (
            <Field label={mode === "percent" ? "Percent" : "Amount (PKR)"} error={errors.value}>
              <Input
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="border-[var(--cls-border)] bg-white"
                aria-invalid={Boolean(errors.value)}
              />
            </Field>
          ) : null}

          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Fee types <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FEE_TYPES.map((type) => {
                const on = feeTypes.includes(type)
                return (
                  <label
                    key={type}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm",
                      on
                        ? "border-[var(--cls-brand)] bg-[color-mix(in_srgb,var(--cls-brand)_8%,white)]"
                        : "border-[var(--cls-border)] bg-white"
                    )}
                  >
                    <Checkbox checked={on} onCheckedChange={() => toggleType(type)} />
                    <span className="truncate text-[var(--cls-ink)]">{type}</span>
                  </label>
                )
              })}
            </div>
            {errors.feeTypes ? <p className="mt-1 text-xs text-destructive">{errors.feeTypes}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Effective from" error={errors.effectiveFrom}>
              <DatePicker
                value={effectiveFrom || sessionStart}
                onChange={setEffectiveFrom}
                defaultMonthKind="today"
                popoverClassName="z-[100]"
                aria-label="Effective from"
                aria-invalid={Boolean(errors.effectiveFrom)}
                className="border-[var(--cls-border)] bg-white"
              />
            </Field>
            <Field label="Effective to (optional)">
              <DatePicker
                value={effectiveTo}
                onChange={setEffectiveTo}
                defaultMonthKind="today"
                popoverClassName="z-[100]"
                placeholder="No end date"
                aria-label="Effective to"
                fromDate={effectiveFrom || sessionStart || undefined}
                className="border-[var(--cls-border)] bg-white"
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--cls-ink)]">
            <Checkbox checked={stackable} onCheckedChange={(v) => setStackable(v === true)} />
            Stackable with other stackable concessions
          </label>

          <Field label="Reason" error={errors.reason}>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why this concession is granted"
              className="border-[var(--cls-border)] bg-white"
              aria-invalid={Boolean(errors.reason)}
            />
          </Field>

          {serverError ? <p role="alert" className="text-sm text-destructive">{serverError}</p> : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className={BRAND} disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-[var(--cls-muted)]">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
