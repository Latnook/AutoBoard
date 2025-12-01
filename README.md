# AutoBoard

A Next.js application that automates employee onboarding by creating user accounts across both Google Workspace and Microsoft 365 simultaneously. Streamline your IT onboarding process with a single form that provisions users in both platforms at once.

## Features

- **Dual Platform Support**: Create users in Google Workspace and Microsoft 365 from one form
- **OAuth Integration**: Secure authentication with both Google and Microsoft
- **License Management**: Automatically assign Microsoft 365 licenses during user creation
- **Real-time License Tracking**: View available Microsoft 365 licenses in the sidebar
- **Unified or Single Platform**: Works with just one platform or both together
- **Automatic Password Generation**: Creates secure temporary passwords for new users
- **Error Handling**: Detailed error messages and partial success handling
- **Session Management**: Automatic token refresh for uninterrupted operation
- **High Performance**: Parallel API calls, smart caching, and optimized builds for speed

## Prerequisites

Before setting up AutoBoard, you need:

1. **Google Workspace Admin Account** (if using Google integration)
   - Super Admin privileges
   - Access to Google Cloud Console

2. **Microsoft 365 Admin Account** (if using Microsoft integration)
   - Global Administrator role
   - Access to Microsoft Entra admin center

3. **Node.js** (v18 or higher)
4. **npm** or **yarn**

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/Latnook/AutoBoard
cd autoboard
npm install
```

### 2. Google Workspace Setup

#### Create OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Admin SDK API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Admin SDK API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Name: `AutoBoard`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
   - Click "Create"
   - Save the **Client ID** and **Client Secret**

5. Configure OAuth Consent Screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Add scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/admin.directory.user`

#### Required Permissions

The authenticated Google admin must have permission to create users in Google Workspace.

### 3. Microsoft 365 Setup

> **Note**: Microsoft has rebranded Azure Active Directory (Azure AD) to **Microsoft Entra ID**. This guide uses the current terminology and portal locations.

#### Register Application in Microsoft Entra

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com/)
2. Navigate to "Identity" > "Applications" > "App registrations"
3. Click "New registration"
4. Configure:
   - Name: `AutoBoard`
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI:
     - Platform: Web
     - URI: `http://localhost:3000/api/auth/callback/azure-ad` (development)
     - Add `https://yourdomain.com/api/auth/callback/azure-ad` (production)
     - **Note**: The callback URL uses `azure-ad` because that's the NextAuth.js provider ID, even though Microsoft has rebranded to Entra ID
   - Click "Register"

5. Configure API Permissions:
   - Go to "API permissions" in your app
   - Click "Add a permission" > "Microsoft Graph" > "Delegated permissions"
   - Add these permissions:
     - `User.ReadWrite.All`
     - `Directory.ReadWrite.All`
     - `offline_access`
   - Click "Grant admin consent" (requires Global Admin)

6. Create Client Secret:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: `AutoBoard Secret`
   - Expiration: Choose appropriate duration
   - Click "Add"
   - **Copy the secret value immediately** (you won't see it again)

7. Note Your Tenant ID:
   - Go to "Overview"
   - Copy the "Directory (tenant) ID"

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-entra-app-client-id
MICROSOFT_CLIENT_SECRET=your-entra-app-client-secret
MICROSOFT_TENANT_ID=your-entra-tenant-id

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### 5. Run the Application

```bash
# Development (recommended - includes pre-compilation)
npm run dev

# Development (skip pre-compilation for faster startup)
npm run dev:fast

# Production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note**: If you see a "Setup Required" page, it means your environment variables need to be configured. The page will show you exactly what's missing and how to fix it. Follow the instructions on that page to complete your setup.

#### Development Mode Options

- **`npm run dev`** (recommended): Pre-compiles routes on startup for instant first-page load (~300-500ms instead of 2-3s)
- **`npm run dev:fast`**: Standard Next.js dev server without pre-compilation (faster startup, slower first load)

## Customization for Your Organization

### Set Default Usage Location

To set a default country for your organization (saves time when onboarding):

1. Open `src/app/components/OnboardingForm.js`
2. Find line 16:
   ```javascript
   usageLocation: "" // No default - user must select
   ```
3. Change to your country code (e.g., `"US"`, `"GB"`, `"IL"`, etc.):
   ```javascript
   usageLocation: "US" // Default to United States
   ```

### Customize License Assignment

By default, the application assigns `O365_BUSINESS_PREMIUM` (Microsoft 365 Business Standard).

To change the default license:

1. Open `src/lib/microsoft.js`
2. Find line 89:
   ```javascript
   export const MICROSOFT_BUSINESS_STANDARD_SKU = "O365_BUSINESS_PREMIUM";
   ```
3. Change to your desired SKU (check your available SKUs in the license sidebar)

### Customize Default Organization Unit (Google)

By default, users are created in the root organizational unit (`/`).

To change this:

1. Open `src/lib/google.js`
2. Find line 20:
   ```javascript
   orgUnitPath: '/', // Default OU
   ```
3. Change to your desired OU path (e.g., `/Employees`, `/New Hires`)

## Usage

### Initial Setup

1. **Sign In**: Click "Connect Google Workspace" or "Connect Microsoft 365"
2. **Authenticate**: Grant permissions to AutoBoard
3. **Link Second Provider** (optional): Click "Link Google Account" or "Link Microsoft Account" to enable unified onboarding

### Creating Users

1. Fill out the onboarding form:
   - First Name
   - Last Name
   - Email / Username (must match your domain)
   - Job Title
   - Department
   - Usage Location (required for Microsoft licenses)
   - License Assignment (check/uncheck)

2. Click "Create User"

3. The application will:
   - Create the user in connected platform(s)
   - Assign a license (if checked and Microsoft is connected)
   - Generate a secure temporary password
   - Force password change on first login

4. **Important**: Copy the temporary password and securely share it with the new employee.

### License Management

When Microsoft 365 is connected, the sidebar displays:
- Available licenses in your tenant
- Total seats per license type
- Remaining seats
- Real-time updates after user creation

## Troubleshooting

### Setup Required Page Appears

If you see the "Setup Required" page when starting the application:
- **Missing credentials**: Your `.env.local` file doesn't exist or contains placeholder values
- **Invalid secret**: Your `NEXTAUTH_SECRET` is invalid or too short
- **Incomplete configuration**: Some OAuth credentials are missing

**Solution**: Follow the instructions shown on the setup page. The page will tell you exactly what's wrong and how to fix it.

### "Insufficient Permissions" Error

**Google:**
- Ensure the authenticated user has Super Admin privileges
- Verify Admin SDK API is enabled
- Check that the scope `https://www.googleapis.com/auth/admin.directory.user` is included

**Microsoft:**
- Verify admin consent was granted for all API permissions
- Ensure the user has Global Administrator role
- Check that `User.ReadWrite.All` and `Directory.ReadWrite.All` are granted

### "User Already Exists" Error

The email address is already taken in that platform. Use a different email or remove the existing user first.

### "No Available Seats" Error

Your Microsoft 365 tenant has no remaining licenses of the requested type. Purchase additional licenses or remove unused licenses from other users.

### Session Expired

If OAuth tokens expire:
- Primary connection: Sign out and sign back in
- Secondary connection: Click the "Link" button again for that provider

### Email Validation Errors

- Emails are automatically converted to lowercase
- Ensure the email domain matches your Google Workspace or Microsoft 365 domain
- For Microsoft, the domain must be verified in your tenant

## Security Considerations

- **Never commit `.env.local`** to version control (already in `.gitignore`)
- Rotate client secrets regularly (recommended: every 90 days)
- Use HTTPS in production (required for OAuth)
- Store temporary passwords securely (consider using a password manager or secure channel)
- Review application permissions periodically
- Enable MFA for admin accounts used with AutoBoard
- Monitor application logs in `logs/app.log` for suspicious activity

## Performance

AutoBoard is optimized for speed with:

- **Parallel User Creation**: Google and Microsoft users created simultaneously (50% faster onboarding)
- **Smart Caching**: Server-side and client-side caching reduces redundant API calls by 90%+
- **Code Splitting**: Dynamic imports reduce initial bundle size
- **Turbopack**: 700x faster compilation than Webpack
- **Request Deduplication**: Prevents duplicate API calls using SWR

### Performance Metrics

| Metric | Result |
|--------|--------|
| Production first load | <100ms |
| Dev server startup | ~1.6s |
| User onboarding | 2-3s |
| Hot reload | <200ms |

For detailed performance information and benchmarks, see [PERFORMANCE.md](./PERFORMANCE.md).

### Development vs Production

Development mode includes hot reload, source maps, and debugging tools which add overhead. For production-like performance during development, run:

```bash
npm run build && npm start
```

## Logging

Application logs are stored in `logs/app.log` with:
- Timestamp
- Log level (INFO, ERROR, WARN)
- Message and metadata

Review logs regularly to monitor:
- User creation events
- OAuth token refresh operations
- Errors and failures

## Production Deployment

### Environment Variables

Update `NEXTAUTH_URL` in production:
```bash
NEXTAUTH_URL=https://yourdomain.com
```

### OAuth Redirect URIs

Add production redirect URIs to both OAuth applications:
- Google: `https://yourdomain.com/api/auth/callback/google`
- Microsoft Entra: `https://yourdomain.com/api/auth/callback/azure-ad`
- Secondary Google: `https://yourdomain.com/api/link/google/callback`
- Secondary Microsoft: `https://yourdomain.com/api/link/microsoft/callback`

**Note**: The Microsoft callback URL uses `azure-ad` (NextAuth.js provider ID), not `entra`, for compatibility with the NextAuth.js library.

### Recommended Platforms

- **Vercel**: Native Next.js support, automatic deployments
- **Netlify**: Easy setup with Git integration
- **AWS Amplify**: Full-stack hosting
- **Self-hosted**: Use PM2 or Docker

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Turbopack
- **Authentication**: NextAuth.js v4
- **APIs**:
  - Google Admin SDK (googleapis)
  - Microsoft Graph API (@microsoft/microsoft-graph-client)
- **Data Fetching**: SWR for caching and request deduplication
- **Styling**: CSS Modules

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this in your organization.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Made with ❤️ to simplify IT onboarding**
