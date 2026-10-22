import { useSyncExternalStore } from "react"

/**
 * Who was signed in when the API rejected the token. While this is set the
 * portal shows the re-login dialog and the API client sends nothing, so no
 * request leaves without a token and the open form keeps its data.
 */
export type ExpiredSession = { email: string; role: string }

let expired: ExpiredSession | null = null
const listeners = new Set<() => void>()

export function markSessionExpired(session: ExpiredSession) {
  if (expired) return
  expired = session
  listeners.forEach((listener) => listener())
}

export function clearSessionExpired() {
  expired = null
  listeners.forEach((listener) => listener())
}

export function expiredSession() {
  return expired
}

export function useExpiredSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => expired
  )
}

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign in again to continue."
