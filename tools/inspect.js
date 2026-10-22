const puppeteer = require('C:/Users/时嘉庆/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1680, height: 1020 });
  await p.goto('file:///C:/Users/时嘉庆/github/TreeGraphVis/index.html#' + (process.argv[2]||'avl_insert'), { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  const n = Number(process.argv[3]||0);
  for (let i=0;i<n;i++){ await p.evaluate(()=>document.querySelector('#btnNext').click()); await new Promise(r=>setTimeout(r,50)); }
  await new Promise(r=>setTimeout(r,500));
  const out = await p.evaluate(() => {
    const nodes = [...document.querySelectorAll('.node')].map(g => ({
      id: g.getAttribute('data-id'),
      cls: g.getAttribute('class'),
      badges: [...g.querySelectorAll('.badges text')].map(t=>t.textContent)
    }));
    const app = window.TGVApp;
    return { nodes, frames: app.playerA.frames.length, pos: app.playerA.pos, sceneBadges: Object.fromEntries(Object.entries(app.playerA.scene.nodes).map(([k,v])=>[k, v.badges])) };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
