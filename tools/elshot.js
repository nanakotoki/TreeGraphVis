/* 元素级截图：node tools/elshot.js <algo> <steps> <selector> <name> [theme] */
const puppeteer = require('C:/Users/时嘉庆/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');
const ROOT = 'C:/Users/时嘉庆/github/TreeGraphVis';
const OUT = path.join(ROOT, 'shots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1020, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('ERR: ' + m.text()); });
  const target = process.argv[2] || 'dijkstra';
  const step = Number(process.argv[3] || 0);
  const sel = process.argv[4] || '#auxPanels';
  const outName = process.argv[5] || 'el';
  const theme = process.argv[6] || 'light';
  await page.goto('file:///' + ROOT.replace(/\\/g, '/') + '/index.html#' + target, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  if (theme === 'dark') {
    await page.evaluate(() => document.querySelector('#btnTheme').click());
    await new Promise(r => setTimeout(r, 300));
  }
  for (let i = 0; i < step; i++) {
    await page.evaluate(() => document.querySelector('#btnNext').click());
    await new Promise(r => setTimeout(r, 45));
  }
  await new Promise(r => setTimeout(r, 500));
  const el = await page.$(sel);
  if (!el) { console.log('no element', sel); await browser.close(); return; }
  await el.screenshot({ path: path.join(OUT, outName + '.png') });
  console.log('saved', outName);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
  await browser.close();
})();
