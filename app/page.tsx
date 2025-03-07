"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours } from "@/types/salesforce"
import { OfficeHoursStatus, formatStatus } from "@/types/salesforce"

// Define status types
type StatusType = 'success' | 'error' | 'warning' | 'info' | null
interface StatusMessage {
  type: StatusType
  message: string
  id: number // Add an ID to uniquely identify each status message
}

export default function Home() {
  const [results, setResults] = useState<ProcessedOfficeHours[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [nextStatusId, setNextStatusId] = useState(1) // For generating unique IDs
  
  // Monitor loading state changes
  useEffect(() => {
    console.log('Loading state changed:', loading)
  }, [loading])

  // Add a new status message
  const addStatusMessage = (type: StatusType, message: string) => {
    const newMessage = { type, message, id: nextStatusId }
    setStatusMessages(prev => [...prev, newMessage])
    setNextStatusId(prev => prev + 1)
    
    // Remove this message after timeout
    setTimeout(() => {
      setStatusMessages(prev => prev.filter(msg => msg.id !== newMessage.id))
    }, 5000)
  }
  
  // Clear all status messages
  const clearStatusMessages = () => {
    setStatusMessages([])
  }

  // Add this function to handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoFile(e.target.files[0])
    }
  }
  
  // Function to clear the selected photo
  const clearPhoto = () => {
    setPhotoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    clearStatusMessages() // Clear previous status messages
    
    try {
      const formData = new FormData(e.currentTarget)
      
      // Add photo to formData if one is selected
      if (photoFile) {
        formData.append("photo", photoFile)
        
        // Validate the JSON data if photo is present
        const jsonData = formData.get("salesforceData") as string
        let parsedData
        
        try {
          parsedData = JSON.parse(jsonData)
        } catch (error) {
          addStatusMessage('error', 'Invalid JSON data format')
          setLoading(false)
          return
        }
        
        // Ensure we only have one instructor when using photo
        if (Array.isArray(parsedData) && parsedData.length > 1) {
          addStatusMessage('error', 'Only one instructor allowed when uploading a photo')
          setLoading(false)
          return
        }
      }
      
      const data = await processOfficeHours(formData)
      
      // Data is guaranteed to be an array now
      setResults(prevResults => [...prevResults, ...data])
      
      // Calculate counts for each status type
      const validatedCount = data.filter(item => item.status === OfficeHoursStatus.VALIDATED).length
      const foundCount = data.filter(item => item.status === OfficeHoursStatus.FOUND).length
      const partialCount = data.filter(item => item.status === OfficeHoursStatus.PARTIAL_INFO_FOUND).length
      const notFoundCount = data.filter(item => item.status === OfficeHoursStatus.NOT_FOUND).length
      const errorCount = data.filter(item => item.status === OfficeHoursStatus.ERROR).length
      
      if (data.length === 0) {
        addStatusMessage('warning', 'No results were returned')
      } else {
        // Add a message for each status type with results
        if (validatedCount > 0) {
          addStatusMessage('success', `Validated ${validatedCount} instructor(s)`)
        }
        
        if (foundCount > 0) {
          addStatusMessage('success', `Found information for ${foundCount} instructor(s)`)
        }
        
        if (partialCount > 0) {
          addStatusMessage('info', `Found partial information for ${partialCount} instructor(s)`)
        }
        
        if (notFoundCount > 0) {
          addStatusMessage('warning', `Could not find information for ${notFoundCount} instructor(s)`)
        }
        
        if (errorCount > 0) {
          addStatusMessage('error', `Error processing ${errorCount} instructor(s)`)
        }
      }
    } catch (error) {
      console.error("Error processing data:", error)
      addStatusMessage('error', error instanceof Error ? error.message : 'An unexpected error occurred')
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

      {/* Status messages container */}
      <div className="fixed top-0 left-0 right-0 flex flex-col items-center pointer-events-none z-50">
        {statusMessages.map((statusMsg, index) => (
          <div 
            key={statusMsg.id}
            className={`
              mt-4 px-6 py-3 rounded-lg shadow-lg
              flex items-center gap-2 transition-all duration-300 max-w-md
              ${statusMsg.type === 'success' ? 'bg-green-50 text-green-800' : ''}
              ${statusMsg.type === 'error' ? 'bg-red-50 text-red-800' : ''}
              ${statusMsg.type === 'warning' ? 'bg-yellow-50 text-yellow-800' : ''}
              ${statusMsg.type === 'info' ? 'bg-blue-50 text-blue-800' : ''}
            `}
            style={{ 
              marginTop: `${index * 5 + 16}px`,  // Stack messages with spacing
              zIndex: 100 - index               // Ensure proper layering
            }}
          >
            {/* Icon based on status type */}
            {statusMsg.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {statusMsg.type === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {statusMsg.type === 'warning' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {statusMsg.type === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <div>
              <div className="font-medium">
                {statusMsg.type === 'success' && 'Success'}
                {statusMsg.type === 'error' && 'Error'}
                {statusMsg.type === 'warning' && 'Warning'}
                {statusMsg.type === 'info' && 'Information'}
              </div>
              <div className="text-sm">{statusMsg.message}</div>
            </div>
          </div>
        ))}
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
        
        {/* Photo upload section */}
        <div className="space-y-2">
          <Label htmlFor="photo-upload">Office Hours Photo (Optional)</Label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              id="photo-upload"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <Button 
              type="button" 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Photo
            </Button>
            
            {photoFile && (
              <>
                <span className="text-sm text-muted-foreground">
                  {photoFile.name} ({Math.round(photoFile.size / 1024)} KB)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearPhoto}
                  className="h-8 w-8 p-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload a photo of office hours to analyze. When uploading a photo, only one instructor record is allowed.
          </p>
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
              <TableHead>Office Hours</TableHead>
              <TableHead>Office Location</TableHead>
              <TableHead>Teaching Hours</TableHead>
              <TableHead>Teaching Location</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div>
                    <div>{result.instructor}</div>
                    {result.email && <div className="text-sm text-muted-foreground">{result.email}</div>}
                  </div>
                </TableCell>
                <TableCell>{result.institution}</TableCell>
                <TableCell>{result.course}</TableCell>
                <TableCell>{result.term}</TableCell>
                <TableCell>{result.days.join(", ")}</TableCell>
                <TableCell>{result.times}</TableCell>
                <TableCell>{result.location}</TableCell>
                <TableCell>{result.teachingHours}</TableCell>
                <TableCell>{result.teachingLocation}</TableCell>
                <TableCell>
                  <span
                    className={
                      result.status === OfficeHoursStatus.VALIDATED
                        ? "text-green-600 font-bold"
                        : result.status === OfficeHoursStatus.FOUND
                          ? "text-green-600"
                          : result.status === OfficeHoursStatus.NOT_FOUND
                            ? "text-yellow-600"
                            : result.status === OfficeHoursStatus.PARTIAL_INFO_FOUND
                              ? "text-blue-600"
                              : "text-red-600"
                    }
                  >
                    {formatStatus(result.status)}
                    {result.validatedBy && (
                      <span className="ml-1 text-xs">✓</span>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                  No results found. Submit data to search for office hours.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}

