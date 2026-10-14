import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import classesService from "@/api/classes/classes.service"
import { refreshTimetableData } from "@/api/timetable/timetable-sync"
import timetableService from "@/api/timetable/timetable.service"
import type { ClassSection, TimetableSlot } from "@/data/types"
import {
  invalidateClassesList,
} from "@/features/management/classes/hooks/use-classes"
import {
  useClassTimetableQuery,
} from "@/features/management/classes/hooks/use-class-detail-queries"
import type {
  SchedulePeriodPrefill,
  SchedulePeriodSubmit,
} from "@/features/management/classes/class-schedule-period-modal"
import {
  periodTimesFromApi,
  serializePeriodTimes,
  type PeriodTimeMap,
} from "@/lib/timetable-period-times"
import { toast } from "@/lib/toast"

type Options = {
  classId: string
  klass: ClassSection | undefined
  syncPortal: () => Promise<void>
  /** Open the edit modal for this slot once loaded (e.g. from teacher view). */
  focusSlot?: TimetableSlot | null
  onFocusSlotHandled?: () => void
}

export function useClassTimetableEditor({
  classId,
  klass,
  syncPortal,
  focusSlot,
  onFocusSlotHandled,
}: Options) {
  const queryClient = useQueryClient()
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [schedulePrefill, setSchedulePrefill] = useState<
    SchedulePeriodPrefill | undefined
  >()
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)
  const [saving, setSaving] = useState(false)
  const [periodTimes, setPeriodTimes] = useState<PeriodTimeMap>({})
  const [periodSaveError, setPeriodSaveError] = useState(false)
  const periodSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedPeriodTimes = useRef<PeriodTimeMap>({})

  const timetableQuery = useClassTimetableQuery(classId || undefined, Boolean(classId))
  const slots = timetableQuery.data ?? []

  useEffect(() => {
    if (!klass) return
    const map = periodTimesFromApi(klass.periodStartTimes, klass.periodCount)
    setPeriodTimes(map)
    lastSavedPeriodTimes.current = map
    setPeriodSaveError(false)
  }, [klass?.id, klass?.periodCount, klass?.periodStartTimes])

  useEffect(() => {
    return () => {
      if (periodSaveTimer.current) clearTimeout(periodSaveTimer.current)
    }
  }, [])

  const handlePeriodTimesChange = useCallback(
    (map: PeriodTimeMap) => {
      setPeriodTimes(map)
      if (!klass) return
      if (periodSaveTimer.current) clearTimeout(periodSaveTimer.current)
      periodSaveTimer.current = setTimeout(() => {
        void (async () => {
          try {
            await classesService.update(Number(klass.id), {
              periodStartTimes: serializePeriodTimes(map),
            })
            lastSavedPeriodTimes.current = map
            setPeriodSaveError(false)
            await invalidateClassesList(queryClient)
          } catch (err) {
            setPeriodSaveError(true)
            setPeriodTimes(lastSavedPeriodTimes.current)
            toast.error(
              err instanceof Error
                ? err.message
                : "Could not save period start times."
            )
          }
        })()
      }, 500)
    },
    [klass, queryClient]
  )

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

  useEffect(() => {
    if (!focusSlot || focusSlot.classId !== classId) return
    const match = slots.find((s) => s.id === focusSlot.id)
    if (!match) return
    openEditSlot(match)
    onFocusSlotHandled?.()
  }, [focusSlot, classId, slots, onFocusSlotHandled])

  function closeSchedule() {
    setScheduleOpen(false)
    setEditingSlot(null)
    setSchedulePrefill(undefined)
  }

  async function refreshAfterMutation(message: string) {
    await refreshTimetableData(queryClient, {
      classId,
      syncPortal,
    })
    toast.success(message)
  }

  async function handleScheduleSubmit(payload: SchedulePeriodSubmit) {
    const classNumericId = Number(classId)
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
        await refreshAfterMutation("Period updated")
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
        await refreshAfterMutation(
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
      await refreshAfterMutation("Period removed")
      closeSchedule()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove period."
      )
    } finally {
      setSaving(false)
    }
  }

  return {
    slots,
    timetableQuery,
    periodTimes,
    periodSaveError,
    handlePeriodTimesChange,
    scheduleOpen,
    schedulePrefill,
    editingSlot,
    saving,
    openSchedule,
    openEditSlot,
    closeSchedule,
    handleScheduleSubmit,
    handleRemovePeriod,
  }
}
