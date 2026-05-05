"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lexbau] global error", error);
  }, [error]);

  // global-error rendert OUTSIDE [locale] und kann daher kein next-intl
  // verwenden — Last-Resort-Fallback, wenn auch der Locale-Layout-Boundary
  // crashed. Bewusst zweisprachig (DE Primary, EN Subtitle).
  return (
    <html lang="de">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "4rem 1.5rem",
          margin: 0,
          background: "#fafaf7",
          color: "#0a0a0a",
        }}
      >
        <main style={{ maxWidth: "640px", margin: "0 auto" }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: "#8b1e1e",
            }}
          >
            Schwerwiegender Fehler
          </p>
          <h1
            style={{
              marginTop: "1rem",
              fontSize: "2.25rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Die Anwendung konnte nicht geladen werden.
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#5a5a55", fontStyle: "italic" }}>
            The application could not be loaded.
          </p>
          <p style={{ marginTop: "1rem", color: "#5a5a55", lineHeight: 1.6 }}>
            Bitte lade die Seite neu. Wenn der Fehler bleibt, kontaktiere den Support.<br />
            <span style={{ fontStyle: "italic" }}>
              Please reload the page. If the issue persists, contact support.
            </span>
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: "0.75rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
                color: "#5a5a55",
              }}
            >
              Fehler-ID: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.65rem 1.25rem",
              borderRadius: "9999px",
              background: "#0a0a0a",
              color: "#fafaf7",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Erneut laden
          </button>
        </main>
      </body>
    </html>
  );
}
