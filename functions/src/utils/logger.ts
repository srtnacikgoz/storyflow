/**
 * Structured Logger Utility
 * Instagram Automation - Sade Patisserie
 *
 * Provides consistent logging format for Cloud Functions
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogContext {
  functionName?: string;
  itemId?: string;
  storyId?: string;
  duration?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private context: string;

  /**
   * Create logger instance
   * @param {string} context - Logger context (e.g., function name)
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Format log message
   * @param {LogLevel} level - Log level
   * @param {string} message - Log message
   * @param {LogContext} data - Additional context
   * @return {string} Formatted message
   */
  private format(
    level: LogLevel,
    message: string,
    data?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level}] [${this.context}] ${message}`;

    if (data && Object.keys(data).length > 0) {
      return `${base} ${JSON.stringify(data)}`;
    }

    return base;
  }

  /**
   * Debug level log
   * @param {string} message - Log message
   * @param {LogContext} data - Additional context
   */
  debug(message: string, data?: LogContext): void {
    console.debug(this.format("DEBUG", message, data));
  }

  /**
   * Info level log
   * @param {string} message - Log message
   * @param {LogContext} data - Additional context
   */
  info(message: string, data?: LogContext): void {
    console.info(this.format("INFO", message, data));
  }

  /**
   * Warning level log
   * @param {string} message - Log message
   * @param {LogContext} data - Additional context
   */
  warn(message: string, data?: LogContext): void {
    console.warn(this.format("WARN", message, data));
  }

  /**
   * Error level log
   * @param {string} message - Log message
   * @param {Error | unknown} error - Error object
   * @param {LogContext} data - Additional context
   */
  error(message: string, error?: Error | unknown, data?: LogContext): void {
    const errorData: LogContext = {
      ...data,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error(this.format("ERROR", message, errorData));
  }

  /**
   * Log function start
   * @param {LogContext} data - Additional context
   */
  start(data?: LogContext): void {
    this.info("Function started", data);
  }

  /**
   * Log function success
   * @param {LogContext} data - Additional context
   */
  success(data?: LogContext): void {
    this.info("Function completed successfully", data);
  }

  /**
   * Log function failure
   * @param {Error | unknown} error - Error object
   * @param {LogContext} data - Additional context
   */
  failure(error: Error | unknown, data?: LogContext): void {
    this.error("Function failed", error, data);
  }
}

/**
 * Create logger instance for a context
 * @param {string} context - Logger context
 * @return {Logger} Logger instance
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Pre-configured loggers for common contexts
 */
export const loggers = {
  scheduler: createLogger("Scheduler"),
  orchestrator: createLogger("Orchestrator"),
  instagram: createLogger("Instagram"),
  openai: createLogger("OpenAI"),
  queue: createLogger("Queue"),
};
