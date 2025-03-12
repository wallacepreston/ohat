"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ProcessedOfficeHours } from "@/types/salesforce"
import { OfficeHoursStatus, formatStatus } from "@/types/salesforce"

interface ResultsTableProps {
  results: ProcessedOfficeHours[]
  onClearResults?: () => void
}

export default function ResultsTable({ results, onClearResults }: ResultsTableProps) {
  // Function to generate status styling class
  const getStatusClass = (status: OfficeHoursStatus) => {
    switch(status) {
      case OfficeHoursStatus.VALIDATED:
        return "text-green-600 font-bold";
      case OfficeHoursStatus.FOUND:
        return "text-green-600";
      case OfficeHoursStatus.NOT_FOUND:
        return "text-yellow-600";
      case OfficeHoursStatus.PARTIAL_INFO_FOUND:
        return "text-blue-600";
      default:
        return "text-red-600";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Results</h2>
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
              <TableHead>Course</TableHead>
              <TableHead>Term</TableHead>
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
                <TableCell>{result.times}</TableCell>
                <TableCell>{result.location}</TableCell>
                <TableCell>{result.teachingHours}</TableCell>
                <TableCell>{result.teachingLocation}</TableCell>
                <TableCell>
                  <span className={getStatusClass(result.status)}>
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

      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-4">
        {results.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg bg-background p-6">
            No results found. Submit data to search for office hours.
          </div>
        ) : (
          results.map((result, index) => (
            <div key={index} className="border rounded-lg p-4 bg-background space-y-3">
              <div className="border-b pb-2 mb-2">
                <div className="font-semibold text-lg">{result.instructor}</div>
                {result.email && <div className="text-sm text-muted-foreground">{result.email}</div>}
                <div className="text-sm">{result.institution}</div>
                {result.course && <div className="text-sm">{result.course}</div>}
                <div className="mt-1">
                  <span className={getStatusClass(result.status)}>
                    {formatStatus(result.status)}
                    {result.validatedBy && <span className="ml-1 text-xs">✓</span>}
                  </span>
                </div>
              </div>
              
              {/* Term info */}
              {result.term && (
                <div className="text-sm">
                  <span className="font-medium">Term:</span> {result.term}
                </div>
              )}
              
              {/* Office Hours info */}
              {result.times && (
                <div className="text-sm">
                  <span className="font-medium">Office Hours:</span> {result.times}
                </div>
              )}
              
              {/* Office Location info */}
              {result.location && (
                <div className="text-sm">
                  <span className="font-medium">Office Location:</span> {result.location}
                </div>
              )}
              
              {/* Teaching Hours info */}
              {result.teachingHours && (
                <div className="text-sm">
                  <span className="font-medium">Teaching Hours:</span> {result.teachingHours}
                </div>
              )}
              
              {/* Teaching Location info */}
              {result.teachingLocation && (
                <div className="text-sm">
                  <span className="font-medium">Teaching Location:</span> {result.teachingLocation}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
} 