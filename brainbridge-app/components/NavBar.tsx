"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function NavBar() {
  const path = usePathname();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <>
      {offline && (
        <div className="bb-offline-banner" role="status" aria-live="polite">
          ✈ Offline — captures are saved locally and will sync when reconnected
        </div>
      )}
      <div className="bb-page" style={{ padding: "0 1rem", maxWidth: "680px", margin: "0 auto" }}>
        <nav className="bb-nav">
          <span style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
            BrainBridge
          </span>
          <div className="bb-nav-links">
            <Link
              href="/"
              className={`bb-nav-link${path === "/" ? " bb-nav-link--active" : ""}`}
            >
              Capture
            </Link>
            <Link
              href="/history"
              className={`bb-nav-link${path === "/history" ? " bb-nav-link--active" : ""}`}
            >
              History
            </Link>
            <Link
              href="/settings"
              className={`bb-nav-link${path === "/settings" ? " bb-nav-link--active" : ""}`}
            >
              Settings
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
