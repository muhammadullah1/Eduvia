import { useState } from "react"
import { toast } from "sonner"

import updatesService from "@/api/updates/updates.service"
import { EmptyState, Field, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
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
import type { SchoolUpdate, UpdateKind } from "@/data/types"
import { getToday } from "@/lib/dates"
import { classLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/auth-store"

import { signedInTeacher } from "./session"

const KINDS: UpdateKind[] = ["Homework", "Classwork", "Notice"]
const EDITABLE: SchoolUpdate["status"][] = ["Draft", "Rejected"]

export function TeacherUpdates() {
  const { state, reloadSlices } = useSchool()
  const userId = useAuthStore((store) => store.user?.id)
  const teacher = signedInTeacher(state.staff)
  const teacherClassIds = teacher?.classIds ?? []
  const [selectedClassId, setClassId] = useState("")
  let classId = teacherClassIds.find((id) => id === selectedClassId) ?? ""
  if (!classId) classId = teacherClassIds.find(Boolean) ?? ""
  const [kind, setKind] = useState<UpdateKind>("Notice")
  const [subject, setSubject] = useState(teacher?.subject ?? "")
  const [text, setText] = useState("")
  const [due, setDue] = useState(getToday)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState("")
  const [busy, setBusy] = useState(false)
  const mine = state.updates.filter((item) => userId !== undefined && item.authorUserId === userId)

  function resetForm() {
    setEditingId("")
    setText("")
    setError("")
  }

  function startEdit(item: SchoolUpdate) {
    setEditingId(item.id)
    setClassId(item.classId)
    setKind(item.kind)
    setSubject(item.subject)
    setText(item.text)
    setDue(item.due)
    setError("")
  }

  async function save() {
    if (!classId) {
      setError("You have no assigned class.")
      return
    }
    if (!text.trim()) {
      setError("Write the update first.")
      return
    }
    setBusy(true)
    const body = { classId: Number(classId), kind, subject, text: text.trim(), due }
    try {
      if (editingId) await updatesService.update(editingId, body)
      else await updatesService.create(body)
      await reloadSlices(["updates"])
      resetForm()
      toast.success("Draft saved for management review")
    } catch (err) {
      setError(err instanceof Error && err.message || "Could not save the update.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId && "Edit update" || "Create update"}</CardTitle>
          <CardDescription>
            Drafts stay private until management publishes them.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Class">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {teacherClassIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {classLabel(state.classes, id)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type">
            <Select
              value={kind}
              onValueChange={(value) => setKind(KINDS.find((item) => item === value) ?? "Notice")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {KINDS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subject">
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
          <Field label="Due date">
            <DatePicker
              value={due}
              onChange={setDue}
              placeholder="Due date"
              defaultMonthKind="today"
            />
          </Field>
          <Field label="Message" error={error}>
            <Textarea
              aria-invalid={Boolean(error)}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write today’s update"
            />
          </Field>
        </CardContent>
        <CardFooter className="gap-2">
          <Button disabled={busy} onClick={() => void save()}>
            Save draft
          </Button>
          {editingId && (
            <Button variant="outline" disabled={busy} onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your updates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {mine.length === 0 ? (
            <EmptyState
              title="Nothing sent yet"
              detail="Drafts and published notes from your classes appear here."
            />
          ) : (
            mine.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {classLabel(state.classes, item.classId)} · {item.subject}
                    </p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                {EDITABLE.includes(item.status) && (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => startEdit(item)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
