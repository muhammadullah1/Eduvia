import {
  Lock,
  Shield,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

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
} from "@/data/types"
import { FEE_RULE_LABELS } from "@/features/ops/fee-rule-labels"
import { useActor } from "@/lib/actor"
import { can } from "@/lib/permissions"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { SchoolProfileCard } from "./components/school-profile-card"

export { SchoolProfileCard }

const FIELD_CONTROL =
  "h-11 rounded-[10px] border-transparent bg-[#F7F7F7] shadow-none focus-visible:border-[var(--cls-brand)]/25 focus-visible:bg-white focus-visible:ring-[var(--cls-brand)]/20"

function previewAdmissionNo(prefix: string, digits: number): string {
  const head = prefix || "CLS"
  const width = Math.max(1, Math.min(8, Number(digits) || 4))
  return `${head}${String(1).padStart(width, "0")}`
}

/** Label + optional hint above the control so sibling inputs stay aligned. */
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
      <span
        className={cn(
          "block min-h-4 truncate text-xs leading-4",
          hint ? "text-[var(--cls-muted)]" : "invisible"
        )}
        title={hint}
      >
        {hint || "\u00a0"}
      </span>
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

function SaveFooter({
  isDirty,
  onSave,
  label,
}: {
  isDirty: boolean
  onSave: () => void
  label: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--cls-border)] pt-4">
      <span className="mr-auto text-xs text-[var(--cls-muted)]">
        {isDirty ? (
          <span className="font-medium text-amber-700">Unsaved changes</span>
        ) : (
          "Up to date"
        )}
      </span>
      <Button
        className={cn(
          "h-10 min-w-[8rem] rounded-[10px] px-5",
          isDirty
            ? "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            : "bg-[#F4F4F4] text-[#929292] hover:bg-[#EFEFEF] hover:text-[var(--cls-ink)]"
        )}
        variant={isDirty ? "default" : "secondary"}
        onClick={onSave}
      >
        {label}
      </Button>
    </div>
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
  footer,
}: {
  title: string
  description?: string
  badge?: ReactNode
  children: ReactNode
  footer?: ReactNode
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
      {footer}
    </section>
  )
}

function GroupHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold tracking-tight text-[var(--cls-ink)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--cls-muted)]">{description}</p>
    </div>
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
    <div className="space-y-8 px-5 py-6 sm:px-6 lg:px-7 lg:py-7">
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-[var(--cls-ink)]">
          General Information
        </h3>
        <div className="h-px w-full bg-[var(--cls-border)]" />
        <SchoolProfileCard />
      </div>

      <div>
        <GroupHeading
          title="Academic & assessment policies"
          description="Pass criteria, attendance windows, and admission numbering."
        />
        <div className="space-y-4">
          <PolicySection
            title="Weekly test pass criteria"
            description="Used for monthly subject outcomes across the school."
            badge={<DirtyBadge isDirty={isRulesDirty} />}
            footer={
              canAcademic ? (
                <SaveFooter
                  isDirty={isRulesDirty}
                  label="Save criteria"
                  onSave={() => save({ dailyTestRules: rules })}
                />
              ) : null
            }
          >
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <SettingsField label="Pass mark (%)">
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
            title="Attendance policies"
            description="Teacher edit window and low attendance alert threshold."
            badge={<DirtyBadge isDirty={isAttendanceDirty} />}
            footer={
              canAcademic ? (
                <SaveFooter
                  isDirty={isAttendanceDirty}
                  label="Save attendance settings"
                  onSave={() => save({ attendance })}
                />
              ) : null
            }
          >
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <SettingsField
                label="Teacher edit window (days)"
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
                label="Low attendance alert (%)"
                hint="Alert threshold (1–100%)"
              >
                <Input
                  className={FIELD_CONTROL}
                  disabled={!canAcademic}
                  value={attendance.lowThreshold}
                  onChange={numberAttendance("lowThreshold")}
                />
              </SettingsField>
            </div>
          </PolicySection>

          <PolicySection
            title="Student admission format"
            description="Prefix and sequence width for auto-generated admission numbers."
            badge={<DirtyBadge isDirty={isAdmissionDirty} />}
            footer={
              canAcademic ? (
                <SaveFooter
                  isDirty={isAdmissionDirty}
                  label="Save admission format"
                  onSave={() => save({ admission })}
                />
              ) : null
            }
          >
            <div className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_minmax(10rem,auto)]">
              <SettingsField
                label="Admission prefix"
                hint="e.g. CLS or CLS-"
              >
                <Input
                  className={FIELD_CONTROL}
                  disabled={!canAcademic}
                  value={admission.prefix}
                  onChange={(e) =>
                    setAdmission({ ...admission, prefix: e.target.value })
                  }
                />
              </SettingsField>
              <SettingsField
                label="Sequential digits"
                hint="Padding width (1–8)"
              >
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
        </div>
      </div>

      <div>
        <GroupHeading
          title="Financial & result policies"
          description="Fee defaults, parent result access, and rank tie rules."
        />
        <div className="space-y-4">
          <PolicySection
            title="Fee billing & advance limits"
            description={
              canFees
                ? "Default monthly fee, due day, and advance bounds."
                : "Set by the super admin."
            }
            badge={
              canFees ? (
                <DirtyBadge isDirty={isFeesDirty} />
              ) : (
                <SuperAdminOnlyBadge />
              )
            }
            footer={
              canFees ? (
                <SaveFooter
                  isDirty={isFeesDirty}
                  label="Save fee settings"
                  onSave={() => save({ fees })}
                />
              ) : (
                <div className="border-t border-[var(--cls-border)] pt-4">
                  <LockedNote>
                    Only Super Admins can modify fee billing policies.
                  </LockedNote>
                </div>
              )
            }
          >
            <div className="grid items-start gap-4 sm:grid-cols-3">
              <SettingsField
                label="Default monthly fee (PKR)"
                hint="Standard base tuition"
              >
                <Input
                  className={FIELD_CONTROL}
                  disabled={!canFees}
                  value={fees.defaultMonthlyFee}
                  onChange={numberFee("defaultMonthlyFee")}
                />
              </SettingsField>
              <SettingsField
                label="Tuition due day"
                hint="Day of month (1–28)"
              >
                <Input
                  className={FIELD_CONTROL}
                  disabled={!canFees}
                  value={fees.dueDay}
                  onChange={numberFee("dueDay")}
                />
              </SettingsField>
              <SettingsField
                label="Max advance months"
                hint="Advance bounds (0–24)"
              >
                <Input
                  className={FIELD_CONTROL}
                  disabled={!canFees}
                  value={fees.maxAdvanceMonths}
                  onChange={numberFee("maxAdvanceMonths")}
                />
              </SettingsField>
            </div>
          </PolicySection>

          <PolicySection
            title="Result fee & rank rules"
            description={
              canResults
                ? "Applied when parents open published results."
                : "Set by the super admin."
            }
            badge={
              canResults ? (
                <DirtyBadge isDirty={isVisibilityDirty} />
              ) : (
                <SuperAdminOnlyBadge />
              )
            }
            footer={
              canResults ? (
                <SaveFooter
                  isDirty={isVisibilityDirty}
                  label="Save result rules"
                  onSave={() => save({ resultVisibility: visibility })}
                />
              ) : (
                <div className="border-t border-[var(--cls-border)] pt-4">
                  <LockedNote>
                    Only Super Admins can modify result visibility and rank
                    rules.
                  </LockedNote>
                </div>
              )
            }
          >
            <div className="grid gap-4">
              <SettingsField label="Parents see published results when">
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
              </SettingsField>
              <SettingsField label="Rank tie-breaking">
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
                  <SelectTrigger className={FIELD_CONTROL}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">
                      Standard rank tie (1, 2, 2, 4)
                    </SelectItem>
                    <SelectItem value="dense">
                      Dense rank tie (1, 2, 2, 3)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </SettingsField>
              <PreferenceRow
                title="Require a reason for manual overrides"
                description="Always on — protects audit history."
                control={
                  <Switch
                    disabled
                    checked
                    aria-describedby="override-reason-note"
                    aria-label="Require a reason for manual overrides Always on"
                  />
                }
              />
              <span id="override-reason-note" className="sr-only">
                Always on
              </span>
            </div>
          </PolicySection>
        </div>
      </div>
    </div>
  )
}
