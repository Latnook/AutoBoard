"use client";

import { useState, useEffect } from "react";
import { getReadableLicenseName } from "@/lib/constants";

export default function LicenseSidebar({ isConnected, refreshTrigger }) {
    const [licenses, setLicenses] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLicenses = async () => {
            if (!isConnected) return;

            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/licenses");
                const data = await res.json();

                if (res.ok) {
                    setLicenses(data.licenses);
                } else {
                    setError(data.error || "Failed to fetch licenses");
                }
            } catch (err) {
                console.error("Failed to fetch licenses", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLicenses();
    }, [isConnected, refreshTrigger]);

    if (!isConnected) return null;

    return (
        <aside className="license-sidebar">
            <h3>License Status</h3>
            {loading && <p className="loading-text">Loading licenses...</p>}

            {error && (
                <div className="error-msg" style={{
                    fontSize: '0.85rem',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#ef4444',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <span>⚠️ {error}</span>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            alignSelf: 'flex-start',
                            background: 'none',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            borderRadius: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && licenses && (
                <div className="license-list">
                    {licenses.map((lic, i) => (
                        <div key={i} className={`license-item ${lic.remaining < 5 ? 'low-stock' : ''}`}>
                            <div className="license-name">{getReadableLicenseName(lic.skuPartNumber)}</div>
                            <div className="license-count">
                                <span className="count">{lic.remaining}</span>
                                <span className="label">available</span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${(lic.consumed / lic.total) * 100}%` }}
                                ></div>
                            </div>
                            <div className="license-meta">
                                {lic.consumed} used / {lic.total} total
                            </div>
                        </div>
                    ))}
                    {licenses.length === 0 && !error && <p>No licenses found.</p>}
                </div>
            )}
        </aside>
    );
}
