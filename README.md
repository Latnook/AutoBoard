# AutoBoard

A Next.js application that automates employee onboarding by creating user accounts across both Google Workspace and Microsoft 365 simultaneously. Streamline your IT onboarding process with a single form that provisions users in both platforms at once.

## Features

- **Dual Platform Support**: Create users in Google Workspace and Microsoft 365 from one form
- **OAuth Integration**: Secure authentication with both Google and Microsoft
- **License Management**: Automatically assign Microsoft 365 licenses during user creation
- **Organizational Unit Selection**: Optional OU placement for Google Workspace users (NEW)
- **Administrative Unit Assignment**: Optional AU assignment for Microsoft Entra ID users (NEW)
- **Real-time License Tracking**: View available Microsoft 365 licenses in the sidebar
- **Unified or Single Platform**: Works with just one platform or both together
- **Automatic Password Generation**: Creates secure temporary passwords for new users
- **Error Handling**: Detailed error messages and partial success handling
- **Session Management**: Automatic token refresh for uninterrupted operation
- **Session-Only Authentication**: Automatic logout when browser closes for enhanced security

## New Features

### Google Workspace - Organizational Unit (OU) Selection

Optionally specify which Organizational Unit to place new users in:

- **Toggle to enable/disable**: Hidden by default to avoid clutter
- **Custom OU path input**: Enter paths like `/Sales`, `/Engineering/Backend`, etc.
- **Defaults to root**: When disabled, users are placed in `/` (root OU)
- **Available in all modes**: Works with unified and Google-only onboarding

**How to use:**
1. Enable "Specify Google Workspace Organizational Unit" checkbox
2. Enter the full OU path (e.g., `/Marketing/EMEA`)
3. Ensure the OU exists in Google Workspace Admin Console

### Microsoft Entra ID - Administrative Unit Assignment

Optionally assign new users to Administrative Units:

- **Toggle to enable/disable**: Hidden by default
- **GUID-based selection**: Enter the Administrative Unit ID from Entra ID
- **Post-creation assignment**: User is added to AU after successful creation
- **Graceful error handling**: Continues even if AU assignment fails

**How to use:**
1. Create Administrative Units in Entra ID (Identity > Administrative units)
2. Copy the Administrative Unit ID (GUID format)
3. Enable "Assign to Administrative Unit (Entra ID)" checkbox
4. Paste the AU ID

**Required permission:** `AdministrativeUnit.ReadWrite.All`

## Getting Started

For full setup instructions, see the comprehensive README in the GitHub repository.

Quick start:
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Integration Options

AutoBoard works great out of the box with its built-in Next.js API routes. For advanced automation needs, you can optionally integrate with n8n:

- **Built-in API** (Recommended): OAuth-based authentication, integrated dashboard, simple deployment
- **n8n Integration** (Optional): Visual workflow editor, 400+ pre-built integrations, execution history

See `n8n-OPTIONAL.md` for n8n setup instructions.

## Security

- **Session-only cookies**: Authentication expires when browser closes
- **1-hour maximum session**: Forces re-authentication after 1 hour
- **Automatic token refresh**: Seamless background token renewal
- **Auto sign-out**: Invalid sessions are automatically terminated
- **HTTP-only cookies**: Protects against XSS attacks

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Workspace Admin SDK](https://developers.google.com/admin-sdk)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
