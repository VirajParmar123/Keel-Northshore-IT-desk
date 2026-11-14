"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { TicketList } from "@/components/ticket-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { slaInfo } from "@/lib/format"
import { useDesk } from "@/lib/store"
import { isStaff, type Ticket } from "@/lib/types"

export default function TicketsPage() {
  const { state, user, now } = useDesk()
  const [tab, setTab] = useState("attention")
  const [query, setQuery] = useState("")
  const staff = user ? isStaff(user.role) : false
  const activeTab = !user ? "open" : staff ? tab : tab === "attention" ? "open" : tab

  const filtered = useMemo(() => {
    if (!state || !user) return []
    const scoped = staff ? state.tickets : state.tickets.filter((ticket) => ticket.requesterId === user.id)
    const needle = query.trim().toLowerCase()
    return scoped
      .filter((ticket) => matchesTab(ticket, activeTab, user.id, staff, now))
      .filter((ticket) => {
        if (!needle) return true
        const requester = state.people.find((person) => person.id === ticket.requesterId)?.name ?? ""
        return `${ticket.id} ${ticket.subject} ${ticket.category} ${requester}`.toLowerCase().includes(needle)
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  }, [activeTab, now, query, staff, state, user])

  if (!state || !user) return null

  const tabs = staff
    ? [
        ["attention", "Attention"],
        ["mine", "Mine"],
        ["waiting", "Waiting"],
        ["resolved", "Resolved"],
        ["all", "All"],
      ]
    : [
        ["open", "Open"],
        ["resolved", "Resolved"],
        ["all", "All"],
      ]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker={staff ? "Queue" : "Requests"}
        title={staff ? "The queue" : "Your requests"}
        lede={
          staff
            ? "Attention is anything new, unassigned, critical, or past its SLA. Waiting pauses the clock."
            : "These are the requests you opened. Replies from IT show up here and in the bell."
        }
        action={
          <Button render={<Link href="/desk/tickets/new" />}>New request</Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(value) => setTab(String(value))}>
          <TabsList>
            {tabs.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search subject, person, HD number"
          aria-label="Filter requests"
          className="sm:max-w-xs"
        />
      </div>
      <TicketList
        tickets={filtered}
        empty={query ? "No request matches that search." : "Nothing in this view. Try another tab, or open a request."}
      />
    </div>
  )
}

function matchesTab(ticket: Ticket, tab: string, userId: string, staff: boolean, now: number) {
  const done = ticket.status === "resolved" || ticket.status === "closed"
  if (tab === "all") return true
  if (tab === "resolved") return done
  if (tab === "waiting") return ticket.status === "waiting"
  if (tab === "mine") return ticket.assigneeId === userId && !done
  if (tab === "open") return !done
  if (!staff) return !done
  if (done || ticket.status === "waiting") return false
  return ticket.status === "new" || !ticket.assigneeId || ticket.priority === "critical" || slaInfo(ticket, now).tone === "breached"
}
