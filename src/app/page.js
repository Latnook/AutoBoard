import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Dashboard from "./components/Dashboard";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
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
