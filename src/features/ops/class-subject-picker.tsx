import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSchool } from "@/data/store"

export function ClassSubjectPicker({
  classId,
  subject,
  onClass,
  onSubject,
}: {
  classId: string
  subject: string
  onClass: (id: string) => void
  onSubject: (name: string) => void
}) {
  const { state } = useSchool()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select value={classId} onValueChange={onClass}>
        <SelectTrigger>
          <SelectValue placeholder="Class" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {state.classes.map((klass) => (
              <SelectItem key={klass.id} value={klass.id}>
                {klass.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select value={subject} onValueChange={onSubject}>
        <SelectTrigger>
          <SelectValue placeholder="Subject" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {state.subjects.map((item) => (
              <SelectItem key={item.id} value={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
