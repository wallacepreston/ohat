"use server"

import { z } from "zod"
import type { SalesforceData, ProcessedOfficeHours } from "@/types/salesforce"

// Define the schema for structured output
const officeHoursSchema = z.object({
  instructor: z.string(),
  email: z.string().nullable().default(""),
  institution: z.string(),
  course: z.string(),
  days: z.array(z.string()).nullable().default([]),
  times: z.string().nullable().default(""),
  location: z.string().nullable().default(""),
  term: z.string(),
  status: z.string(),
})

export async function processOfficeHours(formData: FormData): Promise<ProcessedOfficeHours[]> {
  try {
    const rawData = formData.get("salesforceData") as string
    const parsedData = JSON.parse(rawData)
    
    // use Perplexity to search for office hours
    return await searchWithPerplexity(parsedData)
  } catch (error) {
    console.error("Error processing office hours:", error)
    throw new Error("Failed to process office hours data")
  }
}

// Process direct flat-format data
function processDirectData(officeHoursData: SalesforceData): ProcessedOfficeHours[] {
  // Parse days of week into full day names
  const parseDays = (dayStr: string) => {
    const dayMap: Record<string, string> = {
      'M': 'Monday',
      'T': 'Tuesday',
      'W': 'Wednesday',
      'Th': 'Thursday',
      'F': 'Friday'
    }
    
    return dayStr.split('/').map(day => dayMap[day] || day)
  }
  
  // Format time string (e.g., "12:30 PM - 1:45 PM")
  const formatTime = (
    startHour: number, 
    startMinute: number, 
    startAMPM: string,
    endHour: number, 
    endMinute: number, 
    endAMPM: string
  ) => {
    const startMin = startMinute === 0 ? '00' : startMinute
    const endMin = endMinute === 0 ? '00' : endMinute
    return `${startHour}:${startMin} ${startAMPM} - ${endHour}:${endMin} ${endAMPM}`
  }

  // Format the term based on the lastModifiedDate
  const formatTerm = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = date.getMonth()
      
      let season
      if (month >= 2 && month <= 4) season = "Spring"
      else if (month >= 5 && month <= 7) season = "Summer"
      else if (month >= 8 && month <= 10) season = "Fall"
      else season = "Winter"
      
      return `${season} ${year}`
    } catch (e) {
      return "Unknown Term"
    }
  }

  // Process the flat data structure into ProcessedOfficeHours format
  const processedResult: ProcessedOfficeHours = {
    instructor: `${officeHoursData.contactFirstName} ${officeHoursData.contactLastName}`,
    email: "", // Add email if available in your data
    institution: officeHoursData.contactAccountName,
    course: officeHoursData.contactDepartmentName, // Using department as course
    days: parseDays(officeHoursData.dayOfWeek || ""),
    times: formatTime(
      officeHoursData.startHour,
      officeHoursData.startMinute,
      officeHoursData.startAMPM,
      officeHoursData.endHour,
      officeHoursData.endMinute,
      officeHoursData.endAMPM
    ),
    location: officeHoursData.location || officeHoursData.contactOfficeLocation || "",
    term: formatTerm(officeHoursData.lastModifiedDate),
    status: officeHoursData.noHoursPosted === 1 ? "not found" : "validated"
  }

  return [processedResult]
}

// Use Perplexity to search for office hours
async function searchWithPerplexity(searchData: any): Promise<ProcessedOfficeHours[]> {
  // Extract data for search
  // Adapt to potentially different formats of input data
  const instructor = searchData.instructor || 
                     (searchData.contactFirstName && searchData.contactLastName ? 
                      `${searchData.contactFirstName} ${searchData.contactLastName}` : 
                      "Unknown Instructor")
                      
  const institution = searchData.institution || 
                      searchData.contactAccountName || 
                      "Unknown Institution"
                      
  const course = searchData.course || 
                 searchData.contactDepartmentName || 
                 "Unknown Course"
  
  // Calculate current term
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const currentSeason = (() => {
    // JavaScript months are 0-indexed (0 = January, 11 = December)
    if (currentMonth >= 2 && currentMonth <= 4) return "Spring"
    if (currentMonth >= 5 && currentMonth <= 7) return "Summer"
    if (currentMonth >= 8 && currentMonth <= 10) return "Fall"
    return "Winter" // Dec (11), Jan (0), Feb (1)
  })()
  
  const currentTerm = `${currentSeason} ${currentYear}`

  // Create the prompt
  const prompt = `
  Search for and extract office hours information for this professor by searching online. The office hours should be for the current term, but if there are none found, then search for ANY term, past, present, or future.  
  
  Context:
  Institution: ${institution}
  Course: ${course}
  Instructor: ${instructor}
  Term: ${currentTerm}
  
  Please structure your response as a valid JSON object with the following fields:
  - instructor: The instructor's name
  - email: The instructor's email
  - institution: The institution name
  - course: The course name
  - days: An array of days of the week when office hours are held
  - times: A string describing the times of office hours
  - location: Where office hours are held
  - term: The academic term for which the office hours are valid
  - status: Either "not found", "validated", or "error"
  
  YOUR TASK:
  1. Search for this professor's office hours information for the current term.
  2. Look for days of the week (Monday, Tuesday, etc.)
  3. Look for specific times (like "2-4pm" or "14:00-16:00")
  4. Look for location information (building name, room number, "virtual", etc.)

  Only mark status as "validated" if you find SPECIFIC days, times, and locations.
  Only mark as "not found" if you cannot find the information.
  Mark as "error" if you see conflicting information.
  
  IMPORTANT: Your entire response must be valid JSON that can be parsed with JSON.parse(). Do not include any text outside of the JSON structure. Do not put the json in a code block.
  `

  // Call Perplexity API directly
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that searches for and extracts office hours information. Always return raw JSON without any markdown formatting, code blocks, or explanatory text."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0,
      web_search: true
    })
  })

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  
  // Extract JSON from the response
  const resultText = data.choices[0].message.content
  
  // Clean up JSON if it's wrapped in markdown code blocks
  let cleanedText = resultText
    .replace(/^```json\s*/, '')  // Remove opening ```json
    .replace(/\s*```$/, '')      // Remove closing ```
    .trim()                     // Trim any whitespace

  // Parse the JSON response
  let result
  try {
    result = JSON.parse(cleanedText)
    // Validate with Zod
    result = officeHoursSchema.parse(result)
  } catch (error) {
    console.error("Error parsing response:", error)
    // Create a not found result if parsing fails
    result = {
      instructor: instructor,
      email: "",
      institution: institution,
      course: course,
      days: [],
      times: "",
      location: "",
      term: currentTerm,
      status: "error"
    }
  }

  // Ensure these fields are never null in the final result
  const processedResult = {
    ...result,
    days: result.days || [],
    times: result.times || "",
    location: result.location || "",
  }

  return [processedResult]
}

