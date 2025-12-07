import { getToken } from "next-auth/jwt";
import { createMicrosoftUser, assignLicense, addUserToAdministrativeUnit, MICROSOFT_BUSINESS_STANDARD_SKU } from "@/lib/microsoft";
import { generatePassword } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req) {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        let { firstName, lastName, email, jobTitle, department, assignLicense: shouldAssignLicense, usageLocation, useAdminUnit, administrativeUnitId } = body;

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

        const warnings = [];

        if (shouldAssignLicense) {
            try {
                await assignLicense(token.accessToken, newUser.id, MICROSOFT_BUSINESS_STANDARD_SKU);
            } catch (licenseError) {
                console.error("License assignment failed:", licenseError);
                warnings.push("License assignment failed: " + licenseError.message);
            }
        }

        if (useAdminUnit && administrativeUnitId) {
            try {
                await addUserToAdministrativeUnit(token.accessToken, administrativeUnitId, newUser.id);
            } catch (adminUnitError) {
                console.error("Administrative Unit assignment failed:", adminUnitError);
                warnings.push("Administrative Unit assignment failed: " + adminUnitError.message);
            }
        }

        return NextResponse.json({
            success: true,
            user: newUser,
            temporaryPassword: password,
            ...(warnings.length > 0 && { warning: warnings.join(" ") })
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
