import type { ApiTimetableSlot } from "@/lib/api-types"
import type { TimetableSlot } from "@/data/types"

export function mapTimetableSlotDto(dto: ApiTimetableSlot): TimetableSlot {
  return {
    id: String(dto.id),
    classId: String(dto.fkClassId),
    day: dto.day || "",
    time: String(dto.time || "").slice(0, 5),
    periodIndex: Number(dto.periodIndex) || 1,
    subject: dto.subject?.name ?? "",
    teacherId: String(dto.fkTeacherId ?? dto.teacher?.id ?? ""),
    teacher: dto.teacher?.user
      ? `${dto.teacher.user.firstName} ${dto.teacher.user.lastName}`.trim()
      : "",
    room: dto.room ?? "—",
  }
}

export type ClassSubjectRow = {
  id: string
  name: string
  code: string
  periodCount: number
  teachers: string[]
  days: string[]
  roomLabel: string
}

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

function sortDays(days: string[]) {
  return [...days].sort((a, b) => {
    const ia = DAY_ORDER.findIndex((d) => d.toLowerCase() === a.toLowerCase())
    const ib = DAY_ORDER.findIndex((d) => d.toLowerCase() === b.toLowerCase())
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

function shortDay(day: string) {
  const d = day.trim()
  if (d.length <= 3) return d
  return d.slice(0, 3)
}

function formatDays(days: string[]) {
  const sorted = sortDays(days)
  if (sorted.length === 0) return "—"
  if (sorted.length <= 3) {
    return sorted.map(shortDay).join(", ")
  }
  return `${sorted.slice(0, 2).map(shortDay).join(", ")} +${sorted.length - 2}`
}

function formatTeachers(names: string[]) {
  const unique = [...new Set(names.filter(Boolean))]
  if (unique.length === 0) return "Unassigned"
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return unique.join(" · ")
  return `${unique[0]} +${unique.length - 1}`
}

function formatRooms(rooms: string[]) {
  const unique = [
    ...new Set(rooms.map((r) => r.trim()).filter((r) => r && r !== "—")),
  ]
  if (unique.length === 0) return "—"
  if (unique.length === 1) return unique[0]
  return "Multiple rooms"
}

export function subjectsFromTimetableSlots(
  slots: TimetableSlot[],
  catalog: { id: string; name: string; code: string }[]
): ClassSubjectRow[] {
  type Acc = {
    id: string
    name: string
    code: string
    periodCount: number
    teachers: Set<string>
    days: Set<string>
    rooms: Set<string>
  }
  const byName = new Map<string, Acc>()

  for (const slot of slots) {
    if (!slot.subject) continue
    const key = slot.subject.toLowerCase()
    let acc = byName.get(key)
    if (!acc) {
      const match = catalog.find((s) => s.name.toLowerCase() === key)
      acc = {
        id: match?.id ?? key,
        name: slot.subject,
        code: match?.code ?? slot.subject.slice(0, 3).toUpperCase(),
        periodCount: 0,
        teachers: new Set(),
        days: new Set(),
        rooms: new Set(),
      }
      byName.set(key, acc)
    }
    acc.periodCount += 1
    if (slot.teacher) acc.teachers.add(slot.teacher)
    if (slot.day) acc.days.add(slot.day)
    if (slot.room) acc.rooms.add(slot.room)
  }

  return [...byName.values()]
    .map((acc) => ({
      id: acc.id,
      name: acc.name,
      code: acc.code,
      periodCount: acc.periodCount,
      teachers: [...acc.teachers],
      days: sortDays([...acc.days]),
      roomLabel: formatRooms([...acc.rooms]),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function subjectSummaryStats(subjects: ClassSubjectRow[]) {
  const periods = subjects.reduce((n, s) => n + s.periodCount, 0)
  const teacherIds = new Set<string>()
  for (const s of subjects) {
    for (const t of s.teachers) teacherIds.add(t)
  }
  return {
    subjectCount: subjects.length,
    periodsPerWeek: periods,
    teacherCount: teacherIds.size,
  }
}

export function subjectDaysLabel(days: string[]) {
  return formatDays(days)
}

export function subjectTeachersLabel(teachers: string[]) {
  return formatTeachers(teachers)
}
