import { Bell, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { portalForRole, type Role } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { ClsMenuTrigger } from "./cls-menu-trigger"
import { HeaderUserMenu } from "./header-user-menu"
import { HelpPopover } from "./help-popover"
import { breadcrumbsForSection } from "./section-breadcrumbs"

type Props = {
  role: Role
  section: string
  panel?: string | null
  userName: string
  initials: string
  sessionLabel: string
  onLogout: () => void
  onOpenSection: (section: string) => void
}

export function PortalTopbar({
  role,
  section,
  panel,
  userName,
  initials,
  sessionLabel,
  onLogout,
  onOpenSection,
}: Props) {
  const crumbs = useMemo(
    () => breadcrumbsForSection(section, portalForRole(role), panel),
    [section, role, panel]
  )
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header
      className="relative sticky top-0 z-20 flex h-[var(--shell-header-height)] shrink-0 items-center gap-[10.5px] border-b border-[var(--cls-border)] bg-white px-3.5"
    >
      <ClsMenuTrigger />

      <nav
        className="flex min-w-0 flex-1 items-center gap-[7px] overflow-hidden"
        aria-label="Breadcrumb"
      >
        {crumbs.map((crumb, index) => (
          <span
            key={`${crumb}-${index}`}
            className="flex min-w-0 items-center gap-[7px]"
          >
            {index > 0 ? (
              <ChevronRight
                className="size-3 shrink-0 text-[#c5cbd3]"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "truncate text-[12.25px] leading-[17.5px]",
                index === crumbs.length - 1
                  ? "font-semibold text-[var(--cls-ink)]"
                  : "font-normal text-[var(--cls-muted)]"
              )}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-[10.5px]">
        <div
          className="flex items-center gap-[5px] rounded-full border border-[var(--cls-session-border)] bg-[var(--cls-session-bg)] px-2.5 py-[3.5px]"
          title="Current academic session"
        >
          <span
            className="size-[7px] shrink-0 rounded-full bg-[var(--cls-brand)]"
            aria-hidden
          />
          <span className="whitespace-nowrap text-[10.5px] font-medium leading-[14px] text-[var(--cls-brand)]">
            {sessionLabel} • Current
          </span>
        </div>

        <HelpPopover onOpenSection={onOpenSection} />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative size-8 text-[var(--cls-muted)]"
          aria-label="Notifications"
          onClick={() => setNotifOpen((open) => !open)}
        >
          {/* No notification feed exists yet, so no unread badge. */}
          <Bell className="size-[18px]" />
        </Button>

        <HeaderUserMenu
          role={role}
          userName={userName}
          initials={initials}
          onLogout={onLogout}
          variant="cls"
        />
      </div>

      {notifOpen ? (
        <div
          className="absolute top-[calc(100%+4px)] right-3.5 z-30 w-72 rounded-xl border border-[var(--cls-border)] bg-white p-3 shadow-lg"
          role="dialog"
          aria-label="Notifications"
        >
          <p className="text-xs text-[var(--cls-muted)]">
            No new notifications.
          </p>
        </div>
      ) : null}
    </header>
  )
}
