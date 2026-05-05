"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="screen-only rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
    >
      Drucken / als PDF speichern
    </button>
  );
}
