"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours } from "@/types/salesforce"
import { OfficeHoursStatus } from "@/types/salesforce"
import { useStatus } from "@/app/context/StatusContext"
import { useLoading } from "@/app/context/LoadingContext"
import ResultsTable from "@/app/components/ResultsTable"

export default function UploadPage() {
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

  // Function to clear results
  const clearResults = () => {
    setResults([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setLoadingMessage("Processing photo and data...")
    clearStatusMessages() // Clear previous status messages
    
    try {
      const formData = new FormData(e.currentTarget)
      
      // Validate the JSON data
      const jsonData = formData.get("salesforceData") as string
      let parsedData
      
      try {
        parsedData = JSON.parse(jsonData)
        
        // Ensure the data is a single object, not an array
        if (Array.isArray(parsedData)) {
          addStatusMessage('error', 'Please enter a single instructor object, not an array')
          setLoading(false)
          return
        }
      } catch (error) {
        addStatusMessage('error', 'Invalid JSON data format')
        setLoading(false)
        return
      }
      
      // Add photo to formData if one is selected
      if (photoFile) {
        formData.append("photo", photoFile)
      } else {
        addStatusMessage('warning', 'No photo selected. Processing with text data only.')
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
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="photo-upload">Office Hours Photo</Label>
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
            Upload a photo of office hours to analyze. This should be a photo of a syllabus, door, or website.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="salesforce-data">Instructor Data (Single JSON Object)</Label>
          <Textarea
            id="salesforce-data"
            name="salesforceData"
            placeholder="Paste single instructor JSON data here..."
            className="min-h-[200px] font-mono text-sm"
            required
          />
          <p className="text-sm text-muted-foreground">
            Enter a single instructor JSON object with at minimum the fields "Account_Name__c" (institution) and 
            either "School_Course_Name__c" or "Division" (course).
          </p>
        </div>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Process Photo and Data"}
        </Button>
      </form>

      <ResultsTable 
        results={results}
        onClearResults={clearResults}
      />
    </div>
  )
} 