/**
 * Deployed builds must know where the API lives: without VITE_API_URL the bundle falls back to the
 * relative "/api", which only works behind the dev proxy. `vite build` (mode "production" or "staging")
 * therefore fails without it; dev serve and `--mode development` builds keep the fallback.
 */
export const API_URL_EXEMPT_MODES = ["development", "test"]

export function missingApiUrlError(
  command: string,
  mode: string,
  apiUrl: string | undefined
): string | null {
  if (command !== "build") return null
  if (API_URL_EXEMPT_MODES.includes(mode)) return null
  const value = String(apiUrl ?? "").trim()
  if (!value) {
    return `VITE_API_URL is required for "${mode}" builds (e.g. https://<api-host>/api). Set it in Vercel or .env.${mode}; see .env.example.`
  }
  if (!/^https:\/\//i.test(value) && !value.startsWith("/")) {
    return `VITE_API_URL must be an https URL or a same-origin path for "${mode}" builds; got "${value}".`
  }
  return null
}
