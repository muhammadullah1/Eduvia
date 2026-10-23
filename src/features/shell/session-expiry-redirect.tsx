import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { clearSessionExpired, useExpiredSession } from "@/lib/session-expiry"

/** Sends the user to /login (with where to come back to) once the session has ended. */
export function SessionExpiryRedirect() {
  const expired = useExpiredSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!expired) return
    navigate("/login", { replace: true, state: { from: expired.returnTo, expired: true } })
    clearSessionExpired()
  }, [expired, navigate])

  return null
}
