"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Library } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { transcript } from "@/lib/format"
import { useDesk } from "@/lib/store"
import type { Article, ChatTurn } from "@/lib/types"
import { cn } from "cn"

const PROMPTS = [
  "VPN drops after I open my laptop",
  "I can't join the office Wi-Fi",
  "Guest wifi for a visitor",
  "I forgot my Okta password",
  "Okta says too many codes",
  "I need access to the Brand shared drive",
  "Client email is not arriving",
  "The meeting is missing on my phone",
  "Slack notifications are silent",
  "I can't hear anyone on Zoom",
  "My Zoom camera is black",
  "My laptop fan is loud and hot",
  "The external monitor is flickering",
  "My laptop will not charge on the dock",
  "I can't release my print job",
  "Paper jam on the floor 4 Canon",
  "Figma is asking for an admin password",
  "I need a replacement mouse",
  "The new hire laptop is not ready",
  "My badge will not open the stair door",
  "My Mac says the disk is full",
  "This email looks like phishing",
  "My Mac is asking for a FileVault key",
]

export function ChatPanel({ starter }: { starter?: string | null }) {
  const { state, user, ask, chooseArticle, feedback } = useDesk()
  const router = useRouter()
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const turns = user && state ? (state.chats[user.id] ?? []) : []
  const pending = turns.some((turn) => turn.kind === "pending")

  useEffect(() => {
    if (!starter || started.current || !user) return
    started.current = true
    ask(starter)
  }, [ask, starter, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [turns.length, pending])

  function send(text?: string) {
    const value = (text ?? draft).trim()
    if (!value || pending) return
    setDraft("")
    ask(value)
  }

  function openRequest(query: string) {
    const history = transcript(turns)
    const params = new URLSearchParams({
      subject: query.slice(0, 90),
      description: history || query,
      source: "bot",
    })
    router.push(`/desk/tickets/new?${params.toString()}`)
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-[#241c16] text-[#f6efe6]">
            <Library className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Ask Keel</p>
            <p className="text-xs text-muted-foreground">Replies only from the answer library</p>
          </div>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">{state?.articles.length ?? 0} stored answers</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
        {turns.length === 0 ? (
          <div className="mx-auto max-w-2xl pt-6 text-center">
            <p className="font-heading text-3xl tracking-tight">What broke?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Keel looks up a stored answer. If the library doesn&apos;t have it, you&apos;ll get a request instead of a guess.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border bg-background px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn, index) => (
          <Bubble
            key={turn.id}
            turn={turn}
            article={turn.articleId ? state?.articles.find((item) => item.id === turn.articleId) : undefined}
            isLast={index === turns.length - 1}
            onChoose={(id, label) => chooseArticle(id, label)}
            onFixed={(articleId) => feedback(articleId, true, turn.query)}
            onStuck={(articleId) => feedback(articleId, false, turn.query)}
            onRequest={() => openRequest(turn.query || "Help from the desk")}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="border-t bg-background/80 p-3 md:p-4"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            placeholder={pending ? "Checking the library…" : "Ask the way you'd ask a teammate"}
            aria-label="Question for Keel"
            disabled={pending}
            className="max-h-36 min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label="Send question">
            <ArrowUp />
          </Button>
        </div>
        <p className="px-2 pt-2 text-[11px] text-muted-foreground">Enter to send. Shift+Enter for a new line. Nothing leaves this browser.</p>
      </form>
    </div>
  )
}

function Bubble({
  turn,
  article,
  isLast,
  onChoose,
  onFixed,
  onStuck,
  onRequest,
}: {
  turn: ChatTurn
  article?: Article
  isLast: boolean
  onChoose: (id: string, label: string) => void
  onFixed: (articleId: string) => void
  onStuck: (articleId: string) => void
  onRequest: () => void
}) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[36rem] rounded-2xl rounded-br-md bg-[#241c16] px-4 py-2.5 text-sm leading-relaxed text-[#f6efe6]">
          {turn.text}
        </p>
      </div>
    )
  }

  if (turn.kind === "pending") {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Checking the answer library…
      </p>
    )
  }

  return (
    <div className={cn("max-w-[40rem] rounded-2xl border bg-background px-4 py-3", turn.kind === "miss" && "border-[#e7c3b2] bg-[#fbf4ef]")}>
      {turn.kind === "answer" && article ? (
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9a4a2c] uppercase">From the answer library</p>
      ) : null}
      {turn.kind === "answer" && article ? <p className="font-heading mt-1 text-xl leading-snug">{article.question}</p> : null}
      <p className="mt-2 text-sm leading-relaxed">{turn.text}</p>
      {turn.kind === "answer" && article && article.steps.length > 0 ? (
        <ol className="mt-3 space-y-2 text-sm">
          {article.steps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {turn.kind === "answer" && !article ? (
        <p className="mt-2 text-xs text-muted-foreground">That entry was removed from the library.</p>
      ) : null}
      {turn.kind === "clarify" && turn.options ? (
        <div className="mt-3 flex flex-col gap-2">
          {turn.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChoose(option.id, option.label)}
              className="rounded-xl border bg-card px-3 py-2 text-left text-sm hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {isLast && turn.kind === "answer" && article ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => onFixed(article.id)}>
            That fixed it
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onStuck(article.id)}>
            I&apos;m still stuck
          </Button>
        </div>
      ) : null}
      {isLast && turn.offerTicket ? (
        <Button type="button" size="sm" className="mt-3" onClick={onRequest}>
          Open a request
        </Button>
      ) : null}
    </div>
  )
}
