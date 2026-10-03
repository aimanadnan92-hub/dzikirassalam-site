// Lighthouse (Google) on the live site, phone and desktop:  npm run lighthouse [-- /path/ ...]
// Uses the installed Chrome; nothing is added to the project. Reports land in .lighthouse/ (ignored by git).
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const LIVE = process.env.BASE_URL || 'https://dzikirassalam.com';
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/rawatan/', '/tiktok-live/'];
mkdirSync('.lighthouse', { recursive: true });

for (const path of paths) {
  for (const form of ['mobile', 'desktop']) {
    const file = `.lighthouse/${(path.replace(/\//g, '') || 'home')}-${form}.json`;
    // Headless Chrome occasionally fails to record a trace (NO_NAVSTART): retry rather than report a bogus score.
    let r;
    for (let attempt = 1; attempt <= 3 && !r; attempt++) {
      try {
        execSync(`npx -y lighthouse@12 "${LIVE}${path}" --quiet --chrome-flags="--headless=new" ${form === 'desktop' ? '--preset=desktop' : ''} --output=json --output-path="${file}"`, { stdio: 'inherit' });
        const json = JSON.parse(readFileSync(file, 'utf8'));
        if (!json.runtimeError && json.categories.performance.score !== null) r = json;
      } catch { /* try again */ }
    }
    if (!r) { console.log(`${path} ${form}: Lighthouse failed 3 times, run again later`); continue; }
    const s = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const a = r.audits;
    console.log(`${path} ${form}: perf ${s.performance} · a11y ${s.accessibility} · best ${s['best-practices']} · seo ${s.seo} | LCP ${a['largest-contentful-paint'].displayValue} · CLS ${a['cumulative-layout-shift'].displayValue} · TBT ${a['total-blocking-time'].displayValue}`);
  }
}
