"use client";

import { useState, useEffect, memo } from "react";
import { getReadableLicenseName } from "@/lib/constants";
import styles from "./dashboard.module.css";

function LicenseSidebar({ isConnected, refreshTrigger }) {
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
        <aside className={styles.licenseSidebar}>
            <h3>License Status</h3>
            {loading && <p className={styles.loadingText}>Loading licenses...</p>}

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
                <div>
                    {licenses.map((lic, i) => (
                        <div key={i} className={`${styles.licenseItem} ${lic.remaining < 5 ? styles.lowStock : ''}`}>
                            <div className={styles.licenseName}>{getReadableLicenseName(lic.skuPartNumber)}</div>
                            <div className={styles.licenseCount}>
                                <span className={styles.count}>{lic.remaining}</span>
                                <span className={styles.label}>available</span>
                            </div>
                            <div className={styles.progressBar}>
                                {lic.remaining > 0 && (
                                    <div
                                        className={styles.progressFill}
                                        style={{
                                            width: lic.total > 0 ? `${(lic.remaining / lic.total) * 100}%` : '0%'
                                        }}
                                    ></div>
                                )}
                            </div>
                            <div className={styles.licenseMeta}>
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

export default memo(LicenseSidebar);
