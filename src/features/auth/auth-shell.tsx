import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import clsCrest from "@/assets/cls-crest.png"
import { cn } from "@/lib/utils"

export function AuthCanvas({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#d5e1dd] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-21 -left-21 size-[336px] rounded-full bg-[rgba(26,92,58,0.15)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-16 size-[500px] rounded-full bg-[rgba(26,92,58,0.15)]"
      />
      <div className="relative z-10 w-full max-w-[336px]">{children}</div>
    </main>
  )
}

export function AuthBrand() {
  return (
    <div className="mb-[21px] flex flex-col items-center text-center">
      <img
        src={clsCrest}
        alt="Creative Leaders Schools"
        className="mb-3.5 size-[98px] rounded-lg object-contain"
      />
      <h1 className="text-[22px] leading-[27.5px] font-bold text-[#1a5c3a]">
        Creative Leaders Schools
      </h1>
      <p className="mt-[3.5px] text-[12.25px] leading-[17.5px] text-[#667085]">
        School Management System
      </p>
    </div>
  )
}

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-[#e3e8ee] bg-white p-7 shadow-[0_4px_12px_rgba(16,24,40,0.08)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AuthLabel({
  htmlFor,
  children,
  tone = "ink",
}: {
  htmlFor: string
  children: ReactNode
  tone?: "ink" | "green"
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-[10.5px] leading-[14px] font-medium",
        tone === "green" ? "text-[#1a5c3a]" : "text-[#1b2430]"
      )}
    >
      {children}
    </label>
  )
}

export function RequiredMark() {
  return <span className="text-[#d64545]"> *</span>
}

export const authInputClassName =
  "h-[34px] w-full rounded-lg border border-[#e3e8ee] bg-white px-[10.5px] text-[12.25px] text-[#1b2430] outline-none placeholder:text-[#667085] focus-visible:border-[#1a5c3a] focus-visible:ring-3 focus-visible:ring-[#1a5c3a]/15 disabled:cursor-not-allowed disabled:opacity-60"

export function AuthSubmit({
  children,
  disabled,
}: {
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-[#1a5c3a] bg-[#1a5c3a] px-4 text-[12.25px] leading-[17.5px] font-medium text-white transition-colors hover:bg-[#144a2f] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  )
}

export function BackToLogin() {
  return (
    <Link
      to="/login"
      className="inline-flex items-center gap-[5px] text-[12.25px] leading-[17.5px] text-[#667085] hover:text-[#1b2430]"
    >
      <ArrowLeft className="size-4" />
      Back to login
    </Link>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12.25px] leading-[17.5px] text-[#d64545]" role="alert">
      {children}
    </p>
  )
}
