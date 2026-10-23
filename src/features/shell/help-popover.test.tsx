import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import systemNoticesService from "@/api/system-notices/system-notices.service"

import { HelpPopover } from "./help-popover"

function renderPopover(onOpenSection = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <HelpPopover onOpenSection={onOpenSection} />
    </QueryClientProvider>
  )
  return onOpenSection
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("HelpPopover", () => {
  it("shows a dot and links each notice to its page", async () => {
    vi.spyOn(systemNoticesService, "list").mockResolvedValue([
      { id: "substitutions-pending", title: "Lessons need a substitute", detail: "2 lessons", count: 2, section: "substitutes" },
    ])
    const onOpen = renderPopover()
    expect(await screen.findByTestId("help-dot")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Help, 1 item/ }))
    fireEvent.click(await screen.findByText("Lessons need a substitute"))
    expect(onOpen).toHaveBeenCalledWith("substitutes")
  })

  it("has no dot when nothing needs attention", async () => {
    vi.spyOn(systemNoticesService, "list").mockResolvedValue([])
    renderPopover()
    fireEvent.click(await screen.findByRole("button", { name: "Help" }))
    expect(await screen.findByText("You're all caught up.")).toBeTruthy()
    expect(screen.queryByTestId("help-dot")).toBeNull()
  })
})
