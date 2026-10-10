import { loadAuth } from "@/lib/auth"

export function signedInTeacher<T extends { email: string }>(staff: T[]) {
  const email = loadAuth()?.user?.email
  return staff.find((person) => person.email === email)
}
