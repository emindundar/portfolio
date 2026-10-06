# Emin Dündar Kişisel Portfolyo Sitesi — Tasarım Spesifikasyonu

Tarih: 2026-10-07
Durum: Onaylandı (brainstorming oturumu, 2026-10-06/07)
Alan adı: emindundar.dev
Repo: github.com/emindundar/portfolio (public)

---

## 1. Amaç ve başarı ölçütü

### 1.1 Amaç
Tek site, iki iş:
1. **İş başvurularında öne çıkmak.** İlan linkine eklenen portfolyo. İK ve teknik lead 60 saniyede "bu kişi hem tasarım hem mühendislik düşünüyor" demeli.
2. **İş almak.** Freelance / proje bazlı müşteriye hizmet hattı.

### 1.2 Konumlandırma
Kimlik etiketi değil, **yetenek yüzeyleri**. "Flutter geliştiriciyim" değil, "Ürünü uçtan uca kurarım: mobil, web, backend, AI, veri/ERP". Projeler beş facet ile etiketlenir; ziyaretçi veya başvuru linki facet'e göre filtreler. Böylece aynı site Mobile Developer, Full-stack, AI Engineer ve çözüm danışmanı ilanlarına uyar.

### 1.3 Başarı ölçütleri
- Ana sayfa ilk ekranda: isim, tek cümle konumlandırma, canlı sinyal (GitHub aktivitesi), vaka çalışmasına giden CTA.
- Her vaka çalışması: problem, karar, sonuç formatında; CV'deki cümlelerden daha derin.
- Lighthouse mobil: Performance ≥ 90, Accessibility ≥ 95, SEO = 100.
- Core Web Vitals: LCP < 2.0 s, INP < 150 ms, CLS < 0.05.
- Yeni proje eklemek = 2 MDX dosyası, kod değişikliği yok.

### 1.4 Hedef kitle ve dil
- TR + EN. **EN varsayılan.** Yurt dışı remote ilanları + Türkiye şirketleri.
- URL: `/en/...` ve `/tr/...`. Kök `/` ilk ziyarette Accept-Language ile yönlendirir, sonra cookie.

### 1.5 Referans ve estetik
- Referans: omkcreative.online (React + Vite + Tailwind + Lenis; etki tipografi ve ritimle, 3D ile değil).
- Seçilen görsel yön: **"mühendis brutalizmi"**. Izgara çizgileri, monospace meta, dev grotesk başlıklar, sıcak koyu zemin, tek vurgu rengi. Saf siyah-yeşil hacker estetiği değil; İK okuyabilmeli.

---

## 2. Site haritası ve içerik modeli

### 2.1 Sayfalar

| Yol | İçerik | Faz |
|---|---|---|
| `/[locale]` | Hero (dev tipografi + shader), "şu an" paneli, seçili 4 vaka, yetenek yüzeyleri ızgarası, kısa hakkımda, iletişim CTA | 1 |
| `/[locale]/work` | Tüm projeler, facet filtreleri, URL'de filtre (`?f=ai`) | 1 |
| `/[locale]/work/[slug]` | Vaka çalışması, sabit şablon | 1 |
| `/[locale]/about` | Zaman çizelgesi, sertifikalar, "nasıl çalışırım", CV indir (TR/EN PDF) | 1 |
| `/[locale]/services` | İş alma hattı: 4 hizmet, her biri ilgili vakaya link | 1 |
| `/[locale]/contact` | Form + e-posta/LinkedIn/GitHub | 1 |
| `/[locale]/cv` | Locale'e göre CV PDF'e redirect | 1 |
| `/[locale]/blog`, `/blog/[slug]` | MDX blog. Altyapı v1'de, nav'da gizli, içerik v2 | 1 altyapı / 2 içerik |

### 2.2 Facet'ler
`mobile` · `web` · `backend` · `ai` · `data-erp`

Kural: her proje en az 1, en çok 3 facet. Ana sayfadaki "yetenek yüzeyleri" ızgarası facet başına proje sayısını otomatik gösterir.

### 2.3 Vaka çalışması şablonu (sabit sıra)
1. Başlık + tek cümle özet + monospace meta satırı (`2026 — FLUTTER · NODE — MOBILE · BACKEND`)
2. Kapak medyası (cihaz çerçevesinde video veya geniş ekran görüntüsü)
3. **Problem** — ne çözülüyor, kimin için
4. **Rol** — ne yaptım, tek başıma mı
5. **Mimari** — inline SVG diyagram + 3-5 cümle
6. **Kararlar ve neden** — 2-4 madde, her biri "X yerine Y çünkü Z"
7. **Sonuç / metrik** — ölçülebilir ne varsa; yoksa "öğrenilen"
8. **Stack** — etiketler
9. **Linkler** — repo, demo, video, store

### 2.4 v1 vaka listesi (7 adet)

| Slug | Facet'ler | Kaynak |
|---|---|---|
| `geotrack` | mobile, backend | map_tracking, map_tracking_backend, map-tracking-admin-app |
| `gymai` | mobile, ai | GymAI (public repo yok; kaynak CV + simülatör kaydı; egzersiz videoları emindundar.github.io'da mevcut) |
| `bio-astral` | mobile, backend | astro-biometric-life-radar, astro_backend |
| `karaoke-sync` | web, backend | evreka_karaoke |
| `notifyx` | mobile, backend | notification_app |
| `grc-platform` | backend, data-erp | grc-platform (C#) |
| `feed-erp-automation` | data-erp, ai | Feedback Yem işi, anonimleştirilmiş (müşteri adı yok): Excel→SQL migrasyon, NIR/ERP entegrasyonu, Claude ile iş akışı otomasyonu |

### 2.5 İçerik modeli (Velite + Zod)

```
content/
  projects/<slug>.en.mdx
  projects/<slug>.tr.mdx
  projects/<slug>.meta.json      # dil bağımsız alanlar
  timeline.json                  # iş + eğitim + sertifika, {en,tr} alanlı
  services.json                  # 4 hizmet, {en,tr} alanlı
  blog/<slug>.<locale>.mdx       # v2
messages/en.json, messages/tr.json   # UI metinleri (next-intl)
```

`<slug>.meta.json` şeması:
```ts
{
  slug: string
  facets: ('mobile'|'web'|'backend'|'ai'|'data-erp')[]  // 1..3
  stack: string[]
  year: number
  role: 'solo' | 'lead' | 'contributor'
  featured: boolean
  order: number
  cover: { type: 'video'|'image', src: string, poster?: string, frame: 'phone'|'browser'|'none' }
  links: { repo?: string[], demo?: string, video?: string, store?: string }
}
```

MDX frontmatter (`<slug>.<locale>.mdx`): `title`, `summary`, `metrics?: {label, value}[]`. Gövde: şablondaki 3-7 numaralı bölümler, `##` başlıklarla. Velite Zod ile doğrular; eksik alan veya geçersiz facet build'i kırar.

### 2.6 "Şu an" paneli
- Kaynak: GitHub REST, public `events` + `repos` (token yok, 60 istek/saat yeter).
- Gösterilen: son push edilen repo + zaman, son 30 gün commit sayısı, "şu an ne üzerinde çalışıyorum" (elle, `content/now.json`).
- `revalidate: 3600`. GitHub erişilemezse panel render edilmez, build kırılmaz.

---

## 3. Görsel ve hareket sistemi

### 3.1 Token'lar (Tailwind v4 `@theme`)

| Token | Koyu (varsayılan) | Açık |
|---|---|---|
| `--bg` | `#0B0B0C` | `#F4F2EE` |
| `--surface` | `#141416` | `#FFFFFF` |
| `--line` | `#2A2A2E` | `#D9D6D0` |
| `--fg` | `#EDEDED` | `#111111` |
| `--muted` | `#8A8A90` | `#6B6B70` |
| `--accent` | `#FF4D00` | `#E04300` |

Köşe yarıçapı 0. Kenarlık 1 px. Gölge yok. Tema `data-theme` ile `<html>`'de, cookie ile kalıcı, sistem tercihi varsayılan.

### 3.2 Tipografi
- Display: **Cabinet Grotesk** (Fontshare, variable, self-host `next/font/local`). Yedek: Clash Display.
- Gövde: **Satoshi** (Fontshare, variable).
- Mono: **JetBrains Mono** (Google Fonts, `next/font/google`).
- Ölçek: `clamp()` ile akışkan. Hero `clamp(3rem, 12vw, 11rem)`, h2 `clamp(2rem, 5vw, 4rem)`, gövde 1rem/1.6.
- `size-adjust` fallback metrikleri ile CLS sıfır.

### 3.3 Izgara ve düzen
- 12 kolon, 16 px mobil / 24 px masaüstü gutter, maks 1440 px.
- Görünür ince kolon çizgileri opsiyonel (`G` tuşu ile toggle, varsayılan kapalı).
- Her bölüm numaralı başlık: `01 / WORK`, `02 / ABOUT`.
- Nav: üstte sabit, monospace, `[en] [tr]` ve `[dark] [light]` metin toggle'ları; ikon yok.

### 3.4 Hareket

| Öğe | Teknik | Reduced-motion |
|---|---|---|
| Smooth scroll | Lenis, `autoRaf:false`, `gsap.ticker`'a bağlı, `lagSmoothing(0)` | Native scroll |
| Hero metin | GSAP SplitText, satır maskeli yukarı giriş | Tek fade |
| Hero arka plan | OGL fullscreen shader: yavaş noise + grid distortion, fareye hafif tepki. `dynamic(..., {ssr:false})`, IntersectionObserver ile sadece görünürken rAF | Statik poster PNG |
| Bölüm girişleri | ScrollTrigger: sayaçlar, çizgi çekme, paralaks; sadece `transform`/`opacity` | Kapalı |
| Proje listesi hover | Sağda yüzen önizleme görseli, fareyi takip eder | Hover'da görsel sabit |
| Filtre değişimi | GSAP Flip ile yeniden dizilim | Anında |
| Sayfa geçişi | React `<ViewTransition>`; vaka kapağı listeden detaya morph (`name`) | Anında |
| İmleç | Sadece `(pointer:fine)`: nokta + hover'da halka; magnetic butonlar | Kapalı |
| Küçük UI | Motion (`motion` paketi): toggle, menü, form durumu | CSS fallback |

Tek kaynak: `gsap.matchMedia()` ile `(prefers-reduced-motion: reduce)` koşulu. Ses yok. Preloader yok.

### 3.5 Terminal modu (v2)
- Açılış: alt kenarda ince `>_` çubuğu veya `` ` `` tuşu. Overlay, React state, sıfır backend.
- Komutlar: `help`, `projects [--f <facet>]`, `open <slug>`, `cv [tr|en]`, `contact`, `theme [dark|light]`, `lang [en|tr]`, `whoami`, `clear`, `ask "<soru>"` (v3'te AI endpoint'e bağlanır; v2'de "coming soon").
- Tab tamamlama, yukarı ok geçmiş. Çıktı aynı mono font, aynı token'lar.

### 3.6 Görsel malzeme üretimi
Elde malzeme yok; üretim plana dahil.
- Flutter projeleri: iOS Simulator'da ekran kaydı (bu makinede mevcut). 9:16, mp4 (H.264) + webm (VP9) + poster. Her vaka için 15-30 sn.
- Web projeleri: Playwright ile 1440×900 kayıt + ekran görüntüsü.
- Mimari diyagramlar: inline SVG, `currentColor` ile tema uyumlu, `components/diagrams/<slug>.tsx`.
- Depolama: `public/media/<slug>/`. Videolar Git LFS değil, doğrudan repo (toplam < 50 MB hedefi); aşarsa Vercel Blob.

---

## 4. Teknik mimari

### 4.1 Yığın
- Next.js 16 (App Router, Turbopack, `cacheComponents: true`), React 19, TypeScript strict, pnpm.
- Tailwind v4. GSAP 3.15 + `@gsap/react`. Lenis (`lenis/react`). Motion. OGL.
- next-intl (`[locale]` segmenti). Velite (içerik). Zod.
- Resend (e-posta). Cloudflare Turnstile (bot koruması). Umami Cloud (analytics, cookie'siz).
- Vercel Hobby (hosting, PR preview). GitHub Actions (CI).

### 4.2 Klasör yapısı
```
app/
  [locale]/
    layout.tsx            # html/body, fontlar, tema, SmoothScroll, Cursor, nav, footer, JSON-LD
    page.tsx
    work/page.tsx
    work/[slug]/page.tsx
    about/page.tsx
    services/page.tsx
    contact/page.tsx
    cv/route.ts           # redirect
    blog/page.tsx, blog/[slug]/page.tsx
    opengraph-image.tsx
    error.tsx, not-found.tsx
  sitemap.ts, robots.ts
  [locale]/contact/actions.ts   # Server Action (v1)
  api/ask/route.ts              # v3
components/
  ui/         Button, Tag, DeviceFrame, SectionHeader, Grid, LangToggle, ThemeToggle
  motion/     SmoothScroll, SplitReveal, Parallax, Cursor, Magnetic, ViewTransitionLink, FlipList
  canvas/     HeroShader (client-only)
  diagrams/   <slug>.tsx
  terminal/   v2
content/      (bkz. 2.5)
messages/     en.json, tr.json
lib/
  content.ts  Velite çıktısına tipli erişim, locale birleştirme
  github.ts   events/repos fetch + dönüştürücü
  i18n.ts     routing, locales sabiti
  motion.ts   gsap kaydı, matchMedia yardımcıları, Lenis-GSAP köprüsü
  contact.ts  Zod şema, Turnstile doğrulama, rate limit
proxy.ts      locale tespiti ve yönlendirme (Next 16'da middleware yerine)
public/fonts/, public/media/, public/cv/Emin_Dundar_CV_{en,tr}.pdf
velite.config.ts, next.config.ts, tailwind.css (@theme), CLAUDE.md
```

### 4.3 Sunucu / istemci sınırı
- Sayfalar, layout, içerik render'ı: sunucu bileşeni.
- `components/motion`, `components/canvas`, `components/terminal`, toggle'lar: `"use client"`.
- Kural: bu klasörler dışında `useGSAP`, `window`, `document` kullanımı yasak. ESLint `no-restricted-imports` + özel kural ile zorlanır.
- Lenis + GSAP köprüsü tek yerde (`lib/motion.ts`): `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t*1000))`, `gsap.ticker.lagSmoothing(0)`.

### 4.4 Veri akışları

**İçerik:** build-time. Velite `.velite/` altına tipli JSON üretir. `lib/content.ts` locale'e göre `meta.json` + `.<locale>.mdx` birleştirir. Çeviri eksikse EN'e düşer ve build'de uyarı basar.

**GitHub paneli:** sunucu `fetch`, `next: { revalidate: 3600 }`. Hata → `null` → panel render edilmez.

**İletişim formu:** Server Action (`app/[locale]/contact/actions.ts`). Sıra:
1. Honeypot alanı doluysa sessizce "başarılı" döner.
2. Turnstile token'ı sunucuda `siteverify` ile doğrulanır; başarısızsa hata.
3. Zod: ad (2-80), e-posta, mesaj (10-2000), bütçe (opsiyonel enum).
4. Rate limit: IP başına 5 gönderim/saat, in-memory Map (Vercel'de instance başına; Turnstile ile birlikte yeterli).
5. Resend ile `emindundared0@gmail.com`'a gönderim; gönderen `contact@emindundar.dev` (doğrulanmış domain).
6. Sonuç `useActionState` ile inline, i18n mesajlar.

**AI "bana sor" (v3):** `app/api/ask/route.ts`, streaming.
- Bilgi tabanı: tüm vaka MDX + `timeline.json` + `now.json`, build-time tek metin (~15K token). Embedding/RAG yok; sistem promptuna gömülür.
- Model: `claude-haiku-4-5-20251001`. Cevap ≤ 300 token. Sistem kuralı: sadece Emin'in işi/profili hakkında; kişisel veri (telefon, adres) verilmez; başka konuda kibarca reddeder.
- Koruma: Turnstile token, IP başına 10 soru/gün (Vercel KV veya Upstash Redis, v3'te eklenir), girdi ≤ 500 karakter.
- Arayüz: `/[locale]` üzerinde küçük "Ask me" paneli + terminal `ask` komutu, aynı endpoint.

### 4.5 i18n
- `generateStaticParams` → `['en','tr']`.
- `proxy.ts`: `/` → Accept-Language'e göre `/en` veya `/tr`; `NEXT_LOCALE` cookie'si öncelikli.
- Her sayfa `generateMetadata` içinde `alternates.languages` (hreflang) + `x-default` = en.
- Tarih/sayı formatı `Intl` ile locale'e göre.

### 4.6 SEO ve paylaşım
- `metadata`: başlık şablonu `%s — Emin Dündar`, açıklama, canonical.
- JSON-LD: root layout'ta `Person` (name, jobTitle, url, sameAs: GitHub/LinkedIn, knowsAbout: facet'ler + stack). Vaka sayfalarında `CreativeWork`.
- `opengraph-image.tsx` (Satori): siyah zemin, Cabinet Grotesk başlık, monospace meta, vurgu çizgisi. Locale ve slug'a göre.
- `sitemap.ts` tüm locale × sayfa; `robots.ts` tümüne izin.
- Analytics: Umami Cloud script, `afterInteractive`.

### 4.7 Performans bütçesi
- İlk yük JS ≤ 180 KB gz (ana sayfa). GSAP eklentileri, OGL, terminal: lazy.
- LCP öğesi hero metni (sunucu render). Canvas asla LCP değil.
- Görseller: build-time `sharp` ile AVIF+WebP, 3 boyut; `next/image` sadece kapaklarda, `unoptimized` diğerlerinde (Vercel Hobby 5K dönüşüm limiti).
- Video: `muted playsinline loop preload="metadata"`, IntersectionObserver ile oynat/durdur.
- Fontlar: `font-display: swap`, 3 variable dosya, subset latin + latin-ext (Türkçe karakterler).
- `will-change` sadece animasyon anında, `gsap.set` ile.

### 4.8 Erişilebilirlik
- WCAG 2.1 AA. Kontrast: `--fg` / `--bg` ≥ 12:1, `--accent` metin olarak sadece büyük boyutta.
- Tüm interaktif öğeler klavye ile erişilebilir; özel imleç görsel, odak halkası ayrı.
- `prefers-reduced-motion` tam destek (bkz. 3.4). Video `aria-label`, diyagram `<title>`.
- Dil toggle `hreflang` linkleri, `lang` attribute'u locale'e göre.

### 4.9 Hata yönetimi
- `error.tsx` / `not-found.tsx` locale'li, aynı estetik, ana sayfaya link.
- WebGL yoksa veya shader derlenmezse poster.
- Font yüklenemezse `system-ui` fallback, `size-adjust` ile CLS yok.
- GitHub/Resend/Turnstile hataları loglanır (console + Vercel logs), kullanıcıya i18n genel mesaj.
- İçerik şema hatası build'i kırar (bilinçli).

### 4.10 Test
- **Vitest:** `lib/content.ts` (locale birleştirme, fallback), `lib/github.ts` (dönüştürücü, hata yolu), `lib/contact.ts` (Zod, honeypot, rate limit), Velite şema testleri (geçersiz facet → hata).
- **Playwright e2e:** her locale'de ana sayfa yükleniyor ve hero metni görünür; `/work?f=ai` sadece AI projelerini listeliyor; form honeypot dolu → gönderim yok; `prefers-reduced-motion` ile canvas DOM'da yok; dil toggle URL'i değiştiriyor; 404 locale'li.
- **Lighthouse CI:** PR başına mobil, eşikler: perf 90, a11y 95, seo 100; altında kalırsa kırmızı.
- **Görsel:** Playwright screenshot'ları PR artifact'i olarak (snapshot karşılaştırma değil, inceleme için).

### 4.11 CI/CD
- Repo `emindundar/portfolio`, public (kendisi vitrin). `main` = prod.
- Vercel Git entegrasyonu: PR preview, `main` push → prod. Domain `emindundar.dev` + `www` redirect.
- GitHub Actions `ci.yml`: pnpm install → lint → typecheck → vitest → build → playwright → lhci.
- Secrets: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_UMAMI_ID`; v3'te `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_*`.

---

## 5. Tooling ve iş akışı

### 5.1 Claude Code kurulumu (Faz 0'da)
- **Plugin (resmi marketplace):** `frontend-design`, `context7`, `vercel`, `github`, `chrome-devtools-mcp`, `playwright`, `feature-dev`, `pr-review-toolkit`, `typescript-lsp`, `modern-web-guidance`, `resend`. `superpowers` zaten kurulu.
- **Skills:** `greensock/gsap-skills` (resmi), `vercel-labs/agent-skills` (`web-design-guidelines`, `react-best-practices`, `react-view-transitions`), `addyosmani/web-quality-skills` (CWV, a11y, SEO), Motion AI Kit (`npx motion-ai`), VectorLab UI/UX skills (`motion`, `reduced-motion`, `typography`, `viewports`).
- **MCP:** shadcn (sadece form/dialog primitifleri), Vercel (`https://mcp.vercel.com`), Framer agent (kullanıcı kurar; tasarım keşfi), Figma (gerekirse).
- **Tasarım keşfi:** Claude Design ile hero + proje listesi için 2-3 varyant, seçilen koda aktarılır. Framer'daki iyi örnekler referans panosu olarak.
- **CLAUDE.md:** stack, sınır kuralları (4.3), token adları, performans bütçesi, Lenis+GSAP köprü snippet'i, içerik ekleme adımları, test komutları.

### 5.2 Fazlar

| Faz | Kapsam | Çıktı |
|---|---|---|
| **0 Altyapı** | Repo, Next 16 iskeleti, Tailwind token'ları, fontlar, next-intl, Velite, CLAUDE.md, CI, Vercel bağlantısı | Boş ama deploy olan, iki dilli site |
| **1 Çekirdek** | Layout, nav, footer, tema/dil toggle, Lenis, imleç, hero + shader, vaka şablonu, 7 vaka içeriği (TR/EN), work filtre + Flip, about, services, contact formu. Paralel: malzeme üretimi (3.6) | İçerikli site, preview URL |
| **1.5 Cila** | GitHub paneli, OG görseller, JSON-LD, sitemap, Lighthouse bütçesi, a11y denetimi, domain | **v1 yayın: emindundar.dev** |
| **2** | Terminal modu, blog altyapısı aktif + 2 yazı | v2 |
| **3** | AI "bana sor": endpoint, rate limit, panel, terminal `ask` | v3 |

### 5.3 Kapsam dışı (v1)
CMS/admin paneli, kimlik doğrulama, yorumlar, newsletter, ses, 3D model, çoklu tema, Flutter web canlı demo gömme (video yeterli), Git LFS.

---

## 6. Araştırma özeti (karar gerekçeleri)

- **Next.js 16 vs Astro vs Vite SPA:** Next seçildi; SEO/OG/i18n yerleşik, AI backend aynı repoda, CV'deki Next.js iddiasını kanıtlar. Astro daha hafif ama kalıcı canvas/terminal overlay adalar arasında zor. Vite SPA referans sitenin yolu, ama sayfa başı OG ve crawlable HTML kaybı.
- **GSAP:** Webflow satın alması sonrası tüm eklentiler (ScrollTrigger, SplitText, Flip) ücretsiz ve ticari kullanıma açık.
- **Motion + GSAP birlikte:** Motion bildirimsel UI geçişleri, GSAP timeline/scroll/split. Yaygın ve desteklenen kombinasyon.
- **View Transitions:** Next 16.x App Router'da React `<ViewTransition>` ek yapılandırmasız çalışıyor (16.4 dokümanı); kurulan sürümde doğrulanacak.
- **Velite:** Contentlayer terk edildi. Velite v0.4 (Haziran 2026) Zod tipli, git tabanlı, Next örneği var. Alternatif content-collections.
- **Vercel Hobby:** 100 GB transfer, 5K görsel dönüşümü/ay (bu yüzden build-time ön boyutlandırma), ticari olmayan kullanım (portfolyo uygun).
- **Resend:** 3.000 e-posta/ay ücretsiz. **Turnstile:** ücretsiz, görünmez, sunucu doğrulaması şart.
- **Umami Cloud:** 100K event/ay ücretsiz, cookie'siz, banner gerekmez.
- **AI asistan:** içerik ~15K token olduğundan RAG gereksiz; sistem promptuna gömme yeterli ve daha basit.
- **Flutter gösterimi:** cihaz çerçevesinde kısa sessiz video en etkili ve en hafif; canlı Flutter web gömme v1 dışı.
