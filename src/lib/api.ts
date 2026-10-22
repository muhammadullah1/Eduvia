import { type AuthUser, clearAuth, loadAuth, saveAuth } from "@/lib/auth"
import { markSessionExpired, SESSION_EXPIRED_MESSAGE } from "@/lib/session-expiry"
import { announceLogout, coordinatedRefresh, onLogoutFromOtherTab, onTokenFromOtherTab } from "@/lib/token-refresh"

const BASE_URL = import.meta.env.VITE_API_URL || "/api"

export type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
}

export class ApiHttpError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = "ApiHttpError"
    this.status = status
    this.data = data
  }
}

/** Sign-in, refresh and password endpoints work without a token. */
const PUBLIC_PATH = /^\/auth\/(login|refresh|logout|forgot-password|verify-token|reset-password)\b/

let refreshInFlight: Promise<string | null> | null = null

async function requestNewAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", platform: "webApp" },
    })
    if (!res.ok) return null
    const body = (await res.json()) as ApiResponse<{ token?: string }>
    return body?.data?.token ?? null
  } catch {
    return null
  }
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent
 * 401s in this tab share one call, and other tabs are coordinated through
 * token-refresh.ts so the rotating cookie is spent by one tab at a time.
 */
export function refreshAccessToken(staleToken = loadAuth()?.token): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = coordinatedRefresh(staleToken, requestNewAccessToken)
      .then((token) => {
        const session = loadAuth()
        if (!token || !session) return null
        if (session.token !== token) saveAuth({ ...session, token })
        return token
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

// Keep idle tabs on the latest token another tab obtained, and sign them out
// when another tab's session ends.
if (typeof window !== "undefined") {
  onLogoutFromOtherTab(() => {
    if (!loadAuth()) return
    clearAuth()
    markSessionExpired()
  })
  onTokenFromOtherTab((token) => {
    const session = loadAuth()
    if (session && session.token !== token) saveAuth({ ...session, token })
  })
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const session = loadAuth()
  const isPublic = PUBLIC_PATH.test(path)
  // Never send a portal request without a token.
  if (!isPublic && !session?.token) {
    throw new ApiHttpError(401, SESSION_EXPIRED_MESSAGE)
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    platform: "webApp",
    ...(options.headers as Record<string, string>),
  }

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    })
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Network request failed"
    throw new ApiHttpError(0, `Cannot connect to API server: ${errorMsg}`)
  }

  if (res.status === 401 && !isPublic) {
    // Access tokens are short-lived: refresh once, then retry the original request once.
    if (!retried && session?.token && (await refreshAccessToken(session.token))) {
      return request<T>(path, options, true)
    }
    // Refresh failed: sign out here and in every other tab.
    clearAuth()
    announceLogout()
    markSessionExpired()
    throw new ApiHttpError(401, SESSION_EXPIRED_MESSAGE)
  }

  let body: unknown
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    body = await res.json()
  } else {
    body = await res.text()
  }

  const envelope =
    typeof body === "object" && body !== null
      ? (body as { success?: unknown; message?: unknown })
      : null
  const failed =
    envelope?.success === false || !res.ok
  if (failed) {
    const msg =
      envelope && "message" in envelope && envelope.message
        ? String(envelope.message)
        : res.statusText || "Request failed"
    throw new ApiHttpError(res.ok ? 400 : res.status, msg, body)
  }

  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as ApiResponse<T>).data
  }

  return body as T
}

const inFlightGet = new Map<string, Promise<unknown>>()

function getCacheKey(
  path: string,
  query?: Record<string, string | number | undefined | null>
) {
  let url = path
  if (query) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        q.append(k, String(v))
      }
    }
    const qs = q.toString()
    if (qs) url += (url.includes("?") ? "&" : "?") + qs
  }
  return url
}

export const api = {
  get: <T>(
    path: string,
    query?: Record<string, string | number | undefined | null>
  ) => {
    const cacheKey = getCacheKey(path, query)
    const pending = inFlightGet.get(cacheKey)
    if (pending) return pending as Promise<T>

    const promise = request<T>(cacheKey, { method: "GET" }).finally(() => {
      inFlightGet.delete(cacheKey)
    })
    inFlightGet.set(cacheKey, promise)
    return promise
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),


  login: async (
    email: string,
    password: string,
    schoolId?: number
  ): Promise<{ user: AuthUser; token: string }> => {
    return request<{ user: AuthUser; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        ...(schoolId ? { schoolId } : {}),
      }),
    })
  },

  /** Revokes the refresh cookie server-side; local sign-out happens regardless. */
  logout: async (): Promise<void> => {
    try {
      await request<unknown>("/auth/logout", { method: "POST" })
    } catch {
      // Already signed out or offline: nothing else to revoke.
    }
  },

  forgotPassword: async (
    email: string
  ): Promise<{ message: string; resetUrl?: string }> => {
    return request<{ message: string; resetUrl?: string }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      }
    )
  },

  verifyResetToken: async (
    token: string
  ): Promise<{
    valid: boolean
    email: string
    name: string
    role: string
    purpose: string
  }> => {
    return request<{
      valid: boolean
      email: string
      name: string
      role: string
      purpose: string
    }>(`/auth/verify-token?token=${encodeURIComponent(token)}`, {
      method: "GET",
    })
  },

  resetPassword: async (
    token: string,
    password: string
  ): Promise<{ message: string }> => {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    })
  },
}
