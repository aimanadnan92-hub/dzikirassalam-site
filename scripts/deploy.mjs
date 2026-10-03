// Ship the site: build, test, check for secrets, push, deploy on Coolify, then test the LIVE site.
//   npm run deploy
// Stops at the first failure. Nothing is pushed if the local tests fail; if the live checks fail
// after a deploy, roll back (docs/WEBSITE-OPERATIONS.md, "Rollback").
//
// The Coolify API token is read from a file outside this repo (never commit it):
//   COOLIFY_TOKEN_FILE, default ../../12_Rawatan-AI_Project/.coolify-token (relative to this repo)
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COOLIFY = 'https://coolify.ahader.cloud/api/v1';
const APP_UUID = 'vksscgsg4w0ck000ss4ksgs0'; // Coolify application "website"
const LIVE = 'https://dzikirassalam.com';
const TOKEN_FILE = process.env.COOLIFY_TOKEN_FILE || resolve('../../12_Rawatan-AI_Project/.coolify-token');

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const step = (s) => console.log(`\n=== ${s}`);
const fail = (msg) => { console.error(`\nSTOPPED: ${msg}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

step('1/7 Git state');
if (out('git rev-parse --abbrev-ref HEAD') !== 'main') fail('not on main');
if (out('git status --porcelain')) fail('uncommitted changes: commit them first (git status)');
const sha = out('git rev-parse HEAD');
console.log('commit', sha.slice(0, 7), out('git log -1 --format=%s'));

step('2/7 Secret scan of tracked files');
const tracked = out('git ls-files').split('\n').filter((f) => !/\.(woff2|png|jpg|webp|ico)$/.test(f) && f !== 'package-lock.json');
const SECRET = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\b\d+\|[A-Za-z0-9]{30,}\b|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})/;
const hits = tracked.filter((f) => existsSync(f) && SECRET.test(readFileSync(f, 'utf8')));
if (hits.length) fail(`possible secret in: ${hits.join(', ')}`);
console.log(`${tracked.length} files clean`);

step('3/7 Build and local tests (all screen sizes)');
run('npm test');

step('4/7 Push to GitHub');
run('git push origin main');

step('5/7 Deploy on Coolify');
if (!existsSync(TOKEN_FILE)) fail(`Coolify token file not found at ${TOKEN_FILE} (set COOLIFY_TOKEN_FILE)`);
const token = readFileSync(TOKEN_FILE, 'utf8').trim();
const api = async (path) => {
  const r = await fetch(COOLIFY + path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!r.ok) fail(`Coolify API ${path.split('?')[0]} answered ${r.status}`);
  return r.json();
};
const started = await api(`/deploy?uuid=${APP_UUID}&force=false`);
const dep = started.deployments?.[0]?.deployment_uuid;
if (!dep) fail(`Coolify did not start a deployment: ${JSON.stringify(started)}`);
console.log('deployment', dep);
let status = '';
for (let i = 0; i < 90; i++) {
  await sleep(10_000);
  status = (await api(`/deployments/${dep}`)).status;
  process.stdout.write(`  ${status}\n`);
  if (['finished', 'failed', 'cancelled-by-user', 'error'].includes(status)) break;
}
if (status !== 'finished') fail(`deployment ended as "${status}". The previous version is still serving. Read the log in Coolify.`);

step('6/7 Live site serves this commit');
const css = execSync('python -c "import hashlib;print(hashlib.sha256(open(\'site-src/site.css\',\'rb\').read()).hexdigest()[:10])"', { encoding: 'utf8' }).trim();
for (let i = 0; i < 12; i++) {
  const html = await (await fetch(LIVE + '/', { cache: 'no-store' })).text();
  if (html.includes(`site.css?v=${css}`)) { console.log('live homepage matches this build'); break; }
  if (i === 11) fail('live homepage still shows the previous build');
  await sleep(5_000);
}
const hz = await fetch(LIVE + '/healthz');
if (hz.status !== 200) fail(`/healthz answered ${hz.status}`);

step('7/7 Full test suite against the LIVE site');
run('npx playwright test --project=desktop --project=mobile --project=iphone', { env: { ...process.env, BASE_URL: LIVE } });

console.log(`\nDEPLOYED ${sha.slice(0, 7)} and verified on ${LIVE}`);
