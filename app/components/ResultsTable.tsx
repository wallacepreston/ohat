"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { BatchResponse, BatchRequestInstructor } from "@/types/salesforce"
import { getStatusClass, formatStatus, renderStatusIcon } from "./ui/statusRenderers"

interface ResultsTableProps {
  results: BatchResponse['results']
  onClearResults?: () => void
  renderAdditionalInfo?: (result: BatchResponse['results'][0]) => React.ReactNode
  instructors?: BatchRequestInstructor[]
}

export default function ResultsTable({ results, onClearResults, renderAdditionalInfo, instructors }: ResultsTableProps) {
  if (results.length === 0) {
    return null;
  }

  const formatTimeSlot = (slot: BatchResponse['results'][0]['officeHours'][0]) => {
    return `${slot.startHour}:${slot.startMinute} ${slot.startAmPm} - ${slot.endHour}:${slot.endMinute} ${slot.endAmPm}`
  }

  const formatTimeSlots = (slots: BatchResponse['results'][0]['officeHours']) => {
    if (!slots || slots.length === 0) return "No hours found"
    
    const groupedByDay = slots.reduce((acc, slot) => {
      if (!acc[slot.dayOfWeek]) {
        acc[slot.dayOfWeek] = []
      }
      acc[slot.dayOfWeek].push(slot)
      return acc
    }, {} as Record<string, typeof slots>)

    return Object.entries(groupedByDay).map(([day, daySlots]) => (
      <div key={day}>
        <strong>{day}:</strong> {daySlots.map(formatTimeSlot).join(", ")}
        <span className="text-muted-foreground"> (Location: {daySlots[0].location})</span>
      </div>
    ))
  }

  // Create a map of contactId to instructor info
  const instructorMap = new Map<string, BatchRequestInstructor>();
  if (instructors) {
    instructors.forEach(instructor => {
      instructorMap.set(instructor.contactId, instructor);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Results</h2>
        {results.length > 0 && onClearResults && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearResults}
          >
            Clear Results
          </Button>
        )}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden md:block overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instructor</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Office Hours</TableHead>
              <TableHead>Teaching Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => {
              const instructor = instructorMap.get(result.contactId);
              return (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <div>{instructor?.name || result.contactId}</div>
                      <div className="text-sm text-muted-foreground">{result.contactId}</div>
                      {instructor?.email && <div className="text-sm text-muted-foreground">{instructor.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>{instructor?.department || "Not specified"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {formatTimeSlots(result.officeHours)}
                      {renderAdditionalInfo && renderAdditionalInfo(result)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {result.teachingHours && result.teachingHours.length > 0 ? (
                      formatTimeSlots(result.teachingHours)
                    ) : (
                      "No teaching hours found"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={getStatusClass(result.status)}>
                      {formatStatus(result.status)}
                      {renderStatusIcon(result.status)}
                    </span>
                    {result.source && <div className="text-sm text-muted-foreground">Source: {result.source}</div>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-4">
        {results.map((result, index) => {
          const instructor = instructorMap.get(result.contactId);
          return (
            <div key={index} className="border rounded-lg p-4 bg-background space-y-3">
              <div className="border-b pb-2 mb-2">
                <div className="font-semibold text-lg">{instructor?.name || result.contactId}</div>
                <div className="text-sm text-muted-foreground">{result.contactId}</div>
                {instructor?.email && <div className="text-sm text-muted-foreground">{instructor.email}</div>}
                <div className="mt-1">
                  <span className={getStatusClass(result.status)}>
                    {formatStatus(result.status)}
                    {renderStatusIcon(result.status)}
                  </span>
                  {result.source && <div className="text-sm text-muted-foreground">Source: {result.source}</div>}
                </div>
              </div>
              
              {/* Office Hours info */}
              <div className="text-sm space-y-1">
                <span className="font-medium">Office Hours:</span>
                {formatTimeSlots(result.officeHours)}
              </div>
              
              {/* Teaching Hours info */}
              <div className="text-sm space-y-1">
                <span className="font-medium">Teaching Hours:</span>
                {result.teachingHours && result.teachingHours.length > 0 ? (
                  formatTimeSlots(result.teachingHours)
                ) : (
                  "No teaching hours found"
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
} 