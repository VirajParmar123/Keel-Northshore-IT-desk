"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { useDesk } from "@/lib/store"
import { CATEGORIES, type Article, type Category } from "@/lib/types"

export function ArticleDialog({
  open,
  onOpenChange,
  initial,
  missId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Partial<Article> | null
  missId?: string | null
}) {
  const { saveArticle, linkMiss } = useDesk()
  const [question, setQuestion] = useState(initial?.question ?? "")
  const [aliases, setAliases] = useState(initial?.aliases?.join(", ") ?? "")
  const [answer, setAnswer] = useState(initial?.answer ?? "")
  const [steps, setSteps] = useState(initial?.steps?.join("\n") ?? "")
  const [category, setCategory] = useState<Category>(initial?.category ?? "Access")
  const [error, setError] = useState("")

  function save() {
    if (!question.trim() || !answer.trim()) {
      setError("A stored answer needs the question someone will ask, and the reply Keel should give.")
      return
    }
    const id = saveArticle({
      id: initial?.id,
      question,
      aliases: aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
      answer,
      steps: steps.split("\n"),
      category,
    })
    if (!id) {
      setError("Keel couldn't save that. Sign in as IT and try again.")
      return
    }
    if (missId) linkMiss(missId, id)
    toast.success(initial?.id ? "Answer updated. Keel will use it on the next question." : "Answer added to the library.")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{initial?.id ? "Edit stored answer" : "Add a stored answer"}</DialogTitle>
          <DialogDescription>
            Keel repeats this reply when a question matches. It does not rewrite it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="kb-question">Question people ask</Label>
            <Input id="kb-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="GlobalProtect drops after the laptop wakes" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kb-aliases">Other ways to ask it</Label>
            <Input id="kb-aliases" value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="vpn, vpn drops, globalprotect" />
          </div>
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
            <Label htmlFor="kb-answer">Answer Keel should give</Label>
            <Textarea id="kb-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-24" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kb-steps">Steps, one per line</Label>
            <Textarea id="kb-steps" value={steps} onChange={(event) => setSteps(event.target.value)} className="min-h-24" placeholder={"Open GlobalProtect\nRefresh the connection"} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save to the library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
