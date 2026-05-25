import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobRadar — Find Your Next Role",
  description: "AI-powered job search that matches opportunities to your resume automatically.",
  keywords: ["jobs", "job search", "resume", "AI", "career"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "JobRadar",
    description: "AI-powered job search that matches opportunities to your resume automatically.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-signal-bg min-h-screen antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#0c1527",
              color: "#f9fafb",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#030712" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#030712" },
            },
          }}
        />
      </body>
    </html>
  );
}
