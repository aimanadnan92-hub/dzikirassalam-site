# dzikirassalam.com

Website of Pusat Rawatan As-Salam (Dzikir Assalam Worldwide). A plain static site: Python writes
the HTML pages from `site-src/`, nginx serves them, Coolify runs nginx on the Hostinger VPS.
No database, no server code, no secrets.

- **How it is run, monitored and recovered:** [docs/WEBSITE-OPERATIONS.md](docs/WEBSITE-OPERATIONS.md)
- **What was audited and why things are the way they are:** [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md)
- **Future online payments design:** [docs/PAYMENTS.md](docs/PAYMENTS.md)

## Layout

| Path | What it is |
|---|---|
| `site-src/pages/*.html` | Page content, one file per page (`404.html` included) |
| `site-src/site.css`, `site-src/site.js` | Shared style and behaviour |
| `site-src/build.py` | Writes `site/`: pages, header/footer/dock, robots.txt, sitemap.xml, security policy |
| `site-src/static/` | Copied as-is: fonts, images, `favicon.ico`, `assets/js/config.js` |
| `site/` | Build output. Generated, git-ignored, never edit |
| `nginx.conf`, `Dockerfile` | How production serves the site (headers, redirects, caching, 404, `/healthz`) |
| `tests/` | Playwright tests (all pages, booking links, analytics events, SEO, accessibility, live-only checks) |
| `scripts/deploy.mjs` | Build, test, push, deploy on Coolify, then test the live site |

Homepage flow: hero, two ways to begin, RM150, why As-Salam, TikTok Live, what happens next, RM399,
explore links, FAQ, final call. Detail pages: `/rawatan/` `/tiktok-live/` `/perjalanan/` `/talqin/`
`/majelis/` `/produk/` `/sedekah/` `/tentang/` `/faq/`.

## Editing

- Page text: `site-src/pages/*.html`. `[[BM||EN]]` writes both languages; `{{BTN:book}}`,
  `{{LINK:/path/|BM|EN}}`, `{{WA:key}}`, `{{SAW}}` are shortcuts (see the top of `build.py`).
- WhatsApp messages, footer team numbers, TikTok accounts: constants near the top of `build.py`.
- Copy rules: never use the em dash; ﷺ always follows its name on the same line (`{{SAW}}` does this).
- Team settings without touching pages, in `site-src/static/assets/js/config.js`: TikTok LIVE on/off,
  WhatsApp Group link, Live schedule, analytics website id, checkout mode.
- A changed image or font needs a **new filename** (they are cached for 30 days / 1 year).
  CSS and JS do not: their links carry a content hash.

## Commands (run in this folder)

```bash
npm install                      # once: test tools (Playwright, axe)
npx playwright install chromium webkit   # once: test browsers
npm run serve                    # build + preview at http://127.0.0.1:4173
npm test                         # build + every test on desktop, tablet, Android, iPhone
npm run deploy                   # ship it (see below)
npm run test:prod                # every test against the live site
npm run lighthouse               # speed / accessibility / SEO scores of the live site
```

## Deploying

Commit, then `npm run deploy`. It refuses to continue on uncommitted changes, a possible secret,
or any failing test; pushes to `main`; asks Coolify to build (the GitHub push alone does not deploy);
waits for the build; confirms the live homepage is the new build; then runs the tests on the live site.
Rollback and everything else: [docs/WEBSITE-OPERATIONS.md](docs/WEBSITE-OPERATIONS.md).

## Image provenance

- `seal-*.webp`, favicons: cut from the official emblem (`05_Brand.../assets/masters/logo-emblem.jpeg`).
- `hero-doa-*.webp`: **AI-generated** photograph (hands raised in doa), from MVP5-1. Replace with a real
  As-Salam photograph when one exists (and make a new share image with a new filename).
- `og-v8.jpg`: WhatsApp/Facebook share preview (1200x630). WhatsApp caches previews per image URL,
  so a changed preview needs a new filename and an update in `build.py`.
- Provenance notes sit next to images as `*.json`; they stay in the repo and are never published.
