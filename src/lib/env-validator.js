/**
 * Environment variable validation
 * Checks for required configuration and provides helpful error messages
 */

export class EnvValidationError extends Error {
    constructor(message, missingVars = []) {
        super(message);
        this.name = 'EnvValidationError';
        this.missingVars = missingVars;
    }
}

const PLACEHOLDER_VALUES = [
    'your-google-client-id',
    'your-google-client-secret',
    'your-entra-app-client-id',
    'your-azure-app-client-id',
    'your-entra-app-client-secret',
    'your-azure-app-client-secret',
    'your-entra-tenant-id',
    'your-azure-tenant-id',
    'generate-a-random-secret-here',
];

function isPlaceholder(value) {
    if (!value) return true;
    return PLACEHOLDER_VALUES.some(placeholder =>
        value.toLowerCase().includes(placeholder.toLowerCase())
    );
}

export function validateEnvVariables() {
    const errors = [];
    const warnings = [];

    // Check NEXTAUTH_SECRET
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (!nextAuthSecret || isPlaceholder(nextAuthSecret)) {
        errors.push({
            var: 'NEXTAUTH_SECRET',
            message: 'Missing or invalid NEXTAUTH_SECRET',
            solution: 'Generate a secret using: openssl rand -base64 32'
        });
    } else if (nextAuthSecret.length < 32) {
        warnings.push({
            var: 'NEXTAUTH_SECRET',
            message: 'NEXTAUTH_SECRET is too short',
            solution: 'Use a longer secret (at least 32 characters) for better security'
        });
    }

    // Check NEXTAUTH_URL
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (!nextAuthUrl || isPlaceholder(nextAuthUrl)) {
        errors.push({
            var: 'NEXTAUTH_URL',
            message: 'Missing or invalid NEXTAUTH_URL',
            solution: 'Set to http://localhost:3000 for development or your production URL'
        });
    }

    // Check Google credentials
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const hasGoogleConfig = googleClientId || googleClientSecret;
    const hasValidGoogleConfig =
        googleClientId && !isPlaceholder(googleClientId) &&
        googleClientSecret && !isPlaceholder(googleClientSecret);

    if (hasGoogleConfig && !hasValidGoogleConfig) {
        warnings.push({
            var: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET',
            message: 'Incomplete or invalid Google Workspace credentials',
            solution: 'Configure both credentials in Google Cloud Console or remove them to disable Google integration'
        });
    }

    // Check Microsoft credentials
    const microsoftClientId = process.env.MICROSOFT_CLIENT_ID;
    const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const microsoftTenantId = process.env.MICROSOFT_TENANT_ID;

    const hasMicrosoftConfig = microsoftClientId || microsoftClientSecret || microsoftTenantId;
    const hasValidMicrosoftConfig =
        microsoftClientId && !isPlaceholder(microsoftClientId) &&
        microsoftClientSecret && !isPlaceholder(microsoftClientSecret) &&
        microsoftTenantId && !isPlaceholder(microsoftTenantId);

    if (hasMicrosoftConfig && !hasValidMicrosoftConfig) {
        warnings.push({
            var: 'MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT_ID',
            message: 'Incomplete or invalid Microsoft 365 credentials',
            solution: 'Configure all three credentials in Microsoft Entra admin center or remove them to disable Microsoft integration'
        });
    }

    // Check if at least one provider is configured
    if (!hasValidGoogleConfig && !hasValidMicrosoftConfig) {
        warnings.push({
            var: 'OAuth Providers',
            message: 'No OAuth providers configured',
            solution: 'Configure at least one provider (Google Workspace or Microsoft 365) to use AutoBoard'
        });
    }

    return { errors, warnings, isValid: errors.length === 0 };
}

export function getSetupInstructions(errors, warnings) {
    const lines = [];

    lines.push('════════════════════════════════════════════════════════════════');
    lines.push('  AutoBoard Configuration Required');
    lines.push('════════════════════════════════════════════════════════════════');
    lines.push('');

    if (errors.length > 0) {
        lines.push('❌ CRITICAL ERRORS (must be fixed):');
        lines.push('');
        errors.forEach((error, index) => {
            lines.push(`${index + 1}. ${error.var}`);
            lines.push(`   Problem: ${error.message}`);
            lines.push(`   Solution: ${error.solution}`);
            lines.push('');
        });
    }

    if (warnings.length > 0) {
        lines.push('⚠️  WARNINGS (recommended to fix):');
        lines.push('');
        warnings.forEach((warning, index) => {
            lines.push(`${index + 1}. ${warning.var}`);
            lines.push(`   ${warning.message}`);
            lines.push(`   ${warning.solution}`);
            lines.push('');
        });
    }

    lines.push('════════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('📖 Setup Instructions:');
    lines.push('');
    lines.push('1. Copy the example file:');
    lines.push('   cp .env.example .env.local');
    lines.push('');
    lines.push('2. Edit .env.local with your credentials');
    lines.push('');
    lines.push('3. Follow the README for detailed setup instructions:');
    lines.push('   - Google Workspace: Setup Section 2');
    lines.push('   - Microsoft 365: Setup Section 3');
    lines.push('');
    lines.push('4. Restart the development server');
    lines.push('');
    lines.push('════════════════════════════════════════════════════════════════');

    return lines.join('\n');
}
