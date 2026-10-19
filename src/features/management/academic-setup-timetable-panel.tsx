import { useMemo, useState } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSchool } from "@/data/store"
import { useClassesList } from "@/features/management/classes/hooks/use-classes"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { ClassTimetableEditor } from "@/features/management/timetable/class-timetable-editor"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useTeachersList } from "@/features/management/substitutes/hooks/use-teachers-list"
import { useActor } from "@/lib/actor"

type Props = {
  classId?: string
  onClassChange?: (classId: string) => void
}

/** API-backed timetable editor for Academic Setup (same engine as Admin → Timetable). */
export function AcademicSetupTimetablePanel({
  classId: classIdProp,
  onClassChange,
}: Props) {
  const { syncPortalForRoute } = useSchool()
  const actor = useActor()
  const [selectedClassId, setSelectedClassId] = useState("")

  const { data: sessions = [] } = useSessionsList()
  const currentSession = sessions.find((s) => s.current)
  const sessionNumericId = currentSession
    ? Number(currentSession.id)
    : undefined

  const { data: classes = [], isLoading } = useClassesList(
    Number.isFinite(sessionNumericId) ? sessionNumericId : undefined
  )
  const { data: subjects = [] } = useSubjectsList()

  const classId = useMemo(() => {
    if (classIdProp && classes.some((c) => c.id === classIdProp)) {
      return classIdProp
    }
    if (selectedClassId && classes.some((c) => c.id === selectedClassId)) {
      return selectedClassId
    }
    return classes[0]?.id ?? ""
  }, [classIdProp, selectedClassId, classes])

  const klass = classes.find((c) => c.id === classId)
  const { data: teacherOptions = [], isLoading: teachersLoading } = useTeachersList()
  const teachers = useMemo(
    () =>
      teacherOptions.map((person) => ({
        id: person.id,
        name: person.name,
        role: "Teacher",
        email: "",
        phone: "",
        subject: person.subject,
        subjectId: person.subjectId,
        subjectHistory: [],
        classIds: person.classIds,
      })),
    [teacherOptions]
  )

  function selectClass(id: string) {
    setSelectedClassId(id)
    onClassChange?.(id)
  }

  const syncPortal = () => syncPortalForRoute(actor.role, "sessions")

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Weekly timetable</CardTitle>
          <CardDescription>
            Same data as Admin → Timetable. Changes save to the server immediately.
          </CardDescription>
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={classId}
            onValueChange={selectClass}
            disabled={isLoading || classes.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {classes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {classDisplayName(item)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ClassTimetableEditor
          classId={classId}
          klass={klass}
          subjects={subjects}
          teachers={teachers}
          teachersLoading={teachersLoading}
          syncPortal={syncPortal}
        />
      </CardContent>
    </Card>
  )
}
