import { Download } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/app/kit"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchool } from "@/data/store"
import { isAttendancePresent } from "@/data/types"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { formatDate, pkr, timeAgo } from "@/lib/format"
import { can } from "@/lib/permissions"

export function Reports() {
  const { state } = useSchool()
  const actor = useActor()
  const [preview, setPreview] = useState<string | null>(null)
  const financial = can(actor.role, "fees.totals")
  const catalogs = [
    {
      id: "enrollment",
      title: "Enrollment register",
      detail: "Class strength from the live register",
    },
    {
      id: "attendance",
      title: "Attendance summary",
      detail: `Marks recorded for ${formatDate(getToday())}`,
    },
    ...(financial
      ? [
          {
            id: "fees",
            title: "Fee outstanding",
            detail: "Pending receipts still to confirm",
          },
          {
            id: "sync",
            title: "Offline sync log",
            detail: "Imported, skipped and failed rows",
          },
        ]
      : []),
    {
      id: "exams",
      title: "Exam analytics",
      detail: "Mark sheet progress by status",
    },
  ]
  return (
    <Tabs defaultValue="reports">
      <TabsList>
        <TabsTrigger value="reports">Report library</TabsTrigger>
        <TabsTrigger value="audit">Audit trail</TabsTrigger>
      </TabsList>
      <TabsContent
        value="reports"
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {catalogs.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => setPreview(item.id)}
          >
            <CardHeader>
              <div className="flex justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-muted">
                  <Download className="size-4" />
                </span>
              </div>
              <CardTitle className="mt-4">{item.title}</CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </TabsContent>
      <TabsContent value="audit" className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle>Security audit trail</CardTitle>
            <CardDescription>
              Sensitive actions recorded in this browser session.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            {state.audits.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 border-b py-3 last:border-0"
              >
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{event.actor}</span>{" "}
                    {event.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(event.at)}
                  </p>
                </div>
                <Badge variant="outline">
                  {event.entity?.replace(/_/g, " ") ?? "recorded"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(value) => !value && setPreview(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {catalogs.find((item) => item.id === preview)?.title}
            </DialogTitle>
            <DialogDescription>
              Generated from the current dummy ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            {preview === "enrollment" &&
              state.classes.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b py-2"
                >
                  <span>{item.label}</span>
                  <span>
                    {
                      state.students.filter(
                        (student) =>
                          student.classId === item.id &&
                          student.status === "Active"
                      ).length
                    }
                  </span>
                </div>
              ))}
            {preview === "attendance" && (
              <p>
                {
                  state.attendance.filter(
                    (mark) =>
                      mark.date === getToday() &&
                      isAttendancePresent(mark.status)
                  ).length
                }{" "}
                present on {formatDate(getToday())}.
              </p>
            )}
            {preview === "fees" &&
              state.payments
                .filter((payment) => payment.status === "Pending")
                .map((payment) => (
                  <div
                    key={payment.ref}
                    className="flex justify-between border-b py-2"
                  >
                    <span>{payment.ref}</span>
                    <span>{pkr(payment.amount)}</span>
                  </div>
                ))}
            {preview === "exams" &&
              state.sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="flex justify-between border-b py-2"
                >
                  <span>{sheet.subject}</span>
                  <StatusBadge value={sheet.status} />
                </div>
              ))}
            {preview === "sync" &&
              state.syncLogs.map((log) => (
                <div key={log.id} className="border-b py-2">
                  {log.fileName}: {log.imported} imported, {log.skipped}{" "}
                  skipped, {log.failed} failed
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={() => toast.success("Report file prepared")}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
