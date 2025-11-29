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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={geistSans.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
