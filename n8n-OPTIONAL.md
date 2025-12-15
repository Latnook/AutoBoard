# n8n Integration (Optional)

AutoBoard works perfectly with its built-in Next.js API routes. **n8n integration is completely optional** and provides an alternative way to trigger user creation workflows.

## When to Use n8n

Consider using n8n if you:
- Want a visual workflow editor instead of modifying code
- Need to integrate with other services (Slack notifications, Google Sheets, databases)
- Prefer no-code automation tools
- Want built-in execution history and monitoring

## Quick Start

### 1. Install and Run n8n

```bash
# Using npx (recommended for testing)
npx n8n

# Or install globally
npm install -g n8n
n8n
```

n8n will start on http://localhost:5678

### 2. Import the Workflow

1. Open n8n at http://localhost:5678
2. Click **Workflows** → **Import from File**
3. Select `n8n-migration/AutoBoard.json`
4. The workflow will appear in your workspace

### 3. Configure Credentials

The workflow needs two OAuth credentials:

**Google Workspace Admin API:**
- In n8n, go to **Credentials** → **Create New**
- Select "Google Workspace Admin" or "Google Service Account"
- Follow n8n's credential setup wizard
- Required scope: `https://www.googleapis.com/auth/admin.directory.user`

**Microsoft Graph Security API:**
- In n8n, go to **Credentials** → **Create New**
- Select "Microsoft Graph Security"
- Follow n8n's OAuth2 setup wizard
- Required scopes: `User.ReadWrite.All`, `Directory.ReadWrite.All`

### 4. Set Up API Key Authentication

The workflow uses an API key to authenticate with your AutoBoard instance:

1. In your AutoBoard `.env.local`, add:
   ```
   API_KEY=your-secure-random-key-here
   ```
   Generate a secure key: `openssl rand -base64 32`

2. In n8n, update the "Check Rate Limit" and "Log Audit" nodes:
   - Set the `X-API-Key` header to match your API key
   - Update the URL to your AutoBoard instance (default: `http://localhost:3000`)

### 5. Test the Workflow

1. In n8n, click **Execute Workflow**
2. The webhook node will show a test URL
3. Send a POST request with employee data:
   ```json
   {
     "firstName": "John",
     "lastName": "Doe",
     "email": "john.doe@company.com",
     "jobTitle": "Software Engineer",
     "department": "Engineering",
     "assignLicense": true,
     "usageLocation": "US"
   }
   ```

4. Check the execution log to verify user creation

## How It Works

### Workflow Diagram

```mermaid
graph TD
    A[Webhook Trigger] --> B[Set User Data]
    B --> C[Rate Limit Check]
    C -->|Limit OK| D[Create Google User]
    C -->|Limit OK| E[Create Microsoft User]
    C -->|Limit Exceeded| F[Rate Limit Response]
    D --> G{License?}
    E --> G
    G -->|Yes| H[Get Available SKUs]
    H --> I[Resolve SKU ID]
    I --> J[Assign License]
    J --> K[Merge Results]
    G -->|No| K
    K --> L[Log Audit Event]
    L --> M[Respond with Results]
```

### Workflow Steps

1. **Webhook Trigger** - Receives employee data via HTTP POST
2. **Set User Data** - Normalizes and prepares user information
3. **Rate Limit Check** - Calls `/api/rate-limit/check` to prevent abuse (stops if limit exceeded)
4. **Create Google User** - Creates user in Google Workspace (continues on error)
5. **Create Microsoft User** - Creates user in Microsoft 365 (continues on error)
6. **Get Available SKUs** - Fetches available licenses (if license assignment requested)
7. **Resolve SKU ID** - Maps license name to GUID
8. **Assign License** - Assigns Microsoft 365 license to new user
9. **Merge Results** - Combines results from both platforms
10. **Log Audit Event** - Calls `/api/audit/log` to record the action
11. **Respond with Results** - Returns success/failure status and temporary password

### Security Features

The workflow integrates with AutoBoard's built-in security:

- **Rate Limiting**: Shares the same 10 users/hour limit as the web UI
- **Audit Logging**: All user creations are logged to `logs/audit.log`
- **API Key Authentication**: Prevents unauthorized workflow execution

## Workflow Customization

### Changing Default License

Edit the "Resolve SKU ID" node to change the default license from `O365_BUSINESS_PREMIUM`:

```javascript
const targetSku = 'YOUR_LICENSE_NAME'; // e.g., 'ENTERPRISEPACK'
```

Check your available licenses in Microsoft Admin Center → Billing → Licenses.

### Adding Notifications

n8n makes it easy to add notifications:

1. After the "Merge Results" node, add a new node
2. Select the integration you want (Slack, Email, Teams, etc.)
3. Configure the notification message using the results data

Example Slack message:
```
✅ New user created: {{ $('Set User Data').first().json.email }}
🔑 Temporary password: {{ $('Merge Results').first().json.temporaryPassword }}
```

### Using with Google Sheets

Instead of a webhook trigger, you can use Google Sheets as the data source:

1. Replace "Webhook Trigger" with "Google Sheets" node
2. Configure it to read new rows from your onboarding sheet
3. Set up a schedule (e.g., every 15 minutes)
4. The workflow will automatically process new employees

## Production Deployment

### Running n8n in Production

For production use, run n8n with Docker or as a service:

**Docker:**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - 5678:5678
    environment:
      - N8N_CORS_ORIGINS=http://localhost:3000
    volumes:
      - ~/.n8n:/home/node/.n8n
    restart: unless-stopped
```

### Environment Variables for n8n

Create a `.env` file in your n8n directory:

```bash
N8N_CORS_ORIGINS=http://localhost:3000,https://your-autoboard-domain.com
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
```

### Activating the Workflow

1. In n8n, open the AutoBoard workflow
2. Toggle "Active" at the top right
3. The webhook will now accept real requests
4. Use the webhook URL in your forms or other integrations

## Comparison: Built-in API vs n8n

| Feature | Built-in Next.js API | n8n Workflow |
|---------|---------------------|--------------|
| **Setup Complexity** | Low (included) | Medium (requires n8n instance) |
| **Authentication** | NextAuth OAuth (user-friendly) | API key or webhook URL |
| **UI Dashboard** | ✅ Included | ❌ Separate (need to build) |
| **Customization** | Code changes required | Visual editing |
| **Integrations** | Manual coding | 400+ pre-built nodes |
| **Monitoring** | Log files | Built-in execution history |
| **Error Handling** | Code-based | Visual + "Continue on Error" |
| **Learning Curve** | Familiar to developers | Easy for non-developers |

## Troubleshooting

### Workflow returns 401 Unauthorized
- Check that the `X-API-Key` header in n8n matches your `.env.local` API_KEY
- Ensure there are no extra spaces in the header value

### Rate limit exceeded
- Both web UI and n8n share the same rate limit (10 users/hour)
- Wait for the limit to reset (shown in error message)
- Or adjust `RATE_LIMIT_MAX_REQUESTS` in `.env.local`

### Users created but not logged in audit log
- Verify `logs/audit.log` exists and has write permissions
- Check that "Log Audit Event" node is set to "Continue on Error"
- Review n8n execution log for the "Log Audit Event" node

### License assignment fails
- Ensure the SKU name in "Resolve SKU ID" matches your tenant's licenses
- Check that `usageLocation` is set correctly (required for license assignment)
- Verify the Microsoft credential has the `Directory.ReadWrite.All` scope

## When to Use Built-in API Instead

Stick with the built-in Next.js API if you:
- Want a simple, integrated solution
- Prefer OAuth-based authentication
- Don't need complex integrations
- Value having everything in one codebase
- Want to avoid running a separate n8n instance

The built-in API provides the same functionality with better integration and simpler deployment.
