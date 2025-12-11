import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { level, message, metadata } = await req.json();

        // Validate level
        const validLevels = ['info', 'warn', 'error'];
        const logLevel = validLevels.includes(level) ? level : 'info';

        // Log based on level
        logger[logLevel](message, metadata);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Logging endpoint error:", error);
        return NextResponse.json({ error: "Failed to log" }, { status: 500 });
    }
}
