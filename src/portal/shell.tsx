import { useState } from "react"
import {
  Bell,
  Download,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PARENT_NAME, TEACHER_NAME } from "@/data/session"
import { formatWhen } from "@/lib/format"
import {
  examBoards,
  parentChildren,
  unmarkedTeacherClasses,
} from "@/lib/selectors"
import { useSchool } from "@/lib/school-context"
import type { Role } from "@/types"

import { Logo } from "@/portal/login"
import { navigation, roles } from "@/portal/roles"
import type { PortalAction } from "@/portal/ui"

export function SidebarNav({
  role,
  active,
  onNavigate,
  onRole,
  onLogout,
}: {
  role: Role
  active: string
  onNavigate: (label: string) => void
  onRole: (role: Role) => void
  onLogout: () => void
}) {
  const { reset } = useSchool()
  const [confirmReset, setConfirmReset] = useState(false)
  return (
    <div className="flex h-full flex-col p-3">
      <div className="px-2 py-3">
        <Logo />
      </div>
      <div className="mt-5 px-2">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Workspace
        </p>
      </div>
      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {navigation[role].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.label)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active === item.label ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="rounded-2xl border bg-background/70 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{roles[role].initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{roles[role].user}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {roles[role].label}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onLogout}
                aria-label="Sign out"
              >
                <LogOut />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
        <Select value={role} onValueChange={(value) => onRole(value as Role)}>
          <SelectTrigger
            className="mt-3 h-8 w-full text-xs"
            aria-label="Switch demo role"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {(Object.keys(roles) as Role[]).map((item) => (
                <SelectItem value={item} key={item}>
                  {roles[item].short} demo
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
          Shared school session. Changes stay visible when you switch roles.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw data-icon="inline-start" />
          Reset demo school
        </Button>
      </div>
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the demo school?</DialogTitle>
            <DialogDescription>
              Admissions, payments, attendance, updates, and mark sheets return
              to the starting register. This only affects this browser session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                reset()
                setConfirmReset(false)
              }}
            >
              Reset data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function PageHeader({
  role,
  title,
  subtitle,
  query,
  onQuery,
  onAction,
  onNotify,
  onDownload,
  attendanceClass,
}: {
  role: Role
  title: string
  subtitle: string
  query: string
  onQuery: (value: string) => void
  onAction: (action: PortalAction) => void
  onNotify: () => void
  onDownload: () => void
  attendanceClass: string
}) {
  const action =
    role === "management"
      ? {
          label: "New admission",
          kind: { kind: "admission" } as PortalAction,
          icon: Plus,
        }
      : role === "teacher"
        ? {
            label: "Mark attendance",
            kind: {
              kind: "attendance",
              className: attendanceClass,
            } as PortalAction,
            icon: UserCheck,
          }
        : { label: "Download DMC", kind: null, icon: Download }
  const Icon = action.icon
  return (
    <header className="flex flex-col gap-4 border-b bg-background/85 px-5 py-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between md:px-8">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>2026–27</span>
          <span>•</span>
          <span>{roles[role].short}</span>
          <span>•</span>
          <span>Shared session</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-full pr-8 pl-9 sm:w-56"
            placeholder="Search the register…"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            aria-label="Search the register"
          />
          {query ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
              onClick={() => onQuery("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onNotify}
          aria-label="Open notifications"
        >
          <Bell />
        </Button>
        <Button
          onClick={() => {
            if (action.kind) onAction(action.kind)
            else onDownload()
          }}
        >
          <Icon data-icon="inline-start" />
          {action.label}
        </Button>
      </div>
    </header>
  )
}

export function MobileBar({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Portal navigation</SheetTitle>
            <SheetDescription>
              Choose a section of the school portal.
            </SheetDescription>
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
      <Logo />
    </div>
  )
}

export function NotificationsDialog({
  role,
  open,
  childId,
  onClose,
  onNavigate,
}: {
  role: Role
  open: boolean
  childId: string
  onClose: () => void
  onNavigate: (section: string) => void
}) {
  const { state } = useSchool()
  const pendingUpdates = state.updates.filter(
    (update) => update.status === "Pending"
  )
  const submitted = state.markSheets.filter(
    (sheet) => sheet.status === "Submitted" || sheet.status === "Verified"
  )
  const drafts = state.updates.filter((update) => update.status === "Draft")
  const unmarked = unmarkedTeacherClasses(state)
  const child = parentChildren(state, PARENT_NAME).find(
    (student) => student.id === childId
  )
  const parentNotes = child
    ? state.updates
        .filter(
          (update) =>
            update.status === "Published" &&
            (update.className === child.className ||
              update.className === "All classes")
        )
        .slice(0, 4)
    : []
  const items =
    role === "management"
      ? [
          ...pendingUpdates.map((update) => ({
            title: `Publish ${update.type.toLowerCase()}`,
            detail: update.text,
            section: "Command center",
          })),
          ...submitted.map((sheet) => ({
            title: `${sheet.status} marks`,
            detail: `${sheet.exam} · ${sheet.className} · ${sheet.subject}`,
            section: "Examinations",
          })),
          ...state.audit
            .slice(0, 3)
            .map((event) => ({
              title: event.actor,
              detail: `${event.action} · ${formatWhen(event.at)}`,
              section: "Reports & audit",
            })),
        ]
      : role === "teacher"
        ? [
            ...unmarked.map((item) => ({
              title: "Attendance still open",
              detail: item.className,
              section: "Attendance",
            })),
            ...state.markSheets
              .filter(
                (sheet) =>
                  sheet.teacher === TEACHER_NAME && sheet.status === "Draft"
              )
              .map((sheet) => ({
                title: "Draft mark sheet",
                detail: `${sheet.className} · ${sheet.subject}`,
                section: "Marks entry",
              })),
            ...drafts.map((update) => ({
              title: "Returned draft",
              detail: update.text,
              section: "Daily updates",
            })),
          ]
        : parentNotes.map((update) => ({
            title: update.type,
            detail: update.text,
            section: "Updates",
          }))
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Needs attention</DialogTitle>
          <DialogDescription>
            Live items from the shared school session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing is waiting right now.
            </p>
          ) : null}
          {items.map((item) => (
            <button
              key={`${item.title}-${item.detail}`}
              className="rounded-xl border p-3 text-left hover:bg-muted"
              onClick={() => {
                onNavigate(item.section)
                onClose()
              }}
            >
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.detail}
              </p>
            </button>
          ))}
        </div>
        {role === "management" ? (
          <p className="text-xs text-muted-foreground">
            {examBoards(state).length} exam sets are on the control board.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
