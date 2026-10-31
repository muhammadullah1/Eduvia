import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useSchool } from "@/data/store"
import type { Application } from "@/data/types"
import { AdmissionWizard } from "@/features/management/admission-wizard"
import { AdmissionsListPage } from "@/features/management/admissions/admissions-list-page"
import { ApplicationDetailPage } from "@/features/management/admissions/application-detail-page"
import { useGetApplication } from "@/features/management/admissions/hooks/use-admissions"
import { useActor } from "@/lib/actor"
import { applicationNumericId } from "@/lib/applications-api"
import { portalPath } from "@/lib/auth"
import { toast } from "@/lib/toast"

export function Admissions({ query }: { query: string }) {
  const { state, setApplicationStatus } = useSchool()
  const actor = useActor()
  const navigate = useNavigate()
  const params = useParams()
  const splat = params["*"] ?? ""
  const appFromUrl = splat.startsWith("applications/")
    ? splat.slice("applications/".length)
    : ""

  const [openWizard, setOpenWizard] = useState(false)
  const [resumeApplicationId, setResumeApplicationId] = useState<string | null>(
    null
  )
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | {
    id: string
    status: Application["status"]
  }>(null)
  const [statusBusy, setStatusBusy] = useState(false)

  const activeAppId =
    selectedAppId !== null ? selectedAppId : appFromUrl || null

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
  const sessionLabel = useMemo(() => {
    const current = state.sessions.find((session) => session.current)
    return current?.name ?? "2026–2027"
  }, [state.sessions])

  function openApp(item: Application) {
    setSelectedAppId(item.id)
    navigate(portalPath(actor.role, "admissions", `applications/${item.id}`))
  }

  function closeDetails() {
    setSelectedAppId(null)
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
          onContinueDraft={(id) => {
            setResumeApplicationId(id)
            setOpenWizard(true)
          }}
          onEdit={(id) => {
            setResumeApplicationId(id)
            setOpenWizard(true)
          }}
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
          onNewApplication={() => {
            setResumeApplicationId(null)
            setOpenWizard(true)
          }}
        />
      )}

      <AdmissionWizard
        open={openWizard}
        resumeApplicationId={resumeApplicationId}
        onOpenChange={(value) => {
          setOpenWizard(value)
          if (!value) setResumeApplicationId(null)
        }}
        onCompleted={(id) => {
          setSelectedAppId(id)
                navigate(portalPath(actor.role, "admissions", `applications/${id}`))
        }}
      />

    </>
  )
}
