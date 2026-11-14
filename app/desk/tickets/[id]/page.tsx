"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"
import { TicketDetail } from "@/components/ticket-detail"

function TicketScreen() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  if (!id) return <p className="text-sm text-muted-foreground">Missing request number.</p>
  return <TicketDetail ticketId={id} />
}

export default function TicketPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening the request…</p>}>
      <TicketScreen />
    </Suspense>
  )
}
