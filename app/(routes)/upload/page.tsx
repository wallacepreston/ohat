"use client"

import { useState, useRef, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours } from "@/types/salesforce"
import { OfficeHoursStatus } from "@/types/salesforce"
import { useStatus } from "@/app/context/StatusContext"
import { useLoading } from "@/app/context/LoadingContext"
import ResultsTable from "@/app/components/ResultsTable"
import { processBatchOfficeHours, convertBatchResponseToLegacy, processPhotoUpload } from "@/app/lib/api-client"

export default function UploadPage() {
  const [results, setResults] = useState<ProcessedOfficeHours[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [institution, setInstitution] = useState<string>("")
  const [instructorName, setInstructorName] = useState<string>("")
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
    setPhotoInputDirty(true) // Mark as dirty on submission attempt
    setLoading(true)
    setLoadingMessage("Processing photo and data...")
    clearStatusMessages() // Clear previous status messages
    
    // Check if all required fields are present
    if (!photoFile) {
      addStatusMessage('error', 'A photo is required for analysis')
      setLoading(false)
      return
    }
    
    if (!institution.trim()) {
      addStatusMessage('error', 'Institution name is required')
      setLoading(false)
      return
    }
    
    if (!instructorName.trim()) {
      addStatusMessage('error', 'Instructor name is required')
      setLoading(false)
      return
    }
    
    try {
      // Create the batch request object
      const batchRequest = {
        batchId: `batch-${Date.now()}`,
        accountId: institution.trim(),
        institution: institution.trim(),
        instructors: [
          {
            contactId: `contact-${Date.now()}`,
            name: instructorName.trim(),
            email: "", // Add empty email field to satisfy the type
            department: "" // Add empty department field to satisfy the type
          }
        ]
      }
      
      // Create a FormData object for submission
      const formData = new FormData()
      
      // Add the JSON data with the same field name expected by the backend
      formData.append("salesforceData", JSON.stringify(batchRequest))
      
      // Add photo to formData
      formData.append("photo", photoFile)
      
      // Use the batch API if available, otherwise fall back to legacy API
      let data: ProcessedOfficeHours[] = []
      
      try {
        // Photo uploads need to use the API endpoint for photos
        if (photoFile) {
          data = await processPhotoUpload(batchRequest, photoFile)
        } else {
          // Use batch API for non-photo requests
          const batchResponse = await processBatchOfficeHours(batchRequest)
          data = convertBatchResponseToLegacy(batchResponse, batchRequest)
        }
      } catch (error) {
        console.warn("API failed, falling back to legacy API:", error)
        data = await processOfficeHours(formData)
      }
      
      // Update the results without duplicates
      updateResultsWithoutDuplicates(data)
      
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
  const displayStatusMessages = (data: ProcessedOfficeHours[]) => {
    if (data.length === 0) {
      addStatusMessage('warning', 'No results were returned')
      return;
    }
    
    // Calculate counts for each status type based on the provided data
    const validatedCount = data.filter(item => item.status === OfficeHoursStatus.VALIDATED).length
    const foundCount = data.filter(item => item.status === OfficeHoursStatus.FOUND).length
    const partialCount = data.filter(item => item.status === OfficeHoursStatus.PARTIAL_INFO_FOUND).length
    const notFoundCount = data.filter(item => item.status === OfficeHoursStatus.NOT_FOUND).length
    const errorCount = data.filter(item => item.status === OfficeHoursStatus.ERROR).length
    
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
  };

  // Helper function to update results without duplicates
  const updateResultsWithoutDuplicates = (newData: ProcessedOfficeHours[]) => {
    setResults(prevResults => {
      // Create a new array with existing results
      const updatedResults = [...prevResults];
      
      // For each new result
      newData.forEach(newItem => {
        // Check if this instructor already exists in our results
        const existingIndex = updatedResults.findIndex(
          existingItem => existingItem.instructor === newItem.instructor
        );
        
        if (existingIndex >= 0) {
          // Replace the existing instructor data with the new data
          updatedResults[existingIndex] = newItem;
        } else {
          // Add new instructor to results
          updatedResults.push(newItem);
        }
      });
      
      return updatedResults;
    });
  };

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
            <Label htmlFor="institution" className="flex items-center text-base">
              Institution
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Enter institution name"
              required
              className="w-full"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="instructor-name" className="flex items-center text-base">
              Instructor Name
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="instructor-name"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              placeholder="Enter instructor name"
              required
              className="w-full"
            />
          </div>
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading || !photoFile || !institution || !instructorName}
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