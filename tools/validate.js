/* 无头校验：加载全部算法模块，逐 preset 回放每一帧，检查协议一致性 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 直接从 index.html 读脚本顺序（排除 ui.js），新增算法只需改 index.html
const htmlSrc = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const files = [...htmlSrc.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map(m => m[1])
  .filter(f => !f.endsWith('ui.js'));

const sandbox = { console, performance: { now: () => Date.now() } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
  } catch (e) {
    console.error('✗ 加载失败 ' + f + ': ' + e.message);
    process.exitCode = 1;
  }
}

const TGV = sandbox.TGV;
const ids = Object.keys(TGV.algos);
let totalFrames = 0, problems = [];

ids.forEach(id => {
  const meta = TGV.algos[id];
  const presets = meta.presets || [];
  if (!presets.length) problems.push(`[${id}] 没有预设`);
  presets.forEach(preset => {
    let data;
    try {
      const input = preset.data ? preset.data() : {};
      data = meta.run(input);
    } catch (e) {
      problems.push(`[${id}/${preset.id}] run 抛错: ${e.message}\n${e.stack.split('\n')[1] || ''}`);
      return;
    }
    let norm;
    try {
      norm = TGV.normalize(meta, data);
    } catch (e) {
      problems.push(`[${id}/${preset.id}] normalize 失败: ${e.message}`);
      return;
    }
    if (!norm.frames.length) problems.push(`[${id}/${preset.id}] 没有帧`);
    totalFrames += norm.frames.length;

    // 逐帧回放（含末尾）
    const errs = new Set();
    for (let i = 0; i < norm.frames.length; i++) {
      const res = TGV.replay(norm, norm.frames, i);
      res.errs.forEach(e => errs.add(e));
      // 索引检查
      const sc = res.scene;
      Object.keys(sc.nodes).forEach(nid => {
        if (!sc.nodeOrder.includes(nid)) errs.add('nodeOrder 缺少 ' + nid);
      });
    }
    if (errs.size) problems.push(`[${id}/${preset.id}] 指令问题: ${Array.from(errs).slice(0, 6).join(' | ')}`);

    // 静态检查
    const plines = (meta.pseudocode || []).length;
    norm.frames.forEach((f, i) => {
      if (!f.narration) problems.push(`[${id}/${preset.id}] 帧 #${i} 无解说`);
      if (f.codeLine != null && (f.codeLine < 1 || f.codeLine > plines)) problems.push(`[${id}/${preset.id}] 帧 #${i} codeLine=${f.codeLine} 超出伪代码行数 ${plines}`);
    });

    // 布局检查（树布局不得有重叠）
    const layout = meta.layout;
    if (layout === 'tree') {
      const res = TGV.replay(norm, norm.frames, norm.frames.length - 1);
      const sc = res.scene;
      const nodes = [], edges = [];
      norm.nodes.forEach(n => {
        if (!sc.nodes[n.id] || sc.nodes[n.id].hidden) return;
        nodes.push({ id: n.id, slots: sc.nodes[n.id].slots, key: n.key, ord: n.ord });
      });
      norm.edges.forEach(e => {
        const st = sc.edges[e.id];
        if (!st || st.hidden) return;
        edges.push(e);
      });
      const lay = TGV.Layouts.tidyTree(nodes, edges, { childOrder: meta.childOrder || 'key' });
      const arr = Object.keys(lay.pos).map(k => ({ id: k, ...lay.pos[k] }));
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i], b = arr[j];
          if (Math.abs(a.y - b.y) < 1 && Math.abs(a.x - b.x) < 40) {
            errs.add('节点重叠 ' + a.id + '/' + b.id);
            problems.push(`[${id}/${preset.id}] 布局重叠: ${a.id} 与 ${b.id}`);
          }
        }
      }
    }
  });
});

console.log(`\n算法总数: ${ids.length}，帧总数: ${totalFrames}`);
if (problems.length) {
  console.log(`\n发现问题 ${problems.length} 条：`);
  problems.slice(0, 60).forEach(p => console.log(' · ' + p));
  process.exitCode = 1;
} else {
  console.log('✓ 全部通过');
}
