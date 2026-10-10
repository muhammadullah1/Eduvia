import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSchool } from "@/data/store"
import { classLabel } from "@/lib/format"

export function ChildSwitcher({
  childId,
  onChange,
  options,
}: {
  childId: string
  onChange: (id: string) => void
  options: { id: string; name: string; classId: string }[]
}) {
  const { state } = useSchool()
  return (
    <Select value={childId} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((student) => (
            <SelectItem key={student.id} value={student.id}>
              {student.name} · {classLabel(state.classes, student.classId)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
