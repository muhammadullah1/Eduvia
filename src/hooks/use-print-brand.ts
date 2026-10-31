import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import schoolCatalogService from "@/api/settings/school-catalog.service"
import { useSchool } from "@/data/store"
import type { ReceiptSettings } from "@/data/types"
import type { PrintBrand } from "@/lib/print"

const PROFILE_STALE_MS = 300_000

/** The closing lines of a printed receipt, from Settings → Receipt template. */
export function receiptFooter(receipt: ReceiptSettings) {
  const lines: string[] = []
  if (receipt.footerNote) lines.push(receipt.footerNote)
  if (receipt.showSignatureLine) lines.push("Received by ____________________")
  return lines
}

/** The school profile shared by the settings card and every print letterhead. */
export function useSchoolProfile() {
  return useQuery({
    queryKey: ["schools", "current"],
    queryFn: () => schoolCatalogService.getCurrentSchool(),
    staleTime: PROFILE_STALE_MS,
    retry: false,
  })
}

/** Letterhead for printed reports, plus the receipt template for printed receipts. */
export function usePrintBrand() {
  const { state } = useSchool()
  const profile = useSchoolProfile()
  return useMemo(() => {
    const report: PrintBrand = { school: profile.data?.name, logoUrl: profile.data?.logoUrl }
    const receipt: PrintBrand = { ...report, footer: receiptFooter(state.settings.receipt) }
    return { report, receipt }
  }, [profile.data?.name, profile.data?.logoUrl, state.settings.receipt])
}
