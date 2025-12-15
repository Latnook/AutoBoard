import { getToken } from "next-auth/jwt";
import { createGoogleUser } from "@/lib/google";
import { createMicrosoftUser, assignLicense, addUserToAdministrativeUnit, MICROSOFT_BUSINESS_STANDARD_SKU } from "@/lib/microsoft";
import { generatePassword } from "@/lib/utils";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit-logger";
import { headers } from "next/headers";

export async function POST(req) {
    // Get IP address for audit logging
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    // Check for API key authentication (for n8n)
    const apiKey = headersList.get('x-api-key');
    const expectedApiKey = process.env.API_KEY;

    let isApiKeyAuth = false;
    let authenticatedUser = 'system'; // Default for API key auth
    let token = null;

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
        // Valid API key authentication
        isApiKeyAuth = true;
    } else {
        // Fall back to NextAuth session authentication
        token = await getToken({ req });

        if (!token || !token.accessToken) {
            return NextResponse.json({ error: "Unauthorized - missing valid session or API key" }, { status: 401 });
        }

        if (token.error === "RefreshAccessTokenError") {
            return NextResponse.json({ error: "Session expired. Please sign out and sign in again." }, { status: 401 });
        }

        authenticatedUser = token.email;
    }

    // Determine which token is primary and which is secondary
    let googleToken;
    let microsoftToken;

    const cookieStore = await cookies();
    const secondaryGoogle = cookieStore.get("secondary_google_token");
    const secondaryMicrosoft = cookieStore.get("secondary_microsoft_token");

    if (token && token.provider === 'google') {
        googleToken = token.accessToken;
        microsoftToken = secondaryMicrosoft?.value;
    } else if (token && token.provider === 'azure-ad') {
        microsoftToken = token.accessToken;
        googleToken = secondaryGoogle?.value;
    }

    if (!googleToken || !microsoftToken) {
        return NextResponse.json({
            error: "Missing connection. Please connect both Google and Microsoft accounts. If you have already connected, your session may have expired - please try linking again."
        }, { status: 400 });
    }

    try {
        const body = await req.json();
        let { firstName, lastName, email, jobTitle, department, assignLicense: shouldAssignLicense, usageLocation, useCustomOU, orgUnitPath, useAdminUnit, administrativeUnitId } = body;

        // Force lowercase email
        email = email.toLowerCase();

        logger.info(`Starting unified onboarding for ${email}`);

        // Generate a temporary password (same for both for convenience)
        const password = generatePassword();

        const results = {
            google: null,
            microsoft: null,
            errors: []
        };

        // 1. Create Google and Microsoft Users in PARALLEL for faster onboarding
        const googleData = {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            email,
            password,
            jobTitle,
            department,
            orgUnitPath: useCustomOU ? orgUnitPath : '/' // Use custom OU if specified, otherwise root
        };

        const mailNickname = email.split('@')[0];
        const microsoftData = {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            userPrincipalName: email,
            mailNickname,
            password,
            jobTitle,
            department,
            usageLocation
        };

        // Execute both API calls in parallel
        const [googleResult, microsoftResult] = await Promise.allSettled([
            createGoogleUser(googleToken, googleData),
            createMicrosoftUser(microsoftToken, microsoftData)
        ]);

        // Handle Google result
        if (googleResult.status === 'fulfilled') {
            results.google = googleResult.value;
        } else {
            console.error("Google creation failed:", googleResult.reason);
            results.errors.push(googleResult.reason.message);
        }

        // Handle Microsoft result
        if (microsoftResult.status === 'fulfilled') {
            results.microsoft = microsoftResult.value;

            // 2. Assign License (if requested and user created successfully)
            if (shouldAssignLicense) {
                try {
                    await assignLicense(microsoftToken, results.microsoft.id, MICROSOFT_BUSINESS_STANDARD_SKU);
                    results.microsoft.licenseAssigned = true;
                } catch (licenseErr) {
                    console.error("License assignment failed:", licenseErr);
                    results.errors.push(`User created but license assignment failed: ${licenseErr.message}`);
                    results.microsoft.licenseAssigned = false;
                    results.microsoft.licenseError = licenseErr.message;
                }
            }

            // 3. Add to Administrative Unit (if requested and user created successfully)
            if (useAdminUnit && administrativeUnitId) {
                try {
                    await addUserToAdministrativeUnit(microsoftToken, administrativeUnitId, results.microsoft.id);
                    results.microsoft.adminUnitAssigned = true;
                } catch (adminUnitErr) {
                    console.error("Administrative Unit assignment failed:", adminUnitErr);
                    results.errors.push(`User created but Administrative Unit assignment failed: ${adminUnitErr.message}`);
                    results.microsoft.adminUnitAssigned = false;
                    results.microsoft.adminUnitError = adminUnitErr.message;
                }
            }
        } else {
            console.error("Microsoft creation failed:", microsoftResult.reason);
            results.errors.push(microsoftResult.reason.message);
        }

        // Determine overall success status
        // If at least one user was created, we consider it a partial success (200 OK or 207 Multi-Status)
        // We'll use 200 OK with detailed results for simplicity in the frontend
        const isPartialSuccess = results.google || results.microsoft;

        if (!isPartialSuccess && results.errors.length > 0) {
            // Total failure
            logger.error(`Unified onboarding failed for ${email}`, { errors: results.errors });

            // Log audit event for failed creation
            logAuditEvent({
                action: 'USER_CREATION_FAILED',
                targetEmail: email,
                performedBy: authenticatedUser,
                ipAddress,
                success: false,
                details: {
                    errors: results.errors,
                    provider: token?.provider || 'api-key'
                }
            });

            return NextResponse.json({
                success: false,
                errors: results.errors,
                partialResults: results
            }, { status: 500 });
        }

        logger.info(`Unified onboarding completed for ${email}`, {
            google: !!results.google,
            microsoft: !!results.microsoft,
            license: results.microsoft?.licenseAssigned
        });

        // Log audit event for successful creation
        logAuditEvent({
            action: 'USER_CREATED',
            targetEmail: email,
            performedBy: authenticatedUser,
            ipAddress,
            success: true,
            details: {
                googleCreated: !!results.google,
                microsoftCreated: !!results.microsoft,
                licenseAssigned: results.microsoft?.licenseAssigned,
                adminUnitAssigned: results.microsoft?.adminUnitAssigned,
                provider: token?.provider || 'api-key',
                errors: results.errors.length > 0 ? results.errors : undefined
            }
        });

        return NextResponse.json({
            success: true,
            results,
            errors: results.errors, // Include errors even on success/partial success
            temporaryPassword: password
        });

    } catch (error) {
        logger.error("Unexpected error in unified onboarding", { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
