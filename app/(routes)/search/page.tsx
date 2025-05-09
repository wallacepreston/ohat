"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { processOfficeHours } from "@/app/actions"
import type { ProcessedOfficeHours, BatchRequest } from "@/types/salesforce"
import { OfficeHoursStatus } from "@/types/salesforce"
import { useStatus } from "@/app/context/StatusContext"
import { useLoading } from "@/app/context/LoadingContext"
import ResultsTable from "@/app/components/ResultsTable"
import { useSocket } from '@/app/hooks/useSocket';
import { convertLegacyToBatchRequest, processBatchOfficeHours, convertBatchResponseToLegacy } from "@/app/lib/api-client"

export default function SearchPage() {
  const [results, setResults] = useState<ProcessedOfficeHours[]>([])
  const { addStatusMessage, clearStatusMessages } = useStatus()
  const { isLoading, setLoading, setLoadingMessage } = useLoading()
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Function to clear results
  const clearResults = () => {
    setResults([]);
  }

  // Set up Socket.IO connection
  useSocket((data) => {
    // Update the table with new data
    setResults(prevData => {
      // Check if we already have this instructor's data
      const existingIndex = prevData.findIndex(item => item.instructor === data.instructor);
      
      if (existingIndex >= 0) {
        // Update existing entry
        const newData = [...prevData];
        newData[existingIndex] = data;
        return newData;
      } else {
        // Add new entry
        return [...prevData, data];
      }
    });

    // Update status message
    setStatusMessage(`Received update for ${data.instructor}`);
    setTimeout(() => setStatusMessage(''), 3000); // Clear after 3 seconds
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setLoadingMessage("Searching for data...")
    clearStatusMessages() // Clear previous status messages
    
    try {
      const formData = new FormData(e.currentTarget)
      
      // Validate the JSON data
      const jsonData = formData.get("salesforceData") as string
      
      // Parse and handle the JSON data
      let parsedData: any;
      
      try {
        parsedData = JSON.parse(jsonData);
      } catch (error) {
        addStatusMessage('error', 'Invalid JSON data format');
        setLoading(false);
        return;
      }
      
      // Process the data and update results
      // Case 1: Already in batch format
      if (typeof parsedData === 'object' && 
          !Array.isArray(parsedData) && 
          'batchId' in parsedData && 
          'instructors' in parsedData) {
        
        // Use the batch API directly
        const batchResponse = await processBatchOfficeHours(parsedData as BatchRequest);
        const data = convertBatchResponseToLegacy(batchResponse, parsedData as BatchRequest);
        updateResultsWithoutDuplicates(data);
        
        // Calculate counts based on the new data
        displayStatusMessages(data);
      }
      // Case 2: Array of legacy instructor data
      else if (Array.isArray(parsedData)) {
        // Convert to batch format
        const batchRequest = convertLegacyToBatchRequest(parsedData);
        const batchResponse = await processBatchOfficeHours(batchRequest);
        const data = convertBatchResponseToLegacy(batchResponse, batchRequest);
        updateResultsWithoutDuplicates(data);
        
        // Calculate counts based on the new data
        displayStatusMessages(data);
      }
      // Case 3: Single instructor in legacy format
      else if (typeof parsedData === 'object') {
        // Convert to batch format
        const batchRequest = convertLegacyToBatchRequest([parsedData]);
        const batchResponse = await processBatchOfficeHours(batchRequest);
        const data = convertBatchResponseToLegacy(batchResponse, batchRequest);
        updateResultsWithoutDuplicates(data);
        
        // Calculate counts based on the new data
        displayStatusMessages(data);
      }
      // Case 4: Fallback for legacy API
      else {
        const data = await processOfficeHours(formData);
        updateResultsWithoutDuplicates(data);
        
        // Calculate counts based on the new data
        displayStatusMessages(data);
      }
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
    const foundCount = data.filter(item => item.status === OfficeHoursStatus.SUCCESS).length
    const partialCount = data.filter(item => item.status === OfficeHoursStatus.PARTIAL_SUCCESS).length
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
  }

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