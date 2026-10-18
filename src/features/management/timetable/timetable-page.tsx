import { Info } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type { TimetableSlot } from "@/data/types"
import { useSearchParams } from "react-router-dom"

import { classDisplayName } from "@/api/classes/map-class"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { Label } from "@/components/ui/label"
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
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"

import { ClassTimetableEditor } from "./class-timetable-editor"
import { TimetableTeacherPanel } from "./timetable-teacher-panel"

type ViewMode = "class" | "teacher"

export function TimetablePage() {
  const { state, syncPortalForRoute } = useSchool()
  const actor = useActor()
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get("view")
  const teacherIdParam = searchParams.get("teacherId") ?? ""

  const initialView: ViewMode = viewParam === "teacher" ? "teacher" : "class"
  const [viewMode, setViewMode] = useState<ViewMode>(initialView)
  const [focusSlot, setFocusSlot] = useState<TimetableSlot | null>(null)

  useEffect(() => {
    if (viewParam === "teacher") {
      setViewMode("teacher")
    }
    if (viewParam === "class") {
      setViewMode("class")
    }
  }, [viewParam])

  useEffect(() => {
    void syncPortalForRoute(actor.role, "timetable")
  }, [actor.role, syncPortalForRoute])

  const currentSession = state.sessions.find((s) => s.current)
  const sessionNumericId = currentSession
    ? Number(currentSession.id)
    : undefined

  const { data: classes = [], isLoading: classesLoading } = useClassesList(
    Number.isFinite(sessionNumericId) ? sessionNumericId : undefined
  )

  const classIdParam = searchParams.get("classId") ?? ""
  const selectedClassId =
    classes.some((c) => c.id === classIdParam)
      ? classIdParam
      : classes[0]?.id ?? ""

  const klass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  )

  useEffect(() => {
    if (!selectedClassId || classIdParam === selectedClassId) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("classId", selectedClassId)
        return next
      },
      { replace: true }
    )
  }, [selectedClassId, classIdParam, setSearchParams])

  const { data: catalogSubjects = [] } = useSubjectsList()
  const teachers = useMemo(
    () => state.staff.filter((person) => person.role === "Teacher"),
    [state.staff]
  )

  function selectClass(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("classId", id)
      return next
    })
  }

  function setViewModeInUrl(mode: ViewMode) {
    setViewMode(mode)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("view", mode)
      if (mode === "class") {
        next.delete("teacherId")
      }
      return next
    })
  }

  function selectTeacherInUrl(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("view", "teacher")
      next.set("teacherId", id)
      return next
    })
  }

  const syncPortal = () => syncPortalForRoute(actor.role, "timetable")

  const sessionLabel = currentSession?.name ?? "—"

  const classMeta = klass
    ? [
        `${klass.periodCount} periods per day`,
        klass.room && klass.room !== "Unassigned" ? klass.room : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
          Timetable
        </h1>
        <p className="text-sm text-[var(--cls-muted)]">
          Session {sessionLabel} · Click any empty cell to assign a subject
        </p>
      </header>

      <section
        className="flex flex-col gap-4 rounded-xl border border-[var(--cls-border)] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-5"
        aria-label="Timetable filters"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
              View by
            </span>
            <ClsSubTabs
              variant="segmented"
              aria-label="Timetable view"
              className="!flex-row !items-center !justify-start !gap-0"
              value={viewMode}
              onValueChange={(v) => setViewModeInUrl(v as ViewMode)}
              items={[
                { value: "class", label: "Class" },
                { value: "teacher", label: "Teacher" },
              ]}
            />
          </div>

          {viewMode === "class" ? (
            <div className="flex w-full flex-col gap-1.5 lg:max-w-xs">
              <Label
                htmlFor="timetable-class-select"
                className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]"
              >
                Class
              </Label>
              <Select
                value={selectedClassId}
                onValueChange={selectClass}
                disabled={classesLoading || classes.length === 0}
              >
                <SelectTrigger
                  id="timetable-class-select"
                  className="h-10 w-full border-[var(--cls-border)] bg-[var(--page-wash)]/40"
                >
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
          ) : null}
        </div>

        {klass && viewMode === "class" ? (
          <p className="border-t border-[var(--cls-border)] pt-3 text-xs leading-relaxed text-[var(--cls-muted)]">
            <span className="font-medium text-[var(--cls-ink)]">
              {classDisplayName(klass)}
            </span>
            {classMeta ? ` · ${classMeta}` : null}
            {" · "}
            Period rows come from this class&apos;s{" "}
            <span className="font-medium text-[var(--cls-ink)]">
              {klass.periodCount} periods/day
            </span>{" "}
            (change under Classes → Edit class). Set start times in the period
            column, then click{" "}
            <span className="font-medium text-[var(--cls-ink)]">+</span> on an
            empty cell to assign a subject to this class.
          </p>
        ) : null}
      </section>

      <div
        className="flex gap-3 rounded-lg border border-[#BAE6FD]/80 bg-[#F0F9FF] px-4 py-3 text-xs leading-relaxed text-[#0369A1]"
        role="note"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-[#0284C7]" aria-hidden />
        <p>
          <span className="font-semibold text-[#0C4A6E]">Conflict mode:</span>{" "}
          Blocked — overlapping class or teacher slots are rejected automatically.
        </p>
      </div>

      {viewMode === "teacher" ? (
        <TimetableTeacherPanel
          teachers={teachers}
          classes={classes}
          initialTeacherId={teacherIdParam}
          onTeacherIdChange={selectTeacherInUrl}
          onEditSlotInClassView={(slot) => {
            setFocusSlot(slot)
            setViewModeInUrl("class")
            selectClass(slot.classId)
          }}
        />
      ) : !klass && !classesLoading ? (
        <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-20 text-center text-sm text-[var(--cls-muted)]">
          Add a class for the current session to build a timetable.
        </div>
      ) : (
        <ClassTimetableEditor
          classId={selectedClassId}
          klass={klass}
          subjects={catalogSubjects}
          teachers={teachers}
          syncPortal={syncPortal}
          focusSlot={focusSlot}
          onFocusSlotHandled={() => setFocusSlot(null)}
        />
      )}
    </div>
  )
}
