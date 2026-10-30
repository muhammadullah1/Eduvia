import { act, render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { useUrlTab } from "./use-url-tab"

function Probe() {
  const [tab, setTab] = useUrlTab(["income", "expenses", "report"] as const)
  const location = useLocation()
  return (
    <>
      <p data-testid="out">{`${tab}|${location.search}`}</p>
      <button onClick={() => setTab("expenses")}>expenses</button>
      <button onClick={() => setTab("income")}>income</button>
    </>
  )
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Probe />
    </MemoryRouter>
  )

describe("useUrlTab", () => {
  it("reads a deep-linked tab and falls back to the first for unknown values", () => {
    renderAt("/admin/finance?tab=report")
    expect(screen.getByTestId("out").textContent).toBe("report|?tab=report")
  })

  it("ignores an unknown tab", () => {
    renderAt("/admin/finance?tab=nope")
    expect(screen.getByTestId("out").textContent?.startsWith("income|")).toBe(true)
  })

  it("writes the tab to the URL and keeps other params", () => {
    renderAt("/admin/finance?x=1")
    act(() => screen.getByText("expenses").click())
    expect(screen.getByTestId("out").textContent).toBe("expenses|?x=1&tab=expenses")
    act(() => screen.getByText("income").click())
    expect(screen.getByTestId("out").textContent).toBe("income|?x=1")
  })
})
