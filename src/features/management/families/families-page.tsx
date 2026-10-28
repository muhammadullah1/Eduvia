import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Plus, Users2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import familiesService, { FAMILIES_QUERY_KEY, type Family } from "@/api/fees/families.service"
import studentsService from "@/api/students/students.service"
import { ClsEmpty, ClsPanel } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useActor } from "@/lib/actor"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"
import { ApiHttpError } from "@/lib/api"

const BRAND = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
const CONTENT = "max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"

function errText(err: unknown) {
  if (err instanceof ApiHttpError) return err.message
  if (err instanceof Error) return err.message
  return "Something went wrong."
}

/** Explicit school families for sibling concessions — verified before use. */
export function FamiliesPage() {
  const { role } = useActor()
  const canManage = can(role, "families.manage")
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<Family | null>(null)
  const [name, setName] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [pickedStudents, setPickedStudents] = useState<number[]>([])
  const [addStudentId, setAddStudentId] = useState("")

  const list = useQuery({ queryKey: [FAMILIES_QUERY_KEY], queryFn: () => familiesService.list() })
  const students = useQuery({
    queryKey: ["students-family-pick", studentSearch],
    queryFn: () => studentsService.list({ search: studentSearch || undefined, pageSize: 40 }),
    enabled: createOpen || Boolean(detail),
  })
  const suggestions = useQuery({
    queryKey: [FAMILIES_QUERY_KEY, "suggest", detail?.id],
    queryFn: () => familiesService.suggest(detail!.id),
    enabled: Boolean(detail?.id),
  })

  const create = useMutation({
    mutationFn: () => familiesService.create({ displayName: name.trim(), studentIds: pickedStudents }),
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: [FAMILIES_QUERY_KEY] })
      setCreateOpen(false)
      setName("")
      setPickedStudents([])
      setDetail(family)
      toast.success("Family created — verify before sibling concessions")
    },
    onError: (err) => toast.error(errText(err)),
  })
  const verify = useMutation({
    mutationFn: (id: number) => familiesService.verify(id),
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: [FAMILIES_QUERY_KEY] })
      setDetail(family)
      toast.success("Family verified")
    },
    onError: (err) => toast.error(errText(err)),
  })
  const addMember = useMutation({
    mutationFn: ({ familyId, studentId, linkedVia }: { familyId: number; studentId: number; linkedVia?: string }) =>
      familiesService.addMember(familyId, { studentId, linkedVia }),
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: [FAMILIES_QUERY_KEY] })
      setDetail(family)
      setAddStudentId("")
      toast.success("Member added")
    },
    onError: (err) => toast.error(errText(err)),
  })
  const removeMember = useMutation({
    mutationFn: ({ familyId, studentId }: { familyId: number; studentId: number }) =>
      familiesService.removeMember(familyId, studentId),
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: [FAMILIES_QUERY_KEY] })
      setDetail(family)
      toast.success("Member removed")
    },
    onError: (err) => toast.error(errText(err)),
  })

  function togglePick(id: number) {
    setPickedStudents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--cls-ink)]">Families</h2>
          <p className="text-sm text-[var(--cls-muted)]">
            Link siblings explicitly. Phone or name matches alone never create a family.
          </p>
        </div>
        {canManage ? (
          <Button className={BRAND} onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" /> New family
          </Button>
        ) : null}
      </div>

      {list.isError ? (
        <ClsPanel>
          <ClsEmpty title="Couldn't load families">
            <Button size="sm" className={BRAND} onClick={() => void list.refetch()}>Try again</Button>
          </ClsEmpty>
        </ClsPanel>
      ) : !list.data ? (
        <ClsPanel><div className="h-40 animate-pulse bg-[var(--cls-border)]/40" /></ClsPanel>
      ) : !list.data.length ? (
        <ClsPanel>
          <ClsEmpty title="No families yet">
            {canManage ? "Create a family and add the children who should share sibling concessions." : "Nothing to show."}
          </ClsEmpty>
        </ClsPanel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((family) => {
            const active = family.members.filter((m) => m.status === "Active")
            return (
              <button
                key={family.id}
                type="button"
                onClick={() => setDetail(family)}
                className="rounded-xl border border-[var(--cls-border)] bg-white p-4 text-left shadow-sm transition hover:border-[var(--cls-brand)]/40"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users2 className="size-4 text-[var(--cls-brand)]" aria-hidden />
                    <p className="font-semibold text-[var(--cls-ink)]">{family.displayName}</p>
                  </div>
                  <StatusChip tone={family.verified ? "success" : "warning"}>
                    {family.verified ? "Verified" : "Unverified"}
                  </StatusChip>
                </div>
                <p className="text-xs text-[var(--cls-muted)]">
                  {active.length} active member{active.length === 1 ? "" : "s"}
                  {family.verifiedAt ? ` · verified ${formatDate(family.verifiedAt.slice(0, 10))}` : ""}
                </p>
                <ul className="mt-3 space-y-1">
                  {active.slice(0, 3).map((m) => (
                    <li key={m.id} className="truncate text-sm text-[var(--cls-ink)]">
                      {m.student ? `${m.student.firstName} ${m.student.lastName}` : `Student #${m.studentId}`}
                    </li>
                  ))}
                  {active.length > 3 ? (
                    <li className="text-xs text-[var(--cls-muted)]">+{active.length - 3} more</li>
                  ) : null}
                </ul>
              </button>
            )
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={CONTENT}>
          <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4">
            <DialogTitle>Create family</DialogTitle>
            <DialogDescription>Add children now or later. Verify before sibling concessions.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-5">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">Display name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Khan family"
                className="border-[var(--cls-border)] bg-white"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">Add students (optional)</Label>
              <Input
                className="mb-2 border-[var(--cls-border)] bg-white"
                placeholder="Search students"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--cls-border)] p-2">
                {(students.data?.students || []).map((s) => {
                  const on = pickedStudents.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => togglePick(s.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                        on ? "bg-[var(--cls-brand)]/10 text-[var(--cls-brand)]" : "hover:bg-[var(--cls-border)]/40"
                      }`}
                    >
                      <span>{s.firstName} {s.lastName} · {s.admissionNo}</span>
                      {on ? <CheckCircle2 className="size-4" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter className={CLS_MODAL_FOOTER}>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              className={BRAND}
              disabled={name.trim().length < 2 || create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className={CONTENT}>
          <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4">
            <DialogTitle>{detail?.displayName}</DialogTitle>
            <DialogDescription>
              {detail?.verified ? "Verified — ready for sibling concessions." : "Verify after confirming members."}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap gap-2">
                {!detail.verified && canManage ? (
                  <Button size="sm" className={BRAND} disabled={verify.isPending} onClick={() => verify.mutate(detail.id)}>
                    Verify family
                  </Button>
                ) : null}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--cls-ink)]">Members</p>
                <ul className="divide-y divide-[var(--cls-border)] rounded-lg border border-[var(--cls-border)]">
                  {detail.members.filter((m) => m.status === "Active").map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        {m.student ? `${m.student.firstName} ${m.student.lastName}` : `Student #${m.studentId}`}
                        <span className="text-[var(--cls-muted)]"> · {m.student?.admissionNo || m.linkedVia}</span>
                      </span>
                      {canManage ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          disabled={removeMember.isPending}
                          onClick={() => removeMember.mutate({ familyId: detail.id, studentId: m.studentId })}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              {canManage ? (
                <div>
                  <Label className="mb-1.5 block">Add member</Label>
                  <div className="flex gap-2">
                    <Select value={addStudentId} onValueChange={setAddStudentId}>
                      <SelectTrigger className="flex-1 border-[var(--cls-border)] bg-white">
                        <SelectValue placeholder="Student" />
                      </SelectTrigger>
                      <SelectContent>
                        {(students.data?.students || []).map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.firstName} {s.lastName} · {s.admissionNo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className={BRAND}
                      disabled={!addStudentId || addMember.isPending}
                      onClick={() =>
                        addMember.mutate({ familyId: detail.id, studentId: Number(addStudentId), linkedVia: "manual" })
                      }
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ) : null}
              {suggestions.data?.length ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--cls-ink)]">Suggestions from shared parent links</p>
                  <ul className="space-y-1">
                    {suggestions.data.map((s) => (
                      <li key={s.studentId} className="flex items-center justify-between rounded-lg border border-[var(--cls-border)] px-3 py-2 text-sm">
                        <span>{s.firstName} {s.lastName} · {s.admissionNo}</span>
                        {canManage ? (
                          <Button
                            size="sm"
                            className={BRAND}
                            onClick={() =>
                              addMember.mutate({
                                familyId: detail.id,
                                studentId: s.studentId,
                                linkedVia: "shared_parent_suggestion",
                              })
                            }
                          >
                            Add
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className={CLS_MODAL_FOOTER}>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
