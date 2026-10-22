/**
 * Cross-tab coordination for the rotating refresh cookie. Every tab shares the
 * same cookie, so only one tab may spend it at a time: the others wait for the
 * lock and then pick up the token the winner stored. Web Locks when available,
 * otherwise a short-lived localStorage lock. New tokens are announced over
 * BroadcastChannel (and the storage event) so idle tabs update too.
 */

const AUTH_KEY = "eduvia-auth"
const LOCK_NAME = "eduvia-token-refresh"
const STORAGE_LOCK_KEY = "eduvia-token-refresh-lock"
const CHANNEL_NAME = "eduvia-auth"
const LOCK_TTL_MS = 10_000
const POLL_MS = 100

const tabId = Math.random().toString(36).slice(2)

/** Access token as persisted in localStorage (written by whichever tab refreshed last). */
export function storedAccessToken(): string | undefined {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { state?: { token?: string }; token?: string }
    return parsed.state?.token ?? parsed.token
  } catch {
    return undefined
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function readStorageLock() {
  const raw = localStorage.getItem(STORAGE_LOCK_KEY)
  if (!raw) return null
  const [owner, expires] = raw.split(":")
  return Number(expires) > Date.now() ? owner : null
}

async function withStorageLock<T>(staleToken: string | undefined, run: () => Promise<T>, fallback: (token: string) => T): Promise<T> {
  const deadline = Date.now() + LOCK_TTL_MS
  while (Date.now() < deadline) {
    const latest = storedAccessToken()
    if (latest && latest !== staleToken) return fallback(latest)
    if (!readStorageLock()) {
      localStorage.setItem(STORAGE_LOCK_KEY, `${tabId}:${Date.now() + LOCK_TTL_MS}`)
      // Another tab may have written in the same tick; the last writer wins.
      if (readStorageLock() === tabId) {
        try {
          return await run()
        } finally {
          if (readStorageLock() === tabId) localStorage.removeItem(STORAGE_LOCK_KEY)
        }
      }
    }
    await sleep(POLL_MS)
  }
  // Lock holder vanished (tab closed mid-refresh): try ourselves.
  return run()
}

let channel: BroadcastChannel | null = null
function getChannel() {
  if (!channel && typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/** Tells other tabs about a fresh access token. */
export function announceToken(token: string) {
  getChannel()?.postMessage({ type: "token", token })
}

/** Tells other tabs this browser's session ended (refresh failed or signed out). */
export function announceLogout() {
  getChannel()?.postMessage({ type: "logout" })
}

/** Calls `onLogout` when another tab's session ends (BroadcastChannel, or the token vanishing from storage). */
export function onLogoutFromOtherTab(onLogout: () => void) {
  const ch = getChannel()
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === "logout") onLogout()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_KEY && event.oldValue && !storedAccessToken()) onLogout()
  }
  ch?.addEventListener("message", onMessage)
  window.addEventListener("storage", onStorage)
  return () => {
    ch?.removeEventListener("message", onMessage)
    window.removeEventListener("storage", onStorage)
  }
}

/** Calls `onToken` when another tab refreshes. Returns an unsubscribe function. */
export function onTokenFromOtherTab(onToken: (token: string) => void) {
  const ch = getChannel()
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === "token" && typeof event.data.token === "string") onToken(event.data.token)
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_KEY) return
    const token = storedAccessToken()
    if (token) onToken(token)
  }
  ch?.addEventListener("message", onMessage)
  window.addEventListener("storage", onStorage)
  return () => {
    ch?.removeEventListener("message", onMessage)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * Runs `refresh` while holding the cross-tab lock, unless another tab already
 * replaced `staleToken`, in which case its token is returned without a call.
 */
export async function coordinatedRefresh(
  staleToken: string | undefined,
  refresh: () => Promise<string | null>
): Promise<string | null> {
  const run = async () => {
    const latest = storedAccessToken()
    if (latest && latest !== staleToken) return latest
    const token = await refresh()
    if (token) announceToken(token)
    return token
  }
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined
  if (locks?.request) return locks.request(LOCK_NAME, run)
  return withStorageLock(staleToken, run, (token) => token)
}
