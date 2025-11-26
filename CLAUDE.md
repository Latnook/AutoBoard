# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoBoard is an open-source Next.js application that automates employee onboarding by creating user accounts across both Google Workspace and Microsoft 365 simultaneously. Organizations can deploy this application to streamline their IT onboarding process. The application uses NextAuth.js for OAuth authentication and manages dual OAuth flows to allow users to connect both platforms.

## Development Commands

```bash
# Development
npm run dev          # Start development server on http://localhost:3000

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

- `/api/auth/[...nextauth]/route.js` - NextAuth.js handler for primary OAuth
- `/api/link/[provider]/route.js` - Initiates secondary OAuth flow
- `/api/link/[provider]/callback/route.js` - Handles secondary OAuth callback and stores token in cookie
- `/api/onboard/unified/route.js` - Creates users in both systems (requires both tokens)
- `/api/onboard/google/route.js` - Google-only user creation (legacy/fallback)
- `/api/onboard/microsoft/route.js` - Microsoft-only user creation (legacy/fallback)
- `/api/licenses/route.js` - Fetches Microsoft 365 license availability
- `/api/logout/route.js` - Clears secondary OAuth cookies

### Provider Integration Modules

**Google Workspace** (`src/lib/google.js`):
- Uses `googleapis` package with Admin SDK Directory API
- Requires scope: `https://www.googleapis.com/auth/admin.directory.user`
- Creates users with `changePasswordAtNextLogin: true`

**Microsoft 365** (`src/lib/microsoft.js`):
- Uses `@microsoft/microsoft-graph-client` package
- Requires scopes: `User.ReadWrite.All`, `Directory.ReadWrite.All`
- Key functions:
  - `createMicrosoftUser()` - Creates Entra ID user
  - `assignLicense()` - Assigns licenses by resolving SKU part number to GUID
  - `getLicenseStatus()` - Returns license availability for all SKUs
- License assignment requires `usageLocation` property (defaults to "US")

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

### Logging System

Custom file-based logger (`src/lib/logger.js`):
- Writes to `logs/app.log`
- Includes timestamp, level, and optional metadata
- Use for tracking OAuth flows, user creation, and errors
- Methods: `logger.info()`, `logger.error()`, `logger.warn()`

## Common Patterns

### Adding a New API Route

1. Create route handler in `src/app/api/[route-name]/route.js`
2. Check authentication with `getToken({ req })` from `next-auth/jwt`
3. Validate token exists and check for `RefreshAccessTokenError`
4. Retrieve secondary tokens from cookies if needed using `cookies()` from `next/headers`
5. Use `logger` for important operations and errors

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
