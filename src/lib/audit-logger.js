import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const AUDIT_LOG_FILE = path.join(LOG_DIR, 'audit.log');

// Ensure log directory exists with restricted permissions
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
}

// Set restrictive permissions on audit log file if it exists
if (fs.existsSync(AUDIT_LOG_FILE)) {
    try {
        fs.chmodSync(AUDIT_LOG_FILE, 0o600); // Only owner can read/write
    } catch (error) {
        console.error("Failed to set audit log file permissions:", error);
    }
}

/**
 * Log user creation events to a separate audit log
 * This creates an immutable audit trail for compliance and security monitoring
 *
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action performed (e.g., 'USER_CREATED', 'USER_CREATION_FAILED')
 * @param {string} params.targetEmail - Email of the user being created
 * @param {string} params.performedBy - Email of the admin who performed the action
 * @param {string} params.ipAddress - IP address of the request
 * @param {boolean} params.success - Whether the action succeeded
 * @param {Object} params.details - Additional details (google/microsoft status, errors, etc.)
 */
export function logAuditEvent({ action, targetEmail, performedBy, ipAddress, success, details = {} }) {
    const timestamp = new Date().toISOString();

    const auditEntry = {
        timestamp,
        action,
        target_email: targetEmail,
        performed_by: performedBy || 'system',
        ip_address: ipAddress || 'unknown',
        success,
        details
    };

    const logLine = JSON.stringify(auditEntry) + '\n';

    try {
        fs.appendFileSync(AUDIT_LOG_FILE, logLine, { mode: 0o600 });
    } catch (error) {
        console.error("Failed to write to audit log:", error);
    }
}

/**
 * Read recent audit log entries
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} Array of audit log entries
 */
export function getRecentAuditLogs(limit = 100) {
    try {
        if (!fs.existsSync(AUDIT_LOG_FILE)) {
            return [];
        }

        const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.length > 0);

        // Get last N lines
        const recentLines = lines.slice(-limit);

        return recentLines.map(line => {
            try {
                return JSON.parse(line);
            } catch (error) {
                return null;
            }
        }).filter(entry => entry !== null);
    } catch (error) {
        console.error("Failed to read audit log:", error);
        return [];
    }
}

/**
 * Check for suspicious activity patterns
 * Returns true if suspicious activity detected
 */
export function detectSuspiciousActivity() {
    const recentLogs = getRecentAuditLogs(50);
    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);

    // Count user creations in the last 10 minutes
    const recentCreations = recentLogs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime > tenMinutesAgo && log.action === 'USER_CREATED' && log.success;
    });

    // Alert if more than 5 users created in 10 minutes
    if (recentCreations.length > 5) {
        return {
            suspicious: true,
            reason: `${recentCreations.length} users created in the last 10 minutes`,
            count: recentCreations.length
        };
    }

    return { suspicious: false };
}
