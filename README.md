# AutoBoard

A Next.js application that automates employee onboarding by creating user accounts across both Google Workspace and Microsoft 365 simultaneously. Streamline your IT onboarding process with a single form that provisions users in both platforms at once.

## Features

### Core Functionality
- **Dual Platform Support**: Create users in Google Workspace and Microsoft 365 from one form
- **OAuth Integration**: Secure authentication with both Google and Microsoft
- **License Management**: Automatically assign Microsoft 365 licenses during user creation
- **Organizational Unit Selection**: Optional OU placement for Google Workspace users
- **Administrative Unit Assignment**: Optional AU assignment for Microsoft Entra ID users
- **Real-time License Tracking**: View available Microsoft 365 licenses in the sidebar
- **Unified or Single Platform**: Works with just one platform or both together
- **Automatic Password Generation**: Creates secure temporary passwords for new users
- **Error Handling**: Detailed error messages and partial success handling

### Security & Monitoring
- **Rate Limiting**: Built-in rate limiting (10 users/hour) to prevent abuse
- **Audit Logging**: Immutable audit trail of all user creation events
- **Session-Only Authentication**: Automatic logout when browser closes
- **1-hour Maximum Session**: Forces re-authentication after 1 hour
- **Automatic Token Refresh**: Seamless background token renewal
- **HTTP-only Cookies**: Protects against XSS attacks
- **Suspicious Activity Detection**: Alerts when unusual patterns are detected

## Recent Enhancements

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

### Installation

```bash
npm install
```

### Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your OAuth credentials (see `docs/` for detailed setup instructions)

### Development

```bash
npm run dev          # Start with environment validation
npm run dev:fast     # Start without validation (faster)
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Production

```bash
npm run build        # Build for production
npm start           # Start production server
```

## Documentation

All documentation is organized in the `docs/` directory:

- **[`docs/n8n-integration.md`](docs/n8n-integration.md)** - Comprehensive n8n workflow integration guide
- **[`docs/n8n-OPTIONAL.md`](docs/n8n-OPTIONAL.md)** - Alternative n8n setup guide
- **[`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)** - Performance optimization tips
- **[`CLAUDE.md`](CLAUDE.md)** - Developer guide for working with this codebase

## Integration Options

AutoBoard works great out of the box with its built-in Next.js API routes. For advanced automation needs, you can optionally integrate with n8n:

- **Built-in API** (Recommended): OAuth-based authentication, integrated dashboard, simple deployment
- **n8n Integration** (Optional): Visual workflow editor, email triggers, 400+ pre-built integrations, execution history

See [`docs/n8n-integration.md`](docs/n8n-integration.md) for comprehensive n8n setup instructions.

## Security Features

- **Rate Limiting**: 10 user creations per hour (configurable, shared across web UI and n8n)
- **Audit Logging**: All user creation events logged to `logs/audit.log` with restricted permissions
- **API Key Authentication**: Optional API key support for external integrations
- **Session-only Cookies**: Authentication expires when browser closes
- **HTTP-only Cookies**: Protects against XSS attacks
- **Automatic Token Refresh**: Seamless background token renewal
- **Auto Sign-out**: Invalid sessions are automatically terminated

## Customization for Your Organization

Organizations deploying AutoBoard should customize:

1. **Default Usage Location** - Set your country code as default
2. **Default License SKU** - Match your organization's primary Microsoft 365 license
3. **Default Organizational Unit** - Set your preferred Google Workspace OU path

See `CLAUDE.md` for detailed customization instructions.

## Testing

Example email templates for testing n8n workflows are available in `n8n-migration/examples/`:
- `simple-name.eml.example` - Standard two-word names
- `compound-surname.eml.example` - Spanish/Portuguese compound surnames
- `patronymic-name.eml.example` - Hebrew patronymic names
- `legacy-format.eml.example` - Legacy "Full Legal Name" format

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Workspace Admin SDK](https://developers.google.com/admin-sdk)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [n8n Documentation](https://docs.n8n.io/)

## License

Open source - feel free to customize for your organization's needs.
