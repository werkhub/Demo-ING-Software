"use client";

import { usePathname } from "@/i18n/navigation";
import { KiAssistantButton, type KiAssistantButtonProps } from "./ki-assistant-button";

/**
 * Mount-Wrapper, der den Floating-Button auf den public/anon-Routen ausblendet
 * (Login, Hinweisgeber-Eingang, externe Aufmass-Prüfer-Routen). Spiegelt die
 * gleiche Logik wie die Sidebar — wer keine Sidebar sieht, soll auch keinen
 * Floating-Assistenten sehen.
 */
export function KiAssistantMount(props: KiAssistantButtonProps) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  if (pathname.startsWith("/hinweis")) return null;
  if (pathname.startsWith("/aufmass-pruefen")) return null;
  return <KiAssistantButton {...props} />;
}
