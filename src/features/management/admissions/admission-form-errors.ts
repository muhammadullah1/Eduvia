/** Map API save errors to wizard field keys and the step to show. */
export function mapAdmissionSaveError(message: string): {
  fields: Record<string, string>
  step?: number
} {
  const fields: Record<string, string> = {}
  let step: number | undefined
  const lower = message.toLowerCase()

  if (
    lower.includes("class") ||
    lower.includes("fkclassid") ||
    lower.includes("grade")
  ) {
    fields.classId = message.includes("class")
      ? message
      : "Select the class this student is applying for."
    step = 0
  }
  if (lower.includes("phone") || lower.includes("mobile")) {
    fields.phone = message
    step = 0
  }
  if (lower.includes("guardian") || lower.includes("parent")) {
    fields.guardian = message
    step = 1
  }
  if (lower.includes("date of birth") || lower.includes("dob")) {
    fields.dob = message
    step = 0
  }
  if (lower.includes("interview date")) {
    fields.interviewDate = message
    step = 3
  }
  if (lower.includes("name") && !lower.includes("guardian")) {
    fields.name = message
    step = 0
  }
  if (lower.includes("address")) {
    fields.address = message
    step = 0
  }

  return { fields, step }
}
