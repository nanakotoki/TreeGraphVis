const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = 'C:/Users/时嘉庆/github/TreeGraphVis';
// 直接从 index.html 读脚本顺序，保证与页面加载顺序一致、永不脱节
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map(m => m[1])
  .filter(f => !f.endsWith('ui.js'));   // ui.js 依赖 DOM，不能进沙箱
const sb = { console };
sb.globalThis = sb;
vm.createContext(sb);
files.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f }));
const algos = sb.TGV.algos;
const cat = {};
Object.keys(algos).forEach(id => {
  const m = algos[id];
  (cat[m.category] = cat[m.category] || []).push({ id, name: m.name, presets: (m.presets || []).length });
});
let out = '';
let total = 0;
Object.keys(cat).forEach(c => {
  out += '### ' + c + '\n\n';
  cat[c].forEach(a => { out += '- `' + a.id + '` — ' + a.name + '（' + a.presets + ' 个预设）\n'; total += 1; });
  out += '\n';
});
fs.writeFileSync(path.join(ROOT, 'docs', 'algorithm-catalog.md'), out);
console.log('algos=' + total);
