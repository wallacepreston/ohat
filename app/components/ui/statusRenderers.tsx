import { OfficeHoursStatus } from "@/types/salesforce";

// Function to generate status styling class
export const getStatusClass = (status: OfficeHoursStatus) => {
  switch(status) {
    case OfficeHoursStatus.VALIDATED:
      return "text-green-600 font-bold";
    case OfficeHoursStatus.SUCCESS:
      return "text-green-600";
    case OfficeHoursStatus.NOT_FOUND:
      return "text-yellow-600";
    case OfficeHoursStatus.PARTIAL_SUCCESS:
      return "text-blue-600";
    default:
      return "text-red-600";
  }
};

// Helper functions
export function formatStatus(status: OfficeHoursStatus): string {
  return status
    ? status
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    : '';
}

// helper to render check if SUCCESS or PARTIAL_SUCCESS
export function renderStatusIcon(status: OfficeHoursStatus): React.ReactNode {
  return status === OfficeHoursStatus.SUCCESS || status === OfficeHoursStatus.PARTIAL_SUCCESS
    ? <span className="ml-1 text-xs">✓</span>
    : null;
}
