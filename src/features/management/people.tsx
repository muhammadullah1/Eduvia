import { History, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, Field, Pager, SearchField } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { type Staff } from "@/data/types"
import { useActor } from "@/lib/actor"
import { classLabel } from "@/lib/format"
import { can } from "@/lib/permissions"
import { useClientTable } from "@/lib/use-client-table"

import { queryMatch } from "./shared"
import { TeacherSubjectDialog } from "./teacher-subject-dialog"

export function People({ query }: { query: string }) {
  const { state, addStaff } = useSchool()
  const actor = useActor()
  const roleOptions = can(actor.role, "staff.create.any")
    ? ["Teacher", "Operations Manager", "Accountant"]
    : ["Teacher"]
  const [localQuery, setLocalQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const emptyForm = {
    name: "",
    role: "Teacher",
    email: "",
    phone: "",
    subject: "",
  }
  const [form, setForm] = useState(emptyForm)
  const search = localQuery || query
  const rows = state.staff.filter((person) =>
    queryMatch(search, [person.name, person.role, person.email, person.subject])
  )
  const table = useClientTable(rows, search)

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Staff directory</CardTitle>
            <CardDescription>
              Teachers carry one active subject; office roles have portal access
              only to their own work.
            </CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {roleOptions.length > 1 ? "Add staff" : "Add teacher"}
          </Button>
        </div>
        <SearchField
          value={localQuery}
          onChange={setLocalQuery}
          placeholder="Search staff"
        />
      </CardHeader>
      <CardContent>
        {table.total === 0 ? (
          <EmptyState
            title="No staff found"
            detail="Try another name or role."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Email</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.slice.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.role}</TableCell>
                  <TableCell>{person.subject || "—"}</TableCell>
                  <TableCell>
                    {person.classIds
                      .map((id) => classLabel(state.classes, id))
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>
                    {person.role === "Teacher" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(person)}
                      >
                        <History data-icon="inline-start" />
                        Subject
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Pager {...table} onPage={table.setPage} />
      <TeacherSubjectDialog
        teacher={editing}
        onClose={() => setEditing(null)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
            <DialogDescription>
              A teacher cannot be created without a subject.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </Field>
            <Field label="Role">
              <Select
                value={form.role}
                onValueChange={(role) => setForm({ ...form, role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Email">
              <Input
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="name@cls.edu.pk"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </Field>
            {form.role === "Teacher" ? (
              <Field label="Subject (required)">
                <Select
                  value={form.subject}
                  onValueChange={(subject) => setForm({ ...form, subject })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {state.subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const message = addStaff({ ...form, classIds: [] }, actor)
                if (message) toast.error(message)
                else {
                  toast.success("Staff member added")
                  setOpen(false)
                  setForm(emptyForm)
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
