# Credentials Setup Guide

This guide walks through setting up API credentials for the AutoBoard n8n workflow.

## Google Workspace Setup

You need admin access to Google Workspace and the Google Cloud Console.

### Option 1: Service Account (Recommended for Production)

1. **Create Service Account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select your project or create a new one
   - Navigate to **IAM & Admin** → **Service Accounts**
   - Click **Create Service Account**
   - Name it "n8n-autoboard" and create

2. **Generate Key**:
   - Click on the service account
   - Go to **Keys** tab → **Add Key** → **Create new key**
   - Choose **JSON** format
   - Save the downloaded JSON file securely

3. **Enable Domain-Wide Delegation**:
   - In service account details, click **Show Domain-Wide Delegation**
   - Enable **Enable Google Workspace Domain-wide Delegation**
   - Note the **Client ID**

4. **Grant Admin API Access**:
   - Go to [Google Admin Console](https://admin.google.com)
   - Navigate to **Security** → **API Controls** → **Domain-wide Delegation**
   - Click **Add new**
   - Enter the Client ID from step 3
   - Add OAuth scope: `https://www.googleapis.com/auth/admin.directory.user`
   - Authorize

5. **Enable Admin SDK API**:
   - In Google Cloud Console, go to **APIs & Services** → **Library**
   - Search for "Admin SDK API"
   - Click **Enable**

6. **Configure in n8n**:
   - In n8n, create **Google Service Account** credential
   - Upload the JSON key file
   - Enter your admin email (email that will impersonate)
   - Save

### Option 2: OAuth2 (Simpler for Testing)

1. **Create OAuth2 Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URI: `https://your-n8n-instance.com/rest/oauth2-credential/callback`
   - Note the Client ID and Client Secret

2. **Enable Admin SDK API** (same as above)

3. **Configure in n8n**:
   - Create **Google OAuth2 API** credential
   - Enter Client ID and Client Secret
   - Add scope: `https://www.googleapis.com/auth/admin.directory.user`
   - Click **Connect** and authorize with an admin account

---

## Microsoft 365 Setup

You need admin access to Azure AD.

### 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: "n8n AutoBoard"
5. Supported account types: **Accounts in this organizational directory only**
6. Redirect URI:
   - Platform: **Web**
   - URI: `https://your-n8n-instance.com/rest/oauth2-credential/callback`
7. Click **Register**

### 2. Configure API Permissions

1. In the app registration, go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Add these permissions:
   - `User.ReadWrite.All`
   - `Directory.ReadWrite.All`
4. Click **Grant admin consent** (requires Global Administrator)
5. Verify all permissions show "Granted for [Your Organization]"

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: "n8n AutoBoard"
4. Expiry: Choose appropriate duration (recommend 24 months)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (shown only once)

### 4. Note Required Values

From the app registration **Overview** page, note:
- **Application (client) ID**
- **Directory (tenant) ID**
- **Client secret** (from step 3)

### 5. Configure in n8n

1. In n8n, create **Microsoft Graph API OAuth2** credential
2. Choose **Grant Type**: `Client Credentials` (for app-only access)
3. Enter:
   - **Client ID**: Application (client) ID
   - **Client Secret**: The secret value
   - **Tenant ID**: Directory (tenant) ID
4. Save and test the connection

---

## Optional: Email Notifications

If you want email notifications when users are created:

### SMTP Credential

1. In n8n, create **SMTP** credential
2. Enter your mail server details:
   - Host: `smtp.gmail.com` (for Gmail)
   - Port: `587`
   - User: Your email
   - Password: App password (not regular password)
   - Use TLS: Yes

### Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not already)
3. Go to **App passwords**
4. Generate new app password for "Mail"
5. Use this in n8n SMTP credential

---

## Optional: Slack Notifications

1. In n8n, create **Slack OAuth2** credential
2. Click **Connect** and authorize
3. Select the workspace and channel

---

## Testing Credentials

After configuring credentials:

1. Open the AutoBoard workflow in n8n
2. Click on each node (Google Workspace, Microsoft Graph)
3. Select the credential you created
4. Click **Test Step** to verify connection
5. Fix any errors before running the full workflow

---

## Security Best Practices

✅ Use Service Account for Google (more secure than OAuth for automation)
✅ Set short expiry on Microsoft client secrets and rotate regularly
✅ Grant minimum required permissions (don't add extra scopes)
✅ Store credentials only in n8n (don't commit to git)
✅ Use dedicated service accounts, not personal admin accounts
✅ Enable audit logging in both Google and Microsoft admin consoles
✅ Regularly review n8n execution logs for unauthorized access attempts

---

## Troubleshooting

### Google Errors

**"Insufficient permissions"**
- Verify domain-wide delegation is enabled and authorized
- Check the OAuth scope is exactly: `https://www.googleapis.com/auth/admin.directory.user`
- Ensure Admin SDK API is enabled

**"User already exists"**
- Normal error - workflow handles this gracefully
- Check if user was created in previous run

### Microsoft Errors

**"Insufficient privileges"**
- Verify admin consent was granted
- Check permissions include User.ReadWrite.All and Directory.ReadWrite.All
- Ensure using "Application permissions" not "Delegated permissions"

**"Invalid client secret"**
- Client secret may have expired
- Generate new secret in Azure Portal
- Update credential in n8n

**"License assignment failed"**
- Check if licenses are available (workflow includes license check)
- Verify usageLocation is set on user
- Ensure SKU ID matches your subscription

---

## Credential Storage

n8n stores credentials encrypted in its database. Credentials are:
- Never exposed in workflow JSON exports
- Automatically injected at runtime
- Can be shared across multiple workflows
- Backed up with n8n database backups

When you export the workflow, credential references are included but not the actual credentials, so you'll need to reconfigure them after import.
