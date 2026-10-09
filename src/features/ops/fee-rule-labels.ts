import type { ResultFeeRule } from "@/data/types"

export const FEE_RULE_LABELS: Record<ResultFeeRule, string> = {
  all_due_paid: "All fees due up to the exam's fee month are paid",
  exam_month_paid: "The exam's fee month is paid",
  disabled: "No fee check",
}
