import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limiter';

// This endpoint is called by n8n BEFORE creating users
// It checks and increments the rate limit counter using the same limiter as the web UI
// If limit exceeded, n8n should stop the workflow

export async function POST(req) {
    // Get IP address
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    // Check API key authentication
    const apiKey = headersList.get('x-api-key');
    const expectedApiKey = process.env.API_KEY;

    // Temporary debug logging
    console.log('=== API Key Debug ===');
    console.log('Received API Key:', apiKey);
    console.log('Expected API Key:', expectedApiKey);
    console.log('Match:', apiKey === expectedApiKey);
    console.log('====================');

    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
        return NextResponse.json({ error: "Unauthorized - invalid API key" }, { status: 401 });
    }

    // Use IP address as identifier for n8n requests
    // This ensures n8n shares the same rate limit pool as web UI requests from the same IP
    const identifier = ipAddress;

    // Check and increment rate limit
    const limitStatus = checkRateLimit(identifier);

    // If limit exceeded, return 429
    if (!limitStatus.allowed) {
        return NextResponse.json(
            {
                error: `Rate limit exceeded. You can only create ${limitStatus.limit} users per hour. Please try again in ${limitStatus.resetIn} minutes.`,
                retryAfter: limitStatus.resetAt,
                allowed: false
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

    // Rate limit OK - n8n can proceed
    return NextResponse.json({
        allowed: true,
        message: "Rate limit OK - proceed with user creation",
        remaining: limitStatus.remaining,
        limit: limitStatus.limit,
        resetAt: limitStatus.resetAt
    });
}
