# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoBoard is an open-source Next.js application that automates employee onboarding by creating user accounts across both Google Workspace and Microsoft 365 simultaneously. Organizations can deploy this application to streamline their IT onboarding process. The application uses NextAuth.js for OAuth authentication and manages dual OAuth flows to allow users to connect both platforms.

## Development Commands

```bash
# Development
npm run dev          # Start development server with env validation on http://localhost:3000
npm run dev:base     # Start development server with Turbo (no env validation)
npm run dev:fast     # Alias for dev:base (faster startup)

# Production
npm run build        # Build for production
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint (configured with next config)
```

## Environment Configuration

The application requires OAuth credentials in `.env.local`. Use `.env.example` as a template:

```bash
cp .env.example .env.local
```

Then fill in your organization's credentials. See the README for detailed setup instructions for obtaining these credentials.

**Important:** Never commit `.env.local` - it contains sensitive OAuth credentials. The `.env.example` file is provided for reference only.

### Environment Validation

The application includes automatic validation (`src/lib/env-validator.js`) that:
- Checks for missing or placeholder environment variables
- Displays user-friendly error messages when configuration is incomplete
- Shows a setup guide page (`src/app/components/SetupRequired.js`) instead of cryptic errors
- Logs validation results to console on startup
- Dynamically enables/disables OAuth providers based on available credentials

If you see the "Setup Required" page, it means environment variables need to be configured properly.

## Architecture

### Dual OAuth Flow System

The application implements a unique dual OAuth flow architecture where users must connect both Google Workspace and Microsoft 365 accounts:

1. **Primary Authentication**: User signs in with either Google or Microsoft via NextAuth.js (`src/lib/auth.js`)
   - Access token stored in NextAuth session via JWT callback
   - Automatic token refresh handled in `refreshAccessToken()` function

2. **Secondary Connection**: User links the second provider through `/api/link/[provider]` routes
   - Secondary tokens stored as HTTP-only cookies (`secondary_google_token` or `secondary_microsoft_token`)
   - State parameter prevents CSRF attacks during OAuth callback

3. **Unified Onboarding**: When both providers are connected, the unified API creates users simultaneously
   - Primary token accessed via `getToken()` from NextAuth
   - Secondary token retrieved from cookies
   - Both tokens passed to create operations

### API Routes Structure

**Authentication & Session:**
- `/api/auth/[...nextauth]/route.js` - NextAuth.js handler for primary OAuth
- `/api/link/[provider]/route.js` - Initiates secondary OAuth flow
- `/api/link/[provider]/callback/route.js` - Handles secondary OAuth callback and stores token in cookie
- `/api/logout/route.js` - Clears secondary OAuth cookies

**User Onboarding:**
- `/api/onboard/unified/route.js` - Creates users in both systems (requires both tokens or API key)
- `/api/onboard/google/route.js` - Google-only user creation (legacy/fallback)
- `/api/onboard/microsoft/route.js` - Microsoft-only user creation (legacy/fallback)

**License & Resource Management:**
- `/api/licenses/route.js` - Fetches Microsoft 365 license availability

**Rate Limiting & Monitoring:**
- `/api/rate-limit/check/route.js` - Check and increment rate limit (for n8n integration)
- `/api/rate-limit/status/route.js` - Get current rate limit status without incrementing
- `/api/audit/log/route.js` - Audit logging endpoint
- `/api/log/route.js` - General logging endpoint

### Provider Integration Modules

**Google Workspace** (`src/lib/google.js`):
- Uses `googleapis` package with Admin SDK Directory API
- Requires scope: `https://www.googleapis.com/auth/admin.directory.user`
- Creates users with `changePasswordAtNextLogin: true`

**Microsoft 365** (`src/lib/microsoft.js`):
- Uses `@microsoft/microsoft-graph-client` package
- Requires scopes: `User.ReadWrite.All`, `Directory.ReadWrite.All`, `AdministrativeUnit.ReadWrite.All`
- Key functions:
  - `createMicrosoftUser()` - Creates Entra ID user
  - `assignLicense()` - Assigns licenses by resolving SKU part number to GUID
  - `getLicenseStatus()` - Returns license availability for all SKUs
  - `addUserToAdministrativeUnit()` - Adds user to Administrative Unit (optional)
- License assignment requires `usageLocation` property (defaults to "US")

### Security & Monitoring Features

**Rate Limiting** (`src/lib/rate-limiter.js`, `src/middleware.js`):
- In-memory rate limiting to prevent abuse
- Default: 10 user creations per hour per identifier
- Identifier: Authenticated user email (web UI) or IP address (API key/n8n)
- Automatic cleanup of expired entries every 5 minutes
- Middleware automatically applies to all `/api/onboard/*` routes
- Returns HTTP 429 with `Retry-After` header when limit exceeded
- Shared between web UI and n8n workflows for unified protection

**Audit Logging** (`src/lib/audit-logger.js`):
- Immutable audit trail in `logs/audit.log` (JSON Lines format)
- File permissions: 0600 (owner read/write only)
- Logs all user creation attempts with:
  - Timestamp, action type, target email, performer, IP address
  - Success/failure status and detailed results
  - Google/Microsoft creation status, license assignment, errors
- Suspicious activity detection: Alerts if >5 users created in 10 minutes
- Used by `/api/audit/log` endpoint and unified onboarding route

**Request Logging** (`src/lib/logger.js`):
- General application logging to `logs/app.log`
- Tracks OAuth flows, user creation, and errors
- Methods: `logger.info()`, `logger.error()`, `logger.warn()`

**Middleware** (`src/middleware.js`):
- Applies rate limiting to `/api/onboard/*` routes before handler execution
- Adds rate limit headers to all responses:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: When the limit resets (ISO 8601)
- Supports both NextAuth session and IP-based identification

### Advanced User Provisioning

**Organizational Unit Selection (Google Workspace)**:
- Optional OU placement via `useCustomOU` and `orgUnitPath` parameters
- Defaults to `/` (root) if not specified
- Allows automated placement in department-specific OUs (e.g., `/Sales`, `/Engineering/Backend`)
- Set default OU in `src/lib/google.js:20`

**Administrative Unit Assignment (Microsoft Entra ID)**:
- Optional AU assignment via `useAdminUnit` and `administrativeUnitId` parameters
- Post-creation assignment (user created first, then added to AU)
- Graceful error handling - continues even if AU assignment fails
- Requires `AdministrativeUnit.ReadWrite.All` scope
- Uses GUID-based AU identification

### Component Architecture

**Client Components** (`src/app/components/`):
- `Dashboard.js` - Main UI orchestrator
  - Displays connection status for both providers
  - Conditionally renders link buttons when providers not connected
  - Passes connection state to child components
- `OnboardingForm.js` - User creation form
  - Adapts UI based on whether both providers are connected
  - Sends to unified endpoint when both connected
- `LicenseSidebar.js` - Displays real-time Microsoft 365 license availability
  - Auto-refreshes when users are created (via `refreshTrigger` prop)
  - Only rendered when Microsoft is connected

**Server Components**:
- `src/app/page.js` - Root page that checks both NextAuth session and secondary cookies
- Uses Next.js App Router with Server Components by default

### State Management Pattern

The application uses a minimal state management approach:
- NextAuth session provides primary OAuth state
- HTTP-only cookies store secondary OAuth tokens
- React `useState` for UI state only (e.g., `refreshTrigger` in Dashboard)
- No global state library needed

## Common Patterns

### Adding a New API Route

1. Create route handler in `src/app/api/[route-name]/route.js`
2. Check authentication with `getToken({ req })` from `next-auth/jwt` OR API key from headers
3. Validate token exists and check for `RefreshAccessTokenError`
4. Retrieve secondary tokens from cookies if needed using `cookies()` from `next/headers`
5. Use `logger` for important operations and `logAuditEvent()` for user modifications
6. For user creation endpoints, rate limiting is automatically applied via middleware

### API Key Authentication (for n8n/external integrations)

API routes can support dual authentication modes:

```javascript
// Check for API key first
const apiKey = headersList.get('x-api-key');
const expectedApiKey = process.env.API_KEY;

if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
    // Valid API key - proceed without NextAuth
    isApiKeyAuth = true;
} else {
    // Fall back to NextAuth session
    token = await getToken({ req });
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
```

This pattern is used in `/api/onboard/unified/route.js` and `/api/rate-limit/check/route.js`.

### Modifying OAuth Scopes

When changing OAuth scopes:
1. Update scope in `src/lib/auth.js` in the appropriate provider configuration
2. Update scope in refresh token logic if applicable (line 86 for Microsoft)
3. Users must re-authenticate to grant new scopes (clear their session)

### Error Handling Pattern

All provider integration functions follow this pattern:
1. Wrap API calls in try-catch
2. Parse provider-specific error responses (Google uses `error.response.data.error`, Microsoft uses `JSON.parse(error.body)`)
3. Check for specific error codes (409 for conflicts, 403 for permissions, etc.)
4. Throw user-friendly error messages
5. Log errors with `logger.error()` including context

## Important Notes

- All email addresses are forced to lowercase before user creation (`email.toLowerCase()`)
- Temporary passwords must meet complexity requirements for both providers
- Microsoft license assignment requires two-step process: resolve SKU name to GUID, then assign
- The `MICROSOFT_BUSINESS_STANDARD_SKU` constant maps to "O365_BUSINESS_PREMIUM" (historical naming)
- NextAuth.js session tokens automatically refresh when expired via the JWT callback
- Secondary OAuth tokens do NOT auto-refresh - users must re-link if expired

## Customization for Organizations

Organizations deploying AutoBoard should customize:

1. **Default Usage Location** (`src/app/components/OnboardingForm.js:16`):
   - Change from `""` to your country code (e.g., `"US"`, `"GB"`, `"IL"`)
   - Saves time by pre-selecting the most common location

2. **Default License SKU** (`src/lib/microsoft.js:89`):
   - Change `MICROSOFT_BUSINESS_STANDARD_SKU` to match your organization's primary license
   - Check available SKUs in your tenant's license sidebar

3. **Default Organization Unit** (`src/lib/google.js:20`):
   - Change `orgUnitPath` from `/` to your preferred OU (e.g., `/Employees`)
   - Automatically places new users in the correct organizational structure

See the README "Customization for Your Organization" section for detailed instructions.

## n8n Workflow Integration (Optional)

AutoBoard includes optional n8n workflow automation for email-triggered onboarding and advanced integrations. **The built-in Next.js API is recommended for most deployments**, but n8n provides additional capabilities for organizations that need them.

### When to Use n8n

Consider n8n integration if you need:
- **Email-triggered onboarding**: Automatically process HR emails to create users
- **Visual workflow editor**: Non-developers can modify automation logic
- **400+ integrations**: Connect to Slack, Google Sheets, HRIS systems, ticketing tools
- **Execution history**: Built-in audit trail of all workflow runs
- **Cloud-based**: Run 24/7 without local infrastructure

### Complete Documentation

All n8n setup, configuration, and testing is documented in:

**📖 [`docs/n8n-integration.md`](docs/n8n-integration.md)**

This comprehensive guide covers:
- Setup and configuration with Redis rate limiting
- Email parsing with multicultural name support (Spanish, Portuguese, Hebrew, compound surnames)
- Duplicate email detection and handling
- Error notifications to HR
- Testing and deployment
- Troubleshooting common issues

### Quick Start

1. Import `n8n-migration/AutoBoard.json` into n8n cloud
2. Configure credentials (Google, Microsoft, Redis, Gmail)
3. Set up AutoBoard API key in `.env.local`: `API_KEY=your-secret-key`
4. Test with example emails in `n8n-migration/examples/`
5. Follow the detailed guide in `docs/n8n-integration.md`

### Integration with AutoBoard API

n8n workflows authenticate using API keys and share the same rate limiter:
- **Authentication**: `x-api-key` header with `process.env.API_KEY`
- **Rate Limiting**: `/api/rate-limit/check` endpoint (10/hour, shared with web UI)
- **User Creation**: `/api/onboard/unified` with dual authentication support

See `docs/n8n-integration.md` for complete API integration details.
