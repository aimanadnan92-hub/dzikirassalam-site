"""Build the static site from site-src/ into site/.

Plain static HTML out; this script only keeps the pages consistent (header, footer, dock,
bilingual spans, WhatsApp links) and writes robots.txt, sitemap.xml and the 404 page.
Run from the repo root:  python site-src/build.py   (the Docker build runs the same command)

site/ is wiped and rebuilt every time: static files come from site-src/static/, never edit site/.

Page sources: site-src/pages/<name>.html, first line a JSON comment:
  <!--{"path": "/rawatan/", "title": "...", "description": "...", "nav": "rawatan", "dock": "book"}-->
Shorthand inside pages:
  [[BM text||English text]]        bilingual inline text
  {{SAW}}                          &nbsp;ﷺ in Amiri
  {{I:wa}}                         inline icon
  {{LINK:/href|BM label|EN label}}  informational link, arrow glued to the last word
  {{BTN:book|cta-id}} etc.         standard buttons (see BUTTONS)
  {{WA:key}}                       WhatsApp URL with the message for key
"""
import base64
import hashlib
import json
import os
import re
import shutil
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(ROOT, '..', 'site'))
STATIC = os.path.join(ROOT, 'static')
DOMAIN = 'https://dzikirassalam.com'
WA_NUMBER = '60137030155'
TIKTOK = 'https://www.tiktok.com/@rawatan.assalam'
TIKTOK_PRODUCTS = 'https://www.tiktok.com/@rawatanassalam2'
# Search engine ownership checks: paste only the content="..." value each console gives you
# (Google Search Console > HTML tag; Bing Webmaster Tools > Meta tag). They are public, not secrets.
GOOGLE_SITE_VERIFICATION = "PSTR0LFJIn_ELAkvZpnSvvB4GcK8yvvi2e1xhTp12_s"
BING_SITE_VERIFICATION = None
WA_GROUP_URL = 'https://chat.whatsapp.com/BvhJQwIugFgFlZB7ALGay7'  # TikTok Live announcement group (also in assets/js/config.js)

WA_MESSAGES = {
    'book': 'Assalamualaikum. Saya ingin mendapatkan Ikhtiar Rawatan Personal RM150. Mohon bantu saya untuk mendapatkan slot rawatan.',
    'ask': 'Assalamualaikum. Saya ada soalan tentang Rawatan Dzikir As-Salam. Mohon bantu saya.',
    'pkg': 'Assalamualaikum. Saya ingin menempah pakej 3 Sesi Rawatan Dzikir Terapi RM399. Mohon bantu saya untuk mendapatkan slot rawatan.',
    'group': 'Assalamualaikum. Saya ingin menyertai WhatsApp Group untuk makluman sesi TikTok Live As-Salam.',
    'talqin': 'Assalamualaikum. Saya ingin bertanya tentang Talqin Dzikir. Mohon bantu saya.',
    'kuliah': 'Assalamualaikum. Saya ingin bertanya tentang Kuliah Hakikat. Mohon bantu saya.',
    'majelis': 'Assalamualaikum. Saya ingin bertanya tentang Majelis Dzikir As-Salam. Mohon bantu saya.',
    'dakwah': 'Assalamualaikum. Saya ingin menyumbang untuk Dakwah Majelis As-Salam. Mohon bantu saya.',
}


def wa(key):
    return f'https://wa.me/{WA_NUMBER}?text=' + quote(WA_MESSAGES[key], safe='')


def bi(ms, en):
    return f'<span class="ms">{ms}</span><span class="en" lang="en">{en}</span>'


def icon(name, cls=''):
    c = f' class="{cls}"' if cls else ''
    return f'<svg{c} aria-hidden="true"><use href="#i-{name}"/></svg>'


ARROW = '<svg class="arrow" aria-hidden="true"><use href="#i-arrow"/></svg>'


def glue(text):
    """Keep the arrow on the same line as the last word."""
    t = text.rstrip()
    k = t.rfind(' ')
    head, last = (t[:k + 1], t[k + 1:]) if k >= 0 else ('', t)
    return f'{head}<span class="nw">{last}{ARROW}</span>'


def link(href, ms, en, extra=''):
    ext = ' target="_blank" rel="noopener"' if href.startswith('http') else ''
    return f'<a class="link" href="{href}"{ext}{extra}>{bi(glue(ms), glue(en))}</a>'


def btn(kind, cta='', cls=''):
    data = f' data-cta="{cta}"' if cta else ''
    if kind == 'book':
        return f'<a class="btn btn-primary {cls}" data-offer="rdt-1"{data} target="_blank" rel="noopener" href="{wa("book")}">{icon("wa")}{bi("Ikhtiar Rawatan Personal&nbsp;•&nbsp;RM150", "Personal Treatment&nbsp;•&nbsp;RM150")}</a>'
    if kind == 'pkg':
        return f'<a class="btn btn-secondary {cls}" data-offer="rdt-3"{data} target="_blank" rel="noopener" href="{wa("pkg")}">{icon("wa")}{bi("Tempah Pakej RM399", "Book the RM399 package")}</a>'
    if kind == 'live':
        return f'<a class="btn {cls or "btn-secondary"}"{data} target="_blank" rel="noopener" href="{TIKTOK}">{icon("tt")}{bi("Rawatan Percuma di TikTok Live", "Free treatment on TikTok Live")}</a>'
    if kind == 'follow':
        return (f'<a class="btn {cls or "btn-secondary"} tt-follow"{data} target="_blank" rel="noopener" href="{TIKTOK}">{icon("tt")}'
                f'<span class="when-off">{bi("Ikuti TikTok As-Salam", "Follow As-Salam on TikTok")}</span>'
                f'<span class="when-live">{bi("Tonton LIVE di TikTok", "Watch LIVE on TikTok")}</span></a>')
    if kind == 'group':
        return f'<a class="btn {cls or "btn-secondary"}"{data} data-wa-group target="_blank" rel="noopener" href="{WA_GROUP_URL}">{icon("wa")}{bi("Sertai WhatsApp Group", "Join the WhatsApp Group")}</a>'
    if kind == 'ask':
        return f'<a class="btn {cls or "btn-secondary"}"{data} target="_blank" rel="noopener" href="{wa("ask")}">{bi("WhatsApp Kami", "WhatsApp us")}</a>'
    raise ValueError(kind)


LIVE_STATUS = ('<div class="live-status" data-live-status>'
               '<p class="ls-pill"><span class="ls ls-on"><i aria-hidden="true"></i>LIVE</span>'
               '<span class="ls ls-off"><i aria-hidden="true"></i>' + bi('TIDAK LIVE', 'NOT LIVE') + '</span></p>'
               '<p class="ls-note"><span class="when-live">' + bi('Kami sedang bersiaran di TikTok sekarang.', 'We are live on TikTok right now.') + '</span>'
               '<span class="when-off">' + bi('Sertai WhatsApp Group untuk makluman sesi seterusnya.', 'Join the WhatsApp Group to hear about the next session.') + '</span></p>'
               '</div>')


def expand(html):
    html = html.replace('{{SAW}}', '&nbsp;<span class="saw">ﷺ</span>')
    html = html.replace('{{AYAH}}', 'وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ')
    html = html.replace('{{LIVESTATUS}}', LIVE_STATUS)
    html = html.replace('{{TIKTOK}}', TIKTOK).replace('{{TIKTOK_PRODUCTS}}', TIKTOK_PRODUCTS)
    html = re.sub(r'\{\{WA:(\w+)\}\}', lambda m: wa(m.group(1)), html)
    html = re.sub(r'\{\{I:([\w-]+)\}\}', lambda m: icon(m.group(1), 'chev' if m.group(1) == 'chev' else ''), html)
    html = re.sub(r'\{\{BTN:(\w+)(?:\|([\w-]*))?(?:\|([\w -]*))?\}\}', lambda m: btn(m.group(1), m.group(2) or '', m.group(3) or ''), html)
    html = re.sub(r'\{\{LINK:([^|}]+)\|([^|}]+)\|([^}]+)\}\}', lambda m: link(m.group(1), m.group(2), m.group(3)), html)
    html = re.sub(r'\[\[(.*?)\|\|(.*?)\]\]', lambda m: bi(m.group(1), m.group(2)), html, flags=re.S)
    return html


ICONS = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></symbol>
  <symbol id="i-tt" viewBox="0 0 24 24"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.2 4.2L19 7"/></symbol>
  <symbol id="i-chev" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 7h16M4 12h16M4 17h10"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></symbol>
</svg>'''

NAV = [
    ('rawatan', '/rawatan/', 'Rawatan', 'Treatment', ''),
    ('live', '/tiktok-live/', 'TikTok Live', 'TikTok Live', ''),
    ('perjalanan', '/perjalanan/', 'Perjalanan', 'Journey', 'nav-opt'),
    ('majelis', '/majelis/', 'Program &amp; Ilmu', 'Programmes', ''),
    ('tentang', '/tentang/', 'Tentang', 'About', 'nav-opt'),
]
MENU_MORE = [
    ('/rawatan/#pakej', 'Pakej 3 sesi', '3-session package'),
    ('/talqin/', 'Talqin Dzikir', 'Talqin Dzikir'),
    ('/produk/', 'Produk', 'Products'),
    ('/sedekah/', 'Sedekah', 'Sedekah'),
    ('/faq/', 'Soalan lazim', 'FAQ'),
]


def header(nav):
    links = ''.join(
        f'<a href="{href}" class="{cls}"{" aria-current=\"page\"" if key == nav else ""}>{bi(ms, en)}</a>'
        for key, href, ms, en, cls in NAV)
    lang = ('<div class="lang" role="group" aria-label="Bahasa / Language">'
            '<button type="button" data-set-lang="ms" aria-pressed="true">BM</button>'
            '<button type="button" data-set-lang="en" aria-pressed="false">EN</button></div>')
    menu_links = ''.join(
        f'<a href="{href}"{" aria-current=\"page\"" if key == nav else ""} data-close-menu>{bi(ms, en)}</a>'
        for key, href, ms, en, cls in NAV)
    more = ' · '.join(f'<a href="{h}">{bi(ms, en)}</a>' for h, ms, en in MENU_MORE)
    return f'''<header class="site-header">
  <div class="wrap header-in">
    <a class="brand" href="/">
      <img src="/assets/img/seal-160.webp" srcset="/assets/img/seal-160.webp 160w, /assets/img/seal-320.webp 320w" sizes="42px" width="42" height="42" alt="">
      <span class="brand-name" translate="no"><strong>Pusat Rawatan As-Salam</strong><small>Majelis Dzikir As-Salam</small></span>
    </a>
    <nav class="nav" aria-label="Utama">{links}{lang}{btn("book", "header", "btn-sm header-cta")}</nav>
    <button class="menu-btn" type="button" aria-haspopup="dialog" aria-controls="menu" aria-expanded="false">{icon("menu")}<span class="visually-hidden">{bi("Buka menu", "Open menu")}</span></button>
  </div>
</header>
<dialog class="menu" id="menu" aria-label="Menu">
  <div class="menu-top">
    <span class="brand"><img src="/assets/img/seal-160.webp" width="38" height="38" alt=""><span class="brand-name" translate="no"><strong>Pusat Rawatan As-Salam</strong></span></span>
    <button class="menu-close" type="button" data-close-menu>{icon("x")}<span class="visually-hidden">{bi("Tutup menu", "Close menu")}</span></button>
  </div>
  <nav aria-label="Menu">{menu_links}</nav>
  <div class="menu-foot">
    {btn("book", "menu")}
    <p class="menu-more" style="font-size:.9375rem">{more}</p>
    {lang}
  </div>
</dialog>'''


# Team WhatsApp lines in the footer (names and numbers from mvp5-1-light.html)
FOOTER_TEAM = [('Solah', '601140344764', '+60 11-4034 4764'),
               ('Firdaus', '60103648864', '+60 10-364 8864'),
               ('Anuar', '60169341909', '+60 16-934 1909'),
               ('Asma', '60162880503', '+60 16-288 0503')]


def footer():
    team = '\n        '.join(f'<li><a class="foot-person" target="_blank" rel="noopener" href="https://wa.me/{n}"><b>{name}</b> <span>{shown}</span></a></li>'
                             for name, n, shown in FOOTER_TEAM)
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <img src="/assets/img/seal-160.webp" width="56" height="56" alt="" loading="lazy">
        <strong translate="no">Pusat Rawatan As-Salam</strong>
        <p>{bi("Di bawah Majelis Dzikir As-Salam. Rawatan, ilmu, dakwah dan sedekah, sejak 2015.", "Under Majelis Dzikir As-Salam. Healing, knowledge, dakwah and sedekah, since 2015.")}</p>
      </div>
      <div><h2>{bi("Rawatan", "Treatment")}</h2><ul>
        <li><a href="/rawatan/">Rawatan Dzikir Terapi</a></li>
        <li><a href="/rawatan/#pakej">{bi("Pakej 3 sesi", "3-session package")}</a></li>
        <li><a href="/tiktok-live/">TikTok Live</a></li>
        <li><a href="/perjalanan/">{bi("Perjalanan", "The journey")}</a></li>
      </ul></div>
      <div><h2>As-Salam</h2><ul>
        <li><a href="/tentang/">{bi("Tentang As-Salam", "About As-Salam")}</a></li>
        <li><a href="/talqin/">Talqin Dzikir</a></li>
        <li><a href="/majelis/">{bi("Majelis &amp; Ilmu", "Majelis &amp; knowledge")}</a></li>
        <li><a href="/produk/">{bi("Produk", "Products")}</a></li>
        <li><a href="/sedekah/">{bi("Sedekah &amp; Amal Jariah", "Sedekah &amp; charity")}</a></li>
        <li><a href="/faq/">{bi("Soalan lazim", "FAQ")}</a></li>
      </ul></div>
      <div><h2>{bi("Hubungi", "Contact")}</h2><ul>
        <li><a target="_blank" rel="noopener" href="{wa("ask")}">WhatsApp +60 13-703 0155</a></li>
        {team}
        <li><a href="mailto:admin@dzikirassalam.com">admin@dzikirassalam.com</a></li>
        <li><a target="_blank" rel="noopener" href="https://share.google/F146CzhuCYGCmyb7D">{bi("Gelugor, Pulau Pinang · temujanji", "Gelugor, Penang · by appointment")}</a></li>
      </ul></div>
      <div><h2>{bi("Media Sosial", "Social media")}</h2><ul>
        <li><a target="_blank" rel="noopener" href="{TIKTOK}">TikTok</a></li>
        <li><a target="_blank" rel="noopener" href="https://www.youtube.com/@RawatanDzikirAs-Salam">YouTube</a></li>
        <li><a target="_blank" rel="noopener" href="https://linktr.ee/DzikirAsSalam">Linktree</a></li>
      </ul></div>
    </div>
    <div class="legal"><span>© 2026 Dzikir Assalam Worldwide · SSM 202603062910 (KT0609580-A)</span><span>Majelis Dzikir As-Salam</span></div>
  </div>
</footer>'''


def dock():
    book = btn('book', 'dock', '').replace('class="btn btn-primary "', 'class="btn btn-primary" data-dock-state="book"')
    live = (f'<a class="btn btn-primary" data-dock-state="live" data-cta="dock-live" aria-hidden="true" tabindex="-1" target="_blank" rel="noopener" href="{TIKTOK}">'
            f'{icon("tt")}{bi("Rawatan Percuma di TikTok Live", "Free treatment on TikTok Live")}</a>')
    return f'''<div class="dock" data-dock role="region" aria-label="Langkah seterusnya">
  <div class="dock-main">{book}{live}</div>
  <a class="btn btn-secondary dock-ask" data-cta="dock-ask" target="_blank" rel="noopener" href="{wa("ask")}">{icon("wa")}<span class="visually-hidden">{bi("WhatsApp Kami", "WhatsApp us")}</span></a>
</div>'''


JSONLD = '''<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Pusat Rawatan As-Salam",
  "legalName": "Dzikir Assalam Worldwide",
  "alternateName": ["Rawatan Dzikir As-Salam"],
  "parentOrganization": { "@type": "Organization", "name": "Majelis Dzikir As-Salam", "foundingDate": "2015" },
  "url": "https://dzikirassalam.com/",
  "logo": "https://dzikirassalam.com/assets/img/seal-640.webp",
  "image": "https://dzikirassalam.com/assets/img/og-v8.jpg",
  "email": "admin@dzikirassalam.com",
  "telephone": "+60137030155",
  "address": { "@type": "PostalAddress", "streetAddress": "3000A, Jalan Sultan Azlan Shah, Century Garden", "postalCode": "11700", "addressLocality": "Gelugor", "addressRegion": "Pulau Pinang", "addressCountry": "MY" },
  "availableLanguage": ["ms", "en"],
  "description": "Rawatan Islam melalui dzikir, doa dan ayat suci, mengikut kaedah Rawatan Rasulullah ﷺ, di bawah bimbingan Syeikh Muhammad Syahrum Alfan.",
  "makesOffer": [
    { "@type": "Offer", "name": "Rawatan Dzikir Terapi (1 sesi)", "price": "150", "priceCurrency": "MYR" },
    { "@type": "Offer", "name": "Pakej 3 Sesi Rawatan Dzikir Terapi", "price": "399", "priceCurrency": "MYR" }
  ],
  "sameAs": ["https://www.tiktok.com/@rawatan.assalam", "https://www.tiktok.com/@rawatanassalam2", "https://www.youtube.com/@RawatanDzikirAs-Salam", "https://linktr.ee/DzikirAsSalam"]
}
</script>'''


# Inline scripts run before first paint (LIVE flag, remembered language). Their SHA-256 hashes go
# into the Content-Security-Policy, so the policy always matches the exact script text here.
BOOT_SCRIPTS = [
    "try { var c = window.ASSALAM_CONFIG || {}; if (c.tiktokLive && c.tiktokLive.status === 'live') document.documentElement.dataset.live = 'live'; } catch (e) {}",
    "try { if (localStorage.getItem('assalam-lang') === 'en') { document.documentElement.dataset.lang = 'en'; document.documentElement.lang = 'en'; } } catch (e) {}",
]

# Analytics (self-hosted Umami, cookieless): where its script loads from and where it reports to.
ANALYTICS_SCRIPT_HOST = 'https://pulse.ahader.cloud'  # self-hosted Umami on the AHADER Coolify server
ANALYTICS_CONNECT_HOSTS = ['https://pulse.ahader.cloud']
# If config.js gets a tiktokLive.endpoint or checkout.endpoint, add that origin here or the browser blocks the call.
EXTRA_CONNECT_HOSTS = []


def sha256(text):
    return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode('utf-8')).digest()).decode() + "'"


CSP = '; '.join([
    "default-src 'self'",
    "script-src 'self' " + ' '.join(sha256(s) for s in BOOT_SCRIPTS) + ' ' + ANALYTICS_SCRIPT_HOST,
    "connect-src 'self' " + ' '.join(ANALYTICS_CONNECT_HOSTS + EXTRA_CONNECT_HOSTS),
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
])

# Short content hashes for ?v=, so CSS/JS can be cached for a year yet refresh on every change.
ASSET_V = {}


def file_version(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()[:10]


def breadcrumb_jsonld(path, body_src):
    """BreadcrumbList for the visible 'Utama / Page' trail on detail pages (only what the page shows)."""
    m = re.search(r'<p class="crumbs">.*?</a>\s*/\s*(.*?)</p>', body_src, re.S)
    if not m:
        return ''
    name = re.sub(r'\[\[(.*?)\|\|.*?\]\]', r'\1', m.group(1)).strip()  # BM half of [[BM||EN]]
    data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Utama', 'item': DOMAIN + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': re.sub(r'<[^>]+>', '', name).replace('&amp;', '&'), 'item': DOMAIN + path},
        ],
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def page(meta, body, body_src=''):
    path = meta['path']
    title = meta['title']
    desc = meta['description']
    home = path == '/'
    noindex = meta.get('noindex', False)
    preload = ('<link rel="preload" href="/assets/fonts/gelasio-var.woff2" as="font" type="font/woff2" crossorigin>\n'
               '<link rel="preload" as="image" href="/assets/img/hero-doa-1376.webp" media="(min-width: 761px)">\n'
               '<link rel="preload" as="image" href="/assets/img/hero-doa-800.webp" media="(max-width: 760px)">') if meta.get('hero') else ''
    index_meta = ('<meta name="robots" content="noindex">' if noindex else
                  f'<link rel="canonical" href="{DOMAIN}{path}">\n<meta property="og:url" content="{DOMAIN}{path}">')
    jsonld = JSONLD if home else ('' if noindex else breadcrumb_jsonld(path, body_src))
    verify = ''.join(f'<meta name="{n}" content="{v}">\n' for n, v in (('google-site-verification', GOOGLE_SITE_VERIFICATION), ('msvalidate.01', BING_SITE_VERIFICATION)) if v and home)
    return f'''<!doctype html>
<html lang="ms" data-lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{title}</title>
{verify}<meta name="description" content="{desc}">
{index_meta}
<meta name="theme-color" content="#fefdfa">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pusat Rawatan As-Salam">
<meta property="og:locale" content="ms_MY">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{DOMAIN}/assets/img/og-v8.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Pusat Rawatan As-Salam: Mencari Ketenangan atau Sedang Menghadapi Masalah Yang Berpanjangan?">
<meta name="twitter:image" content="{DOMAIN}/assets/img/og-v8.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/cormorant-garamond-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/plus-jakarta-sans-var.woff2" as="font" type="font/woff2" crossorigin>
{preload}
<link rel="stylesheet" href="/assets/css/site.css?v={ASSET_V['css']}">
<script src="/assets/js/config.js"></script>
<script>{BOOT_SCRIPTS[0]}</script>
<script>{BOOT_SCRIPTS[1]}</script>
{jsonld}
</head>
<body data-page="{meta.get('nav', '')}">
<a class="skip" href="#kandungan">{bi("Terus ke kandungan", "Skip to content")}</a>
{ICONS}
{header(meta.get('nav', ''))}
<main id="kandungan">
{body}
</main>
{footer()}
{dock()}
<script src="/assets/js/site.js?v={ASSET_V['js']}" defer></script>
</body>
</html>
'''


ROBOTS = f'''# dzikirassalam.com: every page is public and may be indexed.
User-agent: *
Allow: /

Sitemap: {DOMAIN}/sitemap.xml
'''


def sitemap(paths):
    urls = ''.join(f'  <url><loc>{DOMAIN}{p}</loc></url>\n' for p in paths)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')


def write(rel, text):
    out = os.path.join(SITE, rel)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8', newline='\n').write(text)


def main():
    # Start clean. Static files first; provenance .json notes stay in the source and never ship.
    shutil.rmtree(SITE, ignore_errors=True)
    shutil.copytree(STATIC, SITE, ignore=shutil.ignore_patterns('*.json', '.*'))
    for name, rel in (('site.css', 'assets/css/site.css'), ('site.js', 'assets/js/site.js')):
        write(rel, open(os.path.join(ROOT, name), encoding='utf-8').read())
    ASSET_V['css'] = file_version(os.path.join(ROOT, 'site.css'))
    ASSET_V['js'] = file_version(os.path.join(ROOT, 'site.js'))

    pages_dir = os.path.join(ROOT, 'pages')
    built, indexable = [], []
    for name in sorted(os.listdir(pages_dir)):
        if not name.endswith('.html'):
            continue
        src = open(os.path.join(pages_dir, name), encoding='utf-8').read()
        m = re.match(r'\s*<!--(\{.*?\})-->\s*', src, re.S)
        meta = json.loads(m.group(1))
        body_src = src[m.end():]
        html = expand(page(meta, expand(body_src), body_src))
        # Detail pages are folders (/rawatan/ -> rawatan/index.html); "file" names a plain file (404.html).
        write(meta.get('file') or os.path.join(meta['path'].strip('/'), 'index.html'), html)
        built.append(meta['path'])
        if not meta.get('noindex'):
            indexable.append(meta['path'])
    indexable.sort(key=lambda p: (p != '/', p))
    write('robots.txt', ROBOTS)
    write('sitemap.xml', sitemap(indexable))
    print('built', built)


if __name__ == '__main__':
    main()
