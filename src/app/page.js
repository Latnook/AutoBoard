import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { Suspense } from "react";
import Dashboard from "./components/Dashboard";

// Force dynamic rendering for authenticated content
export const dynamic = 'force-dynamic';

// Optimize for speed over consistency in dev
export const fetchCache = 'default-cache';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();

  const secondaryGoogle = cookieStore.has("secondary_google_token");
  const secondaryMicrosoft = cookieStore.has("secondary_microsoft_token");

  return (
    <main className="flex-center">
      <Suspense fallback={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading...</p>
        </div>
      }>
        <Dashboard
          session={session}
          secondaryGoogle={secondaryGoogle}
          secondaryMicrosoft={secondaryMicrosoft}
        />
      </Suspense>
    </main>
  );
}
