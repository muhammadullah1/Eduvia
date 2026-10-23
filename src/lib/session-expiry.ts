import { useSyncExternalStore } from "react"

/**
 * Raised when the session can't be renewed (refresh failed, or another tab
 * signed out). The portal clears the auth and sends the user to /login with a
 * notice; `returnTo` is where login brings them back.
 */
export type ExpiredSession = { returnTo: string }

const RETURN_KEY = "eduvia-return-to"
let expired: ExpiredSession | null = null
const listeners = new Set<() => void>()

function currentPath() {
  if (typeof window === "undefined") return "/"
  return window.location.pathname + window.location.search
}

export function markSessionExpired(returnTo = currentPath()) {
  if (expired) return
  // Same-origin paths only (not "//host" or "/\\host"), never back to /login.
  const safe = /^\/(?![/\\])/.test(returnTo) && !returnTo.startsWith("/login") ? returnTo : "/"
  try {
    sessionStorage.setItem(RETURN_KEY, safe)
  } catch {
    // Private mode: router state still carries it.
  }
  expired = { returnTo: safe }
  listeners.forEach((listener) => listener())
}

export function clearSessionExpired() {
  expired = null
  listeners.forEach((listener) => listener())
}

export function expiredSession() {
  return expired
}

/** One-shot read of the stored return-to path (cleared after use). */
export function takeReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    return value
  } catch {
    return null
  }
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

export const SESSION_EXPIRED_MESSAGE = "Session expired, please sign in again."
