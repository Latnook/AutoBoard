# Example Email Templates

This directory contains sanitized example emails for testing the n8n AutoBoard workflow.

## Template Files

All files ending in `.eml.example` are templates. To use them:

1. Copy the file and rename to `.eml`
2. Update the content if needed
3. Send to your test Gmail automation account

## Available Examples

### simple-name.eml.example
Standard two-word name (First + Last).
- Example: John Doe → `john@company.com`

### compound-surname.eml.example
Spanish/Portuguese compound surname (two-word last name).
- Example: Maria Garcia Lopez → `mari@company.com` (uses preferred name)
- Demonstrates: Last 2 words preserved as surname

### patronymic-name.eml.example
Hebrew patronymic name (Ben/Bat pattern).
- Example: David Ben Yosef → `david@company.com`
- Demonstrates: "Ben Yosef" kept together as surname

### legacy-format.eml.example
Old "Full Legal Name" format (backward compatibility).
- Example: Emily Rose Johnson → `em@company.com` (uses preferred name)
- Demonstrates: Legacy parsing with middle name

## Testing the Workflow

1. Configure Gmail trigger in n8n workflow
2. Copy a template file: `cp simple-name.eml.example test.eml`
3. Send the email to your automation Gmail account
4. Wait for n8n polling interval (15-30 minutes)
5. Check n8n execution history for results

## Email Format Guidelines

The workflow parser supports both formats:

**Recommended (New Format):**
```
Given Name: [First]
Surname: [Last]
Preferred Name: [Optional nickname]
```

**Legacy (Still Supported):**
```
Full Legal Name: [First Middle Last]
Preferred Name: [Optional nickname]
```

**Always include:**
- Personal Email Address
- Manager
- Position
- Department

## Name Parsing Rules

The parser intelligently handles:

1. **Compound Surnames**: Detects Spanish/Portuguese patterns
   - "Maria Garcia Lopez" → First: Maria, Last: Garcia Lopez

2. **Patronymics**: Preserves Hebrew Ben/Bat patterns
   - "David Ben Yosef" → First: David, Last: Ben Yosef

3. **Surname Particles**: Keeps particles with surname
   - "Juan de la Cruz" → First: Juan, Last: de la Cruz
   - Particles: de, del, da, do, dos, das, di, van, von, y

4. **Preferred Names**: Override legal first name for email
   - Legal: "Emily Rose Johnson", Preferred: "Em" → `em@company.com`

5. **Accents**: Automatically removed in email addresses
   - "María Belén" → `mariabelen@company.com`

## Security Note

**Never commit actual employee .eml files to git!**

These are examples only. Real onboarding emails with PII should:
- Stay in your Gmail automation account only
- Never be checked into version control
- Be automatically deleted after processing (configure in Gmail)
