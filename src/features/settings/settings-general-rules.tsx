import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  Hash,
  Receipt,
} from "lucide-react"
import { useEffect, useState } from "react"

import { Field } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useSchool } from "@/data/store"
import {
  type AdmissionSettings,
  type AttendanceSettings,
  type DailyTestRules,
  type FeeSettings,
  type ResultFeeRule,
  type ResultVisibilitySettings,
} from "@/data/types"
import { FEE_RULE_LABELS } from "@/features/ops/fee-rule-labels"
import { useActor } from "@/lib/actor"
import { can } from "@/lib/permissions"
import { toast } from "@/lib/toast"

function previewAdmissionNo(prefix: string, digits: number): string {
  const head = prefix || "CLS"
  const width = Math.max(1, Math.min(8, Number(digits) || 4))
  return `${head}${String(1).padStart(width, "0")}`
}

export function SettingsGeneralRules() {
  const { state, updateSettings } = useSchool()
  const actor = useActor()
  const [rules, setRules] = useState<DailyTestRules>(
    state.settings.dailyTestRules
  )
  const [visibility, setVisibility] = useState<ResultVisibilitySettings>(
    state.settings.resultVisibility
  )
  const [fees, setFees] = useState<FeeSettings>(state.settings.fees)
  const [attendance, setAttendance] = useState<AttendanceSettings>(
    state.settings.attendance
  )
  const [admission, setAdmission] = useState<AdmissionSettings>(
    state.settings.admission
  )

  const canAcademic = can(actor.role, "settings.academic")
  const canResults = can(actor.role, "settings.results")
  const canFees = can(actor.role, "settings.fees")

  useEffect(() => {
    setRules(state.settings.dailyTestRules)
    setVisibility(state.settings.resultVisibility)
    setFees(state.settings.fees)
    setAttendance(state.settings.attendance)
    setAdmission(state.settings.admission)
  }, [state.settings])

  const numberRule =
    (key: keyof DailyTestRules) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setRules({
        ...rules,
        [key]: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0,
      })

  const numberFee =
    (key: keyof FeeSettings) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setFees({
        ...fees,
        [key]: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0,
      })

  const numberAttendance =
    (key: keyof AttendanceSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setAttendance({
        ...attendance,
        [key]: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0,
      })

  function save(patch: Parameters<typeof updateSettings>[0]) {
    const message = updateSettings(patch, actor)
    if (message) toast.error(message)
    else toast.success("Settings saved")
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* 1. Weekly Test Pass Criteria */}
      <Card className="border-[var(--cls-border)] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-[var(--cls-brand)]" />
            <CardTitle className="text-base">Weekly test pass criteria</CardTitle>
          </div>
          <CardDescription>
            Used for monthly subject outcomes across the school.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Pass mark (%)">
            <Input
              disabled={!canAcademic}
              value={rules.passPercent}
              onChange={numberRule("passPercent")}
            />
          </Field>
          <Field
            label="Failed tests allowed per month"
            hint="More than this ⇒ Failed + follow-up"
          >
            <Input
              disabled={!canAcademic}
              value={rules.maxFailsPerMonth}
              onChange={numberRule("maxFailsPerMonth")}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch
              disabled={!canAcademic}
              checked={rules.lowMarksEnabled}
              onCheckedChange={(lowMarksEnabled) =>
                setRules({ ...rules, lowMarksEnabled })
              }
            />
            Flag weak passes as Low marks
          </label>
          <Field label="Low marks: minimum passed tests">
            <Input
              disabled={!canAcademic || !rules.lowMarksEnabled}
              value={rules.lowMarksMinPassed}
              onChange={numberRule("lowMarksMinPassed")}
            />
          </Field>
          <Field label="Low marks: average below (%)">
            <Input
              disabled={!canAcademic || !rules.lowMarksEnabled}
              value={rules.lowMarksBelowPercent}
              onChange={numberRule("lowMarksBelowPercent")}
            />
          </Field>
        </CardContent>
        {canAcademic ? (
          <CardFooter>
            <Button onClick={() => save({ dailyTestRules: rules })}>
              Save criteria
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      {/* 2. Result Fee & Rank Rules */}
      <Card className="border-[var(--cls-border)] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-[var(--cls-brand)]" />
            <CardTitle className="text-base">Result fee &amp; rank rules</CardTitle>
          </div>
          <CardDescription>
            {canResults
              ? "Applied when parents open published results and report cards."
              : "Set by the super admin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Parents see published results when">
              <Select
                disabled={!canResults}
                value={visibility.feeRule}
                onValueChange={(feeRule) =>
                  setVisibility({
                    ...visibility,
                    feeRule: feeRule as ResultFeeRule,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(FEE_RULE_LABELS) as ResultFeeRule[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {FEE_RULE_LABELS[key]}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Rank tie-breaking">
              <Select
                disabled={!canResults}
                value={visibility.rankTie || "shared"}
                onValueChange={(rankTie: "shared" | "dense") =>
                  setVisibility({
                    ...visibility,
                    rankTie,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Standard rank tie (1, 2, 2, 4)</SelectItem>
                  <SelectItem value="dense">Dense rank tie (1, 2, 2, 3)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch disabled checked aria-describedby="override-reason-note" />
            Require a reason for manual overrides
            <span id="override-reason-note" className="text-xs text-muted-foreground">
              Always on
            </span>
          </label>
        </CardContent>
        {canResults ? (
          <CardFooter>
            <Button onClick={() => save({ resultVisibility: visibility })}>
              Save result rules
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      {/* 3. Fee Billing & Advance Limits */}
      <Card className="border-[var(--cls-border)] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-[var(--cls-brand)]" />
            <CardTitle className="text-base">Fee billing &amp; advance limits</CardTitle>
          </div>
          <CardDescription>
            {canFees
              ? "Default monthly fee, due dates, and student advance payment bounds."
              : "Set by the super admin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Default monthly fee (PKR)" hint="Standard base tuition fee">
            <Input
              disabled={!canFees}
              value={fees.defaultMonthlyFee}
              onChange={numberFee("defaultMonthlyFee")}
            />
          </Field>
          <Field label="Tuition due day" hint="Day of month (1 to 28)">
            <Input
              disabled={!canFees}
              value={fees.dueDay}
              onChange={numberFee("dueDay")}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Max advance payment months"
              hint="Advance bounds (0 to 24 months)"
            >
              <Input
                disabled={!canFees}
                value={fees.maxAdvanceMonths}
                onChange={numberFee("maxAdvanceMonths")}
              />
            </Field>
          </div>
        </CardContent>
        {canFees ? (
          <CardFooter>
            <Button onClick={() => save({ fees })}>Save fee settings</Button>
          </CardFooter>
        ) : null}
      </Card>

      {/* 4. Attendance Policies */}
      <Card className="border-[var(--cls-border)] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-[var(--cls-brand)]" />
            <CardTitle className="text-base">Attendance policies</CardTitle>
          </div>
          <CardDescription>
            Teacher edit window and low attendance alert threshold.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Teacher edit window (days)"
            hint="Allowed edit days (0 = same day only, max 31)"
          >
            <Input
              disabled={!canAcademic}
              value={attendance.editWindowDays}
              onChange={numberAttendance("editWindowDays")}
            />
          </Field>
          <Field
            label="Low attendance alert (%)"
            hint="Alert threshold (1 to 100%)"
          >
            <Input
              disabled={!canAcademic}
              value={attendance.lowThreshold}
              onChange={numberAttendance("lowThreshold")}
            />
          </Field>
        </CardContent>
        {canAcademic ? (
          <CardFooter>
            <Button onClick={() => save({ attendance })}>
              Save attendance settings
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      {/* 5. Student Admission Format */}
      <Card className="border-[var(--cls-border)] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hash className="size-5 text-[var(--cls-brand)]" />
            <CardTitle className="text-base">Student admission format</CardTitle>
          </div>
          <CardDescription>
            Prefix and sequence width for auto-generated student admission numbers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Admission prefix" hint="School code (e.g. CLS or CLS-)">
            <Input
              disabled={!canAcademic}
              value={admission.prefix}
              onChange={(e) =>
                setAdmission({ ...admission, prefix: e.target.value })
              }
            />
          </Field>
          <Field label="Sequential digits" hint="Padding width (1 to 8 digits)">
            <Input
              disabled={!canAcademic}
              value={admission.digits}
              onChange={(e) =>
                setAdmission({
                  ...admission,
                  digits: Number(e.target.value.replace(/\D/g, "")) || 1,
                })
              }
            />
          </Field>
          <div className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/60 p-3 sm:col-span-2">
            <p className="text-xs text-[var(--cls-muted)]">
              Next sample student ID:{" "}
              <code className="font-semibold text-[var(--cls-brand)]">
                {previewAdmissionNo(admission.prefix, admission.digits)}
              </code>
            </p>
          </div>
        </CardContent>
        {canAcademic ? (
          <CardFooter>
            <Button onClick={() => save({ admission })}>
              Save admission format
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
