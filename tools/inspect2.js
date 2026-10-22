const puppeteer = require('C:/Users/时嘉庆/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1680, height: 1020 });
  await p.goto('file:///C:/Users/时嘉庆/github/TreeGraphVis/index.html#avl_insert', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));
  for (let i=0;i<20;i++){ await p.evaluate(()=>document.querySelector('#btnNext').click()); await new Promise(r=>setTimeout(r,40)); }
  await new Promise(r=>setTimeout(r,600));
  const out = await p.evaluate(() => {
    return [...document.querySelectorAll('.node')].map(g => {
      const bl = g.querySelector('.badges');
      const rects = [...bl.querySelectorAll('rect')].map(r => { const b = r.getBoundingClientRect(); return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]; });
      const gb = g.getBoundingClientRect();
      return { id: g.getAttribute('data-id'), transform: g.getAttribute('transform'), node: [Math.round(gb.x),Math.round(gb.y)], rects, inner: bl.innerHTML.slice(0,120) };
    });
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
