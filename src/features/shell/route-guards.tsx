import { type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { loadAuth, portalPath } from "@/lib/auth"

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const auth = loadAuth()
  if (!auth) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const auth = loadAuth()
  if (auth) return <Navigate to={portalPath(auth.role)} replace />
  return children
}

export function HomeRedirect() {
  const auth = loadAuth()
  if (!auth) return <Navigate to="/login" replace />
  return <Navigate to={portalPath(auth.role)} replace />
}
