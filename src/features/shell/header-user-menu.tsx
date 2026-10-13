import { ChevronDown } from "lucide-react"

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
import { cn } from "@/lib/utils"

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
  const isCls = variant === "cls"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            isCls
              ? "flex max-w-[220px] items-center gap-[7px] rounded-lg px-[7px] py-[5px] hover:bg-[var(--page-wash)]"
              : "flex max-w-[200px] items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted"
          }
        >
          <Avatar className={isCls ? "size-6" : "size-8"}>
            <AvatarFallback
              className={
                isCls
                  ? "bg-[var(--cls-brand)] text-[10px] text-white"
                  : "bg-primary text-xs text-primary-foreground"
              }
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-1 text-left sm:block">
            <span
              className={
                isCls
                  ? "block truncate text-[10.5px] font-medium leading-tight text-[var(--cls-profile-ink)]"
                  : "block truncate text-xs font-semibold"
              }
            >
              {userName}
            </span>
            <span
              className={
                isCls
                  ? "block truncate text-[10px] leading-tight text-[var(--cls-muted)]"
                  : "block truncate text-[10px] text-muted-foreground"
              }
            >
              {roles[role].short}
            </span>
          </span>
          {isCls ? (
            <ChevronDown
              className={cn(
                "hidden size-3.5 shrink-0 text-[var(--cls-muted)] sm:block"
              )}
            />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>Sign out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
