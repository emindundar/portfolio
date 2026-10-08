"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sendContact } from "@/app/[locale]/contact/actions";
// Types only: a value import from lib/contact would pull zod (~33 KB) into the client bundle, and the nav
// prefetches this route's chunks from every page. The page passes the constants down as props instead.
import type { Budget, ContactErrorCode, ContactField, ContactState, FieldError } from "@/lib/contact";
import { buttonClasses } from "@/components/ui/Button";
import { Turnstile } from "./Turnstile";

const FIELD_ERROR_KEY = { required: "fieldRequired", tooShort: "fieldTooShort", tooLong: "fieldTooLong", invalid: "fieldInvalid" } as const satisfies Record<FieldError, string>;
const ERROR_KEY = { invalid: "errorInvalid", turnstile: "errorTurnstile", rate: "errorRate", unavailable: "errorUnavailable", send: "errorSend" } as const satisfies Record<ContactErrorCode, string>;
const BUDGET_KEY = { lt1k: "budgetLt1k", "1k-5k": "budget1k5k", "5k-15k": "budget5k15k", gt15k: "budgetGt15k" } as const satisfies Record<Budget, string>;
const FIELD_ORDER: ContactField[] = ["name", "email", "message", "budget"];
const INITIAL: ContactState = { status: "idle" };

// border-muted, not border-line: the edge of an input has to reach 3:1 against the page (WCAG 1.4.11).
const control = "block w-full min-h-11 border border-muted bg-surface px-3 py-3 font-sans text-base text-fg hover:border-fg aria-[invalid=true]:border-accent";
const label = "mb-2 block font-mono text-xs uppercase tracking-wide text-muted";
const marker = "mt-[0.4em] inline-block h-2 w-2 shrink-0 bg-accent";

type Props = { locale: string; siteKey: string; linkedinUrl: string; budgets: readonly Budget[]; honeypotField: string };

export function ContactForm({ locale, siteKey, linkedinUrl, budgets, honeypotField }: Props) {
  const t = useTranslations("Contact");
  const tc = useTranslations("Common");
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, INITIAL);
  // Every server answer is a new state object. Counting them during render (not in an effect) gives the
  // form a new key per answer: it remounts, so defaultValue shows what the server sent back and the
  // bot check below issues a fresh single-use token.
  const [answer, setAnswer] = useState({ state, round: 0 });
  if (answer.state !== state) setAnswer({ state, round: answer.round + 1 });
  const [botCheckDown, setBotCheckDown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);
  const onUnavailable = useCallback(() => setBotCheckDown(true), []);
  const onAvailable = useCallback(() => setBotCheckDown(false), []);

  // After each server answer move focus to the result: the success message, the first invalid field,
  // or the alert when no single field is at fault.
  useEffect(() => {
    if (state.status === "idle") return;
    if (state.status === "success") {
      successRef.current?.focus();
      return;
    }
    const first = FIELD_ORDER.find((f) => state.fieldErrors?.[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    else alertRef.current?.focus();
  }, [state]);

  const linkedin = (chunks: React.ReactNode) => (
    <a href={linkedinUrl} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4">
      {chunks}
      <span className="sr-only"> ({tc("newTab")})</span>
    </a>
  );

  if (state.status === "success") {
    return (
      <div className="border border-line bg-surface p-6">
        <p ref={successRef} tabIndex={-1} role="status" data-contact-status="success" className="flex gap-3 text-lg">
          <span aria-hidden="true" className={marker} />
          {t("success")}
        </p>
        {/* Plain anchor on purpose: a full load is what clears the action state (and it works without JS). */}
        <a href={`/${locale}/contact`} className={buttonClasses("ghost", "mt-6")}>{t("sendAnother")}</a>
      </div>
    );
  }

  const values = state.status === "error" ? state.values : { name: "", email: "", message: "", budget: "" };
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const errorCode: ContactErrorCode | null = state.status === "error" ? state.code : botCheckDown ? "turnstile" : null;

  const fieldProps = (field: ContactField) => {
    const invalid = Boolean(fieldErrors[field]);
    const describedBy = [invalid && `contact-${field}-error`, field === "message" && "contact-message-hint"].filter(Boolean).join(" ");
    return {
      id: `contact-${field}`,
      name: field,
      "aria-invalid": invalid ? (true as const) : undefined,
      "aria-describedby": describedBy || undefined,
    };
  };
  const fieldError = (field: ContactField) => {
    const code = fieldErrors[field];
    return code ? (
      <p id={`contact-${field}-error`} className="mt-2 flex gap-2 text-sm">
        <span aria-hidden="true" className={marker} />
        {t(FIELD_ERROR_KEY[code])}
      </p>
    ) : null;
  };

  return (
    <form key={answer.round} ref={formRef} action={action} noValidate data-contact-form className="grid gap-6">
      {errorCode && (
        <p ref={alertRef} tabIndex={-1} role="alert" data-contact-status="error" className="flex gap-3 border border-accent p-4">
          <span aria-hidden="true" className={marker} />
          <span>{t.rich(ERROR_KEY[errorCode], { link: linkedin })}</span>
        </p>
      )}
      <input type="hidden" name="locale" value={locale} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-trap">{t("trap")}</label>
        <input id="contact-trap" name={honeypotField} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={label}>{t("name")}</label>
          <input {...fieldProps("name")} type="text" required minLength={2} maxLength={80} autoComplete="name" defaultValue={values.name} className={control} />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor="contact-email" className={label}>{t("email")}</label>
          <input {...fieldProps("email")} type="email" required maxLength={254} autoComplete="email" inputMode="email" defaultValue={values.email} className={control} />
          {fieldError("email")}
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className={label}>{t("message")}</label>
        <textarea {...fieldProps("message")} required minLength={10} maxLength={2000} rows={8} defaultValue={values.message} className={`${control} resize-y`} />
        {fieldError("message")}
        <p id="contact-message-hint" className="mt-2 text-sm text-muted">{t("messageHint")}</p>
      </div>
      <div className="md:max-w-sm">
        <label htmlFor="contact-budget" className={label}>{t("budget")}</label>
        <div className="relative">
          <select {...fieldProps("budget")} defaultValue={values.budget} className={`${control} appearance-none pr-10`}>
            <option value="">{t("budgetNone")}</option>
            {budgets.map((b) => <option key={b} value={b}>{t(BUDGET_KEY[b])}</option>)}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-sm text-muted">▾</span>
        </div>
        {fieldError("budget")}
      </div>
      <noscript><p className="text-sm text-muted">{t.rich("noScript", { link: linkedin })}</p></noscript>
      <div>
        {siteKey && <Turnstile siteKey={siteKey} locale={locale} onUnavailable={onUnavailable} onAvailable={onAvailable} />}
        <button type="submit" disabled={pending} className={buttonClasses("primary", "cursor-pointer disabled:cursor-wait disabled:opacity-60")}>
          {pending ? t("sending") : t("submit")}
        </button>
        {/* KVKK art. 10 / GDPR art. 13: say where the data goes at the point of collection. text-muted on bg is 5.73:1 (dark) and 4.74:1 (light). */}
        <p data-contact-privacy className="mt-4 max-w-xl text-sm text-muted">{t("privacy")}</p>
      </div>
    </form>
  );
}
