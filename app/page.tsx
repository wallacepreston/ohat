"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours } from "@/types/salesforce"

// Define status types
type StatusType = 'success' | 'error' | 'warning' | 'info' | null
interface StatusState {
  type: StatusType
  message: string
  visible: boolean
}

export default function Home() {
  const [results, setResults] = useState<ProcessedOfficeHours[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<StatusState>({ 
    type: null, 
    message: '', 
    visible: false 
  })
  
  // Monitor loading state changes
  useEffect(() => {
    console.log('Loading state changed:', loading)
  }, [loading])

  // Handle status message display
  useEffect(() => {
    if (status.visible) {
      const timer = setTimeout(() => {
        setStatus(prev => ({ ...prev, visible: false }))
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [status.visible])

  // Helper to show different status messages
  const showStatus = (type: StatusType, message: string) => {
    setStatus({ type, message, visible: true })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const data = await processOfficeHours(formData)
      
      // Append new results instead of replacing
      setResults(prevResults => [...prevResults, ...(Array.isArray(data) ? data : [data])])
      
      // Check result status to determine what message to show
      if (data.length > 0 && data[0].status === "validated") {
        showStatus('success', 'Office hours data has been found and added.')
      } else if (data.length > 0 && data[0].status === "not found") {
        showStatus('warning', 'No office hours information could be found.')
      } else if (data.length > 0 && data[0].status === "error") {
        showStatus('error', 'Error processing office hours data.')
      } else {
        showStatus('info', 'Data was processed, but the status is unclear.')
      }
    } catch (error) {
      console.error("Error processing data:", error)
      showStatus('error', error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
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

      {/* Unified Toast notification */}
      <div className="fixed top-0 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div 
          className={`
            mt-4 px-6 py-3 rounded-lg shadow-lg
            flex items-center gap-2 transition-all duration-300 max-w-md
            ${status.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}
            ${status.type === 'success' ? 'bg-green-50 text-green-800' : ''}
            ${status.type === 'error' ? 'bg-red-50 text-red-800' : ''}
            ${status.type === 'warning' ? 'bg-yellow-50 text-yellow-800' : ''}
            ${status.type === 'info' ? 'bg-blue-50 text-blue-800' : ''}
          `}
        >
          {/* Icon based on status type */}
          {status.type === 'success' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {status.type === 'error' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {status.type === 'warning' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {status.type === 'info' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <div>
            <div className="font-medium">
              {status.type === 'success' && 'Success!'}
              {status.type === 'error' && 'Error'}
              {status.type === 'warning' && 'Warning'}
              {status.type === 'info' && 'Information'}
            </div>
            <div className="text-sm">{status.message}</div>
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-4">Campus Crawler AI</h1>
        <p className="text-muted-foreground">Find office hours for professors</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

