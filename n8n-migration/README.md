# n8n Workflow for AutoBoard

This directory contains the n8n workflow file and example templates for AutoBoard user onboarding automation.

## Quick Start

1. Import `AutoBoard.json` into n8n cloud (or self-hosted n8n)
2. Configure credentials (Google Workspace, Microsoft Graph, Redis, Gmail)
3. Set up AutoBoard API key in `.env.local`: `API_KEY=your-secret-key`
4. Test with example emails in `examples/`
5. Activate the workflow

## Complete Documentation

For detailed setup, configuration, and troubleshooting:

**📖 [`docs/n8n-integration.md`](../docs/n8n-integration.md)**

This comprehensive guide covers:
- When to use n8n vs. the built-in web UI
- Setup and configuration with Redis rate limiting
- Email parsing with multicultural name support
- Error handling and notifications
- Testing and deployment
- Troubleshooting common issues

## What's in This Directory

### AutoBoard.json
The complete n8n workflow file (import into n8n).

Handles:
- Email-triggered automation (Gmail or webhook)
- Multicultural name parsing (Spanish, Portuguese, Hebrew, compound surnames)
- Duplicate email detection with automatic fallback
- Rate limiting (10/hour, shared with web UI)
- Dual-platform user creation (Google Workspace + Microsoft 365)
- Automatic license assignment
- Audit logging to Google Sheets
- Error notifications to HR

### examples/
Sanitized email templates for testing:
- `simple-name.eml.example` - Standard two-word name
- `compound-surname.eml.example` - Spanish/Portuguese compound surname
- `patronymic-name.eml.example` - Hebrew patronymic (Ben/Bat pattern)
- `legacy-format.eml.example` - Old "Full Legal Name" format

See `examples/README.md` for usage instructions.

## Integration with AutoBoard

The n8n workflow can:
- Use AutoBoard's API for user creation (`/api/onboard/unified`)
- Share the same rate limiter (`/api/rate-limit/check`)
- Authenticate via API key (no OAuth session needed)

This provides unified rate limiting across web UI and n8n workflows.

## Need Help?

1. Check execution history in n8n (shows detailed error messages)
2. Review `docs/n8n-integration.md` troubleshooting section
3. Verify credentials are configured correctly in n8n
4. Test with example emails first before using real HR emails
