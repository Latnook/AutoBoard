# Frontend Integration Guide

This guide shows how to integrate the n8n workflow with various frontend options.

## Option 1: Modify Existing Next.js App

Replace the API route calls with webhook calls.

### Update OnboardingForm Component

**src/app/components/OnboardingForm.js**:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  try {
    // Call n8n webhook instead of Next.js API route
    const response = await fetch('https://your-n8n-instance.com/webhook/autoboard-onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optional: Add authentication
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_N8N_WEBHOOK_KEY}`
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        jobTitle,
        department,
        usageLocation,
        assignLicense: shouldAssignLicense
      })
    });

    const result = await response.json();

    if (result.success) {
      setSuccess(
        `User created successfully!\n\n` +
        `Email: ${result.employee.email}\n` +
        `Temporary Password: ${result.employee.temporaryPassword}\n\n` +
        `Google: ${result.google.created ? '✅ Created' : '❌ Failed'}\n` +
        `Microsoft: ${result.microsoft.created ? '✅ Created' : '❌ Failed'}\n` +
        `License: ${result.microsoft.licenseAssigned ? '✅ Assigned' : '⚠️ Not assigned'}`
      );

      // Clear form
      setFirstName('');
      setLastName('');
      setEmail('');
      setJobTitle('');
      setDepartment('');

      // Trigger refresh for license sidebar
      if (onUserCreated) onUserCreated();
    } else {
      setError(`Onboarding failed:\n${result.errors.join('\n')}`);
    }
  } catch (err) {
    setError(`Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

### Environment Variables

Add to **.env.local**:
```env
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/autoboard-onboard
NEXT_PUBLIC_N8N_WEBHOOK_KEY=your-optional-auth-key
```

### Remove Unused Files

After migration, you can remove:
- `src/app/api/onboard/` (all routes)
- `src/lib/google.js`
- `src/lib/microsoft.js`
- `src/lib/oauth.js`

Keep:
- `src/lib/auth.js` (for NextAuth)
- `src/lib/constants.js` (for UI dropdowns)
- `src/lib/logger.js` (for frontend logging if needed)

---

## Option 2: Simple HTML Form

Minimal frontend without framework.

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoBoard - Employee Onboarding</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            color: #333;
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 14px;
        }

        input, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }

        .checkbox-group input {
            width: auto;
            margin-right: 10px;
        }

        .checkbox-group label {
            margin: 0;
        }

        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        button:hover {
            transform: translateY(-2px);
        }

        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .message {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            display: none;
        }

        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            display: block;
        }

        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            display: block;
        }

        .loader {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 0.8s linear infinite;
            margin-right: 8px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AutoBoard</h1>
        <p class="subtitle">Automate your employee onboarding</p>

        <form id="onboardingForm">
            <div class="form-group">
                <label for="firstName">First Name *</label>
                <input type="text" id="firstName" required>
            </div>

            <div class="form-group">
                <label for="lastName">Last Name *</label>
                <input type="text" id="lastName" required>
            </div>

            <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" required>
            </div>

            <div class="form-group">
                <label for="jobTitle">Job Title *</label>
                <input type="text" id="jobTitle" required>
            </div>

            <div class="form-group">
                <label for="department">Department *</label>
                <input type="text" id="department" required>
            </div>

            <div class="form-group">
                <label for="usageLocation">Country *</label>
                <select id="usageLocation" required>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IN">India</option>
                    <option value="JP">Japan</option>
                </select>
            </div>

            <div class="checkbox-group">
                <input type="checkbox" id="assignLicense" checked>
                <label for="assignLicense">Assign Microsoft 365 License</label>
            </div>

            <button type="submit" id="submitBtn">
                Create Employee
            </button>
        </form>

        <div id="message" class="message"></div>
    </div>

    <script>
        const WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/autoboard-onboard';

        document.getElementById('onboardingForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('submitBtn');
            const message = document.getElementById('message');

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loader"></span>Creating...';
            message.style.display = 'none';

            try {
                const formData = {
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    email: document.getElementById('email').value,
                    jobTitle: document.getElementById('jobTitle').value,
                    department: document.getElementById('department').value,
                    usageLocation: document.getElementById('usageLocation').value,
                    assignLicense: document.getElementById('assignLicense').checked
                };

                const response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    message.className = 'message success';
                    message.innerHTML = `
                        <strong>✅ Employee Created Successfully!</strong><br><br>
                        <strong>Email:</strong> ${result.employee.email}<br>
                        <strong>Temporary Password:</strong> ${result.employee.temporaryPassword}<br><br>
                        <strong>Google Workspace:</strong> ${result.google.created ? '✅ Created' : '❌ Failed'}<br>
                        <strong>Microsoft 365:</strong> ${result.microsoft.created ? '✅ Created' : '❌ Failed'}<br>
                        <strong>License Assigned:</strong> ${result.microsoft.licenseAssigned ? '✅ Yes' : '⚠️ No'}
                        ${result.errors.length > 0 ? '<br><br><strong>Warnings:</strong><br>' + result.errors.join('<br>') : ''}
                    `;

                    // Reset form
                    document.getElementById('onboardingForm').reset();
                } else {
                    message.className = 'message error';
                    message.innerHTML = `
                        <strong>❌ Onboarding Failed</strong><br><br>
                        ${result.errors.join('<br>')}
                    `;
                }
            } catch (error) {
                message.className = 'message error';
                message.innerHTML = `<strong>❌ Error:</strong> ${error.message}`;
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Employee';
            }
        });
    </script>
</body>
</html>
```

### Deployment

1. Save as `index.html`
2. Update `WEBHOOK_URL` with your n8n webhook
3. Host on:
   - GitHub Pages (free)
   - Netlify (free)
   - Vercel (free)
   - Any web server

---

## Option 3: React SPA (without Next.js)

Lightweight React app without server-side rendering.

### Create React App

```bash
npx create-react-app autoboard-frontend
cd autoboard-frontend
```

### src/App.js

```javascript
import React, { useState } from 'react';
import './App.css';

const WEBHOOK_URL = process.env.REACT_APP_N8N_WEBHOOK_URL;

function App() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    department: '',
    usageLocation: 'US',
    assignLicense: true
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          jobTitle: '',
          department: '',
          usageLocation: 'US',
          assignLicense: true
        });
      } else {
        setError(data.errors.join(', '));
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <h1>AutoBoard</h1>
        <p className="subtitle">Employee Onboarding Automation</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="jobTitle"
            placeholder="Job Title"
            value={formData.jobTitle}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="department"
            placeholder="Department"
            value={formData.department}
            onChange={handleChange}
            required
          />

          <select
            name="usageLocation"
            value={formData.usageLocation}
            onChange={handleChange}
            required
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
          </select>

          <label>
            <input
              type="checkbox"
              name="assignLicense"
              checked={formData.assignLicense}
              onChange={handleChange}
            />
            Assign Microsoft 365 License
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Employee'}
          </button>
        </form>

        {result && (
          <div className="success">
            <h2>✅ Success!</h2>
            <p><strong>Email:</strong> {result.employee.email}</p>
            <p><strong>Password:</strong> {result.employee.temporaryPassword}</p>
            <p><strong>Google:</strong> {result.google.created ? '✅' : '❌'}</p>
            <p><strong>Microsoft:</strong> {result.microsoft.created ? '✅' : '❌'}</p>
            <p><strong>License:</strong> {result.microsoft.licenseAssigned ? '✅' : '⚠️'}</p>
          </div>
        )}

        {error && (
          <div className="error">
            <h2>❌ Error</h2>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

### .env

```env
REACT_APP_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/autoboard-onboard
```

### Deploy

```bash
npm run build
# Deploy 'build' folder to any static host
```

---

## Securing the Webhook

n8n webhooks are public by default. Here are security options:

### Option 1: API Key in Header

**n8n workflow** - Add "HTTP Request" node at start:
```javascript
// Check authorization header
const authHeader = $input.item.json.headers.authorization;
const expectedKey = 'Bearer your-secret-api-key';

if (authHeader !== expectedKey) {
  throw new Error('Unauthorized');
}
```

**Frontend**:
```javascript
fetch(WEBHOOK_URL, {
  headers: {
    'Authorization': 'Bearer your-secret-api-key'
  }
})
```

### Option 2: HMAC Signature

**Frontend**:
```javascript
const crypto = require('crypto');

const payload = JSON.stringify(formData);
const signature = crypto
  .createHmac('sha256', 'your-secret-key')
  .update(payload)
  .digest('hex');

fetch(WEBHOOK_URL, {
  headers: {
    'X-Signature': signature
  },
  body: payload
})
```

**n8n workflow** - Verify signature in Code node

### Option 3: IP Whitelist

Configure n8n firewall to only accept requests from your frontend server IP.

### Option 4: Use n8n Production Webhooks

n8n has two webhook types:
- **Test webhooks**: Temporary, for development
- **Production webhooks**: Permanent, can be secured

Activate workflow to enable production webhook with optional authentication.

---

## Testing Integration

### cURL Test

```bash
curl -X POST https://your-n8n-instance.com/webhook/autoboard-onboard \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "jobTitle": "Software Engineer",
    "department": "Engineering",
    "usageLocation": "US",
    "assignLicense": true
  }'
```

### Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "AutoBoard n8n",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Employee",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"firstName\": \"John\",\n  \"lastName\": \"Doe\",\n  \"email\": \"john.doe@company.com\",\n  \"jobTitle\": \"Software Engineer\",\n  \"department\": \"Engineering\",\n  \"usageLocation\": \"US\",\n  \"assignLicense\": true\n}"
        },
        "url": {
          "raw": "https://your-n8n-instance.com/webhook/autoboard-onboard",
          "protocol": "https",
          "host": ["your-n8n-instance", "com"],
          "path": ["webhook", "autoboard-onboard"]
        }
      }
    }
  ]
}
```

---

## CORS Configuration

If you get CORS errors:

### n8n Cloud
CORS is automatically handled.

### Self-Hosted n8n
Add environment variable:
```bash
N8N_CORS_ORIGINS=https://yourdomain.com
```

Or allow all (development only):
```bash
N8N_CORS_ORIGINS=*
```

Restart n8n after changing.

---

## Summary

Choose the integration that fits your needs:
- **Option 1**: Keep Next.js, replace backend with n8n
- **Option 2**: Simple HTML, no framework
- **Option 3**: React SPA, lightweight

All options call the same n8n webhook and receive the same response format.
