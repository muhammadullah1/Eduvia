import { SchoolProvider } from "@/data/store"
import { Portal } from "@/features/shell/portal"

export default function App() {
  return (
    <SchoolProvider>
      <Portal />
    </SchoolProvider>
  )
}
