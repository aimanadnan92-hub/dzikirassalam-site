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
- Footer team WhatsApp numbers: `FOOTER_TEAM` near `footer()` in `build.py` (name, wa.me number, shown number).
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

**Live since 2 Oct 2026** (commit `ac85bc6`) at https://dzikirassalam.com.
Production repo: `aimanadnan92-hub/dzikirassalam-site` (Coolify app `website`, uuid
`vksscgsg4w0ck000ss4ksgs0`, Dockerfile build at the repo root). The old `../deploy/` folder is
obsolete (it held mvp3 and is not the repo).

1. `python site-src/build.py`
2. Clone the repo, replace everything except `.git` with the contents of `site/`, commit, push to `main`.
3. **The push webhook does not trigger a build** (known Coolify GitHub-app issue). Trigger it:
   `GET https://coolify.ahader.cloud/api/v1/deploy?uuid=vksscgsg4w0ck000ss4ksgs0` with the token in
   `12_Rawatan-AI_Project/.coolify-token`, then check `/api/v1/deployments/<deployment_uuid>`.

**Switching TikTok LIVE on/off:** edit `assets/js/config.js` (`tiktokLive.status`: `"live"` or
`"offline"`) in the repo and deploy as above. nginx serves `config.js` with `no-cache`, so visitors
see the change on their next page load.

## Image provenance

- `seal-*.webp`, favicons: cut from the official emblem (`05_Brand.../assets/masters/logo-emblem.jpeg`).
- `hero-doa-*.webp`: MVP5-1's hero photograph (`05_Brand.../assets/web/hero-dua-lightrays-compressed.webp`).
  **AI-generated** (hands raised in doa); replace with a real As-Salam photograph when one exists.
- `og-v8.jpg`: the WhatsApp/Facebook share preview (1200x630), composed from the hero photo, the hero
  headline in Gelasio, the RM150 pill and the seal. If you change it, use a NEW filename and update
  `build.py`: WhatsApp caches previews per image URL.
