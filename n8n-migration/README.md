# AutoBoard n8n Migration

This folder contains everything needed to migrate the AutoBoard employee onboarding automation from Next.js to n8n.

## Files in This Folder

- **autoboard-workflow.json** - Complete n8n workflow (import this into n8n)
- **CREDENTIALS-SETUP.md** - Step-by-step guide to configure API credentials
- **WORKFLOW-GUIDE.md** - How the workflow operates and customization options
- **COMPARISON.md** - Differences between Next.js and n8n implementations

## Quick Start

### 1. Import the Workflow

1. Open your n8n instance
2. Click **Workflows** → **Import from File**
3. Select `autoboard-workflow.json`
4. The workflow will appear in your workspace

### 2. Configure Credentials

Follow the instructions in **CREDENTIALS-SETUP.md** to set up:
- Google Workspace Service Account or OAuth2
- Microsoft Graph API OAuth2
- (Optional) Email/Slack for notifications

### 3. Test the Workflow

1. Click **Execute Workflow** in n8n
2. Manually trigger with test data
3. Verify users are created in both platforms

### 4. Deploy

Once tested:
- Enable the webhook trigger
- Use the webhook URL in your forms/frontend
- Or schedule the workflow to process from a spreadsheet

## Key Features

✅ Dual-platform user creation (Google Workspace + Microsoft 365)
✅ Automatic Microsoft license assignment
✅ Password generation and enforcement
✅ Error handling with partial success support
✅ License availability checking
✅ Notification on completion

## Advantages Over Next.js Version

- **No Code Maintenance**: Visual workflow editor, no server to maintain
- **Built-in Credential Management**: Secure storage and automatic token refresh
- **Easy Integration**: Add Slack, email, database logging with drag-and-drop
- **Self-hosted or Cloud**: Deploy on your infrastructure or use n8n Cloud
- **Monitoring**: Built-in execution history and error tracking

## Support

For n8n-specific questions: https://docs.n8n.io
For workflow issues: Review the execution logs in n8n UI
