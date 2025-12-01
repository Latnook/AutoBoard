import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
});

export const metadata = {
  title: "AutoBoard - Employee Onboarding Automation",
  description: "Automate employee onboarding across Google Workspace and Microsoft 365",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0e1a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external APIs for faster requests */}
        <link rel="preconnect" href="https://accounts.google.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://login.microsoftonline.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://graph.microsoft.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />

        {/* Prefetch critical API routes in production */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <link rel="prefetch" href="/api/auth/session" as="fetch" crossOrigin="anonymous" />
            <link rel="prefetch" href="/api/licenses" as="fetch" crossOrigin="anonymous" />
          </>
        )}
      </head>
      <body className={geistSans.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
