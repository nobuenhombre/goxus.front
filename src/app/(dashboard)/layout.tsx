"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full">
      <div className="w-16 border-r bg-sidebar md:w-64">
        <div className="p-4">
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b px-4 py-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <main className="flex-1 p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  // Auth guard: redirect unauthenticated users to /login.
  // Rendering a skeleton rather than `null` avoids hydration mismatches.
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
    } else {
      setAuthed(true)
    }
  }, [router])

  if (!authed) {
    return <DashboardSkeleton />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex flex-1 flex-col px-4 py-6 @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
