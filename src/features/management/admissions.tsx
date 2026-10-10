import { BadgeCheck, FileCheck2, Plus, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import {
  ConfirmDialog,
  EmptyState,
  MetricCard,
  Pager,
  SearchField,
  StatusBadge,
} from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchool } from "@/data/store"
import { type Application, type Student } from "@/data/types"
import { FeeMonthTable } from "@/features/fees/components"
import { AdmissionWizard } from "@/features/management/admission-wizard"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { classLabel, formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"
import { useClientTable } from "@/lib/use-client-table"

import { queryMatch } from "./shared"

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
  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const tab = selectedTab ?? (studentFromUrl ? "students" : "applications")
  const [localQuery, setLocalQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [classId, setClassId] = useState("all")
  const [open, setOpen] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  )

  const activeAppId =
    selectedAppId !== null ? selectedAppId : appFromUrl || null
  const activeStudentId =
    selectedStudentId !== null ? selectedStudentId : studentFromUrl || null

  const selectedApp = useMemo(
    () =>
      activeAppId
        ? (state.applications.find((item) => item.id === activeAppId) ?? null)
        : null,
    [activeAppId, state.applications]
  )
  const selectedStudent = useMemo(
    () =>
      activeStudentId
        ? (state.students.find((item) => item.id === activeStudentId) ?? null)
        : null,
    [activeStudentId, state.students]
  )
  const [confirm, setConfirm] = useState<null | {
    id: string
    status: Application["status"]
  }>(null)
  const search = localQuery || query

  function openApp(item: Application) {
    setSelectedAppId(item.id)
    setSelectedStudentId("")
    setSelectedTab("applications")
    navigate(portalPath(actor.role, "admissions", `applications/${item.id}`))
  }

  function openStudent(item: Student) {
    setSelectedStudentId(item.id)
    setSelectedAppId("")
    setSelectedTab("students")
    navigate(portalPath(actor.role, "admissions", `students/${item.id}`))
  }

  function closeDetails() {
    setSelectedAppId("")
    setSelectedStudentId("")
    navigate(portalPath(actor.role, "admissions"))
  }

  function handleTabChange(nextTab: string) {
    setSelectedTab(nextTab)
    setSelectedAppId("")
    setSelectedStudentId("")
    if (splat) {
      navigate(portalPath(actor.role, "admissions"))
    }
  }

  const applications = state.applications.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      (classId === "all" || item.classId === classId) &&
      queryMatch(search, [
        item.id,
        item.name,
        item.guardian,
        classLabel(state.classes, item.classId),
      ])
  )
  const students = state.students.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      (classId === "all" || item.classId === classId) &&
      queryMatch(search, [
        item.id,
        item.name,
        item.guardian,
        classLabel(state.classes, item.classId),
      ])
  )
  const appTable = useClientTable(
    applications,
    `${search}|${status}|${classId}|apps`
  )
  const studentTable = useClientTable(
    students,
    `${search}|${status}|${classId}|students`
  )

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={FileCheck2}
          label="Open applications"
          value={String(
            state.applications.filter(
              (item) => item.status === "New" || item.status === "Review"
            ).length
          )}
          note="Waiting on the admissions desk"
        />
        <MetricCard
          icon={Users}
          label="Active students"
          value={String(
            state.students.filter((item) => item.status === "Active").length
          )}
          note="Enrolled in 2026–27"
        />
        <MetricCard
          icon={BadgeCheck}
          label="Enrolled from intake"
          value={String(
            state.applications.filter((item) => item.status === "Enrolled")
              .length
          )}
          note="Applications converted to students"
        />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                {tab === "applications" ? "Applications" : "Student register"}
              </CardTitle>
              <CardDescription>
                Search, filter and open a record to act on it.
              </CardDescription>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              New admission
            </Button>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchField
              value={localQuery}
              onChange={setLocalQuery}
              placeholder={
                query
                  ? `Also matching “${query}”`
                  : "Search name, ID or guardian"
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:w-[360px]">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All statuses</SelectItem>
                    {[
                      "New",
                      "Review",
                      "Waitlist",
                      "Enrolled",
                      "Rejected",
                      "Active",
                      "Pending",
                      "Withdrawn",
                    ].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All classes</SelectItem>
                    {state.classes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {tab === "applications" ? (
            appTable.total === 0 ? (
              <EmptyState
                title="No applications"
                detail="Adjust the filters or create a new admission."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appTable.slice.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => openApp(item)}
                    >
                      <TableCell className="font-mono text-xs">
                        {item.id}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {classLabel(state.classes, item.classId)}
                      </TableCell>
                      <TableCell>{item.guardian}</TableCell>
                      <TableCell>{formatDate(item.submittedOn)}</TableCell>
                      <TableCell>
                        <StatusBadge value={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : studentTable.total === 0 ? (
            <EmptyState
              title="No students"
              detail="No register rows match these filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentTable.slice.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => openStudent(item)}
                  >
                    <TableCell className="font-mono text-xs">
                      {item.id}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {classLabel(state.classes, item.classId)}
                    </TableCell>
                    <TableCell>{item.guardian}</TableCell>
                    <TableCell>
                      <StatusBadge value={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pager
          {...(tab === "applications" ? appTable : studentTable)}
          onPage={(tab === "applications" ? appTable : studentTable).setPage}
        />
      </Card>

      <AdmissionWizard open={open} onOpenChange={setOpen} />

      <Dialog
        open={Boolean(selectedApp)}
        onOpenChange={(value) => !value && closeDetails()}
      >
        <DialogContent className="sm:max-w-lg">
          {selectedApp ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[20px] text-[var(--heading)]">
                  {selectedApp.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedApp.id} ·{" "}
                  {classLabel(state.classes, selectedApp.classId)} ·{" "}
                  {selectedApp.gender}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Guardian:</span>{" "}
                  {selectedApp.guardian} (
                  {selectedApp.guardianRelation || "Guardian"}) ·{" "}
                  {selectedApp.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  {selectedApp.address || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Previous school:
                  </span>{" "}
                  {selectedApp.previousSchool || "—"}
                  {selectedApp.previousClass
                    ? ` · ${selectedApp.previousClass}`
                    : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Interview:</span>{" "}
                  {selectedApp.interviewType || "—"}
                  {selectedApp.interviewScore
                    ? ` · score ${selectedApp.interviewScore}`
                    : ""}
                  {selectedApp.interviewResult
                    ? ` · ${selectedApp.interviewResult}`
                    : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Decision:</span>{" "}
                  {selectedApp.decision || "Pending"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(selectedApp.documents || []).map((doc) => (
                    <span
                      key={doc.id}
                      className="rounded-full border px-2.5 py-1 text-xs"
                    >
                      {doc.label}: {doc.status}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  {selectedApp.notes || "No admission notes yet."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setApplicationStatus(selectedApp.id, "Review", actor.name)
                    toast.success("Moved to review")
                  }}
                >
                  Mark in review
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setConfirm({ id: selectedApp.id, status: "Waitlist" })
                  }
                >
                  Waitlist
                </Button>
                <Button
                  onClick={() =>
                    setConfirm({ id: selectedApp.id, status: "Enrolled" })
                  }
                >
                  Enroll
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    setConfirm({ id: selectedApp.id, status: "Rejected" })
                  }
                >
                  Reject
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedStudent)}
        onOpenChange={(value) => !value && closeDetails()}
      >
        <DialogContent>
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
              <div className="grid gap-3 text-sm">
                <p>Guardian: {selectedStudent.guardian}</p>
                <p>Phone: {selectedStudent.phone}</p>
                <StatusBadge value={selectedStudent.status} />
              </div>
              {can(actor.role, "fees.status.view") ? (
                <div className="max-h-64 overflow-y-auto rounded-xl border">
                  <FeeMonthTable studentId={selectedStudent.id} />
                </div>
              ) : null}
              <DialogFooter>
                <Button
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
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          const message = setApplicationStatus(
            confirm.id,
            confirm.status,
            actor.name
          )
          if (message) toast.error(message)
          else
            toast.success(
              confirm.status === "Enrolled"
                ? "Student enrolled"
                : confirm.status === "Waitlist"
                  ? "Moved to waitlist"
                  : "Application rejected"
            )
          setConfirm(null)
          closeDetails()
        }}
      />
    </div>
  )
}
