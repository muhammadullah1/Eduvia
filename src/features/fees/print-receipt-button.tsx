import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import type { Payment } from "@/data/types"
import { printReceipt } from "@/features/fees/receipts"
import { usePrintBrand } from "@/hooks/use-print-brand"

export function PrintReceiptButton({ payment }: { payment: Payment }) {
  const { state } = useSchool()
  const brand = usePrintBrand().receipt
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => printReceipt(state, payment, brand)}
    >
      <Printer data-icon="inline-start" />
      Receipt
    </Button>
  )
}
