import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSchool } from "@/data/store"
import type { Application } from "@/data/types"
import { FeeMonthTable } from "@/features/fees/components"
import { AdmissionWizard } from "@/features/management/admission-wizard"
import { ApplicationDetailPage } from "@/features/management/admissions/application-detail-page"
import { AdmissionsListPage } from "@/features/management/admissions/admissions-list-page"
import { useGetApplication } from "@/features/management/admissions/hooks/use-admissions"
import { useActor } from "@/lib/actor"
import { applicationNumericId } from "@/lib/applications-api"
import { portalPath } from "@/lib/auth"
import { classLabel, formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"

export function Admissions({ query }: { query: string }) {
  const { state, setApplicationStatus, updateStudent } = useSchool()
  const actor = useActor()
  const navigate = useNavigate()
  const params = useParams()
  const splat = params["*"] ?? ""
  const appFromUrl = splat.startsWith("applications/")
    ? splat.slice("applications/".length)
    : ""
  const studentFromUrl = splat.startsWith("students/")
    ? splat.slice("students/".length)
    : ""

  const [openWizard, setOpenWizard] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  )
  const [confirm, setConfirm] = useState<null | {
    id: string
    status: Application["status"]
  }>(null)
  const [statusBusy, setStatusBusy] = useState(false)

  const activeAppId =
    selectedAppId !== null ? selectedAppId : appFromUrl || null
  const activeStudentId =
    selectedStudentId !== null ? selectedStudentId : studentFromUrl || null

  const activeAppNumericId = useMemo(() => {
    if (!activeAppId) return undefined
    return applicationNumericId(activeAppId) ?? undefined
  }, [activeAppId])

  const { data: selectedAppFromApi, isLoading: selectedAppLoading } =
    useGetApplication(activeAppNumericId)

  const selectedApp = useMemo(() => {
    if (!activeAppId) return null
    if (selectedAppFromApi) return selectedAppFromApi
    return (
      state.applications.find((item) => item.id === activeAppId) ?? null
    )
  }, [activeAppId, selectedAppFromApi, state.applications])
  const selectedStudent = useMemo(
    () =>
      activeStudentId
        ? (state.students.find((item) => item.id === activeStudentId) ?? null)
        : null,
    [activeStudentId, state.students]
  )

  const sessionLabel = useMemo(() => {
    const current = state.sessions.find((session) => session.current)
    return current?.label ?? "2026–2027"
  }, [state.sessions])

  function openApp(item: Application) {
    setSelectedAppId(item.id)
    setSelectedStudentId(null)
    navigate(portalPath(actor.role, "admissions", `applications/${item.id}`))
  }

  function closeDetails() {
    setSelectedAppId(null)
    setSelectedStudentId(null)
    navigate(portalPath(actor.role, "admissions"))
  }

  async function handleConfirm() {
    if (!confirm || statusBusy) return
    setStatusBusy(true)
    const message = await setApplicationStatus(
      confirm.id,
      confirm.status,
      actor.name
    )
    setStatusBusy(false)
    if (message) toast.error(message)
    else
      toast.success(
        confirm.status === "Enrolled"
          ? "Student enrolled"
          : confirm.status === "Waitlist"
            ? "Moved to waitlist"
            : "Application rejected"
      )
    const rejected = confirm.status === "Rejected"
    setConfirm(null)
    if (rejected) closeDetails()
  }

  async function handleReview(id: string) {
    if (statusBusy) return
    setStatusBusy(true)
    const message = await setApplicationStatus(id, "Review", actor.name)
    setStatusBusy(false)
    if (message) toast.error(message)
    else toast.success("Marked under review")
  }

  return (
    <>
      {activeAppId && selectedAppLoading && !selectedApp ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--cls-muted)]">
          Loading application…
        </div>
      ) : selectedApp ? (
        <ApplicationDetailPage
          application={selectedApp}
          classes={state.classes}
          sessionLabel={sessionLabel}
          onBack={closeDetails}
          onReview={handleReview}
          onWaitlist={(id) => setConfirm({ id, status: "Waitlist" })}
          onEnroll={(id) => setConfirm({ id, status: "Enrolled" })}
          onReject={(id) => setConfirm({ id, status: "Rejected" })}
          confirm={confirm}
          onConfirmClose={() => setConfirm(null)}
          onConfirm={() => void handleConfirm()}
        />
      ) : (
        <AdmissionsListPage
          classes={state.classes}
          sessionLabel={sessionLabel}
          globalQuery={query}
          onOpenApplication={openApp}
          onNewApplication={() => setOpenWizard(true)}
        />
      )}

      <AdmissionWizard
        open={openWizard}
        onOpenChange={setOpenWizard}
        onCompleted={(id) => {
          setSelectedAppId(id)
          setSelectedStudentId(null)
          navigate(portalPath(actor.role, "admissions", `applications/${id}`))
        }}
      />

      <Dialog
        open={Boolean(selectedStudent)}
        onOpenChange={(value) => !value && closeDetails()}
      >
        <DialogContent className="sm:max-w-md">
          {selectedStudent ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedStudent.name}</DialogTitle>
                <DialogDescription>
                  {selectedStudent.id} ·{" "}
                  {classLabel(state.classes, selectedStudent.classId)} · DOB{" "}
                  {formatDate(selectedStudent.dob)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 text-sm">
                <p>Guardian: {selectedStudent.guardian}</p>
                <p>Phone: {selectedStudent.phone}</p>
                <StatusBadge value={selectedStudent.status} />
              </div>
              {can(actor.role, "fees.status.view") ? (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--cls-border)]">
                  <FeeMonthTable studentId={selectedStudent.id} />
                </div>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    updateStudent(
                      selectedStudent.id,
                      { status: "Active" },
                      actor.name
                    )
                    toast.success("Student marked active")
                    closeDetails()
                  }}
                >
                  Mark active
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    updateStudent(
                      selectedStudent.id,
                      { status: "Withdrawn" },
                      actor.name
                    )
                    toast.success("Student withdrawn")
                    closeDetails()
                  }}
                >
                  Withdraw
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
