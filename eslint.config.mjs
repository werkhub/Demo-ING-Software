import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**"],
  },
  {
    rules: {
      // eslint-plugin-react-hooks v7 schlägt bei jeder Mount-Hydration-Sync auf
      // Browser-APIs (localStorage, URL-Params, Pathname) Alarm. Unsere Verwendung
      // ist legitim — wir können beim Server-Render noch nicht auf window zugreifen
      // und müssen nach Hydration synchronisieren. Ggf. später durch useSyncExternalStore
      // ersetzen, dann Regel wieder aktivieren.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
