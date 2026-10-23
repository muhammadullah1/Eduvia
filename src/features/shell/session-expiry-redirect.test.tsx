import { cleanup, render, screen } from "@testing-library/react"
import { act } from "react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"

import { clearSessionExpired, markSessionExpired, SESSION_EXPIRED_MESSAGE, takeReturnTo } from "@/lib/session-expiry"

import { SessionExpiryRedirect } from "./session-expiry-redirect"

function LoginProbe() {
  const state = useLocation().state as { from?: string; expired?: boolean }
  return <p>{`login from=${state?.from} expired=${String(state?.expired)}`}</p>
}

afterEach(() => {
  cleanup()
  clearSessionExpired()
  sessionStorage.clear()
})

describe("session expiry", () => {
  it("redirects to /login with the return-to path and the expired flag", () => {
    render(
      <MemoryRouter initialEntries={["/admin/exams/3/edit"]}>
        <SessionExpiryRedirect />
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route path="*" element={<p>portal</p>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText("portal")).toBeTruthy()
    act(() => markSessionExpired("/admin/exams/3/edit"))
    expect(screen.getByText("login from=/admin/exams/3/edit expired=true")).toBeTruthy()
    expect(takeReturnTo()).toBe("/admin/exams/3/edit")
    expect(takeReturnTo()).toBeNull()
  })

  it("never uses /login or external URLs as the return target", () => {
    markSessionExpired("/login?x=1")
    expect(takeReturnTo()).toBe("/")
    clearSessionExpired()
    markSessionExpired("https://evil.example")
    expect(takeReturnTo()).toBe("/")
    clearSessionExpired()
    markSessionExpired("//evil.example/x")
    expect(takeReturnTo()).toBe("/")
  })

  it("uses the agreed wording", () => {
    expect(SESSION_EXPIRED_MESSAGE).toBe("Session expired, please sign in again.")
  })
})
