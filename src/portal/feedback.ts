import { toast } from "sonner"

import type { ActionResult } from "@/types"

export function toastResult(result: ActionResult) {
  if (result.ok) toast.success(result.message)
  else toast.error(result.error)
  return result.ok
}
