import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, type SessionResponse } from "@/lib/api"
import { SESSION_FOCUS_THROTTLE_MS, useSessionSync } from "@/lib/use-session"
import { useAuthStore } from "@/stores/auth-store"

const user = {
  id: 1,
  firstName: "Ayesha",
  lastName: "Khan",
  email: "ops@cls.edu.pk",
  role: "operations_manager" as const,
}

function session(permissions: SessionResponse["permissions"]): SessionResponse {
  return { user, portal: "admin", permissions }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  })
}

describe("useSessionSync on focus", () => {
  let now = 0
  const me = vi.fn<() => Promise<SessionResponse>>()

  beforeEach(() => {
    now = Date.now()
    vi.spyOn(Date, "now").mockImplementation(() => now)
    vi.spyOn(api, "me").mockImplementation(me)
    setVisibility("visible")
    useAuthStore
      .getState()
      .setSession({
        role: user.role,
        token: "t",
        user,
        permissions: ["audit.read", "school.read"],
      })
  })

  afterEach(() => {
    cleanup()
    me.mockReset()
    vi.restoreAllMocks()
    useAuthStore
      .getState()
      .setSession({ role: user.role, token: "t", user, permissions: [] })
  })

  async function mounted() {
    me.mockResolvedValueOnce(session(["audit.read", "school.read"]))
    renderHook(() => useSessionSync(), { wrapper })
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(useAuthStore.getState().permissions).toContain("audit.read")
    )
  }

  it("re-reads permissions when the window regains focus, and menus get the revoked list", async () => {
    await mounted()
    me.mockResolvedValueOnce(session(["school.read"]))
    now += SESSION_FOCUS_THROTTLE_MS
    act(() => {
      window.dispatchEvent(new Event("focus"))
    })
    await waitFor(() => expect(me).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(useAuthStore.getState().permissions).toEqual(["school.read"])
    )
  })

  it("re-reads when the tab becomes visible again", async () => {
    await mounted()
    me.mockResolvedValueOnce(session(["school.read"]))
    now += SESSION_FOCUS_THROTTLE_MS
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await waitFor(() => expect(me).toHaveBeenCalledTimes(2))
  })

  it("is throttled and skips hidden tabs", async () => {
    await mounted()
    act(() => {
      window.dispatchEvent(new Event("focus"))
      document.dispatchEvent(new Event("visibilitychange"))
    })
    now += SESSION_FOCUS_THROTTLE_MS
    setVisibility("hidden")
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    expect(me).toHaveBeenCalledTimes(1)
  })
})
