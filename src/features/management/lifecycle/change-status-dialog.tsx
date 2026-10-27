import { useMutation, useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import lifecycleService, { LIFECYCLE_QUERY_KEY, type LifecycleStatus } from "@/api/students/lifecycle.service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { getToday } from "@/lib/dates"
import { cn } from "@/lib/utils"

import { useClassesList } from "../classes/hooks/use-classes"
import { useSessionsList } from "../sessions/hooks/use-sessions"
import { StudentStatusChip } from "../students/student-status-chip"
import { money, useRefreshLifecycle } from "./lifecycle-hooks"
import {
  actionHint,
  actionLabel,
  buildStatusBody,
  emptyStatusForm,
  isReadmission,
  STATUS_LABELS,
  type StatusForm,
  validateStatusForm,
} from "./lifecycle-rules"
import { ClassPicker, FormField, SessionPicker } from "./lifecycle-shared"

export type LifecycleStudent = {
  id: number
  name: string
  admissionNo: string
  status: string
  classLabel?: string | null
}

type Props = {
  student: LifecycleStudent | null
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

/** Change a student's status (SRS p14–16). Used on /admin/lifecycle and the student profile. */
export function ChangeStatusDialog({ student, onOpenChange, onDone }: Props) {
  return (
    <Dialog open={student != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {student ? (
          <ChangeStatusBody key={student.id} student={student} onClose={() => onOpenChange(false)} onDone={onDone} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ChangeStatusBody({
  student,
  onClose,
  onDone,
}: {
  student: LifecycleStudent
  onClose: () => void
  onDone?: () => void
}) {
  const today = getToday()
  const refresh = useRefreshLifecycle()
  const [form, setForm] = useState<StatusForm>(() => emptyStatusForm(today))
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof StatusForm>(key: K, value: StatusForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const lifecycleQuery = useQuery({
    queryKey: [LIFECYCLE_QUERY_KEY, student.id],
    queryFn: () => lifecycleService.timeline(student.id),
  })
  const info = lifecycleQuery.data
  const from = (info?.status ?? student.status) as LifecycleStatus
  const readmit = isReadmission(from, form.to)

  const sessionsQuery = useSessionsList()
  const sessions = sessionsQuery.data ?? []
  const sessionId = form.sessionId || (readmit ? (sessions.find((s) => s.current)?.id ?? "") : "")
  const classesQuery = useClassesList(readmit && sessionId ? Number(sessionId) : undefined)
  const classes = (classesQuery.data ?? []).filter((klass) => klass.status !== "Archived")

  const effective = { ...form, sessionId }
  const error = info
    ? validateStatusForm(effective, { from, today, admittedOn: info.admittedOn, finalGrade: info.finalGrade })
    : "Loading…"

  const mutation = useMutation({
    mutationFn: () => lifecycleService.changeStatus(student.id, buildStatusBody(effective, from)),
    onSuccess: async () => {
      toast.success(`${student.name} is now ${STATUS_LABELS[form.to as LifecycleStatus].toLowerCase()}`)
      await refresh()
      onDone?.()
      onClose()
    },
    onError: (err) =>
      toast.error("Nothing was changed", { description: err instanceof Error ? err.message : undefined }),
  })

  const submit = () => {
    setTouched(true)
    if (!error) mutation.mutate()
  }

  const categories =
    form.to === "Inactive" ? (info?.reasons.Inactive ?? []) : form.to === "StruckOff" ? (info?.reasons.StruckOff ?? []) : []

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change status</DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--cls-ink)]">{student.name}</span>
            <span className="font-mono text-xs">{student.admissionNo}</span>
            {student.classLabel ? <span>· {student.classLabel}</span> : null}
            <StudentStatusChip status={from} />
          </div>
        </DialogDescription>
      </DialogHeader>

      {lifecycleQuery.isLoading ? (
        <div className="flex flex-col gap-2" aria-label="Loading">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : lifecycleQuery.isError || !info ? (
        <p className="text-sm text-red-600">Could not load this student&apos;s lifecycle. Close and try again.</p>
      ) : info.allowed.length === 0 ? (
        <p className="text-sm text-[var(--cls-muted)]">No status changes are available from {STATUS_LABELS[from]}.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <RadioGroup
            value={form.to}
            onValueChange={(value) => {
              setTouched(false)
              setForm((current) => ({ ...emptyStatusForm(today), effectiveOn: current.effectiveOn, reason: current.reason, to: value as LifecycleStatus }))
            }}
            className="grid gap-2 sm:grid-cols-2"
            aria-label="New status"
          >
            {info.allowed.map(({ to }) => {
              const selected = form.to === to
              return (
                <label
                  key={to}
                  htmlFor={`to-${to}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    selected
                      ? "border-[var(--cls-brand)] bg-[var(--cls-brand)]/5"
                      : "border-[var(--cls-border)] hover:bg-[var(--page-wash)]"
                  )}
                >
                  <RadioGroupItem id={`to-${to}`} value={to} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--cls-ink)]">
                      {actionLabel(from, to)}
                      <span className="font-normal text-[var(--cls-muted)]"> → {STATUS_LABELS[to]}</span>
                    </span>
                    <span className="block text-xs leading-4 text-[var(--cls-muted)]">{actionHint(from, to)}</span>
                  </span>
                </label>
              )
            })}
          </RadioGroup>

          {form.to ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="effective-on" label="Effective date" hint="Past dates are fine; not before admission.">
                <DatePicker
                  id="effective-on"
                  value={form.effectiveOn}
                  onChange={(value) => set("effectiveOn", value)}
                  defaultMonthKind="today"
                  popoverClassName="z-[100]"
                  fromDate={info.admittedOn?.slice(0, 10) ?? undefined}
                  maxDate={today}
                />
              </FormField>

              {categories.length ? (
                <FormField id="reason-category" label="Reason category">
                  <Select value={form.reasonCategory} onValueChange={(value) => set("reasonCategory", value)}>
                    <SelectTrigger id="reason-category" className="w-full border-[var(--cls-border)]">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}

              {form.to === "StruckOff" ? (
                <>
                  <FormField id="academic-status" label="Academic status at leaving">
                    <Input
                      id="academic-status"
                      value={form.academicStatus}
                      onChange={(event) => set("academicStatus", event.target.value)}
                      placeholder="e.g. Passed term 1, Grade 4"
                      maxLength={255}
                    />
                  </FormField>
                  {form.reasonCategory === "Transfer out" ? (
                    <FormField id="transfer-school" label="Transferring to (optional)">
                      <Input
                        id="transfer-school"
                        value={form.transferToSchool}
                        onChange={(event) => set("transferToSchool", event.target.value)}
                        placeholder="School name"
                        maxLength={255}
                      />
                    </FormField>
                  ) : null}
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-5 sm:col-span-2",
                      info.hasOutstanding
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    )}
                  >
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>
                      {info.hasOutstanding
                        ? info.outstanding != null
                          ? `Outstanding fees of Rs ${money(info.outstanding)} are recorded with the strike-off. Monthly fees stop from here.`
                          : "This student has outstanding fees; they are recorded with the strike-off. Monthly fees stop from here."
                        : "No outstanding fees. Monthly fees stop from here."}
                    </p>
                  </div>
                </>
              ) : null}

              {form.to === "Graduated" ? (
                <>
                  <FormField id="final-result" label="Final result">
                    <Input
                      id="final-result"
                      value={form.finalResult}
                      onChange={(event) => set("finalResult", event.target.value)}
                      placeholder="e.g. Passed, A grade"
                      maxLength={255}
                    />
                  </FormField>
                  {!info.finalGrade ? (
                    <label
                      htmlFor="graduation-override"
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 sm:col-span-2"
                    >
                      <Checkbox
                        id="graduation-override"
                        checked={form.graduationOverride}
                        onCheckedChange={(checked) => set("graduationOverride", checked === true)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{student.classLabel ?? "This class"} is not the final grade.</span>{" "}
                        Graduate anyway. The override is recorded in the history and audit log.
                      </span>
                    </label>
                  ) : null}
                </>
              ) : null}

              {readmit ? (
                <>
                  <FormField id="readmit-session" label="Session">
                    <SessionPicker
                      id="readmit-session"
                      value={sessionId}
                      onChange={(value) => setForm((current) => ({ ...current, sessionId: value, classId: "" }))}
                      sessions={sessions}
                    />
                  </FormField>
                  <FormField id="readmit-class" label="Class" hint="Seats are checked against class capacity.">
                    <ClassPicker
                      id="readmit-class"
                      value={form.classId}
                      onChange={(value) => set("classId", value)}
                      classes={classes}
                      disabled={!sessionId || classesQuery.isLoading}
                    />
                  </FormField>
                </>
              ) : null}

              <div className="sm:col-span-2">
                <FormField id="status-reason" label="Reason">
                  <Textarea
                    id="status-reason"
                    value={form.reason}
                    onChange={(event) => set("reason", event.target.value)}
                    placeholder="A short note for the history"
                    maxLength={1000}
                    rows={2}
                  />
                </FormField>
              </div>
            </div>
          ) : null}

          {touched && error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}
          <p className="text-[11px] text-[var(--cls-muted)]">
            Recorded in the student&apos;s history and the audit log. History is never edited or deleted.
          </p>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!form.to || mutation.isPending}>
          {mutation.isPending ? <Spinner /> : null}
          {form.to ? actionLabel(from, form.to as LifecycleStatus) : "Change status"}
        </Button>
      </DialogFooter>
    </>
  )
}
