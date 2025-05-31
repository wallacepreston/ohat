"use client"

import { useState, useRef, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BatchResponse, BatchRequest, BatchRequestInstructor, TimeSlot } from "@/types/salesforce"
import { useStatus } from "@/app/context/StatusContext"
import { useLoading } from "@/app/context/LoadingContext"
import ResultsTable from "@/app/components/ResultsTable"
import { processBatchOfficeHours, processPhotoUpload } from "@/app/lib/api-client"
import { convertToTimeSlots } from "@/app/utils/timeUtils"

export default function UploadPage() {
  const [results, setResults] = useState<BatchResponse['results']>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [institution, setInstitution] = useState<string>("")
  const [instructorName, setInstructorName] = useState<string>("")
  const [contactId, setContactId] = useState<string>("")
  const [photoInputDirty, setPhotoInputDirty] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addStatusMessage, clearStatusMessages } = useStatus()
  const { isLoading, setLoading, setLoadingMessage } = useLoading()
  
  // Add this function to handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoInputDirty(true)
    if (e.target.files && e.target.files.length > 0) {
      setPhotoFile(e.target.files[0])
    }
  }
  
  // Function to clear the selected photo
  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoInputDirty(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Function to clear results
  const clearResults = () => {
    setResults([]);
  }

  // Function to mark photo input as dirty when user clicks to select a file
  const handlePhotoButtonClick = () => {
    setPhotoInputDirty(true)
    fileInputRef.current?.click()
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPhotoInputDirty(true)
    setLoading(true)
    setLoadingMessage("Processing photo and data...")
    clearStatusMessages()
    
    if (!photoFile) {
      addStatusMessage('error', 'A photo is required for analysis')
      setLoading(false)
      return
    }
    
    try {
      const batchId = `batch-${Date.now()}`
      const batchRequest: BatchRequest = {
        batchId,
        accountId: institution.trim(),
        institution: institution.trim(),
        instructors: [{
          contactId: contactId.trim() || `contact-${Date.now()}`,
          name: instructorName.trim(),
          email: "",
          department: ""
        }] as [BatchRequestInstructor, ...BatchRequestInstructor[]]
      }
      
      let data: BatchResponse['results'] = []
      
      try {
        if (photoFile) {
          const photoResults = await processPhotoUpload(batchRequest, photoFile)
          console.log('photoResults:', photoResults)
          
          // Use the results directly from the photo upload
          data = photoResults as unknown as BatchResponse['results']
        } else {
          const batchResponse = await processBatchOfficeHours(batchRequest)
          data = batchResponse.results
        }
      } catch (error) {
        console.warn("API failed:", error)
        addStatusMessage('error', 'Failed to process photo. Please try again.')
        setLoading(false)
        return
      }
      
      // Update the results
      setResults(data)
      
      // Display status messages based on the data
      displayStatusMessages(data)
    } catch (error) {
      console.error("Error processing data:", error)
      addStatusMessage('error', error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to display status messages based on the provided data
  const displayStatusMessages = (data: BatchResponse['results']) => {
    if (data.length === 0) {
      addStatusMessage('warning', 'No results were returned')
      return
    }
    
    const successCount = data.filter(item => item.status === "SUCCESS").length
    const partialCount = data.filter(item => item.status === "PARTIAL_SUCCESS").length
    const notFoundCount = data.filter(item => item.status === "NOT_FOUND").length
    
    if (successCount > 0) {
      addStatusMessage('success', `Found information for ${successCount} instructor(s)`)
    }
    
    if (partialCount > 0) {
      addStatusMessage('info', `Found partial information for ${partialCount} instructor(s)`)
    }
    
    if (notFoundCount > 0) {
      addStatusMessage('warning', `Could not find information for ${notFoundCount} instructor(s)`)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="photo-upload" className="flex items-center text-base">
            Office Hours Photo
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              id="photo-upload"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              required
            />
            <Button 
              type="button" 
              variant={photoFile ? "outline" : "default"}
              onClick={handlePhotoButtonClick}
              className="min-w-32"
            >
              {photoFile ? "Change Photo" : "Select Photo"}
            </Button>
            
            {photoFile && (
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm text-muted-foreground break-all">
                  {photoFile.name} ({Math.round(photoFile.size / 1024)} KB)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearPhoto}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload a photo of office hours to analyze. This should be a photo of a syllabus, door, or website.
          </p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="contact-id" className="flex items-center text-base">
              Contact ID
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="contact-id"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder="Enter Salesforce contact ID"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Salesforce Contact ID for this instructor if available
            </p>
          </div>
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading || !photoFile || !contactId}
          className="w-full mt-4"
        >
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