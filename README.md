# dzikirassalam.com, v8 ("the guide, simplified")

Homepage flow (v8.1, 2 Oct 2026): hero, two ways to begin (compact), RM150, why As-Salam (short),
TikTok Live, what happens next, RM399, explore links (quiet), FAQ, final call.

Hybrid site: the homepage is a short conversion landing page that sells the first step
(Rawatan Dzikir Terapi RM150, or the free TikTok Live). Depth lives on dedicated pages:

| Path | Job |
|---|---|
| `/` | Understand, trust, choose, act |
| `/rawatan/` | The treatment in full: method, online and in person, steps, preparation, RM399 package, FAQ |
| `/tiktok-live/` | The free entry: who it is for, how to join, WhatsApp Group, schedule |
| `/perjalanan/` | The longer journey: follow-up, SNC, Premium, Talqin, Majelis |
| `/talqin/` | Talqin Dzikir |
| `/majelis/` | Majelis Dzikir, Kuliah Hakikat |
| `/produk/` | Air Dzikir (TikTok @rawatanassalam2 only) |
| `/sedekah/` | Salam Berkat Box, Madrasah Tahfiz, Dakwah Majelis |
| `/tentang/` | About: the method, verse 26:80, trust facts, the amanah since 2015 |
| `/faq/` | All questions |

Visual foundation: MVP5-1 Light (warm paper and sand, night photographic hero, restrained gold),
refined for conversion: **gold fill is used only on the primary action** of each page.

## Editing

Edit `../site-src/`, never the built pages here:
- `site-src/pages/*.html`: page content. `[[BM||EN]]` writes both languages; `{{BTN:book}}`,
  `{{LINK:/path/|BM|EN}}`, `{{WA:key}}`, `{{SAW}}` are shortcuts (see the top of `build.py`).
- `site-src/site.css`, `site-src/site.js`: shared style and behaviour.
- Then run `python site-src/build.py` from `02_Dzikir AsSalam Website_Project/`.

The output is plain static HTML; nothing runs on the server.

## Team-editable settings (`assets/js/config.js`)

- `whatsappGroupUrl`: TikTok Live announcement group invite link. Until set, the button opens a
  WhatsApp chat asking to be added.
- `liveSchedule`: the confirmed Live schedule. Until set, no times are shown.
- `checkout`: stays `"whatsapp"` until the server in `PAYMENTS.md` exists.

## Preview

`python -m http.server 3130 --directory "02_Dzikir AsSalam Website_Project/site"`, then
http://localhost:3130 (also saved as `website-v7` in the hub's `.claude/launch.json`).

## Deploying

Not deployed. Production is still `../deploy/index.html` (mvp3). This folder carries its own
`Dockerfile` + `nginx.conf` (clean URLs: `/rawatan/` serves `rawatan/index.html`). Point the
Coolify app at this folder, or copy its contents into `../deploy/` including the new Dockerfile.
Version 7 is archived in `../archive/site-v7-2026-10-02/`.

## Image provenance

- `seal-*.webp`, favicons: cut from the official emblem (`05_Brand.../assets/masters/logo-emblem.jpeg`).
- `hero-doa-*.webp`: MVP5-1's hero photograph (`05_Brand.../assets/web/hero-dua-lightrays-compressed.webp`).
  **AI-generated** (hands raised in doa); replace with a real As-Salam photograph when one exists.
- `og-image.jpg`: composed from the seal and brand fonts.
