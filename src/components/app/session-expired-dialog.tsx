import { useQueryClient } from "@tanstack/react-query"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, ApiHttpError } from "@/lib/api"
import { portalPath, saveAuth } from "@/lib/auth"
import { clearSessionExpired, useExpiredSession } from "@/lib/session-expiry"

/**
 * Shown over the current screen when the API rejects the token. Signing in
 * again here keeps whatever the user was editing; they then retry the action.
 */
export function SessionExpiredDialog() {
  const expired = useExpiredSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!expired) return null
  const account = email || expired.email

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!account.trim() || !password) {
      setError("Enter your email and password.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await api.login(account.trim(), password)
      saveAuth({ role: res.user.role, token: res.token, user: res.user })
      clearSessionExpired()
      setPassword("")
      if (res.user.role !== expired?.role) {
        navigate(portalPath(res.user.role), { replace: true })
      }
      void queryClient.invalidateQueries()
    } catch (err) {
      setError(err instanceof ApiHttpError ? err.message : "Could not sign in. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function leave() {
    clearSessionExpired()
    navigate("/login", { replace: true })
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <form onSubmit={signIn} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Session expired</DialogTitle>
            <DialogDescription>
              Sign in again to continue. Your unsaved changes on this page are kept, so you can retry once you are back in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="session-email">Email</Label>
            <Input
              id="session-email"
              type="email"
              autoComplete="username"
              value={account}
              readOnly={Boolean(expired.email)}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="session-password">Password</Label>
            <Input
              id="session-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={leave}>
              Go to sign-in page
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
