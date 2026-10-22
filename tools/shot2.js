const puppeteer = require('C:/Users/时嘉庆/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1680, height: 1020, deviceScaleFactor: 2 });
  await p.goto('file:///C:/Users/时嘉庆/github/TreeGraphVis/index.html#' + (process.argv[2]||'avl_insert'), { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  const n = Number(process.argv[3]||0);
  for (let i=0;i<n;i++){ await p.evaluate(()=>document.querySelector('#btnNext').click()); await new Promise(r=>setTimeout(r,40)); }
  await new Promise(r=>setTimeout(r,700));
  const el = await p.$('#stageA');
  await el.screenshot({ path: 'shots/' + (process.argv[4]||'crop') + '.png' });
  await b.close();
})();
