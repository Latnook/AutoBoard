# Workflow Guide

This document explains how the AutoBoard n8n workflow operates and how to customize it.

## Workflow Overview

The workflow automates employee onboarding by:
1. Receiving employee data via webhook
2. Creating user accounts in both Google Workspace and Microsoft 365
3. Assigning a Microsoft license (if requested)
4. Sending notifications on completion
5. Returning results with temporary password

## Node-by-Node Breakdown

### 1. Webhook - Receive Employee Data

**Type**: Trigger
**Purpose**: Accepts HTTP POST requests with employee data

**Expected Payload**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "jobTitle": "Software Engineer",
  "department": "Engineering",
  "usageLocation": "US",
  "assignLicense": true,
  "password": "Optional-Custom-Password"
}
```

**Webhook URL**: After activation, n8n provides a URL like:
```
https://your-n8n-instance.com/webhook/autoboard-onboard
```

### 2. Set User Data

**Type**: Data Transformation
**Purpose**: Normalizes and prepares data for both APIs

**Key Transformations**:
- Forces email to lowercase
- Generates temporary password if not provided (format: `TempXXXXXXXX!A1`)
- Creates `displayName` from first + last name
- Extracts `mailNickname` from email (part before @)
- Sets default `usageLocation` to "US" if not provided

### 3. Google - Create User

**Type**: Google Workspace Node
**Purpose**: Creates user in Google Workspace

**Settings**:
- **Resource**: User
- **Operation**: Create
- **changePasswordAtNextLogin**: true
- **Continue on Fail**: Enabled (allows Microsoft creation even if Google fails)

**Required Credential**: Google Workspace OAuth2 or Service Account

### 4. Microsoft - Create User

**Type**: Microsoft 365 Node
**Purpose**: Creates user in Microsoft 365 / Azure AD

**Settings**:
- **Resource**: User
- **Operation**: Create
- **forceChangePasswordNextSignIn**: true
- **Continue on Fail**: Enabled (allows Google creation even if Microsoft fails)

**Required Credential**: Microsoft Graph API OAuth2

**Note**: Runs in parallel with Google node for faster execution

### 5. Should Assign License?

**Type**: If Node
**Purpose**: Conditional branch based on `assignLicense` field

- **True branch**: Proceeds to license assignment
- **False branch**: Skips to merge results

### 6. Get Available SKUs

**Type**: HTTP Request Node
**Purpose**: Fetches subscribed SKUs from Microsoft Graph API

**Endpoint**: `https://graph.microsoft.com/v1.0/subscribedSkus`

**Returns**: List of all licenses in the organization with availability

### 7. Resolve SKU ID

**Type**: Code Node
**Purpose**: Finds the correct SKU ID and checks availability

**Logic**:
1. Searches for `O365_BUSINESS_PREMIUM` (Microsoft 365 Business Standard)
2. Falls back to first available SKU if target not found
3. Calculates available licenses: `prepaidUnits.enabled - consumedUnits`
4. Throws error if no licenses available
5. Returns SKU ID and user ID for assignment

**Customization**: Change `targetSku` variable to use different license:
```javascript
const targetSku = 'ENTERPRISEPACK'; // For Office 365 E3
const targetSku = 'SPE_E5'; // For Microsoft 365 E5
```

### 8. Assign License

**Type**: HTTP Request Node
**Purpose**: Assigns the resolved license to the new user

**Endpoint**: `https://graph.microsoft.com/v1.0/users/{userId}/assignLicense`

**Payload**:
```json
{
  "addLicenses": [{
    "disabledPlans": [],
    "skuId": "resolved-sku-guid"
  }],
  "removeLicenses": []
}
```

**Continue on Fail**: Enabled (reports license error but doesn't fail workflow)

### 9. Merge Results

**Type**: Code Node
**Purpose**: Combines results from all parallel branches

**Output Structure**:
```json
{
  "success": true,
  "employee": {
    "email": "john.doe@company.com",
    "name": "John Doe",
    "temporaryPassword": "TempABC123!A1"
  },
  "google": {
    "created": true,
    "error": null,
    "userId": "google-user-id"
  },
  "microsoft": {
    "created": true,
    "error": null,
    "userId": "microsoft-user-id",
    "licenseAssigned": true,
    "licenseError": null
  },
  "errors": []
}
```

**Success Criteria**: At least one platform (Google OR Microsoft) succeeded

### 10. Respond to Webhook

**Type**: Respond to Webhook Node
**Purpose**: Returns JSON response to the webhook caller

Returns the merged results structure immediately.

### 11. Was Successful?

**Type**: If Node
**Purpose**: Routes to appropriate notification based on success

Checks if `success` field is true.

### 12. Send Success Notification (Optional)

**Type**: Email Send Node
**Purpose**: Notifies HR/admin of successful onboarding

**Status**: Disabled by default (enable after configuring SMTP)

**Email Content**:
- Employee name and email
- Temporary password
- Platform creation status
- License assignment status
- Any partial errors

### 13. Send Error Notification (Optional)

**Type**: Email Send Node
**Purpose**: Alerts admin of complete failure

**Status**: Disabled by default (enable after configuring SMTP)

**Triggered When**: Both Google and Microsoft creation fail

---

## Customization Options

### Change Target License

In **Resolve SKU ID** node, modify:
```javascript
const targetSku = 'YOUR_SKU_PART_NUMBER';
```

Common SKU part numbers:
- `O365_BUSINESS_ESSENTIALS` - Microsoft 365 Business Basic
- `O365_BUSINESS_PREMIUM` - Microsoft 365 Business Standard
- `SPB` - Microsoft 365 Business Premium
- `ENTERPRISEPACK` - Office 365 E3
- `ENTERPRISEPREMIUM` - Office 365 E5

### Add Slack Notifications

1. Add **Slack** node after "Was Successful?" node
2. Connect to true/false branches
3. Configure message:
```
New employee onboarded: {{ $json.employee.name }}
Email: {{ $json.employee.email }}
Temp Password: {{ $json.employee.temporaryPassword }}

Status:
✅ Google: {{ $json.google.created ? 'Created' : 'Failed' }}
✅ Microsoft: {{ $json.microsoft.created ? 'Created' : 'Failed' }}
```

### Log to Database

1. Add **Database** node (MySQL, PostgreSQL, MongoDB, etc.)
2. Place after "Merge Results" node
3. Insert record with:
   - Timestamp
   - Employee details
   - Creation status
   - Errors (if any)

### Add to CSV/Spreadsheet

1. Add **Google Sheets** or **Microsoft Excel** node
2. Append row with onboarding details
3. Track all onboarding attempts for audit purposes

### Custom Password Policy

In **Set User Data** node, modify password generation:
```javascript
// Current: TempXXXXXXXX!A1 (random alphanumeric + !A1)
"value": "={{ 'Temp' + Math.random().toString(36).slice(-8) + '!A1' }}"

// Custom: CompanyYYYY!Xx (e.g., Company2025!X3)
"value": "={{ 'Company' + new Date().getFullYear() + '!' + Math.random().toString(36).slice(-2).toUpperCase() }}"

// Random 12-char with special chars
"value": "={{ Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6).toUpperCase() + '!@' }}"
```

### Default Organizational Unit (Google)

In **Google - Create User** node, modify `orgUnitPath`:
```javascript
// Current: Root OU
"orgUnitPath": "/"

// Custom: Employees > New Hires
"orgUnitPath": "/Employees/New Hires"
```

### Enable/Disable Notifications

Email notification nodes are **disabled by default**.

To enable:
1. Click on "Send Success Notification" node
2. Uncheck **"Disabled"** in settings
3. Configure SMTP credential
4. Update recipient emails

---

## Testing the Workflow

### Manual Test

1. Click **"Execute Workflow"** button
2. In Webhook node, click **"Listen for Test Event"**
3. Send test request:

```bash
curl -X POST https://your-n8n-instance.com/webhook-test/autoboard-onboard \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "testuser@yourdomain.com",
    "jobTitle": "QA Engineer",
    "department": "Quality",
    "usageLocation": "US",
    "assignLicense": true
  }'
```

4. Check execution log for results
5. Verify users created in Google Admin and Microsoft Admin Center

### Test Without Creating Users

To test workflow logic without API calls:
1. Add **Stop and Error** node after "Set User Data"
2. Set to "Stop" mode
3. Execute workflow
4. Review data transformation
5. Remove Stop node when ready

---

## Production Deployment

### 1. Activate Workflow

Click **"Active"** toggle in top-right corner.

Webhook becomes available at production URL.

### 2. Configure Frontend

Update your Next.js app or frontend to call the webhook:

```javascript
const response = await fetch('https://your-n8n-instance.com/webhook/autoboard-onboard', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName,
    lastName,
    email,
    jobTitle,
    department,
    usageLocation,
    assignLicense: true
  })
});

const result = await response.json();
```

### 3. Enable Notifications

1. Configure SMTP credentials
2. Enable notification nodes
3. Update recipient emails

### 4. Monitor Executions

- Go to **Executions** in n8n
- Filter by workflow
- Review success/failure rate
- Investigate any errors

---

## Error Handling

The workflow handles errors gracefully:

### Partial Success

If Google fails but Microsoft succeeds (or vice versa):
- Workflow returns success
- Includes error details in response
- Admin can manually create failed account

### Complete Failure

If both platforms fail:
- Workflow returns success: false
- Lists all errors
- Sends error notification (if enabled)
- No users created

### License Assignment Failure

If user created but license fails:
- User creation succeeds
- License error reported in response
- Admin can manually assign license

### Common Errors

**"Insufficient permissions"**
- Check credential configuration
- Verify admin consent granted
- Review API scopes

**"User already exists"**
- Normal error for duplicate emails
- Check if previous run succeeded
- User may already be in system

**"No available licenses"**
- Purchase more licenses
- Or disable assignLicense in request

---

## Monitoring and Logging

### Built-in Logging

n8n automatically logs:
- Execution start/end time
- Data passed between nodes
- Errors and stack traces
- Execution duration

### Custom Logging

Add **HTTP Request** node to send logs to external system:
```
POST https://your-log-service.com/logs
{
  "timestamp": "{{ $now }}",
  "workflow": "AutoBoard",
  "employee": "{{ $json.employee.email }}",
  "status": "{{ $json.success }}",
  "errors": "{{ $json.errors }}"
}
```

### Alerting

Set up alerts for workflow failures:
1. Add **Error Trigger** workflow
2. Configure to listen for AutoBoard errors
3. Send Slack/Email on critical failures

---

## Best Practices

✅ **Test thoroughly** before production deployment
✅ **Enable Continue on Fail** for platform-specific nodes (allows partial success)
✅ **Monitor executions daily** in first week of deployment
✅ **Set up error notifications** to catch issues quickly
✅ **Document customizations** you make to the workflow
✅ **Backup workflow** regularly (export JSON)
✅ **Review permissions** quarterly to ensure least privilege
✅ **Rotate credentials** according to security policy
✅ **Version control** workflow JSON in git
✅ **Test credential expiry** before they expire

---

## Support

- **n8n Documentation**: https://docs.n8n.io
- **Community Forum**: https://community.n8n.io
- **Execution Logs**: Check n8n UI for detailed error messages
- **API Errors**: Review Google/Microsoft API documentation for error codes
