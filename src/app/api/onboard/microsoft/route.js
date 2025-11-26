import { getToken } from "next-auth/jwt";
import { createMicrosoftUser, assignLicense, MICROSOFT_BUSINESS_STANDARD_SKU } from "@/lib/microsoft";
import { generatePassword } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req) {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        let { firstName, lastName, email, jobTitle, department, assignLicense: shouldAssignLicense, usageLocation } = body;

        // Force lowercase email
        email = email.toLowerCase();

        // Generate a temporary password
        const password = generatePassword();

        // Microsoft requires a mailNickname (alias)
        const mailNickname = email.split('@')[0];

        const userData = {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            userPrincipalName: email, // Must be a valid domain in the tenant
            mailNickname,
            password,
            jobTitle,
            department,
            usageLocation
        };

        const newUser = await createMicrosoftUser(token.accessToken, userData);

        if (shouldAssignLicense) {
            try {
                await assignLicense(token.accessToken, newUser.id, MICROSOFT_BUSINESS_STANDARD_SKU);
            } catch (licenseError) {
                console.error("License assignment failed:", licenseError);
                // We continue even if license assignment fails, but include a warning in the response
                return NextResponse.json({
                    success: true,
                    user: newUser,
                    temporaryPassword: password,
                    warning: "User created but license assignment failed."
                });
            }
        }

        return NextResponse.json({
            success: true,
            user: newUser,
            temporaryPassword: password
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
