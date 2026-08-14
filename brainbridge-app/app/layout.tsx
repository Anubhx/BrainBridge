import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SyncProvider } from "@/components/SyncProvider";
import { NavBar } from "@/components/NavBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BrainBridge — Capture & Enrich",
  description:
    "Capture thoughts instantly. Enrich them with AI on demand. Offline-first PWA.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BrainBridge",
  },
  icons: {
    apple: "/icon-192.svg",
    icon: "/icon-192.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SyncProvider>
          <NavBar />
          {children}
        </SyncProvider>
      </body>
    </html>
  );
}
