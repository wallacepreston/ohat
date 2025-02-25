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
    const salesforceData: SalesforceData = JSON.parse(rawData)

    // Extract context for search
    const context = {
      institution: salesforceData.Opportunity.Account.Name,
      course: salesforceData.Opportunity.Course.Name,
      instructor: salesforceData.Opportunity.Contacts[0],
      term: `${salesforceData.Opportunity.Course.Term.Updated} ${new Date(
        salesforceData.Opportunity.Course.Term.Start,
      ).getFullYear()}`,
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const currentSeason = (() => {
      // JavaScript months are 0-indexed (0 = January, 11 = December)
      if (currentMonth >= 2 && currentMonth <= 4) return "Spring"
      if (currentMonth >= 5 && currentMonth <= 7) return "Summer"
      if (currentMonth >= 8 && currentMonth <= 10) return "Fall"
      return "Winter" // Dec (11), Jan (0), Feb (1)
    })();

    const currentTerm = `${currentSeason} ${currentYear}`

    // Create the prompt
    const prompt = `
    Search for and extract office hours information for this professor by searching online. The office hours should be for the current term, but if there are noe found, they search for ANY term, past, present, or future.  
    
    Context:
    Institution: ${context.institution}
    Course: ${context.course}
    Instructor: ${context.instructor.Name}
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
    - status: Either "pending", "validated", or "error"
    
    YOUR TASK:
    1. Search for this professor's office hours information for the current term.
    2. Look for days of the week (Monday, Tuesday, etc.)
    3. Look for specific times (like "2-4pm" or "14:00-16:00")
    4. Look for location information (building name, room number, "virtual", etc.)

    Only mark status as "validated" if you find SPECIFIC days, times, and locations.
    Only mark as "pending" if you cannot find the information.
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
      // Create a pending result if parsing fails
      result = {
        instructor: context.instructor.Name,
        email: context.instructor.Email,
        institution: context.institution,
        course: context.course,
        days: [],
        times: "",
        location: "",
        term: context.term,
        status: "error"
      }
    }

    // Ensure the email is included from Salesforce data
    const processedResult = {
      ...result,
      email: context.instructor.Email,
      // Ensure these fields are never null in the final result
      days: result.days || [],
      times: result.times || "",
      location: result.location || "",
    }

    return [processedResult]
  } catch (error) {
    console.error("Error processing office hours:", error)
    throw new Error("Failed to process office hours data")
  }
}

