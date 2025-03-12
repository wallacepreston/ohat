"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours } from "@/types/salesforce"
import { OfficeHoursStatus } from "@/types/salesforce"
import { useStatus } from "@/app/context/StatusContext"
import { useLoading } from "@/app/context/LoadingContext"
import ResultsTable from "@/app/components/ResultsTable"

export default function SearchPage() {
  const [results, setResults] = useState<ProcessedOfficeHours[]>([])
  const { addStatusMessage, clearStatusMessages } = useStatus()
  const { isLoading, setLoading, setLoadingMessage } = useLoading()

  // Function to clear results
  const clearResults = () => {
    setResults([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setLoadingMessage("Searching for data...")
    clearStatusMessages() // Clear previous status messages
    
    try {
      const formData = new FormData(e.currentTarget)
      
      // Validate the JSON data
      const jsonData = formData.get("salesforceData") as string
      let parsedData
      
      try {
        parsedData = JSON.parse(jsonData)
        
        // Ensure the data is an array
        if (!Array.isArray(parsedData)) {
          parsedData = [parsedData]
        }
      } catch (error) {
        addStatusMessage('error', 'Invalid JSON data format')
        setLoading(false)
        return
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
          <Label htmlFor="salesforce-data">Salesforce Data (JSON Array)</Label>
          <Textarea
            id="salesforce-data"
            name="salesforceData"
            placeholder="Paste Salesforce JSON array here..."
            className="min-h-[200px] font-mono text-sm"
            required
          />
          <p className="text-sm text-muted-foreground">
            Enter an array of course/institution objects to search for multiple instructors. 
            Each object should have at minimum the fields "Account_Name__c" (institution) and 
            either "School_Course_Name__c" or "Division" (course).
          </p>
        </div>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Searching..." : "Search Data"}
        </Button>
      </form>

      <ResultsTable 
        results={results}
        onClearResults={clearResults}
      />
    </div>
  )
} 