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
  )
} 