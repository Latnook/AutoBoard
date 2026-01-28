# Bulk Hire Implementation Guide

## Overview

This guide documents the complete implementation for handling bulk hire emails in the AutoBoard n8n workflow. The system will:

1. **Detect** if an email contains one user or multiple users
2. **Single user** → Process immediately (existing flow)
3. **Multiple users** → Parse all users, create Google Sheet for review, wait for confirmation, then process

---

## Architecture Diagram

```
[Gmail Trigger]
    ↓
[Filter Valid Emails] (Skip automation replies, nested Re:)
    ↓
[Parse HR Email] (Detect single vs bulk)
    ↓
[Single or Bulk?] (IF node)
    ├─ FALSE (single) → [Check if Email Exists] → [existing flow]
    └─ TRUE (bulk) → [Parse Multiple Users]
                         ↓
                     [Create Google Sheet]
                         ↓
                     [Send Review Email]
                         ↓
                     [Wait for Confirmation Email]
                         ↓
                     [Confirm or Cancel?]
                         ├─ Cancel → Send cancellation email, stop
                         └─ Confirm → [Read Sheet]
                                          ↓
                                      [Loop Each User]
                                          ↓
                                      [Format User Data]
                                          ↓
                                      [Set User Data] → existing creation flow
```

---

## Implementation Steps

### Step 1: Update Gmail Trigger Filter

**Node:** "Email from Galit or Omer"

**Change the filter from:**
```
subject:(New Hire Onboarding) from:(galit@spines.com OR omer@spines.com OR rita@spines.com OR sapir@spines.com) -{Re:}
```

**To:**
```
(subject:(New Hire Onboarding) OR subject:(Hiring)) from:(galit@spines.com OR omer@spines.com OR rita@spines.com OR sapir@spines.com)
```

This removes the Re: exclusion and adds "Hiring" as a subject keyword to catch bulk emails.

---

### Step 2: Add "Filter Valid Emails" Code Node

**Position:** Between "Email from Galit or Omer" and "Parse HR Email"

**Purpose:** Prevent processing automation replies and nested Re: emails

**Code:**
```javascript
// Get email data
const emailData = $input.first().json;
const subject = emailData.subject || emailData.Subject || '';
const emailBody = emailData.text || emailData.textPlain || emailData.Text || emailData.TextPlain || '';
const emailBodyHtml = emailData.html || emailData.Html || '';
const senderEmail = emailData.from?.value?.[0]?.address || emailData.from?.text || '';

console.log('=== EMAIL FILTER CHECK ===');
console.log('Subject:', subject);
console.log('Sender:', senderEmail);
console.log('Email body length:', emailBody.length);
console.log('Email body preview:', emailBody.substring(0, 300));

// Check 1: Skip if it's from our automation account (workflow's own replies)
if (senderEmail.includes('ariel@spines.com') || senderEmail.includes('noreply')) {
  console.log('SKIPPED: Email is from automation account');
  throw new Error('SKIP: Email is from automation - preventing loop');
}

// Check 2: Skip if email contains our automation signature
const automationSignatures = [
  'This user was automatically created by Ariel Palatnik\'s AutoBoard',
  'AutoBoard User Creation Report',
  'automatically created by AutoBoard',
  'Google and Microsoft:\nUsername:'
];

const combinedContent = (emailBody + ' ' + emailBodyHtml).toLowerCase();

const hasAutomationSignature = automationSignatures.some(sig =>
  combinedContent.includes(sig.toLowerCase())
);

if (hasAutomationSignature) {
  console.log('SKIPPED: Email contains automation signature');
  throw new Error('SKIP: Email is automated response - preventing loop');
}

// Check 3: Count "Re:" occurrences in subject
const reCount = (subject.match(/Re:/gi) || []).length;

console.log('Re: count:', reCount);

if (reCount > 1) {
  console.log('SKIPPED: Too many Re: in subject (not first reply)');
  throw new Error('SKIP: Email is nested reply (Re: Re: ...) - not first reply');
}

// Check 4: If it's a Re: (first reply), make sure it has actual content
if (reCount === 1) {
  console.log('First reply detected - checking for new user data');

  // Check if it contains new hire info - look in both text and HTML
  const hasNewHireData = combinedContent.includes('full legal name') ||
                         combinedContent.includes('personal email address') ||
                         combinedContent.includes('preferred name') ||
                         combinedContent.includes('new hire onboarding');

  console.log('Has new hire data?', hasNewHireData);

  if (!hasNewHireData) {
    console.log('SKIPPED: Reply does not contain new hire information');
    console.log('Combined content preview:', combinedContent.substring(0, 500));
    throw new Error('SKIP: Reply does not contain new hire data');
  }

  console.log('Valid first reply with new hire data - proceeding');
}

// If we get here, email is valid - pass it through
console.log('✓ Email is valid - proceeding to parse');

// Return properly formatted output
return [{
  json: emailData
}];
```

**Node Settings:**
- On Error: Continue (so skipped emails don't show as failures)

---

### Step 3: Update "Parse HR Email" Code Node

Replace the entire existing code with this updated version that detects bulk emails:

**Code:** [See "Code Node 1: Modified Parse HR Email" in previous response - it's the complete 500+ line code block]

---

### Step 4: Add "Single or Bulk?" IF Node

**Position:** After "Parse HR Email"

**Configuration:**
- **Condition Type:** Boolean
- **Value 1 (Expression):** `{{ $json._bulkEmail }}`
- **Operation:** `is true`

**Connections:**
- **FALSE output** → Connect to "Check if Email Exists" (existing single-user flow)
- **TRUE output** → Connect to new "Parse Multiple Users" node (we'll create next)

---

### Step 5: Add "Parse Multiple Users" Code Node

**Position:** After TRUE output of "Single or Bulk?" IF node

**Purpose:** Extract all 14 users from the bulk email into a structured array

**Code:**
```javascript
// Get bulk email data
const data = $input.first().json;
const emailText = data._rawEmailText;
const emailSubject = data._originalSubject;

console.log('=== BULK EMAIL PARSING ===');
console.log('Total user count detected:', data._userCount);
console.log('Email text length:', emailText.length);

// Helper: Extract text after a label
function extractField(text, label) {
  const cleanLabel = label.replace(/[*_]/g, '');

  // First try: Label with colon/dash on same line
  let regex = new RegExp('\\b' + cleanLabel + '\\s*[:\\-]\\s*([^\\n\\r]+)', 'i');
  let match = text.match(regex);

  if (match) {
    let value = match[1].trim();
    value = value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return value;
  }

  // Second try: Label on one line, value on next line
  regex = new RegExp('\\*?' + cleanLabel + '\\*?\\s*\\n\\s*([^\\n\\r*]+)', 'i');
  match = text.match(regex);

  if (match) {
    let value = match[1].trim();
    value = value.replace(/<[^>]+>/g, '').trim();
    return value;
  }

  return null;
}

// Helper: Parse name into first and last
function parseName(fullName, preferredName) {
  let firstName, lastName;
  let baseLegalFirstName = '';
  let baseLegalLastName = '';

  if (!fullName) return { firstName: '', lastName: '' };

  const words = fullName.trim().split(/\s+/);

  if (words.length === 1) {
    baseLegalFirstName = words[0];
    baseLegalLastName = words[0];
  } else if (words.length === 2) {
    baseLegalFirstName = words[0];
    baseLegalLastName = words[1];
  } else if (words.length === 3) {
    const secondToLast = words[words.length - 2].toLowerCase();

    if (secondToLast === 'ben' || secondToLast === 'bat') {
      baseLegalFirstName = words[0];
      baseLegalLastName = words.slice(1).join(' ');
    }
    else if (['de', 'del', 'da', 'do', 'dos', 'das', 'di', 'van', 'von', 'y'].includes(secondToLast)) {
      baseLegalFirstName = words[0];
      baseLegalLastName = words.slice(1).join(' ');
    }
    else {
      baseLegalFirstName = words.slice(0, -1).join(' ');
      baseLegalLastName = words[words.length - 1];
    }
  } else {
    const secondToLast = words[words.length - 2].toLowerCase();

    if (secondToLast === 'ben' || secondToLast === 'bat') {
      baseLegalFirstName = words.slice(0, -2).join(' ');
      baseLegalLastName = words.slice(-2).join(' ');
    }
    else if (['de', 'del', 'da', 'do', 'dos', 'das', 'di', 'van', 'von', 'y'].includes(secondToLast)) {
      baseLegalFirstName = words.slice(0, -3).join(' ');
      baseLegalLastName = words.slice(-3).join(' ');
    }
    else {
      baseLegalFirstName = words.slice(0, -2).join(' ');
      baseLegalLastName = words.slice(-2).join(' ');
    }
  }

  // Apply preferred name logic
  if (preferredName && preferredName.trim() !== '') {
    const preferredWords = preferredName.trim().split(/\s+/);

    if (preferredWords.length === 1) {
      firstName = preferredName;
      lastName = baseLegalLastName;
    } else {
      const preferredLastWord = preferredWords[preferredWords.length - 1];

      if (preferredLastWord.toLowerCase() === baseLegalLastName.toLowerCase()) {
        firstName = preferredWords.slice(0, -1).join(' ');
        lastName = preferredLastWord;
      } else {
        firstName = preferredName;
        lastName = baseLegalLastName;
      }
    }
  } else {
    firstName = baseLegalFirstName;
    lastName = baseLegalLastName;
  }

  return { firstName, lastName };
}

// Helper: Normalize name for email
function normalizeForEmail(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Helper: Map country to usage location
function getUsageLocation(country) {
  const countryMap = {
    'argentina': 'AR', 'ar': 'AR', 'brazil': 'BR', 'br': 'BR',
    'chile': 'CL', 'cl': 'CL', 'colombia': 'CO', 'co': 'CO',
    'mexico': 'MX', 'mx': 'MX', 'peru': 'PE', 'pe': 'PE',
    'israel': 'IL', 'il': 'IL', 'united states': 'US', 'usa': 'US', 'us': 'US',
    'canada': 'CA', 'ca': 'CA', 'united kingdom': 'GB', 'uk': 'GB', 'gb': 'GB'
  };

  if (!country) return 'US';
  const countryKey = country.trim().toLowerCase();
  return countryMap[countryKey] || 'US';
}

// Split email into user sections
// Look for numbered patterns like "1)", "2)", etc.
const userSections = emailText.split(/(?=\*?\d+\)\*?\s*[-\n])/);

const users = [];
let userNumber = 0;

console.log('Found', userSections.length, 'potential sections');

for (let section of userSections) {
  if (!section.trim() || section.length < 50) {
    console.log('Skipping short section');
    continue;
  }

  console.log('\n=== Processing User Section ===');
  console.log('Section length:', section.length);
  console.log('First 200 chars:', section.substring(0, 200));

  // Extract fields
  const fullName = extractField(section, 'Full Legal Name');
  const preferredName = extractField(section, 'Preferred Name');
  const personalEmail = extractField(section, 'Personal Email Address');
  const position = extractField(section, 'Position');
  const manager = extractField(section, 'Manager');
  const phoneNumber = extractField(section, 'Phone number');
  const startDate = extractField(section, 'Start date');
  const address = extractField(section, 'Home \\(legal\\) address');

  // Extract country from address or email context
  let country = null;
  if (address) {
    if (address.toLowerCase().includes('argentina') || address.toLowerCase().includes('cordoba')) {
      country = 'Argentina';
    } else if (address.toLowerCase().includes('israel')) {
      country = 'Israel';
    } else if (address.toLowerCase().includes('mexico')) {
      country = 'Mexico';
    }
  }

  // Validate this is a real user entry
  if (!fullName && !personalEmail) {
    console.log('No name or email found, skipping');
    continue;
  }

  console.log('Extracted:', {
    fullName,
    preferredName,
    personalEmail,
    position,
    manager
  });

  // Parse name
  const { firstName, lastName } = parseName(fullName, preferredName);

  // Generate work email
  const normalizedFirst = normalizeForEmail(firstName);
  const normalizedLast = normalizeForEmail(lastName);
  const primaryEmail = normalizedFirst + '@spines.com';
  const alternativeEmail = normalizedLast ? normalizedFirst + '.' + normalizedLast.charAt(0) + '@spines.com' : primaryEmail;

  // Get usage location
  const usageLocation = getUsageLocation(country);

  // Generate temporary password
  const tempPassword = 'Temp' + Math.random().toString(36).slice(-8) + '!A1';

  userNumber++;

  users.push({
    userNumber: userNumber,
    fullName: fullName || (firstName + ' ' + lastName),
    firstName: firstName,
    lastName: lastName,
    preferredName: preferredName || '',
    personalEmail: personalEmail || '',
    phoneNumber: phoneNumber || '',
    startDate: startDate || '',
    address: address || '',
    position: position || 'Inside Sales representative',
    manager: manager || '',
    department: '', // EMPTY - For user to fill in
    usageLocation: usageLocation,
    country: country || '',
    primaryEmail: primaryEmail,
    alternativeEmail: alternativeEmail,
    temporaryPassword: tempPassword,
    ready: 'FALSE', // Checkbox column - user will change to TRUE when reviewed
    notes: '' // For any special instructions
  });

  console.log('Added user', userNumber);
}

console.log('\n=== BULK PARSING COMPLETE ===');
console.log('Successfully parsed', users.length, 'users');

if (users.length === 0) {
  throw new Error('Could not parse any users from the bulk email. Check email format.');
}

// Return data for Google Sheets creation
return [{
  json: {
    users: users,
    totalUsers: users.length,
    _emailId: data._emailId,
    _senderEmail: data._senderEmail,
    _originalSubject: data._originalSubject,
    _rawEmailText: emailText
  }
}];
```

---

### Step 6: Manually Create Google Sheet Template

Before continuing with n8n nodes, create this manually in Google Sheets:

1. Go to Google Sheets, create new spreadsheet
2. Name it: **"Bulk Hire Reviews"**
3. Add these column headers in Row 1:
   - A: `User Number`
   - B: `Full Name`
   - C: `First Name`
   - D: `Last Name`
   - E: `Preferred Name`
   - F: `Personal Email`
   - G: `Phone Number`
   - H: `Start Date`
   - I: `Address`
   - J: `Position`
   - K: `Manager`
   - L: `Department` (⚠️ **Make this cell YELLOW background** - user must fill)
   - M: `Usage Location`
   - N: `Country`
   - O: `Primary Email`
   - P: `Alternative Email`
   - Q: `Temporary Password`
   - R: `Ready` (✅ **Make this cell GREEN background** - checkbox column)
   - S: `Notes`

4. Format Row 1: Bold, freeze it (View > Freeze > 1 row)
5. Add Data Validation to column R:
   - Select entire column R
   - Data > Data validation
   - Criteria: Checkbox
   - Save
6. **Copy the Spreadsheet ID** from the URL (long string after `/d/`)
7. Share with your n8n Google account

---

### Step 7: Add "Split Users Into Items" Node

**Node Type:** Item Lists (or "Split Out" in older n8n)

**Position:** After "Parse Multiple Users"

**Configuration:**
- **Field To Split Out:** `users`

This converts the array of users into individual items for the Google Sheets node.

---

### Step 8: Add "Append to Review Sheet" Google Sheets Node

**Position:** After "Split Users Into Items"

**Configuration:**
- **Credential:** Your Google Sheets OAuth2
- **Operation:** `Append or Update`
- **Document:** By ID
- **ID:** [Paste your Bulk Hire Reviews spreadsheet ID from Step 6]
- **Sheet:** `Sheet1`
- **Data Mode:** `Define Below`
- **Columns:** Map each field (click "Add Column Mapping" for each):
  - `User Number` = `{{ $json.userNumber }}`
  - `Full Name` = `{{ $json.fullName }}`
  - `First Name` = `{{ $json.firstName }}`
  - `Last Name` = `{{ $json.lastName }}`
  - `Preferred Name` = `={{ $json.preferredName }}`
  - `Personal Email` = `={{ $json.personalEmail }}`
  - `Phone Number` = `={{ $json.phoneNumber }}`
  - `Start Date` = `={{ $json.startDate }}`
  - `Address` = `={{ $json.address }}`
  - `Position` = `={{ $json.position }}`
  - `Manager` = `={{ $json.manager }}`
  - `Department` = `={{ $json.department }}`
  - `Usage Location` = `={{ $json.usageLocation }}`
  - `Country` = `={{ $json.country }}`
  - `Primary Email` = `={{ $json.primaryEmail }}`
  - `Alternative Email` = `={{ $json.alternativeEmail }}`
  - `Temporary Password` = `={{ $json.temporaryPassword }}`
  - `Ready` = `={{ $json.ready }}`
  - `Notes` = `={{ $json.notes }}`

---

## Stopping Point

This completes the **parsing and sheet creation** phase. The remaining steps (sending email, waiting for confirmation, processing users) will be documented in a follow-up session.

---

## Testing the Implementation So Far

1. Forward the "Hiring 14 reps.eml" file to your monitored email address
2. Check n8n execution:
   - "Filter Valid Emails" should pass it through
   - "Parse HR Email" should output `_bulkEmail: true`
   - "Single or Bulk?" should route to TRUE
   - "Parse Multiple Users" should extract 14 users
   - "Append to Review Sheet" should populate your Google Sheet with 14 rows

3. Check your "Bulk Hire Reviews" Google Sheet - you should see 14 users with all data filled except Department column

---

## Why Multiple Code Nodes?

You asked "Shouldn't it be in a single code node?" - here's why we need separate nodes:

1. **"Parse HR Email"** - Entry point that decides single vs bulk (happens first)
2. **"Parse Multiple Users"** - Only runs for bulk emails, extracts array of users (happens after routing decision)
3. **"Format Sheet Row to User Data"** - Will be added later, runs inside a loop for each user (happens after you confirm)

Each node runs at a different point in the workflow and has a different purpose. Combining them would make the logic more complex and harder to maintain.

---

### Step 9: Add "Get Sheet URL" Code Node

**Position:** After "Append to Review Sheet"

**Purpose:** Extract the spreadsheet URL to include in the email

**Code:**
```javascript
// We need to reconstruct the sheet URL from previous data
// The "Append to Review Sheet" node doesn't return the URL, so we'll get it from the original data

// Get the spreadsheet ID from the workflow configuration
// This should match the ID you used in Step 8
const spreadsheetId = 'YOUR_SPREADSHEET_ID_HERE'; // Replace with actual ID

// Construct the URL
const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

// Get user count from the Parse Multiple Users output
const parseData = $('Parse Multiple Users').first().json;
const userCount = parseData.totalUsers;

return [{
  json: {
    sheetUrl: sheetUrl,
    spreadsheetId: spreadsheetId,
    userCount: userCount,
    _emailId: parseData._emailId,
    _senderEmail: parseData._senderEmail
  }
}];
```

**Note:** You'll need to replace `YOUR_SPREADSHEET_ID_HERE` with the actual spreadsheet ID from Step 6.

---

### Step 10: Add "Send Review Email" Gmail Node

**Position:** After "Get Sheet URL"

**Configuration:**
- **Operation:** `Send Email`
- **To:** `ariel@spines.com` (or your email)
- **Subject (Expression):**
  ```
  [AutoBoard] Review {{ $json.userCount }} New Hires
  ```
- **Message (HTML, Expression):**
  ```html
  <h2>Bulk Hire Detected</h2>
  <p>Found <strong>{{ $json.userCount }} users</strong> in the bulk hire email.</p>

  <h3>📋 Review & Edit the Data:</h3>
  <p><a href="{{ $json.sheetUrl }}" style="font-size: 18px; color: #1a73e8; font-weight: bold;">Open Google Sheet</a></p>

  <h3>📝 Instructions:</h3>
  <ol>
    <li>Review all user data in the spreadsheet</li>
    <li><strong>Fill in the Department column</strong> (highlighted in yellow) - this is required</li>
    <li>Adjust any other fields as needed</li>
    <li>Check the <strong>Ready</strong> checkbox (green column) for users you want to create</li>
    <li>Leave unchecked any users you want to skip</li>
  </ol>

  <h3>✅ When Ready:</h3>
  <p><strong>Reply to this email with "CONFIRM"</strong> to create all checked users.</p>
  <p><strong>Reply with "CANCEL"</strong> to abort the entire batch.</p>

  <hr>
  <p><em>⚠️ Rate limiting: Users will be created at maximum 10 per hour (workflow rate limit).</em></p>
  <p><em>🔗 Spreadsheet: <a href="{{ $json.sheetUrl }}">{{ $json.sheetUrl }}</a></em></p>
  ```

**Note:** Make sure to use HTML message type, not plain text.

---

### Step 11: Add "Wait for Confirmation Reply" Gmail Trigger

**Position:** This is a NEW trigger (separate from the original "Email from Galit or Omer")

**Configuration:**
- **Event:** Poll for new emails
- **Poll Times:** Every minute
- **Simple:** No (use advanced filter)
- **Filters:**
  ```
  subject:(Re: [AutoBoard] Review) from:ariel@spines.com
  ```

**Purpose:** This waits for your reply to the review email

**Important:** This creates a separate workflow entry point. You may need to create a new workflow or use n8n's "Wait for Webhook" pattern instead. For simplicity, we'll use a polling approach.

---

### Step 12: Add "Check Reply Content" Code Node

**Position:** After "Wait for Confirmation Reply" Gmail Trigger

**Purpose:** Extract the confirmation decision from your reply

**Code:**
```javascript
// Get the reply email
const emailData = $input.first().json;
const emailBody = (emailData.text || emailData.textPlain || '').toUpperCase();
const emailSubject = emailData.subject || emailData.Subject || '';

console.log('=== CONFIRMATION CHECK ===');
console.log('Subject:', emailSubject);
console.log('Body preview:', emailBody.substring(0, 200));

// Extract spreadsheet ID from the original email (in the subject or body)
// The subject should be "Re: [AutoBoard] Review X New Hires"
const userCountMatch = emailSubject.match(/Review (\d+) New Hires/i);
const userCount = userCountMatch ? parseInt(userCountMatch[1]) : 0;

// Check for CONFIRM or CANCEL
const isConfirm = emailBody.includes('CONFIRM');
const isCancel = emailBody.includes('CANCEL');

console.log('Is Confirm?', isConfirm);
console.log('Is Cancel?', isCancel);

if (!isConfirm && !isCancel) {
  throw new Error('Reply must contain either CONFIRM or CANCEL');
}

return [{
  json: {
    decision: isConfirm ? 'CONFIRM' : 'CANCEL',
    emailId: emailData.id,
    userCount: userCount
  }
}];
```

---

### Step 13: Add "Confirm or Cancel?" IF Node

**Position:** After "Check Reply Content"

**Configuration:**
- **Condition Type:** String
- **Value 1 (Expression):** `{{ $json.decision }}`
- **Operation:** `equals`
- **Value 2:** `CONFIRM`

**Connections:**
- **FALSE output** → Send cancellation email and stop
- **TRUE output** → Continue to read the sheet

---

### Step 14: Add "Send Cancellation Email" Gmail Node

**Position:** On FALSE output of "Confirm or Cancel?"

**Configuration:**
- **Operation:** `Send Email`
- **To:** `ariel@spines.com`
- **Subject:** `[AutoBoard] Bulk Hire Cancelled`
- **Message:**
  ```
  The bulk hire process has been cancelled as requested.

  No users were created.
  ```

After this node, the workflow stops (no further connections).

---

### Step 15: Add "Read Reviewed Users" Google Sheets Node

**Position:** On TRUE output of "Confirm or Cancel?"

**Configuration:**
- **Operation:** `Get Many`
- **Document:** By ID
- **ID:** [Same spreadsheet ID from Step 6]
- **Sheet:** `Sheet1`
- **Data Mode:** `Define Below`
- **Range:** Leave empty (reads all data)
- **Options:**
  - **Return All:** ON
  - **Use Header Row:** ON (so column names are used)

---

### Step 16: Add "Filter Ready Users" Code Node

**Position:** After "Read Reviewed Users"

**Purpose:** Only keep users where Ready checkbox is TRUE

**Code:**
```javascript
// Get all rows from the sheet
const allRows = $input.all();

console.log('=== FILTERING READY USERS ===');
console.log('Total rows from sheet:', allRows.length);

// Filter for rows where Ready is TRUE/checked
const readyUsers = allRows.filter(item => {
  const row = item.json;
  const ready = row.Ready || row.ready;

  // Check for various truthy values
  return ready === true || ready === 'TRUE' || ready === 'true' || ready === '1';
});

console.log('Ready users:', readyUsers.length);

if (readyUsers.length === 0) {
  throw new Error('No users marked as Ready. Please check at least one user in the Ready column.');
}

// Return only the ready users
return readyUsers;
```

---

### Step 17: Add "Format User for Creation" Code Node

**Position:** After "Filter Ready Users"

**Purpose:** Transform each Google Sheet row into the format expected by your existing "Set User Data" node

**Code:**
```javascript
// Get the current row from the Google Sheets
const row = $input.first().json;

console.log('=== FORMATTING USER FROM SHEET ===');
console.log('Row data:', JSON.stringify(row, null, 2));

// Extract data from sheet columns (Google Sheets uses the header names)
const fullName = row['Full Name'] || row.fullName || '';
const firstName = row['First Name'] || row.firstName || '';
const lastName = row['Last Name'] || row.lastName || '';
const personalEmail = row['Personal Email'] || row.personalEmail || '';
const position = row['Position'] || row.position || 'Inside Sales representative';
const department = row['Department'] || row.department || '';
const usageLocation = row['Usage Location'] || row.usageLocation || 'AR';
const primaryEmail = row['Primary Email'] || row.primaryEmail || '';
const alternativeEmail = row['Alternative Email'] || row.alternativeEmail || '';
const temporaryPassword = row['Temporary Password'] || row.temporaryPassword || '';
const manager = row['Manager'] || row.manager || '';

// Validate required fields
if (!firstName || !lastName) {
  throw new Error(`Missing name for user: ${fullName || personalEmail}`);
}

if (!department || department === '') {
  throw new Error(`Department is required for ${firstName} ${lastName}. Please fill in the Department column in the spreadsheet.`);
}

// Generate work email if not provided
let workEmail = primaryEmail;
if (!workEmail || workEmail === '') {
  const normalizeForEmail = (name) => {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  };

  const normalizedFirst = normalizeForEmail(firstName);
  workEmail = normalizedFirst + '@spines.com';

  console.log('Generated work email:', workEmail);
}

// Ensure we have a password
let password = temporaryPassword;
if (!password || password === '') {
  password = 'Temp' + Math.random().toString(36).slice(-8) + '!A1';
}

console.log('Final formatted data:', {
  firstName,
  lastName,
  email: workEmail,
  department,
  position,
  usageLocation
});

// Return in the format expected by "Set User Data" node
return [{
  json: {
    body: {
      firstName: firstName,
      lastName: lastName,
      email: workEmail,
      jobTitle: position,
      department: department,
      usageLocation: usageLocation,
      assignLicense: true,
      password: password
    },
    _emailTrigger: true,
    _bulkProcessing: true,
    _manager: manager,
    _personalEmail: personalEmail,
    _fullName: fullName
  }
}];
```

---

### Step 18: Connect to Existing "Set User Data" Node

**Position:** Connect "Format User for Creation" output to your existing "Set User Data" node

This integrates the bulk flow into your existing single-user creation flow.

**Important Note on Rate Limiting:**

Since you're processing multiple users, you need to add a delay between each user creation to respect the 10/hour rate limit.

**Add a "Wait" Node** before "Set User Data":
- **Node Type:** Wait
- **Resume:** After time interval
- **Amount:** 6
- **Unit:** Minutes

This ensures you create at most 10 users per hour (one every 6 minutes).

---

### Step 19: Add "Send Completion Summary" Gmail Node

**Position:** After all users are processed

**Purpose:** Send you a summary of what was created

**Note:** This requires n8n's "Merge" or "Aggregate" functionality to collect all results. Here's a simplified approach:

**Add this node at the end of the bulk flow:**

**Configuration:**
- **Operation:** `Send Email`
- **To:** `ariel@spines.com`
- **Subject:** `[AutoBoard] Bulk Hire Complete`
- **Message (Expression):**
  ```html
  <h2>✅ Bulk Hire Processing Complete</h2>

  <p>All ready users have been processed.</p>

  <p>Check the audit log spreadsheet for detailed results of each user creation.</p>

  <p><em>Timestamp: {{ new Date().toISOString() }}</em></p>
  ```

---

## Complete Implementation Checklist

Use this checklist to track your implementation:

- [ ] **Step 1:** Update Gmail Trigger filter
- [ ] **Step 2:** Add "Filter Valid Emails" code node
- [ ] **Step 3:** Update "Parse HR Email" with bulk detection
- [ ] **Step 4:** Add "Single or Bulk?" IF node
- [ ] **Step 5:** Add "Parse Multiple Users" code node
- [ ] **Step 6:** Create Google Sheet template manually
- [ ] **Step 7:** Add "Split Users Into Items" node
- [ ] **Step 8:** Add "Append to Review Sheet" node
- [ ] **Step 9:** Add "Get Sheet URL" code node
- [ ] **Step 10:** Add "Send Review Email" Gmail node
- [ ] **Step 11:** Add "Wait for Confirmation Reply" Gmail trigger
- [ ] **Step 12:** Add "Check Reply Content" code node
- [ ] **Step 13:** Add "Confirm or Cancel?" IF node
- [ ] **Step 14:** Add "Send Cancellation Email" Gmail node (FALSE branch)
- [ ] **Step 15:** Add "Read Reviewed Users" Google Sheets node (TRUE branch)
- [ ] **Step 16:** Add "Filter Ready Users" code node
- [ ] **Step 17:** Add "Format User for Creation" code node
- [ ] **Step 18:** Add "Wait" node (6 minutes) and connect to "Set User Data"
- [ ] **Step 19:** Add "Send Completion Summary" Gmail node

---

## Testing the Complete Flow

### Test 1: Bulk Email Detection
1. Forward "Hiring 14 reps.eml" to your monitored email
2. Verify workflow reaches "Send Review Email"
3. Check your inbox for the review email
4. Open the Google Sheet link - should show 14 users

### Test 2: Fill Out and Confirm
1. In the Google Sheet, fill in Department column for all users (e.g., "Sales")
2. Check the Ready checkbox for 2-3 test users (not all 14)
3. Reply to the review email with "CONFIRM"
4. Wait for processing to complete
5. Verify only the checked users were created

### Test 3: Cancel Flow
1. Create another bulk hire email
2. When you receive the review email, reply with "CANCEL"
3. Verify you get cancellation confirmation
4. Verify no users were created

---

## Important Notes

### Rate Limiting Strategy
- The workflow creates users at **1 per 6 minutes** (10/hour)
- For 14 users, expect **~84 minutes** total processing time
- This respects your existing rate limit configuration

### Handling the Wait Issue
The "Wait for Confirmation Reply" (Step 11) creates a separate workflow trigger. In n8n, this means:

**Option A: Two-Workflow Approach** (Recommended)
1. **Workflow 1:** Detects bulk email → Creates sheet → Sends review email → **ENDS**
2. **Workflow 2:** Triggered by confirmation reply → Reads sheet → Creates users

**Option B: Single Workflow with Webhook** (Advanced)
- Instead of Gmail trigger, use a Webhook Wait node
- Include webhook URL in the review email
- Click URL to confirm (instead of replying)

For simplicity, I recommend **Option A** - create two separate workflows:
1. `AutoBoard - Main` (existing + bulk detection + sheet creation)
2. `AutoBoard - Bulk Confirmation` (confirmation handling + user creation)

---

## Troubleshooting

### Issue: "No users marked as Ready"
- Solution: Make sure you checked the Ready checkbox in column R for at least one user

### Issue: "Department is required"
- Solution: Fill in the Department column (L) for all users you want to create

### Issue: Rate limit exceeded
- Solution: The 6-minute wait should prevent this, but if it happens, manually stagger the processing

### Issue: Gmail trigger not firing
- Solution: Check the filter syntax matches exactly, ensure polling is active

---

## Architecture Decision: Two Workflows vs One

Given n8n's limitations with waiting for async events, here's the recommended **Two-Workflow Architecture**:

### Workflow 1: AutoBoard - Bulk Detection & Sheet Creation

```
[Gmail Trigger: New Hire emails]
    ↓
[Filter Valid Emails]
    ↓
[Parse HR Email]
    ↓
[Single or Bulk?]
    ├─ Single → Existing flow
    └─ Bulk → [Parse Multiple Users]
                ↓
            [Split Users]
                ↓
            [Append to Sheet]
                ↓
            [Get Sheet URL]
                ↓
            [Send Review Email]
                ↓
            **END** (waits for manual confirmation)
```

### Workflow 2: AutoBoard - Bulk Confirmation Handler

```
[Gmail Trigger: Reply to Review emails]
    ↓
[Check Reply Content]
    ↓
[Confirm or Cancel?]
    ├─ Cancel → [Send Cancellation] → END
    └─ Confirm → [Read Sheet]
                    ↓
                 [Filter Ready Users]
                    ↓
                 [Format User for Creation]
                    ↓
                 [Wait 6 minutes]
                    ↓
                 [Set User Data]
                    ↓
                 [Existing creation flow...]
                    ↓
                 [Send Completion Summary]
```

This is cleaner and more reliable than trying to make a single workflow wait for an email reply.

---

## Summary

This complete implementation guide provides:
- ✅ Automatic detection of bulk vs single emails
- ✅ Parsing of all 14 users with complex name handling
- ✅ Google Sheet creation for review and editing
- ✅ Email notification with clear instructions
- ✅ Confirmation/cancellation workflow
- ✅ Rate-limited user creation (10/hour)
- ✅ Integration with existing single-user flow
- ✅ Proper error handling and validation

Total implementation time: 2-3 hours
Total processing time for 14 users: ~84 minutes (after confirmation)
