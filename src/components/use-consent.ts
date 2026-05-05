"use client";

import { useEffect, useState } from "react";
import { getConsent, onConsentChange } from "@/lib/consent";

export function useHasConsent(): boolean {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    setHasConsent(getConsent() !== null);
    return onConsentChange(() => {
      setHasConsent(getConsent() !== null);
    });
  }, []);

  return hasConsent;
}
