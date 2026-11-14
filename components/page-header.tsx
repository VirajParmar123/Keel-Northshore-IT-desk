import type { ReactNode } from "react"

export function PageHeader({
  kicker,
  title,
  lede,
  action,
}: {
  kicker?: string
  title: string
  lede?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker ? (
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{kicker}</p>
        ) : null}
        <h1 className="font-heading text-3xl tracking-tight text-balance md:text-4xl">{title}</h1>
        {lede ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{lede}</p> : null}
      </div>
      {action}
    </div>
  )
}
