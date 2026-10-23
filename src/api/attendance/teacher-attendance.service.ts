import { api } from "@/lib/api"

/** A class the signed-in teacher is responsible for today (Super Master, or covering one). */
export type AttendanceResponsibility = {
  classId: number
  classLabel: string
  role: "SuperMaster" | "Substitute"
  absent?: boolean
  coveringFor?: string
}

/** A management reminder routed to this teacher for today. */
export type AttendanceReminder = {
  id: number
  classId: number
  classLabel: string
  date: string
  sentAt: string
  sentBy: string | null
  readAt: string | null
  taken: boolean
  role: "SuperMaster" | "Substitute"
}

export const TEACHER_ATTENDANCE_KEY = "teacher-attendance"

const teacherAttendanceService = {
  responsibilities: (date?: string) => api.get<AttendanceResponsibility[]>("/attendances/responsibilities", { date }),
  reminders: () => api.get<AttendanceReminder[]>("/attendances/reminders/mine"),
  markRead: (id: number) => api.post<{ id: number; readAt: string }>(`/attendances/reminders/${id}/read`, {}),
}

export default teacherAttendanceService
