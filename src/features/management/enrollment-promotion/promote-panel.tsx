import { useQuery } from "@tanstack/react-query"
import { Info } from "lucide-react"
import { useMemo, useState } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import type { BulkPromoteResult, PromotionAction } from "@/api/students/promotions.service"
import studentsService from "@/api/students/students.service"
import arrowRight from "@/assets/enrollment/arrow-right.svg"
import checkCircle from "@/assets/enrollment/check-circle.svg"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { useClassesList } from "../classes/hooks/use-classes"
import { useSessionsList } from "../sessions/hooks/use-sessions"
import { PromoteConfirmDialog } from "./promote-confirm-dialog"
import { countPlan, defaultTargetSession, suggestRepeatClass, suggestTargetClass } from "./promotion-plan"

const ACTIONS: { value: PromotionAction; label: string; tone: string }[] = [
  { value: "promote", label: "Promote", tone: "text-[var(--cls-ink)]" },
  { value: "hold", label: "Hold back", tone: "text-amber-700" },
  { value: "graduate", label: "Graduate", tone: "text-sky-700" },
]

const initials = (first: string, last: string) =>
  `${first.charAt(0)}${last === "-" ? "" : last.charAt(0)}`.toUpperCase()

function Field({ label, htmlFor, hint, error, children }: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-[var(--cls-ink)]">
        {label} <span className="text-red-600">*</span>
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--cls-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

export function PromotePanel() {
  const sessionsQuery = useSessionsList()
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data])
  const current = sessions.find((session) => session.current)
  const [targetSessionId, setTargetSessionId] = useState<string>()
  const effectiveTargetSessionId = targetSessionId ?? defaultTargetSession(sessions)?.id

  const sourceClassesQuery = useClassesList(current ? Number(current.id) : undefined)
  const targetClassesQuery = useClassesList(effectiveTargetSessionId ? Number(effectiveTargetSessionId) : undefined)
  const sourceClasses = useMemo(() => sourceClassesQuery.data ?? [], [sourceClassesQuery.data])
  const targetClasses = useMemo(() => targetClassesQuery.data ?? [], [targetClassesQuery.data])

  const [sourceClassId, setSourceClassId] = useState<string>()
  const [targetClassChoice, setTargetClassChoice] = useState<string>()
  const source = sourceClasses.find((klass) => klass.id === sourceClassId)
  const suggested = suggestTargetClass(source, targetClasses)
  const targetClassId = targetClassChoice ?? suggested?.id
  const sameSession = Boolean(current && effectiveTargetSessionId === current.id)

  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState<BulkPromoteResult | null>(null)

  const studentsQuery = useQuery({
    queryKey: ["students", "promotion-roster", sourceClassId],
    enabled: Boolean(sourceClassId),
    queryFn: () => studentsService.list({ classId: Number(sourceClassId), status: "Active", pageSize: 200 }),
  })
  const students = useMemo(
    () =>
      [...(studentsQuery.data?.students ?? [])].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      ),
    [studentsQuery.data]
  )

  // A fresh roster starts fully selected; top-grade classes default to Graduate.
  // Reset during render when the roster changes (no effect round-trip).
  const topGrade = Boolean(source) && targetClassesQuery.isSuccess && !suggested
  const rosterKey = `${sourceClassId}:${studentsQuery.dataUpdatedAt}:${topGrade}`
  const [plan, setPlan] = useState<{
    key: string
    selected: Set<number>
    actions: Map<number, PromotionAction>
  }>({ key: "", selected: new Set(), actions: new Map() })
  if (plan.key !== rosterKey) {
    const ids = students.map((student) => student.id)
    setPlan({
      key: rosterKey,
      selected: new Set(ids),
      actions: new Map(ids.map((id) => [id, topGrade ? "graduate" : "promote"])),
    })
  }
  const { selected, actions } = plan
  const setSelected = (update: Set<number> | ((prev: Set<number>) => Set<number>)) =>
    setPlan((prev) => ({ ...prev, selected: typeof update === "function" ? update(prev.selected) : update }))
  const setActions = (update: (prev: Map<number, PromotionAction>) => Map<number, PromotionAction>) =>
    setPlan((prev) => ({ ...prev, actions: update(prev.actions) }))

  const counts = countPlan(selected, actions)
  const allChecked = students.length > 0 && selected.size === students.length
  const someChecked = selected.size > 0 && !allChecked

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(students.map((student) => student.id)) : new Set())
  const toggleOne = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  const setAction = (id: number, action: PromotionAction) =>
    setActions((prev) => new Map(prev).set(id, action))
  const setAllActions = (action: PromotionAction) =>
    setActions((prev) => {
      const next = new Map(prev)
      for (const id of selected) next.set(id, action)
      return next
    })

  const targetMissing = counts.promote > 0 && !targetClassId
  const previewDisabled = !selected.size || targetMissing || !effectiveTargetSessionId
  const otherTargets = targetClasses.filter((klass) => klass.id !== sourceClassId)

  return (
    <div className="flex flex-col gap-4">
      {done ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
        >
          <img src={checkCircle} alt="" width={18} height={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-900">Promotion complete</p>
            <p className="mt-0.5 text-xs text-emerald-800">
              {[
                done.promoted ? `${done.promoted} promoted to ${done.toClass?.label}` : null,
                done.repeated ? `${done.repeated} held back in ${done.repeatClass?.label}` : null,
                done.graduated ? `${done.graduated} graduated` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {` · ${done.session.name}. Every change is in Enrollment history.`}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-emerald-900" onClick={() => setDone(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-50,#ecfdf5)] px-4 py-3 text-xs leading-5 text-[var(--cls-ink)]">
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--cls-brand)]" aria-hidden />
        <p>
          <span className="font-semibold">How promotion works: </span>
          each selected student is recorded as Promoted, Held back or Graduated and moved to their new
          class in one step. If anything fails, nobody is moved. Past enrollment records are never
          changed or deleted.
        </p>
      </div>

      <ClsPanel className="overflow-visible">
        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)] md:items-start">
          <Field
            label="Source class"
            htmlFor="promote-source"
            hint={
              source
                ? studentsQuery.isLoading
                  ? "Loading students…"
                  : `${students.length} active student${students.length === 1 ? "" : "s"} · ${current?.name ?? ""}`
                : current
                  ? `Classes in ${current.name}`
                  : undefined
            }
          >
            <Select
              value={sourceClassId ?? ""}
              onValueChange={(value) => {
                setSourceClassId(value)
                setTargetClassChoice(undefined)
                setDone(null)
              }}
              disabled={sourceClassesQuery.isLoading}
            >
              <SelectTrigger id="promote-source" className="w-full border-[var(--cls-border)]">
                <SelectValue placeholder={sourceClassesQuery.isLoading ? "Loading classes…" : "Choose a class"} />
              </SelectTrigger>
              <SelectContent>
                {sourceClasses.map((klass) => (
                  <SelectItem key={klass.id} value={klass.id}>
                    {classDisplayName(klass)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Mirrors Field: an invisible label row keeps the connector centred on the select triggers. */}
          <div className="hidden flex-col gap-1.5 md:flex" aria-hidden>
            <span className="invisible text-xs leading-4">&nbsp;</span>
            <div className="flex h-10 items-center justify-center">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--cls-border)] bg-slate-50 px-3 py-1 text-xs font-medium text-[var(--cls-muted)]">
                promotes to
                <img src={arrowRight} alt="" width={16} height={16} />
              </span>
            </div>
          </div>

          <Field label="Target session" htmlFor="promote-session">
            <Select
              value={effectiveTargetSessionId ?? ""}
              onValueChange={(value) => {
                setTargetSessionId(value)
                setTargetClassChoice(undefined)
              }}
              disabled={sessionsQuery.isLoading}
            >
              <SelectTrigger id="promote-session" className="w-full border-[var(--cls-border)]">
                <SelectValue placeholder="Choose a session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                    {session.current ? " (Current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Target class"
            htmlFor="promote-target"
            error={source && targetMissing && targetClassesQuery.isSuccess ? "Choose the class students are promoted to." : undefined}
            hint={source && topGrade ? "Top grade: students default to Graduate." : undefined}
          >
            <Select
              value={targetClassId ?? ""}
              onValueChange={setTargetClassChoice}
              disabled={!source || targetClassesQuery.isLoading}
            >
              <SelectTrigger id="promote-target" className="w-full border-[var(--cls-border)]" aria-invalid={Boolean(source && targetMissing)}>
                <SelectValue placeholder={source ? "Choose a class" : "Pick a source class first"} />
              </SelectTrigger>
              <SelectContent>
                {otherTargets.map((klass) => (
                  <SelectItem key={klass.id} value={klass.id}>
                    {classDisplayName(klass)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </ClsPanel>

      <ClsPanel>
        <ClsPanelHeader
          title={source ? `Students in ${classDisplayName(source)}` : "Students"}
          description={source ? "Untick anyone who should stay as they are." : undefined}
          actions={
            source && students.length ? (
              <>
                <span className="text-xs text-[var(--cls-muted)] tabular-nums">{selected.size} selected</span>
                <Select value="" onValueChange={(value) => setAllActions(value as PromotionAction)} disabled={!selected.size}>
                  <SelectTrigger size="sm" className="w-40 border-[var(--cls-border)]" aria-label="Set action for selected">
                    <SelectValue placeholder="Set selected to…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setConfirming(true)} disabled={previewDisabled}>
                  Preview &amp; confirm
                </Button>
              </>
            ) : null
          }
        />
        {!source ? (
          <ClsEmpty title="Choose a source class">
            Pick the class you are promoting from. Its active students appear here, ready to promote, hold
            back or graduate.
          </ClsEmpty>
        ) : studentsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-base font-medium text-[var(--cls-ink)]">Could not load students</p>
            <Button variant="outline" onClick={() => void studentsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : studentsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-4" aria-label="Loading students">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </div>
        ) : !students.length ? (
          <ClsEmpty title={`No active students in ${classDisplayName(source)}`}>
            Enroll approved applicants from the Enroll tab, or choose another class.
          </ClsEmpty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={clsHeadRowClass}>
                  <ClsTh className="w-10">
                    <Checkbox
                      checked={allChecked ? true : someChecked ? "indeterminate" : false}
                      onCheckedChange={(value) => toggleAll(value === true)}
                      aria-label="Select all students"
                    />
                  </ClsTh>
                  <ClsTh className="w-16">#</ClsTh>
                  <ClsTh>Student</ClsTh>
                  <ClsTh>Admission no.</ClsTh>
                  <ClsTh>Action</ClsTh>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const checked = selected.has(student.id)
                  const action = actions.get(student.id) ?? "promote"
                  const fullName = `${student.firstName} ${student.lastName === "-" ? "" : student.lastName}`.trim()
                  return (
                    <TableRow
                      key={student.id}
                      data-state={checked ? "selected" : undefined}
                      className={cn(clsRowClass, checked && "bg-emerald-50/50 hover:bg-emerald-50/70")}
                    >
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleOne(student.id, value === true)}
                          aria-label={`Select ${fullName}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-[var(--cls-muted)] tabular-nums">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-[var(--brand-100)] text-[11px] font-semibold text-[var(--primary-hover)]">
                              {initials(student.firstName, student.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-[var(--cls-ink)]">{fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[var(--cls-muted)]">{student.admissionNo}</TableCell>
                      <TableCell>
                        <RadioGroup
                          value={action}
                          onValueChange={(value) => setAction(student.id, value as PromotionAction)}
                          className={cn("flex flex-wrap gap-x-4 gap-y-1", !checked && "opacity-50")}
                          disabled={!checked}
                          aria-label={`Action for ${fullName}`}
                        >
                          {ACTIONS.map((option) => {
                            const id = `action-${student.id}-${option.value}`
                            return (
                              <div key={option.value} className="flex items-center gap-1.5">
                                <RadioGroupItem id={id} value={option.value} />
                                <Label htmlFor={id} className={cn("text-xs font-normal", option.tone)}>
                                  {option.label}
                                </Label>
                              </div>
                            )
                          })}
                        </RadioGroup>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ClsPanel>

      {source && confirming ? (
        <PromoteConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          source={source}
          target={targetClasses.find((klass) => klass.id === targetClassId)}
          targetSession={sessions.find((session) => session.id === effectiveTargetSessionId)}
          sameSession={sameSession}
          targetClasses={targetClasses}
          defaultRepeatClass={suggestRepeatClass(source, targetClasses)}
          students={students.filter((student) => selected.has(student.id))}
          actions={actions}
          counts={counts}
          onDone={(result) => {
            setConfirming(false)
            setDone(result)
            setSelected(new Set())
          }}
          onStale={() => void studentsQuery.refetch()}
        />
      ) : null}
    </div>
  )
}
