import { useState } from "react"
import { toast } from "sonner"

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
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { classLabel } from "@/lib/format"

import { signedInTeacher } from "./session"

export function TeacherUpdates() {
  const { state, addUpdate, setUpdateStatus } = useSchool()
  const actor = useActor()
  const teacher = signedInTeacher(state.staff)
  const [selectedClassId, setClassId] = useState("")
  const classId =
    selectedClassId && (teacher?.classIds ?? []).includes(selectedClassId)
      ? selectedClassId
      : (teacher?.classIds?.[0] ?? state.classes[0]?.id ?? "g7b")
  const [kind, setKind] = useState<"Homework" | "Classwork" | "Notice">(
    "Notice"
  )
  const [subject, setSubject] = useState(teacher?.subject ?? "")
  const [text, setText] = useState("")
  const [due, setDue] = useState(getToday)
  const [error, setError] = useState("")
  const mine = state.updates.filter((item) => item.author === actor.name)
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create update</CardTitle>
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
                  {(teacher?.classIds ?? []).map((id) => (
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
              onValueChange={(value) => setKind(value as typeof kind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {["Homework", "Classwork", "Notice"].map((item) => (
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
            <Input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
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
        <CardFooter>
          <Button
            onClick={() => {
              const message = addUpdate({
                classId,
                kind,
                subject,
                text,
                due,
                author: actor.name,
              })
              if (message) setError(message)
              else {
                setError("")
                setText("")
                toast.success("Draft saved for management review")
              }
            }}
          >
            Save draft
          </Button>
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
                {item.status === "Draft" ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUpdateStatus(item.id, "Approved", actor.name)
                      toast.success("Sent for publishing")
                    }}
                  >
                    Send for approval
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
