import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import clsCrest from "@/assets/cls-crest.png"
import { cn } from "@/lib/utils"

/** Keep a narrow column; desktop legibility comes from type size + vertical rhythm, not width. */
const authColumnClassName = "relative z-10 w-full max-w-[336px] md:max-w-[360px]"

export function AuthCanvas({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#d5e1dd] px-4 py-10 md:px-6 md:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-21 -left-21 size-[336px] rounded-full bg-[rgba(26,92,58,0.15)] md:size-[360px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-16 size-[500px] rounded-full bg-[rgba(26,92,58,0.15)] md:size-[560px]"
      />
      <div className={authColumnClassName}>{children}</div>
    </main>
  )
}

export function AuthBrand() {
  return (
    <div className="mb-[21px] flex flex-col items-center text-center md:mb-9">
      <img
        src={clsCrest}
        alt="Creative Leaders Schools"
        className="mb-3.5 size-[98px] rounded-lg object-contain md:mb-5 md:size-[108px]"
      />
      <h1 className="text-[22px] leading-[27.5px] font-bold text-[#1a5c3a] md:text-[24px] md:leading-[30px]">
        Creative Leaders Schools
      </h1>
      <p className="mt-[3.5px] text-[12.25px] leading-[17.5px] text-[#667085] md:mt-2 md:text-[13px] md:leading-5">
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
        "w-full rounded-2xl border border-[#e3e8ee] bg-white p-7 shadow-[0_4px_12px_rgba(16,24,40,0.08)] md:px-8 md:py-10",
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
        "text-[10.5px] leading-[14px] font-medium md:text-xs md:leading-4",
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
  "h-10 w-full rounded-lg border border-[#e3e8ee] bg-white px-3 py-2 text-sm text-[#1b2430] ring-offset-background outline-none placeholder:text-[#667085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c3a] disabled:cursor-not-allowed disabled:opacity-60"

export const authPrimaryButtonClassName =
  "flex h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-[#1a5c3a] bg-[#1a5c3a] px-4 text-[12.25px] leading-[17.5px] font-medium text-white transition-colors hover:bg-[#144a2f] disabled:cursor-not-allowed disabled:opacity-70 md:h-12 md:text-[13px] md:leading-5"

export const authOutlineButtonClassName =
  "flex h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-[#e3e8ee] bg-white px-4 text-[12.25px] leading-[17.5px] font-medium text-[#1a5c3a] transition-colors hover:border-[#1a5c3a]/30 hover:bg-[#f6f8fa] md:h-12 md:text-[13px] md:leading-5"

export function AuthHeading({
  title,
  description,
  className,
}: {
  title: string
  description: string
  className?: string
}) {
  return (
    <div className={cn("pt-[21px] md:pt-6", className)}>
      <h2 className="text-sm leading-[21px] font-semibold text-[#1b2430] md:text-[15px] md:leading-[22px]">
        {title}
      </h2>
      <p className="pt-[3.5px] text-[10.5px] leading-[14px] text-[#667085] md:pt-2 md:text-xs md:leading-[18px]">
        {description}
      </p>
    </div>
  )
}

export function AuthSubmit({
  children,
  disabled,
  className,
}: {
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(authPrimaryButtonClassName, className)}
    >
      {children}
    </button>
  )
}

export function AuthPrimaryButton({
  children,
  disabled,
  className,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(authPrimaryButtonClassName, className)}
    >
      {children}
    </button>
  )
}

export function AuthPrimaryLink({
  to,
  children,
  className,
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(authPrimaryButtonClassName, className)}
    >
      {children}
    </Link>
  )
}

export function AuthOutlineLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a href={href} className={cn(authOutlineButtonClassName, className)}>
      {children}
    </a>
  )
}

export function AuthFooterNote({ children }: { children: ReactNode }) {
  return (
    <p className="pt-3.5 text-center text-[10.5px] leading-[14px] text-[#667085] md:pt-5 md:text-xs md:leading-4">
      {children}
    </p>
  )
}

export function AuthPoweredBy() {
  return (
    <p className="pt-[17.5px] text-center text-[11px] leading-[16.5px] text-[#667085] md:pt-8 md:text-xs md:leading-4">
      Powered by <span className="font-medium text-[#1a5c3a]">Abler</span>
    </p>
  )
}

export function BackToLogin() {
  return (
    <Link
      to="/login"
      className="inline-flex items-center gap-[5px] text-[12.25px] leading-[17.5px] text-[#667085] hover:text-[#1b2430] md:text-sm md:leading-5"
    >
      <ArrowLeft className="size-4" />
      Back to login
    </Link>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[12.25px] leading-[17.5px] text-[#d64545] md:text-sm md:leading-5"
      role="alert"
    >
      {children}
    </p>
  )
}
