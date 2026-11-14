"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  Anchor,
  Bell,
  BookOpen,
  Inbox,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Users,
} from "lucide-react"
import { BootScreen } from "@/components/boot-screen"
import { Avatar } from "@/components/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { deskParts, formatWhen } from "@/lib/format"
import { useDesk } from "@/lib/store"
import { isStaff, type Role } from "@/lib/types"
import { cn } from "cn"

const LINKS: { href: string; label: string; staffLabel?: string; icon: typeof Inbox }[] = [
  { href: "/desk", label: "Today", icon: LayoutDashboard },
  { href: "/desk/ask", label: "Ask Keel", icon: BookOpen },
  { href: "/desk/tickets", label: "Requests", staffLabel: "Queue", icon: Inbox },
  { href: "/desk/knowledge", label: "Answers", icon: BookOpen },
  { href: "/desk/services", label: "Service health", icon: Activity },
  { href: "/desk/insights", label: "Insights", icon: LayoutDashboard },
  { href: "/desk/people", label: "IT contacts", staffLabel: "People", icon: Users },
]

function navItems(role: Role) {
  return LINKS.filter((item) => item.href !== "/desk/insights" || isStaff(role)).map((item) => ({
    ...item,
    label: isStaff(role) && item.staffLabel ? item.staffLabel : item.label,
  }))
}

export function DeskShell({ children }: { children: React.ReactNode }) {
  const { ready, user, state, signIn, signOut, resetDemo, markNoticeRead, markAllNoticesRead } = useDesk()
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState("")
  const [navOpen, setNavOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    if (ready && !user) router.replace("/")
  }, [ready, router, user])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault()
        document.getElementById("desk-search")?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!ready || !user || !state) {
    return (
      <>
        <BootScreen />
        <div hidden>{children}</div>
      </>
    )
  }

  const items = navItems(user.role)
  const notices = state.notices.filter((notice) => notice.userId === user.id)
  const unread = notices.filter((notice) => !notice.read).length
  const when = deskParts()

  function search(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(`/desk/knowledge?q=${encodeURIComponent(trimmed)}`)
  }

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/desk" className="flex items-center gap-3 px-5 pt-6 pb-5" onClick={() => setNavOpen(false)}>
        <span className="grid size-10 place-items-center rounded-2xl bg-[#c4522a] text-white">
          <Anchor className="size-5" />
        </span>
        <span>
          <span className="font-heading block text-2xl leading-none">Keel</span>
          <span className="text-xs text-[#d7cdc2]">Northshore IT</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => {
          const active = item.href === "/desk" ? pathname === "/desk" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setNavOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                active ? "bg-white/10 text-white" : "text-[#eadfd4] hover:bg-white/5",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4">
        <Button
          className="w-full bg-[#c4522a] text-white hover:bg-[#a84322]"
          onClick={() => {
            setNavOpen(false)
            router.push("/desk/tickets/new")
          }}
        >
          <Plus />
          New request
        </Button>
        <p className="mt-3 text-[11px] leading-relaxed text-[#cbbfae]">
          The bot only repeats answers IT has saved. Nothing is sent to an outside model.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen bg-[#241c16] text-[#f6efe6] md:block">{nav}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <form onSubmit={search} className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="desk-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search answers"
              aria-label="Search the answer library"
              className="h-9 pl-8"
            />
          </form>
          <p className="hidden text-xs text-muted-foreground lg:block">{when.label}</p>
          <div className="relative">
            <Button variant="ghost" size="icon" aria-label={`Notices, ${unread} unread`} onClick={() => setBellOpen((open) => !open)}>
              <Bell />
              {unread > 0 ? (
                <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-[#c4522a] text-[10px] text-white">
                  {unread}
                </span>
              ) : null}
            </Button>
            {bellOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border bg-popover p-2 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-sm font-semibold">Notices</p>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={markAllNoticesRead}>
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {notices.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">Quiet for now.</p>
                  ) : (
                    notices.slice(0, 12).map((notice) => (
                      <button
                        key={notice.id}
                        type="button"
                        className={cn(
                          "block w-full rounded-xl px-2 py-2 text-left text-sm hover:bg-muted",
                          !notice.read && "bg-[#fbf4ef]",
                        )}
                        onClick={() => {
                          markNoticeRead(notice.id)
                          setBellOpen(false)
                          router.push(notice.href)
                        }}
                      >
                        <span className="block leading-snug">{notice.text}</span>
                        <span className="text-[11px] text-muted-foreground">{formatWhen(notice.at)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-muted"
              onClick={() => setAccountOpen((open) => !open)}
              aria-label="Account menu"
            >
              <Avatar name={user.name} hue={user.hue} />
              <span className="hidden text-left sm:block">
                <span className="block text-sm leading-tight font-medium">{user.name}</span>
                <span className="block text-[11px] text-muted-foreground">{user.office}</span>
              </span>
            </button>
            {accountOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border bg-popover p-2 shadow-lg">
                <p className="px-2 py-1 text-xs text-muted-foreground">Switch desk</p>
                {state.people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      signIn(person.id)
                      setAccountOpen(false)
                    }}
                  >
                    <Avatar name={person.name} hue={person.hue} className="size-6 text-[10px]" />
                    <span>
                      <span className="block leading-tight">{person.name}</span>
                      <span className="text-[11px] text-muted-foreground">{person.title}</span>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="mt-1 w-full rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    resetDemo()
                    setAccountOpen(false)
                  }}
                >
                  Reset demo data
                </button>
                <button
                  type="button"
                  className="w-full rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    signOut()
                    setAccountOpen(false)
                    router.push("/")
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-[#241c16] p-0 text-[#f6efe6] sm:max-w-xs">
          <SheetTitle className="sr-only">Desk menu</SheetTitle>
          {nav}
        </SheetContent>
      </Sheet>
    </div>
  )
}
