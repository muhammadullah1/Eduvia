import type { Role } from "@/lib/auth"

import type { PortalSyncPlan } from "./portal-sync"

export function portalSyncKey(
  role: Role,
  section: string,
  plan: PortalSyncPlan
): string {
  if (plan.mode === "full") return `full:${role}`
  return `partial:${role}:${section}:${[...plan.slices].sort().join(",")}`
}

const inFlight = new Map<string, Promise<void>>()

export function runPortalSyncOnce(
  key: string,
  run: () => Promise<void>
): Promise<void> {
  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = run().finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}
