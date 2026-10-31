import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiHttpError } from "@/lib/api"

import { LOGIN_MESSAGES, loginErrorMessage, validateLogin } from "./login-errors"
import { LoginScreen } from "./login-screen"

const mocks = vi.hoisted(() => ({ login: vi.fn(), error: vi.fn(), info: vi.fn(), success: vi.fn(), dismiss: vi.fn() }))

vi.mock("@/lib/api", async (orig) => {
  const actual = await orig<typeof import("@/lib/api")>()
  return { ...actual, api: { ...actual.api, login: mocks.login } }
})
vi.mock("sonner", () => ({
  toast: { error: mocks.error, info: mocks.info, success: mocks.success, dismiss: mocks.dismiss },
}))

const VALID_EMAIL = "teacher@school.com"
const VALID_PASSWORD = "correct-horse"
const UNAUTHORIZED = 401
const NETWORK_FAILURE = 0

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <LoginScreen />
    </MemoryRouter>
  )
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: password } })
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
}

describe("LoginScreen", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it("asks for an email, not a username", () => {
    renderLogin()
    const email = screen.getByLabelText(/email/i)
    expect(email).toHaveAttribute("type", "email")
    expect(email).toHaveAttribute("autocomplete", "email")
    expect(email).toHaveAttribute("placeholder", "you@school.com")
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument()
  })

  it("shows and hides the password with an accessible toggle", () => {
    renderLogin()
    const password = screen.getByLabelText(/^password/i)
    expect(password).toHaveAttribute("type", "password")
    fireEvent.click(screen.getByRole("button", { name: "Show password" }))
    expect(password).toHaveAttribute("type", "text")
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }))
    expect(password).toHaveAttribute("type", "password")
  })

  it("toasts friendly validation errors without calling the API", () => {
    renderLogin()
    fillAndSubmit("not-an-email", VALID_PASSWORD)
    expect(mocks.error).toHaveBeenCalledWith(LOGIN_MESSAGES.invalidEmail, expect.anything())
    fillAndSubmit(VALID_EMAIL, "short")
    expect(mocks.error).toHaveBeenCalledWith(LOGIN_MESSAGES.shortPassword, expect.anything())
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute("aria-invalid", "true")
    expect(mocks.login).not.toHaveBeenCalled()
  })

  it("disables the form and shows 'Signing in…' while submitting, once only", async () => {
    let fail: (reason: unknown) => void = () => undefined
    mocks.login.mockReturnValue(new Promise<never>((_resolve, reject) => { fail = reject }))
    renderLogin()
    fillAndSubmit(VALID_EMAIL, VALID_PASSWORD)
    const button = await screen.findByRole("button", { name: /signing in…/i })
    expect(button).toBeDisabled()
    expect(screen.getByLabelText(/email/i)).toBeDisabled()
    expect(screen.getByLabelText(/^password/i)).toBeDisabled()
    fireEvent.submit(button)
    expect(mocks.login).toHaveBeenCalledTimes(1)
    fail(new ApiHttpError(UNAUTHORIZED, "Invalid credentials"))
    await waitFor(() => expect(screen.getByRole("button", { name: /^sign in$/i })).toBeEnabled())
  })

  it("toasts a friendly message when the credentials are wrong", async () => {
    mocks.login.mockRejectedValue(new ApiHttpError(UNAUTHORIZED, '"password" is incorrect'))
    renderLogin()
    fillAndSubmit(VALID_EMAIL, VALID_PASSWORD)
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(LOGIN_MESSAGES.invalidCredentials, expect.anything()))
    expect(mocks.login).toHaveBeenCalledWith(VALID_EMAIL, VALID_PASSWORD, undefined)
  })
})

describe("login error mapping", () => {
  it("never surfaces raw server text", () => {
    const BAD_REQUEST = 400
    expect(loginErrorMessage(new ApiHttpError(BAD_REQUEST, '"password" length must be at least 8 characters long'))).toBe(LOGIN_MESSAGES.checkDetails)
    expect(loginErrorMessage(new ApiHttpError(NETWORK_FAILURE, "Cannot connect to API server: Failed to fetch"))).toBe(LOGIN_MESSAGES.network)
    expect(loginErrorMessage(new Error("boom"))).toBe(LOGIN_MESSAGES.generic)
  })

  it("validates email and password length", () => {
    expect(validateLogin("", VALID_PASSWORD)).toEqual({ field: "email", message: LOGIN_MESSAGES.missingEmail })
    expect(validateLogin(VALID_EMAIL, "")).toEqual({ field: "password", message: LOGIN_MESSAGES.missingPassword })
    expect(validateLogin(VALID_EMAIL, VALID_PASSWORD)).toBeNull()
  })
})
