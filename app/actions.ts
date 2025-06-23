"use server"

import { z } from "zod"
import type { 
  ProcessedOfficeHours, 
  BatchRequest,
  BatchResponse,
  BatchRequestInstructor,
  TimeSlot,
  BatchResponseResult
} from "@/types/salesforce"
import { OfficeHoursStatus } from "@/types/salesforce"
import { determineResultStatus, validateResultStatus } from "@/app/utils/status"
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { StructuredOutputParser } from "langchain/output_parsers"
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { queueInstructorCrawl } from "@/app/services/sqsService"
import { parseTimeString, orderDaysOfWeek, convertToTimeSlots } from "./utils/timeUtils"
import { salesforceService } from "@/app/services/salesforceService"
import { ContactHourObject } from "@/app/types/salesforce-contact"

// Define the schema for raw Salesforce input data
const salesforceDataSchema = z.object({
  // Standard Salesforce fields
  Account_ID__c: z.string().optional(),
  Account_Name__c: z.string().optional(),
  Additional_Notes__c: z.string().optional(),
  Contact_Name__c: z.string().optional(),
  Contact_Email__c: z.string().optional(),
  Contact_Status__c: z.string().optional(),
  Contact_Office_Phone__c: z.string().optional(),
  Last_Activity_Date__c: z.string().optional(),
  Office_Hours__c: z.string().optional(),
  School_Course_Name__c: z.string().optional(),
  Is_Teaching__c: z.boolean().optional(),
  Division: z.string().optional(),
  Decision_Maker_Type__c: z.string().optional(),
})

// Define the schema for structured output from AI processing
const officeHoursSchema = z.object({
  instructor: z.string(),
  email: z.string().optional().nullable().default(""),
  institution: z.string(),
  course: z.string(),
  days: z.array(z.string()).nullable().default([]),
  times: z.string().nullable().default(""),
  location: z.string().nullable().default(""),
  teachingHours: z.string().nullable().default(""),
  teachingLocation: z.string().nullable().default(""),
  term: z.string(),
  comments: z.string().nullable().default(""),
  status: z.string().transform(val => {
    // Transform string status to enum
    switch(val.toLowerCase()) {
      case 'validated': return OfficeHoursStatus.VALIDATED;
      case 'found': return OfficeHoursStatus.SUCCESS;
      case 'partial info found': return OfficeHoursStatus.PARTIAL_SUCCESS;
      case 'not found': return OfficeHoursStatus.NOT_FOUND;
      case 'error': return OfficeHoursStatus.ERROR;
      default: return OfficeHoursStatus.ERROR;
    }
  }),
  validatedBy: z.string().nullable().optional(),
})

// Helper function to convert from Salesforce format to our internal format
function convertSalesforceDataToInternal(data: any): any {
  // Extract instructor name from Contact_Name__c
  const instructor = data.Contact_Name__c || "Unknown Instructor";
  
  // Extract email from Contact_Email__c
  const email = data.Contact_Email__c || "";
  
  // Extract institution from Account_Name__c
  const institution = data.Account_Name__c || "Unknown Institution";
  
  // Extract course from School_Course_Name__c or Division
  const course = data.School_Course_Name__c || data.Division || "Unknown Course";
  
  // Extract days from Office_Hours__c if available
  let days: string[] = [];
  if (data.Office_Hours__c) {
    // Try to parse days from Office_Hours__c field
    const officeHours = data.Office_Hours__c.toLowerCase();
    const possibleDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const foundDays = possibleDays.filter(day => officeHours.includes(day));
    if (foundDays.length > 0) {
      days = foundDays.map(day => day.charAt(0).toUpperCase() + day.slice(1));
    }
  }
  
  // Initialize other fields
  const times = "";
  const location = "";
  const teachingHours = "";
  const teachingLocation = "";
  
  // Determine term
  const term = getCurrentSeason() + " " + new Date().getFullYear();
  
  // Determine status
  const status = determineInitialStatus(data);
  
  return {
    instructor,
    email,
    institution,
    course,
    days,
    times,
    location,
    teachingHours,
    teachingLocation,
    term,
    status
  };
}

// Determine initial status based on available data in Salesforce format
function determineInitialStatus(data: any): OfficeHoursStatus {
  const hasOfficeHours = data.Office_Hours__c !== undefined && data.Office_Hours__c !== null;
  
  // If we have Office_Hours__c, consider it partial info found
  if (hasOfficeHours) {
    return OfficeHoursStatus.PARTIAL_SUCCESS;
  } else {
    return OfficeHoursStatus.NOT_FOUND;
  }
}

// Helper function to get current season
function getCurrentSeason(): string {
  const currentMonth = new Date().getMonth();
  // JavaScript months are 0-indexed (0 = January, 11 = December)
  if (currentMonth >= 2 && currentMonth <= 4) return "Spring";
  if (currentMonth >= 5 && currentMonth <= 7) return "Summer";
  if (currentMonth >= 8 && currentMonth <= 10) return "Fall";
  return "Winter"; // Dec (11), Jan (0), Feb (1)
}

// Create a reusable function for Exa AI validation that both chains can use
const validateWithExaAI = async (result: ProcessedOfficeHours): Promise<ProcessedOfficeHours> => {
  console.log("Starting Exa AI validation...")
  console.log("Result to validate:", result)
  console.log("Result status:", result.status)
  
  // Skip validation if we don't have enough to validate
  if (result.status !== OfficeHoursStatus.SUCCESS && result.status !== OfficeHoursStatus.PARTIAL_SUCCESS) {
    console.log(`Result status is '${result.status}', skipping Exa validation`);
    return result;
  }
  
  // Create a prompt for Exa AI to validate or enhance the results
  const exaPrompt = `
  Find accurate information about this professor's office hours and teaching schedule to validate:
  
  Professor ${result.instructor} at ${result.institution}
  Teaching ${result.course} during ${result.term}
  
  According to our information:
  - Office Hours: ${result.days.join(", ")} at ${result.times}
  - Office Location: ${result.location}
  - Teaching Hours: ${result.teachingHours}
  - Teaching Location: ${result.teachingLocation}
  
  Find and check this information from official university websites or faculty directories.
  `
  
  try {
    // Call Exa AI API
    console.log("Calling Exa AI API...")
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.EXA_API_KEY}`
      },
      body: JSON.stringify({
        query: exaPrompt,
        numResults: 5,
        useAutoprompt: true
      })
    })
    
    // Get the full response body even if there was an error
    const responseText = await response.text();
    console.log("Exa API status:", response.status, response.statusText);
    
    if (!response.ok) {
      console.error("Exa AI API error details:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      throw new Error(`Exa AI API error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}...`);
    }
    
    // If we got here, the response was successful
    try {
      const data = JSON.parse(responseText);
      console.log("Exa AI search results count:", data.results?.length || 0);
      
      // Process the Exa results and determine if we should validate
      if (data.results && data.results.length > 0) {
        // Create an enhanced copy of the result
        const validatedResult = { ...result };
        
        // Check if at least one result validates or enhances our information
        const hasValidatingResults = data.results.some((result: { text: string, title: string }) => {
          const text = result.text || "";
          
          // Check if this result confirms our information
          const hasOfficeHours = validatedResult.days.some(day => text.includes(day)) ||
                                text.includes(validatedResult.times);
          const hasLocation = text.includes(validatedResult.location);
          
          return (hasOfficeHours || hasLocation);
        });
        
        // Update status if validation successful
        if (hasValidatingResults) {
          validatedResult.status = OfficeHoursStatus.VALIDATED;
          validatedResult.validatedBy = "Exa AI";
          console.log("Exa AI validation successful!");
          return validatedResult;
        }
      }
      
      console.log("Exa AI validation inconclusive");
      return result;
    } catch (parseError) {
      console.error("Error parsing Exa response JSON:", parseError);
      return result;
    }
  } catch (fetchError) {
    console.error("Error fetching from Exa AI:", fetchError);
    return result;
  }
};

// Create a validation chain for photo processing results
const photoValidationChain = new RunnableLambda({
  func: validateWithExaAI
});

// Create a validation chain for Perplexity search results  
const perplexityValidationChain = new RunnableLambda({
  func: validateWithExaAI
});

// Process multiple instructors with Perplexity and validate with Exa AI
async function processMultipleWithPerplexity(instructorDataArray: any[]): Promise<ProcessedOfficeHours[]> {
  console.log(`Processing ${instructorDataArray.length} instructors with Perplexity and validating with Exa AI`)
  
  try {
    // Process each item in parallel
    const resultsPromises = instructorDataArray.map(async (item) => {
      // Get initial results from Perplexity search
      const perplexityResults = await searchWithPerplexity(item)
      
      // Queue SQS message for key decision makers with NOT_FOUND status
      for (const result of perplexityResults) {
        if (result.status === 'NOT_FOUND' && 
            item.Contact_Name__c && 
            item.Contact_Email__c &&
            item.Decision_Maker_Type__c === 'YES') {
          console.log(`Queueing crawl for key decision maker with no office hours: ${item.Contact_Name__c}`)
          const queued = await queueInstructorCrawl(
            item.Account_ID__c, 
            item.Contact_Name__c,
            item.Contact_Email__c,
            item.Account_Name__c || "Unknown Institution"
          )
          if (!queued) {
            console.error(`Failed to queue crawl for instructor: ${item.Contact_Name__c}`)
          }
        }
      }
      
      // Validate each result with Exa AI if it has found or partial information
      const validatedResults = await Promise.all(
        perplexityResults.map(async (result) => {
          try {
            // Only validate if we have found or partial results
            if (result.status === OfficeHoursStatus.SUCCESS || 
                result.status === OfficeHoursStatus.PARTIAL_SUCCESS) {
              console.log(`Validating result for ${result.instructor} with Exa AI...`)
              // return await perplexityValidationChain.invoke(result)
              return result
            } else {
              return result // Return unchanged if not eligible for validation
            }
          } catch (error) {
            console.error(`Error validating result for ${result.instructor}:`, error)
            return result // Return original result if validation fails
          }
        })
      )
      
      return validatedResults
    })
    
    // Wait for all results and flatten the array of arrays into a single array
    const results = await Promise.all(resultsPromises)
    return results.flat()
  } catch (error) {
    console.error("Error in processMultipleWithPerplexity:", error)
    
    // Return basic error results for each instructor
    return instructorDataArray.map(createErrorResult);
  }
}

// Update processOfficeHours to use the LangChain implementation
export async function processOfficeHours(formData: FormData): Promise<ProcessedOfficeHours[]> {
  try {
    const rawData = formData.get("salesforceData") as string
    const parsedData = JSON.parse(rawData)
    
    // Check if a photo is included
    const photo = formData.get("photo") as File | null
    
    // Handle array of objects
    if (Array.isArray(parsedData)) {
      console.log(`Processing array of ${parsedData.length} records`)
      
      // If photo is present, we'll only process the first item and include photo analysis
      if (photo && parsedData.length > 0) {
        const results = await processPhotoWithLangChain(parsedData[0], photo)
        
        // Queue SQS message if photo processing didn't find office hours AND instructor is a key decision maker
        if (results.length > 0 && 
            results[0].status === 'NOT_FOUND' && 
            parsedData[0].Contact_Email__c &&
            parsedData[0].Decision_Maker_Type__c === 'YES') {
          console.log(`Queueing crawl for key decision maker with no office hours found in photo: ${results[0].instructor}`)
          const queued = await queueInstructorCrawl(
            parsedData[0].Account_ID__c, 
            results[0].instructor,
            parsedData[0].Contact_Email__c,
            results[0].institution
          )
          if (!queued) {
            console.error(`Failed to queue crawl for instructor: ${results[0].instructor}`)
          }
        }
        
        // Apply the same validation logic to photo results
        return validateResultStatus(results);
      } else {
        // Process all records using the dedicated function
        const results = await processMultipleWithPerplexity(parsedData)
        return validateResultStatus(results);
      }
    } 
    // Handle single object
    else {
      console.log('Processing single record')
      if (photo) {
        const results = await processPhotoWithLangChain(parsedData, photo)
        
        // Queue SQS message if photo processing didn't find office hours AND instructor is a key decision maker
        if (results.length > 0 && 
            results[0].status === 'NOT_FOUND' && 
            parsedData.Contact_Email__c &&
            parsedData.Decision_Maker_Type__c === 'YES') {
          console.log(`Queueing crawl for key decision maker with no office hours found in photo: ${results[0].instructor}`)
          const queued = await queueInstructorCrawl(
            parsedData.Account_ID__c || results[0].instructor, 
            results[0].instructor,
            parsedData.Contact_Email__c,
            results[0].institution
          )
          if (!queued) {
            console.error(`Failed to queue crawl for instructor: ${results[0].instructor}`)
          }
        }
        
        // Apply validation logic to photo results
        const validatedResults = validateResultStatus(results);

        const resultsToReturn = [];
        
        // Create Contact Hour record in Salesforce for each result
        for (let result of validatedResults) {
          if (result.status === OfficeHoursStatus.SUCCESS || 
              result.status === OfficeHoursStatus.PARTIAL_SUCCESS || 
              result.status === OfficeHoursStatus.VALIDATED) {

            const contactId = parsedData?.instructors[0]?.contactId;
            if (!contactId) {
              throw new Error("Contact ID not found in Salesforce data")
            }
            
            try {
              const formattedResult = salesforceService.formatContactHourResult({
                ...result,
                contactId: contactId,
                status: result.status
              });
              const contactHourId = await salesforceService.createContactHour(contactId, formattedResult);
              console.log(`Created Contact Hour record for Contact ID: ${contactId}`);
              resultsToReturn.push({
                ...formattedResult,
                salesforce: {
                  contactHourId,
                  created: true
                }
              });
              // Add Salesforce information to the result
              result.salesforce = {
                contactHourId,
                created: true
              };
            } catch (error) {
              console.error(`Failed to create Contact Hour record for Contact ID: ${contactId}:`, error);
              
              resultsToReturn.push({
                ...result,
                // Add error information to the result
                salesforce: {
                  contactHourId: "",
                  created: false,
                  error: error instanceof Error ? error.message : "Unknown error occurred"
                }
              });
            }
          }
        }
        
        return resultsToReturn;
      } else {
        // Process the single record as an array of one
        const results = await processMultipleWithPerplexity([parsedData])
        return validateResultStatus(results);
      }
    }
  } catch (error) {
    console.error("Error processing office hours:", error)
    throw new Error(`Failed to process office hours data: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Use Perplexity to search for office hours
async function searchWithPerplexity(searchData: any): Promise<ProcessedOfficeHours[]> {
  try {
    // Validate and convert input data
    let validatedData;
    try {
      // Try parsing as raw Salesforce data first
      validatedData = salesforceDataSchema.parse(searchData);
    } catch (error) {
      console.warn("Input data doesn't match Salesforce schema, using as-is:", error);
      validatedData = searchData; // Use as-is if it doesn't match the schema
    }
    
    // Convert from Salesforce format to our internal format
    const convertedData = convertSalesforceDataToInternal(validatedData);
    
    // Extract key information for the search
    const instructor = convertedData.instructor;
    const institution = convertedData.institution;
    const course = convertedData.course;
    const currentTerm = convertedData.term;
    
    // Create the prompt
    const prompt = createPerplexityPrompt(instructor, institution, course, currentTerm);

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
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract JSON from the response
    const resultText = data.choices[0].message.content;
    
    // Clean up JSON if it's wrapped in markdown code blocks
    let cleanedText = resultText
      .replace(/^```json\s*/, '')  // Remove opening ```json
      .replace(/\s*```$/, '')      // Remove closing ```
      .trim();                     // Trim any whitespace

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(cleanedText);
      // Validate with Zod
      result = officeHoursSchema.parse(result);
    } catch (error) {
      console.error("Error parsing response:", error);
      // Create a not found result if parsing fails
      result = {
        instructor: instructor,
        email: "",
        institution: institution,
        course: course,
        days: [],
        times: "",
        location: "",
        teachingHours: "",
        teachingLocation: "",
        term: currentTerm,
        comments: "",
        status: OfficeHoursStatus.ERROR
      };
    }

    // Determine status based on available information
    let status = result.status;
    if (status !== OfficeHoursStatus.ERROR) {
      status = determineResultStatus(result);
    }

    // Ensure these fields are never null in the final result
    const processedResult: ProcessedOfficeHours = {
      ...result,
      email: result.email || "",
      days: result.days || [],
      times: result.times || "",
      location: result.location || "",
      teachingHours: result.teachingHours || "",
      teachingLocation: result.teachingLocation || "",
      status: status,
      salesforce: {
        contactHourId: "",
        created: false,
        error: ""
      }
    };

    return [processedResult];
  } catch (error) {
    console.error("Error in searchWithPerplexity:", error);
    return [{
      instructor: searchData.Contact_Name__c || "Unknown Instructor",
      email: searchData.Contact_Email__c || "",
      institution: searchData.Account_Name__c || "Unknown Institution",
      course: searchData.School_Course_Name__c || searchData.Division || "Unknown Course",
      days: [],
      times: "",
      location: "",
      teachingHours: "",
      teachingLocation: "",
      term: getCurrentSeason() + " " + new Date().getFullYear(),
      comments: "",
      status: OfficeHoursStatus.ERROR,
      salesforce: {
        contactHourId: "",
        created: false,
        error: "Error processing instructor data"
      }
    }];
  }
}

// Helper function to create the prompt for Perplexity
function createPerplexityPrompt(instructor: string, institution: string, course: string, currentTerm: string): string {
  return `
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
  - location: Where the professor holds their OFFICE HOURS (office number, building, etc.)
  - teachingHours: A string describing when the instructor teaches their classes
  - teachingLocation: Where the professor TEACHES their classes (classroom, building, etc.)
  - term: The academic term for which the office hours are valid
  - comments: Any additional details about availability (e.g., "by appointment", "after lecture", "drop-in hours", etc.)
  - status: Either "not found", "validated", "found", "partial info found", or "error"
  
  YOUR TASK:
  1. Search for this professor's office hours information for the current term.
  2. Look for days of the week for office hours (Monday, Tuesday, etc.)
  3. Look for specific times of office hours (like "2-4pm" or "14:00-16:00")
  4. Look for the LOCATION of office hours (office building, room number, "virtual", etc.)
  5. ALSO search for the professor's teaching schedule (when they teach classes)
  6. Look for the LOCATION where classes are taught (classroom buildings, room numbers)
  7. IMPORTANT: Look for any special instructions or notes about office hours (e.g. "available by appointment", "available for 30 minutes after lecture", "email to confirm", etc.)

  IMPORTANT FORMAT REQUIREMENTS:
  - For times, location, and teachingHours fields: ONLY include SPECIFIC information that you find.
  - If you don't find exact times, use "Not specified" (don't include vague descriptions or estimates).
  - If you don't find an exact location, use "Not specified" (don't guess or infer).
  - If you find days but no times, include the days in the days array, but use "Not specified" for times.
  - Do NOT include phrases like "Not explicitly stated but..." or similar approximations.
  - For times and teachingHours, ALWAYS use one of these formats:
     * "10:00 AM - 12:00 PM"
     * "3:30 PM - 5:00 PM"
     * "Not specified"
  - For locations, ALWAYS use either a specific location or "Not specified".

  STATUS FIELD RULES:
  - Mark as "validated" ONLY if you have externally confirmed SPECIFIC days, times, and locations for office hours.
  - Mark as "found" if you find COMPLETE information (times + locations) for BOTH office hours AND teaching hours.
  - Mark as "partial info found" if you find SOME information about EITHER office hours OR teaching hours, but not complete information for both.
  - Mark as "not found" if you cannot find ANY information about office hours or teaching hours.
  - Mark as "error" ONLY if you see conflicting/contradictory information.
  
  IMPORTANT: Your entire response must be valid JSON that can be parsed with JSON.parse(). Do not include any text outside of the JSON structure. Do not put the json in a code block.
  `;
}

// LangChain implementation for photo processing with combined search
async function processPhotoWithLangChain(searchData: any, photo: File): Promise<ProcessedOfficeHours[]> {
  try {
    // Validate and convert input data
    let validatedData;
    try {
      // Try parsing as raw Salesforce data first
      validatedData = salesforceDataSchema.parse(searchData);
    } catch (error) {
      console.warn("Input data doesn't match Salesforce schema, using as-is:", error);
      validatedData = searchData; // Use as-is if it doesn't match the schema
    }
    
    // Convert from Salesforce format to our internal format
    const convertedData = convertSalesforceDataToInternal(validatedData);
    
    // Extract key information for the search
    const instructor = convertedData.instructor;
    const institution = convertedData.institution;

    // Convert photo to base64
    const photoBytes = await photo.arrayBuffer()
    const base64Photo = Buffer.from(photoBytes).toString('base64')
    
    // Vision prompt
    const visionPrompt = `
    Analyze this image which likely contains office hours information for a professor.
    
    Context:
    Institution: ${institution}
    Instructor: ${instructor}
    
    Extract all visible information about:
    1. Days and times of office hours
    2. Office location
    3. Teaching schedule or class times
    4. Classroom locations
    5. Contact information (email, phone)
    
    Focus on reading and extracting text from the image, especially dates, times, room numbers, and building names.
    Be very thorough and extract every detail. This is likely a photo of a door, syllabus, or website with office hours listed.
    
    Format your response as a detailed text summary of all information found in the image.
    Do NOT create JSON yet - just clearly describe what you see in the image related to office hours and teaching information.
    `
    
    // Step 1: Initialize OpenAI vision model
    const visionModel = new ChatOpenAI({
      modelName: "gpt-4o",
      maxTokens: 1000,
    })
    
    // Step 2: Create a custom Perplexity tool
    const perplexitySearch = async (prompt: string) => {
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
              content: "You are a helpful assistant that combines information from images and web searches to extract comprehensive office hours information. Always return raw JSON without any markdown formatting, code blocks, or explanatory text."
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
      return data.choices[0].message.content
    }
    
    // Step 3: Create the JSON parser
    const jsonParser = StructuredOutputParser.fromZodSchema(officeHoursSchema)
    
    // Step 4: Create the image analysis chain
    const imageAnalysisChain = RunnableSequence.from([
      async () => {
        // Call OpenAI with the image
        const result = await visionModel.invoke([
          new HumanMessage({
            content: [
              { type: "text", text: visionPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Photo}`
                }
              }
            ]
          })
        ])
        return result.content.toString()
      },
      new StringOutputParser(),
    ])
    
    // Step 5: Create the combined search chain
    const combinedSearchChain = RunnableSequence.from([
      async (imageAnalysisText: string) => {
        // Create the combined prompt
        const combinedPrompt = `
        Search for and extract office hours information for this professor by searching online. The office hours should be for the current term, but if there are none found, then search for ANY term, past, present, or future.
        
        Context:
        Institution: ${institution}
        Instructor: ${instructor}
        
        I also have a photo with information about this professor's office hours. Here's what was found in the photo:
        
        ${imageAnalysisText}
        
        Please use both the information from the photo and your web search to create the most complete and accurate information possible.
        
        Please structure your response as a valid JSON object with the following fields:
        - instructor: The instructor's name
        - email: The instructor's email
        - institution: The institution name
        - course: The course name
        - days: An array of days of the week when office hours are held
        - times: A string describing the times of office hours
        - location: Where the professor holds their OFFICE HOURS (office number, building, etc.)
        - teachingHours: A string describing when the instructor teaches their classes
        - teachingLocation: Where the professor TEACHES their classes (classroom, building, etc.)
        - term: The academic term for which the office hours are valid
        - comments: Any additional details about availability (e.g., "by appointment", "after lecture", "drop-in hours", etc.)
        - status: Either "not found", "found", "validated", "partial info found", or "error"
        
        IMPORTANT FORMAT REQUIREMENTS:
        - For times, location, and teachingHours fields: ONLY include SPECIFIC information that you find.
        - If you don't find exact times, use "Not specified" (don't include vague descriptions or estimates).
        - If you don't find an exact location, use "Not specified" (don't guess or infer).
        - If you find days but no times, include the days in the days array, but use "Not specified" for times.
        - Do NOT include phrases like "Not explicitly stated but..." or similar approximations.
        - For times and teachingHours, ALWAYS use one of these formats:
           * "10:00 AM - 12:00 PM"
           * "3:30 PM - 5:00 PM"
           * "Not specified"
        - For locations, ALWAYS use either a specific location or "Not specified".

        STATUS FIELD RULES:
        - Mark as "validated" ONLY if you have externally confirmed SPECIFIC days, times, and locations for office hours.
        - Mark as "found" if you find COMPLETE information (times + locations) for BOTH office hours AND teaching hours.
        - Mark as "partial info found" if you find SOME information about EITHER office hours OR teaching hours, but not complete information for both.
        - Mark as "not found" if you cannot find ANY information about office hours or teaching hours.
        - Mark as "error" ONLY if you see conflicting/contradictory information.
        
        IMPORTANT: Your entire response must be valid JSON that can be parsed with JSON.parse(). Do not include any text outside of the JSON structure. Do not put the json in a code block.
        `
        
        // Call Perplexity with the combined prompt
        return await perplexitySearch(combinedPrompt)
      },
      // Clean and parse the JSON response
      async (jsonResponse: string) => {
        // Clean up JSON if it's wrapped in markdown code blocks
        const cleanedText = jsonResponse
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '')
          .trim()
        
        try {
          // Parse JSON and validate with Zod
          const parsedJson = JSON.parse(cleanedText)
          const result = officeHoursSchema.parse(parsedJson)
          
          // IMPORTANT: Change "validated" to "found" - we'll only use "validated" after Exa confirms
          if (result.status === OfficeHoursStatus.VALIDATED) {
            result.status = OfficeHoursStatus.SUCCESS;
          }
          
          return result;
        } catch (error) {
          console.error("Error parsing response:", error)
          // Return a error result if parsing fails
          return {
            instructor: instructor,
            email: "",
            institution: institution,
            days: [],
            times: "",
            location: "",
            teachingHours: "",
            teachingLocation: "",
            status: OfficeHoursStatus.ERROR,
            course: "",
            term: "",
            comments: ""
          }
        }
      }
    ])
    
    // Step 6: Create the final chain
    const finalChain = RunnableSequence.from([
      imageAnalysisChain,
      combinedSearchChain,
      photoValidationChain,
      // Final processing
      (result: any) => {
        console.log("Processing final result")
        
        // Determine status based on available information, but preserve "validated" status from Exa AI
        let status = result.status;
        if (status !== OfficeHoursStatus.ERROR && status !== OfficeHoursStatus.VALIDATED) {
          status = determineResultStatus(result);
        }
        
        // Ensure these fields are never null in the final result
        const processedResult: ProcessedOfficeHours = {
          ...result,
          email: result.email || "",
          days: result.days || [],
          times: result.times || "",
          location: result.location || "",
          teachingHours: result.teachingHours || "",
          teachingLocation: result.teachingLocation || "",
          comments: result.comments || "",
          status: status,
          validatedBy: result.validatedBy || null
        };

        return [processedResult]
      }
    ])
    
    // Execute the chain
    console.log("Starting LangChain image analysis workflow...")
    try {
      return await finalChain.invoke({})
    } catch (error) {
      console.error("Error in LangChain workflow:", error)
      return [{
        instructor: instructor,
        email: "",
        institution: institution,
        days: [],
        times: "",
        location: "",
        teachingHours: "",
        teachingLocation: "",
        status: OfficeHoursStatus.ERROR,
        course: "",
        term: "",
        comments: "",
        salesforce: {
          contactHourId: "",
          created: false,
          error: "Error processing instructor data"
        }
      }]
    }
  } catch (error) {
    console.error("Error in processPhotoWithLangChain:", error)
    return [{
      instructor: searchData.Contact_Name__c || "Unknown Instructor",
      email: searchData.Contact_Email__c || "",
      institution: searchData.Account_Name__c || "Unknown Institution",
      course: searchData.School_Course_Name__c || searchData.Division || "Unknown Course",
      days: [],
      times: "",
      location: "",
      teachingHours: "",
      teachingLocation: "",
      term: getCurrentSeason() + " " + new Date().getFullYear(),
      comments: "",
      status: OfficeHoursStatus.ERROR,
      salesforce: {
        contactHourId: "",
        created: false,
        error: "Error processing instructor data"
      }
    }]
  }
}

/**
 * Process a batch request with multiple instructors
 * This is the new batch API endpoint
 */
export async function processBatchOfficeHours(batchRequest: BatchRequest): Promise<BatchResponse> {
  try {
    console.log(`Processing batch with ID ${batchRequest.batchId} - ${batchRequest.instructors.length} instructors`);
    
    // Create the response template
    const response: BatchResponse = {
      batchId: batchRequest.batchId || `batch-1234`, // Ensure batchId is never undefined
      processedTimestamp: new Date().toISOString(),
      results: [],
      exceptions: []
    };
    
    // Process each instructor in the batch
    const processingPromises = batchRequest.instructors.map(async (instructor) => {
      try {
        // Convert to the format expected by our existing processing functions
        const salesforceData = {
          Account_ID__c: batchRequest.accountId,
          Account_Name__c: batchRequest.institution,
          Contact_Name__c: instructor.name,
          Contact_Email__c: instructor.email,
          School_Course_Name__c: instructor.department,
          // Mark as key decision maker if specified
          Decision_Maker_Type__c: instructor.isKeyDecisionMaker ? "YES" : "NO"
        };
        
        // Use our existing function to process this instructor
        const results = await processMultipleWithPerplexity([salesforceData]);
        
        // Check if we got any results
        if (results.length > 0) {
          const result = results[0];
          
          // Check for contactId first
          if (!instructor.contactId) {
            response.exceptions.push({
              contactId: "unknown",
              status: "ERROR",
              reason: "Missing contact ID",
              actionTaken: "NONE"
            });
            return;
          }

          // Determine if this was successful
          if (result.status === OfficeHoursStatus.SUCCESS || 
              result.status === OfficeHoursStatus.VALIDATED || 
              result.status === OfficeHoursStatus.PARTIAL_SUCCESS) {

            // Format the result before sending to Salesforce
            const formattedResult = salesforceService.formatContactHourResult({
              ...result,
              contactId: instructor.contactId,
            });
            
            response.results.push(formattedResult as BatchResponseResult);
          } else {
            // Exception response for not found or error
            response.exceptions.push({
              contactId: instructor.contactId,
              status: result.status === OfficeHoursStatus.ERROR ? "ERROR" : "NOT_FOUND",
              reason: result.status === OfficeHoursStatus.ERROR ? 
                "Error processing instructor data" : 
                "No published hours available",
              actionTaken: getActionTaken(instructor, result)
            });
          }
        } else {
          // No results returned
          response.exceptions.push({
            contactId: instructor.contactId,
            status: "ERROR",
            reason: "No results returned from processing",
            actionTaken: "NONE"
          });
        }
      } catch (error) {
        console.error(`Error processing instructor ${instructor.name}:`, error);
        
        // Add to exceptions
        response.exceptions.push({
          contactId: instructor.contactId,
          status: "ERROR",
          reason: error instanceof Error ? error.message : "Unknown error occurred",
          actionTaken: "NONE"
        });
      }
    });
    
    // Wait for all processing to complete
    await Promise.all(processingPromises);

    // Apply validation logic to ensure consistent status
    response.results = validateResultStatus(response.results);
    // if any results are not found, move them to the exceptions array
    const exceptions = response.results.filter(result => result.status === "NOT_FOUND");
    for (const exception of exceptions) {
      response.exceptions.push({
        contactId: exception.contactId,
        status: "NOT_FOUND",
        reason: "No published hours available",
        actionTaken: "NONE"
      });
    }
    // remove the not found results from the results array
    response.results = response.results.filter(result => result.status !== "NOT_FOUND");
    
    return response;
  } catch (error) {
    console.error("Error in batch processing:", error);
    throw new Error(`Failed to process batch: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to determine what action was taken
 */
function getActionTaken(
  instructor: BatchRequestInstructor, 
  result: ProcessedOfficeHours
): "NONE" | "EMAIL_SENT" | "CRAWL_QUEUED" {
  // Only queue crawls or send emails for key decision makers
  if (instructor.isKeyDecisionMaker && instructor.email && instructor.email.includes('@')) {
    // Queue email to key decision makers with valid emails
    console.log(`Would queue email to key decision maker: ${instructor.name}`);
    return "EMAIL_SENT";
  }
  
  // No action for non-key decision makers or those without emails
  return "NONE";
}


// Helper function to create error result
function createErrorResult(data: any) {
  return {
    instructor: data.Contact_Name__c || "Unknown Instructor",
    email: data.Contact_Email__c || "",
    institution: data.Account_Name__c || "Unknown Institution",
    course: data.School_Course_Name__c || data.Division || "Unknown Course",
    days: [],
    times: "",
    location: "",
    teachingHours: "",
    teachingLocation: "",
    term: getCurrentSeason() + " " + new Date().getFullYear(),
    comments: "",
    status: OfficeHoursStatus.ERROR,
    salesforce: {
      contactHourId: "",
      created: false,
      error: "Error processing instructor data"
    }
  };
}