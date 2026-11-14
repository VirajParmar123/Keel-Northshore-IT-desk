import type { Metadata } from "next"
import { Fraunces, Source_Sans_3 } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DeskProvider } from "@/lib/store"
import "./globals.css"

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  weight: ["400", "500", "600", "700"],
})

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Keel — Northshore IT Help Desk",
  description:
    "Northshore's IT desk. Ask the offline answer library, open a request when it doesn't know, and work the queue.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <DeskProvider>
            {children}
            <Toaster position="top-center" />
          </DeskProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
