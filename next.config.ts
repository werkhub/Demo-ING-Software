import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Content-Security-Policy
// 'unsafe-inline' für styles ist aktuell notwendig wegen Next.js / next-themes
// Inline-Styles sowie Tailwind-CSS-Variablen via [color:var(--…)]. Sobald Next.js
// CSP-Nonces für CSS unterstützt, kann das ersetzt werden.
const cspParts = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Next.js (App Router) injiziert Inline-Scripts mit Nonce; in Dev braucht es zusätzlich 'unsafe-eval'.
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // connect-src: Anthropic API für spätere Claude-Anbindung
  "connect-src 'self' https://api.anthropic.com",
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspParts.join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
