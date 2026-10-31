import { ApiHttpError } from "@/lib/api"

export const MIN_PASSWORD_LENGTH = 8

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HTTP_STATUS = {
  network: 0,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  conflict: 409,
  unprocessable: 422,
  tooManyRequests: 429,
} as const

export const LOGIN_MESSAGES = {
  missingEmail: "Please enter your email address.",
  invalidEmail: "Please enter a valid email address, like name@school.com.",
  missingPassword: "Please enter your password.",
  shortPassword: `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  invalidCredentials: "Incorrect email or password. Please try again.",
  network: "We can't reach the server. Check your internet connection and try again.",
  forbidden: "This account can't sign in right now. Please contact your school office.",
  tooManyAttempts: "Too many sign-in attempts. Please wait a minute and try again.",
  checkDetails: "Please check your email and password and try again.",
  wrongPortal: "This account cannot sign in to the school portal.",
  chooseSchool: "This email is used at more than one school. Choose the school, then sign in again.",
  generic: "Sign-in failed. Please try again.",
} as const

export type LoginField = "email" | "password"

export type LoginValidation = { field: LoginField; message: string }

/** First problem with the form, or null when it can be sent. */
export function validateLogin(email: string, password: string): LoginValidation | null {
  if (!email) return { field: "email", message: LOGIN_MESSAGES.missingEmail }
  if (!EMAIL_PATTERN.test(email)) return { field: "email", message: LOGIN_MESSAGES.invalidEmail }
  if (!password) return { field: "password", message: LOGIN_MESSAGES.missingPassword }
  if (password.length < MIN_PASSWORD_LENGTH) return { field: "password", message: LOGIN_MESSAGES.shortPassword }
  return null
}

const MESSAGE_BY_STATUS = new Map<number, string>([
  [HTTP_STATUS.network, LOGIN_MESSAGES.network],
  [HTTP_STATUS.badRequest, LOGIN_MESSAGES.checkDetails],
  [HTTP_STATUS.unauthorized, LOGIN_MESSAGES.invalidCredentials],
  [HTTP_STATUS.forbidden, LOGIN_MESSAGES.forbidden],
  [HTTP_STATUS.unprocessable, LOGIN_MESSAGES.checkDetails],
  [HTTP_STATUS.tooManyRequests, LOGIN_MESSAGES.tooManyAttempts],
])

/** Friendly text for a failed sign-in; never shows raw server or validator messages. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiHttpError) return MESSAGE_BY_STATUS.get(error.status) ?? LOGIN_MESSAGES.generic
  if (error instanceof TypeError) return LOGIN_MESSAGES.network
  return LOGIN_MESSAGES.generic
}

export type SchoolChoice = { id: number; name: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSchoolChoice(value: unknown): value is SchoolChoice {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string"
}

/** Schools offered by the API when one email exists at several schools (409). */
export function schoolChoices(error: unknown): SchoolChoice[] {
  if (!(error instanceof ApiHttpError) || error.status !== HTTP_STATUS.conflict) return []
  if (!isRecord(error.data) || !isRecord(error.data.data)) return []
  const schools = error.data.data.schools
  if (!Array.isArray(schools)) return []
  return schools.filter(isSchoolChoice)
}
