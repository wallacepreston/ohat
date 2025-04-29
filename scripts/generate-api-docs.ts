import fs from 'fs';
import path from 'path';
import { generateSchema } from '@anatine/zod-openapi';
import { z } from 'zod';

// Since we can't directly import the Zod schemas due to module issues,
// we'll create simpler versions of the schemas that match our API structure
// This approach avoids the complex module import issues

// Define basic schema types
const createTimeSlotSchema = () => z.object({
  startHour: z.string(),
  startMinute: z.string(),
  startAmPm: z.enum(["AM", "PM"]),
  endHour: z.string(),
  endMinute: z.string(),
  endAmPm: z.enum(["AM", "PM"]),
  dayOfWeek: z.string(),
  comments: z.string().optional(),
  location: z.string()
});

const createBatchRequestInstructorSchema = () => z.object({
  contactId: z.string(),
  name: z.string(),
  email: z.string(),
  department: z.string().optional().nullable(),
  isKeyDecisionMaker: z.boolean().optional().nullable()
});

const createBatchRequestSchema = () => z.object({
  accountId: z.string(),
  batchId: z.string(),
  institution: z.string(),
  instructors: z.array(createBatchRequestInstructorSchema()).nonempty()
});

const createBatchResponseResultSchema = (timeSlotSchema: z.ZodType<any>) => z.object({
  contactId: z.string(),
  status: z.enum(["SUCCESS", "PARTIAL_SUCCESS"]),
  officeHours: z.array(timeSlotSchema),
  teachingHours: z.array(timeSlotSchema),
  source: z.string()
});

const createBatchResponseExceptionSchema = () => z.object({
  contactId: z.string(),
  status: z.enum(["NOT_FOUND", "ERROR"]),
  reason: z.string(),
  actionTaken: z.enum(["NONE", "EMAIL_SENT", "CRAWL_QUEUED"])
});

const createBatchResponseSchema = (
  resultSchema: z.ZodType<any>,
  exceptionSchema: z.ZodType<any>
) => z.object({
  batchId: z.string(),
  processedTimestamp: z.string(),
  results: z.array(resultSchema),
  exceptions: z.array(exceptionSchema)
});

const createProcessedOfficeHoursSchema = () => z.object({
  instructor: z.string(),
  email: z.string(),
  institution: z.string(),
  course: z.string(),
  days: z.array(z.string()),
  times: z.string(),
  location: z.string(),
  teachingHours: z.string(),
  teachingLocation: z.string(),
  term: z.string(),
  status: z.enum(["VALIDATED", "FOUND", "PARTIAL_INFO_FOUND", "NOT_FOUND", "ERROR"]),
  validatedBy: z.string().nullable().optional()
});

/**
 * Generate OpenAPI specification from our Zod schemas
 */
function generateOpenApiSpec() {
  // Create schemas
  const timeSlotSchema = createTimeSlotSchema();
  const batchRequestInstructorSchema = createBatchRequestInstructorSchema();
  const batchRequestSchema = createBatchRequestSchema();
  const batchResponseResultSchema = createBatchResponseResultSchema(timeSlotSchema);
  const batchResponseExceptionSchema = createBatchResponseExceptionSchema();
  const batchResponseSchema = createBatchResponseSchema(
    batchResponseResultSchema,
    batchResponseExceptionSchema
  );
  const processedOfficeHoursSchema = createProcessedOfficeHoursSchema();

  // Create the base OpenAPI document
  const openApiDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Office Hours Automation Tool (OHAT) API',
      version: '1.0.0',
      description: 'API documentation for the Office Hours Automation Tool',
      contact: {
        name: 'Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'API server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
        },
      },
      schemas: {
        // Convert Zod schemas to OpenAPI schemas
        TimeSlot: {
          ...generateSchema(timeSlotSchema),
          example: {
            startHour: "09",
            startMinute: "00",
            startAmPm: "AM",
            endHour: "10",
            endMinute: "30",
            endAmPm: "AM",
            dayOfWeek: "Monday",
            comments: "Office hours are by appointment only",
            location: "Science Building, Room 301"
          }
        },
        BatchRequestInstructor: {
          ...generateSchema(batchRequestInstructorSchema),
          example: {
            contactId: "00301000ABCDEF",
            name: "John Smith",
            email: "john.smith@university.edu",
            department: "Computer Science",
            isKeyDecisionMaker: true
          }
        },
        BatchRequest: {
          ...generateSchema(batchRequestSchema),
          example: {
            accountId: "001230000ABCDEF",
            batchId: "batch-123456",
            institution: "Example University",
            instructors: [
              {
                contactId: "00301000ABCDEF",
                name: "John Smith",
                email: "john.smith@university.edu",
                department: "Computer Science"
              }
            ]
          }
        },
        BatchResponseResult: {
          ...generateSchema(batchResponseResultSchema),
          example: {
            contactId: "00301000ABCDEF",
            status: "SUCCESS",
            officeHours: [
              {
                startHour: "09",
                startMinute: "00",
                startAmPm: "AM",
                endHour: "10",
                endMinute: "30",
                endAmPm: "AM",
                dayOfWeek: "Monday",
                location: "Science Building, Room 301"
              }
            ],
            teachingHours: [
              {
                startHour: "11",
                startMinute: "00",
                startAmPm: "AM",
                endHour: "12",
                endMinute: "15",
                endAmPm: "PM",
                dayOfWeek: "Wednesday",
                location: "Main Hall 105"
              }
            ],
            source: "university website"
          }
        },
        BatchResponseException: {
          ...generateSchema(batchResponseExceptionSchema),
          example: {
            contactId: "00301000GHIJKL",
            status: "NOT_FOUND",
            reason: "Instructor not found on university website",
            actionTaken: "EMAIL_SENT"
          }
        },
        BatchResponse: {
          ...generateSchema(batchResponseSchema),
          example: {
            batchId: "batch-123456",
            processedTimestamp: "2023-10-15T14:30:45Z",
            results: [
              {
                contactId: "00301000ABCDEF",
                status: "SUCCESS",
                officeHours: [
                  {
                    startHour: "09",
                    startMinute: "00",
                    startAmPm: "AM",
                    endHour: "10",
                    endMinute: "30",
                    endAmPm: "AM",
                    dayOfWeek: "Monday",
                    location: "Science Building, Room 301"
                  }
                ],
                teachingHours: [],
                source: "university website"
              }
            ],
            exceptions: [
              {
                contactId: "00301000GHIJKL",
                status: "NOT_FOUND",
                reason: "Instructor not found on university website",
                actionTaken: "EMAIL_SENT"
              }
            ]
          }
        },
        ProcessedOfficeHours: {
          ...generateSchema(processedOfficeHoursSchema),
          example: {
            instructor: "John Smith",
            email: "john.smith@university.edu",
            institution: "Example University",
            course: "CS 101",
            days: ["Monday", "Wednesday"],
            times: "9:00 AM - 10:30 AM",
            location: "Science Building, Room 301",
            teachingHours: "MWF 11:00 AM - 12:15 PM",
            teachingLocation: "Main Hall 105",
            term: "Fall 2023",
            status: "FOUND",
            validatedBy: null
          }
        },
        OfficeHoursStatus: {
          type: 'string',
          enum: ["VALIDATED", "FOUND", "PARTIAL_INFO_FOUND", "NOT_FOUND", "ERROR"],
          description: 'Status of office hours search'
        }
      }
    },
    tags: [
      {
        name: 'Office Hours',
        description: 'API endpoints for processing office hours data',
      },
      {
        name: 'SQS',
        description: 'API endpoints for processing SQS messages',
      },
    ],
    paths: {
      '/api/office-hours': {
        post: {
          summary: 'Process a batch of instructors\' office hours data',
          description: 'Searches for office hours information for a batch of instructors.',
          tags: ['Office Hours'],
          security: [
            {
              BearerAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BatchRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/BatchResponse'
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - missing required fields',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string'
                      },
                      details: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string'
                      },
                      details: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/photo-upload': {
        post: {
          summary: 'Process office hours from a photo',
          description: 'Uploads a photo containing office hours information along with instructor data for analysis.',
          tags: ['Office Hours'],
          security: [
            {
              BearerAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: [
                    'salesforceData',
                    'photo'
                  ],
                  properties: {
                    salesforceData: {
                      type: 'string',
                      format: 'json',
                      description: 'JSON string containing instructor and institution data'
                    },
                    photo: {
                      type: 'string',
                      format: 'binary',
                      description: 'Photo file containing office hours information'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ProcessedOfficeHours'
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - missing required files or data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string'
                      },
                      details: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string'
                      },
                      details: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/process-sqs': {
        post: {
          summary: 'Process SQS messages for instructor crawls',
          description: 'Processes SQS messages containing instructor information to crawl for office hours data.',
          tags: ['SQS'],
          security: [
            {
              BearerAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'SQS messages processed successfully'
                      }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized - Invalid or missing API key',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'Unauthorized'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: false
                      },
                      error: {
                        type: 'string'
                      },
                      details: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  // Create directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'public/docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the OpenAPI spec to a JSON file
  fs.writeFileSync(
    path.join(outputDir, 'openapi.json'),
    JSON.stringify(openApiDocument, null, 2)
  );

  console.log('OpenAPI specification generated at public/docs/openapi.json');
}

// Execute the function
generateOpenApiSpec(); 