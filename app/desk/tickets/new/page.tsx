"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { matchQuery } from "@/lib/match"
import { useDesk } from "@/lib/store"
import { CATEGORIES, type Category, type Priority } from "@/lib/types"

function NewRequest() {
  const params = useSearchParams()
  const router = useRouter()
  const { state, createTicket } = useDesk()
  const [subject, setSubject] = useState(params.get("subject") ?? "")
  const [description, setDescription] = useState(params.get("description") ?? "")
  const [category, setCategory] = useState<Category>("Network")
  const [priority, setPriority] = useState<Priority>("normal")
  const [error, setError] = useState("")
  const source = params.get("source") === "bot" ? "bot" : "portal"

  const suggestion = useMemo(() => {
    if (!state) return null
    const text = `${subject} ${description}`.trim()
    if (text.length < 4) return null
    const result = matchQuery(text, state.articles)
    if (result.type !== "answer") return null
    return state.articles.find((article) => article.id === result.articleId) ?? null
  }, [description, state, subject])

  if (!state) return null

  function submit() {
    if (!subject.trim() || !description.trim()) {
      setError("Add a subject and what you're seeing. A technician can't work from a blank form.")
      return
    }
    const id = createTicket({ subject, description, category, priority, source })
    if (!id) {
      setError("Sign in again, then send the request.")
      return
    }
    toast.success(`${id} is on the desk`)
    router.push(`/desk/tickets/${id}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="New request"
        title="Tell the desk what broke"
        lede="If the library already has the steps, they'll show up before you send this. Sending still pages the person on shift."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <form
          className="space-y-4 rounded-3xl border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="GlobalProtect dies when the lid opens" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(value) => value && setCategory(value as Category)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>How blocked are you?</Label>
              <Select value={priority} onValueChange={(value) => value && setPriority(value as Priority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — whenever</SelectItem>
                  <SelectItem value="normal">Normal — today</SelectItem>
                  <SelectItem value="high">High — client work is stuck</SelectItem>
                  <SelectItem value="critical">Critical — locked out now</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">What happened</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-36"
              placeholder="Office, what you already tried, and the next meeting this blocks."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["VPN", "Okta", "Printer", "Zoom", "New hire"].map((chip) => (
              <button
                key={chip}
                type="button"
                className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                onClick={() => setSubject((current) => (current ? current : chip))}
              >
                {chip}
              </button>
            ))}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit">Send to the desk</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/desk/tickets")}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {source === "bot" ? "This draft came from a Keel conversation." : "Opened from the portal."} Priority sets the SLA: critical 1 hour, high 4 hours, normal 8 hours, low 24 hours.
          </p>
        </form>
        <aside>
          {suggestion ? (
            <div className="rounded-2xl border border-[#e7c3b2] bg-[#fbf4ef] p-4">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9a4a2c] uppercase">Library already has this</p>
              <p className="font-heading mt-2 text-xl leading-snug">{suggestion.question}</p>
              <p className="mt-2 text-sm leading-relaxed">{suggestion.answer}</p>
              {suggestion.steps.length > 0 ? (
                <ol className="mt-3 space-y-1.5 text-sm">
                  {suggestion.steps.slice(0, 3).map((step, index) => (
                    <li key={step}>
                      {index + 1}. {step}
                    </li>
                  ))}
                </ol>
              ) : null}
              <Button
                type="button"
                className="mt-4 w-full"
                variant="outline"
                onClick={() => router.push(`/desk/ask?q=${encodeURIComponent(suggestion.question)}`)}
              >
                Open it in Keel
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              Keep typing. If your words match a stored answer, the steps show up here before you page anyone.
            </div>
          )}
          <div className="mt-4 text-xs text-muted-foreground">
            Critical is for lockouts and outages. A slow laptop can stay normal.
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening the form…</p>}>
      <NewRequest />
    </Suspense>
  )
}
