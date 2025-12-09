import { NextResponse } from "next/server";
import { getGoogleToken, getMicrosoftToken } from "@/lib/oauth";
import { cookies } from "next/headers";

export async function GET(request, { params }) {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    try {
        let tokens;
        if (provider === 'google') {
            tokens = await getGoogleToken(code);
        } else if (provider === 'microsoft') {
            tokens = await getMicrosoftToken(code);
        } else {
            return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
        }

        // Store the secondary token in a cookie
        // We prefix with the provider name to know which one it is
        const cookieName = `secondary_${provider}_token`;

        (await cookies()).set(cookieName, tokens.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            // No maxAge = session cookie (expires when browser closes)
        });

        // Redirect back to home
        return NextResponse.redirect(new URL('/', request.url));

    } catch (error) {
        console.error("Link callback error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
