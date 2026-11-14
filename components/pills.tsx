import { priorityLabel, slaInfo, statusLabel } from "@/lib/format"
import type { Priority, Role, Ticket, TicketStatus } from "@/lib/types"
import { cn } from "cn"

const statusClass: Record<TicketStatus, string> = {
  new: "bg-sky-100 text-sky-950",
  open: "bg-[#f6d9cc] text-[#7a3014]",
  waiting: "bg-amber-100 text-amber-950",
  resolved: "bg-emerald-100 text-emerald-950",
  closed: "bg-stone-200 text-stone-700",
}

const priorityClass: Record<Priority, string> = {
  low: "bg-stone-100 text-stone-700",
  normal: "bg-stone-200/80 text-stone-800",
  high: "bg-orange-100 text-orange-950",
  critical: "bg-red-100 text-red-900",
}

export function StatusPill({ status, role }: { status: TicketStatus; role: Role }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusClass[status])}>
      {statusLabel(status, role)}
    </span>
  )
}

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", priorityClass[priority])}>
      {priorityLabel(priority)}
    </span>
  )
}

export function SlaPill({ ticket, now }: { ticket: Ticket; now: number }) {
  const sla = slaInfo(ticket, now)
  const tone =
    sla.tone === "breached"
      ? "bg-red-100 text-red-900"
      : sla.tone === "risk"
        ? "bg-amber-100 text-amber-950"
        : sla.tone === "met"
          ? "bg-emerald-50 text-emerald-900"
          : "bg-stone-100 text-stone-700"
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tone)}>{sla.label}</span>
}
