"use server"

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { StructuredOutputParser } from "langchain/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { SerpAPI } from "@langchain/community/tools/serpapi"
import { z } from "zod"
import type { SalesforceData, ProcessedOfficeHours } from "@/types/salesforce"

// Define the schema for structured output
const officeHoursSchema = z.object({
  instructor: z.string(),
  email: z.string(),
  institution: z.string(),
  course: z.string(),
  days: z.array(z.string()),
  times: z.string(),
  location: z.string(),
  term: z.string(),
  status: z.enum(["pending", "validated", "error"]),
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

    // Initialize tools and models
    const serpApi = new SerpAPI(process.env.SERPAPI_API_KEY)
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-flash",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0,
    })

    // Create the output parser
    const parser = StructuredOutputParser.fromZodSchema(officeHoursSchema)
    const formatInstructions = parser.getFormatInstructions()

    // Create search query
    const searchQuery = `Professor ${context.instructor.Name} office hours schedule syllabus ${context.course} ${context.institution} ${context.term}`

    // Perform web search
    const searchResults = await serpApi.call(searchQuery)

    // Create the prompt template
    const prompt = PromptTemplate.fromTemplate(`
      Extract office hours information from the following context and search results.
      
      Context:
      Institution: {institution}
      Course: {course}
      Instructor: {instructor}
      Term: {term}
      
      Search Results:
      {searchResults}
      
      {formatInstructions}
      
      Return the structured data following the format above. If specific information is not found,
      mark the status as "pending". If the information appears incorrect or conflicting, mark as "error".
      If the information is found and appears valid, mark as "validated".
    `)

    // Generate the structured output
    const chain = prompt.pipe(model).pipe(parser)

    const result = await chain.invoke({
      institution: context.institution,
      course: context.course,
      instructor: context.instructor.Name,
      term: context.term,
      searchResults: JSON.stringify(searchResults),
      formatInstructions,
    })

    // Ensure the email is included from Salesforce data
    const processedResult = {
      ...result,
      email: context.instructor.Email,
    }

    return [processedResult]
  } catch (error) {
    console.error("Error processing office hours:", error)
    throw new Error("Failed to process office hours data")
  }
}

