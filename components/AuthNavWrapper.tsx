"use client";

/**
 * components/AuthNavWrapper.tsx
 *
 * Conditionally renders the NavBar + SyncProvider only when the user is on
 * an authenticated route (dashboard, history, settings, research).
 * On the public landing page and sign-in/up pages — no nav chrome.
 */

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { SyncProvider } from "@/components/SyncProvider";

const PROTECTED_PREFIXES = ["/dashboard", "/history", "/settings", "/research"];

export function AuthNavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppRoute = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isAppRoute) {
    return (
      <SyncProvider>
        <NavBar />
        {children}
      </SyncProvider>
    );
  }

  // Landing page and auth pages: no nav, no sync provider
  return <>{children}</>;
}
