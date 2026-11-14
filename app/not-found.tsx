import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="font-heading text-4xl">That page isn&apos;t on the desk</p>
        <p className="mt-3 text-sm text-muted-foreground">The link may be old, or the request was cleared with the demo data.</p>
        <Button className="mt-5" render={<Link href="/desk" />}>
          Back to today
        </Button>
      </div>
    </div>
  )
}
