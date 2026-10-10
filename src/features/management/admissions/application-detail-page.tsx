import { ArrowLeft } from "lucide-react"

import { ConfirmDialog, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import type { Application, ClassSection } from "@/data/types"
import { classLabel, formatDate } from "@/lib/format"

import { AdmissionStatusBadge } from "./admission-status-badge"
import {
  DetailGrid,
  DetailItem,
  DetailSection,
} from "./admission-ui"
import {
  formatRegistrationNo,
  resolveAdmissionUiStatus,
} from "./admission-display"

type Props = {
  application: Application
  classes: ClassSection[]
  sessionLabel: string
  onBack: () => void
  onReview: (id: string) => void
  onWaitlist: (id: string) => void
  onEnroll: (id: string) => void
  onReject: (id: string) => void
  confirm: null | { id: string; status: Application["status"] }
  onConfirmClose: () => void
  onConfirm: () => void
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function ApplicationDetailPage({
  application,
  classes,
  sessionLabel,
  onBack,
  onReview,
  onWaitlist,
  onEnroll,
  onReject,
  confirm,
  onConfirmClose,
  onConfirm,
}: Props) {
  const uiStatus = resolveAdmissionUiStatus(application)
  const canAct =
    application.status !== "Enrolled" && application.status !== "Rejected"

  return (
    <div className="flex flex-col gap-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-[var(--cls-muted)]"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back to admissions
      </Button>

      <div className="rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div
              className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--cls-brand)] text-lg font-semibold text-white"
              aria-hidden
            >
              {initials(application.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-[var(--cls-ink)] sm:text-2xl">
                  {application.name}
                </h1>
                <AdmissionStatusBadge status={uiStatus} />
              </div>
              <p className="mt-1 text-sm text-[var(--cls-muted)]">
                <span className="font-mono font-medium text-[var(--cls-brand)]">
                  {formatRegistrationNo(application.id)}
                </span>
                {" · "}
                {classLabel(classes, application.classId, application.classDisplay)}
                {" · "}
                Session {sessionLabel}
              </p>
              <p className="mt-2 text-sm text-[var(--cls-muted)]">
                Guardian {application.guardian} ({application.guardianRelation || "Guardian"}) ·{" "}
                {application.phone}
              </p>
            </div>
          </div>
          {canAct || application.status === "New" ? (
            <div className="flex flex-wrap gap-2">
              {application.status === "New" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onReview(application.id)}
                >
                  Mark under review
                </Button>
              ) : null}
              {canAct ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onWaitlist(application.id)}
                  >
                    Waitlist
                  </Button>
                  <Button
                    type="button"
                    className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                    onClick={() => onEnroll(application.id)}
                  >
                    Enroll student
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onReject(application.id)}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Student details">
          <DetailGrid>
            <DetailItem
              label="Date of birth"
              value={formatDate(application.dob)}
            />
            <DetailItem label="Gender" value={application.gender} />
            <DetailItem
              label="Address"
              value={application.address || "—"}
              className="sm:col-span-2"
            />
            <DetailItem
              label="Previous school"
              value={application.previousSchool || "—"}
            />
            <DetailItem
              label="Last class completed"
              value={application.previousClass || "—"}
            />
            <DetailItem label="Contact" value={application.phone} />
            <DetailItem
              label="Submitted"
              value={
                application.submittedOn
                  ? formatDate(application.submittedOn)
                  : "—"
              }
            />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Guardian">
          <DetailGrid>
            <DetailItem label="Name" value={application.guardian} />
            <DetailItem
              label="Relationship"
              value={application.guardianRelation || "Guardian"}
            />
            <DetailItem
              label="Address"
              value={
                application.guardianAddress || application.address || "—"
              }
              className="sm:col-span-2"
            />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Documents">
          <ul className="flex flex-col gap-2">
            {(application.documents || []).length ? (
              (application.documents || []).map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/50 px-3 py-2.5"
                >
                  <span className="text-sm font-medium">{doc.label}</span>
                  <span className="text-xs font-medium text-[var(--cls-muted)]">
                    {doc.status}
                  </span>
                </li>
              ))
            ) : (
              <p className="text-sm text-[var(--cls-muted)]">
                No documents recorded for this application.
              </p>
            )}
          </ul>
        </DetailSection>

        <DetailSection title="Interview & assessment">
          <DetailGrid>
            <DetailItem
              label="Type"
              value={application.interviewType || "—"}
            />
            <DetailItem
              label="Date"
              value={
                application.interviewDate
                  ? formatDate(application.interviewDate)
                  : "—"
              }
            />
            <DetailItem
              label="Score"
              value={application.interviewScore || "—"}
            />
            <DetailItem
              label="Result"
              value={application.interviewResult || "—"}
            />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Decision & workflow">
          <DetailGrid>
            <DetailItem
              label="Decision"
              value={application.decision || "Pending"}
            />
            <DetailItem
              label="Workflow status"
              value={<StatusBadge value={application.status} />}
            />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--cls-muted)]">
            {application.notes || "No admission notes yet."}
          </p>
        </DetailSection>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && onConfirmClose()}
        title={
          confirm?.status === "Enrolled"
            ? "Enroll this student?"
            : confirm?.status === "Waitlist"
              ? "Move to waitlist?"
              : "Reject application?"
        }
        description="This updates the application workflow using the school store."
        confirmLabel={
          confirm?.status === "Enrolled" ? "Enroll" : confirm?.status ?? "Confirm"
        }
        onConfirm={onConfirm}
      />
    </div>
  )
}
