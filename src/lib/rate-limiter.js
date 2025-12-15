// Shared rate limiting logic for both middleware and API endpoints
// This ensures n8n workflows respect the same rate limits as the web UI

// In-memory rate limiting storage
// Key: IP address or user ID
// Value: { count: number, resetAt: timestamp }
const limiters = new Map();

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10; // 10 user creations per hour

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of limiters.entries()) {
        if (now > value.resetAt) {
            limiters.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Check and increment rate limit for a given identifier
 * @param {string} identifier - IP address or user email
 * @returns {Object} - { allowed: boolean, remaining: number, resetAt: timestamp, resetIn: minutes }
 */
export function checkRateLimit(identifier) {
    // Get or create limiter for this identifier
    if (!limiters.has(identifier)) {
        limiters.set(identifier, {
            count: 0,
            resetAt: Date.now() + RATE_LIMIT_WINDOW_MS
        });
    }

    const limiter = limiters.get(identifier);

    // Reset counter if window has expired
    if (Date.now() > limiter.resetAt) {
        limiter.count = 0;
        limiter.resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
    }

    // Increment counter
    limiter.count++;

    // Check if limit exceeded
    const allowed = limiter.count <= MAX_REQUESTS_PER_WINDOW;
    const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - limiter.count);
    const resetIn = Math.ceil((limiter.resetAt - Date.now()) / 1000 / 60); // Minutes

    return {
        allowed,
        remaining,
        resetAt: limiter.resetAt,
        resetIn,
        limit: MAX_REQUESTS_PER_WINDOW,
        count: limiter.count
    };
}

/**
 * Get current rate limit status without incrementing
 * @param {string} identifier - IP address or user email
 * @returns {Object} - { remaining: number, resetAt: timestamp, resetIn: milliseconds }
 */
export function getRateLimitStatus(identifier) {
    if (!limiters.has(identifier)) {
        const resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
        return {
            remaining: MAX_REQUESTS_PER_WINDOW,
            resetAt: resetAt,
            resetIn: RATE_LIMIT_WINDOW_MS,
            limit: MAX_REQUESTS_PER_WINDOW
        };
    }

    const limiter = limiters.get(identifier);

    // Reset if window expired
    if (Date.now() > limiter.resetAt) {
        const resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
        return {
            remaining: MAX_REQUESTS_PER_WINDOW,
            resetAt: resetAt,
            resetIn: RATE_LIMIT_WINDOW_MS,
            limit: MAX_REQUESTS_PER_WINDOW
        };
    }

    return {
        remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - limiter.count),
        resetAt: limiter.resetAt,
        resetIn: limiter.resetAt - Date.now(),
        limit: MAX_REQUESTS_PER_WINDOW
    };
}
