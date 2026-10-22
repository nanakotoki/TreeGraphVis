/* ============================================================
 * 三语言实现校验：覆盖度 / 非空 / 括号平衡 / 行数 / 关键字
 * 用法：node tools/validate-code.js
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { TGV: {} };
vm.createContext(sandbox);

const dir = path.join(ROOT, 'js/data');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
files.forEach(f => {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const S = sandbox.TGV.solutions || {};
const keys = Object.keys(S);

const catalog = fs.readFileSync(path.join(ROOT, 'docs/algorithm-catalog.md'), 'utf8');
const ids = [...catalog.matchAll(/^- `([a-z0-9_]+)`/gm)].map(m => m[1]);

const missing = ids.filter(id => !S[id]);
const extra = keys.filter(k => ids.indexOf(k) < 0);

const problems = [];
let lines = 0;
ids.forEach(id => {
  const e = S[id];
  if (!e) return;
  ['cpp', 'py', 'java'].forEach(lang => {
    const src = e[lang];
    if (typeof src !== 'string' || !src.trim()) {
      problems.push(`${id}.${lang}: 空实现`);
      return;
    }
    const ls = src.split('\n');
    lines += ls.length;
    if (ls.length < 4) problems.push(`${id}.${lang}: 仅 ${ls.length} 行，疑似占位`);
    if (/TODO|FIXME|\bundefined\b/.test(src)) problems.push(`${id}.${lang}: 含 TODO/undefined`);
    if (lang !== 'py') {
      // 先剥掉注释与字符串，避免 "1)" 这类编号、字符串里的括号造成误报
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''");
      const pairs = [['{', '}'], ['(', ')'], ['[', ']']];
      pairs.forEach(([a, b]) => {
        const open = (stripped.match(new RegExp('\\' + a, 'g')) || []).length;
        const close = (stripped.match(new RegExp('\\' + b, 'g')) || []).length;
        if (open !== close) problems.push(`${id}.${lang}: ${a}${b} 不平衡 (${open}/${close})`);
      });
    }
    if (/\\0/.test(src) && lang === 'java') { /* 合法转义，忽略 */ }
  });
});

console.log('三语言实现文件:', files.length, '｜ 覆盖算法:', keys.length, '/', ids.length);
console.log('代码总行数:', lines);
if (missing.length) console.log('✗ 缺失实现:', missing.join(', '));
if (extra.length) console.log('✗ 多余条目:', extra.join(', '));
if (problems.length) {
  console.log('✗ 发现问题:');
  problems.slice(0, 40).forEach(p => console.log('  -', p));
  if (problems.length > 40) console.log('  ... 共', problems.length, '条');
} else {
  console.log('✓ 覆盖完整，结构检查通过');
}
process.exit(missing.length || extra.length || problems.length ? 1 : 0);
