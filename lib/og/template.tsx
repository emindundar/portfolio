export const OG_SIZE = { width: 1200, height: 630 } as const;
// Dark-theme token values from app/globals.css; keep in sync by hand (image pixels, not UI classes).
const BG = "#0b0b0c", FG = "#ededed", MUTED = "#8a8a90", ACCENT = "#ff4d00";
const MAX_CHARS = 120;

export function fitTitle(title: string): { fontSize: number; text: string } {
  let text = title.trim();
  if (text.length > MAX_CHARS) {
    const cut = text.slice(0, MAX_CHARS);
    text = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).trimEnd()}…`;
  }
  const n = text.length;
  return { fontSize: n <= 24 ? 112 : n <= 48 ? 88 : n <= 80 ? 68 : 56, text };
}

/** Locale-aware upper case: Satori's textTransform ignores the language, so Turkish "Mobil" became "MOBIL", not "MOBİL". */
export function eyebrowText(eyebrow: string, locale: string): string {
  return eyebrow.toLocaleUpperCase(locale);
}

export function OgTemplate({ eyebrow, title, footer, locale }: { eyebrow: string; title: string; footer: string; locale: string }) {
  const fit = fitTitle(title);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BG, color: FG, padding: 72 }}>
      <div style={{ display: "flex", alignItems: "center", fontFamily: "JetBrains Mono", fontSize: 26, color: MUTED, letterSpacing: 2 }}>
        <div style={{ width: 18, height: 18, background: ACCENT, marginRight: 18 }} />
        {eyebrowText(eyebrow, locale)}
      </div>
      <div style={{ display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 800, fontSize: fit.fontSize, lineHeight: 1, letterSpacing: -2 }}>{fit.text}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ width: "100%", height: 6, background: ACCENT, marginBottom: 28 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 26, color: MUTED }}>
          <div style={{ display: "flex" }}>emin dündar</div>
          <div style={{ display: "flex" }}>{footer}</div>
        </div>
      </div>
    </div>
  );
}
