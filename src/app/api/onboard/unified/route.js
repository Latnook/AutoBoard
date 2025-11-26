import { getToken } from "next-auth/jwt";
import { createGoogleUser } from "@/lib/google";
import { createMicrosoftUser, assignLicense, MICROSOFT_BUSINESS_STANDARD_SKU } from "@/lib/microsoft";
import { generatePassword } from "@/lib/utils";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function POST(req) {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (token.error === "RefreshAccessTokenError") {
        return NextResponse.json({ error: "Session expired. Please sign out and sign in again." }, { status: 401 });
    }

    // Determine which token is primary and which is secondary
    let googleToken;
    let microsoftToken;

    const cookieStore = await cookies();
    const secondaryGoogle = cookieStore.get("secondary_google_token");
    const secondaryMicrosoft = cookieStore.get("secondary_microsoft_token");

    if (token.provider === 'google') {
        googleToken = token.accessToken;
        microsoftToken = secondaryMicrosoft?.value;
    } else if (token.provider === 'azure-ad') {
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
        let { firstName, lastName, email, jobTitle, department, assignLicense: shouldAssignLicense, usageLocation } = body;

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

        // 1. Create Google User
        try {
            const googleData = {
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                email,
                password,
                jobTitle,
                department
            };
            results.google = await createGoogleUser(googleToken, googleData);
        } catch (err) {
            console.error("Google creation failed:", err);
            results.errors.push(err.message);
        }

        // 2. Create Microsoft User
        try {
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
                usageLocation // Pass usageLocation
            };
            results.microsoft = await createMicrosoftUser(microsoftToken, microsoftData);

            // 3. Assign License (if requested and user created successfully)
            if (results.microsoft && shouldAssignLicense) {
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
        } catch (err) {
            console.error("Microsoft creation failed:", err);
            results.errors.push(err.message);
        }

        // Determine overall success status
        // If at least one user was created, we consider it a partial success (200 OK or 207 Multi-Status)
        // We'll use 200 OK with detailed results for simplicity in the frontend
        const isPartialSuccess = results.google || results.microsoft;

        if (!isPartialSuccess && results.errors.length > 0) {
            // Total failure
            logger.error(`Unified onboarding failed for ${email}`, { errors: results.errors });
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
