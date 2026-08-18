"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function NavBar() {
  const path = usePathname();
  const [offline, setOffline] = useState(false);

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
          ✈ Offline - captures are saved locally and will sync when reconnected
        </div>
      )}
      <header className="bb-header">
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 1.5rem", width: "100%" }}>
          <nav className="bb-nav">
            <Link href="/" className="bb-brand" style={{ textDecoration: "none" }}>
              BRAINBRIDGE
            </Link>
            <div className="bb-nav-links">
              <Link
                href="/"
                className={`bb-nav-link${path === "/" ? " bb-nav-link--active" : ""}`}
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
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
