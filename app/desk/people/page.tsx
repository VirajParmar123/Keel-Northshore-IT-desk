"use client"

import Link from "next/link"
import { Avatar } from "@/components/avatar"
import { PageHeader } from "@/components/page-header"
import { useDesk } from "@/lib/store"
import { isStaff } from "@/lib/types"

export default function PeoplePage() {
  const { state, user } = useDesk()
  if (!state || !user) return null
  const staff = isStaff(user.role)
  const people = staff ? state.people : state.people.filter((person) => person.role !== "employee")

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker={staff ? "Directory" : "IT contacts"}
        title={staff ? "People and the machines on their desks" : "Who picks up"}
        lede={
          staff
            ? "Asset tags are the stickers under the laptop. Quote one when FileVault or a dead dock comes in."
            : "Jordan covers Brooklyn, Riley covers Austin, and Priya approves anything that spends money."
        }
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {people.map((person) => {
          const open = state.tickets.filter(
            (ticket) =>
              (ticket.requesterId === person.id || ticket.assigneeId === person.id) &&
              ticket.status !== "resolved" &&
              ticket.status !== "closed",
          ).length
          return (
            <li key={person.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={person.name} hue={person.hue} className="size-11 text-sm" />
                <div className="min-w-0">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {person.title} · {person.team}
                  </p>
                  <p className="mt-2 text-sm">
                    {person.office} · {person.extension}
                  </p>
                  <p className="text-sm text-muted-foreground">{person.email}</p>
                  {staff ? (
                    <p className="mt-2 text-sm">
                      {person.device}
                      <span className="text-muted-foreground"> · {person.assetTag}</span>
                    </p>
                  ) : null}
                  {staff ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {open} open {open === 1 ? "thread" : "threads"} touching this person
                    </p>
                  ) : (
                    <Link href="/desk/tickets/new" className="mt-3 inline-block text-sm underline-offset-2 hover:underline">
                      Open a request
                    </Link>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
