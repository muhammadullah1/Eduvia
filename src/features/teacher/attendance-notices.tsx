import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, BellRing, Check, ShieldCheck } from "lucide-react"
import { useState } from "react"

import teacherAttendanceService, {
  type AttendanceReminder,
  TEACHER_ATTENDANCE_KEY,
} from "@/api/attendance/teacher-attendance.service"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const REMINDERS_KEY = [TEACHER_ATTENDANCE_KEY, "reminders"]
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

function useAttendanceReminders() {
  return useQuery({
    queryKey: REMINDERS_KEY,
    queryFn: teacherAttendanceService.reminders,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  })
}

function ReminderLine({ reminder }: { reminder: AttendanceReminder }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-medium text-[var(--cls-ink,inherit)]">
        {reminder.taken ? `${reminder.classLabel}: attendance taken` : `Take attendance for ${reminder.classLabel}`}
      </span>
      <span className="block text-xs text-muted-foreground">
        {reminder.sentBy ?? "The office"} sent a reminder at {time(reminder.sentAt)}
        {reminder.role === "Substitute" ? " · you are covering the Super Master today" : ""}
      </span>
    </span>
  )
}

/** Teacher top-bar bell: today's attendance reminders, with read state. */
export function TeacherNotificationsBell({ onOpenAttendance }: { onOpenAttendance: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: reminders = [], isError } = useAttendanceReminders()
  const unread = reminders.filter((r) => !r.readAt && !r.taken)
  const markRead = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => teacherAttendanceService.markRead(id))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REMINDERS_KEY }),
  })

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && unread.length) markRead.mutate(unread.map((r) => r.id))
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
        >
          <Bell />
          {unread.length ? (
            <span
              data-testid="notif-dot"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d64545] px-1 text-[10px] font-semibold text-white ring-2 ring-white"
            >
              {unread.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
        <div className="border-b px-3.5 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {isError ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Couldn't load notifications right now.</p>
          ) : !reminders.length ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="flex flex-col">
              {reminders.map((reminder) => (
                <li key={reminder.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onOpenAttendance()
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted",
                      !reminder.readAt && !reminder.taken && "bg-amber-50/70"
                    )}
                  >
                    {reminder.taken ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <BellRing className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                    )}
                    <ReminderLine reminder={reminder} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Teacher Today page: the registers this teacher owns today and any pending reminder. */
export function TodayAttendanceDuty({ onOpenAttendance }: { onOpenAttendance: () => void }) {
  const { data: classes = [] } = useQuery({
    queryKey: [TEACHER_ATTENDANCE_KEY, "responsibilities", "today"],
    queryFn: () => teacherAttendanceService.responsibilities(),
  })
  const { data: reminders = [] } = useAttendanceReminders()
  const pending = reminders.filter((r) => !r.taken)
  if (!classes.length && !pending.length) return null
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        pending.length ? "border-amber-200 bg-amber-50/70" : "bg-card"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {pending.length ? (
          <BellRing className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
        ) : (
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {pending.length
              ? `The office is waiting for today's attendance: ${pending.map((r) => r.classLabel).join(", ")}`
              : "Your attendance registers today"}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {classes.map((item) => (
              <StatusChip key={item.classId} tone={item.role === "SuperMaster" ? "brand" : "warning"}>
                {item.classLabel} · {item.role === "SuperMaster" ? "Super Master" : `covering ${item.coveringFor ?? "Super Master"}`}
              </StatusChip>
            ))}
          </div>
        </div>
      </div>
      <Button size="sm" variant={pending.length ? "default" : "outline"} className="shrink-0" onClick={onOpenAttendance}>
        Take attendance
      </Button>
    </div>
  )
}
