import { EmptyState, SectionHeading } from "@/components/app/kit"
import { Card, CardContent } from "@/components/ui/card"
import { classLabel } from "@/lib/format"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"

export function ParentTimetable() {
  const { state, child, childId, setChildId, options } = useChild()
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  const times = [
    ...new Set(
      state.slots
        .filter((slot) => slot.classId === child.classId)
        .map((slot) => slot.time)
    ),
  ].sort()
  return (
    <div className="grid gap-5">
      <SectionHeading
        title="Weekly timetable"
        detail={`${child.name} · ${classLabel(state.classes, child.classId)}`}
        action={
          <ChildSwitcher
            childId={childId}
            onChange={setChildId}
            options={options}
          />
        }
      />
      <Card>
        <CardContent className="overflow-x-auto p-5">
          {times.length === 0 ? (
            <EmptyState
              title="Timetable not published"
              detail="The school has not scheduled periods for this class yet."
            />
          ) : (
            <div
              className="grid min-w-[760px] gap-2 text-xs"
              style={{
                gridTemplateColumns: `80px repeat(${days.length}, minmax(0, 1fr))`,
              }}
            >
              <div />
              {days.map((day) => (
                <div key={day} className="pb-2 text-center font-semibold">
                  {day}
                </div>
              ))}
              {times.flatMap((time) => [
                <div key={time} className="pt-4 text-muted-foreground">
                  {time}
                </div>,
                ...days.map((day) => {
                  const slot = state.slots.find(
                    (item) =>
                      item.classId === child.classId &&
                      item.day === day &&
                      item.time === time
                  )
                  return (
                    <div
                      key={`${day}-${time}`}
                      className="min-h-20 rounded-xl border bg-muted/30 p-3"
                    >
                      {slot ? (
                        <>
                          <p className="font-semibold">{slot.subject}</p>
                          <p className="mt-2 text-muted-foreground">
                            {slot.room}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Free</p>
                      )}
                    </div>
                  )
                }),
              ])}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
