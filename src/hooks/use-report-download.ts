import { useState } from "react"

import type { FeeReportFormat } from "@/api/fees/fee-reports.service"
import { toast } from "@/lib/toast"

/** Runs one file download at a time and reports the outcome as a toast. */
export function useReportDownload() {
  const [busy, setBusy] = useState<FeeReportFormat | null>(null)

  async function run(format: FeeReportFormat, download: () => Promise<string>) {
    setBusy(format)
    try {
      const name = await download()
      toast.success(`Downloaded ${name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    } finally {
      setBusy(null)
    }
  }

  return { busy, run }
}
