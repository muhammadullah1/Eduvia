import { ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

import type { NavItem } from "./navigation"
import {
  folderContainsSection,
  type NavFolder,
  type NavLink,
  type NavNode,
} from "./navigation-menu-tree"

const linkButtonClass =
  "h-9 rounded-md px-3.5 text-[12.25px] font-normal text-sidebar-foreground hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white"

const folderTriggerClass =
  "h-8 w-full justify-between rounded-md px-3.5 text-[11px] font-semibold tracking-[0.06em] text-white/50 uppercase hover:bg-white/5 hover:text-white/70"

type Props = {
  items: readonly NavItem[]
  nodes: NavNode[]
  active: string
  onNavigate: (id: string, panel?: string) => void
}

export function SidebarNavTree({ items, nodes, active, onNavigate }: Props) {
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  )

  return (
    <>
      {nodes.map((node) => {
        if (node.type === "link") {
          return (
            <NavLinkItem
              key={node.id}
              link={node}
              active={active}
              itemsById={itemsById}
              onNavigate={onNavigate}
              nested={false}
            />
          )
        }
        return (
          <NavFolderBlock
            key={node.key}
            folder={node}
            active={active}
            itemsById={itemsById}
            onNavigate={onNavigate}
          />
        )
      })}
    </>
  )
}

function NavLinkItem({
  link,
  active,
  itemsById,
  onNavigate,
  nested,
}: {
  link: NavLink
  active: string
  itemsById: Map<string, NavItem>
  onNavigate: (id: string, panel?: string) => void
  nested: boolean
}) {
  const item = itemsById.get(link.id)
  const label = link.label ?? item?.label ?? link.id
  const Icon = link.icon ?? item?.icon
  if (!Icon) return null

  const selected = link.panel
    ? active === `settings?panel=${link.panel}` || active === `settings:${link.panel}`
    : link.id === "settings"
    ? active === "settings" ||
      active === "settings:general" ||
      active === "settings?panel=general"
    : active === link.id

  const handleClick = () => onNavigate(link.id, link.panel)

  if (nested) {
    return (
      <SidebarMenuSubItem className="relative">
        {selected ? (
          <span
            className="pointer-events-none absolute top-1/2 -left-2.5 z-10 h-6 w-0.5 -translate-y-1/2 rounded-r-sm bg-[#c9a227]"
            aria-hidden
          />
        ) : null}
        <SidebarMenuSubButton
          asChild
          isActive={selected}
          className={cn(
            "text-[12.25px] text-[#bacec4] hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white",
            selected && "font-medium text-white"
          )}
        >
          <button type="button" onClick={handleClick}>
            <Icon />
            <span>{label}</span>
          </button>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuItem className="relative">
      {selected ? (
        <span
          className="pointer-events-none absolute top-1/2 left-0 z-10 h-7 w-0.5 -translate-y-1/2 rounded-r-sm bg-[#c9a227]"
          aria-hidden
        />
      ) : null}
      <SidebarMenuButton
        type="button"
        isActive={selected}
        onClick={handleClick}
        className={cn(linkButtonClass, selected && "pl-4")}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavFolderBlock({
  folder,
  active,
  itemsById,
  onNavigate,
}: {
  folder: NavFolder
  active: string
  itemsById: Map<string, NavItem>
  onNavigate: (id: string, panel?: string) => void
}) {
  const activeBase = active.split(":")[0].split("?")[0]
  const containsActive = folderContainsSection(folder, activeBase)
  const [open, setOpen] = useState(
    Boolean(folder.defaultOpen) || containsActive
  )

  useEffect(() => {
    if (containsActive) {
      setOpen(true)
    }
  }, [containsActive, active])

  return (
    <SidebarMenuItem>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="group/collapsible w-full"
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={cn(folderTriggerClass, "data-[state=open]:text-white/70")}
          >
            <span className="flex-1 truncate text-left">{folder.label}</span>
            <ChevronRight
              className="size-3.5 shrink-0 text-white/40 transition-transform group-data-[state=open]/collapsible:rotate-90"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-3.5 border-white/10 px-0 pb-1">
            {folder.children.map((child, idx) => (
              <NavLinkItem
                key={`${child.id}-${child.panel ?? idx}`}
                link={child}
                active={active}
                itemsById={itemsById}
                onNavigate={onNavigate}
                nested
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}
