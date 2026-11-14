"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { uid } from "@/lib/format"
import { matchQuery } from "@/lib/match"
import { createSeed } from "@/lib/seed"
import {
  SLA_MINUTES,
  type Article,
  type Category,
  type ChatTurn,
  type DeskState,
  type Notice,
  type Person,
  type Priority,
  type ServiceStatus,
  type Ticket,
  type TicketStatus,
} from "@/lib/types"

const KEY = "keel-desk-v1"

type TicketDraft = {
  subject: string
  description: string
  category: Category
  priority: Priority
  source: "portal" | "bot"
  requesterId?: string
}

type ArticleDraft = {
  id?: string
  question: string
  aliases: string[]
  answer: string
  steps: string[]
  category: Category
}

type TicketPatch = Partial<Pick<Ticket, "status" | "priority" | "assigneeId" | "category">>

type DeskApi = {
  ready: boolean
  state: DeskState | null
  now: number
  user: Person | null
  signIn: (id: string) => void
  signOut: () => void
  resetDemo: () => void
  ask: (text: string) => void
  chooseArticle: (articleId: string, label: string) => void
  feedback: (articleId: string, helpful: boolean, query?: string) => void
  createTicket: (draft: TicketDraft) => string | null
  claim: (ticketId: string) => void
  setTicket: (ticketId: string, patch: TicketPatch) => void
  addMessage: (ticketId: string, body: string, internal: boolean) => void
  resolveTicket: (ticketId: string, note: string, publish?: ArticleDraft | null) => void
  saveArticle: (draft: ArticleDraft) => string | null
  deleteArticle: (id: string) => void
  setService: (id: string, status: ServiceStatus, note: string) => void
  markNoticeRead: (id: string) => void
  markAllNoticesRead: () => void
  linkMiss: (missId: string, articleId: string) => void
}

const DeskContext = createContext<DeskApi | null>(null)

function isDeskState(value: unknown): value is DeskState {
  if (!value || typeof value !== "object") return false
  const state = value as DeskState
  return state.version === 1 && Array.isArray(state.articles) && Array.isArray(state.tickets) && Array.isArray(state.people)
}

function staffIds(state: DeskState) {
  return state.people.filter((person) => person.role !== "employee").map((person) => person.id)
}

function personName(state: DeskState, id: string | null) {
  if (!id) return "Unassigned"
  return state.people.find((person) => person.id === id)?.name ?? "Someone"
}

function notify(state: DeskState, items: Omit<Notice, "id" | "read">[]) {
  const actor = state.currentUserId
  const created = items
    .filter((item) => item.userId && item.userId !== actor)
    .map((item) => ({ ...item, id: uid("n"), read: false }))
  return [...created, ...state.notices].slice(0, 60)
}

export function DeskProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeskState | null>(null)
  const [now, setNow] = useState(0)
  const stateRef = useRef<DeskState | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (isDeskState(parsed)) {
          // Browser storage is unavailable during SSR. Loading it here keeps the first paint identical on server and client.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setState(parsed)
          return
        }
      }
    } catch {
      // fall through to a fresh desk
    }
    setState(createSeed())
  }, [])

  useEffect(() => {
    if (!state) return
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const update = () => setNow(Date.now())
    const kick = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 30_000)
    return () => {
      window.clearTimeout(kick)
      window.clearInterval(timer)
    }
  }, [])

  const api = useMemo<DeskApi>(() => {
    const user = state?.people.find((person) => person.id === state.currentUserId) ?? null

    return {
      ready: Boolean(state),
      state,
      now,
      user,
      signIn: (id) => setState((current) => (current ? { ...current, currentUserId: id } : current)),
      signOut: () => setState((current) => (current ? { ...current, currentUserId: null } : current)),
      resetDemo: () => {
        const keep = stateRef.current?.currentUserId ?? null
        const next = createSeed()
        next.currentUserId = keep
        setState(next)
      },
      ask: (text) => {
        const current = stateRef.current
        const userId = current?.currentUserId
        const trimmed = text.trim()
        if (!current || !userId || !trimmed) return
        const existing = current.chats[userId] ?? []
        if (existing.some((turn) => turn.kind === "pending")) return
        const pendingId = uid("pending")
        const userTurn: ChatTurn = {
          id: uid("turn"),
          role: "user",
          text: trimmed,
          at: new Date().toISOString(),
        }
        const pending: ChatTurn = {
          id: pendingId,
          role: "bot",
          text: "",
          at: new Date().toISOString(),
          kind: "pending",
        }
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const turns = snapshot.chats[userId] ?? []
          return { ...snapshot, chats: { ...snapshot.chats, [userId]: [...turns, userTurn, pending] } }
        })
        window.setTimeout(() => {
          setState((snapshot) => {
            if (!snapshot) return snapshot
            const result = matchQuery(trimmed, snapshot.articles)
            const turns = (snapshot.chats[userId] ?? []).filter((turn) => turn.id !== pendingId)
            let bot: ChatTurn
            let misses = snapshot.misses
            if (result.type === "answer") {
              const article = snapshot.articles.find((item) => item.id === result.articleId)
              bot = {
                id: uid("turn"),
                role: "bot",
                kind: "answer",
                text: article?.answer ?? "That answer was removed from the library.",
                articleId: result.articleId,
                query: trimmed,
                at: new Date().toISOString(),
              }
            } else if (result.type === "clarify") {
              bot = {
                id: uid("turn"),
                role: "bot",
                kind: "clarify",
                text: "Two stored answers could fit. I won't guess — pick the one you meant.",
                query: trimmed,
                at: new Date().toISOString(),
                options: result.options.map((option) => ({
                  id: option.articleId,
                  label: snapshot.articles.find((item) => item.id === option.articleId)?.question ?? "Stored answer",
                })),
              }
            } else {
              const duplicate = snapshot.misses.some(
                (miss) => miss.text.toLowerCase() === trimmed.toLowerCase() && !miss.articleId,
              )
              if (!duplicate) {
                misses = [
                  { id: uid("miss"), text: trimmed, userId, at: new Date().toISOString(), ticketId: null, articleId: null },
                  ...snapshot.misses,
                ].slice(0, 40)
              }
              bot = {
                id: uid("turn"),
                role: "bot",
                kind: "miss",
                query: trimmed,
                offerTicket: true,
                text:
                  result.type === "escalate"
                    ? "I can hand this to the person on shift. I only speak from the answer library, so I won't improvise a fix."
                    : "Nothing in the answer library matches that. I won't guess. Open a request and a technician gets the exact question.",
                at: new Date().toISOString(),
              }
            }
            return { ...snapshot, misses, chats: { ...snapshot.chats, [userId]: [...turns, bot] } }
          })
        }, 700)
      },
      chooseArticle: (articleId, label) => {
        const current = stateRef.current
        const userId = current?.currentUserId
        if (!current || !userId) return
        const article = current.articles.find((item) => item.id === articleId)
        if (!article) return
        const userTurn: ChatTurn = {
          id: uid("turn"),
          role: "user",
          text: label,
          at: new Date().toISOString(),
        }
        const bot: ChatTurn = {
          id: uid("turn"),
          role: "bot",
          kind: "answer",
          text: article.answer,
          articleId: article.id,
          query: label,
          at: new Date().toISOString(),
        }
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const turns = (snapshot.chats[userId] ?? []).filter((turn) => turn.kind !== "pending")
          return { ...snapshot, chats: { ...snapshot.chats, [userId]: [...turns, userTurn, bot] } }
        })
      },
      feedback: (articleId, helpful, query) => {
        const userId = stateRef.current?.currentUserId
        if (!userId) return
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const articles = snapshot.articles.map((article) =>
            article.id === articleId
              ? { ...article, helpful: article.helpful + (helpful ? 1 : 0), notHelpful: article.notHelpful + (helpful ? 0 : 1) }
              : article,
          )
          const note: ChatTurn = {
            id: uid("turn"),
            role: "bot",
            kind: "note",
            articleId,
            query,
            offerTicket: !helpful,
            text: helpful
              ? "Logged. That stored answer worked, so I'll keep offering it."
              : "Logged. I won't invent a second answer. Open a request and the on-shift technician gets this thread.",
            at: new Date().toISOString(),
          }
          const turns = snapshot.chats[userId] ?? []
          return { ...snapshot, articles, chats: { ...snapshot.chats, [userId]: [...turns, note] } }
        })
      },
      createTicket: (draft) => {
        const current = stateRef.current
        if (!current?.currentUserId) return null
        const requesterId = draft.requesterId ?? current.currentUserId
        const id = `HD-${current.seq}`
        stateRef.current = { ...current, seq: current.seq + 1 }
        const at = new Date().toISOString()
        const ticket: Ticket = {
          id,
          subject: draft.subject.trim(),
          description: draft.description.trim(),
          category: draft.category,
          priority: draft.priority,
          status: "new",
          requesterId,
          assigneeId: null,
          createdAt: at,
          updatedAt: at,
          slaMinutes: SLA_MINUTES[draft.priority],
          source: draft.source,
          messages: [
            {
              id: uid("msg"),
              authorId: requesterId,
              body: draft.description.trim(),
              internal: false,
              at,
            },
          ],
        }
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const requester = personName(snapshot, requesterId)
          const notices = notify(
            snapshot,
            staffIds(snapshot).map((userId) => ({
              userId,
              text: `${requester} opened ${id} · ${ticket.subject}`,
              href: `/desk/tickets/${id}`,
              at,
            })),
          )
          return { ...snapshot, seq: snapshot.seq + 1, tickets: [ticket, ...snapshot.tickets], notices }
        })
        return id
      },
      claim: (ticketId) => {
        const actor = stateRef.current?.currentUserId
        if (!actor) return
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const ticket = snapshot.tickets.find((item) => item.id === ticketId)
          if (!ticket) return snapshot
          const at = new Date().toISOString()
          const name = personName(snapshot, actor)
          const nextStatus: TicketStatus = ticket.status === "new" || ticket.status === "resolved" ? "open" : ticket.status
          const tickets = snapshot.tickets.map((item) =>
            item.id === ticketId
              ? {
                  ...item,
                  assigneeId: actor,
                  status: nextStatus,
                  updatedAt: at,
                  messages: [
                    ...item.messages,
                    { id: uid("msg"), authorId: "system", body: `${name} claimed this request.`, internal: false, at },
                  ],
                }
              : item,
          )
          const notices = notify(snapshot, [
            {
              userId: ticket.requesterId,
              text: `${name} picked up ${ticketId} · ${ticket.subject}`,
              href: `/desk/tickets/${ticketId}`,
              at,
            },
          ])
          return { ...snapshot, tickets, notices }
        })
      },
      setTicket: (ticketId, patch) => {
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const ticket = snapshot.tickets.find((item) => item.id === ticketId)
          if (!ticket) return snapshot
          const at = new Date().toISOString()
          const notes: string[] = []
          if (patch.status && patch.status !== ticket.status) notes.push(`Status set to ${patch.status}.`)
          if (patch.priority && patch.priority !== ticket.priority) {
            notes.push(`Priority set to ${patch.priority}.`)
          }
          if (patch.assigneeId !== undefined && patch.assigneeId !== ticket.assigneeId) {
            notes.push(`Assigned to ${personName(snapshot, patch.assigneeId)}.`)
          }
          if (patch.category && patch.category !== ticket.category) notes.push(`Category set to ${patch.category}.`)
          const slaMinutes = patch.priority ? SLA_MINUTES[patch.priority] : ticket.slaMinutes
          const tickets = snapshot.tickets.map((item) =>
            item.id === ticketId
              ? {
                  ...item,
                  ...patch,
                  slaMinutes,
                  updatedAt: at,
                  messages: notes.length
                    ? [
                        ...item.messages,
                        { id: uid("msg"), authorId: "system", body: notes.join(" "), internal: false, at },
                      ]
                    : item.messages,
                }
              : item,
          )
          const notices = notify(snapshot, [
            {
              userId: ticket.requesterId,
              text: `${ticketId} updated · ${notes[0] ?? ticket.subject}`,
              href: `/desk/tickets/${ticketId}`,
              at,
            },
            ...(patch.assigneeId && patch.assigneeId !== ticket.assigneeId
              ? [
                  {
                    userId: patch.assigneeId,
                    text: `You were assigned ${ticketId} · ${ticket.subject}`,
                    href: `/desk/tickets/${ticketId}`,
                    at,
                  },
                ]
              : []),
          ])
          return { ...snapshot, tickets, notices }
        })
      },
      addMessage: (ticketId, body, internal) => {
        const actor = stateRef.current?.currentUserId
        const trimmed = body.trim()
        if (!actor || !trimmed) return
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const ticket = snapshot.tickets.find((item) => item.id === ticketId)
          if (!ticket) return snapshot
          const at = new Date().toISOString()
          const reopen =
            !internal && (ticket.status === "waiting" || ticket.status === "resolved" || ticket.status === "closed")
          const tickets = snapshot.tickets.map((item) =>
            item.id === ticketId
              ? {
                  ...item,
                  status: reopen ? "open" : item.status,
                  updatedAt: at,
                  messages: [...item.messages, { id: uid("msg"), authorId: actor, body: trimmed, internal, at }],
                }
              : item,
          )
          const name = personName(snapshot, actor)
          const targets = internal
            ? staffIds(snapshot).filter((id) => id !== actor)
            : [ticket.requesterId, ticket.assigneeId].filter((id): id is string => Boolean(id) && id !== actor)
          const uniqueTargets = [...new Set(targets.length ? targets : staffIds(snapshot))]
          const notices = notify(
            snapshot,
            uniqueTargets.map((userId) => ({
              userId,
              text: internal
                ? `${name} left an internal note on ${ticketId}`
                : `${name} replied on ${ticketId} · ${ticket.subject}`,
              href: `/desk/tickets/${ticketId}`,
              at,
            })),
          )
          return { ...snapshot, tickets, notices }
        })
      },
      resolveTicket: (ticketId, note, publish) => {
        const actor = stateRef.current?.currentUserId
        if (!actor) return
        const trimmed = note.trim()
        if (!trimmed) return
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const ticket = snapshot.tickets.find((item) => item.id === ticketId)
          if (!ticket) return snapshot
          const at = new Date().toISOString()
          let articles = snapshot.articles
          let misses = snapshot.misses
          if (publish && publish.question.trim() && publish.answer.trim()) {
            const article: Article = {
              id: uid("kb"),
              question: publish.question.trim(),
              aliases: publish.aliases,
              answer: publish.answer.trim(),
              steps: publish.steps,
              category: publish.category,
              ownerId: actor,
              updatedAt: at,
              helpful: 0,
              notHelpful: 0,
            }
            articles = [article, ...articles]
            misses = misses.map((miss) =>
              miss.text.trim().toLowerCase() === publish.question.trim().toLowerCase() ? { ...miss, articleId: article.id } : miss,
            )
          }
          const name = personName(snapshot, actor)
          const tickets = snapshot.tickets.map((item) =>
            item.id === ticketId
              ? {
                  ...item,
                  status: "resolved" as const,
                  assigneeId: item.assigneeId ?? actor,
                  updatedAt: at,
                  messages: [
                    ...item.messages,
                    { id: uid("msg"), authorId: actor, body: trimmed, internal: false, at },
                    { id: uid("msg"), authorId: "system", body: `${name} resolved this request.`, internal: false, at },
                  ],
                }
              : item,
          )
          const notices = notify(snapshot, [
            {
              userId: ticket.requesterId,
              text: `${name} resolved ${ticketId} · ${ticket.subject}`,
              href: `/desk/tickets/${ticketId}`,
              at,
            },
          ])
          return { ...snapshot, articles, misses, tickets, notices }
        })
      },
      saveArticle: (draft) => {
        const actor = stateRef.current?.currentUserId
        if (!actor || !draft.question.trim() || !draft.answer.trim()) return null
        const id = draft.id ?? uid("kb")
        const at = new Date().toISOString()
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const existing = snapshot.articles.find((article) => article.id === id)
          const next: Article = {
            id,
            question: draft.question.trim(),
            aliases: draft.aliases.map((alias) => alias.trim()).filter(Boolean),
            answer: draft.answer.trim(),
            steps: draft.steps.map((step) => step.trim()).filter(Boolean),
            category: draft.category,
            ownerId: actor,
            updatedAt: at,
            helpful: existing?.helpful ?? 0,
            notHelpful: existing?.notHelpful ?? 0,
          }
          const articles = existing
            ? snapshot.articles.map((article) => (article.id === id ? next : article))
            : [next, ...snapshot.articles]
          return { ...snapshot, articles }
        })
        return id
      },
      deleteArticle: (id) => {
        setState((snapshot) =>
          snapshot ? { ...snapshot, articles: snapshot.articles.filter((article) => article.id !== id) } : snapshot,
        )
      },
      setService: (id, status, note) => {
        const at = new Date().toISOString()
        setState((snapshot) => {
          if (!snapshot) return snapshot
          const service = snapshot.services.find((item) => item.id === id)
          if (!service) return snapshot
          const services = snapshot.services.map((item) =>
            item.id === id ? { ...item, status, note: note.trim() || item.note, updatedAt: at } : item,
          )
          const label = status === "operational" ? "is operational" : status === "degraded" ? "is degraded" : "is down"
          const notices = notify(
            snapshot,
            snapshot.people.map((person) => ({
              userId: person.id,
              text: `${service.name} ${label}. ${note.trim()}`.trim(),
              href: "/desk/services",
              at,
            })),
          )
          return { ...snapshot, services, notices }
        })
      },
      markNoticeRead: (id) => {
        setState((snapshot) =>
          snapshot
            ? { ...snapshot, notices: snapshot.notices.map((notice) => (notice.id === id ? { ...notice, read: true } : notice)) }
            : snapshot,
        )
      },
      markAllNoticesRead: () => {
        const userId = stateRef.current?.currentUserId
        if (!userId) return
        setState((snapshot) =>
          snapshot
            ? {
                ...snapshot,
                notices: snapshot.notices.map((notice) => (notice.userId === userId ? { ...notice, read: true } : notice)),
              }
            : snapshot,
        )
      },
      linkMiss: (missId, articleId) => {
        setState((snapshot) =>
          snapshot
            ? { ...snapshot, misses: snapshot.misses.map((miss) => (miss.id === missId ? { ...miss, articleId } : miss)) }
            : snapshot,
        )
      },
    }
  }, [now, state])

  return <DeskContext.Provider value={api}>{children}</DeskContext.Provider>
}

export function useDesk() {
  const value = useContext(DeskContext)
  if (!value) throw new Error("useDesk must be used inside DeskProvider")
  return value
}
