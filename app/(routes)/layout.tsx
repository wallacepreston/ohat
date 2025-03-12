"use client"

import TabNavigation from "@/app/components/TabNavigation"

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="container mx-auto py-10 space-y-6 relative">
      <div>
        <h1 className="text-3xl font-bold mb-4">Campus Crawler AI</h1>
        <p className="text-muted-foreground">Find office hours for professors</p>
      </div>
      
      <TabNavigation />
      
      {children}
    </main>
  )
} 