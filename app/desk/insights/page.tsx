"use client"

import { useState } from "react"
import Link from "next/link"
import { ArticleDialog } from "@/components/article-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { formatWhen, slaInfo } from "@/lib/format"
import { useDesk } from "@/lib/store"
import { CATEGORIES, isStaff } from "@/lib/types"

export default function InsightsPage() {
  const { state, user, now } = useDesk()
  const [missId, setMissId] = useState<string | null>(null)
  if (!state || !user) return null
  if (!isStaff(user.role)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-heading text-3xl">Insights stay with the desk</p>
        <p className="mt-2 text-sm text-muted-foreground">Employees see their own requests. The queue math is for IT.</p>
        <Button className="mt-4" render={<Link href="/desk" />}>
          Back to today
        </Button>
      </div>
    )
  }

  const open = state.tickets.filter((ticket) => ticket.status !== "resolved" && ticket.status !== "closed")
  const breached = open.filter((ticket) => slaInfo(ticket, now).tone === "breached")
  const helpful = state.articles.reduce((sum, article) => sum + article.helpful, 0)
  const missed = state.misses.filter((miss) => !miss.articleId)
  const byCategory = CATEGORIES.map((category) => ({
    category,
    count: state.tickets.filter((ticket) => ticket.category === category).length,
  }))
  const max = Math.max(1, ...byCategory.map((item) => item.count))
  const load = state.people
    .filter((person) => person.role !== "employee")
    .map((person) => ({
      person,
      count: open.filter((ticket) => ticket.assigneeId === person.id).length,
    }))
  const activeMiss = missed.find((miss) => miss.id === missId)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="Insights"
        title="How the desk is holding"
        lede="Counts come from the requests and the answer library in this browser. Reset demo data if you want the original Saturday snapshot back."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open" value={String(open.length)} hint="Not resolved or closed" />
        <Stat label="Past SLA" value={String(breached.length)} hint="Waiting pauses the clock" />
        <Stat label="Library fixes" value={String(helpful)} hint="People who said a stored answer worked" />
        <Stat label="Unanswered" value={String(missed.length)} hint="Questions Keel refused to guess" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="font-heading text-2xl">Requests by category</h2>
          <ul className="mt-4 space-y-3">
            {byCategory.map((item) => (
              <li key={item.category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.category}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-[#c4522a]" style={{ width: `${(item.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="font-heading text-2xl">Open work by person</h2>
          <ul className="mt-4 space-y-3">
            {load.map(({ person, count }) => (
              <li key={person.id} className="flex items-center justify-between text-sm">
                <span>
                  {person.name}
                  <span className="text-muted-foreground"> · {person.office}</span>
                </span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
            <li className="flex items-center justify-between text-sm">
              <span>Unassigned</span>
              <span className="font-medium">{open.filter((ticket) => !ticket.assigneeId).length}</span>
            </li>
          </ul>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="font-heading mb-3 text-2xl">Still missing from the library</h2>
        {missed.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            The library covered every question that came in.
          </p>
        ) : (
          <ul className="space-y-2">
            {missed.map((miss) => {
              const asker = state.people.find((person) => person.id === miss.userId)
              return (
                <li key={miss.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{miss.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {asker?.name} · {formatWhen(miss.at, now)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setMissId(miss.id)}>
                    Write the answer
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ArticleDialog
        key={activeMiss?.id ?? "none"}
        open={Boolean(activeMiss)}
        onOpenChange={(open) => {
          if (!open) setMissId(null)
        }}
        missId={activeMiss?.id}
        initial={activeMiss ? { question: activeMiss.text } : null}
      />
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-4xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
