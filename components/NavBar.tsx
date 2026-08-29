"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function NavBar() {
  const path = usePathname();
  const [offline, setOffline] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();

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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

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
            <div className="bb-nav-links">
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
              {user && (
                <button
                  onClick={handleSignOut}
                  className="bb-nav-link"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  title={`Signed in as ${user.primaryEmailAddress?.emailAddress}`}
                >
                  EXIT
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
