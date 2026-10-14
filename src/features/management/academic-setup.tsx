import { History } from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Field } from "@/components/app/kit"
import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useSchool } from "@/data/store"
import { type Staff } from "@/data/types"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"

import {
  academicPortalSectionForTab,
  type AcademicFocusTab,
} from "@/features/shell/academic-section"

import { AcademicSetupTimetablePanel } from "./academic-setup-timetable-panel"
import { TeacherSubjectDialog } from "./teacher-subject-dialog"

export function AcademicSetup({
  focusTab = "sessions",
}: {
  focusTab?: AcademicFocusTab
}) {
  const {
    state,
    addSession,
    activateSession,
    addClass,
    addSubject,
    addStaff,
    setClassPeriodCount,
  } = useSchool()
  const actor = useActor()
  const navigate = useNavigate()
  const params = useParams()
  const splat = params["*"] ?? ""
  const classFromUrl = splat.startsWith("classes/")
    ? splat.slice("classes/".length)
    : ""
  const [sessionForm, setSessionForm] = useState({
    name: "",
    start: "",
    end: "",
  })
  const [classForm, setClassForm] = useState({
    grade: "",
    section: "",
    room: "",
    periodCount: "8",
    monthlyFee: "8500",
  })
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" })
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    classIds: "",
  })
  const [editing, setEditing] = useState<Staff | null>(null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const validUrlClass =
    classFromUrl && state.classes.some((item) => item.id === classFromUrl)
      ? classFromUrl
      : ""
  const classId = selectedClassId || validUrlClass || state.classes[0]?.id || ""
  const portalSection = academicPortalSectionForTab(focusTab)
  const tab = focusTab
  const teachers = state.staff.filter((person) => person.role === "Teacher")
  const currentSession = state.sessions.find((session) => session.current)

  function selectClass(id: string) {
    setSelectedClassId(id)
    navigate(portalPath(actor.role, portalSection, `classes/${id}`))
  }

  return (
    <Tabs value={tab} className="grid gap-5">
      <TabsContent
        value="sessions"
        className="grid gap-4 lg:grid-cols-[320px_1fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Create session</CardTitle>
            <CardDescription>
              New sessions become current immediately so classes and admissions
              use them.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Session name">
              <Input
                value={sessionForm.name}
                onChange={(event) =>
                  setSessionForm({ ...sessionForm, name: event.target.value })
                }
                placeholder="2027–28"
              />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={sessionForm.start}
                onChange={(event) =>
                  setSessionForm({ ...sessionForm, start: event.target.value })
                }
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={sessionForm.end}
                onChange={(event) =>
                  setSessionForm({ ...sessionForm, end: event.target.value })
                }
              />
            </Field>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                const message = addSession(sessionForm, actor.name)
                if (message) toast.error(message)
                else {
                  toast.success("Session created and activated")
                  setSessionForm({ name: "", start: "", end: "" })
                }
              }}
            >
              Create session
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Academic sessions</CardTitle>
            <CardDescription>
              {currentSession
                ? `Current: ${currentSession.name}`
                : "No active session yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.name}
                    </TableCell>
                    <TableCell>{session.start}</TableCell>
                    <TableCell>{session.end}</TableCell>
                    <TableCell>
                      {session.current ? (
                        <Badge>Current</Badge>
                      ) : (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.current ? null : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const message = activateSession(
                              session.id,
                              actor.name
                            )
                            if (message) toast.error(message)
                            else toast.success(`${session.name} is now current`)
                          }}
                        >
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent
        value="classes"
        className="grid gap-4 lg:grid-cols-[280px_1fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Add section</CardTitle>
            <CardDescription>
              Creates a class that admissions and timetables can use.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Grade">
              <Input
                value={classForm.grade}
                onChange={(event) =>
                  setClassForm({ ...classForm, grade: event.target.value })
                }
                placeholder="Grade 4"
              />
            </Field>
            <Field label="Section">
              <Input
                value={classForm.section}
                onChange={(event) =>
                  setClassForm({ ...classForm, section: event.target.value })
                }
                placeholder="Blue"
              />
            </Field>
            <Field label="Home room">
              <Input
                value={classForm.room}
                onChange={(event) =>
                  setClassForm({ ...classForm, room: event.target.value })
                }
                placeholder="Room 06"
              />
            </Field>
            <Field label="Periods / day">
              <Input
                value={classForm.periodCount}
                onChange={(event) =>
                  setClassForm({
                    ...classForm,
                    periodCount: event.target.value,
                  })
                }
                placeholder="8"
              />
            </Field>
            <Field
              label="Monthly fee (PKR)"
              hint="Used when monthly fee records are generated."
            >
              <Input
                value={classForm.monthlyFee}
                onChange={(event) =>
                  setClassForm({ ...classForm, monthlyFee: event.target.value })
                }
                placeholder="8500"
              />
            </Field>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                const message = addClass(
                  {
                    ...classForm,
                    periodCount: Number(classForm.periodCount) || 8,
                    monthlyFee: Number(classForm.monthlyFee) || 0,
                  },
                  actor.name
                )
                if (message) toast.error(message)
                else {
                  toast.success("Class section added")
                  setClassForm({
                    grade: "",
                    section: "",
                    room: "",
                    periodCount: "8",
                    monthlyFee: "8500",
                  })
                }
              }}
            >
              Add class
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Periods</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.classes.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => selectClass(item.id)}
                  >
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>{item.room}</TableCell>
                    <TableCell>{item.periodCount ?? 8}</TableCell>
                    <TableCell>
                      {
                        state.students.filter(
                          (student) =>
                            student.classId === item.id &&
                            student.status === "Active"
                        ).length
                      }
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Select
                        value={String(item.periodCount ?? 8)}
                        onValueChange={(value) => {
                          const message = setClassPeriodCount(
                            item.id,
                            Number(value),
                            actor.name
                          )
                          if (message) toast.error(message)
                          else toast.success(`Periods set to ${value}`)
                        }}
                      >
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {[6, 7, 8, 9, 10].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent
        value="subjects"
        className="grid gap-4 lg:grid-cols-[280px_1fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Add subject</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Name">
              <Input
                value={subjectForm.name}
                onChange={(event) =>
                  setSubjectForm({ ...subjectForm, name: event.target.value })
                }
                placeholder="Art"
              />
            </Field>
            <Field label="Code">
              <Input
                value={subjectForm.code}
                onChange={(event) =>
                  setSubjectForm({ ...subjectForm, code: event.target.value })
                }
                placeholder="ART"
              />
            </Field>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                const message = addSubject(subjectForm, actor.name)
                if (message) toast.error(message)
                else {
                  toast.success("Subject added")
                  setSubjectForm({ name: "", code: "" })
                }
              }}
            >
              Add subject
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="grid gap-2 pt-4">
            {state.subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between rounded-xl border px-4 py-3"
              >
                <span className="font-medium">{subject.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {subject.code}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent
        value="teachers"
        className="grid gap-4 lg:grid-cols-[320px_1fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Assign teacher</CardTitle>
            <CardDescription>
              Every teacher has exactly one active subject. Classes are added as
              you build the timetable.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Full name">
              <Input
                value={teacherForm.name}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, name: event.target.value })
                }
                placeholder="Nadia Khan"
              />
            </Field>
            <Field label="Email">
              <Input
                value={teacherForm.email}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, email: event.target.value })
                }
                placeholder="nadia@cls.edu.pk"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={teacherForm.phone}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, phone: event.target.value })
                }
                placeholder="03xx-xxxxxxx"
              />
            </Field>
            <Field
              label="Subject (required)"
              hint="Can be changed later; past records keep their subject."
            >
              <Select
                value={teacherForm.subject}
                onValueChange={(subject) =>
                  setTeacherForm({ ...teacherForm, subject })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {state.subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.name}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Class IDs">
              <Input
                value={teacherForm.classIds}
                onChange={(event) =>
                  setTeacherForm({
                    ...teacherForm,
                    classIds: event.target.value,
                  })
                }
                placeholder="g4b, g5g"
              />
            </Field>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                const message = addStaff(
                  {
                    name: teacherForm.name,
                    role: "Teacher",
                    email: teacherForm.email,
                    phone: teacherForm.phone,
                    subject: teacherForm.subject,
                    classIds: teacherForm.classIds
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                  actor
                )
                if (message) toast.error(message)
                else {
                  toast.success("Teacher assigned")
                  setTeacherForm({
                    name: "",
                    email: "",
                    phone: "",
                    subject: "",
                    classIds: "",
                  })
                }
              }}
            >
              Add teacher
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Active subject</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.subject}</TableCell>
                    <TableCell>
                      {person.classIds
                        .map(
                          (id) =>
                            state.classes.find((item) => item.id === id)
                              ?.label ?? id
                        )
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {person.email}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(person)}
                      >
                        <History data-icon="inline-start" />
                        Subject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TeacherSubjectDialog
          teacher={editing}
          onClose={() => setEditing(null)}
        />
      </TabsContent>
      <TabsContent value="timetable" className="grid gap-4">
        <AcademicSetupTimetablePanel
          classId={classId}
          onClassChange={selectClass}
        />
      </TabsContent>
    </Tabs>
  )
}
