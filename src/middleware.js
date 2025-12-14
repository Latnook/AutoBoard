import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

export async function middleware(request) {
    const pathname = request.nextUrl.pathname;

    // Only rate limit onboarding endpoints
    if (pathname.startsWith('/api/onboard')) {
        // Get user identifier (prefer authenticated user, fallback to IP)
        let identifier = request.ip || 'unknown';

        try {
            const token = await getToken({ req: request });
            if (token?.email) {
                identifier = token.email; // Rate limit by authenticated user
            }
        } catch (error) {
            // If token check fails, use IP address
        }

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
        if (limiter.count > MAX_REQUESTS_PER_WINDOW) {
            const resetIn = Math.ceil((limiter.resetAt - Date.now()) / 1000 / 60); // Minutes until reset

            return NextResponse.json(
                {
                    error: `Rate limit exceeded. You can only create ${MAX_REQUESTS_PER_WINDOW} users per hour. Please try again in ${resetIn} minutes.`,
                    retryAfter: limiter.resetAt
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((limiter.resetAt - Date.now()) / 1000)),
                        'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
                        'X-RateLimit-Remaining': String(Math.max(0, MAX_REQUESTS_PER_WINDOW - limiter.count)),
                        'X-RateLimit-Reset': new Date(limiter.resetAt).toISOString()
                    }
                }
            );
        }

        // Add rate limit headers to successful responses
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
        response.headers.set('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS_PER_WINDOW - limiter.count)));
        response.headers.set('X-RateLimit-Reset', new Date(limiter.resetAt).toISOString());

        return response;
    }

    // No rate limiting for other routes
    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: '/api/:path*',
};
