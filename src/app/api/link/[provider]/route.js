import { NextResponse } from "next/server";
import { getGoogleAuthUrl, getMicrosoftAuthUrl } from "@/lib/oauth";

export async function GET(request, { params }) {
    const { provider } = await params;

    let url;
    if (provider === 'google') {
        url = getGoogleAuthUrl();
    } else if (provider === 'microsoft') {
        url = getMicrosoftAuthUrl();
    } else {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    return NextResponse.redirect(url);
}
