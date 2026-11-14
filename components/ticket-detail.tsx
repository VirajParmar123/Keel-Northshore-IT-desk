"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Avatar } from "@/components/avatar"
import { PriorityPill, SlaPill, StatusPill } from "@/components/pills"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatClock, formatWhen } from "@/lib/format"
import { useDesk } from "@/lib/store"
import { CATEGORIES, PRIORITIES, STATUSES, isStaff, type Category, type Priority, type TicketStatus } from "@/lib/types"

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const { state, user, now, claim, setTicket, addMessage, resolveTicket } = useDesk()
  const router = useRouter()
  const [reply, setReply] = useState("")
  const [internal, setInternal] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [note, setNote] = useState("")
  const [publish, setPublish] = useState(false)
  const [question, setQuestion] = useState("")
  const [error, setError] = useState("")

  if (!state || !user) return null
  const ticket = state.tickets.find((item) => item.id === ticketId)
  if (!ticket) {
    return (
      <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
        <p className="font-heading text-3xl">That request isn&apos;t on the desk</p>
        <p className="mt-2 text-sm text-muted-foreground">It may have been cleared when the demo data was reset.</p>
        <Button className="mt-4" onClick={() => router.push("/desk/tickets")}>
          Back to the queue
        </Button>
      </div>
    )
  }
  if (!isStaff(user.role) && ticket.requesterId !== user.id) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-16 text-center">
        <p className="font-heading text-3xl">This request belongs to someone else</p>
        <p className="mt-2 text-sm text-muted-foreground">Employees only see the requests they opened.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/desk/tickets")}>
          Your requests
        </Button>
      </div>
    )
  }

  const requester = state.people.find((person) => person.id === ticket.requesterId)
  const assignee = state.people.find((person) => person.id === ticket.assigneeId)
  const staff = isStaff(user.role)
  const messages = ticket.messages.filter((message) => staff || !message.internal)
  const closed = ticket.status === "resolved" || ticket.status === "closed"

  function send() {
    if (!reply.trim()) return
    addMessage(ticketId, reply, internal)
    setReply("")
    toast.success(internal ? "Internal note saved" : "Reply sent")
  }

  function changeStatus(status: TicketStatus) {
    if (status === "resolved") {
      setQuestion(ticket?.subject ?? "")
      setNote("")
      setPublish(false)
      setResolveOpen(true)
      return
    }
    setTicket(ticketId, { status })
    toast.success("Status updated")
  }

  function resolve() {
    if (!note.trim()) {
      setError("Write what you did. The requester sees this.")
      return
    }
    resolveTicket(
      ticketId,
      note,
      publish
        ? {
            question: question || ticket?.subject || "Untitled",
            answer: note,
            steps: [],
            aliases: [],
            category: ticket?.category ?? "Access",
          }
        : null,
    )
    setResolveOpen(false)
    toast.success(publish ? "Resolved, and the answer is in the library" : "Request resolved")
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <Link href="/desk/tickets" className="text-sm text-muted-foreground hover:text-foreground">
          ← {staff ? "Queue" : "Your requests"}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                void navigator.clipboard.writeText(ticket.id)
                toast.success(`Copied ${ticket.id}`)
              }}
            >
              {ticket.id}
            </button>
            <h1 className="font-heading mt-1 text-3xl tracking-tight text-balance">{ticket.subject}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Opened {formatWhen(ticket.createdAt, now)} · {ticket.source === "bot" ? "Came from Keel" : "Opened in the portal"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <PriorityPill priority={ticket.priority} />
            <StatusPill status={ticket.status} role={user.role} />
            <SlaPill ticket={ticket} now={now} />
          </div>
        </div>

        <ol className="mt-6 space-y-3">
          {messages.map((message) => {
            if (message.authorId === "system") {
              return (
                <li key={message.id} className="text-center text-xs text-muted-foreground">
                  {message.body} · {formatClock(message.at)}
                </li>
              )
            }
            const author = state.people.find((person) => person.id === message.authorId)
            const mine = message.authorId === user.id
            return (
              <li key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[40rem] rounded-2xl px-4 py-3 ${message.internal ? "border border-dashed border-amber-400 bg-amber-50" : mine ? "bg-[#241c16] text-[#f6efe6]" : "border bg-card"}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    {author ? <Avatar name={author.name} hue={author.hue} className="size-5 text-[9px]" /> : null}
                    <span className={mine && !message.internal ? "text-[#e7ddd2]" : "text-muted-foreground"}>
                      {author?.name ?? "Northshore"} · {formatClock(message.at)}
                      {message.internal ? " · Internal" : ""}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
                </div>
              </li>
            )
          })}
        </ol>

        {closed ? (
          <p className="mt-6 rounded-2xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            This request is {ticket.status}. Reply if it comes back and IT will reopen the thread.
          </p>
        ) : null}

        <form
          className="mt-4 rounded-2xl border bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <Label htmlFor="reply" className="px-1 text-xs text-muted-foreground">
            {internal ? "Internal note — the requester will not see this" : "Reply"}
          </Label>
          <Textarea
            id="reply"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={staff ? "What did you try, and what should they do next?" : "Add what you see on screen."}
            className="mt-2 min-h-24 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            {staff ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
                Internal note
              </label>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!reply.trim()}>
              {internal ? "Save note" : "Send reply"}
            </Button>
          </div>
        </form>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">Requester</p>
          {requester ? (
            <div className="mt-2 flex items-center gap-2">
              <Avatar name={requester.name} hue={requester.hue} />
              <div>
                <p className="text-sm font-medium">{requester.name}</p>
                <p className="text-xs text-muted-foreground">
                  {requester.title} · {requester.office}
                </p>
                <p className="text-xs text-muted-foreground">{requester.device}</p>
              </div>
            </div>
          ) : null}
        </div>

        {staff ? (
          <div className="grid gap-3">
            <Field label="Status">
              <Select value={ticket.status} onValueChange={(value) => value && changeStatus(value as TicketStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "waiting" ? "Waiting on requester" : status[0].toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={ticket.priority}
                onValueChange={(value) => {
                  if (!value) return
                  setTicket(ticketId, { priority: value as Priority })
                  toast.success("Priority updated")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority[0].toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select
                value={ticket.category}
                onValueChange={(value) => {
                  if (!value) return
                  setTicket(ticketId, { category: value as Category })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assignee">
              <Select
                value={ticket.assigneeId ?? "unassigned"}
                onValueChange={(value) => {
                  if (!value) return
                  setTicket(ticketId, { assigneeId: value === "unassigned" ? null : value })
                  toast.success("Assignment updated")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {state.people
                    .filter((person) => person.role !== "employee")
                    .map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            {ticket.assigneeId !== user.id && !closed ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  claim(ticketId)
                  toast.success("You claimed this request")
                }}
              >
                Claim
              </Button>
            ) : null}
            {!closed ? (
              <Button
                type="button"
                onClick={() => {
                  setQuestion(ticket.subject)
                  setNote("")
                  setPublish(true)
                  setError("")
                  setResolveOpen(true)
                }}
              >
                Resolve
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">With </span>
              {assignee ? assignee.name : "the next person on shift"}
            </p>
            <p>
              <span className="text-muted-foreground">About </span>
              {ticket.category}
            </p>
          </div>
        )}
      </aside>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Resolve {ticket.id}</DialogTitle>
            <DialogDescription>The requester sees the note. You can also store it so Keel can answer the next person.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="resolution">What fixed it</Label>
              <Textarea id="resolution" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />
              Add this to the answer library
            </label>
            {publish ? (
              <div className="grid gap-1.5">
                <Label htmlFor="publish-question">Question to match</Label>
                <Textarea id="publish-question" value={question} onChange={(event) => setQuestion(event.target.value)} />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={resolve}>
              Resolve request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  )
}
