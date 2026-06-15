"use client"

import { ThemeProvider } from "next-themes"
import { NoteProvider } from "@/contexts/NoteContext"
import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <NoteProvider>
          {children}
        </NoteProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
