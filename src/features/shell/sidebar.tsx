import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar"
import { defaultSection, type Role } from "@/lib/auth"

import { Logo } from "./logo"
import { navigationMenuTreeForRole } from "./navigation-menu-tree"
import { SidebarNavTree } from "./sidebar-nav-tree"

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
  const tree = navigationMenuTreeForRole(role)

  function navigate(id: string) {
    onNavigate(id)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <UiSidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-3.5">
        <button
          type="button"
          onClick={() => navigate(defaultSection[role])}
          className="w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Go to dashboard"
        >
          <Logo inverted />
        </button>
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2.5">
        <SidebarMenu className="gap-0 px-1.5">
          <SidebarNavTree
            role={role}
            nodes={tree}
            active={active}
            onNavigate={navigate}
          />
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3.5 py-3">
        <p className="text-[10px] text-white/40">SMS v1.0 · Abier</p>
      </SidebarFooter>
    </UiSidebar>
  )
}
