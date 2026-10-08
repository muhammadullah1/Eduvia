import "./index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import App from "./App.tsx"

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element '#root' not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="creative-leaders-theme">
      <TooltipProvider>
        <App />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
