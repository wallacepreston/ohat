"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours } from "@/types/salesforce"

export default function Home() {
  const [results, setResults] = useState<ProcessedOfficeHours[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Monitor loading state changes
  useEffect(() => {
    console.log('Loading state changed:', loading)
  }, [loading])

  // Handle success message display
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  async function handleSubmit(formData: FormData) {
    console.log('Setting loading to true')
    setLoading(true)
    try {
      const data = await processOfficeHours(formData)
      // Append new results instead of replacing
      setResults(prevResults => [...prevResults, ...(Array.isArray(data) ? data : [data])])
      setShowSuccess(true)
    } catch (error) {
      console.error("Error processing data:", error)
    }
    console.log('Setting loading to false')
    setLoading(false)
  }

  return (
    <main className="container mx-auto py-10 space-y-8 relative">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white text-lg font-medium">Searching for data...</p>
        </div>
      )}

      {/* Toast notification */}
      <div className="fixed top-0 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div 
          className={`
            mt-4 bg-green-50 text-green-800 px-6 py-3 rounded-lg shadow-lg
            flex items-center gap-2 transition-all duration-300 max-w-md
            ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}
          `}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-medium">Success!</div>
            <div className="text-sm">Office hours data has been found and added.</div>
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-4">Campus Crawler AI</h1>
        <p className="text-muted-foreground">Find office hours for professors</p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="salesforce-data">Salesforce Data</Label>
          <Textarea
            id="salesforce-data"
            name="salesforceData"
            placeholder="Paste Salesforce JSON data here..."
            className="min-h-[200px] font-mono text-sm"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Process Data"}
        </Button>
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Results</h2>
          {results.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setResults([])}
            >
              Clear Results
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instructor</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div>
                    <div>{result.instructor}</div>
                    <div className="text-sm text-muted-foreground">{result.email}</div>
                  </div>
                </TableCell>
                <TableCell>{result.institution}</TableCell>
                <TableCell>{result.course}</TableCell>
                <TableCell>{result.term}</TableCell>
                <TableCell>{result.days.join(", ")}</TableCell>
                <TableCell>{result.times}</TableCell>
                <TableCell>{result.location}</TableCell>
                <TableCell>
                  <span
                    className={
                      result.status === "validated"
                        ? "text-green-600"
                        : result.status === "not found"
                          ? "text-yellow-600"
                          : "text-red-600"
                    }
                  >
                    {result.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}

