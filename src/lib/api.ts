import { clearAuth, loadAuth, type AuthUser } from "@/lib/auth"

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

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = loadAuth()
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
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network request failed"
    throw new ApiHttpError(0, `Cannot connect to API server: ${errorMsg}`)
  }

  if (res.status === 401) {
    clearAuth()
  }

  let body: unknown
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    body = await res.json()
  } else {
    body = await res.text()
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message?: unknown }).message)
        : res.statusText || "Request failed"
    throw new ApiHttpError(res.status, msg, body)
  }

  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as ApiResponse<T>).data
  }

  return body as T
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | undefined | null>) => {
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
    return request<T>(url, { method: "GET" })
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

  login: async (email: string, password: string): Promise<{ user: AuthUser; token: string }> => {
    return request<{ user: AuthUser; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  forgotPassword: async (email: string): Promise<{ message: string; resetUrl?: string }> => {
    return request<{ message: string; resetUrl?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  verifyResetToken: async (
    token: string
  ): Promise<{ valid: boolean; email: string; name: string; role: string; purpose: string }> => {
    return request<{ valid: boolean; email: string; name: string; role: string; purpose: string }>(
      `/auth/verify-token?token=${encodeURIComponent(token)}`,
      { method: "GET" }
    )
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    })
  },
}
