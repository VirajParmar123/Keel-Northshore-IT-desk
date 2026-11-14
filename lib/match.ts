import type { Article } from "./types"

const STOP = new Set([
  "a", "an", "the", "my", "i", "me", "to", "for", "of", "on", "in", "is", "it",
  "and", "or", "with", "please", "can", "you", "your", "help", "how", "do",
  "does", "dont", "not", "wont", "keep", "keeps", "after", "when", "from",
  "this", "that", "just", "been", "am", "are", "was", "were", "hi", "hello",
  "hey", "need", "want", "our", "at", "be", "get", "got", "im", "ive", "cant",
  "cannot", "why", "what", "where", "who", "its", "would", "could", "should",
  "someone", "anyone", "into", "out", "up", "down", "over", "again", "still",
  "very", "really", "so", "but", "if", "we", "they", "them", "their", "have",
  "has", "had", "having", "about", "there", "here", "also", "too", "than",
  "then", "once", "because", "while", "during", "before", "since", "will",
  "let", "make", "made", "something", "anything", "doesnt", "didnt", "isnt",
  "wasnt", "work", "working", "works", "issue", "problem", "please", "thanks",
  "thank", "hello", "hiya",
])

const SYNONYMS: Record<string, string> = {
  wifi: "wifi",
  "wi-fi": "wifi",
  wireless: "wifi",
  ssid: "wifi",
  vpn: "vpn",
  globalprotect: "vpn",
  password: "password",
  passcode: "password",
  pwd: "password",
  okta: "okta",
  sso: "okta",
  mfa: "mfa",
  "2fa": "mfa",
  authenticator: "mfa",
  locked: "mfa",
  lockout: "mfa",
  gmail: "email",
  inbox: "email",
  mail: "email",
  email: "email",
  printer: "printer",
  printing: "printer",
  papercut: "papercut",
  canon: "printer",
  jam: "jam",
  jammed: "jam",
  slack: "slack",
  notification: "slack",
  notifications: "slack",
  zoom: "zoom",
  laptop: "laptop",
  macbook: "laptop",
  mac: "laptop",
  computer: "laptop",
  slow: "slow",
  sluggish: "slow",
  laggy: "slow",
  fan: "slow",
  hot: "slow",
  monitor: "monitor",
  display: "monitor",
  screen: "monitor",
  flicker: "flicker",
  flickering: "flicker",
  dock: "dock",
  charging: "dock",
  charger: "dock",
  badge: "badge",
  filevault: "filevault",
  bitlocker: "filevault",
  phishing: "phishing",
  spam: "phishing",
  suspicious: "phishing",
  fake: "phishing",
  weird: "phishing",
  jamf: "jamf",
  calendar: "calendar",
  invite: "calendar",
  camera: "camera",
  webcam: "camera",
  microphone: "audio",
  mic: "audio",
  audio: "audio",
  speaker: "audio",
  sound: "audio",
  disk: "disk",
  storage: "disk",
  full: "disk",
  hire: "hire",
  onboarding: "hire",
  guest: "guest",
  visitor: "guest",
  drive: "drive",
  reset: "reset",
  brooklyn: "brooklyn",
  london: "london",
  austin: "austin",
  elevator: "elevator",
  contractor: "contractor",
  contractors: "contractor",
}

export type Ranked = { articleId: string; score: number }

export type MatchResult =
  | { type: "answer"; articleId: string; score: number }
  | { type: "clarify"; options: Ranked[] }
  | { type: "escalate" }
  | { type: "miss" }

export function normalize(raw: string) {
  return raw
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/[.\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(raw: string) {
  const parts = normalize(raw).split(" ").filter(Boolean)
  const out: string[] = []
  for (const part of parts) {
    if (STOP.has(part)) continue
    const mapped = SYNONYMS[part] ?? (part.endsWith("s") ? SYNONYMS[part.slice(0, -1)] : undefined) ?? part
    if (mapped.length < 2 || STOP.has(mapped)) continue
    out.push(mapped)
  }
  return [...new Set(out)]
}

function scoreArticle(query: string, article: Article) {
  const qNorm = normalize(query)
  const qTokens = tokenize(query)
  if (!qNorm || qTokens.length === 0) return 0

  const docRaw = [article.question, article.category, ...article.aliases].join(" \n ")
  const docTokens = tokenize(docRaw)
  const docSet = new Set(docTokens)
  let overlap = 0
  for (const token of qTokens) if (docSet.has(token)) overlap += 1

  const recall = overlap / qTokens.length
  const precision = overlap / Math.max(docTokens.length, 1)
  let score = recall * 0.78 + Math.min(precision, 0.45) * 0.15

  for (const alias of [article.question, ...article.aliases]) {
    const normalized = normalize(alias)
    if (!normalized) continue
    if (qNorm === normalized) score += 0.5
    else if (normalized.length >= 6 && qNorm.includes(normalized)) score += 0.32
    else if (qNorm.length >= 6 && normalized.includes(qNorm) && qTokens.length >= 2) score += 0.18
  }

  if (overlap === 0) return Math.min(score, 0.15)
  return score
}

function wantsPerson(query: string) {
  const text = normalize(query)
  const handoff = /(talk|speak|real|actual|transfer|escalate|human)/.test(text)
  const person = /(human|person|agent|someone|technician)/.test(text)
  return (handoff && person) || text.includes("open a ticket") || text.includes("open a request")
}

export function rankArticles(query: string, articles: Article[]) {
  return articles
    .map((article) => ({ articleId: article.id, score: scoreArticle(query, article) }))
    .sort((a, b) => b.score - a.score)
}

export function matchQuery(query: string, articles: Article[]): MatchResult {
  const trimmed = query.trim()
  if (!trimmed) return { type: "miss" }
  if (wantsPerson(trimmed)) return { type: "escalate" }

  const ranked = rankArticles(trimmed, articles)
  const best = ranked[0]
  const second = ranked[1]
  if (!best || best.score < 0.5) return { type: "miss" }

  const close = ranked.filter((hit) => hit.score >= 0.5 && best.score - hit.score < 0.14).slice(0, 3)
  if (close.length > 1 && second && second.score >= 0.5) {
    return { type: "clarify", options: close }
  }
  return { type: "answer", articleId: best.articleId, score: best.score }
}
