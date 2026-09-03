"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";

export function NavBar() {
  const path = usePathname();
  const [offline, setOffline] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <>
      {offline && (
        <div className="bb-offline-banner" role="status" aria-live="polite">
          ✈ Offline — captures saved locally, sync on reconnect
        </div>
      )}
      <header className="bb-header">
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 1.5rem", width: "100%" }}>
          <nav className="bb-nav">
            <Link href="/dashboard" className="bb-brand" style={{ textDecoration: "none" }}>
              BRAINBRIDGE
            </Link>
            <div className="bb-nav-links" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link
                href="/dashboard"
                className={`bb-nav-link${path === "/dashboard" ? " bb-nav-link--active" : ""}`}
              >
                CAPTURE
              </Link>
              <Link
                href="/history"
                className={`bb-nav-link${path === "/history" ? " bb-nav-link--active" : ""}`}
              >
                HISTORY
              </Link>
              <Link
                href="/settings"
                className={`bb-nav-link${path === "/settings" ? " bb-nav-link--active" : ""}`}
              >
                SETTINGS
              </Link>

              {isLoaded && isSignedIn && (
                <div style={{ marginLeft: "0.25rem", display: "flex", alignItems: "center" }}>
                  <UserButton />
                </div>
              )}

              {isLoaded && !isSignedIn && (
                <SignInButton mode="modal">
                  <button className="bb-btn bb-btn-ghost" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}>
                    SIGN IN
                  </button>
                </SignInButton>
              )}
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
