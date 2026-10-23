import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, ApiHttpError } from "@/lib/api"
import { clearAuth, loadAuth, saveAuth } from "@/lib/auth"
import { clearSessionExpired, expiredSession, SESSION_EXPIRED_MESSAGE } from "@/lib/session-expiry"

const user = { id: 1, firstName: "Ayesha", lastName: "Khan", email: "admin@cls.edu.pk", role: "super_admin" as const }

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("API client with an expired session", () => {
  it("signs this tab out when another tab's session ends", () => {
    saveAuth({ role: "super_admin", token: "t", user })
    const oldValue = localStorage.getItem("eduvia-auth")
    localStorage.setItem("eduvia-auth", JSON.stringify({ state: { role: "super_admin" }, version: 0 }))
    window.dispatchEvent(new StorageEvent("storage", { key: "eduvia-auth", oldValue }))
    expect(loadAuth()).toBeNull()
    expect(expiredSession()).not.toBeNull()
  })


  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    saveAuth({ role: "super_admin", token: "expired-token", user })
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
    clearSessionExpired()
    clearAuth()
  })

  it("sends the bearer token while signed in", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true, data: [] }))
    await api.get("/exams")
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer expired-token")
  })

  it("turns a 401 into a session-expired state when the refresh also fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { success: false, message: "Your session has expired." }))
      .mockResolvedValueOnce(jsonResponse(401, { success: false }))
    await expect(api.post("/exams", { name: "Mid term" })).rejects.toMatchObject({
      status: 401,
      message: SESSION_EXPIRED_MESSAGE,
    })
    expect(expiredSession()).toEqual({ returnTo: "/" })
    expect(loadAuth()).toBeNull()
  })

  it("never sends a portal request without a token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false }))
    await expect(api.get("/classes")).rejects.toBeInstanceOf(ApiHttpError)
    await expect(api.post("/exams", { name: "Mid term" })).rejects.toMatchObject({ message: SESSION_EXPIRED_MESSAGE })
    // The original request and one refresh attempt; nothing after that.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("refreshes silently on 401 and retries the original request once", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { success: false }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { token: "fresh-token" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [{ id: 1 }] }))
    await expect(api.get("/exams")).resolves.toEqual([{ id: 1 }])
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/)
    expect(fetchMock.mock.calls[1][1].credentials).toBe("include")
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer fresh-token")
    expect(loadAuth()?.token).toBe("fresh-token")
    expect(expiredSession()).toBeNull()
  })

  it("concurrent 401s share one refresh call", async () => {
    let refreshCalls = 0
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1
        await new Promise((resolve) => setTimeout(resolve, 10))
        return jsonResponse(200, { success: true, data: { token: "fresh-token" } })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === "Bearer fresh-token"
        ? jsonResponse(200, { success: true, data: url })
        : jsonResponse(401, { success: false })
    })
    const results = await Promise.all([api.get("/a"), api.get("/b"), api.post("/c", { x: 1 })])
    expect(results).toHaveLength(3)
    expect(refreshCalls).toBe(1)
  })

  it("does not loop when the retried request is still unauthorised", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { success: false }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { token: "fresh-token" } }))
      .mockResolvedValueOnce(jsonResponse(401, { success: false }))
    await expect(api.get("/exams")).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(expiredSession()).not.toBeNull()
  })

  it("still allows signing in while the session is expired", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { success: false }))
      .mockResolvedValueOnce(jsonResponse(401, { success: false }))
    await expect(api.get("/classes")).rejects.toBeInstanceOf(ApiHttpError)
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { user, token: "fresh" } }))
    await expect(api.login("admin@cls.edu.pk", "password")).resolves.toMatchObject({ token: "fresh" })
  })
})
