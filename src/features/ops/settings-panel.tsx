import { BookOpen, ClipboardCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

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
import { type DailyTestRules, type ResultFeeRule } from "@/data/types"
import { useActor } from "@/lib/actor"
import { can } from "@/lib/permissions"

import { FEE_RULE_LABELS } from "./fee-rule-labels"

// ---- settings --------------------------------------------------------------------------

export function SettingsPanel() {
  const { state, updateSettings } = useSchool()
  const actor = useActor()
  const [rules, setRules] = useState<DailyTestRules>(
    state.settings.dailyTestRules
  )
  const [visibility, setVisibility] = useState(state.settings.resultVisibility)
  const canAcademic = can(actor.role, "settings.academic")
  const canResults = can(actor.role, "settings.results")
  const number =
    (key: keyof DailyTestRules) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setRules({
        ...rules,
        [key]: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0,
      })

  function save(patch: Parameters<typeof updateSettings>[0]) {
    const message = updateSettings(patch, actor)
    if (message) toast.error(message)
    else toast.success("Settings saved")
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5" />
            <CardTitle>Weekly test pass criteria</CardTitle>
          </div>
          <CardDescription>
            Used for every monthly subject outcome (BR-08).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Pass mark (%)">
            <Input
              disabled={!canAcademic}
              value={rules.passPercent}
              onChange={number("passPercent")}
            />
          </Field>
          <Field
            label="Failed tests allowed per month"
            hint="More than this ⇒ Failed + follow-up"
          >
            <Input
              disabled={!canAcademic}
              value={rules.maxFailsPerMonth}
              onChange={number("maxFailsPerMonth")}
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
              onChange={number("lowMarksMinPassed")}
            />
          </Field>
          <Field label="Low marks: average below (%)">
            <Input
              disabled={!canAcademic || !rules.lowMarksEnabled}
              value={rules.lowMarksBelowPercent}
              onChange={number("lowMarksBelowPercent")}
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5" />
            <CardTitle>Result fee rule</CardTitle>
          </div>
          <CardDescription>
            {canResults
              ? "Applied when a parent opens results."
              : "Set by the super admin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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
          <label className="flex items-center gap-2 text-sm">
            <Switch
              disabled={!canResults}
              checked={visibility.requireOverrideReason}
              onCheckedChange={(requireOverrideReason) =>
                setVisibility({ ...visibility, requireOverrideReason })
              }
            />
            Require a reason for manual overrides
          </label>
        </CardContent>
        {canResults ? (
          <CardFooter>
            <Button onClick={() => save({ resultVisibility: visibility })}>
              Save rule
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
