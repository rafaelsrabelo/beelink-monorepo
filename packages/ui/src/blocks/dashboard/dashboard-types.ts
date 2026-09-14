// React
import type { ReactNode } from "react"

/** The signed-in person, as the shell needs them — a name, an address and an optional picture. */
export interface DashboardUser {
  name: string
  email: string
  avatarUrl?: string
}

export interface DashboardNavItem {
  title: string
  href: string
  icon?: ReactNode
}

export interface DashboardCard {
  label: string
  value: string
  trend?: string
  footnote?: string
}

/** Two initials, so the avatar still says who this is when the picture fails to load. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts.at(0)?.[0] ?? "?"
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}
