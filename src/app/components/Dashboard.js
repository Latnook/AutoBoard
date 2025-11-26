"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import OnboardingForm from "./OnboardingForm";
import { useRouter } from "next/navigation";
import LicenseSidebar from "./LicenseSidebar";

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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Connect Google Workspace
                    </button>
                    <button
                        onClick={() => signIn("azure-ad")}
                        className="btn btn-microsoft"
                    >
                        <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#f25022" d="M1 1h10v10H1z" />
                            <path fill="#00a4ef" d="M1 12h10v10H1z" />
                            <path fill="#7fba00" d="M12 1h10v10H12z" />
                            <path fill="#ffb900" d="M12 12h10v10H12z" />
                        </svg>
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
        <div className="dashboard-layout">
            <LicenseSidebar isConnected={isMicrosoftConnected} refreshTrigger={refreshTrigger} />

            <main className="main-content" style={{ position: 'relative' }}>
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

                    <h1 className="title" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome, {session.user.email}</h1>

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
                            Link Google Account
                        </button>
                    )}

                    {!isMicrosoftConnected && (
                        <button onClick={() => router.push('/api/link/microsoft')} className="btn btn-microsoft">
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
