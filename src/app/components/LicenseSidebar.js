"use client";

import { memo } from "react";
import useSWR from "swr";
import { getReadableLicenseName } from "@/lib/constants";
import styles from "./dashboard.module.css";

const fetcher = async (url) => {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Failed to fetch licenses");
    }

    return data.licenses;
};

function LicenseSidebar({ isConnected, refreshTrigger }) {
    const { data: licenses, error, isLoading: loading, mutate } = useSWR(
        isConnected ? "/api/licenses" : null,
        fetcher,
        {
            refreshInterval: 60000, // Auto-refresh every 60 seconds
            revalidateOnFocus: false,
            dedupingInterval: 5000, // Dedupe requests within 5 seconds
        }
    );

    // Trigger revalidation when refreshTrigger changes (after user creation)
    if (refreshTrigger > 0 && isConnected) {
        mutate();
    }

    if (!isConnected) return null;

    return (
        <aside className={styles.licenseSidebar}>
            <h3>License Status</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }}>
                            <div style={{
                                height: '1rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.25rem',
                                marginBottom: '0.75rem',
                                width: '70%'
                            }}></div>
                            <div style={{
                                height: '2rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.25rem',
                                marginBottom: '0.5rem'
                            }}></div>
                            <div style={{
                                height: '0.5rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.25rem'
                            }}></div>
                        </div>
                    ))}
                </div>
            )}

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
                    <span>⚠️ {error.message}</span>
                    <button
                        onClick={() => mutate()}
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
