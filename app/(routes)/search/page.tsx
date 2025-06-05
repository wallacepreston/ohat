"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { BatchResponse, BatchRequest, BatchRequestInstructor, BatchResponseResult, ProcessedOfficeHours } from "@/types/salesforce"
import { useStatus } from "@/app/context/StatusContext"
import { useLoading } from "@/app/context/LoadingContext"
import ResultsTable from "@/app/components/ResultsTable"
import { useSocket } from '@/app/hooks/useSocket';
import { processBatchOfficeHours } from "@/app/lib/api-client"
import { convertToTimeSlots } from "@/app/utils/timeUtils"

// Extended result type that includes both success and exception statuses
type ExtendedBatchResult = {
  contactId: string;
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "NOT_FOUND" | "ERROR";
  officeHours: BatchResponseResult['officeHours'];
  teachingHours: BatchResponseResult['teachingHours'];
  source: string;
};

export default function SearchPage() {
  const [results, setResults] = useState<ExtendedBatchResult[]>([])
  const [instructors, setInstructors] = useState<BatchRequestInstructor[]>([])
  const { addStatusMessage, clearStatusMessages } = useStatus()
  const { isLoading, setLoading, setLoadingMessage } = useLoading()
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Function to clear results
  const clearResults = () => {
    setResults([]);
    setInstructors([]);
  }

  // Set up Socket.IO connection
  useSocket((data: ProcessedOfficeHours) => {
    // Convert ProcessedOfficeHours to ExtendedBatchResult
    const batchResult: ExtendedBatchResult = {
      contactId: data.instructor, // Use instructor name as contactId
      status: data.status === "SUCCESS" ? "SUCCESS" : 
              data.status === "PARTIAL_SUCCESS" ? "PARTIAL_SUCCESS" : 
              data.status === "ERROR" ? "ERROR" : "NOT_FOUND",
      officeHours: convertToTimeSlots(data.days || [], data.times || "", data.location || ""),
      teachingHours: convertToTimeSlots([], data.teachingHours || "", data.teachingLocation || ""),
      source: data.validatedBy || "web_search"
    };

    // Update the table with new data
    setResults(prevData => {
      // Check if we already have this instructor's data
      const existingIndex = prevData.findIndex(item => item.contactId === batchResult.contactId);
      
      if (existingIndex >= 0) {
        // Update existing entry
        const newData = [...prevData];
        newData[existingIndex] = batchResult;
        return newData;
      } else {
        // Add new entry
        return [...prevData, batchResult];
      }
    });

    // Update status message
    setStatusMessage(`Received update for ${batchResult.contactId}`);
    setTimeout(() => setStatusMessage(''), 3000); // Clear after 3 seconds
  });

  // Helper function to combine results and exceptions into a single array
  const combineResultsAndExceptions = (batchResponse: BatchResponse): ExtendedBatchResult[] => {
    const combined: ExtendedBatchResult[] = [...batchResponse.results];
    
    // Convert exceptions to ExtendedBatchResult format
    for (const exception of batchResponse.exceptions) {
      combined.push({
        contactId: exception.contactId,
        status: exception.status,
        officeHours: [],
        teachingHours: [],
        source: `exception: ${exception.reason}`
      });
    }
    
    return combined;
  };

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
        
        // Store the instructors for display
        setInstructors(parsedData.instructors);
        
        // Use the batch API directly
        const batchResponse = await processBatchOfficeHours(parsedData as BatchRequest);
        const combinedResults = combineResultsAndExceptions(batchResponse);
        setResults(combinedResults);
        
        // Calculate counts based on the combined data
        displayStatusMessages(combinedResults);
      }
      // Case 2: Array of instructor data
      else if (Array.isArray(parsedData)) {
        // Convert to batch format
        const batchRequest: BatchRequest = {
          batchId: `batch-${Date.now()}`,
          accountId: parsedData[0]?.accountId || "",
          institution: parsedData[0]?.institution || "",
          instructors: parsedData.map(instructor => ({
            contactId: instructor.contactId || instructor.name || `contact-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: instructor.name || "Unknown",
            email: instructor.email || null,
            department: instructor.department || null,
            isKeyDecisionMaker: instructor.isKeyDecisionMaker || null
          })) as [BatchRequestInstructor, ...BatchRequestInstructor[]]
        };
        
        // Store the instructors for display
        setInstructors(batchRequest.instructors);
        
        const batchResponse = await processBatchOfficeHours(batchRequest);
        const combinedResults = combineResultsAndExceptions(batchResponse);
        setResults(combinedResults);
        
        // Calculate counts based on the combined data
        displayStatusMessages(combinedResults);
      }
      // Case 3: Single instructor
      else if (typeof parsedData === 'object') {
        // Convert to batch format
        const batchRequest: BatchRequest = {
          batchId: `batch-${Date.now()}`,
          accountId: parsedData.accountId || "",
          institution: parsedData.institution || "",
          instructors: [{
            contactId: parsedData.contactId || parsedData.name || `contact-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: parsedData.name || "Unknown",
            email: parsedData.email || null,
            department: parsedData.department || null,
            isKeyDecisionMaker: parsedData.isKeyDecisionMaker || null
          }] as [BatchRequestInstructor, ...BatchRequestInstructor[]]
        };
        
        // Store the instructors for display
        setInstructors(batchRequest.instructors);
        
        const batchResponse = await processBatchOfficeHours(batchRequest);
        const combinedResults = combineResultsAndExceptions(batchResponse);
        setResults(combinedResults);
        
        // Calculate counts based on the combined data
        displayStatusMessages(combinedResults);
      }
    } catch (error) {
      console.error("Error processing data:", error)
      addStatusMessage('error', error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to display status messages based on the provided data
  const displayStatusMessages = (data: ExtendedBatchResult[]) => {
    if (data.length === 0) {
      addStatusMessage('warning', 'No results were returned')
      return;
    }
    
    // Calculate counts for each status type based on the provided data
    const successCount = data.filter(item => item.status === "SUCCESS").length
    const partialCount = data.filter(item => item.status === "PARTIAL_SUCCESS").length
    const notFoundCount = data.filter(item => item.status === "NOT_FOUND").length
    const errorCount = data.filter(item => item.status === "ERROR").length
    
    // Add a message for each status type with results
    if (successCount > 0) {
      addStatusMessage('success', `Found information for ${successCount} instructor(s)`)
    }
    
    if (partialCount > 0) {
      addStatusMessage('info', `Found partial information for ${partialCount} instructor(s)`)
    }
    
    if (notFoundCount > 0) {
      addStatusMessage('warning', `Could not find information for ${notFoundCount} instructor(s)`)
    }
    
    if (errorCount > 0) {
      addStatusMessage('error', `Errors occurred for ${errorCount} instructor(s)`)
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
        </div>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Searching..." : "Search Data"}
        </Button>
      </form>

      <ResultsTable 
        results={results as any}
        onClearResults={clearResults}
        instructors={instructors}
      />
    </div>
  )
} 