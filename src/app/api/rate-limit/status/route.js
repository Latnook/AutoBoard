import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getRateLimitStatus } from '@/lib/rate-limiter';

// This endpoint gets the current rate limit status WITHOUT incrementing the counter
// Use this for displaying current status, not for checking before operations

export async function POST(req) {
    // Get IP address
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    // Check API key authentication
    const apiKey = headersList.get('x-api-key');
    const expectedApiKey = process.env.API_KEY;

    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
        return NextResponse.json({ error: "Unauthorized - invalid API key" }, { status: 401 });
    }

    // Use IP address as identifier for n8n requests
    const identifier = ipAddress;

    // Get rate limit status WITHOUT incrementing
    const limitStatus = getRateLimitStatus(identifier);

    return NextResponse.json({
        remaining: limitStatus.remaining,
        limit: limitStatus.limit,
        resetAt: limitStatus.resetAt,
        resetIn: limitStatus.resetIn
    });
}
