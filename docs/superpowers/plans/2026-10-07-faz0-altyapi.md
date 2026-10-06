# Faz 0 — Altyapı Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boş ama deploy olan, iki dilli (EN varsayılan, TR), tema değiştirilebilen, içerik pipeline'ı çalışan, test ve CI'lı Next.js 16 iskeleti.

**Architecture:** Next.js 16 App Router, `app/[locale]` segmenti ile next-intl yönlendirmesi, Velite ile git tabanlı MDX içerik (build-time, Zod şemalı), Tailwind v4 `@theme` token'ları, `data-theme` ile koyu/açık tema. Sayfalar sunucu bileşeni; yalnızca toggle'lar istemci. Vitest birim, Playwright e2e, Lighthouse CI bütçe.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript 7 (strict), pnpm 10, Tailwind 4.3, next-intl 4.14, Velite 0.4, Vitest 5, Playwright 1.63, @lhci/cli 0.15, GitHub Actions, Vercel Hobby.

**Spec:** `docs/superpowers/specs/2026-10-07-portfolio-design.md` (bölüm 2.5, 3.1, 3.2, 4.1–4.5, 4.9–4.11, 5.1, 5.2 Faz 0)

## Global Constraints

- Paket yöneticisi: **pnpm**. `npm`/`yarn` lock dosyası olmayacak.
- TypeScript `strict: true`. `any` yasak (ESLint `@typescript-eslint/no-explicit-any: error`).
- Locale'ler: `['en', 'tr']`, varsayılan `'en'`, URL öneki her zaman (`/en/...`, `/tr/...`).
- Alan adı: `https://emindundar.dev` (`metadataBase`).
- Token değerleri (spec 3.1) birebir: bg `#0B0B0C`/`#F4F2EE`, surface `#141416`/`#FFFFFF`, line `#2A2A2E`/`#D9D6D0`, fg `#EDEDED`/`#111111`, muted `#8A8A90`/`#6B6B70`, accent `#FF4D00`/`#E04300`.
- Köşe yarıçapı 0 (Tailwind `--radius-*: initial`). Gölge yok (`--shadow-*: initial`).
- Fontlar: Cabinet Grotesk (display), Satoshi (gövde), JetBrains Mono (mono). İlk ikisi `public/fonts/` altında self-host, `next/font/local`; mono `next/font/google`.
- Facet'ler: `'mobile' | 'web' | 'backend' | 'ai' | 'data-erp'`; proje başına 1..3.
- `components/motion`, `components/canvas`, `components/terminal`, `lib/motion.ts` dışında `gsap`, `lenis`, `ogl`, `motion` import'u yasak (ESLint).
- Her commit'ten önce `pnpm lint && pnpm typecheck && pnpm test` geçmeli.
- Commit mesajı sonuna: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`

## Review Focus

1. **Bilinmeyen locale** (`/fr`, `/fr/work`): kullanıcı locale'li 404 sayfası görmeli, sunucu hatası değil. → Task 4 e2e.
2. **Accept-Language varyantları** (`tr-TR,tr;q=0.9`, `*`, boş): `/` sırasıyla `/tr`, `/en`, `/en`'e yönlenmeli. → Task 4 e2e.
3. **Çevirisi eksik proje** (sadece `.en.mdx` var): TR sayfada EN içerik gösterilmeli, build kırılmamalı, uyarı loglanmalı. → Task 5 birim.
4. **Geçersiz içerik** (facet listede yok, 4 facet, slug'da büyük harf): build kırılmalı, hata mesajı dosyayı ve alanı söylemeli. → Task 5 birim.
5. **Bozuk tema cookie'si** (`theme=evil`): sistem tercihine düşmeli, attribute set edilmemeli. → Task 6 birim.

---

## İnsan ön adımları (Task 1'den önce, kullanıcı yapar)

- [ ] Fontshare'den indir: https://www.fontshare.com/fonts/cabinet-grotesk ve https://www.fontshare.com/fonts/satoshi — "Download family" → zip içinden `Fonts/Variable/CabinetGrotesk-Variable.woff2` ve `Fonts/Variable/Satoshi-Variable.woff2` dosyalarını `/Users/emindundar/Portfolyo/public/fonts/` altına koy (klasörü oluştur). Lisans: ITF Free Font License, ticari kullanım serbest, yeniden dağıtım yasak; dosyalar repoda kalır çünkü site bir dağıtım değil, kullanım.
- [ ] GitHub'da boş public repo oluştur: `emindundar/portfolio`. README/.gitignore ekleme.
- [ ] **UI/UX Pro Max skill** (zorunlu, kullanıcı tüm projelerde ister; global kurulum):
  ```bash
  claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
  claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill
  ```
  Python 3.9 yeterli (stdlib only). Faz 1 başında `ui-ux-pro-max` ile brutalist tema için tasarım sistemi raporu üretilir; token'lar spec 3.1 ile çelişirse spec kazanır.
- [ ] **21st.dev** (opsiyonel, Faz 1'de ilham + UI review): ücretsiz plan günde 2 bileşen kopyası. Skill'ler `21st-ui-explore`, `21st-ui-review` yararlı; `21st-ui-build` bizim token sistemimizi ezebilir, kullanma.
  ```bash
  npx @21st-dev/cli@latest init --client claude
  ```
  API anahtarı https://21st.dev/mcp adresinden.
- [ ] Claude Code eklentileri (opsiyonel, geliştirme konforu):
  ```bash
  claude plugin install frontend-design@claude-plugins-official
  claude plugin install context7@claude-plugins-official
  claude plugin install vercel@claude-plugins-official
  claude plugin install playwright@claude-plugins-official
  claude plugin install typescript-lsp@claude-plugins-official
  ```

---

### Task 1: Next.js 16 iskeleti

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `app/layout.tsx` (geçici), `app/page.tsx` (geçici), `app/globals.css`, `.gitignore`, `.npmrc`
- Modify: `.gitignore` (mevcut, birleştirilecek)

**Interfaces:**
- Produces: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck` script'leri.

- [ ] **Step 1: Geçici klasöre scaffold üret**

```bash
cd /Users/emindundar/Portfolyo
pnpm create next-app@latest tmp-scaffold --ts --eslint --tailwind --app --no-src-dir --turbopack --import-alias "@/*" --use-pnpm --disable-git --skip-install --no-agents-md --no-agent-feedback --yes
```

Beklenen: `tmp-scaffold/` içinde `app/`, `public/`, `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`.

- [ ] **Step 2: Kök dizine taşı, geçici klasörü sil, .gitignore birleştir**

```bash
cd /Users/emindundar/Portfolyo
rsync -a --exclude .gitignore tmp-scaffold/ ./
cat tmp-scaffold/.gitignore .gitignore | awk '!seen[$0]++' > .gitignore.merged && mv .gitignore.merged .gitignore
rm -rf tmp-scaffold
printf '\n# content pipeline\n.velite/\n\n# tests\ntest-results/\nplaywright-report/\n.lighthouseci/\n' >> .gitignore
```

- [ ] **Step 3: pnpm ayarı ve kurulum**

`.npmrc` oluştur:
```
engine-strict=true
auto-install-peers=true
```

`package.json` içine `engines` ekle ve script'leri düzenle (mevcut `scripts` bloğunu bununla değiştir):
```json
{
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

```bash
pnpm install
```

Beklenen: `pnpm-lock.yaml` oluşur, hata yok.

- [ ] **Step 4: Boilerplate'i temizle**

`app/page.tsx` içeriğini şununla değiştir:
```tsx
export default function Page() {
  return (
    <main>
      <h1>Emin Dündar</h1>
    </main>
  );
}
```

`app/globals.css` içeriğini şununla değiştir (Task 2'de genişletilecek):
```css
@import "tailwindcss";
```

`app/layout.tsx` içeriğini şununla değiştir:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emin Dündar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`public/` içindeki `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` dosyalarını sil.

- [ ] **Step 5: tsconfig strict doğrula**

`tsconfig.json` içinde `"strict": true` olduğunu doğrula; yoksa ekle. `compilerOptions` içine ekle:
```json
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true
```

- [ ] **Step 6: Build, lint, typecheck**

```bash
pnpm build && pnpm lint && pnpm typecheck
```

Beklenen: üçü de sıfır hata. Build çıktısında `○ /` (static) satırı.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 app with pnpm, strict TS, Tailwind v4

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Tasarım token'ları ve fontlar

**Files:**
- Modify: `app/globals.css`
- Create: `lib/fonts.ts`
- Modify: `app/layout.tsx`
- Test: `public/fonts/` dosya varlığı (manuel), `pnpm build`

**Interfaces:**
- Produces: `lib/fonts.ts` → `export const fontClassNames: string` (üç fontun `.variable` sınıfları birleşik). CSS: `font-display`, `font-sans`, `font-mono` utility'leri; `bg-bg`, `bg-surface`, `border-line`, `text-fg`, `text-muted`, `text-accent`, `bg-accent` utility'leri; `[data-theme="light"]` ile açık tema.

- [ ] **Step 1: Font dosyalarını doğrula**

```bash
ls -la /Users/emindundar/Portfolyo/public/fonts/CabinetGrotesk-Variable.woff2 /Users/emindundar/Portfolyo/public/fonts/Satoshi-Variable.woff2
```

Beklenen: iki dosya listelenir. Yoksa dur, kullanıcıdan "İnsan ön adımları" bölümünü iste.

- [ ] **Step 2: `lib/fonts.ts` yaz**

```ts
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
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontClassNames = `${cabinet.variable} ${satoshi.variable} ${jetbrains.variable}`;
```

- [ ] **Step 3: `app/globals.css` yaz**

```css
@import "tailwindcss";

/* Koyu tema varsayılan; açık tema sistem tercihi veya data-theme="light" ile */
:root {
  --bg: #0b0b0c;
  --surface: #141416;
  --line: #2a2a2e;
  --fg: #ededed;
  --muted: #8a8a90;
  --accent: #ff4d00;
  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg: #f4f2ee;
    --surface: #ffffff;
    --line: #d9d6d0;
    --fg: #111111;
    --muted: #6b6b70;
    --accent: #e04300;
    color-scheme: light;
  }
}

:root[data-theme="light"] {
  --bg: #f4f2ee;
  --surface: #ffffff;
  --line: #d9d6d0;
  --fg: #111111;
  --muted: #6b6b70;
  --accent: #e04300;
  color-scheme: light;
}

@theme {
  --color-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --breakpoint-3xl: 90rem; /* 1440px */
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-line: var(--line);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --font-display: var(--font-cabinet), system-ui, sans-serif;
  --font-sans: var(--font-satoshi), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}

@custom-variant light (&:where([data-theme="light"], [data-theme="light"] *));

@layer base {
  html {
    background-color: var(--bg);
    color: var(--fg);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  body {
    min-height: 100dvh;
  }
  ::selection {
    background: var(--accent);
    color: var(--bg);
  }
}
```

- [ ] **Step 4: `app/layout.tsx` fontları bağla**

```tsx
import type { Metadata } from "next";
import { fontClassNames } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emin Dündar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames}>
      <body className="bg-bg text-fg font-sans">{children}</body>
    </html>
  );
}
```

`app/page.tsx` başlığını token'larla güncelle:
```tsx
export default function Page() {
  return (
    <main className="p-6">
      <h1 className="font-display text-6xl">Emin Dündar</h1>
      <p className="font-mono text-muted">2026 — PORTFOLIO</p>
      <span className="text-accent">accent</span>
    </main>
  );
}
```

- [ ] **Step 5: Build ve görsel doğrulama**

```bash
pnpm build && pnpm lint && pnpm typecheck
```

Beklenen: sıfır hata. `pnpm dev` ile `http://localhost:3000` açıldığında zemin `#0B0B0C`, başlık Cabinet Grotesk (DevTools → Computed → font-family `__cabinet_...`), vurgu turuncu.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: design tokens, dark/light theme vars, self-hosted fonts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Vitest kurulumu

**Files:**
- Create: `vitest.config.mts`, `vitest.setup.ts`, `lib/utils/cn.ts`, `lib/utils/cn.test.ts`
- Modify: `package.json`, `tsconfig.json`

**Interfaces:**
- Produces: `pnpm test` (tek sefer), `pnpm test:watch`. `cn(...classes: Array<string | false | null | undefined>): string` yardımcı fonksiyonu (sonraki görevlerde className birleştirme için).

- [ ] **Step 1: Paketleri kur**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths
```

- [ ] **Step 2: Config dosyaları**

`vitest.config.mts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
  },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`package.json` script'lerine ekle:
```json
"test": "vitest run",
"test:watch": "vitest"
```

`tsconfig.json` → `compilerOptions.types` yoksa ekle:
```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```
ve `vitest.config.mts` içindeki `test` bloğuna `globals: true` ekle.

- [ ] **Step 3: Başarısız testi yaz**

`lib/utils/cn.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names with a single space", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("drops false, null, undefined and empty strings", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });
  it("returns empty string when nothing truthy", () => {
    expect(cn(false, undefined)).toBe("");
  });
});
```

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu gör**

```bash
pnpm test
```

Beklenen: FAIL, `Cannot find module './cn'`.

- [ ] **Step 5: Minimal implementasyon**

`lib/utils/cn.ts`:
```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter((c): c is string => typeof c === "string" && c.length > 0).join(" ");
}
```

- [ ] **Step 6: Test geç**

```bash
pnpm test
```

Beklenen: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add Vitest with Testing Library and cn helper

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: i18n yönlendirme (next-intl) ve `[locale]` düzeni

**Files:**
- Create: `i18n/routing.ts`, `i18n/navigation.ts`, `i18n/request.ts`, `proxy.ts`, `messages/en.json`, `messages/tr.json`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `app/[locale]/not-found.tsx`, `app/[locale]/[...rest]/page.tsx`, `lib/seo.ts`, `lib/seo.test.ts`
- Delete: `app/layout.tsx`, `app/page.tsx`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `routing` (`locales: readonly ['en','tr']`, `defaultLocale: 'en'`), `type Locale = 'en' | 'tr'`, `Link`/`usePathname`/`useRouter`/`redirect`/`getPathname` (`i18n/navigation.ts`), `alternatesFor(path: string): Metadata['alternates']` (`lib/seo.ts`), `SITE_URL = 'https://emindundar.dev'`.
- Consumes: `fontClassNames` (Task 2).

- [ ] **Step 1: Paket kur**

```bash
pnpm add next-intl
```

- [ ] **Step 2: Routing ve navigation**

`i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "tr"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];
```

`i18n/navigation.ts`:
```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

`i18n/request.ts`:
```ts
import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      locale = paramValue;
    } else {
      notFound();
    }
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

`proxy.ts` (proje kökü):
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
```

- [ ] **Step 3: next.config.ts**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Mesaj dosyaları**

`messages/en.json`:
```json
{
  "Meta": {
    "title": "Emin Dündar — Mobile, Web, Backend & AI",
    "description": "I build products end to end: mobile apps, web, backend and AI integrations."
  },
  "Nav": {
    "home": "Home",
    "work": "Work",
    "about": "About",
    "services": "Services",
    "contact": "Contact",
    "lang": "Language",
    "theme": "Theme",
    "themeDark": "Dark",
    "themeLight": "Light"
  },
  "Home": {
    "eyebrow": "Portfolio — v0",
    "headline": "I build products end to end.",
    "projectsHeading": "Work"
  },
  "NotFound": {
    "title": "Page not found",
    "body": "Nothing lives at this address.",
    "backHome": "Back to home"
  },
  "Footer": {
    "rights": "Emin Dündar"
  }
}
```

`messages/tr.json`:
```json
{
  "Meta": {
    "title": "Emin Dündar — Mobil, Web, Backend ve AI",
    "description": "Ürünü uçtan uca kurarım: mobil uygulama, web, backend ve AI entegrasyonları."
  },
  "Nav": {
    "home": "Ana sayfa",
    "work": "İşler",
    "about": "Hakkımda",
    "services": "Hizmetler",
    "contact": "İletişim",
    "lang": "Dil",
    "theme": "Tema",
    "themeDark": "Koyu",
    "themeLight": "Açık"
  },
  "Home": {
    "eyebrow": "Portfolyo — v0",
    "headline": "Ürünü uçtan uca kurarım.",
    "projectsHeading": "İşler"
  },
  "NotFound": {
    "title": "Sayfa bulunamadı",
    "body": "Bu adreste bir şey yok.",
    "backHome": "Ana sayfaya dön"
  },
  "Footer": {
    "rights": "Emin Dündar"
  }
}
```

- [ ] **Step 5: `lib/seo.ts` için başarısız test**

`lib/seo.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { alternatesFor, SITE_URL } from "./seo";

describe("alternatesFor", () => {
  it("builds canonical and hreflang map for a path", () => {
    expect(alternatesFor("/work", "tr")).toEqual({
      canonical: "/tr/work",
      languages: {
        en: "/en/work",
        tr: "/tr/work",
        "x-default": "/en/work",
      },
    });
  });
  it("handles root path without double slashes", () => {
    expect(alternatesFor("/", "en")).toEqual({
      canonical: "/en",
      languages: { en: "/en", tr: "/tr", "x-default": "/en" },
    });
  });
  it("exposes the production site url", () => {
    expect(SITE_URL).toBe("https://emindundar.dev");
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, `Cannot find module './seo'`.

- [ ] **Step 6: `lib/seo.ts`**

```ts
import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = "https://emindundar.dev";

function join(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.replace(/\/+$/, "");
  return `/${locale}${clean}`;
}

export function alternatesFor(path: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = join(l, path);
  languages["x-default"] = join(routing.defaultLocale, path);
  return { canonical: join(locale, path), languages };
}
```

```bash
pnpm test
```
Beklenen: tüm testler geçer.

- [ ] **Step 7: `[locale]` layout ve sayfalar**

`app/layout.tsx` ve `app/page.tsx` dosyalarını sil. `app/globals.css` yerinde kalır.

`app/[locale]/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { fontClassNames } from "@/lib/fonts";
import { alternatesFor, SITE_URL } from "@/lib/seo";
import "../globals.css";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s — Emin Dündar" },
    description: t("description"),
    alternates: alternatesFor("/", locale as Locale),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={fontClassNames} suppressHydrationWarning>
      <body className="bg-bg text-fg font-sans">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`app/[locale]/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("Home");
  return (
    <main className="p-6">
      <p className="font-mono text-muted uppercase tracking-wide">{t("eyebrow")}</p>
      <h1 className="font-display text-6xl">{t("headline")}</h1>
    </main>
  );
}
```

`app/[locale]/not-found.tsx`:
```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main className="p-6">
      <p className="font-mono text-muted">404</p>
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("body")}</p>
      <Link href="/" className="mt-6 inline-block border border-line px-4 py-2 font-mono">
        {t("backHome")}
      </Link>
    </main>
  );
}
```

`app/[locale]/[...rest]/page.tsx`:
```tsx
import { notFound } from "next/navigation";

export default function CatchAll() {
  notFound();
}
```

- [ ] **Step 8: Build, lint, typecheck, test**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

Beklenen: build çıktısında `/[locale]` satırı `● (SSG)` ile `/en`, `/tr`; `proxy` satırı (`ƒ Proxy`). Hata yok.

- [ ] **Step 9: Elle doğrulama**

```bash
pnpm start &
sleep 3
curl -sI -H 'Accept-Language: tr-TR,tr;q=0.9' http://localhost:3000/ | grep -i '^location'
curl -sI http://localhost:3000/ | grep -i '^location'
curl -s http://localhost:3000/tr | grep -o '<html lang="tr"'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/fr
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/en/nope
curl -s http://localhost:3000/en | grep -o 'hreflang="[^"]*"' | sort -u
kill %1
```

Beklenen sırasıyla: `location: /tr`, `location: /en`, `<html lang="tr"`, `404`, `404`, üç hreflang (`en`, `tr`, `x-default`).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: next-intl routing with [locale] segment, proxy, hreflang metadata

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Velite içerik pipeline'ı ve ilk proje

**Files:**
- Create: `velite.config.ts`, `content/schema.ts`, `content/schema.test.ts`, `content/projects/geotrack.meta.json`, `content/projects/geotrack.en.mdx`, `content/projects/geotrack.tr.mdx`, `lib/content/merge.ts`, `lib/content/merge.test.ts`, `lib/content/index.ts`, `components/mdx/MDXContent.tsx`
- Modify: `package.json`, `tsconfig.json`, `app/[locale]/page.tsx`

**Interfaces:**
- Produces:
  - `FACETS = ['mobile','web','backend','ai','data-erp'] as const`, `type Facet`, `projectMetaSchema` (`content/schema.ts`)
  - `type ProjectMeta`, `type ProjectContent`, `type Project = ProjectMeta & Pick<ProjectContent,'title'|'summary'|'metrics'|'code'> & { locale: Locale; fallback: boolean }`
  - `mergeProjects(meta: ProjectMeta[], content: ProjectContent[], locale: Locale, warn?: (msg: string) => void): Project[]` (`lib/content/merge.ts`)
  - `getProjects(locale: Locale): Project[]`, `getProject(locale: Locale, slug: string): Project | undefined` (`lib/content/index.ts`)
  - `<MDXContent code={string} />` (`components/mdx/MDXContent.tsx`)
- Consumes: `Locale` (Task 4).

- [ ] **Step 1: Paketleri kur**

```bash
pnpm add -D velite npm-run-all2
```

- [ ] **Step 2: Şema için başarısız test**

`content/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { projectMetaSchema, FACETS } from "./schema";

const valid = {
  slug: "geotrack",
  facets: ["mobile", "backend"],
  stack: ["Flutter", "Riverpod"],
  year: 2026,
  role: "solo",
  featured: true,
  order: 1,
  cover: { type: "image", src: "/media/geotrack/cover.webp", frame: "phone" },
  links: { repo: ["https://github.com/emindundar/map_tracking"] },
};

describe("projectMetaSchema", () => {
  it("accepts a valid meta object", () => {
    expect(projectMetaSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects an unknown facet", () => {
    const r = projectMetaSchema.safeParse({ ...valid, facets: ["mobile", "blockchain"] });
    expect(r.success).toBe(false);
  });
  it("rejects more than three facets", () => {
    const r = projectMetaSchema.safeParse({ ...valid, facets: ["mobile", "web", "backend", "ai"] });
    expect(r.success).toBe(false);
  });
  it("rejects an empty facet list", () => {
    expect(projectMetaSchema.safeParse({ ...valid, facets: [] }).success).toBe(false);
  });
  it("rejects uppercase or spaced slugs", () => {
    expect(projectMetaSchema.safeParse({ ...valid, slug: "Geo Track" }).success).toBe(false);
  });
  it("defaults featured to false and links to empty object", () => {
    const { featured: _f, links: _l, ...rest } = valid;
    const r = projectMetaSchema.parse(rest);
    expect(r.featured).toBe(false);
    expect(r.links).toEqual({});
  });
  it("exposes exactly five facets", () => {
    expect(FACETS).toEqual(["mobile", "web", "backend", "ai", "data-erp"]);
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, `Cannot find module './schema'`.

- [ ] **Step 3: `content/schema.ts`**

```ts
import { s } from "velite";

export const FACETS = ["mobile", "web", "backend", "ai", "data-erp"] as const;
export type Facet = (typeof FACETS)[number];

export const projectMetaSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/, "slug: only a-z, 0-9 and dashes"),
  facets: s.array(s.enum(FACETS)).min(1, "at least one facet").max(3, "at most three facets"),
  stack: s.array(s.string().min(1)).min(1),
  year: s.number().int().min(2020).max(2100),
  role: s.enum(["solo", "lead", "contributor"]),
  featured: s.boolean().default(false),
  order: s.number().int(),
  cover: s.object({
    type: s.enum(["video", "image"]),
    src: s.string().min(1),
    poster: s.string().optional(),
    frame: s.enum(["phone", "browser", "none"]),
  }),
  links: s
    .object({
      repo: s.array(s.string().url()).optional(),
      demo: s.string().url().optional(),
      video: s.string().url().optional(),
      store: s.string().url().optional(),
    })
    .default({}),
});

export type ProjectMeta = ReturnType<typeof projectMetaSchema.parse>;
```

```bash
pnpm test
```
Beklenen: şema testleri geçer.

- [ ] **Step 4: `velite.config.ts`**

```ts
import { defineConfig, defineCollection, s } from "velite";
import { projectMetaSchema } from "./content/schema";

const projectMeta = defineCollection({
  name: "ProjectMeta",
  pattern: "projects/*.meta.json",
  schema: projectMetaSchema,
});

const projectContent = defineCollection({
  name: "ProjectContent",
  pattern: "projects/*.{en,tr}.mdx",
  schema: s
    .object({
      title: s.string().min(1).max(120),
      summary: s.string().min(10).max(240),
      metrics: s.array(s.object({ label: s.string(), value: s.string() })).optional(),
      code: s.mdx(),
      path: s.path(),
    })
    .transform(({ path, ...rest }) => {
      const base = path.split("/").pop() ?? "";
      const [slug, locale] = base.split(".");
      if (!slug || (locale !== "en" && locale !== "tr")) {
        throw new Error(`bad content filename: ${path} (expected <slug>.<en|tr>.mdx)`);
      }
      return { ...rest, slug, locale: locale as "en" | "tr" };
    }),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { projectMeta, projectContent },
});
```

- [ ] **Step 5: Script'ler ve path alias**

`package.json` script'lerini şununla değiştir:
```json
"dev": "run-p content:dev next:dev",
"next:dev": "next dev",
"content:dev": "velite --watch",
"build": "run-s content:build next:build",
"next:build": "next build",
"content:build": "velite --clean",
"start": "next start",
"lint": "eslint .",
"typecheck": "pnpm content:build && tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest"
```

`tsconfig.json` → `compilerOptions.paths` içine ekle:
```json
"#site/content": ["./.velite"]
```

- [ ] **Step 6: İlk proje içeriği**

`content/projects/geotrack.meta.json`:
```json
{
  "slug": "geotrack",
  "facets": ["mobile", "backend"],
  "stack": ["Flutter", "Riverpod", "OSRM", "Nominatim", "Node.js"],
  "year": 2026,
  "role": "solo",
  "featured": true,
  "order": 1,
  "cover": { "type": "image", "src": "/media/geotrack/cover.webp", "frame": "phone" },
  "links": {
    "repo": [
      "https://github.com/emindundar/map_tracking",
      "https://github.com/emindundar/map_tracking_backend"
    ]
  }
}
```

`content/projects/geotrack.en.mdx`:
```mdx
---
title: GeoTrack — Real-Time Field Operations & Routing
summary: Live tracking of vehicles and field staff on an OpenStreetMap stack, with no Google Maps dependency.
---

## Problem

Field teams needed live positions, routing and address lookup without paying per-request map fees.

## Role

Solo developer: mobile app, routing layer and backend.
```

`content/projects/geotrack.tr.mdx`:
```mdx
---
title: GeoTrack — Gerçek Zamanlı Saha Operasyonları ve Rota
summary: Araç ve saha personelinin OpenStreetMap altyapısında canlı takibi; Google Maps bağımlılığı yok.
---

## Problem

Saha ekipleri istek başına harita ücreti ödemeden canlı konum, rota ve adres çözümleme istiyordu.

## Rol

Tek geliştirici: mobil uygulama, rota katmanı ve backend.
```

- [ ] **Step 7: Velite build ve çıktı kontrolü**

```bash
pnpm content:build && ls .velite && grep -c '"slug": "geotrack"' .velite/project-meta.json
```

Beklenen: `.velite/` içinde `index.js`, `index.d.ts`, `project-meta.json`, `project-content.json`; grep çıktısı `1`.

- [ ] **Step 8: Birleştirme için başarısız test**

`lib/content/merge.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { mergeProjects, type ProjectContent } from "./merge";
import type { ProjectMeta } from "@/content/schema";

const meta = (slug: string, order: number): ProjectMeta => ({
  slug,
  facets: ["mobile"],
  stack: ["Flutter"],
  year: 2026,
  role: "solo",
  featured: false,
  order,
  cover: { type: "image", src: `/media/${slug}/cover.webp`, frame: "phone" },
  links: {},
});

const content = (slug: string, locale: "en" | "tr"): ProjectContent => ({
  slug,
  locale,
  title: `${slug} ${locale}`,
  summary: `summary of ${slug} in ${locale} language`,
  code: "",
});

describe("mergeProjects", () => {
  it("merges meta with the requested locale content", () => {
    const out = mergeProjects([meta("a", 1)], [content("a", "en"), content("a", "tr")], "tr");
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe("a tr");
    expect(out[0]?.locale).toBe("tr");
    expect(out[0]?.fallback).toBe(false);
  });
  it("falls back to en when the locale file is missing and warns", () => {
    const warn = vi.fn();
    const out = mergeProjects([meta("a", 1)], [content("a", "en")], "tr", warn);
    expect(out[0]?.title).toBe("a en");
    expect(out[0]?.fallback).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("a"));
  });
  it("throws when neither locale exists", () => {
    expect(() => mergeProjects([meta("a", 1)], [], "en")).toThrow(/a/);
  });
  it("sorts by order ascending", () => {
    const out = mergeProjects(
      [meta("b", 2), meta("a", 1)],
      [content("a", "en"), content("b", "en")],
      "en",
    );
    expect(out.map((p) => p.slug)).toEqual(["a", "b"]);
  });
  it("throws on duplicate slugs in meta", () => {
    expect(() => mergeProjects([meta("a", 1), meta("a", 2)], [content("a", "en")], "en")).toThrow(
      /duplicate/,
    );
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, `Cannot find module './merge'`.

- [ ] **Step 9: `lib/content/merge.ts`**

```ts
import type { Locale } from "@/i18n/routing";
import type { ProjectMeta } from "@/content/schema";

export type ProjectContent = {
  slug: string;
  locale: Locale;
  title: string;
  summary: string;
  metrics?: { label: string; value: string }[];
  code: string;
};

export type Project = ProjectMeta &
  Pick<ProjectContent, "title" | "summary" | "metrics" | "code"> & {
    locale: Locale;
    fallback: boolean;
  };

const FALLBACK_LOCALE: Locale = "en";

export function mergeProjects(
  meta: ProjectMeta[],
  content: ProjectContent[],
  locale: Locale,
  warn: (msg: string) => void = console.warn,
): Project[] {
  const seen = new Set<string>();
  const out: Project[] = [];

  for (const m of meta) {
    if (seen.has(m.slug)) throw new Error(`duplicate project slug: ${m.slug}`);
    seen.add(m.slug);

    const exact = content.find((c) => c.slug === m.slug && c.locale === locale);
    const fb = content.find((c) => c.slug === m.slug && c.locale === FALLBACK_LOCALE);
    const chosen = exact ?? fb;
    if (!chosen) throw new Error(`project "${m.slug}" has no content for ${locale} or ${FALLBACK_LOCALE}`);
    if (!exact) warn(`project "${m.slug}": no ${locale} content, falling back to ${FALLBACK_LOCALE}`);

    out.push({
      ...m,
      title: chosen.title,
      summary: chosen.summary,
      metrics: chosen.metrics,
      code: chosen.code,
      locale: chosen.locale,
      fallback: !exact,
    });
  }

  return out.sort((a, b) => a.order - b.order);
}
```

```bash
pnpm test
```
Beklenen: tüm testler geçer.

- [ ] **Step 10: `lib/content/index.ts` ve `MDXContent`**

`lib/content/index.ts`:
```ts
import { projectMeta, projectContent } from "#site/content";
import type { Locale } from "@/i18n/routing";
import { mergeProjects, type Project, type ProjectContent } from "./merge";

export type { Project };

export function getProjects(locale: Locale): Project[] {
  return mergeProjects(projectMeta, projectContent as ProjectContent[], locale);
}

export function getProject(locale: Locale, slug: string): Project | undefined {
  return getProjects(locale).find((p) => p.slug === slug);
}
```

`components/mdx/MDXContent.tsx`:
```tsx
import * as runtime from "react/jsx-runtime";

type MDXModule = { default: React.ComponentType<{ components?: Record<string, React.ComponentType> }> };

function useMDXComponent(code: string): MDXModule["default"] {
  const fn = new Function(code) as (rt: typeof runtime) => MDXModule;
  return fn({ ...runtime }).default;
}

export function MDXContent({ code, components = {} }: { code: string; components?: Record<string, React.ComponentType> }) {
  const Component = useMDXComponent(code);
  return <Component components={components} />;
}
```

- [ ] **Step 11: Ana sayfada proje listesi**

`app/[locale]/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { getProjects } from "@/lib/content";
import { hasLocale } from "next-intl";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const projects = hasLocale(routing.locales, locale) ? getProjects(locale as Locale) : [];

  return (
    <main className="p-6">
      <p className="font-mono text-muted uppercase tracking-wide">{t("eyebrow")}</p>
      <h1 className="font-display text-6xl">{t("headline")}</h1>

      <section className="mt-12 border-t border-line pt-6">
        <h2 className="font-mono text-muted">01 / {t("projectsHeading")}</h2>
        <ul className="mt-4">
          {projects.map((p) => (
            <li key={p.slug} className="border-b border-line py-3" data-testid="project">
              <span className="font-display text-2xl">{p.title}</span>
              <span className="ml-3 font-mono text-muted">
                {p.year} — {p.facets.join(" · ").toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 12: Build, lint, typecheck, test**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

Beklenen: sıfır hata. `pnpm start` sonrası `curl -s localhost:3000/tr | grep -o 'GeoTrack — Gerçek'` çıktı verir.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: Velite content pipeline with typed project schema and locale merge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Düzen kabuğu — nav, footer, dil ve tema toggle

**Files:**
- Create: `lib/theme.ts`, `lib/theme.test.ts`, `components/layout/ThemeScript.tsx`, `components/layout/ThemeToggle.tsx`, `components/layout/ThemeToggle.test.tsx`, `components/layout/LangToggle.tsx`, `components/layout/Nav.tsx`, `components/layout/Footer.tsx`
- Modify: `app/[locale]/layout.tsx`

**Interfaces:**
- Produces: `THEMES = ['dark','light'] as const`, `type Theme`, `parseTheme(v: unknown): Theme | null`, `THEME_COOKIE = 'theme'`, `readThemeCookie(cookieHeader: string): Theme | null`, `themeCookieString(t: Theme): string` (`lib/theme.ts`). `<Nav />`, `<Footer />` sunucu bileşenleri.
- Consumes: `Link`, `usePathname` (Task 4), `cn` (Task 3), mesajlar `Nav`, `Footer`.

- [ ] **Step 1: Tema yardımcıları için başarısız test**

`lib/theme.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseTheme, readThemeCookie, themeCookieString, THEME_COOKIE } from "./theme";

describe("parseTheme", () => {
  it("accepts dark and light", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
  });
  it("returns null for anything else", () => {
    expect(parseTheme("evil")).toBeNull();
    expect(parseTheme("")).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
    expect(parseTheme(42)).toBeNull();
  });
});

describe("readThemeCookie", () => {
  it("reads the theme cookie from a cookie header", () => {
    expect(readThemeCookie("a=1; theme=light; b=2")).toBe("light");
  });
  it("returns null when missing or invalid", () => {
    expect(readThemeCookie("a=1")).toBeNull();
    expect(readThemeCookie("theme=evil")).toBeNull();
  });
});

describe("themeCookieString", () => {
  it("builds a one-year, lax, root-path cookie", () => {
    expect(themeCookieString("light")).toBe(`${THEME_COOKIE}=light; Path=/; Max-Age=31536000; SameSite=Lax`);
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, `Cannot find module './theme'`.

- [ ] **Step 2: `lib/theme.ts`**

```ts
export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function parseTheme(v: unknown): Theme | null {
  return v === "dark" || v === "light" ? v : null;
}

export function readThemeCookie(cookieHeader: string): Theme | null {
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${THEME_COOKIE}=`));
  return match ? parseTheme(match.slice(THEME_COOKIE.length + 1)) : null;
}

export function themeCookieString(t: Theme): string {
  return `${THEME_COOKIE}=${t}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
```

```bash
pnpm test
```
Beklenen: geçer.

- [ ] **Step 3: Hydration öncesi tema scripti**

`components/layout/ThemeScript.tsx` (sunucu bileşeni; cookie'yi istemcide okur, sayfa statik kalır):
```tsx
const script = `
(function(){
  try {
    var m = document.cookie.split(';').map(function(s){return s.trim()}).find(function(s){return s.indexOf('theme=')===0});
    var v = m ? m.slice(6) : '';
    if (v === 'dark' || v === 'light') document.documentElement.setAttribute('data-theme', v);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
```

- [ ] **Step 4: ThemeToggle için başarısız test**

`components/layout/ThemeToggle.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeToggle } from "./ThemeToggle";
import en from "@/messages/en.json";

function renderToggle() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ThemeToggle />
    </NextIntlClientProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.cookie = "theme=; Max-Age=0; Path=/";
  });

  it("sets data-theme and cookie to light when current is dark", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: /theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.cookie).toContain("theme=light");
  });

  it("toggles back to dark", () => {
    document.documentElement.setAttribute("data-theme", "light");
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: /theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, `Cannot find module './ThemeToggle'`.

- [ ] **Step 5: `ThemeToggle.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { parseTheme, themeCookieString, type Theme } from "@/lib/theme";

function currentTheme(): Theme {
  const attr = parseTheme(document.documentElement.getAttribute("data-theme"));
  if (attr) return attr;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle() {
  const t = useTranslations("Nav");
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = (theme ?? currentTheme()) === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = themeCookieString(next);
    setTheme(next);
  }

  const label = theme === "light" ? t("themeDark") : t("themeLight");

  return (
    <button type="button" onClick={toggle} aria-label={t("theme")} className="font-mono text-muted hover:text-fg">
      [{label}]
    </button>
  );
}
```

jsdom'da `matchMedia` yoktur; `vitest.setup.ts` dosyasına ekle:
```ts
import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
```

```bash
pnpm test
```
Beklenen: geçer.

- [ ] **Step 6: LangToggle, Nav, Footer**

`components/layout/LangToggle.tsx`:
```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

export function LangToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav aria-label={t("lang")} className="flex gap-2 font-mono">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(l === locale ? "text-fg" : "text-muted hover:text-fg")}
        >
          [{l}]
        </Link>
      ))}
    </nav>
  );
}
```

`components/layout/Nav.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";

export async function Nav() {
  const t = await getTranslations("Nav");
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg px-6 py-3 font-mono text-sm">
      <Link href="/" className="font-display text-lg">
        emin dündar
      </Link>
      <nav className="flex gap-6">
        <Link href="/" className="text-muted hover:text-fg">{t("home")}</Link>
      </nav>
      <div className="flex gap-4">
        <LangToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

`components/layout/Footer.tsx`:
```tsx
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t border-line px-6 py-6 font-mono text-sm text-muted">
      © {new Date().getFullYear()} {t("rights")}
    </footer>
  );
}
```

- [ ] **Step 7: Layout'a bağla**

`app/[locale]/layout.tsx` içinde `body` bloğunu şununla değiştir ve import'ları ekle:
```tsx
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { ThemeScript } from "@/components/layout/ThemeScript";
```
```tsx
    <html lang={locale} className={fontClassNames} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-fg font-sans">
        <NextIntlClientProvider>
          <Nav />
          <div className="flex-1">{children}</div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
```

- [ ] **Step 8: Build, lint, typecheck, test**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

Beklenen: sıfır hata; `/en` ve `/tr` hâlâ statik (`●`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: layout shell with nav, footer, language and theme toggles

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Playwright e2e

**Files:**
- Create: `playwright.config.ts`, `e2e/i18n.spec.ts`, `e2e/theme.spec.ts`, `e2e/content.spec.ts`
- Modify: `package.json`, `tsconfig.json`

**Interfaces:**
- Produces: `pnpm e2e` script; `e2e/` klasörü (Vitest `exclude` listesinde, Task 3).
- Consumes: Task 4–6 çıktıları.

- [ ] **Step 1: Kurulum**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

`package.json` script'lerine ekle:
```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui"
```

`tsconfig.json` → `exclude` dizisine `"e2e"` ekleme **yapma** (tip kontrolü istiyoruz); `include` zaten `**/*.ts` kapsıyor.

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm start",
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Not: `pnpm build` önceden çalıştırılmış olmalı; CI'da sıra build → e2e.

- [ ] **Step 3: i18n testleri**

`e2e/i18n.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("locale routing", () => {
  test("root redirects to /tr for Turkish Accept-Language", async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: { "Accept-Language": "tr-TR,tr;q=0.9" } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/tr$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await ctx.close();
  });

  test("root redirects to /en for wildcard Accept-Language", async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: { "Accept-Language": "*" } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await ctx.close();
  });

  test("root redirects to /en when Accept-Language is absent", async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: { "Accept-Language": "" } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await ctx.close();
  });

  test("hreflang alternates are present", async ({ page }) => {
    await page.goto("/en");
    const links = page.locator('link[rel="alternate"][hreflang]');
    await expect(links).toHaveCount(3);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute("href", /\/en$/);
  });

  test("unknown locale shows localized 404", async ({ page }) => {
    const res = await page.goto("/fr");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/not found/i);
  });

  test("unknown path under a locale shows 404 in that locale", async ({ page }) => {
    const res = await page.goto("/tr/boyle-bir-sayfa-yok");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sayfa bulunamadı");
  });

  test("language toggle switches locale and keeps path", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "[tr]" }).click();
    await expect(page).toHaveURL(/\/tr$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ürünü uçtan uca");
  });
});
```

- [ ] **Step 4: Tema testleri**

`e2e/theme.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("theme", () => {
  test("toggle sets data-theme and persists across reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en");
    await page.getByRole("button", { name: "Theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("invalid theme cookie is ignored", async ({ context, page }) => {
    await context.addCookies([{ name: "theme", value: "evil", url: "http://localhost:3000" }]);
    await page.goto("/en");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  });

  test("no rounded corners on the nav links", async ({ page }) => {
    await page.goto("/en");
    const radius = await page.locator("header a").first().evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toBe("0px");
  });
});
```

- [ ] **Step 5: İçerik testi**

`e2e/content.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("home lists projects from the content pipeline in both locales", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByTestId("project")).toHaveCount(1);
  await expect(page.getByTestId("project").first()).toContainText("GeoTrack");
  await expect(page.getByTestId("project").first()).toContainText("MOBILE · BACKEND");

  await page.goto("/tr");
  await expect(page.getByTestId("project").first()).toContainText("Gerçek Zamanlı");
});
```

- [ ] **Step 6: Çalıştır**

```bash
pnpm build && pnpm e2e
```

Beklenen: tüm testler iki projede (desktop, mobile) geçer. Başarısız olan varsa önce testin varsayımını, sonra kodu düzelt; testi gevşetme.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: Playwright e2e for locale routing, theme and content

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Lighthouse CI ve GitHub Actions

**Files:**
- Create: `lighthouserc.json`, `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm lhci` script; CI iş akışı `lint → typecheck → test → build → e2e → lhci`.

- [ ] **Step 1: LHCI kurulumu**

```bash
pnpm add -D @lhci/cli
```

`package.json` script'ine ekle:
```json
"lhci": "lhci autorun"
```

`lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm start",
      "startServerReadyPattern": "Ready",
      "url": ["http://localhost:3000/en", "http://localhost:3000/tr"],
      "numberOfRuns": 2,
      "settings": { "preset": "mobile" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 1 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

- [ ] **Step 2: Yerelde çalıştır**

```bash
pnpm build && pnpm lhci
```

Beklenen: iki URL için assert'ler geçer. SEO 1.0 için `description` meta'nın her sayfada olması gerekir (Task 4 sağlıyor). Performans 0.9 altındaysa font `preload` ve görsel yokluğunu kontrol et; Faz 0'da ağır varlık yok, geçmeli.

- [ ] **Step 3: GitHub Actions**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
        env:
          CI: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
      - run: pnpm lhci
```

- [ ] **Step 4: Commit ve remote**

```bash
git add -A
git commit -m "ci: GitHub Actions with lint, tests, e2e and Lighthouse budget

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git remote add origin git@github.com:emindundar/portfolio.git
git push -u origin main
```

Beklenen: GitHub'da Actions sekmesinde `CI` yeşil. Kırmızıysa log'u oku, düzelt, tekrar push.

---

### Task 9: ESLint sınır kuralı, CLAUDE.md, README, .env.example

**Files:**
- Modify: `eslint.config.mjs`
- Create: `CLAUDE.md`, `README.md`, `.env.example`

**Interfaces:**
- Produces: `gsap`/`lenis`/`ogl`/`motion` import'larının yalnızca `components/motion/**`, `components/canvas/**`, `components/terminal/**`, `lib/motion.ts` içinde serbest olması.

- [ ] **Step 1: ESLint kuralı**

`eslint.config.mjs` içindeki dışa aktarılan dizinin sonuna iki blok ekle (mevcut `nextVitals`/`nextTs` yapılandırmalarının altına):
```js
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "gsap", message: "Only inside components/motion, components/canvas, components/terminal or lib/motion.ts" },
            { name: "@gsap/react", message: "Only inside components/motion, components/canvas, components/terminal or lib/motion.ts" },
            { name: "lenis", message: "Only inside components/motion or lib/motion.ts" },
            { name: "lenis/react", message: "Only inside components/motion or lib/motion.ts" },
            { name: "ogl", message: "Only inside components/canvas" },
            { name: "motion", message: "Only inside components/motion" },
            { name: "motion/react", message: "Only inside components/motion" },
          ],
          patterns: [{ group: ["gsap/*"], message: "Only inside components/motion, components/canvas or lib/motion.ts" }],
        },
      ],
    },
  },
  {
    files: ["components/motion/**", "components/canvas/**", "components/terminal/**", "lib/motion.ts"],
    rules: { "no-restricted-imports": "off" },
  },
```

Doğrulama: geçici dosya `app/[locale]/x.ts` içine `import "gsap";` yaz, `pnpm lint` hata vermeli; dosyayı sil.

- [ ] **Step 2: `.env.example`**

```
# Faz 1'de kullanılacak; Faz 0'da boş kalabilir
RESEND_API_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NEXT_PUBLIC_UMAMI_ID=
```

- [ ] **Step 3: `CLAUDE.md`**

```markdown
# emindundar.dev — portfolio

Spec: docs/superpowers/specs/2026-10-07-portfolio-design.md
Plans: docs/superpowers/plans/

## Stack
Next.js 16 App Router (Turbopack, cacheComponents), React 19, TS strict, pnpm, Tailwind v4 (@theme in app/globals.css),
next-intl (`app/[locale]`, proxy.ts), Velite (content/ → .velite, import from `#site/content`), Vitest, Playwright, LHCI.

## Commands
pnpm dev · pnpm build · pnpm lint · pnpm typecheck · pnpm test · pnpm e2e (needs `pnpm build` first) · pnpm lhci

## Rules
- Locales: en (default), tr. Every user-facing string goes through messages/{en,tr}.json. No hardcoded UI text.
- Pages and layouts are server components. Only `components/motion`, `components/canvas`, `components/terminal`,
  toggles and forms are `"use client"`. ESLint blocks gsap/lenis/ogl/motion imports elsewhere.
- Tokens only: bg, surface, line, fg, muted, accent (see app/globals.css). No arbitrary colors. No border-radius. No shadows.
- Fonts: font-display (Cabinet Grotesk), font-sans (Satoshi), font-mono (JetBrains Mono) via lib/fonts.ts.
- Content: add a project = `content/projects/<slug>.meta.json` + `<slug>.en.mdx` + `<slug>.tr.mdx`. Schema in content/schema.ts.
  Missing tr falls back to en with a build warning. Invalid facet or >3 facets fails the build.
- Theme: `data-theme` on <html>, cookie `theme`, set before hydration by components/layout/ThemeScript.tsx. Never read cookies() in layouts (keeps pages static).
- Performance budget: first-load JS ≤ 180 KB gz, LCP < 2.0 s, CLS < 0.05. Lazy-load anything animation/WebGL.
- Reduced motion: every animation goes through gsap.matchMedia() (Faz 1) — static fallback required.
- Tests: unit for lib/* and content schema; e2e for routing/theme/content. Add a test with every behavior change.

## Lenis + GSAP bridge (Faz 1, lib/motion.ts)
lenis autoRaf:false; gsap.ticker.add(t => lenis.raf(t*1000)); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.lagSmoothing(0)
```

- [ ] **Step 4: `README.md`**

```markdown
# emindundar.dev

Personal portfolio of Emin Dündar. Next.js 16, TypeScript, Tailwind v4, next-intl (EN/TR), Velite MDX content.

## Develop
pnpm install
pnpm dev

## Verify
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm e2e && pnpm lhci

## Add a project
Create `content/projects/<slug>.meta.json`, `<slug>.en.mdx`, `<slug>.tr.mdx`. See `content/schema.ts`.

Design spec and plans live in `docs/superpowers/`.
```

- [ ] **Step 5: Lint, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "chore: ESLint import boundaries, CLAUDE.md, README, env example

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 10: Vercel deploy (insan adımı + doğrulama)

**Files:** yok (Vercel panosu)

- [ ] **Step 1 (kullanıcı): Vercel'de projeyi bağla**

vercel.com → Add New → Project → `emindundar/portfolio` import. Framework: Next.js (otomatik). Build command: `pnpm build` (otomatik algılar). Root: `/`. Environment variables: şimdilik yok. Deploy.

- [ ] **Step 2 (kullanıcı): Üretim URL'ini paylaş**

Örn. `https://portfolio-xyz.vercel.app`. Domain bağlama Faz 1.5'te.

- [ ] **Step 3: Canlı doğrulama**

```bash
URL=https://<vercel-url>
curl -sI -H 'Accept-Language: tr' $URL/ | grep -i '^location'
curl -s -o /dev/null -w '%{http_code}\n' $URL/fr
curl -s $URL/en | grep -o 'hreflang="[^"]*"' | sort -u
```

Beklenen: `location: /tr`, `404`, üç hreflang.

- [ ] **Step 4 (kullanıcı): PR preview'u doğrula**

Herhangi bir branch'ten PR aç; Vercel bot preview linki yorumlar; CI yeşil. Faz 0 tamam.

---

## Self-review notları

- **Spec kapsamı (Faz 0):** 4.1 yığın ✔ (gsap/lenis/motion/ogl Faz 1'de kurulur, kural Task 9'da hazır), 4.2 klasörler ✔ (motion/canvas/terminal boş, Faz 1), 4.3 sınır ✔ Task 9, 4.4 içerik ✔ Task 5 (GitHub/form/AI Faz 1+), 4.5 i18n ✔ Task 4, 4.6 SEO kısmi (hreflang + description ✔; JSON-LD, OG, sitemap Faz 1.5), 4.7 perf bütçesi LHCI ✔ Task 8, 4.9 hata ✔ 404 locale'li, 4.10 test ✔ Task 3/7/8, 4.11 CI/CD ✔ Task 8/10, 3.1–3.2 token/font ✔ Task 2, 2.5 içerik modeli ✔ Task 5, 5.1 tooling → insan ön adımları.
- **Tip tutarlılığı:** `Locale` Task 4'te tanımlı, Task 5/6'da aynı import. `ProjectMeta` `content/schema.ts`'ten, `ProjectContent`/`Project` `lib/content/merge.ts`'ten. `cn` Task 3, Task 6'da kullanılıyor. `fontClassNames` Task 2 → Task 4.
- **Review Focus eşlemesi:** 1→Task 7 `unknown locale`, 2→Task 7 üç Accept-Language testi, 3→Task 5 `falls back to en`, 4→Task 5 şema testleri, 5→Task 6 birim + Task 7 `invalid theme cookie`.
- **Bilinen risk:** next-intl `next/root-params` kullanımı Next 16.3+ ister; kurulu 16.4. Velite `s.path()` çıktısı `projects/geotrack.en` biçiminde; transform buna göre. Build'de farklı çıkarsa transform'daki `split("/")` ve `split(".")` mantığını `.velite/project-content.json` çıktısına bakarak düzelt.
