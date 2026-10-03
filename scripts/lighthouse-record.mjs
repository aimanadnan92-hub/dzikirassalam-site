// Run Lighthouse on the live site and append a compact summary to a history file.
//   node scripts/lighthouse-record.mjs <history.json>
// Used by .github/workflows/lighthouse.yml (daily); the owner dashboard reads the file from the
// lighthouse-data branch. Keeps the last 120 runs. Scores are 0..1 as Lighthouse reports them;
// each page/form is the median of 3 runs.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: lighthouse-record.mjs <history.json>'); process.exit(1); }
const LIVE = process.env.BASE_URL || 'https://dzikirassalam.com';
const PATHS = ['/', '/rawatan/', '/tiktok-live/'];
const TMP = '.lighthouse/record.json';
mkdirSync('.lighthouse', { recursive: true });

const results = [];
for (const path of PATHS) {
  for (const form of ['mobile', 'desktop']) {
    // Single Lighthouse runs on shared CI machines are noisy: take the run with the median
    // performance score out of 3 good runs (Lighthouse's own variability guidance).
    const good = [];
    for (let attempt = 1; attempt <= 6 && good.length < 3; attempt++) {
      try {
        execSync(`npx -y lighthouse@12 "${LIVE}${path}" --quiet --chrome-flags="--headless=new --no-sandbox" ${form === 'desktop' ? '--preset=desktop' : ''} --output=json --output-path="${TMP}"`, { stdio: 'inherit' });
        const j = JSON.parse(readFileSync(TMP, 'utf8'));
        if (!j.runtimeError && j.categories.performance.score !== null) good.push(j);
      } catch { /* retry */ }
    }
    good.sort((x, y) => x.categories.performance.score - y.categories.performance.score);
    const r = good.length ? good[Math.floor(good.length / 2)] : null;
    const c = r?.categories, a = r?.audits;
    results.push({
      path, form,
      performance: c?.performance.score ?? null,
      accessibility: c?.accessibility.score ?? null,
      bestPractices: c?.['best-practices'].score ?? null,
      seo: c?.seo.score ?? null,
      lcpMs: a?.['largest-contentful-paint'].numericValue ?? null,
      cls: a?.['cumulative-layout-shift'].numericValue ?? null,
      tbtMs: a?.['total-blocking-time'].numericValue ?? null,
    });
    console.log(path, form, results.at(-1));
  }
}

const history = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
history.push({ at: new Date().toISOString(), commit: (process.env.GITHUB_SHA || 'local').slice(0, 7), results });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(history.slice(-120), null, 1) + '\n');
console.log(`appended run ${history.length} to ${OUT}`);
