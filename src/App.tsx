import { SchoolProvider } from "@/data/store"
import { Portal as FeaturePortal } from "@/features/shell/portal"

export default function App() {
  return (
    <SchoolProvider>
      <FeaturePortal />
    </SchoolProvider>
  )
}
