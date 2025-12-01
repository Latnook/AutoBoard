"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { GoogleIcon, MicrosoftIcon } from "./Icons";
import styles from "./dashboard.module.css";

const OnboardingForm = dynamic(() => import("./OnboardingForm").then(mod => mod.default), {
    loading: () => <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading form...</div>
});

const LicenseSidebar = dynamic(() => import("./LicenseSidebar").then(mod => mod.default), {
    loading: () => (
        <aside className={styles.licenseSidebar}>
            <h3>License Status</h3>
            <p className={styles.loadingText}>Loading licenses...</p>
        </aside>
    ),
    ssr: false
});

export default function Dashboard({ session, secondaryGoogle, secondaryMicrosoft }) {
    const router = useRouter();

    const handleSignOut = async () => {
        // Clear local cookies first
        await fetch("/api/logout", { method: "POST" });
        // Then sign out of NextAuth
        signOut();
    };

    if (!session) {
        return (
            <div style={{ textAlign: 'center' }}>
                <h1 className="title">AutoBoard</h1>
                <p className="subtitle">
                    Automate your employee onboarding with ease.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                        onClick={() => signIn("google")}
                        className="btn btn-google"
                    >
                        <GoogleIcon />
                        Connect Google Workspace
                    </button>
                    <button
                        onClick={() => signIn("azure-ad")}
                        className="btn btn-microsoft"
                    >
                        <MicrosoftIcon />
                        Connect Microsoft 365
                    </button>
                </div>
            </div>
        );
    }

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleUserCreated = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const isGoogleConnected = session.provider === 'google' || secondaryGoogle;
    const isMicrosoftConnected = session.provider === 'azure-ad' || secondaryMicrosoft;

    return (
        <div className={styles.dashboardLayout}>
            <LicenseSidebar isConnected={isMicrosoftConnected} refreshTrigger={refreshTrigger} />

            <main className={styles.mainContent} style={{ position: 'relative' }}>
                <div className="container" style={{ textAlign: 'center', maxWidth: '800px', paddingTop: '3rem' }}>
                    <button
                        onClick={handleSignOut}
                        className="btn btn-secondary"
                        style={{
                            position: 'absolute',
                            top: '2rem',
                            right: '2rem',
                            width: 'auto',
                            padding: '0.5rem 1.5rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        Sign Out
                    </button>

                    <h1 className="title" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome, {session.user.name}</h1>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div className={`status-badge ${isGoogleConnected ? 'connected' : 'disconnected'}`}>
                            Google: {isGoogleConnected ? 'Connected' : 'Not Connected'}
                        </div>
                        <div className={`status-badge ${isMicrosoftConnected ? 'connected' : 'disconnected'}`}>
                            Microsoft: {isMicrosoftConnected ? 'Connected' : 'Not Connected'}
                        </div>
                    </div>

                    {!isGoogleConnected && (
                        <button onClick={() => router.push('/api/link/google')} className="btn btn-google">
                            <GoogleIcon />
                            Link Google Account
                        </button>
                    )}

                    {!isMicrosoftConnected && (
                        <button onClick={() => router.push('/api/link/microsoft')} className="btn btn-microsoft">
                            <MicrosoftIcon />
                            Link Microsoft Account
                        </button>
                    )}

                    <OnboardingForm
                        isUnified={isGoogleConnected && isMicrosoftConnected}
                        onUserCreated={handleUserCreated}
                    />
                </div>
            </main>
        </div>
    );
}
