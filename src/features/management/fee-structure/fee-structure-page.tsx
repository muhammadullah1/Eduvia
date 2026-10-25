import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, History, Lock, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import feeStructureService, {
  type AddFeeInput,
  FEE_STRUCTURE_QUERY_KEY,
  type FeeStructure,
  type FeeStructureFee,
  type FeeType,
} from "@/api/fees/fee-structure.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useActor } from "@/lib/actor"
import { formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"
import { cn } from "@/lib/utils"

import { useClassesList } from "../classes/hooks/use-classes"
import { useSessionsList } from "../sessions/hooks/use-sessions"
import { AddFeeDialog, FeeHistoryDialog, RemoveFeeDialog } from "./fee-structure-dialogs"
import { errorText, formatAmount, FREQUENCY_LABEL } from "./fee-structure-rules"
import { FeeTypePill } from "./fee-type-pill"

/** Fee Structure tab: what each class pays, by fee type, with dated changes and full history. */
export function FeeStructurePage() {
  const { role } = useActor()
  const canManage = can(role, "fees.structure.manage")
  const queryClient = useQueryClient()

  const sessions = useSessionsList()
  // Selections fall back to the current session and its first class until the user picks.
  const [pickedSession, setSessionId] = useState("")
  const [pickedClass, setClassId] = useState("")
  const sessionId =
    pickedSession || (sessions.data?.find((s) => s.current) ?? sessions.data?.[0])?.id || ""

  const classes = useClassesList(sessionId ? Number(sessionId) : undefined)
  const classId = classes.data?.some((c) => c.id === pickedClass) ? pickedClass : (classes.data?.[0]?.id ?? "")

  const numericClassId = Number(classId)
  const structure = useQuery({
    queryKey: [FEE_STRUCTURE_QUERY_KEY, numericClassId],
    enabled: numericClassId > 0,
    queryFn: () => feeStructureService.get(numericClassId),
  })

  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<FeeType | undefined>()
  /** Bumped on every open so the dialog mounts with fresh fields. */
  const [addKey, setAddKey] = useState(0)
  const [historyOf, setHistoryOf] = useState<FeeType | null>(null)
  const [removing, setRemoving] = useState<FeeStructureFee | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURE_QUERY_KEY, numericClassId] })
  const add = useMutation({
    mutationFn: (input: AddFeeInput) => feeStructureService.add(numericClassId, input),
    onSuccess: async (_data, input) => {
      await refresh()
      setAddOpen(false)
      toast.success(`${input.feeType} set to PKR ${formatAmount(input.amount)} from ${formatDate(input.effectiveFrom)}`)
    },
  })
  const remove = useMutation({
    mutationFn: ({ fee, reason }: { fee: FeeStructureFee; reason: string }) =>
      feeStructureService.remove(numericClassId, fee.feeType, reason),
    onSuccess: async (_data, { fee }) => {
      await refresh()
      setRemoving(null)
      toast.success(`${fee.feeType} fee removed`)
    },
  })

  const sessionName = sessions.data?.find((s) => s.id === sessionId)
  const classLabel = structure.data?.class.label ?? classes.data?.find((c) => c.id === classId)?.label ?? ""
  const loadingFilters = sessions.isPending || (Boolean(sessionId) && classes.isPending)
  const filterError = sessions.error ?? classes.error

  function openAdd(type?: FeeType) {
    setAddType(type)
    setAddKey((key) => key + 1)
    add.reset()
    setAddOpen(true)
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="fs-class" className="text-xs font-medium text-[var(--cls-muted)]">
              Class
            </Label>
            <Select value={classId} onValueChange={setClassId} disabled={!classes.data?.length}>
              <SelectTrigger id="fs-class" className="w-full bg-white sm:w-44" aria-label="Class">
                <SelectValue placeholder={loadingFilters ? "Loading…" : "No classes"} />
              </SelectTrigger>
              <SelectContent>
                {classes.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="fs-session" className="text-xs font-medium text-[var(--cls-muted)]">
              Session
            </Label>
            <Select value={sessionId} onValueChange={setSessionId} disabled={!sessions.data?.length}>
              <SelectTrigger id="fs-session" className="w-full bg-white sm:w-52" aria-label="Session">
                <SelectValue placeholder={sessions.isPending ? "Loading…" : "No sessions"} />
              </SelectTrigger>
              <SelectContent>
                {sessions.data?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.current ? " (Current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canManage ? (
          <Button
            className="w-full bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)] sm:w-auto"
            disabled={!structure.data}
            onClick={() => openAdd()}
          >
            <Plus data-icon="inline-start" />
            Add Fee Type
          </Button>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--cls-muted)]">
            <Lock className="size-3.5" aria-hidden /> Read only — only a Super Admin can change fees.
          </p>
        )}
      </div>

      {filterError ? (
        <LoadError message={errorText(filterError)} onRetry={() => void (sessions.error ? sessions.refetch() : classes.refetch())} />
      ) : !loadingFilters && !classes.data?.length ? (
        <ClsPanel>
          <ClsEmpty title="No classes in this session">Add classes under Classes to set their fees.</ClsEmpty>
        </ClsPanel>
      ) : structure.isError ? (
        <LoadError message={errorText(structure.error)} onRetry={() => void structure.refetch()} />
      ) : !structure.data ? (
        <LoadingState />
      ) : (
        <>
          <SummaryBanner
            data={structure.data}
            sessionLabel={sessionName ? `${sessionName.name}${sessionName.current ? " (Current)" : ""}` : ""}
          />
          <StructureTable
            data={structure.data}
            canManage={canManage}
            onAdd={() => openAdd()}
            onChange={(type) => openAdd(type)}
            onHistory={setHistoryOf}
            onRemove={(fee) => {
              remove.reset()
              setRemoving(fee)
            }}
          />
        </>
      )}

      {canManage ? (
        <>
          <AddFeeDialog
            key={addKey}
            open={addOpen}
            onOpenChange={setAddOpen}
            classLabel={classLabel}
            current={structure.data?.fees ?? []}
            initialType={addType}
            saving={add.isPending}
            onSubmit={async (input) => {
              await add.mutateAsync(input)
            }}
          />
          <RemoveFeeDialog
            key={removing?.id ?? "none"}
            fee={removing}
            classLabel={classLabel}
            saving={remove.isPending}
            onClose={() => setRemoving(null)}
            onConfirm={async (reason) => {
              if (removing) await remove.mutateAsync({ fee: removing, reason })
            }}
          />
        </>
      ) : null}
      {numericClassId > 0 ? (
        <FeeHistoryDialog classId={numericClassId} feeType={historyOf} onClose={() => setHistoryOf(null)} />
      ) : null}
    </div>
  )
}

function SummaryBanner({ data, sessionLabel }: { data: FeeStructure; sessionLabel: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[var(--cls-brand)] px-5 py-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{data.class.label}</p>
        <p className="text-xs text-white/75">{sessionLabel || data.class.sessionName}</p>
      </div>
      <div className="flex gap-6 sm:text-right">
        {data.otherTotal > 0 ? (
          <div>
            <p className="text-xs text-white/75">Other fees</p>
            <p className="text-lg font-semibold tabular-nums">PKR {formatAmount(data.otherTotal)}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs text-white/75">Total Monthly Fee</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums" data-testid="monthly-total">
            PKR {formatAmount(data.monthlyTotal)}
          </p>
        </div>
      </div>
    </div>
  )
}

function StructureTable({
  data,
  canManage,
  onAdd,
  onChange,
  onHistory,
  onRemove,
}: {
  data: FeeStructure
  canManage: boolean
  onAdd: () => void
  onChange: (type: FeeType) => void
  onHistory: (type: FeeType) => void
  onRemove: (fee: FeeStructureFee) => void
}) {
  const monthly = data.fees.filter((f) => f.frequency === "Monthly")
  const other = data.fees.filter((f) => f.frequency !== "Monthly")
  const upcoming = useMemo(() => {
    const map = new Map<FeeType, FeeStructureFee>()
    for (const row of data.upcoming) if (!map.has(row.feeType)) map.set(row.feeType, row)
    return map
  }, [data.upcoming])
  const scheduledOnly = data.upcoming.filter(
    (row, i, all) => !data.fees.some((f) => f.feeType === row.feeType) && all.findIndex((r) => r.feeType === row.feeType) === i
  )

  if (!data.fees.length && !scheduledOnly.length) {
    return (
      <ClsPanel>
        <ClsEmpty title="No fees set for this class">
          {canManage ? (
            <div className="grid justify-items-center gap-3">
              <p>Add tuition and any admission, exam or annual fees.</p>
              <Button size="sm" variant="outline" onClick={onAdd}>
                <Plus data-icon="inline-start" /> Add Fee Type
              </Button>
            </div>
          ) : (
            "A Super Admin has not set fees for this class yet."
          )}
        </ClsEmpty>
      </ClsPanel>
    )
  }

  const row = (fee: FeeStructureFee, scheduled = false) => {
    const next = scheduled ? undefined : upcoming.get(fee.feeType)
    return (
      <TableRow key={`${fee.feeType}-${fee.id}`} className={clsRowClass}>
        <TableCell className="pl-4 sm:pl-5">
          <div className="grid justify-items-start gap-1">
            <FeeTypePill type={fee.feeType} />
            <span className="text-[11px] text-[var(--cls-muted)]">{FREQUENCY_LABEL[fee.frequency]}</span>
            <span className="text-[11px] text-[var(--cls-muted)] sm:hidden">From {formatDate(fee.effectiveFrom)}</span>
          </div>
        </TableCell>
        <TableCell className="text-right align-middle">
          <span className="font-semibold text-[var(--cls-ink)] tabular-nums">
            {scheduled ? "—" : formatAmount(fee.amount)}
          </span>
          {!scheduled && fee.feeType === "Tuition" && fee.amount === 0 ? (
            <span className="mt-0.5 block text-[11px] text-[var(--cls-muted)]">School default applies</span>
          ) : null}
          {next || scheduled ? (
            <span className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-sky-700">
              <CalendarClock className="size-3" aria-hidden />
              {formatAmount((next ?? fee).amount)} from {formatDate((next ?? fee).effectiveFrom)}
            </span>
          ) : null}
        </TableCell>
        <TableCell className="hidden text-sm text-[var(--cls-muted)] sm:table-cell">
          {scheduled ? "Not yet in force" : formatDate(fee.effectiveFrom)}
        </TableCell>
        <TableCell className="pr-2 sm:pr-4">
          <div className="flex flex-wrap items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-sky-700"
              aria-label={`History ${fee.feeType}`}
              onClick={() => onHistory(fee.feeType)}
            >
              <History className="size-3.5" aria-hidden /> <span className="hidden sm:inline">History</span>
            </Button>
            {canManage && !scheduled ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hidden h-8 px-2 md:inline-flex"
                  aria-label={`Change ${fee.feeType}`}
                  onClick={() => onChange(fee.feeType)}
                >
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-red-600 hover:text-red-700"
                  aria-label={`Remove ${fee.feeType}`}
                  onClick={() => onRemove(fee)}
                >
                  <Trash2 className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Remove</span>
                </Button>
              </>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <ClsPanel>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className={clsHeadRowClass}>
            <ClsTh className="w-[38%] pl-4 sm:w-[30%] sm:pl-5">Fee type</ClsTh>
            <ClsTh className="w-[30%] text-right sm:w-[20%]">Amount (PKR)</ClsTh>
            <ClsTh className="hidden sm:table-cell sm:w-[22%]">Effective date</ClsTh>
            <ClsTh className="w-[32%] sm:w-[28%]">Action</ClsTh>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthly.map((fee) => row(fee))}
          <TableRow className="border-[var(--cls-border)] bg-emerald-50 hover:bg-emerald-50">
            <TableCell className="pl-4 font-semibold text-[var(--cls-ink)] sm:pl-5">Total monthly</TableCell>
            <TableCell className="text-right font-bold text-[var(--cls-ink)] tabular-nums" data-testid="table-total">
              {formatAmount(data.monthlyTotal)}
            </TableCell>
            <TableCell className="hidden sm:table-cell" />
            <TableCell />
          </TableRow>
          {other.length ? (
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/80 hover:bg-[var(--page-wash)]/80">
              <TableCell colSpan={4} className="pl-4 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase sm:pl-5">
                Billed separately (not in the monthly total)
              </TableCell>
            </TableRow>
          ) : null}
          {other.map((fee) => row(fee))}
          {scheduledOnly.map((fee) => row(fee, true))}
        </TableBody>
      </Table>
    </ClsPanel>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4" aria-label="Loading fee structure">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <ClsPanel className={cn("border-red-200")}>
      <ClsEmpty title="Couldn't load the fee structure">
        <div className="grid justify-items-center gap-3">
          <p>{message}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </ClsEmpty>
    </ClsPanel>
  )
}
