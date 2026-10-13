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

import { navigation } from "./navigation"
import {
  folderContainsSection,
  type NavFolder,
  type NavNode,
} from "./navigation-menu-tree"
import type { Role } from "@/lib/auth"

const linkButtonClass =
  "h-9 rounded-md px-3.5 text-[12.25px] font-normal text-sidebar-foreground hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white"

const folderTriggerClass =
  "h-8 w-full justify-between rounded-md px-3.5 text-[11px] font-semibold tracking-[0.06em] text-white/50 uppercase hover:bg-white/5 hover:text-white/70"

type Props = {
  role: Role
  nodes: NavNode[]
  active: string
  onNavigate: (id: string) => void
}

export function SidebarNavTree({ role, nodes, active, onNavigate }: Props) {
  const itemsById = useMemo(
    () => new Map(navigation[role].map((item) => [item.id, item])),
    [role]
  )

  return (
    <>
      {nodes.map((node) => {
        if (node.type === "link") {
          return (
            <NavLinkItem
              key={node.id}
              sectionId={node.id}
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
  sectionId,
  active,
  itemsById,
  onNavigate,
  nested,
}: {
  sectionId: string
  active: string
  itemsById: Map<string, (typeof navigation)[Role][number]>
  onNavigate: (id: string) => void
  nested: boolean
}) {
  const item = itemsById.get(sectionId)
  if (!item) return null
  const Icon = item.icon
  const selected = active === sectionId

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
          <button type="button" onClick={() => onNavigate(sectionId)}>
            <Icon />
            <span>{item.label}</span>
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
        onClick={() => onNavigate(sectionId)}
        className={cn(linkButtonClass, selected && "pl-4")}
      >
        <Icon />
        <span>{item.label}</span>
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
  itemsById: Map<string, (typeof navigation)[Role][number]>
  onNavigate: (id: string) => void
}) {
  const containsActive = folderContainsSection(folder, active)
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
            {folder.children.map((child) => (
              <NavLinkItem
                key={child.id}
                sectionId={child.id}
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
