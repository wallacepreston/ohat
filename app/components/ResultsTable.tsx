"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ProcessedOfficeHours } from "@/types/salesforce"
import { getStatusClass, formatStatus, renderStatusIcon } from "./ui/statusRenderers"

interface ResultsTableProps {
  results: ProcessedOfficeHours[]
  onClearResults?: () => void
  renderAdditionalInfo?: (result: ProcessedOfficeHours) => React.ReactNode
}

export default function ResultsTable({ results, onClearResults, renderAdditionalInfo }: ResultsTableProps) {
  if (results.length === 0) {
    return null;
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
                <TableCell>
                  <div>
                    {result.days.length > 0 ? (
                      <>
                        <div>{result.days.join(", ")}</div>
                        <div>{result.times}</div>
                        <div>{result.location}</div>
                      </>
                    ) : (
                      "No office hours found"
                    )}
                    {renderAdditionalInfo && renderAdditionalInfo(result)}
                  </div>
                </TableCell>
                <TableCell>
                  {result.teachingHours ? (
                    <>
                      <div>{result.teachingHours}</div>
                      <div>{result.teachingLocation}</div>
                    </>
                  ) : (
                    "No teaching hours found"
                  )}
                </TableCell>
                <TableCell>
                  <span className={getStatusClass(result.status)}>
                    {formatStatus(result.status)}
                    {renderStatusIcon(result.status)}
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
              {result.days.length > 0 ? (
                <>
                  <div className="text-sm">
                    <span className="font-medium">Office Hours:</span> {result.days.join(", ")}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Office Hours:</span> {result.times}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Office Location:</span> {result.location}
                  </div>
                </>
              ) : (
                <div className="text-sm">
                  <span className="font-medium">Office Hours:</span> No office hours found
                </div>
              )}
              
              {/* Teaching Hours info */}
              {result.teachingHours ? (
                <>
                  <div className="text-sm">
                    <span className="font-medium">Teaching Hours:</span> {result.teachingHours}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Teaching Location:</span> {result.teachingLocation}
                  </div>
                </>
              ) : (
                <div className="text-sm">
                  <span className="font-medium">Teaching Hours:</span> No teaching hours found
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
} 