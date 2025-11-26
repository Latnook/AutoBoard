import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const cookieStore = await cookies();

    // Clear secondary tokens
    cookieStore.delete("secondary_google_token");
    cookieStore.delete("secondary_microsoft_token");

    return NextResponse.json({ success: true });
}
