import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { SchoolProvider } from "@/data/store"
import { Portal as FeaturePortal } from "@/features/shell/portal"
import { queryClient } from "@/lib/query-client"

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SchoolProvider>
        <FeaturePortal />
      </SchoolProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
