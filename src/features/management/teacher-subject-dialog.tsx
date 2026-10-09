import { useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/app/kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { useSchool } from "@/data/store"
import { type Staff } from "@/data/types"
import { useActor } from "@/lib/actor"
import { formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"

/** Change a teacher's single active subject; the previous assignment is closed, never rewritten (UR-02). */
export function TeacherSubjectDialog({
  teacher,
  onClose,
}: {
  teacher: Staff | null
  onClose: () => void
}) {
  const { state, changeTeacherSubject } = useSchool()
  const actor = useActor()
  const [subject, setSubject] = useState("")
  const [reason, setReason] = useState("")
  const current = teacher
    ? (state.staff.find((person) => person.id === teacher.id) ?? teacher)
    : null
  const allowed = can(actor.role, "teachers.subject.change")

  function close() {
    setSubject("")
    setReason("")
    onClose()
  }

  return (
    <Dialog open={Boolean(current)} onOpenChange={(value) => !value && close()}>
      <DialogContent>
        {current ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {current.name} · {current.subject}
              </DialogTitle>
              <DialogDescription>
                One active subject at a time. Lessons, tests and marks already
                recorded keep the subject they were recorded under.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {[...current.subjectHistory].reverse().map((row) => (
                <div
                  key={`${row.subject}-${row.from}`}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{row.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(row.from)} →{" "}
                      {row.to ? formatDate(row.to) : "present"} · {row.by}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </p>
                  </div>
                  {row.to ? (
                    <Badge variant="secondary">Closed</Badge>
                  ) : (
                    <Badge>Active</Badge>
                  )}
                </div>
              ))}
            </div>
            {allowed ? (
              <div className="grid gap-3">
                <Field label="New subject">
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {state.subjects
                          .filter((item) => item.name !== current.subject)
                          .map((item) => (
                            <SelectItem key={item.id} value={item.name}>
                              {item.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Reason">
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Why the subject is changing"
                  />
                </Field>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Close
              </Button>
              {allowed ? (
                <Button
                  disabled={!subject}
                  onClick={() => {
                    const message = changeTeacherSubject(
                      current.id,
                      subject,
                      reason,
                      actor
                    )
                    if (message) toast.error(message)
                    else {
                      toast.success(`${current.name} now teaches ${subject}`)
                      close()
                    }
                  }}
                >
                  Change subject
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
