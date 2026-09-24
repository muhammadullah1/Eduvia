import { useState } from "react"

import { PARENT_NAME } from "@/data/session"
import { parentChildren } from "@/lib/selectors"
import { useSchool } from "@/lib/school-context"
import { SchoolProvider } from "@/lib/school-provider"
import type { Role } from "@/types"

import { ActionDialog } from "@/portal/dialogs"
import { LoginScreen } from "@/portal/login"
import { ManagementView } from "@/portal/management"
import { downloadChildDmc } from "@/portal/dmc"
import { ParentView } from "@/portal/parent"
import { navigation } from "@/portal/roles"
import {
  MobileBar,
  NotificationsDialog,
  PageHeader,
  SidebarNav,
} from "@/portal/shell"
import { TeacherView } from "@/portal/teacher"
import type { PortalAction } from "@/portal/ui"

function Portal() {
  const { state } = useSchool()
  const [role, setRole] = useState<Role>("management")
  const [loggedIn, setLoggedIn] = useState(false)
  const [section, setSection] = useState(navigation.management[0].label)
  const [action, setAction] = useState<PortalAction>(null)
  const [query, setQuery] = useState("")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState("Grade 8 · Blue")
  const children = parentChildren(state, PARENT_NAME)
  const [childId, setChildId] = useState(children[0]?.id ?? "")
  const subtitle =
    role === "management"
      ? "Records you change here are the same ones teachers and parents see."
      : role === "teacher"
        ? "Your assigned classes, with attendance and marks that management can lock."
        : "Published results, receipts, and attendance for your linked children."

  const changeRole = (next: Role) => {
    setRole(next)
    setSection(navigation[next][0].label)
    setQuery("")
    setMobileNavOpen(false)
    setAction(null)
  }

  if (!loggedIn) {
    return (
      <LoginScreen
        onEnter={(next) => {
          changeRole(next)
          setLoggedIn(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-svh bg-muted/25">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar md:block">
        <SidebarNav
          role={role}
          active={section}
          onNavigate={(label) => {
            setSection(label)
            setMobileNavOpen(false)
          }}
          onRole={changeRole}
          onLogout={() => {
            setLoggedIn(false)
            setMobileNavOpen(false)
          }}
        />
      </aside>
      <div className="md:pl-64">
        <MobileBar open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SidebarNav
            role={role}
            active={section}
            onNavigate={(label) => {
              setSection(label)
              setMobileNavOpen(false)
            }}
            onRole={changeRole}
            onLogout={() => {
              setLoggedIn(false)
              setMobileNavOpen(false)
            }}
          />
        </MobileBar>
        <PageHeader
          role={role}
          title={section}
          subtitle={subtitle}
          query={query}
          onQuery={setQuery}
          attendanceClass={selectedClass}
          onAction={setAction}
          onNotify={() => setNotesOpen(true)}
          onDownload={() =>
            downloadChildDmc(state, childId || children[0]?.id || "")
          }
        />
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 md:p-8">
          {query ? (
            <p className="mb-4 text-xs text-muted-foreground">
              Showing matches for “{query}”.
            </p>
          ) : null}
          {role === "teacher" ? (
            <TeacherView
              section={section}
              query={query}
              selectedClass={selectedClass}
              onSelectedClass={setSelectedClass}
              onOpenClass={(className) => {
                setSelectedClass(className)
                setSection("Attendance")
              }}
              onAction={setAction}
            />
          ) : null}
          {role === "parent" ? (
            <ParentView
              section={section}
              childId={childId}
              onChild={setChildId}
              query={query}
            />
          ) : null}
          {role === "management" ? (
            <ManagementView
              section={section}
              query={query}
              onAction={setAction}
              onNavigate={setSection}
            />
          ) : null}
        </main>
      </div>
      <ActionDialog
        action={action}
        role={role}
        onClose={() => setAction(null)}
      />
      <NotificationsDialog
        role={role}
        open={notesOpen}
        childId={childId}
        onClose={() => setNotesOpen(false)}
        onNavigate={setSection}
      />
    </div>
  )
}

export default function App() {
  return (
    <SchoolProvider>
      <Portal />
    </SchoolProvider>
  )
}
