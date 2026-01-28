// Extract full email body from Gmail API response
const message = $input.first().json;

// Function to decode base64url
function decodeBase64Url(base64Url) {
  // Replace characters and decode
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Function to extract text from email parts
function extractText(parts, mimeType) {
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      const text = extractText(part.parts, mimeType);
      if (text) return text;
    }
  }
  return null;
}

// Get plain text body
let text = null;
let html = null;

if (message.payload.parts) {
  text = extractText(message.payload.parts, 'text/plain');
  html = extractText(message.payload.parts, 'text/html');
} else if (message.payload.body.data) {
  // Single-part message
  text = decodeBase64Url(message.payload.body.data);
}

// Get headers
const headers = message.payload.headers;
const getHeader = (name) => {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
};

// Return in same format as Gmail Trigger
return [{
  json: {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet,
    text: text || message.snippet,
    textPlain: text,
    html: html,
    subject: getHeader('Subject'),
    from: getHeader('From'),
    to: getHeader('To'),
    date: getHeader('Date')
  }
}];
