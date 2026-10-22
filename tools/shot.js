/* 无头截图与前端错误采集 */
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
    args: ['--allow-file-access-from-files', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1020, deviceScaleFactor: 1.4 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type().toUpperCase() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const target = process.argv[2] || 'bst_insert';
  const step = Number(process.argv[3] || 0);
  const outName = process.argv[4] || 'shot';
  const theme = process.argv[5] || 'light';
  const preset = process.argv[6] || '';

  await page.goto('file:///' + ROOT.replace(/\\/g, '/') + '/index.html#' + target, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 700));
  if (preset) {
    await page.evaluate((pid) => {
      const sel = document.querySelector('#presetSelect');
      sel.value = pid;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, preset);
    await new Promise(r => setTimeout(r, 500));
  }
  if (theme === 'dark') {
    await page.evaluate(() => document.querySelector('#btnTheme').click());
    await new Promise(r => setTimeout(r, 400));
  }
  // 步进
  for (let i = 0; i < step; i++) {
    await page.evaluate(() => document.querySelector('#btnNext').click());
    await new Promise(r => setTimeout(r, 70));
  }
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(OUT, outName + '.png') });
  console.log('saved', outName);
  if (errors.length) console.log('--- console ---\n' + errors.slice(0, 25).join('\n'));
  await browser.close();
})();
