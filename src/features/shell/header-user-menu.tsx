import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Role } from "@/lib/auth"

import { roles } from "./navigation"

type Props = {
  role: Role
  userName: string
  initials: string
  onLogout: () => void
  variant?: "cls" | "default"
}

export function HeaderUserMenu({
  role,
  userName,
  initials,
  onLogout,
  variant = "cls",
}: Props) {
  const { theme, setTheme } = useTheme()
  const isCls = variant === "cls"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            isCls
              ? "flex max-w-[200px] items-center gap-2 rounded-lg px-1 py-1 hover:bg-[var(--page-wash)]"
              : "flex max-w-[200px] items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted"
          }
        >
          <Avatar className="size-8">
            <AvatarFallback
              className={
                isCls
                  ? "bg-[var(--cls-brand)] text-xs text-white"
                  : "bg-primary text-xs text-primary-foreground"
              }
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left sm:block">
            <span
              className={
                isCls
                  ? "block truncate text-xs font-semibold text-[var(--cls-ink)]"
                  : "block truncate text-xs font-semibold"
              }
            >
              {userName}
            </span>
            <span
              className={
                isCls
                  ? "block truncate text-[10px] text-[var(--cls-muted)]"
                  : "block truncate text-[10px] text-muted-foreground"
              }
            >
              {roles[role].short}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout}>Sign out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
