# Faz 1a — Hareket Temeli ve Ana Sayfa (Hero) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ana sayfaya "mühendis brutalizmi" kimliğini veren hareket altyapısı (Lenis + GSAP köprüsü, SplitText hero, OGL shader arka plan, özel imleç, magnetic CTA, scroll ile bölüm girişleri) ve içerikten beslenen ana sayfa düzeni (hero, yetenek yüzeyleri ızgarası, öne çıkan projeler, hakkımda özeti, iletişim CTA). Reduced-motion'da her şey statik ve okunur.

**Architecture:** Tüm hareket `components/motion`, `components/canvas` ve `lib/motion.ts` içinde (`"use client"`); sayfalar sunucu bileşeni kalır ve bu bileşenleri sarmalayıcı olarak kullanır. Tek rAF: Lenis `autoRaf:false`, `gsap.ticker` sürer, `ScrollTrigger.update` Lenis scroll olayına bağlı. Reduced-motion tek kaynaktan (`gsap.matchMedia` + `useReducedMotion`). Shader `next/dynamic` ile hydration sonrası, IntersectionObserver ile görünürken çalışır, WebGL yoksa veya reduced-motion'da poster. İçerik Faz 0 pipeline'ından (`getProjects`) gelir; ana sayfa `featured` projeleri ve facet sayımlarını gösterir.

**Tech Stack:** Faz 0 yığını + gsap 3.15 (`gsap/SplitText`, `gsap/ScrollTrigger`), @gsap/react 2.1, lenis 1.3 (`lenis/react`), ogl 1.0. `motion` paketi bu fazda kurulmaz (YAGNI; form/menü geçişleri Faz 1c'de).

**Spec:** `docs/superpowers/specs/2026-10-07-portfolio-design.md` §2.1 (ana sayfa), §3.3–3.4 (ızgara, hareket), §4.3 (sınır), §4.7 (performans), §4.8 (a11y). Tasarım notları: `design-system/emindundar-dev/MASTER.md` (sadece pattern/motion/checklist; token'lar spec'ten).

## Global Constraints

- Faz 0 kuralları aynen geçerli: `CLAUDE.md` (token'lar, sınır, i18n, `cacheComponents`, test, portlar 3100/3101).
- `gsap`, `@gsap/react`, `lenis`, `ogl` import'ları yalnızca `components/motion/**`, `components/canvas/**`, `lib/motion.ts` içinde (ESLint zorlar).
- Reduced-motion: `(prefers-reduced-motion: reduce)` → Lenis yok (native scroll), SplitText yok (düz fade yok, metin anında görünür), shader yok (poster), ScrollTrigger yok, imleç yok, magnetic yok. Son durum her zaman okunur (MASTER.md "final readable state").
- Animasyon sadece `transform` ve `opacity`. `will-change` sadece animasyon anında (`gsap.set` ile), kalıcı değil.
- SplitText yalnızca hero başlığında (≤ 8 kelime), `aria: "auto"`, unmount'ta `revert()`. Liste stagger ≤ 0.03 s/öğe. Magnetic en fazla 2 öğe/ekran (hero CTA + nav marka). Hover-only bilgi yok.
- Shader: DPR ≤ 1.5, görünür değilken rAF durur, `alpha: true`, canvas `aria-hidden`, LCP öğesi olamaz (hero metni önce render).
- Performans kapıları (ruling, spec §4.7'nin Lighthouse'a uyarlanması): LHCI `resource-summary:script:size` **error ≤ 262144** (256 KB; Lighthouse lazy yüklenen chunk'ları da sayar), `largest-contentful-paint` warn ≤ 2000 ms, kategori eşikleri aynen (perf ≥ 0.9, a11y ≥ 0.95, seo 1.0). Animasyon kütüphaneleri ve shader `next/dynamic` ile hydration sonrası yüklenir; hero metni sunucu HTML'inde.
- Tüm UI metinleri `messages/{en,tr}.json`. Yeni namespace'ler: `Hero`, `Capabilities`, `Home` (genişler), `Cta`.
- Her görev: `pnpm lint && pnpm typecheck && pnpm test` ve ilgili e2e; commit mesajı sonunda `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **Reduced-motion kullanıcısı**: `prefers-reduced-motion: reduce` ile ana sayfa açıldığında `html` üzerinde `lenis` sınıfı yok, canvas yok, hero başlığı tek parça ve görünür (opacity 1), hiçbir öğe `opacity:0`'da kalmıyor. → Task 1, 2, 3 e2e.
2. **WebGL olmayan tarayıcı** (Playwright `--disable-gpu`/`--use-gl=disabled` ile simüle, `webgl2` ve `webgl` context null): shader yerine poster, konsolda hata yok. → Task 3 e2e.
3. **Dokunmatik cihaz** (`pointer: coarse`, Pixel 7 projesi): özel imleç DOM'da yok, magnetic etkisi yok, CTA normal tıklanır. → Task 4 e2e.
4. **Sekme arka plana alındığında / hero viewport dışına çıktığında**: shader rAF durur (`isAnimating` false), tekrar görününce başlar. → Task 3 birim (IntersectionObserver stub) + e2e scroll.
5. **Klavye kullanıcısı**: hero CTA ve nav `Tab` ile ulaşılır, odak halkası görünür, SplitText sonrası ekran okuyucu tam cümleyi okur (`aria-label` parent'ta). → Task 2 birim, Task 5 e2e.

---

### Task 1: Hareket temeli — `lib/motion.ts`, `useReducedMotion`, `SmoothScroll`

**Files:**
- Create: `lib/motion.ts`, `components/motion/useReducedMotion.ts`, `components/motion/useReducedMotion.test.tsx`, `components/motion/SmoothScroll.tsx`, `components/motion/MotionProvider.tsx`
- Modify: `app/[locale]/layout.tsx`, `package.json`
- Test: `components/motion/useReducedMotion.test.tsx`, `e2e/motion.spec.ts` (yeni)

**Interfaces:**
- Produces: `lib/motion.ts` → `gsap` (plugin'ler kayıtlı: `useGSAP`, `ScrollTrigger`, `SplitText`), `REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"`, `createMatchMedia(): gsap.MatchMedia`. `useReducedMotion(): boolean` (SSR'da `true` döner → sunucu HTML'i statik varsayar). `<MotionProvider>` (client; `SmoothScroll`'u reduced-motion değilse render eder). `<SmoothScroll>` (ReactLenis root, autoRaf false, gsap.ticker köprüsü, `ScrollTrigger.update` bağlı).
- Consumes: Task 0 layout yapısı (`app/[locale]/layout.tsx` body: Nav, `<div class="flex-1">`, Footer).

- [ ] **Step 1: Paketleri kur**

```bash
pnpm add gsap @gsap/react lenis ogl
```

Beklenen: `gsap ^3.15`, `@gsap/react ^2.1`, `lenis ^1.3`, `ogl ^1.0`. ESLint kuralı bu paketleri sadece izinli klasörlerde kabul eder.

- [ ] **Step 2: `useReducedMotion` için başarısız test**

`components/motion/useReducedMotion.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReducedMotion } from "./useReducedMotion";

type Listener = (e: { matches: boolean }) => void;

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initial,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
  window.matchMedia = () => mql;
  return {
    set(v: boolean) {
      (mql as { matches: boolean }).matches = v;
      listeners.forEach((l) => l({ matches: v }));
    },
  };
}

describe("useReducedMotion", () => {
  beforeEach(() => {
    // vitest.setup.ts stub'ı her testte yeniden yazılır
  });

  it("returns true when the media query matches", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("returns false when it does not match", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("updates when the preference changes", () => {
    const ctl = stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => ctl.set(true));
    expect(result.current).toBe(true);
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, `Cannot find module './useReducedMotion'`.

- [ ] **Step 3: `useReducedMotion.ts`**

```ts
"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Sunucuda ve hydration'da "reduce" varsay: ilk HTML statik, hareket sadece istemci onayladığında.
function getServerSnapshot() {
  return true;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

```bash
pnpm test
```
Beklenen: 3 passed (toplam 32).

- [ ] **Step 4: `lib/motion.ts`**

```ts
"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** gsap.matchMedia with the project's single reduced-motion condition. */
export function createMatchMedia() {
  return gsap.matchMedia();
}

export const EASE = { out: "expo.out", inOut: "expo.inOut", soft: "power2.out" } as const;
export const DUR = { fast: 0.25, base: 0.6, slow: 1.0 } as const;

export { gsap, useGSAP, ScrollTrigger, SplitText };
```

Not: `gsap/SplitText` import yolu 3.13+ ile ücretsiz pakette mevcut; `node_modules/gsap/SplitText.js` varlığını doğrula.

- [ ] **Step 5: `SmoothScroll.tsx` ve `MotionProvider.tsx`**

`components/motion/SmoothScroll.tsx`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/motion";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }
    const lenis = lenisRef.current?.lenis;
    lenis?.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      lenis?.off("scroll", ScrollTrigger.update);
    };
  }, []);

  return (
    <ReactLenis root ref={lenisRef} options={{ autoRaf: false, lerp: 0.1, wheelMultiplier: 1 }}>
      {children}
    </ReactLenis>
  );
}
```

`lenis/react` tipleri `LenisRef` adını dışa aktarmıyorsa `node_modules/lenis/dist/lenis-react.d.ts` içindeki ref tipini kullan ve raporda belirt.

`components/motion/MotionProvider.tsx`:
```tsx
"use client";

import { useReducedMotion } from "./useReducedMotion";
import { SmoothScroll } from "./SmoothScroll";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return <SmoothScroll>{children}</SmoothScroll>;
}
```

- [ ] **Step 6: Layout'a bağla**

`app/[locale]/layout.tsx` body içinde `NextIntlClientProvider` çocuğunu `MotionProvider` ile sar:
```tsx
import { MotionProvider } from "@/components/motion/MotionProvider";
```
```tsx
        <NextIntlClientProvider>
          <MotionProvider>
            <Nav />
            <div className="flex-1">{children}</div>
            <Footer />
          </MotionProvider>
        </NextIntlClientProvider>
```

- [ ] **Step 7: e2e**

`e2e/motion.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("motion foundation", () => {
  test("lenis is active on html when motion is allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await expect(page.locator("html")).toHaveClass(/lenis/);
  });

  test("lenis is absent under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
  });

  test("wheel scroll moves the page (no scroll-jacking lockup)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 800);
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBeGreaterThan(100);
  });
});
```

Not: ana sayfa şu an kısa olabilir; 3. test için sayfa yüksekliği viewport'tan büyük olmalı. Task 5'ten önce bu test `test.skip` ile işaretlenir ve Task 5'te açılır; raporda belirt.

```bash
pnpm build && pnpm e2e
```
Beklenen: yeni testler geçer (3. test skip), eski 24 test yeşil.

- [ ] **Step 8: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat(motion): Lenis + GSAP ticker bridge, reduced-motion hook, MotionProvider

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `SplitReveal` — hero başlığı için maskeli satır girişi

**Files:**
- Create: `components/motion/SplitReveal.tsx`, `components/motion/SplitReveal.test.tsx`
- Test: `components/motion/SplitReveal.test.tsx`

**Interfaces:**
- Produces: `<SplitReveal as="h1" className=... delay={0.1}>{text}</SplitReveal>` — çocuk düz string; reduced-motion'da sade `<h1>` render eder; aksi halde SplitText `lines` + `mask:"lines"`, `autoSplit`, `aria:"auto"`, satırlar `y:110% → 0`, stagger 0.08, `expo.out`, 0.9 s.
- Consumes: `lib/motion.ts` (`gsap`, `useGSAP`, `SplitText`, `EASE`), `useReducedMotion`.

- [ ] **Step 1: Başarısız test**

`components/motion/SplitReveal.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./useReducedMotion", () => ({ useReducedMotion: () => true }));

import { SplitReveal } from "./SplitReveal";

describe("SplitReveal (reduced motion)", () => {
  it("renders the heading text as a single accessible node", () => {
    render(<SplitReveal as="h1">I build products end to end.</SplitReveal>);
    const h = screen.getByRole("heading", { level: 1 });
    expect(h).toHaveTextContent("I build products end to end.");
    expect(h.querySelectorAll("div").length).toBe(0);
  });

  it("passes className through", () => {
    render(<SplitReveal as="h2" className="font-display">x</SplitReveal>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("font-display");
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, modül yok.

- [ ] **Step 2: `SplitReveal.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, EASE } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";

type Tag = "h1" | "h2" | "h3" | "p";

type Props = {
  as?: Tag;
  className?: string;
  delay?: number;
  children: string;
};

export function SplitReveal({ as: Tag = "h1", className, delay = 0, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !ref.current) return;
      const split = SplitText.create(ref.current, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        aria: "auto",
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            stagger: 0.08,
            delay,
            ease: EASE.out,
          });
        },
      });
      return () => split.revert();
    },
    { dependencies: [reduced, children], revertOnUpdate: true },
  );

  // ref tipi: Tag dinamik olduğu için HTMLElement; JSX'te cast gerekir.
  const Comp = Tag as unknown as React.ElementType;
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}
```

```bash
pnpm test
```
Beklenen: geçer.

- [ ] **Step 3: Hareketli yol için manuel doğrulama**

Geçici olarak `app/[locale]/page.tsx` başlığını `<SplitReveal as="h1" className="font-display text-6xl">{t("headline")}</SplitReveal>` ile değiştir (Task 5'te kalıcı olacak). `pnpm dev` ile `/en` aç: satırlar alttan maskeli girer; DevTools'ta `h1` üzerinde `aria-label` tam cümle, satır `div`'leri `aria-hidden`. Reduced-motion'ı DevTools Rendering panelinden aç: düz `h1`. Raporda gözlemi yaz. Geçici değişikliği commit'e dahil et (Task 5 üzerine inşa eder).

- [ ] **Step 4: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat(motion): SplitReveal masked line reveal with reduced-motion fallback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: `HeroShader` — OGL arka plan, IO ile duraklatma, poster fallback

**Files:**
- Create: `components/canvas/HeroShader.tsx`, `components/canvas/HeroShaderLoader.tsx`, `components/canvas/shader.ts`, `components/canvas/visibility.ts`, `components/canvas/visibility.test.ts`, `public/media/hero-poster.svg`
- Test: `components/canvas/visibility.test.ts`, `e2e/hero.spec.ts` (yeni)

**Interfaces:**
- Produces: `<HeroShaderLoader />` (client; `next/dynamic(..., { ssr: false })` ile `HeroShader`'ı yükler; reduced-motion veya WebGL yoksa `<Poster />`). `createVisibilityController(el, onChange)` (`visibility.ts`, saf; IntersectionObserver + `document.visibilityState` birleşimi, `dispose()`). `supportsWebGL(): boolean`.
- Consumes: `useReducedMotion`, token renkleri CSS değişkenlerinden (`getComputedStyle(document.documentElement).getPropertyValue("--accent")`).

- [ ] **Step 1: Görünürlük denetleyicisi için başarısız test**

`components/canvas/visibility.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVisibilityController } from "./visibility";

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;

describe("createVisibilityController", () => {
  let ioCallback: IOCallback | null = null;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(() => {
    ioCallback = null;
    observe.mockClear();
    disconnect.mockClear();
    (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(cb: IOCallback) {
        ioCallback = cb;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve() {}
    };
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("reports visible only when intersecting and tab is visible", () => {
    const onChange = vi.fn();
    const el = document.createElement("div");
    createVisibilityController(el, onChange);
    expect(observe).toHaveBeenCalledWith(el);
    ioCallback?.([{ isIntersecting: true }]);
    expect(onChange).toHaveBeenLastCalledWith(true);
    ioCallback?.([{ isIntersecting: false }]);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("goes hidden when the document is hidden even if intersecting", () => {
    const onChange = vi.fn();
    const el = document.createElement("div");
    createVisibilityController(el, onChange);
    ioCallback?.([{ isIntersecting: true }]);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("dispose disconnects the observer and listener", () => {
    const onChange = vi.fn();
    const ctl = createVisibilityController(document.createElement("div"), onChange);
    ctl.dispose();
    expect(disconnect).toHaveBeenCalled();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL, modül yok.

- [ ] **Step 2: `visibility.ts`**

```ts
export type VisibilityController = { dispose(): void };

export function createVisibilityController(
  el: Element,
  onChange: (visible: boolean) => void,
): VisibilityController {
  let intersecting = false;
  const emit = () => onChange(intersecting && document.visibilityState === "visible");

  const io = new IntersectionObserver((entries) => {
    intersecting = entries.some((e) => e.isIntersecting);
    emit();
  });
  io.observe(el);

  const onVis = () => emit();
  document.addEventListener("visibilitychange", onVis);

  return {
    dispose() {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
```

```bash
pnpm test
```
Beklenen: geçer.

- [ ] **Step 3: Shader kaynakları**

`components/canvas/shader.ts`:
```ts
export const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Yavaş noise + hafif grid distortion. Renkler uniform: zemin ve vurgu.
export const fragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uMouse;      // 0..1
uniform vec2 uRes;
uniform vec3 uBg;
uniform vec3 uAccent;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // fareye hafif tepki
  vec2 m = (uMouse - 0.5) * 0.15;
  float n = noise(p * 2.0 + uTime * 0.05 + m);
  float n2 = noise(p * 6.0 - uTime * 0.03);

  // grid distortion: ince çizgiler, noise ile kayar
  vec2 g = fract((p + n * 0.08) * 12.0);
  float line = smoothstep(0.0, 0.02, g.x) * smoothstep(0.0, 0.02, g.y);
  float grid = 1.0 - line;

  vec3 col = uBg;
  col += uAccent * (0.06 * n + 0.04 * n2);
  col += uAccent * grid * 0.10;

  // vignette
  float d = distance(uv, vec2(0.5));
  col *= 1.0 - smoothstep(0.4, 0.9, d) * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;
```

- [ ] **Step 4: `HeroShader.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Vec2, Vec3 } from "ogl";
import { vertex, fragment } from "./shader";
import { createVisibilityController } from "./visibility";

function cssColor(name: string): Vec3 {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = raw.replace("#", "");
  const n = parseInt(hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex, 16);
  return new Vec3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export default function HeroShader() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5), alpha: true, antialias: false });
    const gl = renderer.gl;
    gl.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(gl.canvas);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new Vec2(0.5, 0.5) },
        uRes: { value: new Vec2(1, 1) },
        uBg: { value: cssColor("--bg") },
        uAccent: { value: cssColor("--accent") },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      program.uniforms.uRes.value.set(host.clientWidth, host.clientHeight);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const target = new Vec2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // tema değişince renkleri güncelle
    const mo = new MutationObserver(() => {
      program.uniforms.uBg.value = cssColor("--bg");
      program.uniforms.uAccent.value = cssColor("--accent");
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let raf = 0;
    let running = false;
    const loop = (t: number) => {
      if (!running) return;
      program.uniforms.uTime.value = t * 0.001;
      const m = program.uniforms.uMouse.value as Vec2;
      m.x += (target.x - m.x) * 0.05;
      m.y += (target.y - m.y) * 0.05;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    const vis = createVisibilityController(host, (visible) => {
      if (visible && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    host.dataset.shader = "ready";

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      vis.dispose();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 -z-10" data-shader="loading" />;
}
```

OGL tiplerinde `Vec2.set`, `Vec3` kurucu imzaları `node_modules/ogl/types` altında doğrulanır; farklıysa minimal uyarlama yap ve raporla.

- [ ] **Step 5: Poster ve loader**

`public/media/hero-poster.svg` (statik, tema bağımsız koyu; açık temada CSS `opacity` ile yumuşatılır):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <pattern id="g" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M120 0H0V120" fill="none" stroke="#FF4D00" stroke-opacity="0.12" stroke-width="1"/>
    </pattern>
    <radialGradient id="v" cx="50%" cy="50%" r="70%">
      <stop offset="0" stop-color="#0B0B0C" stop-opacity="0"/>
      <stop offset="1" stop-color="#0B0B0C" stop-opacity="0.7"/>
    </radialGradient>
  </defs>
  <rect width="1440" height="900" fill="#0B0B0C"/>
  <rect width="1440" height="900" fill="url(#g)"/>
  <rect width="1440" height="900" fill="url(#v)"/>
</svg>
```

`components/canvas/HeroShaderLoader.tsx`:
```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { supportsWebGL } from "./visibility";

const HeroShader = dynamic(() => import("./HeroShader"), { ssr: false });

function Poster() {
  return (
    <div
      aria-hidden="true"
      data-hero-poster
      className="absolute inset-0 -z-10 bg-[url('/media/hero-poster.svg')] bg-cover bg-center opacity-80"
    />
  );
}

export function HeroShaderLoader() {
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    setWebgl(supportsWebGL());
  }, []);

  if (reduced || webgl === false || webgl === null) return <Poster />;
  return <HeroShader />;
}
```

Not: Arbitrary `url()` background value Tailwind v4'te geçerli. `webgl === null` (hydration öncesi) → poster, canvas gelince poster kaybolur; CLS yok (ikisi de `absolute inset-0`).

- [ ] **Step 6: e2e**

`e2e/hero.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("hero shader", () => {
  test("renders a canvas when motion and WebGL are available", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await expect(page.locator("[data-shader='ready'] canvas")).toHaveCount(1);
    await expect(page.locator("[data-hero-poster]")).toHaveCount(0);
  });

  test("renders the poster under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await expect(page.locator("[data-hero-poster]")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("renders the poster when WebGL is unavailable", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2") return null;
        return (orig as (this: HTMLCanvasElement, t: string, ...r: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/en");
    await expect(page.locator("[data-hero-poster]")).toHaveCount(1);
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
```

Playwright headless Chromium'da WebGL (SwiftShader) genelde mevcuttur; ilk test başarısızsa `playwright.config.ts` `use.launchOptions.args` içine `["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]` ekle ve raporla.

- [ ] **Step 7: Hero'ya geçici yerleştirme ve doğrulama**

`app/[locale]/page.tsx` içinde başlığı saran `<section className="relative min-h-[80vh]">` içine `<HeroShaderLoader />` ekle (Task 5'te düzen kalıcılaşır). `pnpm build && pnpm e2e` → hero testleri geçer. Sekmeyi arka plana alıp (`page.evaluate` ile `document.visibilityState` taklidi zor) manuel: DevTools Performance ile görünürken rAF var, `hero` scroll ile dışarı çıkınca rAF yok; raporda belirt.

- [ ] **Step 8: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat(canvas): OGL hero shader with visibility pause, WebGL and reduced-motion poster fallback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `Cursor` ve `Magnetic`

**Files:**
- Create: `components/motion/Cursor.tsx`, `components/motion/Magnetic.tsx`, `components/motion/pointer.ts`, `components/motion/pointer.test.ts`
- Modify: `components/motion/MotionProvider.tsx`, `app/globals.css`
- Test: `components/motion/pointer.test.ts`, `e2e/cursor.spec.ts` (yeni)

**Interfaces:**
- Produces: `hasFinePointer(): boolean` (`pointer.ts`, `(pointer: fine)` sorgusu); `<Cursor />` (client; fine pointer ve reduced-motion değilse body'ye `data-cursor="custom"` koyar, nokta + halka, `[data-magnetic]`/`a`/`button` hover'da halka büyür); `<Magnetic strength={0.3}>` (tek çocuk element, `gsap.quickTo` ile x/y, clamp, `pointerleave`'de geri döner; coarse pointer veya reduced-motion'da sadece çocuğu render eder).
- Consumes: `lib/motion.ts`, `useReducedMotion`.

- [ ] **Step 1: Başarısız test**

`components/motion/pointer.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hasFinePointer, clampMagnet } from "./pointer";

describe("hasFinePointer", () => {
  it("reads the (pointer: fine) media query", () => {
    window.matchMedia = ((q: string) => ({ matches: q === "(pointer: fine)" })) as unknown as typeof window.matchMedia;
    expect(hasFinePointer()).toBe(true);
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    expect(hasFinePointer()).toBe(false);
  });
});

describe("clampMagnet", () => {
  it("scales the offset by strength and clamps to max", () => {
    expect(clampMagnet(100, 0.3, 20)).toBe(20);
    expect(clampMagnet(-100, 0.3, 20)).toBe(-20);
    expect(clampMagnet(40, 0.3, 20)).toBe(12);
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL.

- [ ] **Step 2: `pointer.ts`**

```ts
export function hasFinePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
}

/** Offset * strength, clamped to ±max so the element never leaves its hit box. */
export function clampMagnet(offset: number, strength: number, max: number): number {
  const v = offset * strength;
  return Math.max(-max, Math.min(max, v));
}
```

```bash
pnpm test
```
Beklenen: geçer.

- [ ] **Step 3: `Magnetic.tsx`**

```tsx
"use client";

import { useRef, cloneElement, isValidElement, type ReactElement } from "react";
import { gsap, useGSAP, EASE } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";
import { hasFinePointer, clampMagnet } from "./pointer";

type Props = { strength?: number; max?: number; children: ReactElement<{ ref?: React.Ref<HTMLElement> }> };

export function Magnetic({ strength = 0.3, max = 24, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced || !hasFinePointer()) return;
      const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: EASE.soft });
      const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: EASE.soft });
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo(clampMagnet(e.clientX - r.left - r.width / 2, strength, max));
        yTo(clampMagnet(e.clientY - r.top - r.height / 2, strength, max));
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { dependencies: [reduced, strength, max] },
  );

  if (!isValidElement(children)) return children;
  return cloneElement(children, { ref, "data-magnetic": "" } as Record<string, unknown>);
}
```

- [ ] **Step 4: `Cursor.tsx` ve CSS**

`components/motion/Cursor.tsx`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";
import { hasFinePointer } from "./pointer";

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const enabled = !reduced && typeof window !== "undefined" && hasFinePointer();

  useEffect(() => {
    if (!enabled) return;
    document.body.dataset.cursor = "custom";
    return () => {
      delete document.body.dataset.cursor;
    };
  }, [enabled]);

  useGSAP(
    () => {
      if (!enabled || !dot.current || !ring.current) return;
      const dx = gsap.quickTo(dot.current, "x", { duration: 0.08 });
      const dy = gsap.quickTo(dot.current, "y", { duration: 0.08 });
      const rx = gsap.quickTo(ring.current, "x", { duration: 0.35, ease: "power3.out" });
      const ry = gsap.quickTo(ring.current, "y", { duration: 0.35, ease: "power3.out" });
      const onMove = (e: PointerEvent) => {
        dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      };
      const onOver = (e: Event) => {
        const t = (e.target as Element).closest("a, button, [data-magnetic]");
        gsap.to(ring.current, { scale: t ? 2.2 : 1, duration: 0.25 });
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerover", onOver);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
      };
    },
    { dependencies: [enabled] },
  );

  if (!enabled) return null;
  return (
    <div aria-hidden="true" data-cursor-root className="pointer-events-none fixed inset-0 z-[100]">
      <div ref={dot} className="absolute -left-1 -top-1 h-2 w-2 bg-accent" />
      <div ref={ring} className="absolute -left-4 -top-4 h-8 w-8 border border-accent" />
    </div>
  );
}
```

`app/globals.css` `@layer base` içine ekle:
```css
  body[data-cursor="custom"],
  body[data-cursor="custom"] a,
  body[data-cursor="custom"] button {
    cursor: none;
  }
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
```

`MotionProvider.tsx`: `SmoothScroll` içinde çocuklardan önce `<Cursor />` render et (reduced-motion dalında yok).

- [ ] **Step 5: e2e**

`e2e/cursor.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("custom cursor", () => {
  test("desktop with motion: cursor root exists and body opts out of native cursor", async ({ page, isMobile }) => {
    test.skip(isMobile, "fine pointer only");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await expect(page.locator("[data-cursor-root]")).toHaveCount(1);
    await expect(page.locator("body")).toHaveAttribute("data-cursor", "custom");
  });

  test("mobile (coarse pointer): no custom cursor", async ({ page, isMobile }) => {
    test.skip(!isMobile, "coarse pointer only");
    await page.goto("/en");
    await expect(page.locator("[data-cursor-root]")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveAttribute("data-cursor", /.+/);
  });

  test("reduced motion: no custom cursor on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "fine pointer only");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await expect(page.locator("[data-cursor-root]")).toHaveCount(0);
  });
});
```

Not: Pixel 7 cihaz profili `hasTouch: true` ve `(pointer: coarse)` verir; `isMobile` fixture'ı buna göre doğru.

- [ ] **Step 6: Build, e2e, lint, test, commit**

```bash
pnpm build && pnpm e2e && pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat(motion): custom cursor and magnetic wrapper gated by pointer and reduced-motion

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Ana sayfa kompozisyonu — hero, yetenek yüzeyleri, öne çıkanlar, hakkımda özeti, CTA

**Files:**
- Create: `lib/content/facets.ts`, `lib/content/facets.test.ts`, `components/motion/SectionReveal.tsx`, `components/home/Hero.tsx`, `components/home/Capabilities.tsx`, `components/home/FeaturedProjects.tsx`, `components/home/AboutTeaser.tsx`, `components/home/ContactCta.tsx`, `components/ui/SectionHeader.tsx`, `components/ui/Button.tsx`
- Modify: `app/[locale]/page.tsx`, `messages/en.json`, `messages/tr.json`, `components/layout/Nav.tsx`, `e2e/motion.spec.ts` (skip kaldır), `e2e/content.spec.ts`
- Test: `lib/content/facets.test.ts`, `e2e/home.spec.ts` (yeni)

**Interfaces:**
- Produces: `facetCounts(projects: Project[]): Record<Facet, number>` ve `FACET_LABEL_KEYS` (`lib/content/facets.ts`); `<SectionReveal>` (client; ScrollTrigger ile çocuk `[data-reveal]` öğelerini `y:24, opacity:0 → 0,1`, stagger 0.03, `start:"top 85%"`, `once:true`; reduced-motion'da hiçbir şey yapmaz); `<SectionHeader number="01" title=... />` (sunucu, mono numara + grotesk başlık, üst çizgi); `<Button href variant="primary|ghost">` (sunucu, `Link`, köşe 0, 44px min yükseklik); ana sayfa bölümleri.
- Consumes: `getProjects`, `Project`, `FACETS`, `SplitReveal`, `HeroShaderLoader`, `Magnetic`, mesajlar.

- [ ] **Step 1: Facet sayımı için başarısız test**

`lib/content/facets.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { facetCounts } from "./facets";
import type { Project } from "./merge";

const p = (slug: string, facets: Project["facets"]): Project =>
  ({ slug, facets, stack: [], year: 2026, role: "solo", featured: false, order: 1,
     cover: { type: "image", src: "", frame: "none" }, links: {},
     title: slug, summary: "", code: "", locale: "en", fallback: false }) as Project;

describe("facetCounts", () => {
  it("counts projects per facet, zero for unused facets", () => {
    const out = facetCounts([p("a", ["mobile", "ai"]), p("b", ["mobile"])]);
    expect(out).toEqual({ mobile: 2, web: 0, backend: 0, ai: 1, "data-erp": 0 });
  });
  it("returns all zeros for no projects", () => {
    expect(Object.values(facetCounts([])).every((n) => n === 0)).toBe(true);
  });
});
```

```bash
pnpm test
```
Beklenen: FAIL.

- [ ] **Step 2: `facets.ts`**

```ts
import { FACETS, type Facet } from "@/content/schema";
import type { Project } from "./merge";

export const FACET_LABEL_KEYS: Record<Facet, string> = {
  mobile: "mobile",
  web: "web",
  backend: "backend",
  ai: "ai",
  "data-erp": "dataErp",
};

export function facetCounts(projects: Project[]): Record<Facet, number> {
  const out = Object.fromEntries(FACETS.map((f) => [f, 0])) as Record<Facet, number>;
  for (const p of projects) for (const f of p.facets) out[f] += 1;
  return out;
}
```

```bash
pnpm test
```
Beklenen: geçer.

- [ ] **Step 3: Mesajlar**

`messages/en.json` içine ekle/güncelle (mevcut `Home` namespace'ini bununla değiştir, diğerlerini ekle):
```json
  "Home": {
    "projectsHeading": "Selected work",
    "allWork": "All work"
  },
  "Hero": {
    "eyebrow": "Mobile · Web · Backend · AI — Istanbul",
    "headline": "I build products end to end.",
    "sub": "Flutter apps, Next.js web, Node backends and AI integrations, shipped as one system.",
    "cta": "Explore work",
    "scroll": "Scroll"
  },
  "Capabilities": {
    "heading": "Capabilities",
    "mobile": "Mobile",
    "web": "Web",
    "backend": "Backend",
    "ai": "AI",
    "dataErp": "Data & ERP",
    "projects": "{count, plural, =0 {no projects yet} one {# project} other {# projects}}"
  },
  "AboutTeaser": {
    "heading": "About",
    "body": "Management Information Systems graduate (Pamukkale, 2025). Mobile-first by habit, full-stack by necessity: I own the app, the API and the data behind it. Currently shipping ERP and NIR integrations and Claude-powered automation for a feed-industry software consultancy.",
    "more": "More about me"
  },
  "Cta": {
    "eyebrow": "Available for new projects",
    "heading": "Let's build something.",
    "button": "Get in touch"
  }
```

`messages/tr.json`:
```json
  "Home": {
    "projectsHeading": "Seçili işler",
    "allWork": "Tüm işler"
  },
  "Hero": {
    "eyebrow": "Mobil · Web · Backend · AI — İstanbul",
    "headline": "Ürünü uçtan uca kurarım.",
    "sub": "Flutter uygulamalar, Next.js web, Node backend ve AI entegrasyonları; tek sistem olarak teslim.",
    "cta": "İşleri keşfet",
    "scroll": "Kaydır"
  },
  "Capabilities": {
    "heading": "Yetenek yüzeyleri",
    "mobile": "Mobil",
    "web": "Web",
    "backend": "Backend",
    "ai": "AI",
    "dataErp": "Veri & ERP",
    "projects": "{count, plural, =0 {henüz proje yok} one {# proje} other {# proje}}"
  },
  "AboutTeaser": {
    "heading": "Hakkımda",
    "body": "Yönetim Bilişim Sistemleri mezunu (Pamukkale, 2025). Alışkanlıkla mobil, zorunlulukla full-stack: uygulamanın, API'nin ve arkasındaki verinin sahibiyim. Şu an bir yem sektörü yazılım danışmanlığında ERP ve NIR entegrasyonları ile Claude destekli otomasyon geliştiriyorum.",
    "more": "Devamı"
  },
  "Cta": {
    "eyebrow": "Yeni projelere açığım",
    "heading": "Birlikte bir şey kuralım.",
    "button": "İletişime geç"
  }
```

`Home.eyebrow` ve `Home.headline` anahtarları kaldırılıyor; `Nav.work` vb. zaten var. `Nav.tsx` menüsüne `work`, `about`, `contact` linklerini ekle (hedefler `/work`, `/about`, `/contact`; sayfalar Faz 1b/1c'de gelir, şimdilik 404'e düşer — e2e'de tıklanmaz).

- [ ] **Step 4: UI primitifleri**

`components/ui/SectionHeader.tsx`:
```tsx
export function SectionHeader({ number, title, id }: { number: string; title: string; id?: string }) {
  return (
    <div id={id} className="mb-8 flex items-baseline gap-4 border-t border-line pt-4">
      <span className="font-mono text-sm text-muted">{number} /</span>
      <h2 className="font-display text-3xl md:text-5xl">{title}</h2>
    </div>
  );
}
```

`components/ui/Button.tsx`:
```tsx
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

type Props = {
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
};

export function Button({ href, variant = "primary", className, children }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 border px-5 font-mono text-sm uppercase tracking-wide transition-colors duration-200",
        variant === "primary" && "border-accent bg-accent text-bg hover:bg-transparent hover:text-accent",
        variant === "ghost" && "border-line text-fg hover:border-fg",
        className,
      )}
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 5: `SectionReveal.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, EASE } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";

export function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !ref.current) return;
      const items = ref.current.querySelectorAll<HTMLElement>("[data-reveal]");
      if (!items.length) return;
      gsap.set(items, { willChange: "transform, opacity" });
      gsap.from(items, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.03,
        ease: EASE.out,
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        onComplete: () => gsap.set(items, { clearProps: "willChange" }),
      });
      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === ref.current && t.kill());
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

Reduced-motion'da `[data-reveal]` öğeleri hiç `opacity:0` almaz (gsap.from çalışmaz) → son durum okunur.

- [ ] **Step 6: Ana sayfa bileşenleri**

`components/home/Hero.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { HeroShaderLoader } from "@/components/canvas/HeroShaderLoader";
import { Button } from "@/components/ui/Button";

export async function Hero() {
  const t = await getTranslations("Hero");
  return (
    <section className="relative isolate flex min-h-[88vh] flex-col justify-end overflow-hidden px-4 pb-12 md:px-6">
      <HeroShaderLoader />
      <p className="mb-6 font-mono text-sm uppercase tracking-wide text-muted">{t("eyebrow")}</p>
      <SplitReveal as="h1" className="max-w-[14ch] font-display text-[clamp(3rem,12vw,11rem)] leading-[0.95] tracking-tight">
        {t("headline")}
      </SplitReveal>
      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <p className="max-w-xl text-lg text-muted">{t("sub")}</p>
        <Magnetic>
          <Button href="/work">{t("cta")} →</Button>
        </Magnetic>
      </div>
      <span className="absolute bottom-4 right-4 font-mono text-xs uppercase text-muted">{t("scroll")}</span>
    </section>
  );
}
```

`Magnetic` client, `Button` sunucu: `Magnetic`'in `children` prop'u sunucu bileşeni olabilir (React bunu destekler; `cloneElement` ile `ref` ekleme için `Button` bir `Link` döndürür, `ref` Link'e geçer). Tip hatası çıkarsa `Button`'a `ref` forward ekle ve raporla.

`components/home/Capabilities.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { FACETS } from "@/content/schema";
import type { Project } from "@/lib/content";
import { facetCounts, FACET_LABEL_KEYS } from "@/lib/content/facets";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Link } from "@/i18n/navigation";

export async function Capabilities({ projects }: { projects: Project[] }) {
  const t = await getTranslations("Capabilities");
  const counts = facetCounts(projects);
  return (
    <section className="px-4 py-16 md:px-6">
      <SectionHeader number="01" title={t("heading")} />
      <SectionReveal className="grid grid-cols-1 border-l border-t border-line md:grid-cols-5">
        {FACETS.map((f) => (
          <Link
            key={f}
            href={{ pathname: "/work", query: { f } }}
            data-reveal
            data-testid="capability"
            className="group flex min-h-40 flex-col justify-between border-b border-r border-line p-5 hover:bg-surface"
          >
            <span className="font-display text-2xl">{t(FACET_LABEL_KEYS[f])}</span>
            <span className="font-mono text-sm text-muted">{t("projects", { count: counts[f] })}</span>
          </Link>
        ))}
      </SectionReveal>
    </section>
  );
}
```

`components/home/FeaturedProjects.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import type { Project } from "@/lib/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export async function FeaturedProjects({ projects }: { projects: Project[] }) {
  const t = await getTranslations("Home");
  const featured = projects.filter((p) => p.featured).slice(0, 4);
  return (
    <section className="px-4 py-16 md:px-6">
      <SectionHeader number="02" title={t("projectsHeading")} />
      <SectionReveal>
        <ol className="border-t border-line">
          {featured.map((p, i) => (
            <li key={p.slug} data-reveal data-testid="project" className="border-b border-line">
              <Link href={`/work/${p.slug}`} className="grid grid-cols-[3rem_1fr] items-baseline gap-4 py-6 hover:bg-surface md:grid-cols-[4rem_1fr_auto]">
                <span className="font-mono text-sm text-muted">0{i + 1}</span>
                <span className="font-display text-2xl md:text-4xl">{p.title}</span>
                <span className="col-start-2 font-mono text-xs uppercase text-muted md:col-start-3">
                  {p.year} — {p.facets.join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Button href="/work" variant="ghost">{t("allWork")} →</Button>
        </div>
      </SectionReveal>
    </section>
  );
}
```

`components/home/AboutTeaser.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Button } from "@/components/ui/Button";

export async function AboutTeaser() {
  const t = await getTranslations("AboutTeaser");
  return (
    <section className="px-4 py-16 md:px-6">
      <SectionHeader number="03" title={t("heading")} />
      <SectionReveal className="grid gap-8 md:grid-cols-12">
        <p data-reveal className="text-lg leading-relaxed md:col-span-8">{t("body")}</p>
        <div data-reveal className="md:col-span-4 md:justify-self-end">
          <Button href="/about" variant="ghost">{t("more")} →</Button>
        </div>
      </SectionReveal>
    </section>
  );
}
```

`components/home/ContactCta.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Button } from "@/components/ui/Button";

export async function ContactCta() {
  const t = await getTranslations("Cta");
  return (
    <section className="border-t border-line px-4 py-24 md:px-6">
      <SectionReveal>
        <p data-reveal className="mb-4 flex items-center gap-2 font-mono text-sm uppercase text-muted">
          <span className="inline-block h-2 w-2 bg-accent" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h2 data-reveal className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("heading")}</h2>
        <div data-reveal className="mt-10">
          <Button href="/contact">{t("button")} →</Button>
        </div>
      </SectionReveal>
    </section>
  );
}
```

`app/[locale]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getProjects } from "@/lib/content";
import { Hero } from "@/components/home/Hero";
import { Capabilities } from "@/components/home/Capabilities";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { AboutTeaser } from "@/components/home/AboutTeaser";
import { ContactCta } from "@/components/home/ContactCta";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: alternatesFor("/", locale) };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const projects = getProjects(locale);

  return (
    <main>
      <Hero />
      <Capabilities projects={projects} />
      <FeaturedProjects projects={projects} />
      <AboutTeaser />
      <ContactCta />
    </main>
  );
}
```

Mevcut `e2e/content.spec.ts` "MOBILE · BACKEND" beklentisi: yeni liste `mobile · backend` (küçük harf, CSS `uppercase`) yazar; `toContainText` DOM metnini okur → küçük harf. Testi `"mobile · backend"` olarak güncelle (davranış değişikliği bilinçli; raporda belirt).

- [ ] **Step 7: e2e**

`e2e/home.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("hero headline is in the server HTML and accessible", async ({ page }) => {
    const res = await page.request.get("/en");
    const html = await res.text();
    expect(html).toContain("I build products end to end.");
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("I build products end to end.");
  });

  test("capabilities grid shows five facets with counts", async ({ page }) => {
    await page.goto("/en");
    const cells = page.getByTestId("capability");
    await expect(cells).toHaveCount(5);
    await expect(cells.first()).toContainText("Mobile");
    await expect(cells.first()).toContainText("1 project");
  });

  test("featured list links to the project page", async ({ page }) => {
    await page.goto("/en");
    const first = page.getByTestId("project").first();
    await expect(first).toContainText("GeoTrack");
    await expect(first.getByRole("link")).toHaveAttribute("href", /\/en\/work\/geotrack$/);
  });

  test("reduced motion: every revealed element is fully visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    const hidden = await page.locator("[data-reveal]").evaluateAll((els) =>
      els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length,
    );
    expect(hidden).toBe(0);
  });

  test("keyboard: Tab reaches the hero CTA with a visible focus ring", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard on desktop");
    await page.goto("/en");
    const cta = page.getByRole("link", { name: /explore work/i });
    await cta.focus();
    await expect(cta).toBeFocused();
    const outline = await cta.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("turkish home renders translated sections", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Ürünü uçtan uca kurarım.");
    await expect(page.getByText("Yetenek yüzeyleri")).toBeVisible();
  });
});
```

`e2e/motion.spec.ts` içindeki wheel-scroll testinden `test.skip`'i kaldır (sayfa artık uzun).

```bash
pnpm build && pnpm e2e
```
Beklenen: tüm e2e yeşil (yeni 6 + önceki).

- [ ] **Step 8: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat(home): hero with shader and split headline, capabilities grid, featured list, about teaser, CTA

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Performans kapısı, bütçe doğrulama, dokümantasyon

**Files:**
- Modify: `lighthouserc.json`, `CLAUDE.md`, `next.config.ts` (gerekirse `optimizePackageImports`)
- Test: `pnpm lhci`

**Interfaces:**
- Produces: LHCI `resource-summary:script:size` error ≤ 262144; CLAUDE.md Faz 1a notları.

- [ ] **Step 1: LHCI eşiğini güncelle**

`lighthouserc.json` içinde `"resource-summary:script:size": ["error", { "maxNumericValue": 262144 }]`. Diğer assert'ler aynen.

- [ ] **Step 2: Ölç**

```bash
pnpm build && pnpm lhci
```

Beklenen: tüm error-assert'ler geçer. Raporda `/en` ve `/tr` için performance, LCP, script transfer boyutunu yaz. Script > 256 KB ise sırayla dene ve her adımın etkisini raporla: (a) `next.config.ts` → `experimental.optimizePackageImports: ["gsap", "ogl"]`; (b) `SplitText`/`ScrollTrigger` import'larını `lib/motion.ts`'ten ayırıp yalnızca kullanan bileşenlerde `await import("gsap/SplitText")` ile dinamik yüklemek; (c) OGL'de kullanılan sınıfları named import ile sınırlı tutmak (zaten öyle). Eşiği gevşetme.

LCP > 2.0 s (warn) bekleniyor; Faz 1.5 font-swap işi. Raporda değer yaz.

- [ ] **Step 3: CLAUDE.md**

`## Learned constraints` altına ekle:
```
- Motion lives in components/motion, components/canvas, lib/motion.ts only. Single rAF: Lenis autoRaf:false driven by gsap.ticker; ScrollTrigger.update on lenis scroll.
- useReducedMotion() returns true on the server: SSR HTML is always the static variant; motion mounts only on the client after the query says "no-preference".
- SplitText only on the hero headline (aria:"auto", revert on unmount). HeroShader is dynamic/ssr:false, paused when offscreen or tab hidden, poster under reduced-motion or no WebGL.
- LHCI script gate is 256 KB total transfer (Lighthouse counts lazy chunks); spec's 180 KB applies to first-load JS. Current baseline: <değer> KB on /en.
```

- [ ] **Step 4: Commit ve push**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "perf: raise LHCI script budget for lazy motion libs; document Faz 1a motion rules

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

## Self-review notları

- **Spec kapsamı (Faz 1a):** §2.1 ana sayfa: hero ✔ T5, "şu an" paneli → Faz 1c, seçili 4 vaka ✔ T5 (içerik Faz 1b'de artar), yetenek ızgarası ✔ T5, kısa hakkımda ✔ T5, iletişim CTA ✔ T5. §3.4 hareket: Lenis ✔ T1, SplitText ✔ T2, shader ✔ T3, bölüm girişleri ✔ T5, hover preview → Faz 1b (görsel yok), Flip → Faz 1b, ViewTransition → Faz 1b, imleç/magnetic ✔ T4, reduced-motion ✔ her görev. §4.7 performans ✔ T6.
- **Tip tutarlılığı:** `useReducedMotion` T1 → T2/T3/T4/T5. `gsap`, `useGSAP`, `SplitText`, `ScrollTrigger`, `EASE` `lib/motion.ts` T1 → T2/T4/T5. `Project` T0 (`lib/content/merge.ts`) → T5. `hasFinePointer`, `clampMagnet` T4 içinde. `SectionReveal` T5 içinde tanımlı ve kullanılıyor.
- **Review Focus eşlemesi:** 1 → T1/T3/T5 e2e (reduced-motion); 2 → T3 e2e (WebGL null); 3 → T4 e2e (mobile); 4 → T3 birim (`visibility.test`); 5 → T2 birim (aria) + T5 e2e (Tab/focus).
- **Bilinen riskler:** `lenis/react` ref tipi adı; `gsap/SplitText` yolu; OGL `Vec2/Vec3` imzaları; `Magnetic` → sunucu `Button` ref geçişi; `useGSAP` içinde `revertOnUpdate` ile SplitText `revert` çifte çağrısı (ikinci çağrı no-op olmalı; değilse `split.isSplit` kontrolü ekle). Her biri için implementer doğrular ve raporlar.
- **Faz 1b'ye devredilen:** `/work`, `/work/[slug]`, `/about`, `/services` sayfaları, hover preview görselleri, Flip filtre, ViewTransition, 7 vaka içeriği, cihaz çerçevesi, malzeme üretimi. **Faz 1c:** iletişim formu, GitHub paneli, Umami, `motion` paketi.
