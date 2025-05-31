import { OfficeHoursStatus } from "@/types/salesforce";

type StatusType = "VALIDATED" | "SUCCESS" | "PARTIAL_SUCCESS" | "NOT_FOUND" | "ERROR";

// Function to generate status styling class
export const getStatusClass = (status: StatusType) => {
  switch(status) {
    case "VALIDATED":
      return "text-green-600 font-bold";
    case "SUCCESS":
      return "text-green-600";
    case "NOT_FOUND":
      return "text-yellow-600";
    case "PARTIAL_SUCCESS":
      return "text-blue-600";
    default:
      return "text-red-600";
  }
};

// Helper functions
export function formatStatus(status: StatusType): string {
  return status
    ? status
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    : '';
}

// helper to render check if SUCCESS or PARTIAL_SUCCESS
export function renderStatusIcon(status: StatusType): React.ReactNode {
  return status === "SUCCESS" || status === "PARTIAL_SUCCESS"
    ? <span className="ml-1 text-xs">✓</span>
    : null;
}
