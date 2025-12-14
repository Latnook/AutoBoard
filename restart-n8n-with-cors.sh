#!/bin/bash
# Stop existing n8n (if running)
pkill -f "n8n"

# Start n8n with CORS enabled
N8N_CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000" npx n8n
