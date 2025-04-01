/**
 * Logger utility for formatting console output
 */

// Utility function for formatting log messages
export function formatLogMessage(message: string, isError = false): string {
  const timestamp = new Date().toISOString();
  const prefix = isError ? "❌" : "🔹";
  return `\n${prefix} [${timestamp}] ${message}`;
}

// Utility function for truncating long response text
export function truncateText(text: string, maxLength = 500): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}... [truncated, total length: ${text.length}]`;
}

// Utility function to format JSON data for logging
export function formatJsonForLog(data: any): string {
  try {
    const isObject = typeof data === 'object' && data !== null;
    if (isObject) {
      // Use JSON.stringify with indentation for pretty printing, but limit depth
      return truncateText(JSON.stringify(data, null, 2));
    }
    return String(data);
  } catch (error) {
    return `[Error formatting data: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

// Helper to log formatted messages to console
export function log(message: string, isError = false): void {
  console.error(formatLogMessage(message, isError));
}

// Helper to log objects/JSON data
export function logJson(label: string, data: any): void {
  console.error(`${label}: ${formatJsonForLog(data)}`);
} 