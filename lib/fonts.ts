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
});

export const fontClassNames = `${cabinet.variable} ${satoshi.variable} ${jetbrains.variable}`;
