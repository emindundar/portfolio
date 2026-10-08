# Faz 1b — İçerik ve Sayfalar Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sitenin içerik omurgası: 7 vaka çalışması (TR/EN), `/work` listesi + facet filtresi, `/work/[slug]` vaka şablonu, `/about` (zaman çizelgesi, sertifikalar, topluluk & etkinlikler, CV indir), `/services`, `/colophon`; görsel malzeme pipeline'ı; Faz 1a'dan devreden hero geç-yükleme düzeltmesi.

**Architecture:** İçerik Velite'ten (`content/`), sayfalar sunucu bileşeni, hareket Faz 1a katmanından (`SectionReveal`, lazy impl). Yeni istemci parçaları: `WorkList` (filtre + GSAP Flip), `MediaCover` (video oynatma IO ile). Görseller build öncesi `scripts/media.ts` ile `sharp` üzerinden üretilip commit'lenir; `next/image` kullanılmaz (Vercel Hobby dönüşüm limiti sıfır harcanır). Sayfa geçişleri React `<ViewTransition>` (kapak morph), reduced-motion'da süre 0.

**Tech Stack:** Faz 1a yığını + `sharp` (devDependency, script), React 19.3 `ViewTransition`, GSAP `Flip` (gsap/Flip, lazy impl içinde).

**Spec:** `docs/superpowers/specs/2026-10-07-portfolio-design.md` §2.1–2.6 (sayfalar, vaka şablonu, içerik modeli), §3.4 (Flip, hover preview, ViewTransition), §3.6 (malzeme), §4.7 (görseller), §4.8.

## Global Constraints

- Faz 0/1a kuralları ve `CLAUDE.md` aynen (token'lar, sınır, i18n, `cacheComponents`, lazy motion, test sinyalleri `data-motion`/`data-cursor`, portlar 3100/3101).
- Her yeni sayfa `generateMetadata` ile `alternates: alternatesFor(path, locale)` + `title` + `description` verir (ruling, Faz 0).
- Her sayfa bir `<main>` render eder; `<h1>` tek; bölüm başlıkları `SectionHeader` ile numaralı.
- Görseller: `public/media/<slug>/` altında önceden üretilmiş `*-640.webp`, `*-1280.webp`, `*-1920.webp`; `<img srcSet sizes loading="lazy" decoding="async" width height>` ile. Videolar: `cover.mp4` (H.264, ≤ 720p, ≤ 4 MB) + `cover.webm` + `poster-1280.webp`; `<video muted playsInline loop preload="metadata">`, IO ile oynat/durdur, reduced-motion'da sadece poster. `next/image` yok.
- `cover` opsiyonel; yoksa `TypoCover` (tipografik blok). Yeni meta alanları: `client?`, `credits?`, `links.live?`.
- Vaka MDX gövdesi şu `##` başlıklarıyla, bu sırayla (TR/EN karşılığı `messages` değil, MDX içinde): EN `Problem / Role / Architecture / Decisions / Outcome` — TR `Problem / Rol / Mimari / Kararlar / Sonuç`. Her vaka 180–350 kelime/dil. Pazarlama dili yok; "X yerine Y çünkü Z" kalıbı.
- Facet filtresi URL ile (`/work?f=ai`), paylaşılabilir; JS olmadan da çalışır (sunucu filtreler), JS varsa Flip ile yeniden dizilir; chip'ler `flex-wrap`, `aria-pressed`.
- Reduced-motion: Flip yok (anında), video oynamaz (poster), ViewTransition süresi 0, hover preview yok.
- Performans kapıları aynen: LHCI toplam script ≤ 256 KB (error), LCP warn, perf ≥ 0.9; LHCI URL listesine `/en/work`, `/en/work/geotrack`, `/en/about` eklenir. Vaka sayfasındaki ilk video `preload="metadata"`; LCP öğesi başlık olmalı, görsel değil.
- Gizlilik: etkinlik fotoğraflarında başkalarının yüzü yok (DevFest Denizli fotoğrafı banner bölgesine kırpılır). Kipgöz vakasında kurum adı yok ("bir özel eğitim kurumu"). GymAI'da tez künyesi (Pamukkale YBS, 2025; Beyzanur Eren ile; danışman Doç. Dr. Ömer Güleç).
- Commit mesajı sonunda `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Her görev: lint, typecheck, test, build, ilgili e2e.

## Review Focus

1. **Filtre + Flip + geri tuşu**: `/work?f=ai` → chip tıkla → URL `?f=mobile` → tarayıcı geri → liste `ai`'ya döner, chip `aria-pressed` doğru, Flip çift tetiklenmez. → Task 6 e2e.
2. **Kapaksız vaka**: `cover` olmayan proje listede ve detayda `TypoCover` ile çıkar, 404/hata yok, LCP görseli yok. → Task 5 birim + Task 7 e2e (cursor-notion-mcp).
3. **Video kapak, reduced-motion ve IO**: reduced-motion'da `<video>` DOM'da yok, sadece poster; motion'da video görünür olunca `play()`, dışarı çıkınca `pause()`. → Task 5 birim (IO stub) + Task 7 e2e.
4. **Çeviri eksikliği**: bir vakanın `.tr.mdx` dosyası yoksa `/tr/work/<slug>` EN içerikle açılır, sayfa üstünde "Bu vaka şimdilik İngilizce" notu; build kırılmaz. → Task 4 birim (merge zaten) + Task 7 e2e (geçici fixture ile değil, `fallback` bayrağı için birim).
5. **CV indirme**: `/en/cv` → `Emin_Dundar_CV_en.pdf` (302), `/tr/cv` → TR PDF; dosyalar mevcut, `Content-Type: application/pdf`. → Task 8 e2e.

---

## İnsan ön adımları (kullanıcı)

- [ ] `public/media/about/portrait.jpg` için fotoğraf (en az 1200 px genişlik). Yoksa Task 8 portresiz çalışır, `AboutHero` metin-only.
- [ ] Kipgöz'ün adı kullanılabilir mi (ürün adı) — varsayılan: **evet**, kurum adı **hayır**.
- [ ] Beyzanur Eren'in adının GymAI künyesinde geçmesi — varsayılan: **evet** (poster kamuya açık).

---

### Task 1: Hero geç-yükleme koruması mount zamanından ölçülür (Faz 1a residual)

**Files:**
- Modify: `components/motion/SplitReveal.tsx`, `components/motion/SplitReveal.impl.tsx`, `components/motion/SplitReveal.impl.test.tsx`
- Test: `components/motion/SplitReveal.impl.test.tsx`, `e2e/split.spec.ts`

**Interfaces:**
- Produces: `SplitRevealImpl` yeni prop `mountedAt: number` (`performance.now()` sarmalayıcı mount anında). Koruma: `performance.now() - mountedAt > 1200 || window.scrollY > 0` → split yok.
- Consumes: Faz 1a `SplitReveal` sarmalayıcısı.

- [ ] **Step 1: Başarısız test**

`SplitReveal.impl.test.tsx` içindeki "late chunk" testlerini şöyle güncelle (mevcut `performance.now() > 1200` varsayımını mount-göreli hale getir):
```tsx
it("skips the split when the impl mounts more than 1200 ms after the wrapper", () => {
  vi.spyOn(performance, "now").mockReturnValue(5000);
  render(<SplitRevealImpl el={el} text="x" delay={0} mountedAt={3000} />);
  expect(createSpy).not.toHaveBeenCalled();
});
it("splits when the impl arrives within 1200 ms of wrapper mount even on a long-lived page", () => {
  vi.spyOn(performance, "now").mockReturnValue(60_400);
  render(<SplitRevealImpl el={el} text="x" delay={0} mountedAt={60_000} />);
  expect(createSpy).toHaveBeenCalledTimes(1);
});
```
`el`, `createSpy` mevcut test dosyasındaki kurulumla aynı (`vi.mock("@/lib/motion")`). `pnpm test` → FAIL (`mountedAt` yok, ikinci test eski korumayla başarısız).

- [ ] **Step 2: Uygula**

`SplitReveal.tsx` sarmalayıcıda `const mountedAt = useRef(0); useEffect(() => { mountedAt.current = performance.now(); }, []);` ve impl'e `mountedAt={mountedAt.current}` geç (impl `el` set edildikten sonra mount olur; `useRef` değeri o anda dolu). `SplitReveal.impl.tsx`: `if (performance.now() - mountedAt > 1200 || window.scrollY > 0) return;`.

- [ ] **Step 3: Doğrula ve commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm exec playwright test e2e/split.spec.ts e2e/resilience.spec.ts
git add -A && git commit -m "fix(motion): measure SplitReveal late-arrival guard from wrapper mount

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: İçerik şeması v2, zaman çizelgesi, hizmetler, etkinlikler, mesajlar

**Files:**
- Modify: `content/schema.ts`, `velite.config.ts`, `lib/content/merge.ts`, `lib/content/index.ts`, `content/schema.test.ts`, `messages/en.json`, `messages/tr.json`
- Create: `content/timeline.json`, `content/services.json`, `content/events.json`, `content/schema-site.ts`, `content/schema-site.test.ts`, `lib/content/site.ts`
- Test: `content/schema.test.ts`, `content/schema-site.test.ts`

**Interfaces:**
- Produces:
  - `projectMetaSchema`: `cover` opsiyonel; `cover.type` ∈ `video|image`; `cover.src` = `/media/<slug>/cover` (uzantısız taban; bileşen `-640.webp` vb. türetir), `cover.poster` kaldırıldı (video için `poster-1280.webp` sabit); `client?: string`, `credits?: string`, `links.live?: string (url)`.
  - `timelineSchema`, `servicesSchema`, `eventsSchema` (`content/schema-site.ts`, velite `s` ile); Velite koleksiyonları `timeline`, `services`, `events` (JSON tek dosya, `{en,tr}` alanlı).
  - `lib/content/site.ts`: `getTimeline(locale)`, `getServices(locale)`, `getEvents(locale)` — her biri `{...entry, text: entry[locale]}` düzleştirilmiş.
  - Mesaj namespace'leri: `Work` (title, description, filterAll, filterLabel, count, empty, viewCase), `Case` (role, stack, links, repo, live, demo, store, client, credits, prev, next, backToWork, fallbackNote), `About` (title, description, intro, timelineHeading, certsHeading, howHeading, how1..how4, eventsHeading, cvHeading, cvDownloadEn, cvDownloadTr), `Services` (title, description, intro, cta), `Colophon` (title, description, p1..p6, stackHeading, processHeading), `Nav.colophon`, `Nav.primary`.
- Consumes: `FACETS`.

- [ ] **Step 1: Şema testleri (başarısız)**

`content/schema.test.ts`'e ekle:
```ts
it("accepts a project without cover and with client/credits/live", () => {
  const { cover: _c, ...rest } = valid;
  const r = projectMetaSchema.safeParse({ ...rest, client: "x", credits: "y", links: { live: "https://a.b" } });
  expect(r.success).toBe(true);
});
it("rejects cover without a known type", () => {
  expect(projectMetaSchema.safeParse({ ...valid, cover: { type: "gif", src: "/media/a/cover", frame: "none" } }).success).toBe(false);
});
it("requires cover.src to start with /media/", () => {
  expect(projectMetaSchema.safeParse({ ...valid, cover: { type: "image", src: "cover", frame: "none" } }).success).toBe(false);
});
```
`valid` fixture'ındaki `cover.src`'yi `/media/geotrack/cover` yap, `poster` alanını kaldır.

`content/schema-site.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { timelineSchema, servicesSchema, eventsSchema } from "./schema-site";

describe("site schemas", () => {
  it("timeline entry needs kind, from, en/tr titles", () => {
    expect(timelineSchema.safeParse({ kind: "work", from: "2026-02", to: null, org: "Feedback Yem", en: { title: "Software Consultant", body: "x" }, tr: { title: "Yazılım Danışmanı", body: "y" } }).success).toBe(true);
    expect(timelineSchema.safeParse({ kind: "nope", from: "2026-02", org: "x", en: { title: "a" }, tr: { title: "b" } }).success).toBe(false);
  });
  it("service needs slug, facet, en/tr", () => {
    expect(servicesSchema.safeParse({ slug: "mobile", facet: "mobile", caseSlug: "geotrack", en: { title: "a", body: "b" }, tr: { title: "c", body: "d" } }).success).toBe(true);
  });
  it("event needs date, place, coords, photo, en/tr caption", () => {
    expect(eventsSchema.safeParse({ slug: "devfest-izmir-24", date: "2024-12-07", place: "İzmir", lat: 38.4514, lng: 27.1705, photo: "/media/events/devfest-izmir-24", en: { title: "DevFest İzmir '24", caption: "x" }, tr: { title: "DevFest İzmir '24", caption: "y" } }).success).toBe(true);
  });
});
```
`pnpm test` → FAIL.

- [ ] **Step 2: Şemalar**

`content/schema.ts` `cover` ve yeni alanlar:
```ts
  cover: s
    .object({
      type: s.enum(["video", "image"]),
      src: s.string().regex(/^\/media\/[a-z0-9-]+\/[a-z0-9-]+$/, "cover.src: /media/<slug>/<name> without extension"),
      frame: s.enum(["phone", "browser", "none"]),
    })
    .optional(),
  client: s.string().max(80).optional(),
  credits: s.string().max(200).optional(),
  links: s
    .object({
      repo: s.array(s.string().url()).optional(),
      live: s.string().url().optional(),
      demo: s.string().url().optional(),
      video: s.string().url().optional(),
      store: s.string().url().optional(),
    })
    .default({}),
```

`content/schema-site.ts`:
```ts
import { s } from "velite";
import { FACETS } from "./facet-list";

const localized = s.object({ title: s.string().min(1), body: s.string().optional(), caption: s.string().optional() });

export const timelineSchema = s.object({
  kind: s.enum(["work", "education", "cert"]),
  from: s.string().regex(/^\d{4}(-\d{2})?$/),
  to: s.string().regex(/^\d{4}(-\d{2})?$/).nullable().optional(),
  org: s.string().min(1),
  place: s.string().optional(),
  en: localized,
  tr: localized,
});

export const servicesSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/),
  facet: s.enum(FACETS),
  caseSlug: s.string().regex(/^[a-z0-9-]+$/),
  en: localized,
  tr: localized,
});

export const eventsSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/),
  date: s.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  place: s.string().min(1),
  lat: s.number(),
  lng: s.number(),
  photo: s.string().regex(/^\/media\/events\/[a-z0-9-]+$/),
  en: localized,
  tr: localized,
});
```

`velite.config.ts`: üç koleksiyon ekle (`pattern: "timeline.json"` vb., `schema: s.array(timelineSchema)`), `collections: { projectMeta, projectContent, timeline, services, events }`. Velite'te tek JSON dosyası dizi → koleksiyon `single: true` ile tanımlanır; `.velite/timeline.json` dizi olarak çıkar. `node_modules/velite/dist` tiplerinde `single` seçeneğini doğrula.

- [ ] **Step 3: İçerik dosyaları**

`content/timeline.json` (CV'den; tarihler CV'deki gibi):
```json
[
  { "kind": "work", "from": "2026-02", "to": null, "org": "Feedback Yem ve Hayvancılık Yönetim Sistemleri", "place": "Denizli", "en": { "title": "Software Consultant", "body": "Bestmix feed-formulation rollouts end to end; Excel-to-SQL data migrations; NIR and ERP integrations; Claude-assisted workflow automation; client training in Türkiye and the Middle East." }, "tr": { "title": "Yazılım Danışmanı", "body": "Bestmix yem formülasyon yazılımının uçtan uca uygulanması; Excel'den SQL'e veri taşıma; NIR ve ERP entegrasyonları; Claude destekli iş akışı otomasyonu; Türkiye ve Orta Doğu'da müşteri eğitimleri." } },
  { "kind": "work", "from": "2024-07", "to": "2024-09", "org": "KAZK Yazılım", "place": "Denizli", "en": { "title": "Front-end Developer Intern", "body": "Responsive, performance-focused interfaces with HTML, CSS and JavaScript; collaboration with UI/UX." }, "tr": { "title": "Front-end Geliştirici Stajyeri", "body": "HTML, CSS ve JavaScript ile duyarlı, performans odaklı arayüzler; UI/UX ekibiyle iş birliği." } },
  { "kind": "work", "from": "2023-07", "to": "2023-08", "org": "Aysu Tekstil", "place": "Denizli", "en": { "title": "IT Intern", "body": "ERP operations: stock, orders, production and sales; user provisioning and support." }, "tr": { "title": "Bilgi Teknolojileri Stajyeri", "body": "ERP üzerinde stok, sipariş, üretim ve satış süreçleri; kullanıcı tanımlama ve destek." } },
  { "kind": "education", "from": "2021-09", "to": "2025-06", "org": "Pamukkale University", "place": "Denizli", "en": { "title": "B.Sc. Management Information Systems", "body": "Thesis: GymAI — AI-assisted gym assistant (Flutter, Firebase, Gemini)." }, "tr": { "title": "Yönetim Bilişim Sistemleri Lisans", "body": "Tez: GymAI — yapay zekâ destekli spor asistanı (Flutter, Firebase, Gemini)." } },
  { "kind": "cert", "from": "2025", "org": "Google", "en": { "title": "Build Apps with Flutter" }, "tr": { "title": "Flutter ile Uygulama Geliştirin" } },
  { "kind": "cert", "from": "2025", "org": "Patika.dev · Akbank Gençlik Akademisi", "en": { "title": "Technology Literacy Programme" }, "tr": { "title": "Teknoloji Okuryazarlığı Programı" } },
  { "kind": "cert", "from": "2024", "org": "BTK Akademi", "en": { "title": "Version Control: Git & GitHub" }, "tr": { "title": "Versiyon Kontrolleri: Git ve GitHub" } },
  { "kind": "cert", "from": "2024", "org": "Akbank Gençlik Akademisi", "en": { "title": "Cyber Security 101" }, "tr": { "title": "Siber Güvenlik 101" } },
  { "kind": "cert", "from": "2023", "org": "YETGİM", "en": { "title": "Programming with PHP" }, "tr": { "title": "PHP ile Programlama" } },
  { "kind": "cert", "from": "2026", "org": "USSEC", "en": { "title": "Full-Fat Soybean: Production, Quality Control and Use in Feeding" }, "tr": { "title": "Tam Yağlı Soya: Üretim, Kalite Kontrolü ve Beslemede Kullanımı" } },
  { "kind": "cert", "from": "2023", "org": "Aydın Lisan", "en": { "title": "English — B1" }, "tr": { "title": "İngilizce — B1" } }
]
```
Sertifika yılları CV'de yok; implementer CV PDF'lerinde yıl ararsa kullanır, yoksa yukarıdaki tahminleri **kaldırıp** `from` alanını `"—"` yerine yıl bilgisi olmayan girişler için şemayı `from: s.string().regex(/^\d{4}(-\d{2})?$|^$/)` ile boş stringe izin verecek şekilde gevşetir ve boş bırakır; raporda belirtir.

`content/services.json`:
```json
[
  { "slug": "mobile", "facet": "mobile", "caseSlug": "geotrack", "en": { "title": "Mobile apps", "body": "Flutter apps for iOS and Android with clean architecture, offline-aware state, maps, push and payments. Shipped with the backend they need." }, "tr": { "title": "Mobil uygulamalar", "body": "iOS ve Android için Flutter uygulamalar: temiz mimari, çevrimdışı farkındalıklı durum yönetimi, harita, bildirim, ödeme. İhtiyaç duyduğu backend ile birlikte teslim." } },
  { "slug": "web", "facet": "web", "caseSlug": "karaoke-sync", "en": { "title": "Web & backend", "body": "Next.js front ends and Node/NestJS APIs with PostgreSQL, Docker and CI. Media, auth, rate limiting and the boring parts done right." }, "tr": { "title": "Web ve backend", "body": "Next.js arayüzler ve Node/NestJS API'ler: PostgreSQL, Docker, CI. Medya, kimlik doğrulama, rate limiting ve sıkıcı kısımlar doğru yapılır." } },
  { "slug": "ai", "facet": "ai", "caseSlug": "gymai", "en": { "title": "AI integration & automation", "body": "LLM features inside real products (Gemini, Claude), prompt pipelines, MCP tools and agent workflows that remove manual work." }, "tr": { "title": "AI entegrasyonu ve otomasyon", "body": "Gerçek ürünlerde LLM özellikleri (Gemini, Claude), prompt hatları, MCP araçları ve el işini kaldıran ajan iş akışları." } },
  { "slug": "data-erp", "facet": "data-erp", "caseSlug": "kipgoz", "en": { "title": "Data & ERP integration", "body": "Excel-to-SQL migrations, device and ERP integrations, reporting. Experience from feed-industry formulation software rollouts." }, "tr": { "title": "Veri ve ERP entegrasyonu", "body": "Excel'den SQL'e geçişler, cihaz ve ERP entegrasyonları, raporlama. Yem sektörü formülasyon yazılımı uygulamalarından gelen tecrübe." } }
]
```

`content/events.json` (EXIF'ten tarih/koordinat):
```json
[
  { "slug": "devfest-izmir-24", "date": "2024-12-07", "place": "İzmir", "lat": 38.4514, "lng": 27.1705, "photo": "/media/events/devfest-izmir-24", "en": { "title": "DevFest İzmir '24", "caption": "GDG İzmir — attendee." }, "tr": { "title": "DevFest İzmir '24", "caption": "GDG İzmir — katılımcı." } },
  { "slug": "gymai-thesis-2025", "date": "2025-06-02", "place": "Denizli", "lat": 37.7380, "lng": 29.1065, "photo": "/media/events/gymai-thesis-2025", "en": { "title": "GymAI thesis poster", "caption": "Pamukkale University MIS — poster session." }, "tr": { "title": "GymAI tez posteri", "caption": "Pamukkale Üniversitesi YBS — poster sunumu." } },
  { "slug": "devfest-denizli-25", "date": "2025-11-29", "place": "Denizli", "lat": 37.7618, "lng": 29.0528, "photo": "/media/events/devfest-denizli-25", "en": { "title": "DevFest Denizli 2025", "caption": "GDG Denizli — attendee." }, "tr": { "title": "DevFest Denizli 2025", "caption": "GDG Denizli — katılımcı." } }
]
```

- [ ] **Step 4: `lib/content/site.ts`**

```ts
import { timeline, services, events } from "#site/content";
import type { Locale } from "@/i18n/routing";

type L = { en: { title: string; body?: string; caption?: string }; tr: { title: string; body?: string; caption?: string } };
function localize<T extends L>(items: T[], locale: Locale) {
  return items.map((i) => ({ ...i, text: i[locale] }));
}
export const getTimeline = (locale: Locale) => localize(timeline, locale);
export const getServices = (locale: Locale) => localize(services, locale);
export const getEvents = (locale: Locale) => localize(events, locale);
```

- [ ] **Step 5: Mesajlar**

`messages/en.json` ekle:
```json
  "Nav": { "...": "mevcut anahtarlar", "colophon": "Colophon", "primary": "Primary" },
  "Work": { "title": "Work", "description": "Selected projects across mobile, web, backend, AI and data.", "filterAll": "All", "filterLabel": "Filter by capability", "count": "{count, plural, =0 {no projects} one {# project} other {# projects}}", "empty": "Nothing here yet.", "viewCase": "View case" },
  "Case": { "role": "Role", "roleSolo": "Solo", "roleLead": "Lead", "roleContributor": "Contributor", "stack": "Stack", "links": "Links", "repo": "Repository", "live": "Live", "demo": "Demo", "store": "Store", "client": "Client", "credits": "Credits", "prev": "Previous", "next": "Next", "backToWork": "All work", "fallbackNote": "This case study is available in English only for now." },
  "About": { "title": "About", "description": "Who I am, where I've worked, what I've learned.", "intro": "I'm Emin — a Management Information Systems graduate who builds mobile apps, web products and the backends behind them, with a habit of wiring AI into the workflow. Based in Istanbul.", "timelineHeading": "Timeline", "certsHeading": "Certificates", "howHeading": "How I work", "how1": "Spec first. I write the problem down before the code.", "how2": "End to end. The app, the API and the data are one system.", "how3": "AI as a tool, not a shortcut. Every generated line is reviewed and tested.", "how4": "Ship small, measure, iterate.", "eventsHeading": "Community & events", "cvHeading": "CV", "cvDownloadEn": "Download CV (EN)", "cvDownloadTr": "Download CV (TR)" },
  "Services": { "title": "Services", "description": "What I build for clients.", "intro": "Available for freelance and project work. Four things I do well:", "cta": "Start a project", "seeCase": "See a case" },
  "Colophon": { "title": "Colophon", "description": "How this site was built.", "p1": "This site is a case study in itself. It was designed as a written spec first, then planned task by task and implemented with Claude Code acting as a subagent team: one agent implements, a fresh one reviews, and I rule on every disagreement.", "p2": "Stack: Next.js 16 (App Router, cache components), React 19, TypeScript, Tailwind v4, next-intl, Velite for git-based MDX content, GSAP + Lenis for motion, OGL for the hero shader.", "p3": "Every animation degrades to a static page under reduced motion; motion code loads only after hydration, so the first-load JavaScript stays under 180 KB.", "p4": "Quality gates run on every pull request: unit tests, Playwright end-to-end tests on desktop and mobile, and Lighthouse budgets for performance, accessibility and SEO.", "p5": "The specs, plans and review ledgers are public in the repository.", "p6": "Fonts: Cabinet Grotesk, Satoshi and JetBrains Mono.", "stackHeading": "Stack", "processHeading": "Process", "repo": "Source on GitHub" }
```
`messages/tr.json` aynı anahtarlarla Türkçe (implementer yazar; ton: kısa, doğal, "ben" dili). `lib/messages.test.ts` parite testi geçmeli.

- [ ] **Step 6: Mevcut içerik ve testleri uyarla**

`content/projects/geotrack.meta.json`: `cover` → `{ "type": "image", "src": "/media/geotrack/cover", "frame": "phone" }` (Task 3 dosyayı üretir; o zamana kadar build görsel yokluğunda kırılmaz, `<img>` 404 olur — Task 3 kapatır). `merge.test.ts` ve `facets.test.ts` fixture'larını yeni şemaya uyarla.

- [ ] **Step 7: Doğrula ve commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat(content): schema v2 (optional cover, client/credits/live), timeline, services, events, page messages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Görsel malzeme pipeline'ı ve varlıklar

**Files:**
- Create: `scripts/media.ts`, `scripts/media.test.ts`, `public/media/**` (üretilen), `media-src/README.md`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Produces: `pnpm media` → `media-src/<group>/<name>.{jpg,png,webp}` kaynaklarını `public/media/<group>/<name>-{640,1280,1920}.webp` olarak üretir (en-boy korunur, 640 altı kaynaklar büyütülmez, `quality 78`). `media-src/` commit'lenir (küçük tutulur: ≤ 2 MB/dosya); üretilen `public/media` de commit'lenir (Vercel'de script çalışmaz). Video: `media-src/<group>/<name>.mp4` için script **ffmpeg varsa** `cover.mp4` (720p, crf 28, faststart) + `cover.webm` (VP9 crf 34) + `poster-1280.webp` üretir; ffmpeg yoksa uyarı basar ve video adımını atlar.
- Varlıklar: `events/devfest-izmir-24`, `events/gymai-thesis-2025`, `events/devfest-denizli-25` (banner kırpımı), `gymai/poster` (tez posteri tam), `gymai/cover` (posterdeki üç telefon ekranı kırpımı, `frame: "none"`), `karaoke-sync/cover.{mp4,webm}` + poster, `geotrack/cover` (simülatör ekran görüntüsü; alınamazsa `TypoCover`'a düşmek için meta'dan `cover` kaldırılır), `about/portrait` (kullanıcı verirse), `cv/Emin_Dundar_CV_{en,tr}.pdf`.

- [ ] **Step 1: Script testi (başarısız)**

`scripts/media.test.ts` (`// @vitest-environment node`):
```ts
import { describe, it, expect } from "vitest";
import { targetSizes, outputName } from "./media";

describe("media script helpers", () => {
  it("never upscales: picks only sizes <= source width, at least the smallest", () => {
    expect(targetSizes(500)).toEqual([640]);
    expect(targetSizes(1000)).toEqual([640]);
    expect(targetSizes(1300)).toEqual([640, 1280]);
    expect(targetSizes(4032)).toEqual([640, 1280, 1920]);
  });
  it("builds output names", () => {
    expect(outputName("cover", 1280)).toBe("cover-1280.webp");
  });
});
```
`pnpm test` → FAIL.

- [ ] **Step 2: `scripts/media.ts`**

```ts
import { readdirSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import { execFileSync } from "node:child_process";

export const SIZES = [640, 1280, 1920] as const;
export function targetSizes(srcWidth: number): number[] {
  const fit = SIZES.filter((w) => w <= srcWidth);
  return fit.length ? fit : [SIZES[0]];
}
export function outputName(base: string, width: number) {
  return `${base}-${width}.webp`;
}

async function run() {
  const sharp = (await import("sharp")).default;
  const srcRoot = "media-src";
  const outRoot = join("public", "media");
  const hasFfmpeg = (() => { try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; } })();

  for (const group of readdirSync(srcRoot)) {
    const gdir = join(srcRoot, group);
    if (!statSync(gdir).isDirectory()) continue;
    mkdirSync(join(outRoot, group), { recursive: true });
    for (const file of readdirSync(gdir)) {
      const { name, ext } = parse(file);
      const src = join(gdir, file);
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase())) {
        const meta = await sharp(src).metadata();
        for (const w of targetSizes(meta.width ?? 0)) {
          const out = join(outRoot, group, outputName(name, w));
          if (existsSync(out)) continue;
          await sharp(src).rotate().resize({ width: w }).webp({ quality: 78 }).toFile(out);
          console.log("img", out);
        }
      } else if (ext.toLowerCase() === ".mp4") {
        if (!hasFfmpeg) { console.warn("ffmpeg missing, skip", src); continue; }
        const mp4 = join(outRoot, group, `${name}.mp4`);
        const webm = join(outRoot, group, `${name}.webm`);
        const poster = join(outRoot, group, "poster-1280.webp");
        if (!existsSync(mp4)) execFileSync("ffmpeg", ["-y", "-i", src, "-vf", "scale=-2:720", "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-an", "-movflags", "+faststart", mp4]);
        if (!existsSync(webm)) execFileSync("ffmpeg", ["-y", "-i", src, "-vf", "scale=-2:720", "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-an", webm]);
        if (!existsSync(poster)) execFileSync("ffmpeg", ["-y", "-ss", "1", "-i", src, "-frames:v", "1", "-vf", "scale=1280:-2", poster]);
        console.log("video", mp4, webm, poster);
      }
    }
  }
}

if (process.argv[1]?.endsWith("media.ts")) run().catch((e) => { console.error(e); process.exit(1); });
```

`package.json`: `"media": "tsx scripts/media.ts"`; devDependencies `sharp`, `tsx`. `pnpm-workspace.yaml` `ignoredBuiltDependencies` listesinden `sharp`'ı **çıkar** (prebuilt `@img/*` paketleri gelsin). `.gitignore`'a bir şey eklenmez (üretilenler commit'lenir).

- [ ] **Step 3: Kaynakları yerleştir**

```bash
mkdir -p media-src/events media-src/gymai media-src/karaoke-sync media-src/geotrack media-src/about public/cv
cp ~/Desktop/Devfestler/IMG_3213.jpeg media-src/events/devfest-izmir-24.jpg
cp ~/Desktop/Devfestler/IMG_4354.jpeg media-src/events/gymai-thesis-2025.jpg
# DevFest Denizli: sadece banner bölgesi (yüz yok). Kaynak 4032x3024; banner yaklaşık x:1200..2900, y:2700..3900 — sips ile kırp:
sips -c 1300 1700 --cropOffset 2600 1200 ~/Desktop/Devfestler/IMG_6844.jpeg --out media-src/events/devfest-denizli-25.jpg
cp ~/Desktop/Devfestler/karaokeApp.mp4 media-src/karaoke-sync/cover.mp4
cp "/private/tmp/claude-501/-Users-emindundar-ProjeBelgeleri-Portfolyo/5763f6a4-285c-4943-bb33-0544e200f379/images/1.jpg" media-src/gymai/poster.jpg
cp ~/Downloads/Emin_DUNDAR_CV_Eng.pdf public/cv/Emin_Dundar_CV_en.pdf
cp "/Users/emindundar/Library/Mobile Documents/com~apple~CloudDocs/Cv/Emin_DÜNDAR_CV.pdf" public/cv/Emin_Dundar_CV_tr.pdf
```
Kırpma sonrası `media-src/events/devfest-denizli-25.jpg`'i görüntüleyip yüz olmadığını doğrula (gerekirse ofseti ayarla). Tez posterinden telefon ekranları: `sips -c` ile posterin "EKRAN GÖRÜNTÜLERİ" bölgesini (yaklaşık x:0..370, y:590..830 orijinal 746x1054 ölçeğinde) `media-src/gymai/cover.jpg` olarak kırp.

GeoTrack ekran görüntüsü: `~/ProjeBelgeleri/Map App/maptracking` Flutter projesini iOS Simulator'da çalıştırmayı **en fazla 15 dk** dene (`flutter pub get && flutter run -d <sim>`; harita OSM ile backend'siz açılmalı). Açılırsa harita ekranının ekran görüntüsünü `media-src/geotrack/cover.png` olarak al (`xcrun simctl io booted screenshot`). Açılmazsa `geotrack.meta.json`'dan `cover`'ı kaldır ve raporda neden yazmadığını belirt. Kipgöz, Bio-Astral, NotifyX için bu fazda deneme yok (backend/Firebase bağımlı); `cover` yok → `TypoCover`.

- [ ] **Step 4: Üret ve doğrula**

```bash
pnpm install && pnpm media && ls -R public/media | head -40 && du -sh public/media
```
Beklenen: her görsel için 1–3 webp; karaoke için mp4 (≤ 4 MB) + webm + poster. `public/media` toplamı ≤ 15 MB. `cover.mp4` 4 MB'ı aşarsa `crf 30` ile yeniden üret.

`media-src/README.md`: kaynak kuralları (boyut, isimlendirme, `pnpm media`).

- [ ] **Step 5: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A && git commit -m "feat(media): sharp/ffmpeg asset pipeline; event, thesis, karaoke, CV assets

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Yedi vaka çalışması (meta + EN + TR)

**Files:**
- Create/Modify: `content/projects/{geotrack,gymai,bio-astral,karaoke-sync,notifyx,kipgoz,cursor-notion-mcp}.{meta.json,en.mdx,tr.mdx}`
- Test: `content/projects.test.ts` (yeni)

**Interfaces:**
- Produces: 7 proje; `featured`: geotrack, gymai, karaoke-sync, kipgoz; `order` 1..7 bu sırayla: geotrack, kipgoz, gymai, karaoke-sync, bio-astral, notifyx, cursor-notion-mcp.
- Consumes: Task 2 şeması, Task 3 varlıkları.

**Kaynak metinler** (CV + README + poster; implementer bunlardan yazar, kopyalamaz):

- **geotrack** — facets `mobile, backend`; stack Flutter, Riverpod, flutter_map, OSRM, Nominatim, Geolocator, Node.js (Express → NestJS), PostgreSQL, JWT; year 2026; role solo; links repo `map_tracking`, `map_tracking_backend`, `map-tracking-admin-app`. Problem: saha ekiplerinin (araç/personel) canlı takibi, Google Maps ücretleri olmadan. Mimari: MVVM + Riverpod; harita durumu (navigasyon, arama, rota) modüler; OSRM ile rota, Nominatim ile geocoding; backend JWT auth, rol (admin/user), PostgreSQL; ayrı admin uygulaması. Kararlar: Google Maps yerine OSM+OSRM (maliyet, bağımlılık); Geolocator stream'lerini batarya için seyreltme; flutter_map_animations ile akıcı kamera. Sonuç: ücretsiz harita yığını, kesintisiz canlı takip, admin paneli. Metrik yok → "öğrenilen" satırı.
- **kipgoz** — facets `mobile, backend, data-erp`; stack Flutter, NestJS, Prisma, PostgreSQL 16, Docker Compose, Swagger; year 2026; role solo; client "Bir özel eğitim kurumu" (`client` alanı EN: "A special-education institution", TR'de aynı anlam — meta tek dil olduğundan `client` EN yazılır ve MDX gövdesinde TR karşılığı verilir); links yok (repo private). Problem: özel eğitim kurumunda öğrenci → BEP (bireyselleştirilmiş eğitim programı) → hedef → kayıt zinciri Excel/kâğıtta dağınık. Mimari: üç bağımsız katman (Flutter → HTTP/JSON → NestJS → Prisma → PG), Swagger'dan üretilen istemci. Kararlar: NestJS (modül disiplini), Prisma (şema tek doğru kaynak), Docker (VPS'te aynı dosya). Sonuç: 44 commit'lik mobil uygulama, API iskeleti; devam eden iş.
- **gymai** — facets `mobile, ai`; stack Flutter, Firebase Auth, Firestore, Google Gemini API, QR; year 2025; role lead (iki kişilik ekip); `credits`: "B.Sc. thesis, Pamukkale University MIS (2025), with Beyzanur Eren; advisor Assoc. Prof. Ömer Güleç"; cover image `/media/gymai/cover` frame none; links yok. Problem (posterden): salon yoğunluğu, karmaşıklık, takipsizlik. Çözüm: hedefe göre Gemini ile kişisel program; makinedeki QR ile egzersiz videosu + süre/set/tekrar kaydı; chatbot ile egzersiz analizi ve soru; anlık doluluk ve randevu. Kararlar: statik şablon yerine prompt mühendisliği ile dinamik program; QR ile "phygital"; Firestore gerçek zamanlı kapasite. Sonuç (poster): planlı antrenman, kişiye özel program, motivasyon, sakatlanma riski azalması (iddia; "tez bulgusu" diye etiketle).
- **karaoke-sync** — facets `web, backend`; stack Next.js, TypeScript, Cloudflare R2, Web Audio API, Docker, rate limiting; year 2025; role solo; links repo `evreka_karaoke`, live `https://evrekakaraoke.vercel.app`; cover video `/media/karaoke-sync/cover` frame browser. Problem: şarkı sözü-ses senkronu ve medya dağıtımı. Mimari: R2'den medya; LRC parser + LyricsFlow senkron motoru; mikrofon dalga formu ve puanlama (videodan görülüyor). Kararlar: hazır kütüphane yerine özel parser (ms hassasiyet); R2 (maliyet, gecikme); uygulama katmanında rate limit. Sonuç: canlı demo, ms hassas senkron.
- **bio-astral** — facets `mobile, backend`; stack Flutter, Riverpod, Node.js/TypeScript, Express, Docker, Swiss Ephemeris, HealthKit, Google Fit; year 2026; role solo; links repo `astro-biometric-life-radar`, `astro_backend`. Problem: astronomik hesap mobilde ağır; iki sağlık kaynağı tutarsız. Mimari: hesap Dockerize mikroservise; Repository Pattern ile tek biyometrik arayüz. Kararlar: hesabı sunucuya taşıma (%40 yük azalması — CV iddiası, "ölçüm: cihaz profili" notuyla); Clean Architecture. Sonuç: tutarlı veri katmanı, hafif istemci.
- **notifyx** — facets `mobile, backend`; stack Flutter, Firebase FCM, Auth, Cloud Functions, WebView bridge, Riverpod; year 2025; role solo; links repo `notification_app`. Problem: mevcut web altyapısındaki dosya yönetimini native yeniden yazmadan mobile taşımak; rol bazlı push. Mimari: güvenli WebView bridge; bildirim mantığı Cloud Functions'ta; token tabanlı, Repository Pattern ile soyutlanmış auth. Kararlar: hibrit (hız), serverless (istemci yükü). Sonuç: rol bazlı güvenilir push, tek kod tabanında çoklu kullanıcı tipi.
- **cursor-notion-mcp** — facets `ai`; stack Python, MCP, Notion API, Git; year 2026; role solo; links repo `cursor-notion-mcp`; cover yok. Problem: kod yazarken fikir/görev/snippet'i IDE'den çıkmadan Notion'a kaydetmek, günlük raporu git'ten üretmek. Mimari: MCP sunucusu; araçlar: kaydet, ara, görev ekle, `git log/diff` özeti. Kararlar: MCP (araç standardı), Notion (zaten kullanılan). Sonuç: 5 dk kurulum, IDE içinden hafıza.

- [ ] **Step 1: Bütünlük testi (başarısız)**

`content/projects.test.ts` (`// @vitest-environment node`):
```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = "content/projects";
const slugs = [...new Set(readdirSync(dir).map((f) => f.split(".")[0]))];

describe("project content integrity", () => {
  it("has exactly seven projects", () => {
    expect(slugs.sort()).toEqual(["bio-astral", "cursor-notion-mcp", "geotrack", "gymai", "karaoke-sync", "kipgoz", "notifyx"]);
  });
  it.each(slugs)("%s has meta, en and tr files", (slug) => {
    for (const f of [`${slug}.meta.json`, `${slug}.en.mdx`, `${slug}.tr.mdx`]) expect(existsSync(join(dir, f)), f).toBe(true);
  });
  it.each(slugs)("%s mdx bodies use the fixed section headings in order", (slug) => {
    const en = readFileSync(join(dir, `${slug}.en.mdx`), "utf8");
    const tr = readFileSync(join(dir, `${slug}.tr.mdx`), "utf8");
    const heads = (s: string) => [...s.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    expect(heads(en)).toEqual(["Problem", "Role", "Architecture", "Decisions", "Outcome"]);
    expect(heads(tr)).toEqual(["Problem", "Rol", "Mimari", "Kararlar", "Sonuç"]);
  });
  it.each(slugs)("%s cover assets exist when declared", (slug) => {
    const meta = JSON.parse(readFileSync(join(dir, `${slug}.meta.json`), "utf8"));
    if (!meta.cover) return;
    const base = join("public", meta.cover.src.replace(/^\//, ""));
    if (meta.cover.type === "image") expect(existsSync(`${base}-640.webp`), `${base}-640.webp`).toBe(true);
    else { expect(existsSync(`${base}.mp4`)).toBe(true); expect(existsSync(join("public", "media", slug, "poster-1280.webp"))).toBe(true); }
  });
});
```
`pnpm test` → FAIL (eksik projeler).

- [ ] **Step 2: İçeriği yaz**

Her vaka için `meta.json` (şema v2), `en.mdx` ve `tr.mdx`. Frontmatter `title`, `summary` (≤ 240 karakter), opsiyonel `metrics` (sadece gerçek sayılar: kipgoz `{"label":"Commits","value":"44"}`; karaoke `{"label":"Sync accuracy","value":"ms-level"}` gibi nitel ifadeler **metrics'e girmez**, gövdede kalır). Gövde: beş `##` bölüm; "Decisions" maddeleri "X yerine Y çünkü Z". İddialar (yüzde, "binlerce") CV'den geliyorsa gövdede "(CV'de belirtilen ölçüm)" gibi değil, doğal cümleyle ve abartısız. TR metin EN'in çevirisi değil, doğal yazım.

- [ ] **Step 3: Doğrula ve commit**

```bash
pnpm content:build && pnpm test && pnpm build
git add -A && git commit -m "content: seven case studies (en/tr) with schema v2 metadata

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Paylaşılan bileşenler — `MediaCover`, `TypoCover`, `DeviceFrame`, `FlowDiagram`, `Metrics`, MDX haritası

**Files:**
- Create: `components/ui/TypoCover.tsx`, `components/ui/TypoCover.test.tsx`, `components/ui/DeviceFrame.tsx`, `components/ui/FlowDiagram.tsx`, `components/ui/FlowDiagram.test.tsx`, `components/ui/Metrics.tsx`, `components/media/MediaCover.tsx`, `components/media/VideoCover.tsx`, `components/media/VideoCover.test.tsx`, `components/mdx/components.tsx`, `lib/media.ts`, `lib/media.test.ts`
- Modify: `components/mdx/MDXContent.tsx`

**Interfaces:**
- Produces:
  - `srcSetFor(base: string, widths = [640,1280,1920]): { src: string; srcSet: string }` (`lib/media.ts`); `sizesFor(kind: "list"|"hero")`.
  - `<MediaCover project={Project} kind="list"|"hero" priority? />` (sunucu): `cover` yoksa `TypoCover`; image → `<img>` srcset; video → `<VideoCover>` (client) + `DeviceFrame` sarmalaması `frame`'e göre.
  - `<VideoCover base poster frame />` (client): reduced-motion'da sadece `<img poster>`; aksi halde `<video muted playsInline loop preload="metadata">` + `<source webm>` + `<source mp4>`; IntersectionObserver (`createVisibilityController` yeniden kullanılır — `components/canvas/visibility.ts`'ten `components/media/visibility.ts`'e taşınmaz, import edilir) ile `play()/pause()`.
  - `<TypoCover slug year facets title />`: dev mono slug, yıl, facet'ler; `aspect-[4/3]`, `border-line`, `bg-surface`.
  - `<DeviceFrame frame="phone"|"browser"|"none">children</DeviceFrame>`: CSS-only çerçeve, köşe 0, 1px çizgi; phone 9:19.5, browser üst çubuk üç kare (yuvarlak değil).
  - `<FlowDiagram steps={string[]} />`: yatay kutular + `→`, mobilde dikey; inline SVG değil, HTML (erişilebilir `<ol>`); `aria-label`.
  - `<Metrics items={{label,value}[]} />`: mono grid.
  - `components/mdx/components.tsx`: `{ FlowDiagram, Metrics, DeviceFrame }` + `a` (`Link`/harici `rel`), `h2` (id slug), `ul/ol/p` token sınıfları. `MDXContent` bunları varsayılan olarak geçer.

- [ ] **Step 1: Başarısız testler**

`lib/media.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { srcSetFor, sizesFor } from "./media";
describe("srcSetFor", () => {
  it("builds src and srcSet from a base path", () => {
    expect(srcSetFor("/media/a/cover")).toEqual({
      src: "/media/a/cover-1280.webp",
      srcSet: "/media/a/cover-640.webp 640w, /media/a/cover-1280.webp 1280w, /media/a/cover-1920.webp 1920w",
    });
  });
  it("sizes differ by kind", () => {
    expect(sizesFor("list")).toBe("(min-width: 768px) 40vw, 100vw");
    expect(sizesFor("hero")).toBe("100vw");
  });
});
```
`components/ui/TypoCover.test.tsx`: `render(<TypoCover slug="x" year={2026} facets={["ai"]} title="T" />)` → slug, yıl ve "ai" metinleri var; `aria-hidden` olmayan bir `figure` ve `figcaption` ile başlık.
`components/ui/FlowDiagram.test.tsx`: 3 adım → `ol` altında 3 `li`, aralarda `aria-hidden` ok.
`components/media/VideoCover.test.tsx`: `vi.mock("@/components/motion/useReducedMotion")` true → `video` yok, `img` var; false → `video` var, `source` ×2 (webm önce), `muted`/`playsInline`/`loop` attribute'ları; IO stub (Faz 1a `visibility.test`'teki gibi) görünür → `play` çağrıldı (HTMLMediaElement.prototype.play `vi.fn()` ile stub), görünmez → `pause`.

`pnpm test` → FAIL.

- [ ] **Step 2: Uygula**

`lib/media.ts`:
```ts
export const WIDTHS = [640, 1280, 1920] as const;
export function srcSetFor(base: string, widths: readonly number[] = WIDTHS) {
  return { src: `${base}-1280.webp`, srcSet: widths.map((w) => `${base}-${w}.webp ${w}w`).join(", ") };
}
export function sizesFor(kind: "list" | "hero") {
  return kind === "list" ? "(min-width: 768px) 40vw, 100vw" : "100vw";
}
export function posterFor(slug: string) { return `/media/${slug}/poster-1280.webp`; }
```

`components/media/VideoCover.tsx`:
```tsx
"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { createVisibilityController } from "@/components/canvas/visibility";

type Props = { base: string; poster: string; alt: string; className?: string };

export function VideoCover({ base, poster, alt, className }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const ctl = createVisibilityController(v, (visible) => {
      if (visible) void v.play().catch(() => {});
      else v.pause();
    });
    return () => ctl.dispose();
  }, [reduced]);

  if (reduced) return <img src={poster} alt={alt} className={className} width={1280} height={720} loading="lazy" decoding="async" />;
  return (
    <video ref={ref} className={className} muted playsInline loop preload="metadata" poster={poster} aria-label={alt} width={1280} height={720}>
      <source src={`${base}.webm`} type="video/webm" />
      <source src={`${base}.mp4`} type="video/mp4" />
    </video>
  );
}
```
Not: `createVisibilityController` `components/canvas` altında; `components/media` oradan import eder (ESLint sınırı sadece paketleri kısıtlar).

`components/media/MediaCover.tsx` (sunucu):
```tsx
import type { Project } from "@/lib/content";
import { srcSetFor, sizesFor, posterFor } from "@/lib/media";
import { DeviceFrame } from "@/components/ui/DeviceFrame";
import { TypoCover } from "@/components/ui/TypoCover";
import { VideoCover } from "./VideoCover";

export function MediaCover({ project, kind, priority = false }: { project: Project; kind: "list" | "hero"; priority?: boolean }) {
  const c = project.cover;
  if (!c) return <TypoCover slug={project.slug} year={project.year} facets={project.facets} title={project.title} />;
  const alt = project.title;
  const inner =
    c.type === "video" ? (
      <VideoCover base={c.src} poster={posterFor(project.slug)} alt={alt} className="block h-auto w-full" />
    ) : (
      <img {...srcSetFor(c.src)} sizes={sizesFor(kind)} alt={alt} width={1280} height={960} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"} className="block h-auto w-full" />
    );
  return <DeviceFrame frame={c.frame}>{inner}</DeviceFrame>;
}
```
Image `height` oranı: kapak kaynakları 4:3 veya 16:9 olabilir; `DeviceFrame` dış kutu `aspect-*` verir, `img` `object-cover`. `width/height` CLS için yaklaşık; `DeviceFrame` sabit oran sağlar.

`TypoCover`, `DeviceFrame`, `FlowDiagram`, `Metrics` — token'larla, köşe 0; kod implementer'da, testler sınır çizer.

`components/mdx/components.tsx` ve `MDXContent` güncellemesi (components prop varsayılanı `mdxComponents`).

- [ ] **Step 3: Doğrula ve commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat(ui): media cover (img srcset / IO video), typo cover, device frame, flow diagram, metrics, MDX components

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `/work` — liste, facet filtresi, Flip, hover preview

**Files:**
- Create: `app/[locale]/work/page.tsx`, `components/work/WorkFilter.tsx`, `components/work/WorkList.tsx`, `components/work/WorkList.impl.tsx`, `components/work/HoverPreview.tsx`, `components/work/HoverPreview.impl.tsx`, `lib/content/filter.ts`, `lib/content/filter.test.ts`, `e2e/work.spec.ts`
- Modify: `messages/*.json` (Task 2'de eklendi), `app/globals.css` (Flip için `will-change` yok)

**Interfaces:**
- Produces: `parseFacet(q: string | undefined): Facet | null`, `filterProjects(projects, facet | null)` (`lib/content/filter.ts`). Sayfa: `searchParams` okur (`await searchParams` — `cacheComponents` altında **dinamik**: sayfa `Suspense` ile sarılır; liste kısmı dinamik, başlık statik). `WorkFilter` (sunucu): `Link` chip'leri (`/work`, `/work?f=…`), aktif chip `aria-pressed="true"` (chip'ler `<a role="button">` değil; `Link` + `aria-current="page"` kullan — chip semantiği için `aria-current`). `WorkList` (sarmalayıcı, Faz 1a deseni) + `WorkList.impl` (Flip: filtre değişiminde `Flip.getState("[data-work-item]")` → `Flip.from(state, { duration: 0.5, ease: "expo.inOut", absolute: true, onEnter/onLeave fade })`; `gsap/Flip` impl içinde import, `lib/motion.ts`'e `Flip` kaydı eklenir). `HoverPreview`: pointer:fine ve motion'da, satır hover'ında kapak görselini imleci takip eden yüzen kutuda gösterir (`quickTo`), kapaksız projede yok.
- Consumes: `getProjects`, `MediaCover`, `SectionHeader`, `facetCounts`, `FACET_LABEL_KEYS`.

- [ ] **Step 1: Birim testler (başarısız)**

`lib/content/filter.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseFacet, filterProjects } from "./filter";
import type { Project } from "./merge";
const p = (slug: string, facets: Project["facets"]): Project => ({ slug, facets, stack: [], year: 2026, role: "solo", featured: false, order: 1, links: {}, title: slug, summary: "", code: "", locale: "en", fallback: false }) as Project;
describe("parseFacet", () => {
  it("accepts known facets only", () => {
    expect(parseFacet("ai")).toBe("ai");
    expect(parseFacet("data-erp")).toBe("data-erp");
    expect(parseFacet("nope")).toBeNull();
    expect(parseFacet(undefined)).toBeNull();
  });
});
describe("filterProjects", () => {
  it("returns all for null, filtered otherwise, keeps order", () => {
    const all = [p("a", ["ai"]), p("b", ["mobile"]), p("c", ["ai", "web"])];
    expect(filterProjects(all, null).map((x) => x.slug)).toEqual(["a", "b", "c"]);
    expect(filterProjects(all, "ai").map((x) => x.slug)).toEqual(["a", "c"]);
  });
});
```

- [ ] **Step 2: Uygula**

`app/[locale]/work/page.tsx`:
```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getProjects } from "@/lib/content";
import { parseFacet, filterProjects } from "@/lib/content/filter";
import { WorkFilter } from "@/components/work/WorkFilter";
import { WorkList } from "@/components/work/WorkList";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ f?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Work" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor("/work", locale) };
}

async function List({ params, searchParams }: Props) {
  const { locale } = await params;
  const { f } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  const facet = parseFacet(f);
  const all = getProjects(locale);
  const items = filterProjects(all, facet);
  return (
    <>
      <WorkFilter active={facet} projects={all} />
      <WorkList items={items} facet={facet} />
    </>
  );
}

export default async function WorkPage(props: Props) {
  const t = await getTranslations("Work");
  return (
    <main className="px-4 py-12 md:px-6">
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("description")}</p>
      <Suspense fallback={<div className="mt-12 border-t border-line pt-6 font-mono text-muted">…</div>}>
        <List {...props} />
      </Suspense>
    </main>
  );
}
```
`cacheComponents` altında `searchParams` okuyan bölüm `Suspense` içinde olmalı; build çıktısında `/[locale]/work` kısmi statik (shell) + dinamik liste görünür. Build "needs Suspense" hatası verirse tam olarak bu yapıyı kullan.

`WorkFilter`: `FACETS` chip'leri + "All"; sayımlar `facetCounts(all)`; `flex-wrap gap-2`; her chip `Link` (`href={{ pathname: "/work", query: f ? { f } : undefined }}`), aktifte `aria-current="page"`, `bg-fg text-bg`, pasifte `border-line`; `min-h-11`.

`WorkList` (sarmalayıcı): `<ol data-work-list>` içinde her proje `<li data-work-item data-slug>`; satır: numara (mono), başlık (display), meta (yıl — facet etiketleri), `MediaCover kind="list"` yalnızca `md:` ızgarada sağ sütunda (listede küçük kapak); `Link` `/work/[slug]` `transitionTypes={["nav-forward"]}` (next-intl Link rest prop'u geçirir; tip hatası olursa `as never` değil — `next/link` `LinkProps` genişletilmiş mi kontrol et; geçmezse `transitionTypes`'ı atla ve raporla). `key` olarak `facet ?? "all"` **verme** (Flip aynı DOM'u ister); liste yeniden render'da öğeler kalır/çıkar.

`WorkList.impl.tsx`: `facet` değişmeden önce `Flip.getState(items)` almak için `useLayoutEffect` + önceki `facet` ref'i; React yeniden render'ı DOM'u değiştirdikten sonra `Flip.from(state, { duration: 0.5, ease: "expo.inOut", absolute: true, onEnter: els => gsap.fromTo(els, {opacity:0, y:16}, {opacity:1, y:0, duration:0.4}), onLeave: els => gsap.to(els, {opacity:0, duration:0.2}) })`. Not: Next'te `searchParams` değişimi sunucu yeniden render'ı → RSC payload; DOM öğeleri yeniden yaratılabilir. Flip `targets`'ı `data-slug` ile eşler (`Flip.getState(".., { props: ... })` yerine `Flip.from(state, { targets: "[data-work-item]" })`), yeni DOM'da aynı `data-flip-id={slug}` ile eşleşme sağlanır — `data-flip-id` kullan.

`HoverPreview` + impl: `(pointer:fine)` ve motion'da; `[data-work-item]` hover'ında `project.cover` varsa sabit konumlu `div` içine `<img src 640>` koyar, `quickTo` ile takip; reduced-motion/coarse'ta render yok.

- [ ] **Step 3: e2e**

`e2e/work.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("/work", () => {
  test("lists all seven projects with numbered rows", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("[data-work-item]")).toHaveCount(7);
    await expect(page.locator("[data-work-item]").first()).toContainText("01");
  });
  test("URL filter narrows the list server-side (no JS needed)", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/en/work?f=ai");
    await expect(page.locator("[data-work-item]")).toHaveCount(2); // gymai, cursor-notion-mcp
    await expect(page.getByRole("link", { name: /^AI/ })).toHaveAttribute("aria-current", "page");
    await ctx.close();
  });
  test("chip click updates URL and list; browser back restores", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
    await page.getByRole("link", { name: /^Mobile/ }).click();
    await expect(page).toHaveURL(/\/en\/work\?f=mobile$/);
    await expect(page.locator("[data-work-item]")).toHaveCount(5);
    await page.goBack();
    await expect(page).toHaveURL(/\/en\/work$/);
    await expect(page.locator("[data-work-item]")).toHaveCount(7);
  });
  test("unknown facet falls back to all", async ({ page }) => {
    await page.goto("/en/work?f=blockchain");
    await expect(page.locator("[data-work-item]")).toHaveCount(7);
  });
  test("row links to the case page", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("[data-work-item]").first().getByRole("link").first()).toHaveAttribute("href", /\/en\/work\/geotrack$/);
  });
  test("reduced motion: items visible, no hover preview", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    const hidden = await page.locator("[data-work-item]").evaluateAll((els) => els.filter((e) => Number(getComputedStyle(e).opacity) < 1).length);
    expect(hidden).toBe(0);
    await expect(page.locator("[data-hover-preview]")).toHaveCount(0);
  });
});
```
Facet sayıları (mobile 5: geotrack, kipgoz, gymai, bio-astral, notifyx; ai 2) Task 4 verisine göre; değişirse testi veriye göre güncelle, veriyi teste göre değil.

- [ ] **Step 4: Doğrula ve commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm exec playwright test e2e/work.spec.ts
git add -A && git commit -m "feat(work): project index with URL facet filter, Flip reorder and hover preview

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: `/work/[slug]` — vaka sayfası, ViewTransition, prev/next

**Files:**
- Create: `app/[locale]/work/[slug]/page.tsx`, `components/case/CaseHeader.tsx`, `components/case/CaseAside.tsx`, `components/case/CaseNav.tsx`, `e2e/case.spec.ts`
- Modify: `app/globals.css` (view-transition CSS), `components/work/WorkList.tsx` (kapak `ViewTransition name`)

**Interfaces:**
- Produces: `generateStaticParams` (locale × slug), `generateMetadata` (title = proje başlığı, description = summary, alternates `/work/<slug>`), sayfa: `<main>` → `CaseHeader` (eyebrow: yıl — facet'ler — rol; `h1` başlık; summary; `MediaCover kind="hero" priority`), iki sütun: `MDXContent` (gövde) + `CaseAside` (stack, client, credits, links, metrics), `CaseNav` (önceki/sonraki `order`'a göre, `transitionTypes` back/forward), `fallback` ise `Case.fallbackNote` banner'ı (`role="note"`). Kapak `ViewTransition name={`cover-${slug}`} share="morph" default="none"` hem listede hem detayda.
- Consumes: Task 5 bileşenleri, Task 4 içerik.

- [ ] **Step 1: Sayfa ve bileşenler**

`app/[locale]/work/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getProjects, getProject } from "@/lib/content";
import { MDXContent } from "@/components/mdx/MDXContent";
import { MediaCover } from "@/components/media/MediaCover";
import { CaseHeader } from "@/components/case/CaseHeader";
import { CaseAside } from "@/components/case/CaseAside";
import { CaseNav } from "@/components/case/CaseNav";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getProjects(locale).map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const p = getProject(locale, slug);
  if (!p) return {};
  return { title: p.title, description: p.summary, alternates: alternatesFor(`/work/${slug}`, locale) };
}

export default async function CasePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const all = getProjects(locale);
  const idx = all.findIndex((p) => p.slug === slug);
  if (idx === -1) notFound();
  const project = all[idx]!;
  const t = await getTranslations("Case");

  return (
    <main className="px-4 py-12 md:px-6">
      {project.fallback && <p role="note" className="mb-6 border border-line px-3 py-2 font-mono text-sm text-muted">{t("fallbackNote")}</p>}
      <CaseHeader project={project} />
      <ViewTransition name={`cover-${project.slug}`} share="morph" default="none">
        <div className="mt-8"><MediaCover project={project} kind="hero" priority /></div>
      </ViewTransition>
      <div className="mt-12 grid gap-12 md:grid-cols-12">
        <article className="prose-brutal md:col-span-8"><MDXContent code={project.code} /></article>
        <CaseAside project={project} className="md:col-span-4" />
      </div>
      <CaseNav prev={all[idx - 1]} next={all[idx + 1]} />
    </main>
  );
}
```
`.prose-brutal` sınıfı `globals.css` `@layer components` içinde: `h2` mono numara yok, `font-display text-3xl mt-12 mb-4 border-t border-line pt-4`; `p` `leading-relaxed`; `ul` `list-['—'] pl-6`; `a` `underline decoration-accent`.

`globals.css` view-transition kuralları (Next kılavuzundan): `::view-transition { pointer-events: none }`, `::view-transition-group(.morph) { animation-duration: 400ms }`, header sabit (`Nav` `style={{ viewTransitionName: "site-header" }}` + `::view-transition-group(site-header){animation:none}` …), reduced-motion'da tüm `::view-transition-*` süreleri 0.

- [ ] **Step 2: e2e**

`e2e/case.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test.describe("/work/[slug]", () => {
  test("renders template sections and aside", async ({ page }) => {
    await page.goto("/en/work/geotrack");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("GeoTrack");
    for (const h of ["Problem", "Role", "Architecture", "Decisions", "Outcome"]) await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
    await expect(page.getByRole("link", { name: /repository/i }).first()).toHaveAttribute("href", /github\.com\/emindundar\/map_tracking/);
  });
  test("case without cover shows the typographic cover", async ({ page }) => {
    await page.goto("/en/work/cursor-notion-mcp");
    await expect(page.locator("[data-typo-cover]")).toHaveCount(1);
    await expect(page.locator("img, video")).toHaveCount(0);
  });
  test("video cover: reduced motion shows poster only; motion shows video", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/work/karaoke-sync");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("video")).toHaveCount(0);
    await expect(page.locator("img[src*='poster-1280']")).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en/work/karaoke-sync");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    await expect(page.locator("video")).toHaveCount(1);
  });
  test("prev/next navigation follows order", async ({ page }) => {
    await page.goto("/en/work/geotrack");
    await expect(page.getByRole("link", { name: /next/i })).toHaveAttribute("href", /\/en\/work\/kipgoz$/);
    await expect(page.getByRole("link", { name: /previous/i })).toHaveCount(0);
  });
  test("turkish case renders Turkish headings and credits for gymai", async ({ page }) => {
    await page.goto("/tr/work/gymai");
    await expect(page.getByRole("heading", { level: 2, name: "Kararlar" })).toBeVisible();
    await expect(page.getByText(/Pamukkale/)).toBeVisible();
  });
  test("unknown slug is 404", async ({ page }) => {
    const res = await page.goto("/en/work/nope");
    expect(res?.status()).toBe(404);
  });
});
```

- [ ] **Step 3: Doğrula ve commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm exec playwright test e2e/case.spec.ts e2e/work.spec.ts
git add -A && git commit -m "feat(case): case study page with MDX template, aside, prev/next and cover view transition

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: `/about` — zaman çizelgesi, sertifikalar, nasıl çalışırım, topluluk & etkinlikler, CV

**Files:**
- Create: `app/[locale]/about/page.tsx`, `app/[locale]/cv/route.ts`, `components/about/Timeline.tsx`, `components/about/Certificates.tsx`, `components/about/HowIWork.tsx`, `components/about/EventsStrip.tsx`, `components/about/AboutHero.tsx`, `lib/format.ts`, `lib/format.test.ts`, `e2e/about.spec.ts`

**Interfaces:**
- Produces: `formatRange(from, to, locale)` → "Feb 2026 — Present" / "Şub 2026 — Devam"; `formatCoords(lat,lng)` → "38.4514°N 27.1705°E" (`lib/format.ts`). `/cv/route.ts`: `GET` → 302 `/cv/Emin_Dundar_CV_<locale>.pdf`. `AboutHero`: `h1` + intro + portre (varsa `/media/about/portrait-{640,1280}.webp`, yoksa sadece metin). `Timeline`: `kind` work/education; `Certificates`: cert listesi mono; `HowIWork`: 4 madde; `EventsStrip`: 3 kart, foto `srcSetFor`, mono altyazı (tarih, yer, koordinat), `SectionReveal`.
- Consumes: `getTimeline/getEvents`, `srcSetFor`.

- [ ] **Step 1: Birim test (başarısız)**

`lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatRange, formatCoords } from "./format";
describe("formatRange", () => {
  it("en month-year with Present", () => { expect(formatRange("2026-02", null, "en")).toBe("Feb 2026 — Present"); });
  it("tr month-year with Devam", () => { expect(formatRange("2026-02", null, "tr")).toBe("Şub 2026 — Devam"); });
  it("year-only entries", () => { expect(formatRange("2024", "2024", "en")).toBe("2024"); expect(formatRange("2021-09", "2025-06", "tr")).toBe("Eyl 2021 — Haz 2025"); });
});
describe("formatCoords", () => {
  it("formats N/E with 4 decimals", () => { expect(formatCoords(38.45143, 27.17053)).toBe("38.4514°N 27.1705°E"); });
});
```
`Intl.DateTimeFormat(locale, { month: "short", year: "numeric" })` ile; TR kısaltmaları `Intl`'den ("Şub"), "Present"/"Devam" `messages` yerine `lib/format.ts`'te sabit (tek kullanım, test edilebilir) — ruling: format sözlüğü kodda.

- [ ] **Step 2: Sayfa**

Bölüm sırası: `AboutHero` → `01 / Timeline` (work + education) → `02 / How I work` → `03 / Community & events` → `04 / Certificates` → `05 / CV` (iki `Button` `/cv/Emin_Dundar_CV_en.pdf` ve `_tr.pdf`'e doğrudan `href` — `download` attribute'u). `/cv/route.ts` locale'e göre redirect (spec). `generateMetadata` alternates `/about`.

- [ ] **Step 3: e2e**

`e2e/about.spec.ts`: h1 görünür; zaman çizelgesinde "Feedback Yem" ve "Pamukkale" var; etkinlik şeridinde 3 `figure`, ilkinin `img` `src` `/media/events/devfest-izmir-24-640.webp` içeriyor ve `figcaption` "38.4514°N" içeriyor; `/en/cv` → `page.request.get("/en/cv", { maxRedirects: 0 })` status 302 ve `location` `/cv/Emin_Dundar_CV_en.pdf`; `page.request.get("/cv/Emin_Dundar_CV_en.pdf")` `content-type` `application/pdf`; TR sayfada "Nasıl çalışırım" başlığı.

- [ ] **Step 4: Doğrula ve commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm exec playwright test e2e/about.spec.ts
git add -A && git commit -m "feat(about): timeline, how I work, community & events, certificates, CV download

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: `/services`, `/colophon`, nav son hali

**Files:**
- Create: `app/[locale]/services/page.tsx`, `app/[locale]/colophon/page.tsx`, `e2e/pages.spec.ts`
- Modify: `components/layout/Nav.tsx`, `components/layout/Footer.tsx`, `messages/*.json` (Task 2'de), `app/[locale]/layout.tsx` (header `viewTransitionName`)

**Interfaces:**
- Produces: `/services`: intro + 4 kart (`getServices`), her kart başlık, gövde, facet etiketi, "See a case → /work/<caseSlug>"; alt CTA `/contact`. `/colophon`: 6 paragraf, stack listesi (mono), süreç listesi, repo linki `https://github.com/emindundar/portfolio`. Nav: `aria-label={t("primary")}`, aktif link `aria-current="page"` (client `NavLinks` küçük bileşen `usePathname` ile; sunucu Nav sarmalar), linkler `min-h-11 flex items-center`; `services` ve `colophon` linkleri (colophon footer'da). Footer: colophon linki + GitHub/LinkedIn (mono).
- Consumes: Task 2 mesajları.

- [ ] **Step 1: Uygula, e2e**

`e2e/pages.spec.ts`: `/en/services` 4 kart ve ilk kart linki `/en/work/geotrack`; `/en/colophon` h1 "Colophon" ve GitHub linki; nav'da aktif sayfa `aria-current="page"` (`/en/work` açıkken "Work"); nav linkleri yüksekliği ≥ 44 px (`boundingBox().height`); TR karşılıkları.

- [ ] **Step 2: Doğrula ve commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e
git add -A && git commit -m "feat(pages): services and colophon pages; nav active state, labels and touch targets

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Performans kapıları, LHCI URL'leri, dokümantasyon

**Files:**
- Modify: `lighthouserc.json`, `CLAUDE.md`, `README.md`

- [ ] **Step 1: LHCI**

`url` listesine `http://localhost:3101/en/work`, `http://localhost:3101/en/work/geotrack`, `http://localhost:3101/en/about` ekle. `pnpm build && pnpm lhci` → tüm error kapıları geçer. Vaka sayfasında LCP öğesi `h1` olmalı (rapor `largest-contentful-paint-element`'i yaz); görsel çıkarsa `MediaCover priority` kaldırılır ve `h1` önceliklenir. Script transfer her URL'de ≤ 256 KB.

- [ ] **Step 2: Dokümantasyon**

`CLAUDE.md` Learned constraints: medya pipeline (`pnpm media`, `media-src/` → `public/media/`, `next/image` yok), `searchParams` + `Suspense` kuralı (`cacheComponents`), Flip `data-flip-id` eşlemesi, ViewTransition CSS + reduced-motion, `/cv` redirect. `README.md`: "Add a project" adımlarına `pnpm media` ve kapak kuralı.

- [ ] **Step 3: Commit, push**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A && git commit -m "perf(ci): LHCI covers work, case and about pages; document media and content rules

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin faz1b-icerik
```

---

## Self-review notları

- **Spec kapsamı:** §2.1 `/work` ✔ T6, `/work/[slug]` ✔ T7, `/about` ✔ T8 (+ topluluk), `/services` ✔ T9, `/cv` ✔ T8, `/colophon` (yeni, kullanıcı onayı) ✔ T9, `/contact` ve "şu an" → Faz 1c, blog → v2. §2.3 vaka şablonu ✔ T4/T7 (mimari diyagram `FlowDiagram` ile, per-vaka SVG değil — ruling). §2.4 vaka listesi değişti: `grc-platform` ve `feed-erp-automation` çıktı; `kipgoz` ve `cursor-notion-mcp` girdi (kullanıcı kararı). §3.4 Flip ✔ T6, hover preview ✔ T6, ViewTransition ✔ T7. §3.6 malzeme ✔ T3 (simülatör sadece geotrack denemesi; diğerleri TypoCover). §4.7 görsel kuralı ✔ T3/T5 (`next/image` yerine önceden üretilmiş webp — ruling).
- **Tip tutarlılığı:** `Project.cover` opsiyonel → `MediaCover`, `HoverPreview`, `TypoCover` buna göre; `Facet` `content/facet-list`; `srcSetFor` T5 → T8 `EventsStrip`; `createVisibilityController` T5 `VideoCover`'da yeniden kullanılır.
- **Review Focus eşlemesi:** 1 → T6 e2e (geri tuşu); 2 → T5 birim + T7 e2e; 3 → T5 birim + T7 e2e; 4 → `merge` birim (Faz 0) + T7 banner; 5 → T8 e2e.
- **Bilinen riskler:** `cacheComponents` + `searchParams` Suspense yapısı; next-intl `Link` + `transitionTypes` tip uyumu; Flip'in RSC yeniden render'ında DOM eşlemesi (`data-flip-id`); Velite `single` koleksiyon seçeneği; `sharp` kurulumu (pnpm ignoredBuiltDependencies'ten çıkarılması); DevFest Denizli kırpma koordinatları (görsel doğrulama şart); sertifika yılları (CV'de yok).
- **Faz 1c'ye devreden:** `/contact` formu (Resend + Turnstile), GitHub "şu an" paneli, Umami, `motion` paketi. **Faz 1.5:** OG görselleri, JSON-LD, sitemap/robots, `global-not-found`, LHCI median-run, LCP font işi, hero ağırlığı, mobil hücre yüksekliği, domain.
