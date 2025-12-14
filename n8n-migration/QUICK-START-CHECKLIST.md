# Quick Start Checklist

Follow this checklist to get AutoBoard running on n8n in under 30 minutes.

## Prerequisites

- [ ] n8n instance running (self-hosted or n8n Cloud)
- [ ] Google Workspace admin access
- [ ] Microsoft 365 admin access
- [ ] Domain for user emails

---

## Step 1: n8n Setup (5 minutes)

### Self-Hosted n8n

```bash
# Docker installation (recommended)
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Access at http://localhost:5678
```

### n8n Cloud

- [ ] Sign up at https://n8n.io
- [ ] Create new account
- [ ] Access your instance

---

## Step 2: Import Workflow (2 minutes)

- [ ] Open n8n UI
- [ ] Click **Workflows** → **Import from File**
- [ ] Select `autoboard-workflow.json` from this folder
- [ ] Workflow appears in workspace

---

## Step 3: Google Credentials (10 minutes)

Choose one approach:

### Option A: OAuth2 (Simpler)

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create project "n8n AutoBoard"
- [ ] Enable Admin SDK API
- [ ] Create OAuth2 credentials
- [ ] Add redirect URI: `https://your-n8n-instance/rest/oauth2-credential/callback`
- [ ] In n8n, create "Google Workspace OAuth2" credential
- [ ] Connect and authorize with admin account

### Option B: Service Account (More Secure)

- [ ] Create service account in Google Cloud Console
- [ ] Download JSON key
- [ ] Enable domain-wide delegation
- [ ] Authorize in Google Admin Console
- [ ] Scope: `https://www.googleapis.com/auth/admin.directory.user`
- [ ] In n8n, create "Google Service Account" credential
- [ ] Upload JSON key

Full instructions: See **CREDENTIALS-SETUP.md**

---

## Step 4: Microsoft Credentials (10 minutes)

- [ ] Go to [Azure Portal](https://portal.azure.com)
- [ ] Navigate to **Azure Active Directory** → **App registrations**
- [ ] Create new app "n8n AutoBoard"
- [ ] Add redirect URI: `https://your-n8n-instance/rest/oauth2-credential/callback`
- [ ] Go to **API permissions**
- [ ] Add Microsoft Graph permissions:
  - [ ] `User.ReadWrite.All`
  - [ ] `Directory.ReadWrite.All`
- [ ] Grant admin consent
- [ ] Create client secret
- [ ] Copy: Application ID, Directory ID, Client Secret
- [ ] In n8n, create "Microsoft Graph API" credential
- [ ] Enter credentials and save

Full instructions: See **CREDENTIALS-SETUP.md**

---

## Step 5: Configure Workflow Nodes (3 minutes)

Open the imported workflow and assign credentials:

- [ ] Click **"Google - Create User"** node
- [ ] Select your Google credential
- [ ] Click **"Microsoft - Create User"** node
- [ ] Select your Microsoft credential
- [ ] Click **"Get Available SKUs"** node
- [ ] Select your Microsoft credential
- [ ] Click **"Assign License"** node
- [ ] Select your Microsoft credential

---

## Step 6: Test Workflow (5 minutes)

- [ ] Click **"Execute Workflow"** button
- [ ] Click **"Listen for Test Event"** in Webhook node
- [ ] Copy test webhook URL
- [ ] Send test request:

```bash
curl -X POST [TEST_WEBHOOK_URL] \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "testuser@yourdomain.com",
    "jobTitle": "QA Tester",
    "department": "Quality Assurance",
    "usageLocation": "US",
    "assignLicense": true
  }'
```

- [ ] Check execution log in n8n
- [ ] Verify result shows success
- [ ] Check Google Admin Console for new user
- [ ] Check Microsoft Admin Center for new user
- [ ] Verify license assigned in Microsoft

---

## Step 7: Activate Workflow (1 minute)

- [ ] Click **"Active"** toggle in top-right corner
- [ ] Webhook becomes available at production URL
- [ ] Copy production webhook URL

---

## Step 8: Frontend Integration (5 minutes)

Choose one:

### Keep Next.js Frontend

- [ ] Update `OnboardingForm.js` to call n8n webhook
- [ ] See **FRONTEND-INTEGRATION.md** for code
- [ ] Test from frontend

### Simple HTML Form

- [ ] Use `index.html` from **FRONTEND-INTEGRATION.md**
- [ ] Update webhook URL
- [ ] Deploy to any static host

### React SPA

- [ ] Create React app
- [ ] Use code from **FRONTEND-INTEGRATION.md**
- [ ] Deploy

---

## Optional: Email Notifications

If you want email alerts:

- [ ] Configure SMTP credential in n8n
- [ ] Edit "Send Success Notification" node
- [ ] Update recipient emails
- [ ] Enable the node (uncheck "Disabled")
- [ ] Edit "Send Error Notification" node
- [ ] Enable the node

Full instructions: See **CREDENTIALS-SETUP.md** → Email Notifications

---

## Optional: Slack Notifications

- [ ] Create Slack OAuth2 credential in n8n
- [ ] Add Slack node to workflow
- [ ] Configure channel and message
- [ ] Connect after "Was Successful?" node

---

## Verification Checklist

After setup, verify:

- [ ] Workflow is **Active**
- [ ] Webhook URL is accessible
- [ ] Test request returns success
- [ ] Users created in Google Workspace
- [ ] Users created in Microsoft 365
- [ ] Licenses assigned (if requested)
- [ ] Temporary password works
- [ ] Frontend can call webhook
- [ ] Errors handled gracefully
- [ ] Notifications sent (if enabled)

---

## Troubleshooting

### "Insufficient permissions" error

**Google**:
- Verify Admin SDK API enabled
- Check domain-wide delegation authorized
- Confirm OAuth scope correct

**Microsoft**:
- Verify admin consent granted
- Check Application permissions (not Delegated)
- Confirm User.ReadWrite.All and Directory.ReadWrite.All added

### "User already exists" error

- Normal if user previously created
- Check Google/Microsoft admin consoles
- Use different email for testing

### "No available licenses" error

- Purchase more Microsoft licenses
- Or set `assignLicense: false` in request

### Webhook not responding

- Verify workflow is Active
- Check n8n execution logs
- Test with production URL (not test URL)
- Check firewall/CORS settings

### CORS errors from frontend

**Self-hosted n8n**:
```bash
# Add to .env or docker run command
N8N_CORS_ORIGINS=https://yourdomain.com
```

**n8n Cloud**: CORS handled automatically

---

## Security Recommendations

Before production:

- [ ] Secure webhook with API key (see **FRONTEND-INTEGRATION.md**)
- [ ] Enable HTTPS on n8n instance
- [ ] Rotate credentials regularly
- [ ] Set up monitoring/alerting
- [ ] Review n8n execution logs weekly
- [ ] Back up n8n database
- [ ] Restrict n8n admin access
- [ ] Use environment variables for secrets
- [ ] Enable audit logging in Google/Microsoft

---

## Next Steps

After successful setup:

1. **Customize**: Modify workflow for your needs (see **WORKFLOW-GUIDE.md**)
2. **Integrate**: Connect frontend (see **FRONTEND-INTEGRATION.md**)
3. **Monitor**: Check executions daily for first week
4. **Scale**: Add more integrations (Slack, databases, etc.)
5. **Document**: Keep notes on customizations
6. **Backup**: Export workflow JSON regularly

---

## Support Resources

- **n8n Docs**: https://docs.n8n.io
- **n8n Community**: https://community.n8n.io
- **Google Workspace API**: https://developers.google.com/admin-sdk
- **Microsoft Graph API**: https://docs.microsoft.com/graph

---

## Time Estimate

| Task | Time |
|------|------|
| n8n Setup | 5 min |
| Import Workflow | 2 min |
| Google Credentials | 10 min |
| Microsoft Credentials | 10 min |
| Configure Nodes | 3 min |
| Test Workflow | 5 min |
| Activate | 1 min |
| Frontend Integration | 5 min |
| **Total** | **~40 min** |

---

## Success Criteria

You'll know everything is working when:

✅ Workflow executes without errors
✅ Users appear in both Google and Microsoft admin consoles
✅ Licenses assigned successfully
✅ Frontend receives success response with temporary password
✅ Email notifications sent (if enabled)
✅ No errors in n8n execution logs

---

## Contact

If you encounter issues:
1. Check execution logs in n8n UI
2. Review **CREDENTIALS-SETUP.md** for detailed instructions
3. Consult **WORKFLOW-GUIDE.md** for node-specific help
4. Search n8n community forum
5. Review Google/Microsoft API documentation for error codes

Good luck! 🚀
