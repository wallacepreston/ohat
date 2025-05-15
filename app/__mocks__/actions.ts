// Import the actual function to preserve its behavior
import { parseTimeString as originalParseTimeString } from "../timeUtils";

// Export the function we want to test directly
export const parseTimeString = originalParseTimeString; 