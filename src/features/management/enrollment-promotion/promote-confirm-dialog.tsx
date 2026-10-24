import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { classDisplayName } from "@/api/classes/map-class"
import promotionsService, {
  type BulkPromoteResult,
  PROMOTION_HISTORY_QUERY_KEY,
  type PromotionAction,
} from "@/api/students/promotions.service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { AcademicSession, ClassSection } from "@/data/types"
import { ApiHttpError } from "@/lib/api"
import type { ApiStudent } from "@/lib/api-types"
import { cn } from "@/lib/utils"

import { buildPromoteRequest, type PlanCounts, validatePlan } from "./promotion-plan"

const today = () => new Date().toLocaleDateString("en-CA")

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: ClassSection
  target?: ClassSection
  targetSession?: AcademicSession
  sameSession: boolean
  targetClasses: ClassSection[]
  defaultRepeatClass?: ClassSection
  students: ApiStudent[]
  actions: Map<number, PromotionAction>
  counts: PlanCounts
  onDone: (result: BulkPromoteResult) => void
  onStale: () => void
}

function Tile({ value, label, tone }: { value: number; label: string; tone: "brand" | "warning" | "info" }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 text-center",
        tone === "brand" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-800"
      )}
    >
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs">{label}</p>
    </div>
  )
}

export function PromoteConfirmDialog(props: Props) {
  const { source, target, targetSession, sameSession, students, actions, counts } = props
  const queryClient = useQueryClient()
  const [date, setDate] = useState(today)
  const [graduationResult, setGraduationResult] = useState("Passed")
  const [holdClassId, setHoldClassId] = useState(props.defaultRepeatClass?.id)
  const [touched, setTouched] = useState(false)
  const [graduationOverride, setGraduationOverride] = useState(false)

  const repeatClass = sameSession ? source : props.targetClasses.find((klass) => klass.id === holdClassId)
  const input = {
    sourceClassId: source.id,
    targetClassId: target?.id,
    holdClassId,
    targetSessionId: targetSession?.id,
    date,
    graduationResult,
    selected: students.map((student) => student.id),
    actions,
  }
  const errors = validatePlan(input, sameSession)
  const invalid = Object.keys(errors).length > 0

  const mutation = useMutation({
    mutationFn: () =>
      promotionsService.bulkPromote({
        ...buildPromoteRequest(input, sameSession),
        ...(counts.graduate ? { graduationOverride } : {}),
      }),
    onSuccess: (result) => {
      toast.success("Promotion complete", {
        description: `${result.promoted} promoted · ${result.repeated} held back · ${result.graduated} graduated`,
      })
      void queryClient.invalidateQueries({ queryKey: ["students"] })
      void queryClient.invalidateQueries({ queryKey: ["classes"] })
      void queryClient.invalidateQueries({ queryKey: [PROMOTION_HISTORY_QUERY_KEY] })
      props.onDone(result)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Promotion failed"
      toast.error("Nothing was changed", { description: message })
      if (error instanceof ApiHttpError && error.status === 409) props.onStale()
    },
  })

  const submit = () => {
    setTouched(true)
    if (!invalid) mutation.mutate()
  }

  const outcomeOf = (id: number) => {
    const action = actions.get(id) ?? "promote"
    if (action === "graduate") return <span className="text-sky-700">Graduates</span>
    if (action === "hold") {
      return <span className="text-amber-700">Repeats {repeatClass ? classDisplayName(repeatClass) : "—"}</span>
    }
    return <span className="text-[var(--cls-ink)]">→ {target ? classDisplayName(target) : "—"}</span>
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !mutation.isPending && props.onOpenChange(open)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm promotion</DialogTitle>
          <DialogDescription>
            {classDisplayName(source)} → {targetSession?.name ?? "—"}. Review the outcome for each student.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Students move to their new class straight away and the change is recorded in their history. It
            can&apos;t be undone from here, though nothing in the past is overwritten.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Tile value={counts.promote} label={target ? `→ ${classDisplayName(target)}` : "Promote"} tone="brand" />
          <Tile value={counts.hold} label={repeatClass ? `Repeat ${classDisplayName(repeatClass)}` : "Hold back"} tone="warning" />
          <Tile value={counts.graduate} label="Graduate" tone="info" />
        </div>

        <ul className="max-h-48 divide-y divide-[var(--cls-border)] overflow-y-auto rounded-lg border border-[var(--cls-border)]">
          {students.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="truncate text-[var(--cls-ink)]">
                {`${student.firstName} ${student.lastName === "-" ? "" : student.lastName}`.trim()}
              </span>
              <span className="shrink-0 text-xs font-medium">{outcomeOf(student.id)}</span>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promotion-date" className="text-xs">Effective date</Label>
            <DatePicker
              id="promotion-date"
              value={date}
              onChange={setDate}
              defaultMonthKind="today"
              popoverClassName="z-[100]"
              aria-invalid={touched && Boolean(errors.date)}
            />
            {touched && errors.date ? <p className="text-xs text-red-600">{errors.date}</p> : null}
          </div>
          {counts.hold && !sameSession ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hold-class" className="text-xs">Held-back students repeat in</Label>
              <Select value={holdClassId ?? ""} onValueChange={setHoldClassId}>
                <SelectTrigger id="hold-class" className="w-full" aria-invalid={touched && Boolean(errors.holdClass)}>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {props.targetClasses.map((klass) => (
                    <SelectItem key={klass.id} value={klass.id}>
                      {classDisplayName(klass)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched && errors.holdClass ? <p className="text-xs text-red-600">{errors.holdClass}</p> : null}
            </div>
          ) : null}
          {counts.graduate ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="graduation-result" className="text-xs">Final result for graduates</Label>
              <Input
                id="graduation-result"
                value={graduationResult}
                onChange={(event) => setGraduationResult(event.target.value)}
                maxLength={255}
                aria-invalid={touched && Boolean(errors.graduationResult)}
              />
              {touched && errors.graduationResult ? (
                <p className="text-xs text-red-600">{errors.graduationResult}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        {counts.graduate ? (
          <label
            htmlFor="graduation-override"
            className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-[var(--cls-muted)]"
          >
            <Checkbox
              id="graduation-override"
              checked={graduationOverride}
              onCheckedChange={(checked) => setGraduationOverride(checked === true)}
              className="mt-0.5"
            />
            <span>
              Allow graduation even if {classDisplayName(source)} is not the final grade. The override is recorded in
              the history and audit log.
            </span>
          </label>
        ) : null}
        {touched && (errors.targetClass || errors.students || errors.targetSession) ? (
          <p className="text-xs text-red-600">{errors.targetClass ?? errors.students ?? errors.targetSession}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={mutation.isPending}>
            Back
          </Button>
          <Button onClick={submit} disabled={mutation.isPending || (touched && invalid)}>
            {mutation.isPending ? <Spinner className="size-4" /> : null}
            Confirm &amp; promote {students.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
