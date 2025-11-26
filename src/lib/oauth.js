import { google } from 'googleapis';

export const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/admin.directory.user"
];

export const MICROSOFT_SCOPES = [
    "User.ReadWrite.All",
    "Directory.ReadWrite.All",
    "offline_access"
];

export function getGoogleAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/link/google/callback`
    );

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'consent'
    });
}

export async function getGoogleToken(code) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/link/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

export function getMicrosoftAuthUrl() {
    const tenant = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/link/microsoft/callback`;
    const scope = MICROSOFT_SCOPES.join(" ");

    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scope)}&state=12345`;
}

export async function getMicrosoftToken(code) {
    const tenant = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/link/microsoft/callback`;

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', MICROSOFT_SCOPES.join(" "));
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    params.append('client_secret', clientSecret);

    const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || "Failed to get Microsoft token");
    }

    return await response.json();
}
