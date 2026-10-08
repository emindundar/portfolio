import type { Locale } from "@/i18n/routing";
import { getTimeline, orgName } from "@/lib/content";

export function Certificates({ locale }: { locale: Locale }) {
  const certs = getTimeline(locale).filter((e) => e.kind === "cert");
  return (
    <ul className="m-0 list-none border-t border-line p-0 font-mono text-sm">
      {certs.map((c) => (
        <li key={c.text.title} data-reveal className="border-b border-line py-3">
          {c.text.title} <span className="text-muted">— {orgName(c, locale)}</span>
        </li>
      ))}
    </ul>
  );
}
