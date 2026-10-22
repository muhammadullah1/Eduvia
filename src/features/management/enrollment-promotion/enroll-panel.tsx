import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import applicationsService from "@/api/admissions/applications.service"
import { ADMISSIONS_QUERY_KEY, ADMISSIONS_SUMMARY_QUERY_KEY } from "@/api/admissions/constants"
import { PROMOTION_HISTORY_QUERY_KEY } from "@/api/students/promotions.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import type { Application } from "@/data/types"
import { applicationNumericId } from "@/lib/applications-api"
import { formatDate } from "@/lib/format"

import { useGetApplications } from "../admissions/hooks/use-admissions"

/** Approved = decision Admit, submitted and not yet enrolled. */
const APPROVED_REQUEST = { decision: "Admit", status: "Review", submitted: "true", pageSize: 200 } as const

const ADMISSION_NO = /^[A-Za-z0-9-/]{1,30}$/

function EnrollDialog({ application, onClose }: { application: Application; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [admissionNo, setAdmissionNo] = useState("")
  const trimmed = admissionNo.trim()
  const error = trimmed && !ADMISSION_NO.test(trimmed) ? "Use letters, numbers, - or / (max 30)." : null

  const mutation = useMutation({
    mutationFn: () => {
      const id = applicationNumericId(application.id)
      if (!id) throw new Error("This application has no server id")
      return applicationsService.enroll(id, trimmed ? { admissionNo: trimmed } : {})
    },
    onSuccess: () => {
      toast.success(`${application.name} is enrolled`, {
        description: `Added to ${application.classDisplay ?? "their class"} as an active student.`,
      })
      for (const key of [ADMISSIONS_QUERY_KEY, ADMISSIONS_SUMMARY_QUERY_KEY, "students", "classes", PROMOTION_HISTORY_QUERY_KEY]) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      onClose()
    },
    onError: (err) => toast.error("Could not enroll", { description: err instanceof Error ? err.message : undefined }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll {application.name}?</DialogTitle>
          <DialogDescription>
            Creates an active student in {application.classDisplay ?? "the applied class"}, links the guardian and
            opens their fee ledger. The application is marked Enrolled.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admission-no" className="text-xs">Admission no. (optional)</Label>
          <Input
            id="admission-no"
            value={admissionNo}
            onChange={(event) => setAdmissionNo(event.target.value)}
            placeholder="Leave blank to generate the next number"
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || Boolean(error)}>
            {mutation.isPending ? <Spinner className="size-4" /> : null}
            Enroll student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EnrollPanel() {
  const query = useGetApplications(APPROVED_REQUEST)
  const applications = query.data?.applications ?? []
  const [enrolling, setEnrolling] = useState<Application | null>(null)

  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Approved applications"
        description="Applicants with an Admit decision who are not enrolled yet."
        actions={
          query.data ? (
            <span className="text-xs text-[var(--cls-muted)] tabular-nums">{applications.length} waiting</span>
          ) : null
        }
      />
      {query.isError ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-base font-medium text-[var(--cls-ink)]">Could not load applications</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.isLoading ? (
        <div className="flex flex-col gap-2 p-4" aria-label="Loading applications">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : !applications.length ? (
        <ClsEmpty title="No approved applications waiting">
          When an application gets an Admit decision in Admissions, it appears here to enroll.
        </ClsEmpty>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh>Application</ClsTh>
                <ClsTh>Applicant</ClsTh>
                <ClsTh>Class</ClsTh>
                <ClsTh>Guardian</ClsTh>
                <ClsTh>Submitted</ClsTh>
                <ClsTh className="text-right">Action</ClsTh>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id} className={clsRowClass}>
                  <TableCell className="font-mono text-xs text-[var(--cls-muted)]">{application.id}</TableCell>
                  <TableCell className="text-sm font-medium text-[var(--cls-ink)]">{application.name}</TableCell>
                  <TableCell className="text-sm text-[var(--cls-ink)]">{application.classDisplay ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-[var(--cls-ink)]">{application.guardian || "—"}</span>
                      {application.phone ? (
                        <span className="text-xs text-[var(--cls-muted)]">{application.phone}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--cls-ink)]">
                    {application.submittedOn ? formatDate(application.submittedOn) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setEnrolling(application)}>
                      Enroll
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {enrolling ? <EnrollDialog application={enrolling} onClose={() => setEnrolling(null)} /> : null}
    </ClsPanel>
  )
}
