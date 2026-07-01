"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"
import MainArea from "@/components/MainArea"
import HomePage from "@/components/HomePage"
import { useNotes } from "@/contexts/NoteContext"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const { activeNoteId } = useNotes()

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  if (status !== "authenticated") {
    return null
  }

  return (
    <SidebarProvider>
      <NotesSidebar />
      <SidebarInset className="overflow-hidden">
        <AppHeader />
        {activeNoteId ? <MainArea /> : <HomePage />}
      </SidebarInset>
    </SidebarProvider>
  )
}
