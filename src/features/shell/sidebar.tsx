import { LogOut } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { type Role } from "@/lib/auth"

import { Logo } from "./logo"
import { navigation, roles } from "./navigation"

export function Sidebar({
  role,
  userName,
  initials,
  active,
  onNavigate,
  onLogout,
}: {
  role: Role
  userName: string
  initials: string
  active: string
  onNavigate: (id: string) => void
  onLogout: () => void
}) {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex h-full flex-col bg-sidebar p-3 text-sidebar-foreground">
      <div className="px-2 py-3">
        <Logo inverted />
      </div>
      <p className="mt-4 px-2 text-[10px] font-semibold tracking-[0.18em] text-[var(--sidebar-inactive)]/80 uppercase">
        Workspace
      </p>
      <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto">
        {navigation[role].map((item) => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${selected ? "bg-white text-[var(--primary-color)] shadow-sm" : "text-[var(--sidebar-inactive)] hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {userName}
            </p>
            <p className="truncate text-[11px] text-[var(--sidebar-inactive)]">
              {roles[role].label}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            onClick={onLogout}
          >
            <LogOut />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-[var(--sidebar-inactive)] hover:bg-white/10 hover:text-white"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "Light theme" : "Dark theme"}
        </Button>
      </div>
    </div>
  )
}
