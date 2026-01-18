"use strict";
/**
 * Structured Logger Utility
 * Instagram Automation - Sade Patisserie
 *
 * Provides consistent logging format for Cloud Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = void 0;
exports.createLogger = createLogger;
/**
 * Logger class for structured logging
 */
class Logger {
    /**
     * Create logger instance
     * @param {string} context - Logger context (e.g., function name)
     */
    constructor(context) {
        this.context = context;
    }
    /**
     * Format log message
     * @param {LogLevel} level - Log level
     * @param {string} message - Log message
     * @param {LogContext} data - Additional context
     * @return {string} Formatted message
     */
    format(level, message, data) {
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
    debug(message, data) {
        console.debug(this.format("DEBUG", message, data));
    }
    /**
     * Info level log
     * @param {string} message - Log message
     * @param {LogContext} data - Additional context
     */
    info(message, data) {
        console.info(this.format("INFO", message, data));
    }
    /**
     * Warning level log
     * @param {string} message - Log message
     * @param {LogContext} data - Additional context
     */
    warn(message, data) {
        console.warn(this.format("WARN", message, data));
    }
    /**
     * Error level log
     * @param {string} message - Log message
     * @param {Error | unknown} error - Error object
     * @param {LogContext} data - Additional context
     */
    error(message, error, data) {
        const errorData = {
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
    start(data) {
        this.info("Function started", data);
    }
    /**
     * Log function success
     * @param {LogContext} data - Additional context
     */
    success(data) {
        this.info("Function completed successfully", data);
    }
    /**
     * Log function failure
     * @param {Error | unknown} error - Error object
     * @param {LogContext} data - Additional context
     */
    failure(error, data) {
        this.error("Function failed", error, data);
    }
}
/**
 * Create logger instance for a context
 * @param {string} context - Logger context
 * @return {Logger} Logger instance
 */
function createLogger(context) {
    return new Logger(context);
}
/**
 * Pre-configured loggers for common contexts
 */
exports.loggers = {
    scheduler: createLogger("Scheduler"),
    orchestrator: createLogger("Orchestrator"),
    instagram: createLogger("Instagram"),
    openai: createLogger("OpenAI"),
    queue: createLogger("Queue"),
};
//# sourceMappingURL=logger.js.map