import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit } from '@/lib/rate-limiter';

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

        // Check rate limit using shared module
        const limitStatus = checkRateLimit(identifier);

        // Check if limit exceeded
        if (!limitStatus.allowed) {
            return NextResponse.json(
                {
                    error: `Rate limit exceeded. You can only create ${limitStatus.limit} users per hour. Please try again in ${limitStatus.resetIn} minutes.`,
                    retryAfter: limitStatus.resetAt
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((limitStatus.resetAt - Date.now()) / 1000)),
                        'X-RateLimit-Limit': String(limitStatus.limit),
                        'X-RateLimit-Remaining': String(limitStatus.remaining),
                        'X-RateLimit-Reset': new Date(limitStatus.resetAt).toISOString()
                    }
                }
            );
        }

        // Add rate limit headers to successful responses
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', String(limitStatus.limit));
        response.headers.set('X-RateLimit-Remaining', String(limitStatus.remaining));
        response.headers.set('X-RateLimit-Reset', new Date(limitStatus.resetAt).toISOString());

        return response;
    }

    // No rate limiting for other routes
    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: '/api/:path*',
};
