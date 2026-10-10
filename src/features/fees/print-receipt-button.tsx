import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import type { Payment } from "@/data/types"
import { printReceipt } from "@/features/fees/receipts"

export function PrintReceiptButton({ payment }: { payment: Payment }) {
  const { state } = useSchool()
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => printReceipt(state, payment)}
    >
      <Printer data-icon="inline-start" />
      Receipt
    </Button>
  )
}
