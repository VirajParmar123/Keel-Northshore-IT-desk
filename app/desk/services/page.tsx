"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatWhen } from "@/lib/format"
import { useDesk } from "@/lib/store"
import { isStaff, type Service, type ServiceStatus } from "@/lib/types"
import { cn } from "cn"

const TONE: Record<ServiceStatus, string> = {
  operational: "bg-emerald-100 text-emerald-950",
  degraded: "bg-amber-100 text-amber-950",
  outage: "bg-red-100 text-red-900",
}

const LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Down",
}

export default function ServicesPage() {
  const { state, user, now, setService } = useDesk()
  const [editing, setEditing] = useState<Service | null>(null)
  const [status, setStatus] = useState<ServiceStatus>("operational")
  const [note, setNote] = useState("")
  if (!state || !user) return null
  const staff = isStaff(user.role)

  function open(service: Service) {
    setEditing(service)
    setStatus(service.status)
    setNote(service.note)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="Service health"
        title="What's up across the studios"
        lede="This is the board on the Brooklyn kitchen wall. If Wi-Fi or Okta is off, say so here before the queue fills with the same question."
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {state.services.map((service) => (
          <li key={service.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-2xl leading-none">{service.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{service.detail}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TONE[service.status])}>{LABEL[service.status]}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{service.note}</p>
            <p className="mt-3 text-xs text-muted-foreground">Updated {formatWhen(service.updatedAt, now)}</p>
            {staff ? (
              <Button className="mt-3" size="sm" variant="outline" onClick={() => open(service)}>
                Update
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <form
            className="w-full max-w-md rounded-2xl bg-popover p-5 shadow-lg"
            onSubmit={(event) => {
              event.preventDefault()
              setService(editing.id, status, note)
              toast.success(`${editing.name} updated`)
              setEditing(null)
            }}
          >
            <p className="font-heading text-2xl">Update {editing.name}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(LABEL) as ServiceStatus[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={cn("rounded-full px-3 py-1 text-xs", status === item ? TONE[item] : "bg-muted")}
                >
                  {LABEL[item]}
                </button>
              ))}
            </div>
            <Textarea className="mt-3 min-h-24" value={note} onChange={(event) => setNote(event.target.value)} aria-label="Status note" />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Post update</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
