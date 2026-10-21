import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function Chooser({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--cls-muted)]">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
