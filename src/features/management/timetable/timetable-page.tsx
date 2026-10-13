import { Info } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"

import { classDisplayName } from "@/api/classes/map-class"
import timetableService from "@/api/timetable/timetable.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSchool } from "@/data/store"
import type { TimetableSlot } from "@/data/types"
import {
  ClassSchedulePeriodModal,
  type SchedulePeriodPrefill,
  type SchedulePeriodSubmit,
} from "@/features/management/classes/class-schedule-period-modal"
import {
  invalidateClassTimetable,
  useClassTimetableQuery,
} from "@/features/management/classes/hooks/use-class-detail-queries"
import { useClassesList } from "@/features/management/classes/hooks/use-classes"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"
import {
  loadClassPeriodTimes,
  type PeriodTimeMap,
} from "@/lib/timetable-period-times"
import { toast } from "@/lib/toast"

import { TimetableClassGrid } from "./timetable-class-grid"

type ViewMode = "class" | "teacher"

export function TimetablePage() {
  const { state, syncPortalForRoute } = useSchool()
  const actor = useActor()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>("class")
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [schedulePrefill, setSchedulePrefill] = useState<
    SchedulePeriodPrefill | undefined
  >()
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)
  const [saving, setSaving] = useState(false)
  const [periodTimes, setPeriodTimes] = useState<PeriodTimeMap>({})

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
    if (!klass) return
    setPeriodTimes(loadClassPeriodTimes(klass.id, klass.periodCount))
  }, [klass])

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

  const timetableQuery = useClassTimetableQuery(
    selectedClassId || undefined,
    Boolean(selectedClassId)
  )
  const slots = timetableQuery.data ?? []

  const { data: catalogSubjects = [] } = useSubjectsList()
  const activeSubjects = useMemo(
    () => catalogSubjects.filter((s) => s.status === "Active"),
    [catalogSubjects]
  )
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

  function openSchedule(prefill?: SchedulePeriodPrefill) {
    setEditingSlot(null)
    setSchedulePrefill(prefill)
    setScheduleOpen(true)
  }

  function openEditSlot(slot: TimetableSlot) {
    setEditingSlot(slot)
    setSchedulePrefill(undefined)
    setScheduleOpen(true)
  }

  function closeSchedule() {
    setScheduleOpen(false)
    setEditingSlot(null)
    setSchedulePrefill(undefined)
  }

  async function refreshTimetable(message: string) {
    await invalidateClassTimetable(queryClient, selectedClassId)
    await syncPortalForRoute(actor.role, "timetable")
    toast.success(message)
  }

  async function handleScheduleSubmit(payload: SchedulePeriodSubmit) {
    const classNumericId = Number(selectedClassId)
    const subjectNumericId = Number(payload.subjectId)
    if (!Number.isFinite(classNumericId) || !Number.isFinite(subjectNumericId)) {
      toast.error("Invalid class or subject.")
      return
    }
    setSaving(true)
    try {
      const shared = {
        fkClassId: classNumericId,
        time: payload.time,
        periodIndex: payload.periodIndex,
        fkSubjectId: subjectNumericId,
        fkTeacherId: payload.teacherId ? Number(payload.teacherId) : null,
        room: payload.room || null,
      }
      if (editingSlot) {
        await timetableService.update(Number(editingSlot.id), {
          ...shared,
          day: payload.days[0],
        })
        await refreshTimetable("Period updated")
      } else {
        let created = 0
        const failures: string[] = []
        for (const day of payload.days) {
          try {
            await timetableService.create({ ...shared, day })
            created += 1
          } catch (err) {
            failures.push(
              err instanceof Error ? err.message : "Could not schedule."
            )
          }
        }
        if (created === 0) {
          toast.error(failures[0] ?? "Could not assign subject.")
          return
        }
        await refreshTimetable(
          created === payload.days.length
            ? `Subject assigned on ${created} day${created === 1 ? "" : "s"}`
            : `Assigned on ${created} of ${payload.days.length} days`
        )
        if (failures.length > 0) toast.error(failures[0])
      }
      closeSchedule()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save timetable period."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleRemovePeriod() {
    if (!editingSlot) return
    setSaving(true)
    try {
      await timetableService.remove(Number(editingSlot.id))
      await refreshTimetable("Period removed")
      closeSchedule()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove period."
      )
    } finally {
      setSaving(false)
    }
  }

  const sessionLabel = currentSession?.name ?? "—"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
            Timetable
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Session {sessionLabel} · Click any empty cell to assign
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--cls-muted)]">
              View by:
            </span>
            <ClsSubTabs
              variant="segmented"
              aria-label="Timetable view"
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
              items={[
                { value: "class", label: "Class" },
                { value: "teacher", label: "Teacher" },
              ]}
            />
          </div>
          {viewMode === "class" ? (
            <Select
              value={selectedClassId}
              onValueChange={selectClass}
              disabled={classesLoading || classes.length === 0}
            >
              <SelectTrigger className="w-full min-w-[180px] sm:w-52">
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
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-[#BAE6FD] bg-[#E0F2FE]/50 px-4 py-3 text-xs text-[#0369A1]">
        <Info className="mt-0.5 size-4 shrink-0 text-[#0284C7]" />
        <span>
          Conflict mode: <span className="font-medium text-[var(--cls-ink)]">Blocked</span>
          — conflicting class or teacher assignments are rejected. Set period start
          times in the first column before assigning subjects.
        </span>
      </div>

      {viewMode === "teacher" ? (
        <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)]">
          Teacher timetable view is not available yet. Switch to{" "}
          <span className="font-medium text-[var(--cls-ink)]">Class</span> to
          manage weekly periods.
        </div>
      ) : !klass ? (
        <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)]">
          {classesLoading
            ? "Loading classes…"
            : "Add a class for the current session to build a timetable."}
        </div>
      ) : timetableQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/40 px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--cls-ink)]">
            Could not load timetable
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-[var(--cls-brand)]"
            onClick={() => void timetableQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <TimetableClassGrid
          classId={klass.id}
          slots={slots}
          periodCount={klass.periodCount}
          periodTimes={periodTimes}
          onPeriodTimesChange={setPeriodTimes}
          editablePeriodTimes
          onSchedulePeriod={openSchedule}
          onEditSlot={openEditSlot}
        />
      )}

      {klass ? (
        <ClassSchedulePeriodModal
          open={scheduleOpen}
          onOpenChange={(open) => !open && closeSchedule()}
          classLabel={classDisplayName(klass)}
          periodCount={klass.periodCount}
          periodTimes={periodTimes}
          roomSuggestion={
            klass.room && klass.room !== "Unassigned" ? klass.room : undefined
          }
          subjects={activeSubjects}
          teachers={teachers}
          existingSlots={slots}
          editingSlot={editingSlot}
          prefill={schedulePrefill}
          saving={saving}
          onSubmit={handleScheduleSubmit}
          onRemove={editingSlot ? handleRemovePeriod : undefined}
        />
      ) : null}
    </div>
  )
}
