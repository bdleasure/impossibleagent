/**
 * Centralized Error Handling System
 * 
 * This file implements a comprehensive error handling system for the ImpossibleAgent project.
 * All error handling should be centralized here to ensure consistency and maintainability.
 */

import { formatDataStreamPart } from "@ai-sdk/ui-utils";
import type { DataStreamWriter } from "ai";

// ==============================
// Error Classes
// ==============================

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor({
    message,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    isOperational = true,
    context = {},
  }: {
    message: string;
    code?: string;
    statusCode?: number;
    isOperational?: boolean;
    context?: Record<string, unknown>;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "VALIDATION_ERROR",
      statusCode: 400,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "AUTHENTICATION_ERROR",
      statusCode: 401,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for authorization failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "AUTHORIZATION_ERROR",
      statusCode: 403,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "NOT_FOUND",
      statusCode: 404,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for database operations
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "DATABASE_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for external service failures
 */
export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "EXTERNAL_SERVICE_ERROR",
      statusCode: 502,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for tool execution failures
 */
export class ToolExecutionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "TOOL_EXECUTION_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for memory operations
 */
export class MemoryError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "MEMORY_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for knowledge graph operations
 */
export class KnowledgeGraphError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "KNOWLEDGE_GRAPH_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for MCP operations
 */
export class MCPError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "MCP_ERROR",
      statusCode: 500,
      isOperational: true,
      context,
    });
  }
}

/**
 * Error for offline operations
 */
export class OfflineError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: "OFFLINE_ERROR",
      statusCode: 503,
      isOperational: true,
      context,
    });
  }
}

// ==============================
// Error Handling Functions
// ==============================

/**
 * Formats an error for consistent logging
 */
export function formatError(error: Error): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context || {},
      stack: error.stack,
    };
  }

  // Handle non-AppError instances
  return {
    name: error.name,
    message: error.message,
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    isOperational: false,
    stack: error.stack,
  };
}

/**
 * Logs an error with appropriate severity level
 */
export function logError(error: Error): void {
  const formattedError = formatError(error);
  
  // In production, we would use a proper logging service
  // For now, we'll use console.error
  console.error(JSON.stringify(formattedError, null, 2));
}

/**
 * Handles an error by logging it and optionally sending it to the client
 */
export function handleError(error: Error, dataStream?: DataStreamWriter): void {
  logError(error);

  // If a data stream is provided, send the error to the client
  if (dataStream) {
    const errorMessage = error instanceof AppError
      ? `Error: ${error.message} (${error.code})`
      : `Error: ${error.message}`;
    
    dataStream.write(
      formatDataStreamPart("error", errorMessage)
    );
  }
}

/**
 * Safely executes a function and handles any errors
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error instanceof Error ? error : new Error(String(error)));
    } else {
      logError(error instanceof Error ? error : new Error(String(error)));
    }
    return null;
  }
}

/**
 * Validates that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = "Value is required"
): T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
  return value;
}

/**
 * Validates that a condition is true
 */
export function assertCondition(
  condition: boolean,
  message = "Condition not met"
): void {
  if (!condition) {
    throw new ValidationError(message);
  }
}

/**
 * Wraps database operations with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError(`Database operation failed: ${message}`, {
      originalError: error,
      ...context,
    });
  }
}

/**
 * Wraps external service calls with error handling
 */
export async function withExternalServiceErrorHandling<T>(
  operation: () => Promise<T>,
  serviceName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError(`${serviceName} service call failed: ${message}`, {
      serviceName,
      originalError: error,
      ...context,
    });
  }
}

/**
 * Wraps tool execution with error handling
 */
export async function withToolExecutionErrorHandling<T>(
  operation: () => Promise<T>,
  toolName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ToolExecutionError(`Tool '${toolName}' execution failed: ${message}`, {
      toolName,
      originalError: error,
      ...context,
    });
  }
}

/**
 * Creates a timeout promise that rejects after the specified time
 */
export function createTimeout(ms: number, message = "Operation timed out"): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new AppError({
      message,
      code: "TIMEOUT",
      statusCode: 408,
    })), ms);
  });
}

/**
 * Executes an operation with a timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out"
): Promise<T> {
  return Promise.race([
    operation,
    createTimeout(timeoutMs, timeoutMessage),
  ]);
}

/**
 * Wraps MCP operations with error handling
 */
export async function withMCPErrorHandling<T>(
  operation: () => Promise<T>,
  toolName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new MCPError(`MCP tool '${toolName}' operation failed: ${message}`, {
      toolName,
      originalError: error,
      ...context,
    });
  }
}
