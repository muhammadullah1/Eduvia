import { type Role } from "@/lib/auth"

import { Logo } from "./logo"
import { navigation } from "./navigation"

export function Sidebar({
  role,
  active,
  onNavigate,
}: {
  role: Role
  active: string
  onNavigate: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar p-3 text-sidebar-foreground">
      <div className="px-2 py-3">
        <Logo inverted />
      </div>
      <p className="mt-4 px-2 text-[10px] font-semibold tracking-[0.18em] text-[var(--sidebar-inactive)]/80 uppercase">
        Workspace
      </p>
      <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto pb-4">
        {navigation[role].map((item) => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${selected ? "bg-white text-[var(--sidebar-primary-foreground)] shadow-sm" : "text-[var(--sidebar-inactive)] hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
