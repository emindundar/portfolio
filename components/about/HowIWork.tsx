import { getTranslations } from "next-intl/server";

const KEYS = ["how1", "how2", "how3", "how4"] as const;

export async function HowIWork() {
  const t = await getTranslations("About");
  return (
    <ol className="m-0 grid list-none gap-0 border-t border-line p-0 md:grid-cols-2">
      {KEYS.map((k, i) => (
        <li key={k} data-reveal className="flex gap-4 border-b border-line py-6 md:pr-6">
          <span aria-hidden="true" className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
          <p className="text-lg leading-relaxed">{t(k)}</p>
        </li>
      ))}
    </ol>
  );
}
