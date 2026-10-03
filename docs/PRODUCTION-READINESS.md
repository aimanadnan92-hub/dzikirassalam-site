# Production readiness: dzikirassalam.com

Audit and hardening done 3 Oct 2026 (commits `8c5f68f`, `ad09faf`). Day-to-day running:
[WEBSITE-OPERATIONS.md](WEBSITE-OPERATIONS.md).

**Status: READY WITH MANUAL ACTIONS.** The site is tested, secured, measurable (code ready) and
monitored for health and drift. Uptime alerts, analytics data and Search Console need Aiman's accounts.

## What the audit found (before)

The brief assumed Next.js. The real site is a **static multi-page site**: Python writes HTML, nginx
serves it, Coolify runs nginx. That is the right shape for a 10-page marketing site, so it was kept.

| Area | Found |
|---|---|
| Source and backup | Repo held only build output; the real source (`site-src/`) existed only on one PC |
| Deploy | Coolify app is a public-repo app with no webhook, so pushes never deployed; manual API trigger |
| Health | Coolify health check off ("running:unknown"); no uptime monitoring anywhere on the VPS |
| Redirects | `/rawatan` redirected to **http**://…/rawatan/ (an https → http hop); `www` served a duplicate site |
| 404 | Every unknown URL returned the homepage HTML with status 404 (soft 404) |
| SEO files | No `robots.txt`, `sitemap.xml` or `favicon.ico` (each returned the 35 KB homepage) |
| Security headers | None (no HSTS, nosniff, frame protection, referrer policy, CSP); nginx version exposed |
| Accessibility | Lighthouse 95–96: inactive "LIVE" label at 2.0:1 contrast; logo link's label hid its visible subtitle |
| Performance | Already excellent: Lighthouse 98–100, LCP 1.8–1.9 s on throttled mobile, CLS ≈ 0, ~520 KB total assets |
| Testing | No tests |
| Analytics / errors | None |
| Content and claims | Clean. Every fact matched the reference wiki (SSM no., 2015, 23 Feb 2026, prices, 365-day kitchen). No guarantees, no testimonials, medical-coexistence wording present. Only note: the hero photo is AI-generated (already documented). |

## Decision log

| Decision | Item | Reason |
|---|---|---|
| KEEP | Static build, nginx, Coolify Dockerfile app, Let's Encrypt | Fast, simple, nothing to patch at runtime |
| KEEP | Metadata, Open Graph, `LocalBusiness` JSON-LD, self-hosted fonts, responsive WebP, skip link, native `<dialog>` menu, reduced-motion support | Already done well |
| SKIP | Migrating to Next.js | Would replace a working architecture for no visitor benefit |
| CONFIGURE | nginx: headers, relative redirects, www → apex, real 404, caching, `/healthz`, hidden version | Defects found live |
| CONFIGURE | Coolify health check on `/healthz` | Health-gated rolling deploys; status now "running:healthy" |
| ADD | Source, tests and docs in the repo; Docker builds from source | Real backup; deployed output can never drift from source |
| ADD | `robots.txt`, `sitemap.xml`, `favicon.ico`, 404 page, `BreadcrumbList` | Technical SEO gaps |
| ADD | Playwright + axe-core tests; GitHub Actions CI + 6-hourly live check | Nothing tested before |
| ADD (account pending) | Umami Cloud analytics | Cookieless, ~2 KB script, free tier fits; events defined |
| BUILD | Analytics adapter + `js_error` events in `site.js` | Error visibility without another tool |
| BUILD | `scripts/deploy.mjs` | Replaces the dead webhook and enforces test-before-deploy |
| BUILD | Live-vs-commit drift check | A push alone does not deploy; this catches forgotten deploys |
| SKIP | Sentry | No server code, ~10 KB of own JS; `js_error` events cover it |
| SKIP | PostHog | Its script would be several times the site's entire JS for features not needed |
| SKIP | Self-hosted Uptime Kuma | On the same VPS it cannot report the VPS going down |
| SKIP | `llms.txt`, FAQ rich results, web manifest | No search engine uses `llms.txt`; Google limits FAQ results; a manifest adds nothing to a marketing site |
| SKIP | `Cross-Origin-Opener-Policy` | Broke Lighthouse tracing; nothing to protect |
| SKIP | Fixing the Coolify GitHub webhook | Would deploy untested pushes; the deploy script is safer |
| MANUAL | Better Stack uptime, Umami account, Search Console, Bing | Need Aiman's accounts |

## Tools adopted

| Tool | Purpose | Licence / cost | Why |
|---|---|---|---|
| Playwright (`@playwright/test`) | End-to-end tests on Chromium and WebKit | Apache-2.0, free | microsoft/playwright, ~97k stars, already in the design skill stack |
| axe-core (`@axe-core/playwright`) | WCAG 2.1 AA scans inside the tests | MPL-2.0, free | dequelabs/axe-core, ~7.6k stars, the industry-standard engine (Lighthouse uses it) |
| Lighthouse (via `npx`, not installed) | Performance/a11y/SEO scores | Apache-2.0, free | GoogleChrome/lighthouse, ~31k stars |
| Umami Cloud | Privacy-friendly analytics | Software MIT; Cloud Hobby plan free | umami-software/umami, ~39k stars; same software can be self-hosted later |
| GitHub Actions | CI and scheduled live checks | Free for public repos | Already where the code lives |

Used as reading references only (nothing copied in): the Next.js production checklist (security,
metadata, CSP, caching ideas apply to any site), `sderosiaux/good-website-checklist` (~100 stars, used
as a checklist only), `ixartz/Next-js-Boilerplate` (~13k stars, testing/CI patterns).

## Results after (live, 3 Oct 2026)

| Check | Result |
|---|---|
| Local suite (`npm test`) | 193 passed, 0 failed (desktop 1366, tablet 768, Pixel 7, iPhone 13/WebKit) |
| Live suite (`npm run test:prod`, desktop + Android + iPhone) | 159 passed, 0 failed |
| Same suite on production **before** the work | 24 failed: the defects above |
| GitHub Actions CI | passed on `8c5f68f` |
| Lighthouse, live, phone | `/` perf 99 · a11y 100 · best 100 · SEO 100 · LCP 1.8 s · CLS 0 |
| | `/rawatan/` 97 · 100 · 100 · 100 · LCP 1.8 s · `/tiktok-live/` 100 · 100 · 100 · 100 · LCP 1.6 s |
| Lighthouse, live, desktop | 100 / 100 / 100 / 100 on all three pages, LCP 0.3–0.4 s |
| axe WCAG 2.1 AA | 0 violations on all 10 pages, wide and narrow |
| Coolify | Health-gated rolling update, status `running:healthy` |
| Drift check | 10/10 live pages identical to a fresh build of `main` |

What the tests cover: every page loads with one `h1`, canonical, OG, CSP and no console/CSP errors;
no sideways scroll or cut-off buttons in BM and EN at all four sizes; RM150 hero button visible
without scrolling and tappable (≥44 px); every RM150 button carries the RM150 WhatsApp message;
RM399 package message; TikTok Live account, WhatsApp Group, products TikTok and CHIP links; phone
dock behaviour and tap sizes; desktop nav, phone menu (open, Esc, navigate), language switch and memory;
every internal link and `#anchor`; analytics event names with no URL or message text leaking, and
nothing loaded without an id; robots, sitemap, real 404, favicon, structured data, unique titles;
axe scans, skip link, visible focus, reduced motion; live-only: headers, redirects, health, hidden
files, cache policy.

## Security status

HTTPS everywhere (Let's Encrypt, auto-renew) · HSTS 1 year (no `includeSubDomains`/preload, so
reversible within a year and no effect on other subdomains) · `X-Content-Type-Options: nosniff` ·
`X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` · `Referrer-Policy: strict-origin-when-cross-origin` ·
`Permissions-Policy` denies camera, mic, location, payment, USB · per-page CSP: scripts only from the
site, two hashed inline scripts and Umami; connections only to the site and Umami; no plugins, frames
or foreign form targets · nginx version hidden · dotfiles, source, docs and Dockerfile not served (the
image contains only built files) · no secrets in the repo (deploy script scans before every push) ·
`npm audit`: 0 vulnerabilities (test tools only; nothing from npm ships to visitors).

## Remaining risks and gaps

- **No uptime alert yet.** Until Better Stack (or similar) is set up, a full outage is only noticed by
  the 6-hourly GitHub check or by people.
- **No analytics data yet.** Code is live but off until the Umami website id is set.
- **Not in Search Console/Bing**, so no indexing reports and the sitemap is only discovered via robots.txt.
- **The Coolify panel itself** is still the 10-month-old `v4.0.0-beta.451` noted in the 10 Sep infra audit.
  It is the platform under every app; upgrading it is a separate, VPS-wide job.
- **Single VPS, no CDN.** Fine for current traffic; a VPS outage takes the site down with the other apps.
- HSTS means a broken certificate renewal would block visitors instead of warning them. Coolify renews
  automatically; the uptime monitor (once set up) would catch it.
- The hero photograph is AI-generated (documented in README); replace with a real one when available.

## Next recommended actions

1. Aiman: create the Better Stack uptime monitors (WEBSITE-OPERATIONS §7.1), 5 minutes.
2. Aiman: create the Umami account and send the website id; then deploy and check the first events.
3. Aiman: Search Console HTML-tag token → deploy → Verify → submit sitemap → import into Bing.
4. After 4 weeks of data: review the funnel `/` → `cta_treatment_rm150` and which `location` converts.
5. Plan the Coolify upgrade (VPS-wide, separate change window).
