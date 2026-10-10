import { FileSpreadsheet, Landmark, Plus, WalletCards } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Field, MetricCard } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
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
import { getToday } from "@/lib/dates"
import { formatDate, pkr } from "@/lib/format"

export function Finance() {
  const { state, addExpense } = useSchool()
  const actor = useActor()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => ({
    title: "",
    category: "Facilities",
    amount: "",
    date: getToday(),
  }))
  const income = state.payments
    .filter(
      (payment) =>
        payment.status === "Paid" && payment.date.startsWith("2026-09")
    )
    .reduce((sum, payment) => sum + payment.amount, 0)
  const spent = state.expenses
    .filter((expense) => expense.date.startsWith("2026-09"))
    .reduce((sum, expense) => sum + expense.amount, 0)
  const categories = [
    "Payroll",
    "Facilities",
    "Academic supplies",
    "Transport",
    "Other",
  ]
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          Post expense
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={WalletCards}
          label="September income"
          value={pkr(income)}
          note="Paid fees this month"
          tone="accent"
        />
        <MetricCard
          icon={Landmark}
          label="September expenses"
          value={pkr(spent)}
          note={`${state.expenses.length} ledger lines`}
        />
        <MetricCard
          icon={FileSpreadsheet}
          label="Net position"
          value={pkr(income - spent)}
          note="Income minus posted expenses"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense categories</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {categories.map((category) => {
              const amount = state.expenses
                .filter((expense) => expense.category === category)
                .reduce((sum, expense) => sum + expense.amount, 0)
              const width = spent ? Math.round((amount / spent) * 100) : 0
              return (
                <div key={category}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{category}</span>
                    <span className="font-medium">{pkr(amount)}</span>
                  </div>
                  <Progress value={width} />
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest entries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {state.expenses.slice(0, 6).map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between rounded-xl border px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{expense.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {expense.category} · {formatDate(expense.date)}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  − {pkr(expense.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post expense</DialogTitle>
            <DialogDescription>
              This updates the September operating position.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </Field>
            <Field label="Category">
              <Select
                value={form.category}
                onValueChange={(category) => setForm({ ...form, category })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount">
              <Input
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const message = addExpense(
                  { ...form, amount: Number(form.amount) },
                  actor
                )
                if (message) toast.error(message)
                else {
                  toast.success("Expense posted")
                  setOpen(false)
                  setForm({ ...form, title: "", amount: "" })
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
