import "./index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import App from "./App.tsx"

document.documentElement.classList.remove("dark")
document.documentElement.classList.add("light")
try {
  localStorage.removeItem("creative-leaders-theme")
} catch {
  /* ignore */
}

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element '#root' not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <TooltipProvider>
      <App />
      <Toaster />
    </TooltipProvider>
  </StrictMode>
)
