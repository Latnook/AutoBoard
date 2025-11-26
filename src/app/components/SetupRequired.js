"use client";

export default function SetupRequired({ errors = [], warnings = [] }) {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '2rem auto',
            padding: '2rem',
            backgroundColor: '#1e293b',
            borderRadius: '0.5rem',
            border: '2px solid #ef4444'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    ⚙️ Setup Required
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
                    AutoBoard needs to be configured before you can use it
                </p>
            </div>

            {errors.length > 0 && (
                <div style={{
                    backgroundColor: '#7f1d1d',
                    border: '1px solid #ef4444',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                }}>
                    <h2 style={{ color: '#fca5a5', fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>❌</span>
                        <span>Critical Errors</span>
                    </h2>
                    {errors.map((error, index) => (
                        <div key={index} style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                            <div style={{ color: '#fecaca', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                {error.var}
                            </div>
                            <div style={{ color: '#fca5a5', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                Problem: {error.message}
                            </div>
                            <div style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                                💡 {error.solution}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {warnings.length > 0 && (
                <div style={{
                    backgroundColor: '#713f12',
                    border: '1px solid #f59e0b',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                }}>
                    <h2 style={{ color: '#fbbf24', fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚠️</span>
                        <span>Warnings</span>
                    </h2>
                    {warnings.map((warning, index) => (
                        <div key={index} style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                            <div style={{ color: '#fcd34d', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                {warning.var}
                            </div>
                            <div style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                {warning.message}
                            </div>
                            <div style={{ color: '#a3e635', fontSize: '0.9rem' }}>
                                💡 {warning.solution}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
                padding: '1.5rem'
            }}>
                <h2 style={{ color: '#3b82f6', fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📖</span>
                    <span>Setup Instructions</span>
                </h2>

                <ol style={{ color: '#cbd5e1', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                    <li style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#60a5fa' }}>Copy the example file:</strong>
                        <pre style={{
                            backgroundColor: '#1e293b',
                            padding: '0.75rem',
                            borderRadius: '0.25rem',
                            marginTop: '0.5rem',
                            overflow: 'auto',
                            fontSize: '0.875rem'
                        }}>
                            <code>cp .env.example .env.local</code>
                        </pre>
                    </li>

                    <li style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#60a5fa' }}>Edit .env.local</strong> with your credentials
                    </li>

                    <li style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#60a5fa' }}>Follow the README</strong> for detailed setup:
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', listStyle: 'disc' }}>
                            <li>Google Workspace: Setup Section 2</li>
                            <li>Microsoft 365: Setup Section 3</li>
                        </ul>
                    </li>

                    <li style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#60a5fa' }}>Restart the server:</strong>
                        <pre style={{
                            backgroundColor: '#1e293b',
                            padding: '0.75rem',
                            borderRadius: '0.25rem',
                            marginTop: '0.5rem',
                            overflow: 'auto',
                            fontSize: '0.875rem'
                        }}>
                            <code>npm run dev</code>
                        </pre>
                    </li>
                </ol>
            </div>

            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#0c4a6e',
                border: '1px solid #0ea5e9',
                borderRadius: '0.5rem',
                color: '#7dd3fc',
                fontSize: '0.875rem'
            }}>
                <strong>💡 Quick Tip:</strong> Generate NEXTAUTH_SECRET using:
                <pre style={{
                    backgroundColor: '#1e293b',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    marginTop: '0.5rem',
                    overflow: 'auto'
                }}>
                    <code>openssl rand -base64 32</code>
                </pre>
            </div>
        </div>
    );
}
