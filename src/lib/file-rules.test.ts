import { describe, expect, it } from "vitest"

import { DOCUMENT_RULES, fileRuleError, IMAGE_RULES } from "./file-rules"

const file = (type: string, size: number) =>
  new File([new Uint8Array(size)], "x", { type })

describe("fileRuleError", () => {
  it("accepts allowed types within the limit", () => {
    expect(fileRuleError(file("image/png", 1000), IMAGE_RULES)).toBeNull()
    expect(fileRuleError(file("application/pdf", 1000), DOCUMENT_RULES)).toBeNull()
  })
  it("rejects other types and oversized files", () => {
    expect(fileRuleError(file("application/pdf", 10), IMAGE_RULES)).toMatch(/JPG or PNG/)
    expect(fileRuleError(file("image/png", 3 * 1024 * 1024), IMAGE_RULES)).toMatch(/2 MB/)
    expect(fileRuleError(file("image/webp", 10), IMAGE_RULES)).not.toBeNull()
    expect(fileRuleError(file("text/html", 10), DOCUMENT_RULES)).not.toBeNull()
  })
})
