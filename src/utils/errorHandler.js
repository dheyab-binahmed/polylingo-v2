/**
 * Error Handling Utilities
 * Centralized error message extraction and formatting
 */

/**
 * Extract a readable error message from various error types
 * @param {Error|string|object|unknown} error - The error object
 * @returns {string} A readable error message
 */
export function getErrorMessage(error) {
  // If it's already a string, return it
  if (typeof error === "string") {
    return error.trim() || "An unknown error occurred";
  }

  // If it's an Error object
  if (error instanceof Error) {
    return error.message || "An unknown error occurred";
  }

  // If it's an object with error properties
  if (typeof error === "object" && error !== null) {
    const message =
      error.message ||
      error.error ||
      error.detail ||
      error.msg ||
      (Array.isArray(error.errors) && error.errors[0]) ||
      (error.errors && typeof error.errors === "string" && error.errors);

    if (message) {
      return String(message).trim() || "An unknown error occurred";
    }

    // Try to stringify as last resort
    try {
      return JSON.stringify(error);
    } catch (_) {
      return "An unknown error occurred";
    }
  }

  // Fallback for any other type
  return "An unknown error occurred";
}

/**
 * Get user-friendly error message based on HTTP status code
 * @param {number} status - HTTP status code
 * @param {string} defaultMessage - Default message to use
 * @returns {string} User-friendly error message
 */
export function getStatusErrorMessage(status, defaultMessage = "") {
  const statusMessages = {
    400: "Invalid input. Please check your information.",
    401: "Invalid email or password. Please try again.",
    403: "Access denied. You do not have permission.",
    404: "Resource not found.",
    409: "This email is already registered. Please use a different email or login.",
    429: "Too many attempts. Please try again later.",
    500: "Server error. Please try again later.",
    502: "Service unavailable. Please try again later.",
    503: "Service temporarily unavailable. Please try again later.",
  };

  return (
    statusMessages[status] ||
    defaultMessage ||
    "An error occurred. Please try again."
  );
}

/**
 * Format error for display to user
 * @param {Error|string|object|unknown} error - The error object
 * @param {number} status - Optional HTTP status code
 * @returns {string} Formatted error message
 */
export function formatErrorForDisplay(error, status = null) {
  let message = getErrorMessage(error);

  // If we have a status code, try to provide a better message
  if (status && typeof status === "number") {
    // Don't override good messages with generic ones
    if (
      message === "An unknown error occurred" ||
      message.includes("Request failed")
    ) {
      message = getStatusErrorMessage(status, message);
    }
  }

  return message;
}

/**
 * Check if an error is a network error
 * @param {Error|unknown} error - The error object
 * @returns {boolean}
 */
export function isNetworkError(error) {
  if (error instanceof TypeError) {
    return error.message.includes("fetch") || error.message.includes("network");
  }
  return false;
}

/**
 * Check if an error is a timeout error
 * @param {Error|unknown} error - The error object
 * @returns {boolean}
 */
export function isTimeoutError(error) {
  if (error instanceof Error) {
    return (
      error.message.includes("timeout") || error.message.includes("aborted")
    );
  }
  return false;
}

/**
 * Log error for debugging without exposing sensitive info
 * @param {Error|unknown} error - The error object
 * @param {string} context - Context description for the error
 */
export function logError(error, context = "") {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : "";
  const message = getErrorMessage(error);

  console.error(`${timestamp}${contextStr}: ${message}`, error);
}

export default {
  getErrorMessage,
  getStatusErrorMessage,
  formatErrorForDisplay,
  isNetworkError,
  isTimeoutError,
  logError,
};
