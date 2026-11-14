"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ChatPanel } from "@/components/chat-panel"

function AskScreen() {
  const params = useSearchParams()
  return (
    <div className="mx-auto max-w-3xl">
      <ChatPanel starter={params.get("q")} />
    </div>
  )
}

export default function AskPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening Keel…</p>}>
      <AskScreen />
    </Suspense>
  )
}
