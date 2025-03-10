"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours } from "@/types/salesforce"
import { OfficeHoursStatus, formatStatus } from "@/types/salesforce"
import { useStatus } from "./context/StatusContext"
import { useLoading } from "./context/LoadingContext"

export default function Home() {
  const [results, setResults] = useState<ProcessedOfficeHours[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addStatusMessage, clearStatusMessages } = useStatus()
  const { isLoading, setLoading, setLoadingMessage } = useLoading()
  
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
    setLoadingMessage("Searching for data...")
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
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Process Data"}
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

