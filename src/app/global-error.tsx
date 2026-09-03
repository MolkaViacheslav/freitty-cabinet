"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. An error thrown in a *layout* escapes that segment's error.tsx and lands
 * here, so this is what the user sees if the cabinet layout itself fails. It replaces the root
 * layout, which is why it has to render its own <html>/<body>.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global] unrecoverable render error", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 420, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <h1 style={{ margin: "12px 0 6px", fontSize: 18, color: "#1F2A3A" }}>Something went wrong</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
              The application could not render. Reload the page, or try again in a moment.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 16,
                background: "#1F4E79",
                color: "#fff",
                border: 0,
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
