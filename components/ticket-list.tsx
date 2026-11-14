"use client"

import Link from "next/link"
import { Avatar } from "@/components/avatar"
import { PriorityPill, SlaPill, StatusPill } from "@/components/pills"
import { formatWhen } from "@/lib/format"
import { useDesk } from "@/lib/store"
import type { Ticket } from "@/lib/types"

export function TicketList({ tickets, empty }: { tickets: Ticket[]; empty: string }) {
  const { state, user, now } = useDesk()
  if (!state || !user) return null
  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
        <p className="font-heading text-2xl">Nothing in this pile</p>
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      </div>
    )
  }

  return (
    <ul className="overflow-hidden rounded-2xl border bg-card">
      {tickets.map((ticket) => {
        const requester = state.people.find((person) => person.id === ticket.requesterId)
        const assignee = state.people.find((person) => person.id === ticket.assigneeId)
        return (
          <li key={ticket.id} className="border-b last:border-b-0">
            <Link
              href={`/desk/tickets/${ticket.id}`}
              className="grid grid-cols-1 gap-3 px-4 py-3.5 transition-colors hover:bg-muted/70 md:grid-cols-[6.5rem_minmax(0,1fr)_auto] md:items-center"
            >
              <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{ticket.subject}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {requester ? <Avatar name={requester.name} hue={requester.hue} className="size-5 text-[9px]" /> : null}
                  <span className="truncate">
                    {requester?.name} · {ticket.category} · {formatWhen(ticket.updatedAt, now)}
                    {ticket.source === "bot" ? " · from Keel" : ""}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5 md:justify-end">
                <PriorityPill priority={ticket.priority} />
                <StatusPill status={ticket.status} role={user.role} />
                <SlaPill ticket={ticket} now={now} />
                <span className="text-xs text-muted-foreground">{assignee ? assignee.name.split(" ")[0] : "Unassigned"}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
