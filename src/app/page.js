import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Dashboard from "./components/Dashboard";
import SetupRequired from "./components/SetupRequired";
import { validateEnvVariables } from "@/lib/env-validator";

export default async function Home() {
  // Validate environment variables before proceeding
  const { errors, warnings, isValid } = validateEnvVariables();

  // If there are critical errors, show setup page
  if (!isValid) {
    return (
      <main className="flex-center">
        <SetupRequired errors={errors} warnings={warnings} />
      </main>
    );
  }

  // Try to get session, but catch JWT errors gracefully
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error("Session error:", error);
    // If JWT error, likely invalid NEXTAUTH_SECRET
    if (error.message?.includes('JWT') || error.message?.includes('decrypt')) {
      return (
        <main className="flex-center">
          <SetupRequired
            errors={[{
              var: 'NEXTAUTH_SECRET',
              message: 'Invalid or corrupted NEXTAUTH_SECRET',
              solution: 'Generate a new secret using: openssl rand -base64 32, then restart the server'
            }]}
            warnings={warnings}
          />
        </main>
      );
    }
    throw error;
  }

  const cookieStore = await cookies();
  const secondaryGoogle = cookieStore.has("secondary_google_token");
  const secondaryMicrosoft = cookieStore.has("secondary_microsoft_token");

  return (
    <main className="flex-center">
      <Dashboard
        session={session}
        secondaryGoogle={secondaryGoogle}
        secondaryMicrosoft={secondaryMicrosoft}
      />
    </main>
  );
}
