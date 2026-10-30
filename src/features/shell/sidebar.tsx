import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar"
import type { PortalSlug } from "@/lib/auth"

import { Logo } from "./logo"
import type { NavItem } from "./navigation"
import { navigationMenuTree } from "./navigation-menu-tree"
import { SidebarNavTree } from "./sidebar-nav-tree"

export function Sidebar({
  portal,
  items,
  home,
  active,
  onNavigate,
}: {
  portal: PortalSlug
  items: readonly NavItem[]
  home: string
  active: string
  onNavigate: (id: string, panel?: string) => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const tree = navigationMenuTree(portal, items)

  function navigate(id: string, panel?: string) {
    onNavigate(id, panel)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <UiSidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-3.5">
        <button
          type="button"
          onClick={() => navigate(home)}
          className="w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Go to dashboard"
        >
          <Logo inverted />
        </button>
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2.5">
        <SidebarMenu className="gap-0 px-1.5">
          <SidebarNavTree
            items={items}
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
