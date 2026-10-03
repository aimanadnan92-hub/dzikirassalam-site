# Website operations: dzikirassalam.com

How the site runs, how to change it, how to know it is healthy, and how to recover it.
Written so nobody has to ask Claude again. Last reviewed 3 Oct 2026.

## 1. Architecture

```
 site-src/ (this repo) ── npm run deploy ──► GitHub main ──► Coolify API "deploy"
                                                                   │
                                     Docker build on the VPS:      ▼
                          python site-src/build.py ──► nginx:alpine image
                                                                   │  health check GET /healthz
                                                                   ▼  (old container retired only when new is healthy)
 Visitor ── HTTPS ──► Traefik (Coolify proxy, Let's Encrypt) ──► nginx container ──► static files
```

| Piece | Where | Notes |
|---|---|---|
| Domain + DNS | Google Domains nameservers (`ns-cloud-d*.googledomains.com`, now managed by Squarespace Domains) | `dzikirassalam.com` and `www` A records → `72.61.124.251`. Email MX is Google Workspace. |
| Server | Hostinger VPS `72.61.124.251` | Shared with the other Dzikir Assalam apps |
| Hosting panel | Coolify, `https://coolify.ahader.cloud`, application **website** (uuid `vksscgsg4w0ck000ss4ksgs0`) | Build pack: Dockerfile at repo root. Domains: `https://dzikirassalam.com`, `https://www.dzikirassalam.com` |
| Source | GitHub `aimanadnan92-hub/dzikirassalam-site` (public), branch `main` | Everything needed to rebuild the site is in this repo |
| HTTPS | Traefik + Let's Encrypt, renewed automatically by Coolify | HSTS is on (1 year), so the certificate must keep renewing |

There is **no database, no uploaded content, no environment variables and no secrets** in this site.

## 2. Changing the site

1. Edit files under `site-src/` (see the README for where things live).
2. `npm run serve` and look at http://127.0.0.1:4173 (phone size too).
3. `git commit -am "what changed"`.
4. `npm run deploy`.

`npm run deploy` does, and stops at the first failure:

1. checks you are on `main` with everything committed;
2. scans tracked files for anything that looks like a key or token;
3. builds and runs all local tests (desktop, tablet, Android, iPhone/WebKit);
4. pushes to GitHub;
5. asks Coolify to build and waits for it (the GitHub push on its own does **not** deploy);
6. confirms the live homepage is the new build and `/healthz` answers;
7. runs the test suite against the live site.

It needs the Coolify API token in `12_Rawatan-AI_Project/.coolify-token` on Aiman's PC
(or `COOLIFY_TOKEN_FILE=...`). The token never goes into this repo.

**Docs-only commits** (README, `docs/`) do not change the site; deploying them is optional.

### Quick switches (no page editing)

`site-src/static/assets/js/config.js`, then commit and `npm run deploy`:

| Setting | Effect |
|---|---|
| `tiktokLive.status: "live"` / `"offline"` | LIVE badge and the dock's TikTok button. Visitors see it on next page load. |
| `whatsappGroupUrl` | TikTok Live announcement group invite |
| `liveSchedule` | Shows the Live schedule; `null` hides it |
| `analytics.umamiWebsiteId` | Turns analytics on (see section 4) |
| `checkout.mode` | Stays `"whatsapp"` until the server in `PAYMENTS.md` exists |

## 3. Health and monitoring

| What | How | Alerts |
|---|---|---|
| Container health | Coolify health check `GET http://127.0.0.1/healthz` every 10 s. The app shows **running:healthy**. During a deploy the old container keeps serving until the new one passes. | Coolify dashboard |
| Code health | GitHub Actions **CI**: every push builds and runs the full suite | GitHub emails on failure |
| Live site health | GitHub Actions **Live site check** every 6 hours: live pages identical to the latest commit, then pages, booking links, SEO files, security headers on the real site | GitHub emails the repo owner on failure |
| Uptime (minutes-level) | **Not set up yet: needs Aiman's account**, see section 7 | Email |

GitHub pauses scheduled workflows after 60 days without a commit (it emails first). Re-enable it
under the repo's **Actions** tab, or push any commit.

Ad-hoc checks:

```bash
npm run test:prod     # every test against the live site
npm run lighthouse    # speed, accessibility, best practices, SEO scores (phone + desktop)
```

Logs: Coolify → website → **Logs** (nginx access/error log) and **Deployments** (build logs).

## 4. Analytics (Umami Cloud, cookieless)

The site already contains everything; it is **off** until a website id is set.

Turn on (once):
1. Aiman: sign up at https://cloud.umami.is (free Hobby plan) and add website `dzikirassalam.com`.
2. Copy the **Website ID** (Settings → Websites → Edit) into `analytics.umamiWebsiteId` in `config.js`.
3. Commit, `npm run deploy`.
4. On your own phone/PC, stop counting yourself: open the site, browser console,
   `localStorage.setItem('umami.disabled', '1')`.

What is counted automatically: visitors, page views, referrers (traffic sources), landing pages,
countries, devices. Custom events (clicks, not completed bookings):

| Event | Fired when someone taps |
|---|---|
| `cta_treatment_rm150` | any "Ikhtiar Rawatan Personal • RM150" button (opens WhatsApp) |
| `cta_package_3_session` | "Tempah Pakej RM399" |
| `cta_tiktok_free_treatment` | any link to TikTok @rawatan.assalam (free Live) |
| `cta_whatsapp_group` | "Sertai WhatsApp Group" |
| `cta_whatsapp_click` | any other WhatsApp link (questions, Talqin, Majelis, team numbers) |
| `cta_tiktok_shop` | Air Dzikir on TikTok @rawatanassalam2 |
| `cta_sedekah_chip` | CHIP sedekah payment links |
| `cta_email`, `outbound_click` | email, YouTube, Linktree, map |
| `js_error` | a script error in the site's own files (message, file, line) |

Each event carries `location` (which button, e.g. `hero`, `dock`, `footer`), `page` and `lang`.
**Never sent:** the link URL, the WhatsApp message text, anything a visitor typed.

Suggested funnel (Umami → Reports → Funnel): page view `/` → `cta_treatment_rm150`.
A click opens WhatsApp; whether a booking followed is only known in WhatsApp/the logger.

Free plan limits: 100k events/month, 6 months of history, 1 website. The site is far below this.

## 5. Search engines

- `robots.txt` allows everything and points to `sitemap.xml`; the sitemap is generated from the
  page list on every build (10 pages; the 404 page is excluded and `noindex`).
- Canonical URL on every page = `https://dzikirassalam.com/<path>/`; `www` and `http` redirect there.
- Structured data: `LocalBusiness` on the homepage, `BreadcrumbList` on detail pages.
- **Search Console / Bing: not connected yet** (no verification found in DNS or pages). Steps in section 7.
  Ownership tokens go in `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` at the top of `build.py`.

## 6. Rollback and recovery

**Bad deploy, fastest (no rebuild):** Coolify → website → **Rollback** → pick the previous image → Rollback.
Then fix the code and deploy again (otherwise the next deploy brings the bad version back).

**Bad deploy, through git:** `git revert <bad commit>` → `npm run deploy`.

**Build fails on Coolify:** nothing changes for visitors; the previous container keeps serving.
Read the build log under Deployments. `nginx -t` runs inside the build, so a broken `nginx.conf`
fails the build instead of the site.

**Rebuild everything from zero** (VPS lost, Coolify reinstalled), about 15 minutes:
1. New Coolify application: *Public repository* `https://github.com/aimanadnan92-hub/dzikirassalam-site`,
   branch `main`, build pack **Dockerfile**, Dockerfile `/Dockerfile`, base directory `/`, port `80`.
2. Domains: `https://dzikirassalam.com,https://www.dzikirassalam.com`. No environment variables.
3. Health check: enabled, `GET`, scheme `http`, host `127.0.0.1`, port `80`, path `/healthz`,
   return code `200`, interval 10 s, timeout 5 s, retries 3, start period 5 s.
4. Deploy. If the server IP changed, update both A records at the domain registrar.
5. Put the new application uuid into `APP_UUID` in `scripts/deploy.mjs`.
6. `npm run test:prod`.

What needs backing up: only this Git repository (GitHub holds it; a clone on Aiman's PC is a second
copy) and the Coolify settings listed above. There is no data to back up.

## 7. Manual actions that need Aiman (accounts, logins, DNS)

1. **Uptime monitor (5 min):** sign up at https://betterstack.com (free: 10 monitors, 3-minute checks,
   email alerts). Create monitors: `https://dzikirassalam.com/healthz` (expect keyword `ok`) and
   `https://dzikirassalam.com/` (expect keyword `RM150`). The other apps on the VPS fit in the same
   free plan. (UptimeRobot's free plan no longer allows commercial sites; a self-hosted Uptime Kuma
   on the same VPS could not report the VPS itself going down.)
2. **Analytics:** section 4, steps 1 and 2.
3. **Google Search Console:** https://search.google.com/search-console → Add property →
   *URL prefix* `https://dzikirassalam.com/` → method *HTML tag* → send the `content="..."` value
   (not a secret). It goes into `GOOGLE_SITE_VERIFICATION`, gets deployed, then press **Verify**.
   Then Sitemaps → submit `sitemap.xml`. (Alternative: *Domain* property with a DNS TXT record at the registrar.)
4. **Bing Webmaster Tools:** https://www.bing.com/webmasters → *Import from Google Search Console*
   (after step 3). This also covers DuckDuckGo and Yahoo.

## 8. Things that look odd but are deliberate

- `http://` → `https://` is a 302 (Traefik's shared redirect, used by every app on the VPS). HSTS makes
  browsers go straight to https after the first visit; canonical tags tell search engines the address.
- No `Cross-Origin-Opener-Policy`: it broke Lighthouse/PageSpeed measurement and protects nothing here.
- `style-src 'unsafe-inline'` in the CSP: pages use small inline `style=""` attributes. Scripts are strict
  (own files + hashed inline scripts + Umami only).
- The English version is a switch on the same page (`[[BM||EN]]`), not separate URLs, so search engines
  index the Bahasa Melayu text. That matches the audience; separate `/en/` pages would be a bigger project.
- No Sentry/PostHog: there is no server code, and the site's own JS is ~10 KB. Script errors go to
  analytics as `js_error`.
