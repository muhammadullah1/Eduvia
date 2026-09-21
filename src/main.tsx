import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="creative-leaders-theme">
      <TooltipProvider>
        <App />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
