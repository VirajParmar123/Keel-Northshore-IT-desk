import { Suspense } from "react"
import { BootScreen } from "@/components/boot-screen"
import { DeskShell } from "@/components/desk-shell"

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<BootScreen />}>
      <DeskShell>{children}</DeskShell>
    </Suspense>
  )
}
