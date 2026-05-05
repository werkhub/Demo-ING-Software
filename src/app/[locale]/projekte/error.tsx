"use client";

import { RouteError } from "@/components/route-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      area="Projekte"
      backHref="/"
      backLabel="Zum Dashboard"
      error={error}
      reset={reset}
    />
  );
}
