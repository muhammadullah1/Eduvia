import type { ApiFeeMonth } from "@/lib/api-types"
import type { FeeMonth } from "@/data/types"

export function mapFeeMonthDto(dto: ApiFeeMonth): FeeMonth {
  return {
    id: String(dto.id),
    studentId: String(dto.studentId),
    month: dto.month.slice(0, 7),
    feeType: dto.feeType ?? "Tuition",
    amountDue: Number(dto.amountDue) || 0,
    amountPaid: Number(dto.amountPaid) || 0,
    dueDate: dto.dueDate
      ? dto.dueDate.slice(0, 10)
      : `${dto.month.slice(0, 7)}-10`,
  }
}
