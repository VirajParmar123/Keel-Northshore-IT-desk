export const CATEGORIES = [
  "Access",
  "Network",
  "Email",
  "Hardware",
  "Software",
  "Meetings",
  "Accounts",
  "Printing",
] as const

export type Category = (typeof CATEGORIES)[number]

export const PRIORITIES = ["low", "normal", "high", "critical"] as const
export type Priority = (typeof PRIORITIES)[number]

export const STATUSES = ["new", "open", "waiting", "resolved", "closed"] as const
export type TicketStatus = (typeof STATUSES)[number]

export type Role = "employee" | "agent" | "admin"

export type Person = {
  id: string
  name: string
  email: string
  role: Role
  title: string
  team: string
  office: "Brooklyn" | "Austin" | "London"
  extension: string
  device: string
  assetTag: string
  hue: number
}

export type Article = {
  id: string
  question: string
  aliases: string[]
  answer: string
  steps: string[]
  category: Category
  ownerId: string
  updatedAt: string
  helpful: number
  notHelpful: number
}

export type TicketMessage = {
  id: string
  authorId: string
  body: string
  internal: boolean
  at: string
}

export type Ticket = {
  id: string
  subject: string
  description: string
  category: Category
  priority: Priority
  status: TicketStatus
  requesterId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  slaMinutes: number
  source: "portal" | "bot"
  messages: TicketMessage[]
}

export type ChatKind = "answer" | "clarify" | "miss" | "note" | "pending"

export type ChatOption = {
  id: string
  label: string
}

export type ChatTurn = {
  id: string
  role: "user" | "bot"
  text: string
  at: string
  kind?: ChatKind
  articleId?: string
  options?: ChatOption[]
  query?: string
  offerTicket?: boolean
}

export type ServiceStatus = "operational" | "degraded" | "outage"

export type Service = {
  id: string
  name: string
  detail: string
  status: ServiceStatus
  note: string
  updatedAt: string
}

export type Miss = {
  id: string
  text: string
  userId: string
  at: string
  ticketId: string | null
  articleId: string | null
}

export type Notice = {
  id: string
  userId: string
  text: string
  href: string
  at: string
  read: boolean
}

export type DeskState = {
  version: 1
  people: Person[]
  articles: Article[]
  tickets: Ticket[]
  chats: Record<string, ChatTurn[]>
  services: Service[]
  misses: Miss[]
  notices: Notice[]
  currentUserId: string | null
  seq: number
}

export const SLA_MINUTES: Record<Priority, number> = {
  low: 1440,
  normal: 8 * 60,
  high: 4 * 60,
  critical: 60,
}

export function isStaff(role: Role | undefined) {
  return role === "agent" || role === "admin"
}
