import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { type Role } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { Logo } from "./logo"
import { navigation } from "./navigation"
import { navigationGroupsForRole } from "./navigation-groups"

const navItemClass =
  "h-9 rounded-md px-3.5 text-[12.25px] font-normal text-sidebar-foreground hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:font-normal data-[active=true]:text-white"

export function Sidebar({
  role,
  active,
  onNavigate,
}: {
  role: Role
  active: string
  onNavigate: (id: string) => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const itemsById = new Map(navigation[role].map((item) => [item.id, item]))
  const groups = navigationGroupsForRole(role)

  function navigate(id: string) {
    onNavigate(id)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <UiSidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-3.5">
        <Logo inverted />
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2.5">
        {groups.map((group, groupIndex) => (
          <SidebarGroup key={group.label ?? `group-${groupIndex}`} className="p-0">
            {group.label ? (
              <SidebarGroupLabel
                className="h-auto px-3.5 pt-2.5 pb-1 text-[10px] font-semibold tracking-[1px] text-white/40 uppercase"
              >
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent className="px-0">
              <SidebarMenu className="gap-0">
                {group.itemIds.map((id) => {
                  const item = itemsById.get(id)
                  if (!item) return null
                  const Icon = item.icon
                  const selected = active === id
                  return (
                    <SidebarMenuItem key={id} className="relative">
                      {selected ? (
                        <span
                          className="pointer-events-none absolute top-1/2 left-0 z-10 h-7 w-0.5 -translate-y-1/2 rounded-r-sm bg-[#c9a227]"
                          aria-hidden
                        />
                      ) : null}
                      <SidebarMenuButton
                        type="button"
                        isActive={selected}
                        onClick={() => navigate(id)}
                        className={cn(navItemClass, selected && "pl-4")}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3.5 py-3">
        <p className="text-[10px] text-white/40">SMS v1.0 · Abier</p>
      </SidebarFooter>
    </UiSidebar>
  )
}
