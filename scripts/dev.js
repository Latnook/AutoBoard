#!/usr/bin/env node

/**
 * Custom dev script that pre-warms Next.js compilation
 * This reduces the "waiting for localhost" time by compiling routes upfront
 */

const { spawn } = require('child_process');
const http = require('http');

const PORT = 3000;
const HOST = 'localhost';

console.log('🚀 Starting Next.js dev server with pre-compilation...\n');

// Start Next.js dev server
const nextProcess = spawn('npm', ['run', 'dev:base'], {
  stdio: 'inherit',
  shell: true,
});

// Function to check if server is ready
function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://${HOST}:${PORT}`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Function to pre-warm a route
async function prewarmRoute(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://${HOST}:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Wait for server to be ready, then pre-warm routes
async function warmupServer() {
  console.log('⏳ Waiting for dev server to start...');

  // Wait up to 30 seconds for server to start
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await checkServer()) {
      console.log('✅ Dev server is ready!\n');
      console.log('🔥 Pre-compiling routes (this makes first load instant)...');

      // Pre-warm common routes in parallel
      await Promise.all([
        prewarmRoute('/'),
        prewarmRoute('/api/auth/session'),
      ]);

      console.log('✨ All routes pre-compiled! Your app is ready.\n');
      console.log(`🌐 Open http://${HOST}:${PORT} in your browser\n`);
      return;
    }
  }

  console.log('⚠️  Server took too long to start, but continuing anyway...\n');
}

// Start the warmup process
warmupServer().catch(console.error);

// Forward signals to child process
process.on('SIGINT', () => {
  nextProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextProcess.kill('SIGTERM');
  process.exit(0);
});
