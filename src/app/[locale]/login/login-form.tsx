"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { loginAction } from "./actions";

export function LoginForm() {
  const params = useSearchParams();
  const redirectTo = params.get("callbackUrl") ?? "/";
  const [state, formAction] = useActionState(loginAction, null);
  const formError = state && !state.ok ? state.formError : undefined;
  const t = useTranslations("modules.login");

  return (
    <form action={formAction} className="mt-10 space-y-6">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {formError ? (
        <div
          role="alert"
          className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm"
        >
          {formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
        >
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="thomas@mueller-bau.de"
          className="w-full bg-transparent border-b border-[color:var(--color-border)] focus:border-[color:var(--color-accent)] py-2.5 text-base text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:outline-none transition-colors font-mono"
        />
      </div>

      <SubmitButton />

      <p className="text-[11px] text-[color:var(--color-fg-muted)] leading-relaxed">
        {t.rich("helpText", {
          filePath: () => <span className="font-mono">src/auth.ts</span>,
        })}
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("modules.login");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-3 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}
