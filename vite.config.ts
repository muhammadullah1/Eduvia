import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

import { missingApiUrlError } from "./build-config/env-check"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const apiUrlError = missingApiUrlError(
    command,
    mode,
    process.env.VITE_API_URL ?? env.VITE_API_URL
  )
  if (apiUrlError) throw new Error(apiUrlError)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  }
})
