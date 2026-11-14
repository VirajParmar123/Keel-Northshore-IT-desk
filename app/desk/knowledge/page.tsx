"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArticleDialog } from "@/components/article-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatWhen } from "@/lib/format"
import { useDesk } from "@/lib/store"
import { CATEGORIES, isStaff, type Article } from "@/lib/types"

function KnowledgeScreen() {
  const params = useSearchParams()
  const { state, user, now, deleteArticle } = useDesk()
  const [query, setQuery] = useState(params.get("q") ?? "")
  const [category, setCategory] = useState<string>("All")
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Article | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const articles = useMemo(() => {
    if (!state) return []
    const needle = query.trim().toLowerCase()
    return state.articles.filter((article) => {
      if (category !== "All" && article.category !== category) return false
      if (!needle) return true
      return `${article.question} ${article.answer} ${article.aliases.join(" ")}`.toLowerCase().includes(needle)
    })
  }, [category, query, state])

  if (!state || !user) return null
  const staff = isStaff(user.role)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="Answer library"
        title="What Keel is allowed to say"
        lede="Every reply in chat is one of these. IT can add a question, the other ways people ask it, and the exact answer."
        action={
          staff ? (
            <Button
              onClick={() => {
                setEditing(null)
                setCreating(true)
              }}
            >
              Add an answer
            </Button>
          ) : null
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions and steps"
          aria-label="Search stored answers"
        />
        <div className="flex flex-wrap gap-2">
          {["All", ...CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-3 py-1 text-xs ${category === item ? "bg-[#241c16] text-[#f6efe6]" : "bg-card text-foreground ring-1 ring-border"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <p className="font-heading text-2xl">No stored answer for that</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {staff ? "Add one and Keel can use it immediately." : "Ask Keel anyway. If it misses, the question shows up for IT."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {articles.map((article) => {
            const owner = state.people.find((person) => person.id === article.ownerId)
            const expanded = openId === article.id
            return (
              <li key={article.id} className="rounded-2xl border bg-card p-4">
                <button type="button" className="w-full text-left" onClick={() => setOpenId(expanded ? null : article.id)}>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{article.category}</p>
                  <p className="font-heading mt-1 text-xl leading-snug">{article.question}</p>
                </button>
                {expanded ? (
                  <div className="mt-3">
                    <p className="text-sm leading-relaxed">{article.answer}</p>
                    {article.steps.length > 0 ? (
                      <ol className="mt-3 space-y-1.5 text-sm">
                        {article.steps.map((step, index) => (
                          <li key={step}>
                            {index + 1}. {step}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {article.aliases.length > 0 ? (
                      <p className="mt-3 text-xs text-muted-foreground">Also matches: {article.aliases.join(", ")}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Updated {formatWhen(article.updatedAt, now)} by {owner?.name ?? "IT"} · {article.helpful} fixed it
                    </p>
                    {staff ? (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(article)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(article.id)}>
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.answer}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ArticleDialog
        key={creating ? "new" : (editing?.id ?? "closed")}
        open={creating || Boolean(editing)}
        onOpenChange={(next) => {
          if (!next) {
            setCreating(false)
            setEditing(null)
          }
        }}
        initial={editing}
      />

      {confirmId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-popover p-5 shadow-lg">
            <p className="font-heading text-xl">Remove this answer?</p>
            <p className="mt-2 text-sm text-muted-foreground">Keel will miss the question until someone writes it again.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmId(null)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteArticle(confirmId)
                  setConfirmId(null)
                  setOpenId(null)
                  toast.success("Removed from the library")
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening the library…</p>}>
      <KnowledgeScreen />
    </Suspense>
  )
}
