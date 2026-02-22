import { format, isSameYear, isToday } from "date-fns";

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (isToday(date)) {
    return format(date, "h:mm a"); // e.g., 2:34 PM
  }

  if (isSameYear(date, now)) {
    return format(date, "MMM d, h:mm a"); // e.g., Feb 15, 2:34 PM
  }

  return format(date, "MMM d, yyyy, h:mm a"); // e.g., Feb 15, 2024, 2:34 PM
}
