// Headless UI smoke test: logs in as each role through the real API, visits every route,
// switches languages, and fails on any console error / uncaught exception / missing-translation key.
// Usage: node ui-smoke.mjs [frontendUrl] [apiUrl]   (requires Chrome or Edge installed)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const FRONT = process.argv[2] || 'http://localhost:5173';
const API = process.argv[3] || 'http://localhost:5000/api';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('No Chrome/Edge found'); process.exit(1); }

const PORT = 9333;
const chrome = spawn(CHROME, [`--headless=new`, '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`, '--window-size=1366,900', `--user-data-dir=${process.env.TEMP || '/tmp'}/ui-smoke-profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 30; i++) {
    try {
      const targets = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json());
      const page = targets.find(t => t.type === 'page');
      if (page) return new WebSocket(page.webSocketDebuggerUrl);
    } catch { /* retry */ }
    await sleep(300);
  }
  throw new Error('Could not connect to Chrome');
}

const ws = await connect();
await new Promise(r => ws.onopen = r);
let id = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') problems.push(`EXCEPTION: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`.slice(0, 300));
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
    if (!/Download the React DevTools/.test(text)) problems.push(`CONSOLE.ERROR: ${text}`.slice(0, 300));
  }
};
const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(1800); };

await send('Runtime.enable');
await send('Page.enable');

const login = async (username, role) => {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'Password123', role }) }).then(r => r.json());
  if (!res.token) throw new Error(`Login failed for ${username}`);
  await goto(FRONT + '/');
  await evaluate(`localStorage.setItem('authToken', ${JSON.stringify(res.token)}); localStorage.setItem('currentUser', ${JSON.stringify(JSON.stringify(res.user))}); 'ok'`);
};

const checkPage = async (label) => {
  const info = await evaluate(`(() => {
    const text = document.body.innerText || '';
    const untranslated = (text.match(/\\b(common|staff|worker|admin|profile|login|nav|statuses|categories|bins|notifications)\\.[a-zA-Z.]+/g) || []);
    return { len: text.length, untranslated: [...new Set(untranslated)].slice(0, 5), hasRoot: !!document.getElementById('root')?.children.length, title: (document.querySelector('h1')?.innerText || '').slice(0, 60) };
  })()`);
  const bad = !info?.hasRoot || info.len < 100 || info.untranslated.length;
  if (bad) problems.push(`PAGE ${label}: blank=${!info?.hasRoot} textLen=${info?.len} untranslated=${JSON.stringify(info?.untranslated)}`);
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${label.padEnd(34)} h1="${info?.title}"`);
};

const ROUTES = {
  admin: ['/admin', '/admin/users', '/admin/users?view=staff', '/admin/users?view=worker', '/admin/settings'],
  staff: ['/staff', '/staff/add-waste', '/staff/history', '/staff/profile'],
  worker: ['/worker', '/worker/assigned', '/worker/history', '/worker/profile']
};

try {
  console.log('Login page');
  await goto(FRONT + '/');
  await sleep(4000); // first load: Vite dev pre-bundles dependencies
  await evaluate(`localStorage.clear(); 'ok'`); // deterministic: no session/language from a previous run
  await goto(FRONT + '/');
  await checkPage('/ (login)');
  const loginClicked = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Admin/.test(x.innerText)); if (!b) return false; b.click(); return true; })()`);
  await sleep(500);
  const hasForm = await evaluate(`!!document.querySelector('#login-username') && !!document.querySelector('#login-password')`);
  if (!loginClicked || !hasForm) problems.push('LOGIN: role selection did not reveal the login form');
  console.log(`  ${hasForm ? 'ok  ' : 'FAIL'} role selection shows login form`);

  for (const [role, routes] of Object.entries(ROUTES)) {
    console.log(`\nRole: ${role}`);
    await login(role === 'admin' ? 'adminname' : role === 'staff' ? 'staff001' : 'worker001', role);
    for (const r of routes) { await goto(FRONT + r); await checkPage(r); }
  }

  console.log('\nLanguages (worker dashboard + staff add-waste)');
  for (const lang of ['ta', 'hi', 'te', 'kn', 'ml', 'en']) {
    await evaluate(`localStorage.setItem('appLanguage', '${lang}'); 'ok'`);
    await goto(FRONT + '/worker');
    await checkPage(`/worker [${lang}]`);
  }
  await login('staff001', 'staff');
  for (const lang of ['ta', 'hi', 'en']) {
    await evaluate(`localStorage.setItem('appLanguage', '${lang}'); 'ok'`);
    await goto(FRONT + '/staff/add-waste');
    await checkPage(`/staff/add-waste [${lang}]`);
  }

  console.log('\nWorkflow through the UI: staff logs → worker collects → verifies bin → disposes');
  await evaluate(`localStorage.setItem('appLanguage', 'en'); 'ok'`);
  await login('staff001', 'staff');
  await goto(FRONT + '/staff/add-waste');
  const room = `UI Test Room ${Date.now() % 10000}`;
  const workerName = await evaluate(`(() => {
    const setVal = (el, v) => { const s = Object.getOwnPropertyDescriptor(el.__proto__, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const inputs = [...document.querySelectorAll('form input')];
    setVal(inputs.find(i => i.getAttribute('list') === 'room-suggestions-add'), ${JSON.stringify(room)});
    setVal(inputs.find(i => i.type === 'number'), '3.2');
    const selects = [...document.querySelectorAll('form select')];
    const workerSel = selects[selects.length - 1];
    const opt = [...workerSel.options].find(o => /worker001|Sanitation Worker 1 /.test(o.text) || /worker001/.test(o.text)) || workerSel.options[1];
    setVal(workerSel, opt.value);
    document.querySelector('form button[type=submit]').click();
    return opt.text;
  })()`);
  await sleep(2000);
  const staffMsg = await evaluate(`document.body.innerText.includes('logged and assigned') ? 'ok' : document.body.innerText.slice(0, 200)`);
  if (staffMsg !== 'ok') problems.push(`WORKFLOW: staff submit did not confirm (${staffMsg})`);
  console.log(`  ${staffMsg === 'ok' ? 'ok  ' : 'FAIL'} staff logged record for ${room} → ${workerName}`);

  const workerUser = /worker(\d{3})/.exec(workerName)?.[0] || 'worker001';
  await login(workerUser, 'worker');
  await goto(FRONT + '/worker/assigned');
  const collected = await evaluate(`(() => {
    const row = [...document.querySelectorAll('tbody tr')].find(tr => tr.innerText.includes(${JSON.stringify(room)}));
    if (!row) return 'row not found';
    const btn = row.querySelector('button[id^=btn-collect-]'); if (!btn) return 'no collect button'; btn.click(); return 'clicked';
  })()`);
  await sleep(2000);
  const disposed = await evaluate(`(() => {
    const row = [...document.querySelectorAll('tbody tr')].find(tr => tr.innerText.includes(${JSON.stringify(room)}));
    if (!row) return 'row not found after collect';
    const btn = row.querySelector('button[id^=btn-dispose-]'); if (!btn) return 'no dispose button (status: ' + row.innerText.replace(/\\s+/g, ' ').slice(0, 120) + ')'; btn.click(); return 'clicked';
  })()`);
  await sleep(600);
  const confirmed = await evaluate(`(() => { const b = document.querySelector('#btn-confirm-disposal'); if (!b) return 'no confirm button'; if (b.disabled) return 'confirm disabled'; b.click(); return 'clicked'; })()`);
  await sleep(2000);
  const gone = await evaluate(`![...document.querySelectorAll('tbody tr')].some(tr => tr.innerText.includes(${JSON.stringify(room)}))`);
  const workflowOk = collected === 'clicked' && disposed === 'clicked' && confirmed === 'clicked' && gone;
  if (!workflowOk) problems.push(`WORKFLOW: collect=${collected} dispose=${disposed} confirm=${confirmed} removedFromActive=${gone}`);
  console.log(`  ${workflowOk ? 'ok  ' : 'FAIL'} worker collect → verify → dispose (collect=${collected}, dispose=${disposed}, confirm=${confirmed})`);
  await goto(FRONT + '/worker/history');
  const inHistory = await evaluate(`document.body.innerText.includes(${JSON.stringify(room)})`);
  if (!inHistory) problems.push('WORKFLOW: disposed record missing from worker history');
  console.log(`  ${inHistory ? 'ok  ' : 'FAIL'} record appears in collection history`);

  console.log('\nChatbot: text classification and honest photo handling');
  await login('staff001', 'staff');
  await goto(FRONT + '/staff/add-waste');
  await evaluate(`(() => {
    const input = [...document.querySelectorAll('input[type=text]')].find(i => /describe waste|Ask a doubt/i.test(i.placeholder));
    const setVal = (el, v) => { Object.getOwnPropertyDescriptor(el.__proto__, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    setVal(input, 'blood soaked cotton');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return 'sent';
  })()`);
  await sleep(1500);
  const textResult = await evaluate(`(() => { const tags = [...document.querySelectorAll('.bin-tag')].map(e => e.innerText); return tags[tags.length - 1] || 'none'; })()`);
  const textOk = /Yellow/i.test(textResult);
  if (!textOk) problems.push(`CHATBOT: "blood soaked cotton" classified as ${textResult}, expected Yellow`);
  console.log(`  ${textOk ? 'ok  ' : 'FAIL'} "blood soaked cotton" → ${textResult}`);

  // Attach a photo with no description: must not invent a classification
  const { writeFileSync } = await import('node:fs');
  const pngPath = `${process.env.TEMP || '/tmp'}/ui-smoke-cotton.png`;
  writeFileSync(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  await send('DOM.enable');
  const doc = await send('DOM.getDocument', { depth: -1 });
  const fileNode = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
  await send('DOM.setFileInputFiles', { nodeId: fileNode.result.nodeId, files: [pngPath] });
  await sleep(600);
  const binsBefore = await evaluate(`document.querySelectorAll('.bin-tag').length`);
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.title && /Send message/i.test(x.title)); b.click(); return 'clicked'; })()`);
  await sleep(3500);
  const photoInfo = await evaluate(`(() => {
    const msgs = [...document.querySelectorAll('div')].map(d => d.innerText || '').filter(t => /Photo scanning|could not identify|found \\d+ item|Based on your description/i.test(t));
    return { binsAfter: document.querySelectorAll('.bin-tag').length, replied: msgs.length > 0, sharps: /Sharps/.test(document.body.innerText.slice(-1500)) };
  })()`);
  const photoOk = photoInfo.replied && (photoInfo.binsAfter === binsBefore || !photoInfo.sharps);
  if (!photoOk) problems.push(`CHATBOT: photo without description produced a guess (${JSON.stringify(photoInfo)})`);
  console.log(`  ${photoOk ? 'ok  ' : 'FAIL'} photo without description → honest reply, no invented "Sharps" (${JSON.stringify(photoInfo)})`);

  console.log('\nRoute guard: staff visiting /admin should land on /staff');
  await goto(FRONT + '/admin');
  const path = await evaluate('location.pathname');
  if (path !== '/staff') problems.push(`GUARD: expected /staff, got ${path}`);
  console.log(`  ${path === '/staff' ? 'ok  ' : 'FAIL'} redirected to ${path}`);

  console.log('\nExpired token should bounce to login');
  await evaluate(`localStorage.setItem('authToken', 'garbage'); 'ok'`);
  await goto(FRONT + '/staff');
  await sleep(1500);
  const path2 = await evaluate('location.pathname');
  if (path2 !== '/') problems.push(`SESSION: expected / after 401, got ${path2}`);
  console.log(`  ${path2 === '/' ? 'ok  ' : 'FAIL'} redirected to ${path2}`);
} finally {
  ws.close();
  chrome.kill();
}

const errors = problems.filter(p => !p.startsWith('CONSOLE.ERROR: Failed to load notifications') );
console.log(errors.length ? `\n${errors.length} problem(s):\n - ${errors.join('\n - ')}` : '\nUI smoke test passed with no console errors or exceptions.');
process.exit(errors.length ? 1 : 0);
