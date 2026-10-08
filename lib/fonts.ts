import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";

export const cabinet = localFont({
  src: "../public/fonts/CabinetGrotesk-Variable.woff2",
  variable: "--font-cabinet",
  weight: "100 900",
  display: "swap",
});

export const satoshi = localFont({
  src: "../public/fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  variable: "--font-satoshi",
  display: "swap",
  // Only the LCP font (Cabinet, hero headline) is preloaded; body/mono fonts must not compete with it.
  preload: false,
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
  // The generated fallback is Arial at size-adjust 134.59 %, about 50 % wider than a 0.6 em monospace for uppercase
  // text: the /work chip row wrapped to three rows before the swap and two after (CLS 0.138). System monospace
  // fonts advance 0.600-0.602 em like JetBrains Mono, so wrap points do not move at the swap.
  // Both options are needed: Turbopack (16.4) still emits the Arial-based "JetBrains Mono Fallback" face with
  // `adjustFontFallback: false` alone; an explicit `fallback` list is what removes it there.
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const fontClassNames = `${cabinet.variable} ${satoshi.variable} ${jetbrains.variable}`;
