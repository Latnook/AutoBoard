import { getToken } from "next-auth/jwt";
import { createGoogleUser } from "@/lib/google";
import { generatePassword } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req) {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        let { firstName, lastName, email, jobTitle, department, assignLicense, useCustomOU, orgUnitPath } = body;

        // Force lowercase email
        email = email.toLowerCase();

        // Generate a temporary password
        const password = generatePassword();

        const userData = {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            email,
            password,
            jobTitle,
            department,
            orgUnitPath: useCustomOU ? orgUnitPath : '/' // Use custom OU if specified, otherwise root
        };

        const newUser = await createGoogleUser(token.accessToken, userData);

        // TODO: Implement license assignment if assignLicense is true

        return NextResponse.json({
            success: true,
            user: newUser,
            temporaryPassword: password
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
