import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StructuredOutputParser } from "langchain/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { OfficeHoursStatus } from "@/types/salesforce";
import type { ProcessedOfficeHours } from "@/types/salesforce";
import dotenv from 'dotenv';
dotenv.config();

// Define the schema for email parsing results
const emailResponseSchema = z.object({
  instructor: z.string(),
  email: z.string().email().nullable().default(""),
  institution: z.string(),
  course: z.string().nullable().default(""),
  days: z.array(z.string()).nullable().default([]),
  times: z.string().nullable().default(""),
  location: z.string().nullable().default(""),
  teachingHours: z.string().nullable().default(""),
  teachingLocation: z.string().nullable().default(""),
  term: z.string(),
  status: z.string().transform(val => {
    // Transform string status to enum
    switch(val.toLowerCase()) {
      case 'validated': return OfficeHoursStatus.VALIDATED;
      case 'found': return OfficeHoursStatus.FOUND;
      case 'partial info found': return OfficeHoursStatus.PARTIAL_INFO_FOUND;
      case 'not found': return OfficeHoursStatus.NOT_FOUND;
      case 'error': return OfficeHoursStatus.ERROR;
      default: return OfficeHoursStatus.ERROR;
    }
  }),
  confidence: z.number().min(0).max(1).default(0.8),
  additionalInfo: z.string().nullable().default("")
});

// Helper function to get current season
function getCurrentSeason(): string {
  const currentMonth = new Date().getMonth();
  // JavaScript months are 0-indexed (0 = January, 11 = December)
  if (currentMonth >= 2 && currentMonth <= 4) return "Spring";
  if (currentMonth >= 5 && currentMonth <= 7) return "Summer";
  if (currentMonth >= 8 && currentMonth <= 10) return "Fall";
  return "Winter"; // Dec (11), Jan (0), Feb (1)
}

/**
 * Process an email response from an instructor to extract office hours information
 * 
 * @param emailText The full text of the email response
 * @param instructorData Additional context about the instructor (name, email, institution, etc.)
 * @returns Promise that resolves to processed office hours data
 */
export async function processInstructorEmailResponse(
  emailText: string,
  instructorData: {
    name: string;
    email: string;
    institution: string;
    course?: string;
  }
): Promise<ProcessedOfficeHours> {
  try {
    console.log(`Processing email response from instructor: ${instructorData.name}`);
    
    // Initialize OpenAI model
    const model = new ChatOpenAI({
      modelName: "gpt-4o",
      maxTokens: 1000,
    });
    
    // Create JSON parser
    const jsonParser = StructuredOutputParser.fromZodSchema(emailResponseSchema);
    const formatInstructions = jsonParser.getFormatInstructions();
    
    // Create the system prompt
    const systemPrompt = `
    You are an expert at parsing emails from instructors and extracting information about their office hours and teaching schedule.
    
    Your task is to carefully analyze an email response from an instructor to find:
    1. Days and times of their office hours
    2. Office location
    3. Teaching schedule (days/times of their classes)
    4. Teaching locations (classrooms)
    
    IMPORTANT RULES:
    - The email is likely a response to a request for meeting during office hours
    - The instructor may mention their office hours directly or indirectly
    - They might refer to their availability, when they're free to meet, or when they're in their office
    - Pay attention to phrases like "I'm available on...", "You can find me at...", "I'll be in my office..."
    - Look for any mentions of days, times, and locations
    - Use context clues to determine if times mentioned are office hours or class times
    - Distinguish between office location and teaching/classroom locations
    
    ${formatInstructions}
    
    ADDITIONAL GUIDELINES:
    - Confidence: Rate your confidence in the extracted information on a scale of 0 to 1
    - additionalInfo: Include any other potentially relevant information about availability
    - If no office hours are mentioned, set status to "not found"
    - If office hours days/times are mentioned but not location, set status to "partial info found"
    - If both office hours times and location are provided, set status to "found"
    - Only set status to "validated" if the information is explicitly confirmed in the email
    `;
    
    // Create the email processing chain
    const emailProcessingChain = RunnableSequence.from([
      async (input: any) => {
        return [
          new SystemMessage(systemPrompt),
          new HumanMessage(`
          Here is an email response from a professor that I need to extract office hours information from.
          
          INSTRUCTOR CONTEXT:
          Name: ${instructorData.name}
          Email: ${instructorData.email}
          Institution: ${instructorData.institution}
          ${instructorData.course ? `Course: ${instructorData.course}` : ''}
          
          EMAIL TEXT:
          ${input.emailText}
          
          Extract all information about the instructor's office hours, teaching schedule, and locations.
          Respond with a JSON object according to the format instructions.
          `)
        ];
      },
      model,
      new StringOutputParser(),
      async (output: string) => {
        try {
          // Clean up output in case it has markdown or comments
          const cleanedOutput = output
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();
          
          // Parse the JSON response
          const parsedOutput = JSON.parse(cleanedOutput);
          
          // Validate with Zod schema
          const validatedResult = emailResponseSchema.parse(parsedOutput);
          
          // Fill in any missing required fields
          return {
            ...validatedResult,
            instructor: validatedResult.instructor || instructorData.name,
            email: validatedResult.email || instructorData.email,
            institution: validatedResult.institution || instructorData.institution,
            course: validatedResult.course || instructorData.course || "",
            term: validatedResult.term || `${getCurrentSeason()} ${new Date().getFullYear()}`
          };
        } catch (error) {
          console.error("Error parsing LLM output:", error);
          
          // Return a default error result
          return {
            instructor: instructorData.name,
            email: instructorData.email,
            institution: instructorData.institution,
            course: instructorData.course || "",
            days: [],
            times: "",
            location: "",
            teachingHours: "",
            teachingLocation: "",
            term: `${getCurrentSeason()} ${new Date().getFullYear()}`,
            status: OfficeHoursStatus.ERROR,
            confidence: 0,
            additionalInfo: `Error processing email: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      }
    ]);
    
    // Process the email
    const result = await emailProcessingChain.invoke({
      emailText: emailText
    });
    
    console.log(`Email processing complete for ${instructorData.name}. Status: ${result.status}`);
    
    // Fix nullable fields to comply with ProcessedOfficeHours type
    return {
      ...result,
      days: result.days || [],
      times: result.times || "",
      location: result.location || "",
      teachingHours: result.teachingHours || "",
      teachingLocation: result.teachingLocation || ""
    };
  } catch (error) {
    console.error("Error in processInstructorEmailResponse:", error);
    
    // Return error result
    return {
      instructor: instructorData.name,
      email: instructorData.email,
      institution: instructorData.institution,
      course: instructorData.course || "",
      days: [],
      times: "",
      location: "",
      teachingHours: "",
      teachingLocation: "",
      term: `${getCurrentSeason()} ${new Date().getFullYear()}`,
      status: OfficeHoursStatus.ERROR
    };
  }
}

/**
 * Handle SendGrid Inbound Parse webhook payloads
 * 
 * @param payload The parsed webhook payload from SendGrid
 * @returns Promise that resolves to processed office hours data
 */
export async function handleInboundParseWebhook(
  payload: any
): Promise<ProcessedOfficeHours> {
  try {
    console.log("Received SendGrid Inbound Parse webhook payload");
    
    // Extract key information from the payload
    const from = payload.from || "";
    const subject = payload.subject || "";
    const text = payload.text || "";
    const html = payload.html || "";
    
    // Extract sender email and name from "from" field
    // Format is typically "Name <email@example.com>"
    const emailRegex = /<([^>]+)>/;
    const emailMatch = from.match(emailRegex);
    const senderEmail = emailMatch ? emailMatch[1] : from;
    
    // Extract name by removing the email part
    const senderName = from.replace(emailRegex, "").trim();
    
    // Try to extract institution from email domain
    const emailDomain = senderEmail.split('@')[1] || "";
    const institutionParts = emailDomain.split('.');
    let institution = "Unknown Institution";
    
    // Some email domains follow patterns like rutgers.edu or stanford.edu
    if (institutionParts.length >= 2) {
      // Extract the main part of the domain, which is often the institution name
      const mainDomainPart = institutionParts[institutionParts.length - 2];
      if (mainDomainPart && mainDomainPart !== "gmail" && mainDomainPart !== "yahoo" && mainDomainPart !== "hotmail") {
        // Capitalize first letter and format
        institution = mainDomainPart.charAt(0).toUpperCase() + mainDomainPart.slice(1);
        
        // Handle common abbreviations
        if (institution === "Edu") {
          // Try the part before it
          if (institutionParts.length > 2) {
            institution = institutionParts[institutionParts.length - 3];
            institution = institution.charAt(0).toUpperCase() + institution.slice(1);
          }
        }
      }
    }
    
    // Look for any "original message" markers in the email body to separate out the reply
    const emailText = text;
    
    // Process the email content
    const result = await processInstructorEmailResponse(
      emailText,
      {
        name: senderName,
        email: senderEmail,
        institution: institution
      }
    );
    
    console.log(`Processed email from ${senderName}. Status: ${result.status}`);
    return result;
    
  } catch (error) {
    console.error("Error processing inbound email webhook:", error);
    
    // Return error result
    return {
      instructor: "Unknown Instructor",
      email: "",
      institution: "Unknown Institution",
      course: "",
      days: [],
      times: "",
      location: "",
      teachingHours: "",
      teachingLocation: "",
      term: `${getCurrentSeason()} ${new Date().getFullYear()}`,
      status: OfficeHoursStatus.ERROR
    };
  }
} 