"use client"

import { usePathname, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function TabNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  
  const isActive = (path: string) => pathname === path
  
  const handleTabChange = (value: string) => {
    router.push(value)
  }
  
  return (
    <div className="mb-8">
      <Tabs 
        defaultValue={pathname === "/upload" ? "/upload" : "/search"} 
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-2">
          <TabsTrigger value="/search" className={isActive("/search") ? "font-bold" : ""}>
            Search
          </TabsTrigger>
          <TabsTrigger value="/upload" className={isActive("/upload") ? "font-bold" : ""}>
            Upload Photo
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
} 