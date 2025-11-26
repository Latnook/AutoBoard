import { getToken } from "next-auth/jwt";
import { getLicenseStatus } from "@/lib/microsoft";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req) {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine Microsoft token
    let microsoftToken;
    const cookieStore = await cookies();
    const secondaryMicrosoft = cookieStore.get("secondary_microsoft_token");

    if (token.provider === 'azure-ad') {
        microsoftToken = token.accessToken;
    } else {
        microsoftToken = secondaryMicrosoft?.value;
    }

    if (!microsoftToken) {
        return NextResponse.json({ licenses: [] }); // No Microsoft connection
    }

    try {
        const licenses = await getLicenseStatus(microsoftToken);
        return NextResponse.json({ licenses });
    } catch (error) {
        console.error("Failed to fetch licenses:", error);

        // Check for token expiration/invalidity specifically
        if (error.statusCode === 401 || error.message.includes("InvalidAuthenticationToken")) {
            return NextResponse.json({ error: "Microsoft session expired. Please re-link your account." }, { status: 401 });
        }

        return NextResponse.json({ error: `Failed to fetch licenses: ${error.message}` }, { status: 500 });
    }
}
