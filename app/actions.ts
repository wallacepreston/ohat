"use server"

import { z } from "zod"
import type { SalesforceData, ProcessedOfficeHours } from "@/types/salesforce"
import { OfficeHoursStatus } from "@/types/salesforce"
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { StructuredOutputParser } from "langchain/output_parsers"
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables"
import { StringOutputParser } from "@langchain/core/output_parsers"

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
})

// Define the schema for structured output from AI processing
const officeHoursSchema = z.object({
  instructor: z.string(),
  email: z.string().nullable().default(""),
  institution: z.string(),
  course: z.string(),
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
    return OfficeHoursStatus.PARTIAL_INFO_FOUND;
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
        return await processPhotoWithLangChain(parsedData[0], photo)
      } else {
        // Process each item in parallel and combine results
        const resultsPromises = parsedData.map(item => searchWithPerplexity(item))
        const results = await Promise.all(resultsPromises)
        
        // Flatten the array of arrays into a single array
        return results.flat()
      }
    } 
    // Handle single object
    else {
      console.log('Processing single record')
      if (photo) {
        return await processPhotoWithLangChain(parsedData, photo)
      } else {
        return await searchWithPerplexity(parsedData)
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
      status: status
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
      status: OfficeHoursStatus.ERROR
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
  - status: Either "not found", "validated", "found", "partial info found", or "error"
  
  YOUR TASK:
  1. Search for this professor's office hours information for the current term.
  2. Look for days of the week for office hours (Monday, Tuesday, etc.)
  3. Look for specific times of office hours (like "2-4pm" or "14:00-16:00")
  4. Look for the LOCATION of office hours (office building, room number, "virtual", etc.)
  5. ALSO search for the professor's teaching schedule (when they teach classes)
  6. Look for the LOCATION where classes are taught (classroom buildings, room numbers)

  IMPORTANT FORMATTING INSTRUCTIONS:
  - If there are multiple times and locations for either office hours or teaching, include the time with each location.
    For example: "CDL room 110 (3:50-5:10 pm), CDL room 102 (5:40-7:00 pm)" instead of just "CDL room 110, CDL room 102"
  - When there are both in-person and virtual locations, specify which days/times apply to each.
    For example: "Room 102 (Wednesday 7:00-7:30 pm), Virtual via Zoom (Thursday and Sunday 8:00-9:00 pm)"
  - Include day information along with times when different locations are used on different days
  - Make sure to match each time/day with its corresponding location when listing multiple locations.

  Only mark status as "validated" if you find SPECIFIC days, times, and locations for both office hours and teaching hours.
  Mark as "found" if you find complete information that hasn't been externally validated.
  Mark as "partial info found" if you find some information (like office hours but not teaching hours, or times but not locations).
  Only mark as "not found" if you cannot find ANY information about office hours or teaching.
  Mark as "error" if you see conflicting information.
  
  IMPORTANT: Your entire response must be valid JSON that can be parsed with JSON.parse(). Do not include any text outside of the JSON structure. Do not put the json in a code block.
  `;
}

// Helper to determine result status based on available information
function determineResultStatus(result: any): OfficeHoursStatus {
  const hasOfficeHours = result.times && result.times.trim() !== "";
  const hasOfficeLocation = result.location && result.location.trim() !== "";
  const hasTeachingHours = result.teachingHours && result.teachingHours.trim() !== "";
  const hasTeachingLocation = result.teachingLocation && result.teachingLocation.trim() !== "";
  
  if (!hasOfficeHours && !hasOfficeLocation && !hasTeachingHours && !hasTeachingLocation) {
    return OfficeHoursStatus.NOT_FOUND;
  } else if (hasOfficeHours && hasOfficeLocation && hasTeachingHours && hasTeachingLocation) {
    return OfficeHoursStatus.FOUND;
  } else {
    return OfficeHoursStatus.PARTIAL_INFO_FOUND;
  }
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
    const course = convertedData.course;
    const currentTerm = convertedData.term;

    // Convert photo to base64
    const photoBytes = await photo.arrayBuffer()
    const base64Photo = Buffer.from(photoBytes).toString('base64')
    
    // Vision prompt
    const visionPrompt = `
    Analyze this image which likely contains office hours information for a professor.
    
    Context:
    Institution: ${institution}
    Course: ${course}
    Instructor: ${instructor}
    Term: ${currentTerm}
    
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
        Course: ${course}
        Instructor: ${instructor}
        Term: ${currentTerm}
        
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
        - status: Either "not found", "found", "validated", "partial info found", or "error"
        
        IMPORTANT FORMATTING INSTRUCTIONS:
        - If there are multiple times and locations for either office hours or teaching, include the time with each location.
          For example: "CDL room 110 (3:50-5:10 pm), CDL room 102 (5:40-7:00 pm)" instead of just "CDL room 110, CDL room 102"
        - When there are both in-person and virtual locations, specify which days/times apply to each.
          For example: "Room 102 (Wednesday 7:00-7:30 pm), Virtual via Zoom (Thursday and Sunday 8:00-9:00 pm)"
        - Include day information along with times when different locations are used on different days
        - Make sure to match each time/day with its corresponding location when listing multiple locations.
      
        Only mark status as "validated" if you find SPECIFIC days, times, and locations for both office hours and teaching hours.
        Mark as "found" if you find complete information that hasn't been externally validated.
        Mark as "partial info found" if you find some information (like office hours but not teaching hours, or times but not locations).
        Only mark as "not found" if you cannot find ANY information about office hours or teaching.
        Mark as "error" if you see conflicting information.
        
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
            result.status = OfficeHoursStatus.FOUND;
          }
          
          return result;
        } catch (error) {
          console.error("Error parsing response:", error)
          // Return a error result if parsing fails
          return {
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
            status: OfficeHoursStatus.ERROR
          }
        }
      }
    ])
    
    // Step 6: Create the Exa AI validation chain with improved error logging
    const exaAIValidationChain = new RunnableLambda({
      func: async (perplexityResult: ProcessedOfficeHours) => {
        console.log("Starting Exa AI validation...")

        console.log("Perplexity result:", perplexityResult)
        console.log("Perplexity result status:", perplexityResult.status)
        
        // Skip validation if we don't have enough to validate
        if (!perplexityResult.status.includes(OfficeHoursStatus.FOUND)) {
          console.log("Result status is not 'found', skipping Exa validation");
          return perplexityResult;
        }
        
        // Create a prompt for Exa AI to validate or enhance the results
        const exaPrompt = `
        Find accurate information about this professor's office hours and teaching schedule to validate:
        
        Professor ${perplexityResult.instructor} at ${perplexityResult.institution}
        Teaching ${perplexityResult.course} during ${perplexityResult.term}
        
        According to our information:
        - Office Hours: ${perplexityResult.days.join(", ")} at ${perplexityResult.times}
        - Office Location: ${perplexityResult.location}
        - Teaching Hours: ${perplexityResult.teachingHours}
        - Teaching Location: ${perplexityResult.teachingLocation}
        
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
              const validatedResult = { ...perplexityResult };
              
              // Check if at least one result validates or enhances our information
              const hasValidatingResults = data.results.some((result: { text: string, title: string }) => {
                const text = result.text || "";
                const title = result.title || "";
                
                // Check if this result confirms our information
                const hasInstructorName = text.includes(perplexityResult.instructor);
                const hasOfficeHours = perplexityResult.days.some(day => text.includes(day)) ||
                                       text.includes(perplexityResult.times);
                const hasLocation = text.includes(perplexityResult.location);
                
                return hasInstructorName && (hasOfficeHours || hasLocation);
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
            return perplexityResult;
          } catch (parseError) {
            console.error("Error parsing Exa response JSON:", parseError);
            return perplexityResult;
          }
        } catch (fetchError) {
          console.error("Error fetching from Exa AI:", fetchError);
          return perplexityResult;
        }
      }
    })
    
    // Step 7: Create the final chain
    const finalChain = RunnableSequence.from([
      imageAnalysisChain,
      combinedSearchChain,
      exaAIValidationChain,
      // Final processing
      (result: any) => {
        console.log("Processing final result")
        
        // Determine status based on available information, but preserve "validated" status from Exa AI
        let status = result.status;
        if (status !== OfficeHoursStatus.ERROR && status !== OfficeHoursStatus.VALIDATED) {
          const hasOfficeHours = result.times && result.times.trim() !== "";
          const hasOfficeLocation = result.location && result.location.trim() !== "";
          const hasTeachingHours = result.teachingHours && result.teachingHours.trim() !== "";
          const hasTeachingLocation = result.teachingLocation && result.teachingLocation.trim() !== "";
          
          if (!hasOfficeHours && !hasOfficeLocation && !hasTeachingHours && !hasTeachingLocation) {
            status = OfficeHoursStatus.NOT_FOUND;
          } else if (hasOfficeHours && hasOfficeLocation && hasTeachingHours && hasTeachingLocation) {
            status = OfficeHoursStatus.FOUND; // Use "found" instead of "validated" for Perplexity results
          } else {
            status = OfficeHoursStatus.PARTIAL_INFO_FOUND;
          }
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
          validatedBy: result.validatedBy || null
        }
        
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
        course: course,
        days: [],
        times: "",
        location: "",
        teachingHours: "",
        teachingLocation: "",
        term: currentTerm,
        status: OfficeHoursStatus.ERROR
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
      status: OfficeHoursStatus.ERROR
    }]
  }
}