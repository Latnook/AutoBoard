# n8n Integration Guide

This guide covers optional n8n workflow integration for AutoBoard, enabling email-triggered automation and advanced workflow capabilities.

**Important**: The built-in Next.js API is recommended for most deployments. Use n8n only if you need email triggers, visual workflow editing, or additional integrations.

---

## Table of Contents

1. [When to Use n8n](#when-to-use-n8n)
2. [Architecture Overview](#architecture-overview)
3. [Setup Guide](#setup-guide)
4. [Rate Limiting with Redis](#rate-limiting-with-redis)
5. [Email-Triggered Automation](#email-triggered-automation)
6. [Testing & Deployment](#testing--deployment)
7. [Troubleshooting](#troubleshooting)

---

## When to Use n8n

Consider n8n integration if you need:
- **Email-triggered onboarding**: Automatically process HR emails to create users
- **Visual workflow editor**: Non-developers can modify automation logic
- **400+ integrations**: Connect to Slack, Google Sheets, HRIS systems, ticketing tools
- **Execution history**: Built-in audit trail of all workflow runs
- **Cloud-based**: Run 24/7 without local infrastructure

**Don't need these features?** Use the built-in AutoBoard web UI instead - it's simpler and requires no external services.

---

## Architecture Overview

### Workflow Components

The n8n workflow (`n8n-migration/AutoBoard.json`) implements:

```
[Trigger] → [Parse Data] → [Rate Limit] → [Create Users] → [Notify]
```

**Trigger Options:**
- **Gmail Trigger**: Polls HR email inbox every 30 minutes for onboarding requests
- **Webhook**: HTTP endpoint for programmatic triggering

**Processing Pipeline:**
1. Parse employee data from email or webhook
2. Check rate limit (10 requests/hour via Redis)
3. Create Google Workspace user
4. Create Microsoft 365 user + assign license
5. Log to Google Sheets audit trail
6. Send confirmation email to HR

**Integration with AutoBoard:**
- Uses AutoBoard API via API key authentication
- Shares rate limiter (`/api/rate-limit/check`)
- Unified rate limiting across web UI and n8n

---

## Setup Guide

### Prerequisites

1. **n8n Cloud Account** (or self-hosted n8n instance)
2. **Upstash Redis Account** (free tier) - for rate limiting
3. **AutoBoard API Key** - set in `.env.local`

### Step 1: Configure AutoBoard API Key

Add to `.env.local`:
```bash
API_KEY=your-secure-random-key-here
```

Generate a secure key:
```bash
openssl rand -base64 32
```

### Step 2: Set Up Redis (Upstash)

1. Go to https://upstash.com and create free account
2. Click "Create Database"
3. Name: `autoboard-rate-limit`
4. Select region close to you
5. Copy credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 3: Import Workflow

1. Log into n8n cloud
2. Click "Import from File"
3. Upload `n8n-migration/AutoBoard.json`
4. Configure credentials (see below)

### Step 4: Configure Credentials

In n8n, add these credentials:

**Google Workspace Admin:**
- Type: Google Service Account or OAuth2
- Scope: `https://www.googleapis.com/auth/admin.directory.user`

**Microsoft Graph:**
- Type: Microsoft Graph OAuth2
- Scopes: `User.ReadWrite.All`, `Directory.ReadWrite.All`

**Google Sheets** (for audit logging):
- Type: Google Sheets OAuth2
- Create a spreadsheet for audit logs

**Gmail** (for email trigger - optional):
- Type: Gmail OAuth2
- Use HR automation email account

**Redis:**
- Host: Your Upstash REST URL
- Token: Your Upstash REST token

### Step 5: Configure Workflow Variables

In n8n workflow settings, add environment variables:
- `AUTOBOARD_API_URL`: `https://your-autoboard-domain.com` (or `http://localhost:3000` for dev)
- `AUTOBOARD_API_KEY`: Same as `API_KEY` in `.env.local`

---

## Rate Limiting with Redis

### Why Global Rate Limiting?

The workflow uses **global rate limiting** (not per-user) to prevent abuse:
- ✅ Prevents email enumeration attacks
- ✅ Protects n8n cloud quota from abuse
- ✅ Simple single-counter implementation
- ✅ Shared with AutoBoard web UI

**Example**: Without global limiting, an attacker could bypass limits by trying different email addresses. With global limiting, only 10 total requests per hour are allowed.

### Implementation

**Node 1: Get Rate Limit from Redis**
- Type: Redis → Get
- Key: `ratelimit:global`
- Continue on Error: ON

**Node 2: Check & Update Rate Limit (Code)**
```javascript
// Configuration
const MAX_REQUESTS_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Get current count from Redis
const redisNode = $('Get Rate Limit from Redis');
let currentCount = 0;
let resetAt = null;

if (redisNode && redisNode.first().json) {
  try {
    const data = JSON.parse(redisNode.first().json);
    currentCount = data.count || 0;
    resetAt = data.resetAt;
  } catch (e) {
    currentCount = 0;
  }
}

const now = Date.now();

// Reset window if expired
if (!resetAt || now > resetAt) {
  currentCount = 1;
  resetAt = now + WINDOW_MS;
} else {
  currentCount++;
}

// Check limit
const allowed = currentCount <= MAX_REQUESTS_PER_HOUR;
const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - currentCount);

return [{
  json: {
    allowed,
    count: currentCount,
    limit: MAX_REQUESTS_PER_HOUR,
    remaining,
    resetAt,
    redisValue: JSON.stringify({ count: currentCount, resetAt })
  }
}];
```

**Node 3: IF Node**
- Condition: `{{ $json.allowed }}` equals `true`
- TRUE → Save to Redis and continue
- FALSE → Return 429 error

**Node 4: Save to Redis**
- Type: Redis → Set
- Key: `ratelimit:global`
- Value: `{{ $json.redisValue }}`
- Expire: 3600 seconds (1 hour)

### Alternative: Use AutoBoard API Rate Limiter

Instead of Redis nodes, call AutoBoard's rate limit API:

**HTTP Request Node:**
```
POST https://your-autoboard-domain.com/api/rate-limit/check
Headers:
  x-api-key: YOUR_API_KEY
```

Returns:
```json
{
  "allowed": true,
  "remaining": 9,
  "limit": 10,
  "resetAt": 1234567890
}
```

---

## Email-Triggered Automation

### Email Format from HR

HR sends structured emails that the workflow parses automatically.

**Recommended Format (Eliminates Parsing Issues):**
```
Subject: New Hire Onboarding: John Doe - Software Engineer - US

Given Name: John
Surname: Doe
Preferred Name: Johnny
Personal Email Address: john@example.com
Manager: Jane Smith
Position: Software Engineer
Department: Engineering
```

**Legacy Format (Still Supported):**
```
Subject: New Hire Onboarding: John Doe - Software Engineer - US

Full Legal Name: John Michael Doe
Preferred Name: Johnny
Personal Email Address: john@example.com
Manager: Jane Smith
Position: Software Engineer
Department: Engineering
```

### Email Parser Node

The workflow includes a sophisticated parser that handles:
- **Multicultural names**: Spanish, Portuguese, Hebrew, compound surnames
- **Patronymic detection**: "Ben Shabat", "Bat Yosef" kept together
- **Surname particles**: "de la Cruz", "van der Berg", etc.
- **Preferred names**: Override legal first name for email generation
- **Duplicate detection**: Tries `firstname@domain.com`, then `firstname.l@domain.com`

**Parsing Logic:**
1. Extract fields from email body (handles HTML table → plain text conversion)
2. Parse full name with smart compound surname detection:
   - 2 words: "Ben Shalev" → First: "Ben", Last: "Shalev"
   - 3+ words with patronymic: "Ofek Ben Shabat" → First: "Ofek", Last: "Ben Shabat"
   - 3+ words with particles: "Juan de la Cruz" → First: "Juan", Last: "de la Cruz"
   - Default: Last 2 words as surname for Spanish/Portuguese names
3. Use preferred name for email if provided
4. Generate email: `firstname@domain.com` (normalized, accents removed)

### Gmail Trigger Setup

1. Create dedicated automation email (e.g., `hr-automation@company.com`)
2. Add Gmail Trigger node:
   - Filter by sender: `hr@company.com`
   - Subject contains: "New Hire Onboarding"
   - Poll interval: 15-30 minutes
3. Generate app-specific password for Gmail OAuth

### Error Notifications

**Parsing Errors:**
- Sends email to HR with error details and debugging info
- Includes suggestions for fixing the format

**Duplicate Emails:**
- Tries alternative email with last initial
- If both exist, notifies HR for manual intervention

**API Failures:**
- Continues with partial creation (e.g., Google succeeds, Microsoft fails)
- Sends detailed status in confirmation email

### Success Confirmation Email

Sent to HR after successful creation:
```
Subject: Re: New Hire Onboarding: John Doe - Software Engineer - US

Account Details:
Work Email: john@company.com
Temporary Password: Temp123!XYZ

Account Status:
✅ Google Workspace: Created successfully
✅ Microsoft 365: Created successfully

Next Steps:
1. Share credentials with John Doe
2. User must change password on first login
```

---

## Testing & Deployment

### Test Rate Limiting

**Using Redis Implementation:**
1. Send 11 requests rapidly
2. First 10 succeed
3. 11th returns HTTP 429
4. Wait 1 hour → counter resets

**Using AutoBoard API:**
Same behavior, but rate limit is shared with web UI.

### Test Email Parsing

Send test emails with various name formats:
- Simple: "John Doe"
- Compound: "María Belén Serna Valdiviezo"
- Patronymic: "Ofek Ben Shabat"
- With particles: "Juan Carlos de la Cruz"

### Test Duplicate Detection

1. Create user "john@company.com" manually first
2. Send onboarding email for "John Smith"
3. Workflow should try "john.s@company.com"

### Production Checklist

- [ ] Configure Redis credentials (Upstash)
- [ ] Set up Google Sheets audit log
- [ ] Configure Gmail OAuth for email trigger
- [ ] Test rate limiting with multiple requests
- [ ] Verify error notifications reach HR
- [ ] Set AutoBoard `API_KEY` in environment
- [ ] Enable workflow and set to "Active"
- [ ] Test end-to-end with real HR email format

### Monitoring

**Execution History:**
- View in n8n → Workflow → Executions
- Shows all runs with input/output data
- Useful for debugging failed runs

**Audit Logging:**
- Google Sheets contains permanent audit trail
- Columns: Timestamp, Email, Status, Errors, Trigger Source

**Rate Limit Monitoring:**
- Check Redis key `ratelimit:global` for current count
- Or call `/api/rate-limit/status` (doesn't increment counter)

---

## Troubleshooting

### Rate Limit Not Working

**Symptom**: Can send unlimited requests

**Fix**:
- Check Redis connection in n8n credentials
- Verify Redis Set node has "Expire: 3600" configured
- Check workflow IF node condition: `{{ $json.allowed }}` equals `true` (boolean)

### Email Parsing Fails

**Symptom**: Parsing error notifications sent to HR

**Fix**:
- Check HR email format matches expected structure
- View n8n execution log → "Parse HR Email" node output
- Update parser regex if HR email template changed

### Users Not Created

**Symptom**: Workflow succeeds but no users appear

**Fix**:
- Check Google/Microsoft credentials in n8n
- Verify OAuth scopes are correct
- Check n8n execution log for API errors
- Ensure `API_KEY` matches between n8n and AutoBoard

### Duplicate Email Doesn't Trigger Alternative

**Symptom**: Workflow fails instead of trying `firstname.l@domain.com`

**Fix**:
- Parser needs last name to generate alternative
- If only first name provided, workflow will fail (by design)
- HR should include full legal name in email

### Redis Connection Fails

**Symptom**: "Get Rate Limit from Redis" node errors

**Fix**:
- Verify Upstash credentials are correct
- Check "Continue on Error" is enabled (first request will fail - no key exists yet)
- Test Redis connection in n8n credentials page

---

## Cost Breakdown

- **n8n Cloud**: Free tier includes 5,000 workflow executions/month
- **Upstash Redis**: Free tier includes 10,000 requests/day
- **Total**: $0 for typical usage (< 200 employees/month)

Upgrade to paid tiers if you exceed:
- n8n: >5,000 onboardings/month ($20/month)
- Redis: >10,000 rate checks/day (unlikely, $0.20/100k requests)

---

## When You Still Need AutoBoard Web UI

Even with n8n, you may want to deploy AutoBoard if:
- HR needs manual user creation (not just email-based)
- You want OAuth-based security instead of API keys
- You need centralized audit logging in your own database
- Custom branding and user experience required
- Real-time license availability display

**Best of Both**: Deploy AutoBoard web UI + n8n workflow for maximum flexibility.

---

## Additional Resources

- **Workflow File**: `n8n-migration/AutoBoard.json`
- **Example Emails**: `n8n-migration/examples/` (sanitized templates)
- **n8n Documentation**: https://docs.n8n.io/
- **Upstash Redis**: https://docs.upstash.com/redis

For questions or issues, check the n8n execution logs first - they show detailed error messages and data flow.
