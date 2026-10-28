import { Lock, Shield } from "lucide-react"
import { type ReactNode,useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
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
  type SchoolSettings,
} from "@/data/types"
import { FEE_RULE_LABELS } from "@/features/ops/fee-rule-labels"
import { useActor } from "@/lib/actor"
import { can } from "@/lib/permissions"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { SchoolProfileCard } from "./components/school-profile-card"

export { SchoolProfileCard }

/**
 * Exam letter grades are fixed in the API (`GRADE_BANDS`). Editable grading-scale
 * configuration is not a school_settings key yet — show read-only for Figma parity.
 */
const GRADE_BANDS_READONLY = [
  { min: 90, max: 100, grade: "A+", remark: "Outstanding" },
  { min: 80, max: 89, grade: "A", remark: "Excellent" },
  { min: 70, max: 79, grade: "B", remark: "Very Good" },
  { min: 60, max: 69, grade: "C", remark: "Good" },
  { min: 50, max: 59, grade: "D", remark: "Satisfactory" },
  { min: 0, max: 49, grade: "E", remark: "Passed below 50 (paper pass mark still applies)" },
] as const

const FIELD_CONTROL =
  "h-11 rounded-[10px] border-transparent bg-[#F7F7F7] shadow-none focus-visible:border-[var(--cls-brand)]/25 focus-visible:bg-white focus-visible:ring-[var(--cls-brand)]/20"

function previewAdmissionNo(prefix: string, digits: number): string {
  const head = prefix || "CLS"
  const width = Math.max(1, Math.min(8, Number(digits) || 4))
  return `${head}${String(1).padStart(width, "0")}`
}

function SettingsField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--cls-ink)]">{label}</span>
      {hint ? (
        <span className="text-xs leading-4 text-[var(--cls-muted)]" title={hint}>
          {hint}
        </span>
      ) : null}
      {children}
    </div>
  )
}

function DirtyBadge({ isDirty }: { isDirty: boolean }) {
  if (!isDirty) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
      <span className="size-1.5 rounded-full bg-amber-500" />
      Unsaved changes
    </span>
  )
}

function SuperAdminOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
      <Shield className="size-3" />
      Super Admin Only
    </span>
  )
}

function LockedNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs text-[var(--cls-muted)]">
      <Lock className="size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function PreferenceRow({
  title,
  description,
  control,
}: {
  title: string
  description?: string
  control: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] bg-[#F7F7F7]/70 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--cls-ink)]">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-[var(--cls-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function PolicySection({
  title,
  description,
  badge,
  children,
}: {
  title: string
  description?: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-5 rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--cls-border)] pb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--cls-ink)]">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 max-w-xl text-sm text-[var(--cls-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {badge}
      </div>
      {children}
    </section>
  )
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
  const [saving, setSaving] = useState(false)

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

  const isRulesDirty =
    JSON.stringify(rules) !== JSON.stringify(state.settings.dailyTestRules)
  const isVisibilityDirty =
    JSON.stringify(visibility) !==
    JSON.stringify(state.settings.resultVisibility)
  const isFeesDirty =
    JSON.stringify(fees) !== JSON.stringify(state.settings.fees)
  const isAttendanceDirty =
    JSON.stringify(attendance) !== JSON.stringify(state.settings.attendance)
  const isAdmissionDirty =
    JSON.stringify(admission) !== JSON.stringify(state.settings.admission)

  const isDirty =
    isRulesDirty ||
    isVisibilityDirty ||
    isFeesDirty ||
    isAttendanceDirty ||
    isAdmissionDirty

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

  async function saveConfiguration() {
    if (saving || !isDirty) return
    setSaving(true)
    try {
      const patches: Partial<SchoolSettings>[] = []
      if (isRulesDirty && canAcademic) patches.push({ dailyTestRules: rules })
      if (isAttendanceDirty && canAcademic) patches.push({ attendance })
      if (isAdmissionDirty && canAcademic) patches.push({ admission })
      if (isFeesDirty && canFees) patches.push({ fees })
      if (isVisibilityDirty && canResults)
        patches.push({ resultVisibility: visibility })

      if (patches.length === 0) {
        toast.error("You do not have permission to save these changes.")
        return
      }

      for (const patch of patches) {
        const message = await updateSettings(patch, actor)
        if (message) {
          toast.error(message)
          return
        }
      }
      toast.success("Configuration saved")
    } finally {
      setSaving(false)
    }
  }

  const feeBlocked = visibility.feeRule !== "disabled"

  return (
    <div className="space-y-6 px-5 py-6 sm:px-6 lg:px-7 lg:py-7">
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-[var(--cls-ink)]">
          General Information
        </h3>
        <div className="h-px w-full bg-[var(--cls-border)]" />
        <SchoolProfileCard />
      </div>

      <PolicySection
        title="Grading Scale"
        description="Letter grades used on exam results. The school-wide scale is fixed in the product; paper pass/fail still follows each paper’s own pass marks."
        badge={
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            Read-only
          </span>
        }
      >
        <div className="overflow-x-auto rounded-lg border border-[var(--cls-border)]">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-[var(--page-wash)] text-xs uppercase tracking-wider text-[var(--cls-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Min %</th>
                <th className="px-3 py-2.5 font-semibold">Max %</th>
                <th className="px-3 py-2.5 font-semibold">Grade</th>
                <th className="px-3 py-2.5 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cls-border)]">
              {GRADE_BANDS_READONLY.map((row) => (
                <tr key={row.grade}>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--cls-ink)]">
                    {row.min}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--cls-ink)]">
                    {row.max}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[var(--cls-ink)]">
                    {row.grade}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--cls-muted)]">
                    {row.remark}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-3 py-2.5 text-[var(--cls-muted)]" colSpan={3}>
                  F
                </td>
                <td className="px-3 py-2.5 text-[var(--cls-muted)]">
                  Failed paper or overall fail — always F
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <LockedNote>
          Editable grading bands are not available via settings yet. Failed
          papers are always grade F.
        </LockedNote>
      </PolicySection>

      <PolicySection
        title="Rank & Tie Rules"
        description="How tied aggregates are ranked on published results."
        badge={
          canResults ? (
            <DirtyBadge isDirty={isVisibilityDirty} />
          ) : (
            <SuperAdminOnlyBadge />
          )
        }
      >
        <SettingsField label="Tie-breaking rule">
          <Select
            disabled={!canResults}
            value={visibility.rankTie || "shared"}
            onValueChange={(rankTie: "shared" | "dense") =>
              setVisibility({ ...visibility, rankTie })
            }
          >
            <SelectTrigger className={FIELD_CONTROL}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shared">
                Standard rank tie (1, 2, 2, 4)
              </SelectItem>
              <SelectItem value="dense">Dense rank tie (1, 2, 2, 3)</SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>
        {!canResults ? (
          <LockedNote>Only Super Admins can change rank rules.</LockedNote>
        ) : null}
      </PolicySection>

      <PolicySection
        title="Attendance"
        description="Teacher edit window and low-attendance alert threshold."
        badge={
          canAcademic ? (
            <DirtyBadge isDirty={isAttendanceDirty} />
          ) : (
            <SuperAdminOnlyBadge />
          )
        }
      >
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <SettingsField
            label="Attendance edit window (days)"
            hint="0 = same day only, max 31"
          >
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic}
              value={attendance.editWindowDays}
              onChange={numberAttendance("editWindowDays")}
            />
          </SettingsField>
          <SettingsField
            label="Minimum attendance alert (%)"
            hint="Students below this % are listed as low attendance"
          >
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic}
              value={attendance.lowThreshold}
              onChange={numberAttendance("lowThreshold")}
            />
          </SettingsField>
        </div>
        <LockedNote>
          Attendance status codes (Present, Absent, Late, Leave) are fixed
          product values — not editable here.
        </LockedNote>
      </PolicySection>

      <PolicySection
        title="Daily Test"
        description="Pass criteria and monthly outcome flags for weekly subject tests."
        badge={
          canAcademic ? (
            <DirtyBadge isDirty={isRulesDirty} />
          ) : (
            <SuperAdminOnlyBadge />
          )
        }
      >
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <SettingsField
            label="Mark daily test as fail below (%)"
            hint="Used for monthly subject outcomes"
          >
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic}
              value={rules.passPercent}
              onChange={numberRule("passPercent")}
            />
          </SettingsField>
          <SettingsField
            label="Failed tests allowed / month"
            hint="More than this ⇒ Failed + follow-up"
          >
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic}
              value={rules.maxFailsPerMonth}
              onChange={numberRule("maxFailsPerMonth")}
            />
          </SettingsField>
          <div className="sm:col-span-2">
            <PreferenceRow
              title="Flag weak passes as Low marks"
              description="Highlight borderline results for follow-up."
              control={
                <Switch
                  disabled={!canAcademic}
                  checked={rules.lowMarksEnabled}
                  onCheckedChange={(lowMarksEnabled) =>
                    setRules({ ...rules, lowMarksEnabled })
                  }
                  aria-label="Flag weak passes as Low marks"
                />
              }
            />
          </div>
          <SettingsField label="Low marks: min. passed tests">
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic || !rules.lowMarksEnabled}
              value={rules.lowMarksMinPassed}
              onChange={numberRule("lowMarksMinPassed")}
            />
          </SettingsField>
          <SettingsField label="Low marks: average below (%)">
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic || !rules.lowMarksEnabled}
              value={rules.lowMarksBelowPercent}
              onChange={numberRule("lowMarksBelowPercent")}
            />
          </SettingsField>
        </div>
      </PolicySection>

      <PolicySection
        title="Result Visibility & Fee Condition"
        description="Applied when parents open published exam results."
        badge={
          canResults ? (
            <DirtyBadge isDirty={isVisibilityDirty} />
          ) : (
            <SuperAdminOnlyBadge />
          )
        }
      >
        <div className="space-y-4">
          <PreferenceRow
            title="Block result access when fees are outstanding"
            description={
              feeBlocked
                ? FEE_RULE_LABELS[visibility.feeRule]
                : "Parents can see published results regardless of fees."
            }
            control={
              <Switch
                disabled={!canResults}
                checked={feeBlocked}
                onCheckedChange={(on) =>
                  setVisibility({
                    ...visibility,
                    feeRule: on ? "all_due_paid" : "disabled",
                  })
                }
                aria-label="Block result access when fees are outstanding"
              />
            }
          />
          {feeBlocked ? (
            <SettingsField label="Fee clearance rule">
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
                <SelectTrigger className={FIELD_CONTROL}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(
                      Object.keys(FEE_RULE_LABELS) as ResultFeeRule[]
                    )
                      .filter((key) => key !== "disabled")
                      .map((key) => (
                        <SelectItem key={key} value={key}>
                          {FEE_RULE_LABELS[key]}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </SettingsField>
          ) : null}
          <PreferenceRow
            title="Require a reason for manual overrides"
            description="Always on — protects audit history for result releases."
            control={
              <Switch
                disabled
                checked
                aria-label="Require a reason for manual overrides Always on"
              />
            }
          />
          {!canResults ? (
            <LockedNote>
              Only Super Admins can modify result visibility rules.
            </LockedNote>
          ) : null}
        </div>
      </PolicySection>

      <PolicySection
        title="Fee billing & advance limits"
        description={
          canFees
            ? "Default monthly fee, due day, and advance bounds."
            : "Set by the super admin."
        }
        badge={
          canFees ? <DirtyBadge isDirty={isFeesDirty} /> : <SuperAdminOnlyBadge />
        }
      >
        <div className="grid items-start gap-4 sm:grid-cols-3">
          <SettingsField label="Default monthly fee (PKR)">
            <Input
              className={FIELD_CONTROL}
              disabled={!canFees}
              value={fees.defaultMonthlyFee}
              onChange={numberFee("defaultMonthlyFee")}
            />
          </SettingsField>
          <SettingsField label="Tuition due day" hint="Day of month (1–28)">
            <Input
              className={FIELD_CONTROL}
              disabled={!canFees}
              value={fees.dueDay}
              onChange={numberFee("dueDay")}
            />
          </SettingsField>
          <SettingsField label="Max advance months" hint="0–24">
            <Input
              className={FIELD_CONTROL}
              disabled={!canFees}
              value={fees.maxAdvanceMonths}
              onChange={numberFee("maxAdvanceMonths")}
            />
          </SettingsField>
        </div>
        <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-[var(--cls-border)] px-3 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--cls-ink)]">Dynamic concessions</p>
            <p className="text-xs text-[var(--cls-muted)]">
              When on, Approved concessions drive new bills instead of the legacy fixed monthly fee field.
              Existing bills never change. Discount % on the student record stays unused until separately approved.
            </p>
          </div>
          <Switch
            checked={Boolean(fees.concessionsEnabled)}
            disabled={!canFees}
            onCheckedChange={(checked) => setFees((prev) => ({ ...prev, concessionsEnabled: checked }))}
            aria-label="Enable dynamic concessions"
          />
        </div>
        {!canFees ? (
          <LockedNote>Only Super Admins can modify fee billing policies.</LockedNote>
        ) : null}
      </PolicySection>

      <PolicySection
        title="Student admission format"
        description="Prefix and sequence width for auto-generated admission numbers."
        badge={
          canAcademic ? (
            <DirtyBadge isDirty={isAdmissionDirty} />
          ) : (
            <SuperAdminOnlyBadge />
          )
        }
      >
        <div className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_minmax(10rem,auto)]">
          <SettingsField label="Admission prefix" hint="e.g. CLS or CLS-">
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic}
              value={admission.prefix}
              onChange={(e) =>
                setAdmission({ ...admission, prefix: e.target.value })
              }
            />
          </SettingsField>
          <SettingsField label="Sequential digits" hint="Padding width (1–8)">
            <Input
              className={FIELD_CONTROL}
              disabled={!canAcademic}
              value={admission.digits}
              onChange={(e) =>
                setAdmission({
                  ...admission,
                  digits: Number(e.target.value.replace(/\D/g, "")) || 1,
                })
              }
            />
          </SettingsField>
          <SettingsField label="Sample ID" hint="Live preview">
            <div
              className={cn(
                FIELD_CONTROL,
                "flex items-center px-3 font-mono text-sm font-semibold tracking-wide text-[var(--cls-brand)]"
              )}
            >
              {previewAdmissionNo(admission.prefix, admission.digits)}
            </div>
          </SettingsField>
        </div>
      </PolicySection>

      <div className="sticky bottom-0 z-10 -mx-5 border-t border-[var(--cls-border)] bg-[var(--page-wash)]/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="mr-auto text-xs text-[var(--cls-muted)]">
            {saving
              ? "Saving…"
              : isDirty
                ? "Unsaved changes"
                : "Up to date"}
          </span>
          <Button
            className={cn(
              "h-11 min-w-[11rem] rounded-[10px] px-6",
              isDirty
                ? "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                : "bg-[#F4F4F4] text-[#929292]"
            )}
            disabled={!isDirty || saving}
            onClick={() => void saveConfiguration()}
          >
            {saving ? "Saving…" : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  )
}
