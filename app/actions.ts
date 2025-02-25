"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { SalesforceData, ProcessedOfficeHours } from "@/types/salesforce"

export async function processOfficeHours(formData: FormData): Promise<ProcessedOfficeHours[]> {
  try {
    const rawData = formData.get("salesforceData") as string
    const salesforceData: SalesforceData = JSON.parse(rawData)

    // Extract context for the AI prompt
    const context = {
      institution: salesforceData.Opportunity.Account.Name,
      course: salesforceData.Opportunity.Course.Name,
      instructor: salesforceData.Opportunity.Contacts[0],
      term: `${salesforceData.Opportunity.Course.Term.Updated} ${new Date(
        salesforceData.Opportunity.Course.Term.Start,
      ).getFullYear()}`,
    }

    // Call Perplexity AI to process the office hours data
    const { text } = await generateText({
      model: openai("gpt-4"), // Replace with Perplexity AI when available
      prompt: `Extract office hours information for the following context:
        Institution: ${context.institution}
        Course: ${context.course}
        Instructor: ${context.instructor.Name}
        Term: ${context.term}
        
        Return a JSON object with the following structure:
        {
          "instructor": string,
          "email": string,
          "institution": string,
          "course": string,
          "days": string[],
          "times": string,
          "location": string,
          "term": string,
          "status": "pending" | "validated" | "error"
        }`,
      system: "You are a helpful assistant that extracts structured office hours data from text.",
    })

    // For the PoC, we'll create a mock result since we don't have actual office hours data
    const mockResult: ProcessedOfficeHours = {
      instructor: context.instructor.Name,
      email: context.instructor.Email,
      institution: context.institution,
      course: context.course,
      days: ["Monday", "Wednesday"],
      times: "2:00 PM - 4:00 PM",
      location: "Room 301",
      term: context.term,
      status: "pending",
    }

    return [mockResult]
  } catch (error) {
    console.error("Error processing office hours:", error)
    throw new Error("Failed to process office hours data")
  }
}

