import { afterEach, describe, expect, it, vi } from "vitest"

import { clearAuth } from "@/lib/auth"

const user = {
  id: 1,
  firstName: "Ayesha",
  lastName: "Khan",
  email: "admin@cls.edu.pk",
  role: "super_admin" as const,
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

async function requestedUrl(apiUrl: string) {
  vi.stubEnv("VITE_API_URL", apiUrl)
  vi.resetModules()
  const fetchMock = vi
    .fn()
    .mockResolvedValue(jsonResponse({ success: true, data: [] }))
  vi.stubGlobal("fetch", fetchMock)
  const { saveAuth } = await import("@/lib/auth")
  saveAuth({ role: "super_admin", token: "t", user })
  const { api } = await import("@/lib/api")
  await api.get("/exams")
  const [url, init] = fetchMock.mock.lastCall ?? []
  return { url: String(url), credentials: init?.credentials }
}

describe("API base URL (VITE_API_URL)", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
    clearAuth()
  })

  it("calls the configured cross-site API with cookies included", async () => {
    const { url, credentials } = await requestedUrl(
      "https://api.example.com/api"
    )
    expect(url).toBe("https://api.example.com/api/exams")
    expect(credentials).toBe("include")
  })

  it("falls back to the same-origin /api (dev proxy) when unset", async () => {
    const { url } = await requestedUrl("")
    expect(url).toBe("/api/exams")
  })
})
