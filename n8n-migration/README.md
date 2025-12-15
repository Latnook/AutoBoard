# n8n Workflow for AutoBoard

This folder contains the n8n workflow file for AutoBoard user onboarding automation.

## Quick Start

1. Install and run n8n: `npx n8n`
2. Import `AutoBoard.json` into n8n
3. Configure Google Workspace and Microsoft Graph credentials
4. Set up API key authentication (see main n8n-OPTIONAL.md)
5. Test and activate the workflow

## Full Documentation

For complete setup instructions, workflow customization, and troubleshooting, see:

**[n8n-OPTIONAL.md](../n8n-OPTIONAL.md)** in the root directory.

## What's in This Folder

- **AutoBoard.json** - The complete n8n workflow (import this file into n8n)

The workflow handles:
- Dual-platform user creation (Google Workspace + Microsoft 365)
- Automatic Microsoft 365 license assignment
- Rate limiting integration
- Audit logging
- Error handling with partial success support
