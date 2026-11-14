"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArticleDialog } from "@/components/article-dialog"
import { Avatar } from "@/components/avatar"
import { PageHeader } from "@/components/page-header"
import { SlaPill, StatusPill } from "@/components/pills"
import { Button } from "@/components/ui/button"
import { deskParts, formatWhen, slaInfo } from "@/lib/format"
import { useDesk } from "@/lib/store"
import { isStaff } from "@/lib/types"

export default function TodayPage() {
  const { state, user, now, ask, claim } = useDesk()
  const router = useRouter()
  const [draft, setDraft] = useState("")
  const [missId, setMissId] = useState<string | null>(null)
  if (!state || !user) return null

  const when = deskParts()
  const staff = isStaff(user.role)
  const degraded = state.services.filter((service) => service.status !== "operational")
  const mine = state.tickets.filter(
    (ticket) => ticket.requesterId === user.id && ticket.status !== "resolved" && ticket.status !== "closed",
  )
  const attention = state.tickets.filter((ticket) => {
    if (ticket.status === "resolved" || ticket.status === "closed" || ticket.status === "waiting") return false
    return ticket.status === "new" || !ticket.assigneeId || slaInfo(ticket, now).tone === "breached" || ticket.priority === "critical"
  })
  const unanswered = state.misses.filter((miss) => !miss.articleId)
  const onShift = state.people.filter((person) => person.role === "agent" && (!when.weekend || person.id === "jordan"))
  const activeMiss = unanswered.find((miss) => miss.id === missId)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker={when.weekend ? "Weekend coverage" : "Northshore desk"}
        title={`${when.greeting}, ${user.name.split(" ")[0]}.`}
        lede={
          staff
            ? when.weekend
              ? "Jordan is on call. Critical lockouts and anything blocking a client go first. The rest can wait until Monday."
              : "Unassigned and breached requests are at the top. Keel already answered what it could."
            : "Ask the library before you open a request. If Keel knows it, you'll get the stored steps. If not, someone on shift will."
        }
      />

      {degraded.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-[#e7c3b2] bg-[#fbf4ef] px-4 py-3">
          <p className="text-sm font-medium">Something on the floor is off</p>
          <ul className="mt-1 space-y-1 text-sm text-[#5c463c]">
            {degraded.map((service) => (
              <li key={service.id}>
                <Link href="/desk/services" className="font-medium underline-offset-2 hover:underline">
                  {service.name}
                </Link>{" "}
                is {service.status}. {service.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.7fr)]">
        <div className="min-w-0 space-y-6">
          <form
            className="min-w-0 rounded-3xl border bg-card p-4 shadow-sm md:p-5"
            onSubmit={(event) => {
              event.preventDefault()
              const text = draft.trim()
              if (!text) return
              ask(text)
              router.push("/desk/ask")
            }}
          >
            <label htmlFor="ask-today" className="text-sm font-medium">
              Ask Keel
            </label>
            <textarea
              id="ask-today"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="VPN drops when I open the lid"
              className="mt-2 min-h-20 w-full min-w-0 resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">It searches {state.articles.length} stored answers. No outside model.</p>
              <Button type="submit" disabled={!draft.trim()}>
                Ask
              </Button>
            </div>
          </form>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-2xl">{staff ? "Needs a person" : "Your open requests"}</h2>
              <Link href="/desk/tickets" className="text-sm text-muted-foreground hover:text-foreground">
                See all
              </Link>
            </div>
            <ul className="overflow-hidden rounded-2xl border bg-card">
              {(staff ? attention : mine).slice(0, 5).map((ticket) => {
                const requester = state.people.find((person) => person.id === ticket.requesterId)
                return (
                  <li key={ticket.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/desk/tickets/${ticket.id}`} className="block truncate font-medium hover:underline">
                        {ticket.subject}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ticket.id} · {requester?.name} · {formatWhen(ticket.updatedAt, now)}
                      </p>
                    </div>
                    <StatusPill status={ticket.status} role={user.role} />
                    <SlaPill ticket={ticket} now={now} />
                    {staff && ticket.assigneeId !== user.id && ticket.status !== "resolved" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          claim(ticket.id)
                          toast.success(`You claimed ${ticket.id}`)
                        }}
                      >
                        Claim
                      </Button>
                    ) : null}
                  </li>
                )
              })}
              {(staff ? attention : mine).length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {staff ? "Nothing is waiting on the desk." : "You don't have an open request. Ask Keel if something's off."}
                </li>
              ) : null}
            </ul>
          </section>

          {staff && unanswered.length > 0 ? (
            <section>
              <h2 className="font-heading mb-3 text-2xl">Questions the library missed</h2>
              <ul className="space-y-2">
                {unanswered.slice(0, 4).map((miss) => {
                  const asker = state.people.find((person) => person.id === miss.userId)
                  return (
                    <li key={miss.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{miss.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {asker?.name ?? "Someone"} · {formatWhen(miss.at, now)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setMissId(miss.id)}>
                        Write the answer
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold">On the desk</h2>
            <ul className="mt-3 space-y-3">
              {onShift.map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <Avatar name={person.name} hue={person.hue} />
                  <div>
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.office} · {person.extension}
                      {when.weekend && person.id === "jordan" ? " · on call" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/desk/people" className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground">
              {staff ? "Everyone and their devices" : "IT contacts"}
            </Link>
          </section>
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold">People keep asking</h2>
            <ul className="mt-3 space-y-2">
              {[...state.articles]
                .sort((a, b) => b.helpful - a.helpful)
                .slice(0, 4)
                .map((article) => (
                  <li key={article.id}>
                    <Link href={`/desk/ask?q=${encodeURIComponent(article.question)}`} className="text-sm hover:underline">
                      {article.question}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{article.helpful} people said it fixed it</p>
                  </li>
                ))}
            </ul>
          </section>
        </aside>
      </div>

      <ArticleDialog
        key={activeMiss?.id ?? "none"}
        open={Boolean(activeMiss)}
        onOpenChange={(open) => {
          if (!open) setMissId(null)
        }}
        missId={activeMiss?.id}
        initial={activeMiss ? { question: activeMiss.text, category: "Access" } : null}
      />
    </div>
  )
}
