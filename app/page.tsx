"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Anchor } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { BootScreen } from "@/components/boot-screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deskParts } from "@/lib/format"
import { DESK_CODE } from "@/lib/seed"
import { useDesk } from "@/lib/store"
import type { Role } from "@/lib/types"

const ROLE_COPY: Record<Role, string> = {
  employee: "Employee",
  agent: "IT support",
  admin: "IT manager",
}

export default function SignInPage() {
  const { ready, state, user, signIn, now } = useDesk()
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const when = now > 0 ? deskParts(new Date(now)) : null

  useEffect(() => {
    if (ready && user) router.replace("/desk")
  }, [ready, router, user])

  if (!ready || !state) return <BootScreen />

  function enter(id: string) {
    if (code.trim().toLowerCase() !== DESK_CODE) {
      setError("That isn't the desk code. It's printed under the field.")
      return
    }
    signIn(id)
    router.push("/desk")
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between bg-[#241c16] px-6 py-8 text-[#f6efe6] md:px-12 md:py-12">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#c4522a] text-white">
            <Anchor className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl leading-none">Keel</p>
            <p className="text-xs text-[#d7cdc2]">Northshore IT desk</p>
          </div>
        </div>
        <div className="max-w-xl py-12">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#e7b39a] uppercase">{when?.label ?? "Northshore desk"}</p>
          <h1 className="font-heading mt-3 text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl">
            The desk is open.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#e6dbd0]">
            Ask the answer library first. Keel only repeats what IT has written down. If it doesn&apos;t have the answer, the request lands with the person on shift.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat label="Open requests" value={String(state.tickets.filter((ticket) => ticket.status !== "resolved" && ticket.status !== "closed").length)} />
            <Stat label="Stored answers" value={String(state.articles.length)} />
            <Stat label="On shift" value={when?.weekend ? "Jordan" : "Jordan & Riley"} />
          </div>
          {when?.weekend ? (
            <p className="mt-6 max-w-md rounded-2xl bg-white/5 px-4 py-3 text-sm text-[#f0e6dc]">
              Weekend coverage. Jordan Hale is on call for anything that blocks a client. Everything else waits until Monday.
            </p>
          ) : null}
        </div>
        <p className="text-xs text-[#cbbfae]">Brooklyn · Austin · London · Demo data stays in this browser.</p>
      </section>
      <section className="flex flex-col justify-center px-6 py-10 md:px-12">
        <div className="mx-auto w-full max-w-md">
          <h2 className="font-heading text-3xl tracking-tight">Sign in to the desk</h2>
          <p className="mt-2 text-sm text-muted-foreground">Pick the person you&apos;re sitting in as. The code is the same for everyone in this demo.</p>
          <div className="mt-6 grid gap-1.5">
            <Label htmlFor="desk-code">Desk code</Label>
            <Input
              id="desk-code"
              value={code}
              autoComplete="off"
              onChange={(event) => {
                setCode(event.target.value)
                setError("")
              }}
              placeholder="northshore"
              aria-invalid={Boolean(error)}
            />
            <p className="text-xs text-muted-foreground">Use desk code northshore.</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="mt-6 space-y-5">
            {(["employee", "agent", "admin"] as Role[]).map((role) => (
              <div key={role}>
                <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{ROLE_COPY[role]}</p>
                <div className="grid gap-2">
                  {state.people
                    .filter((person) => person.role === role)
                    .map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => enter(person.id)}
                        className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted"
                      >
                        <Avatar name={person.name} hue={person.hue} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{person.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {person.title} · {person.office}
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            onClick={() => {
              setCode(DESK_CODE)
              setError("")
            }}
          >
            Fill the desk code
          </Button>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-3">
      <p className="font-heading text-2xl">{value}</p>
      <p className="text-xs text-[#d7cdc2]">{label}</p>
    </div>
  )
}
