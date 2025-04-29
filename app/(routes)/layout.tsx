"use client"

import TabNavigation from "@/app/components/TabNavigation"
import Header from "@/app/components/Header"

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-6 relative max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Office Hours Automation Tool (OHAT)</h1>
          <p className="text-muted-foreground">Find office hours for professors</p>
        </div>
        
        <TabNavigation />
        
        <div className="mt-4">
          {children}
        </div>
      </main>
    </>
  )
} 