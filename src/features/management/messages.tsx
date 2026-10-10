import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
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
import { useActor } from "@/lib/actor"
import { classLabel } from "@/lib/format"

export function MessagesDesk() {
  const { state, setUpdateStatus } = useSchool()
  const actor = useActor()
  const [filter, setFilter] = useState("all")
  const rows = state.updates.filter(
    (item) => filter === "all" || item.status === filter
  )
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <div className="w-44">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                {["Draft", "Approved", "Published", "Rejected"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No updates"
          detail="Teacher drafts will show up here for approval."
        />
      ) : (
        rows.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge value={item.kind} />
                  <StatusBadge value={item.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {classLabel(state.classes, item.classId)} · {item.author}
                </span>
              </div>
              <CardTitle className="text-base">{item.subject}</CardTitle>
              <CardDescription className="text-sm text-foreground/80">
                {item.text}
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-2">
              {item.status === "Draft" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUpdateStatus(item.id, "Approved", actor.name)
                    toast.success("Update approved")
                  }}
                >
                  Approve
                </Button>
              ) : null}
              {item.status === "Approved" || item.status === "Draft" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setUpdateStatus(item.id, "Published", actor.name)
                    toast.success("Visible to parents")
                  }}
                >
                  Publish
                </Button>
              ) : null}
              {item.status !== "Rejected" && item.status !== "Published" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setUpdateStatus(item.id, "Rejected", actor.name)
                    toast.success("Update rejected")
                  }}
                >
                  Reject
                </Button>
              ) : null}
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  )
}
