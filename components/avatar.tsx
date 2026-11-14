import { initials } from "@/lib/format"
import { cn } from "cn"

export function Avatar({
  name,
  hue,
  className,
}: {
  name: string
  hue: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-[#241c16]",
        className,
      )}
      style={{ background: `oklch(0.8 0.07 ${hue})` }}
    >
      {initials(name)}
    </span>
  )
}
