import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logAuditEvent } from '@/lib/audit-logger';

// This endpoint is called by n8n AFTER creating users
// It logs the user creation activity to the audit log

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

    try {
        const body = await req.json();
        const {
            action,
            targetEmail,
            performedBy,
            success,
            details
        } = body;

        // Validate required fields
        if (!action || !targetEmail) {
            return NextResponse.json({
                error: "Missing required fields: action, targetEmail"
            }, { status: 400 });
        }

        // Log the audit event
        logAuditEvent({
            action: action || 'USER_CREATED',
            targetEmail: targetEmail.toLowerCase(),
            performedBy: performedBy || 'n8n-workflow',
            ipAddress,
            success: success !== false, // Default to true
            details: {
                source: 'n8n',
                ...details
            }
        });

        return NextResponse.json({
            ok: true,
            message: "Audit event logged successfully"
        });

    } catch (error) {
        console.error("Failed to log audit event:", error);
        return NextResponse.json({
            error: "Failed to log audit event",
            details: error.message
        }, { status: 500 });
    }
}
