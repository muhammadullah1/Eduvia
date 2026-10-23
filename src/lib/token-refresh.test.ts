import { afterEach, describe, expect, it, vi } from "vitest"

import { coordinatedRefresh, storedAccessToken } from "@/lib/token-refresh"

const writeToken = (token: string) =>
  localStorage.setItem("eduvia-auth", JSON.stringify({ state: { role: "super_admin", token }, version: 0 }))

/** Serialises callbacks like the real Web Locks API. */
function fakeLocks() {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    request: (_name: string, cb: () => Promise<unknown>) => {
      const run = tail.then(cb)
      tail = run.catch(() => undefined)
      return run
    },
  }
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe.each([
  ["Web Locks", true],
  ["localStorage fallback", false],
])("cross-tab refresh with %s", (_label, withLocks) => {
  it("only one 'tab' spends the refresh cookie; the other reuses its token", async () => {
    if (withLocks) vi.stubGlobal("navigator", { ...navigator, locks: fakeLocks() })
    else vi.stubGlobal("navigator", { ...navigator, locks: undefined })
    writeToken("old")
    const refresh = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      writeToken("new")
      return "new"
    })
    // Two tabs hit 401 with the same stale token at the same time.
    const [a, b] = await Promise.all([coordinatedRefresh("old", refresh), coordinatedRefresh("old", refresh)])
    expect([a, b]).toEqual(["new", "new"])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(storedAccessToken()).toBe("new")
  })

  it("skips the network when another tab already stored a newer token", async () => {
    if (withLocks) vi.stubGlobal("navigator", { ...navigator, locks: fakeLocks() })
    else vi.stubGlobal("navigator", { ...navigator, locks: undefined })
    writeToken("from-other-tab")
    const refresh = vi.fn(async () => "unused")
    await expect(coordinatedRefresh("old", refresh)).resolves.toBe("from-other-tab")
    expect(refresh).not.toHaveBeenCalled()
  })
})
