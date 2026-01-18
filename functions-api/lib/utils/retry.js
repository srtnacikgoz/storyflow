"use strict";
/**
 * Retry Utility
 * Instagram Automation - Sade Patisserie
 *
 * Provides retry logic with exponential backoff
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = void 0;
exports.withRetry = withRetry;
exports.isRetryableError = isRetryableError;
exports.createRetryWrapper = createRetryWrapper;
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)("Retry");
/**
 * Default retry options
 */
const DEFAULT_OPTIONS = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    isRetryable: () => true,
    onRetry: () => { },
};
/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @return {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Calculate delay for attempt with exponential backoff
 * @param {number} attempt - Current attempt number (1-based)
 * @param {Required<RetryOptions>} options - Retry options
 * @return {number} Delay in milliseconds
 */
function calculateDelay(attempt, options) {
    const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, options.maxDelay);
}
/**
 * Execute function with retry logic
 *
 * @param {Function} fn - Function to execute
 * @param {RetryOptions} options - Retry options
 * @return {Promise<T>} Function result
 * @template T
 */
async function withRetry(fn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError;
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            // Check if we should retry
            if (attempt === opts.maxAttempts || !opts.isRetryable(error)) {
                throw error;
            }
            // Calculate delay
            const delay = calculateDelay(attempt, opts);
            // Log retry
            logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
                attempt,
                maxAttempts: opts.maxAttempts,
                delay,
                error: error instanceof Error ? error.message : String(error),
            });
            // Call onRetry callback
            opts.onRetry(attempt, error, delay);
            // Wait before retry
            await sleep(delay);
        }
    }
    // Should not reach here, but just in case
    throw lastError;
}
/**
 * Check if error is a retryable network/API error
 * @param {unknown} error - Error to check
 * @return {boolean} True if retryable
 */
function isRetryableError(error) {
    if (!(error instanceof Error)) {
        return false;
    }
    const message = error.message.toLowerCase();
    // Network errors
    if (message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnreset") ||
        message.includes("econnrefused") ||
        message.includes("socket")) {
        return true;
    }
    // Rate limit errors (should retry after delay)
    if (message.includes("rate limit") ||
        message.includes("too many requests") ||
        message.includes("429")) {
        return true;
    }
    // Server errors (5xx)
    if (message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504")) {
        return true;
    }
    // Instagram specific
    if (message.includes("container is not ready")) {
        return true;
    }
    return false;
}
/**
 * Create retry wrapper with preset options
 * @param {RetryOptions} defaultOptions - Default options for this wrapper
 * @return {Function} Retry wrapper function
 */
function createRetryWrapper(defaultOptions) {
    return (fn, options = {}) => {
        return withRetry(fn, { ...defaultOptions, ...options });
    };
}
/**
 * Pre-configured retry functions
 */
exports.retry = {
    /** Retry with default settings (3 attempts) */
    default: (fn) => withRetry(fn, { isRetryable: isRetryableError }),
    /** Retry for API calls (5 attempts, longer delays) */
    api: (fn) => withRetry(fn, {
        maxAttempts: 5,
        initialDelay: 2000,
        maxDelay: 60000,
        isRetryable: isRetryableError,
    }),
    /** Retry for Instagram API (handle container not ready) */
    instagram: (fn) => withRetry(fn, {
        maxAttempts: 5,
        initialDelay: 3000,
        maxDelay: 30000,
        isRetryable: isRetryableError,
    }),
};
//# sourceMappingURL=retry.js.map