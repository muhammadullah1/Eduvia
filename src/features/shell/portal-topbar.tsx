import {
  Bell,
  ChevronRight,
  CircleHelp,
  Menu,
  Search,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Role } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { HeaderUserMenu } from "./header-user-menu"
import { breadcrumbsForSection } from "./section-breadcrumbs"

type Props = {
  role: Role
  section: string
  userName: string
  initials: string
  sessionLabel: string
  query: string
  onQueryChange: (value: string) => void
  onMenuClick: () => void
  onLogout: () => void
}

export function PortalTopbar({
  role,
  section,
  userName,
  initials,
  sessionLabel,
  query,
  onQueryChange,
  onMenuClick,
  onLogout,
}: Props) {
  const crumbs = useMemo(
    () => breadcrumbsForSection(section, role),
    [section, role]
  )
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--cls-border)] bg-white px-4 lg:px-5"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-[var(--cls-muted)] lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu />
      </Button>

      <nav
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
        aria-label="Breadcrumb"
      >
        {crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 ? (
              <ChevronRight className="size-3 shrink-0 text-[#c5cbd3]" />
            ) : null}
            <span
              className={cn(
                "truncate text-sm",
                index === crumbs.length - 1
                  ? "font-semibold text-[var(--cls-ink)]"
                  : "text-[var(--cls-muted)]"
              )}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div
        className="hidden h-10 shrink-0 items-center gap-2 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)] px-3 md:flex"
        title="Current academic session"
      >
        <span
          className="size-2 shrink-0 rounded-full bg-[var(--cls-brand)]"
          aria-hidden
        />
        <span className="whitespace-nowrap text-sm font-medium text-[var(--cls-ink)]">
          {sessionLabel}
        </span>
        <span className="whitespace-nowrap text-xs text-[var(--cls-muted)]">
          Current
        </span>
      </div>

      <div className="relative hidden w-56 lg:block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search students..."
          className="bg-background pl-9"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="hidden text-[var(--cls-muted)] xl:inline-flex"
        aria-label="Help"
      >
        <CircleHelp />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="relative text-[var(--cls-muted)]"
        aria-label="Notifications"
        onClick={() => setNotifOpen((open) => !open)}
      >
        <Bell />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#d64545]" />
      </Button>

      <HeaderUserMenu
        role={role}
        userName={userName}
        initials={initials}
        onLogout={onLogout}
        variant="cls"
      />

      {notifOpen ? (
        <div
          className="absolute top-14 right-4 z-30 w-72 rounded-xl border border-[var(--cls-border)] bg-white p-3 shadow-lg"
          role="dialog"
          aria-label="Notifications"
        >
          <p className="text-xs text-[var(--cls-muted)]">No new notifications.</p>
        </div>
      ) : null}
    </header>
  )
}
