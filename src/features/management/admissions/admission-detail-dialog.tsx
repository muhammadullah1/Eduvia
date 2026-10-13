import { toast } from "sonner"

import { ConfirmDialog, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Application } from "@/data/types"
import type { ClassSection } from "@/data/types"
import { classLabel, formatDate } from "@/lib/format"

import { AdmissionStatusBadge } from "./admission-status-badge"
import {
  formatRegistrationNo,
  resolveAdmissionUiStatus,
} from "./admission-display"

type Props = {
  application: Application | null
  classes: ClassSection[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onReview: (id: string) => void
  onWaitlist: (id: string) => void
  onEnroll: (id: string) => void
  onReject: (id: string) => void
  confirm: null | { id: string; status: Application["status"] }
  onConfirmClose: () => void
  onConfirm: () => void
}

export function AdmissionDetailDialog({
  application,
  classes,
  open,
  onOpenChange,
  onReview,
  onWaitlist,
  onEnroll,
  onReject,
  confirm,
  onConfirmClose,
  onConfirm,
}: Props) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          {application ? (
            <>
              <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-lg text-[var(--cls-ink)]">
                      {application.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-[12.25px]">
                      {formatRegistrationNo(application.id)} ·{" "}
                      {classLabel(classes, application.classId)}
                    </DialogDescription>
                  </div>
                  <AdmissionStatusBadge
                    status={resolveAdmissionUiStatus(application)}
                  />
                </div>
              </DialogHeader>
              <div className="flex max-h-[min(60vh,420px)] flex-col gap-4 overflow-y-auto px-6 py-5 text-sm">
                <div className="grid gap-2 text-[12.25px]">
                  <p>
                    <span className="text-[var(--cls-muted)]">Guardian:</span>{" "}
                    {application.guardian} (
                    {application.guardianRelation || "Guardian"}) ·{" "}
                    {application.phone}
                  </p>
                  <p>
                    <span className="text-[var(--cls-muted)]">DOB:</span>{" "}
                    {formatDate(application.dob)} · {application.gender}
                  </p>
                  <p>
                    <span className="text-[var(--cls-muted)]">Submitted:</span>{" "}
                    {application.submittedOn
                      ? formatDate(application.submittedOn)
                      : "—"}
                  </p>
                  <p>
                    <span className="text-[var(--cls-muted)]">Decision:</span>{" "}
                    {application.decision || "Pending"}
                    {application.status ? (
                      <>
                        {" "}
                        · Workflow{" "}
                        <StatusBadge value={application.status} />
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(application.documents || []).map((doc) => (
                    <span
                      key={doc.id}
                      className="rounded-full border border-[var(--cls-border)] px-2.5 py-1 text-[10.5px] text-[var(--cls-muted)]"
                    >
                      {doc.label}: {doc.status}
                    </span>
                  ))}
                </div>
                <p className="text-[12.25px] text-[var(--cls-muted)]">
                  {application.notes || "No admission notes yet."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[var(--cls-border)] bg-[var(--page-wash)] px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[var(--cls-border)]"
                  onClick={() => {
                    onReview(application.id)
                    toast.success("Moved to review")
                  }}
                >
                  Mark in review
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onWaitlist(application.id)}
                >
                  Waitlist
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                  onClick={() => onEnroll(application.id)}
                >
                  Enroll
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onReject(application.id)}
                >
                  Reject
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.status === "Enrolled"
            ? "Enroll this applicant?"
            : confirm?.status === "Waitlist"
              ? "Move to waitlist?"
              : "Reject this application?"
        }
        description={
          confirm?.status === "Enrolled"
            ? "A student record will be created if one does not already exist."
            : confirm?.status === "Waitlist"
              ? "The applicant stays in the queue without a student record."
              : "The family will no longer appear in the open queue."
        }
        confirmLabel={
          confirm?.status === "Enrolled"
            ? "Enroll"
            : confirm?.status === "Waitlist"
              ? "Waitlist"
              : "Reject"
        }
        destructive={confirm?.status === "Rejected"}
        onClose={onConfirmClose}
        onConfirm={onConfirm}
      />
    </>
  )
}
