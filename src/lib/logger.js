import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const logEntry = `[${timestamp}] [${level}] ${message}${metaString}\n`;

    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
        console.error("Failed to write to log file:", error);
    }
}

export const logger = {
    info: (message, meta) => {
        console.log(`[INFO] ${message}`, meta || '');
        writeLog('INFO', message, meta);
    },
    error: (message, meta) => {
        console.error(`[ERROR] ${message}`, meta || '');
        writeLog('ERROR', message, meta);
    },
    warn: (message, meta) => {
        console.warn(`[WARN] ${message}`, meta || '');
        writeLog('WARN', message, meta);
    }
};
