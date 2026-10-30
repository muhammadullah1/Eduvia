/** Same bounds as the API's `reason` validation for role changes. */
export const REASON_MIN = 5
export const REASON_MAX = 500

export function isReasonValid(reason: string) {
  const length = reason.trim().length
  return length >= REASON_MIN && length <= REASON_MAX
}
