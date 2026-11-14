import type { ChatTurn, Priority, Role, Ticket, TicketStatus } from "./types"

const ZONE = "America/New_York"

export function deskParts(now = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "short" }).format(now)
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", hourCycle: "h23" }).format(now),
  )
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now)
  return {
    label,
    weekend: weekday === "Sat" || weekday === "Sun",
    greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
  }
}

export function formatWhen(iso: string, now = Date.now()) {
  const diff = now - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (Math.abs(min) < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  if (hours < 36) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "short", day: "numeric" }).format(new Date(iso))
}

export function formatClock(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export type SlaTone = "met" | "ok" | "risk" | "breached"

export function slaInfo(ticket: Ticket, now = Date.now()) {
  const due = new Date(ticket.createdAt).getTime() + ticket.slaMinutes * 60000
  const left = due - now
  if (ticket.status === "resolved" || ticket.status === "closed") {
    return { tone: "met" as SlaTone, label: "SLA met", due }
  }
  if (ticket.status === "waiting") {
    return { tone: "ok" as SlaTone, label: "Paused", due }
  }
  if (left < 0) {
    const late = Math.abs(left)
    const hours = Math.max(1, Math.round(late / 3600000))
    return { tone: "breached" as SlaTone, label: `Breached ${hours}h`, due }
  }
  const minutes = Math.max(1, Math.round(left / 60000))
  const label = minutes < 90 ? `${minutes}m left` : `${Math.round(minutes / 60)}h left`
  return { tone: (minutes <= 45 ? "risk" : "ok") as SlaTone, label, due }
}

export function statusLabel(status: TicketStatus, role: Role) {
  if (status === "waiting") return role === "employee" ? "Waiting on you" : "Waiting on requester"
  if (status === "new") return "New"
  if (status === "open") return "Open"
  if (status === "resolved") return "Resolved"
  return "Closed"
}

export function priorityLabel(priority: Priority) {
  return priority.slice(0, 1).toUpperCase() + priority.slice(1)
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function transcript(turns: ChatTurn[]) {
  return turns
    .filter((turn) => turn.kind !== "pending" && turn.text.trim())
    .map((turn) => `${turn.role === "user" ? "Employee" : "Keel"}: ${turn.text}`)
    .join("\n\n")
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}
