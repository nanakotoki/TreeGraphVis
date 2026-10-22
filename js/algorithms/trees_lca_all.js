/* ============================================================
 * 第一卷 · 规范清单补齐（三）
 *   最近公共祖先 · 四法同屏对比
 *   同一棵树、同一组询问，依次演示：
 *     ① 朴素逐层上跳   ② 倍增法
 *     ③ Tarjan 离线    ④ 欧拉序转 RMQ
 *   每法完成后把「实测步数」写进对比表，最后一帧汇总复杂度。
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  const NODES = [['A', 420, 100], ['B', 220, 240], ['C', 620, 240], ['D', 120, 380],
    ['E', 300, 380], ['F', 530, 380], ['G', 700, 380], ['H', 380, 500]];
  const EDGES = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['C', 'G'], ['E', 'H']];
  const K = 2;   // 2^2 = 4 ≥ 最大深度 3，倍增表 3 列足够

  TGV.register({
    id: 'lca_showdown', name: '最近公共祖先 · 四法同屏对比', category: '树 · 最近公共祖先',
    layout: 'tree', childOrder: 'none', directed: true, acceptsGraph: false,
    compareWith: 'lca_binary',
    panels: [
      { id: 'dep', type: 'table', title: '深度表 dep · 首现位置 first', columns: [{ key: 'd', label: 'dep' }, { key: 'first', label: 'first' }] },
      { id: 'up', type: 'table', title: '倍增表 fa[u][k]', columns: [{ key: 'p1', label: '2^0' }, { key: 'p2', label: '2^1' }, { key: 'p3', label: '2^2' }] },
      { id: 'uf', type: 'dsu', title: 'Tarjan · 并查集（find 即 ancestor）' },
      { id: 'euler', type: 'array', title: '欧拉序（长度 2n-1）', values: [], labels: [] },
      { id: 'eulerd', type: 'array', title: '欧拉序对应深度', values: [], labels: [] },
      { id: 'cmp', type: 'table', title: '四法对比', columns: [
        { key: 'pre', label: '预处理' }, { key: 'query', label: '单次查询' }, { key: 'space', label: '空间' },
        { key: 'steps', label: '本例实测' }, { key: 'note', label: '特点' }
      ] }
    ],
    pseudocode: [
      '// 同一棵树、同一组询问：四种 LCA 策略依次登场，最后在对比表中汇总',
      '// ① 朴素上跳：谁深谁先爬，一样深后并肩爬，相遇即答案',
      'while dep[u] > dep[v]: u = fa[u]',
      'while u != v: u = fa[u]; v = fa[v]',
      '// ② 倍增：fa[u][k] = u 向上跳 2^k 步的位置，按 2 的幂整段跳',
      'fa[u][k] = fa[fa[u][k-1]][k-1]            // 预处理',
      'lca: 深度对齐（大跳到小）→ 同步上跳（fa 不同才跳）→ fa[u][0]',
      '// ③ Tarjan 离线：DFS 回溯时 union(孩子, 父)',
      '某端变黑时：answer = find(另一端)',
      '// ④ 欧拉序：进点记一次、从孩子回溯再记一次（长 2n-1）',
      'LCA(u, v) = 欧拉序区间 [first[u], first[v]] 中深度最小的点',
      '// 预处理 / 查询 / 空间 / 实测步数的完整对比见辅助面板'
    ],
    presets: [
      { id: 'q1', label: '跨子树：LCA(H, F)', desc: 'H 在 B 下、F 在 C 下，答案只能是根 A', data: () => ({ u: 'H', v: 'F' }) },
      { id: 'q2', label: '祖先型：LCA(H, E)', desc: 'E 是 H 的祖先，四法殊途同归', data: () => ({ u: 'H', v: 'E' }) },
      { id: 'q3', label: '同子树内：LCA(D, H)', desc: '都挂在 B 下，答案 B', data: () => ({ u: 'D', v: 'H' }) }
    ],
    run(input) {
      const u0 = input.u || 'H', v0 = input.v || 'F';
      const g = TGV.GraphLib.mkGraph(NODES, EDGES, { directed: true });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const ids = g.nodes.map(n => n.id);

      const par0 = {}, dep = {}, kids = {};
      ids.forEach(id => { kids[id] = []; par0[id] = null; });
      EDGES.forEach(([p, c]) => { kids[p].push(c); par0[c] = p; });
      (function go(u, d) { dep[u] = d; kids[u].forEach(v => go(v, d + 1)); })('A', 0);

      const ekey = {};
      EDGES.forEach(([p, c]) => { ekey[p + c] = p + '>' + c; ekey[c + p] = p + '>' + c; });

      const reset = () => ids.map(id => C.state(id, 'default')).concat([C.clearArcs('j')]);
      const stat = {};

      /* ================= 开场 ================= */
      b.step('同一棵 8 结点的树、同一组询问 **LCA(' + u0 + ', ' + v0 + ')**，四种经典策略要在同一块画布上轮番上阵：' +
        '**① 朴素上跳 → ② 倍增 → ③ Tarjan 离线 → ④ 欧拉序 RMQ**。' +
        '右侧是它们各自的工作台（深度表 / 倍增表 / 并查集 / 欧拉序），底部「四法对比」表最后汇总成绩。',
        ids.map(id => C.table('dep', id, 'd', dep[id])), { line: 1, milestone: '四法挑战 LCA(' + u0 + ',' + v0 + ')', stage: true });
      b.step('先看公共预处理：一遍 DFS 得到每点深度——' + ids.map(id => id + '=' + dep[id]).join('、') +
        '。深度和父亲指针是四法共同的原材料，之后各显神通。', [], { line: 1 });

      /* ================= 方法① 朴素上跳 ================= */
      b.step('—— **方法①：朴素上跳** —— 全部预处理只是一遍 DFS，没有任何额外表。' +
        '策略：**谁深谁先爬**，一样深后并肩爬，相遇点即 LCA。', reset(), { line: 2, milestone: '方法①：朴素上跳', stage: true });
      let u = u0, v = v0, hops = 0;
      b.step('u = ' + u + '（dep ' + dep[u] + '），v = ' + v + '（dep ' + dep[v] + '）。', [
        C.state(u, 'active'), C.state(v, 'active')
      ], { line: 2, vars: [{ name: 'u', value: u }, { name: 'v', value: v }] });
      const climb = (x, other, tag) => {
        hops++;
        b.step(x + '（dep ' + dep[x] + '）比 ' + other + '（dep ' + dep[other] + '）深 → ' + x +
          ' 爬一步到父亲 **' + par0[x] + '**。', [
          C.pulse(ekey[x + par0[x]]), C.state(x, 'visited'), C.state(par0[x], tag)
        ], { line: 3, vars: [{ name: 'u', value: u }, { name: 'v', value: v }, { name: '步数', value: hops }] });
        return par0[x];
      };
      let guard = 0;
      while (dep[u] > dep[v] && guard++ < 20) u = climb(u, v, 'active');
      guard = 0;
      while (dep[v] > dep[u] && guard++ < 20) v = climb(v, u, 'active');
      if (u === v) {
        stat.naive = hops;
        b.step('深度对齐后 **u == v == ' + u + '**：其中一个是另一个的祖先，答案直接就是 ' + u +
          '，共走 ' + hops + ' 步。成绩记入对比表。', [
          C.state(u, 'path'), C.table('cmp', '朴素上跳', 'steps', hops + ' 步')
        ], { line: 4, milestone: '方法①答案 = ' + u });
      } else {
        b.step('深度已相同但还不是同一点，**并肩向上**：u、v 每轮各走一格直到相遇。', [
          C.state(u, 'active'), C.state(v, 'active')
        ], { line: 4 });
        guard = 0;
        while (u !== v && guard++ < 20) {
          const pu = par0[u], pv = par0[v];
          hops += 2;
          b.step(u + ' ≠ ' + v + ' → 同时上跳：' + u + ' → **' + pu + '**，' + v + ' → **' + pv + '**。', [
            C.pulse(ekey[u + pu]), C.pulse(ekey[v + pv]),
            C.state(u, 'visited'), C.state(v, 'visited'),
            C.state(pu, 'active'), C.state(pv, 'active')
          ], { line: 4, vars: [{ name: 'u', value: pu }, { name: 'v', value: pv }, { name: '步数', value: hops }] });
          u = pu; v = pv;
        }
        stat.naive = hops;
        b.step('相遇！**LCA = ' + u + '**，朴素法共走 ' + hops + ' 步。如果树退化成长链、问的又是链两端，' +
          '这个步数会涨到 O(n) —— 这正是后面三种方法存在的理由。成绩记入对比表。', [
          C.state(u, 'path'), C.table('cmp', '朴素上跳', 'steps', hops + ' 步')
        ], { line: 4, milestone: '方法①答案 = ' + u });
      }

      /* ================= 方法② 倍增 ================= */
      const f = {};
      ids.forEach(id => { f[id] = [par0[id]]; });
      for (let k = 1; k <= K; k++) {
        ids.forEach(id => { const m = f[id][k - 1]; f[id][k] = m ? f[m][k - 1] : null; });
      }
      const upFill = [];
      ids.forEach(id => { for (let k = 0; k <= K; k++) upFill.push(C.table('up', id, 'p' + (k + 1), f[id][k] || '—')); });
      b.step('—— **方法②：倍增法** —— 预处理 `fa[u][k]`：u 向上跳 2^k 步的位置。' +
        '递推：`fa[u][0]` 是父亲，`fa[u][k] = fa[fa[u][k-1]][k-1]`。右侧倍增表已填好。', reset().concat(upFill),
        { line: 5, milestone: '方法②：倍增', stage: true });
      let bu = u0, bv = v0, jumps = 0;
      if (dep[bu] < dep[bv]) { const t = bu; bu = bv; bv = t; }
      b.step('保证 bu 更深：bu = ' + bu + '（dep ' + dep[bu] + '），bv = ' + bv + '（dep ' + dep[bv] + '）。' +
        '先**深度对齐**：从 2^' + K + ' 到 2^0 依次试跳，只要不超过 bv 的深度就整段跳。', [
        C.state(bu, 'active'), C.state(bv, 'active')
      ], { line: 6, vars: [{ name: 'bu', value: bu }, { name: 'bv', value: bv }] });
      for (let k = K; k >= 0; k--) {
        if (f[bu][k] && dep[bu] - (1 << k) >= dep[bv]) {
          jumps++;
          b.step('试 2^' + k + ' = ' + (1 << k) + ' 步：' + bu + ' → **' + f[bu][k] + '**，深度仍不低于 ' +
            bv + '，放心整段跳。', [
            C.arc('ju' + k, bu, f[bu][k], { color: '#8B5CF6', label: '2^' + k })
          ], { line: 6, milestone: '深度对齐：跳 2^' + k, stage: true });
          bu = f[bu][k];
          b.step('bu 落在 **' + bu + '**（dep ' + dep[bu] + '），一次跳了 2^' + k + ' 格，只算 1 步。', [
            C.clearArc('ju' + k), C.state(bu, 'active'), C.state(bv, 'active')
          ], { line: 6, vars: [{ name: 'bu', value: bu }, { name: '跳跃次数', value: jumps }] });
        }
      }
      if (bu === bv) {
        stat.binary = jumps;
        b.step('对齐后 **bu == bv == ' + bu + '**：祖先型询问，答案就是 ' + bu + '，共 ' + jumps + ' 次跳跃。成绩记入对比表。', [
          C.state(bu, 'path'), C.table('cmp', '倍增', 'steps', jumps + ' 次跳跃')
        ], { line: 7, milestone: '方法②答案 = ' + bu });
      } else {
        b.step('深度对齐但两点不同 → **同步上跳**：从大到小试 2^k，只要两者 2^k 祖先不同就一起跳，' +
          '最终正好停在 LCA 的两个不同孩子上。', [], { line: 7 });
        for (let k = K; k >= 0; k--) {
          if (f[bu][k] && f[bv][k] && f[bu][k] !== f[bv][k]) {
            jumps++;
            b.step('2^' + k + ' 祖先不同（' + f[bu][k] + ' vs ' + f[bv][k] + '）→ 同时跳 2^' + k + '。', [
              C.arc('ju' + k, bu, f[bu][k], { color: '#8B5CF6', label: '2^' + k }),
              C.arc('jv' + k, bv, f[bv][k], { color: '#0EA5E9', label: '2^' + k })
            ], { line: 7, milestone: '同步上跳 2^' + k, stage: true });
            bu = f[bu][k]; bv = f[bv][k];
            b.step('现在 bu = **' + bu + '**，bv = **' + bv + '**。', [
              C.clearArc('ju' + k), C.clearArc('jv' + k),
              C.state(bu, 'active'), C.state(bv, 'active')
            ], { line: 7, vars: [{ name: 'bu', value: bu }, { name: 'bv', value: bv }] });
          }
        }
        const ansB = f[bu][0];
        stat.binary = jumps;
        b.step('此时 bu、bv 是 LCA 的两个不同孩子，答案就是它们的父亲：**LCA = ' + ansB + '**，共 ' + jumps +
          ' 次跳跃（对比朴素法 ' + stat.naive + ' 步）。成绩记入对比表。', [
          C.clearArcs('j'), C.state(ansB, 'path'), C.state(bu, 'visited'), C.state(bv, 'visited'),
          C.table('cmp', '倍增', 'steps', jumps + ' 次跳跃')
        ], { line: 7, milestone: '方法②答案 = ' + ansB });
      }

      /* ================= 方法③ Tarjan 离线 ================= */
      const par = {};
      ids.forEach(id => { par[id] = id; });
      const find = x => {
        const r0 = x;
        while (par[x] !== x) x = par[x];
        const r = x; x = r0;
        while (par[x] !== r) { const nx = par[x]; par[x] = r; x = nx; }
        return r;
      };
      const dsuSync = () => C.dsu('uf', Object.assign({}, par), {});
      const color = {};
      ids.forEach(id => { color[id] = 'white'; });
      b.step('—— **方法③：Tarjan 离线** —— 把询问挂在 u、v 两端，**一遍 DFS** 里作答：' +
        '回溯时用并查集把已完工的子树收缩到子树根；某端变黑时，另一端所在集合的代表恰好就是 LCA。', reset().concat([dsuSync()]),
        { line: 8, milestone: '方法③：Tarjan 离线', stage: true });
      const tarjan = (x) => {
        color[x] = 'gray';
        b.step('进入 ' + x + '（灰），登记 `anc[find(' + x + ')] = ' + x + '`：自己集合的代表就是自己。', [
          C.state(x, 'active'), dsuSync()
        ], { line: 8, vars: [{ name: 'u', value: x }] });
        kids[x].forEach(y => {
          b.step('沿树边递归进入孩子 ' + y + '。', [C.edge(ekey[x + y], 'active')], { line: 8 });
          tarjan(y);
          par[find(y)] = x;
          b.step(y + ' 的整棵子树完工：**并查集 union(' + x + ', ' + y + ')**，' + y +
            ' 所在集合整体挂到 ' + x + ' 名下——此后从该子树任何点 `find` 都落到 ' + x + '。', [
            C.edge(ekey[x + y], 'visited'), dsuSync(), C.state(y, 'visited')
          ], { line: 9 });
        });
        color[x] = 'black';
        b.step(x + ' 所有孩子处理完毕，染**黑**。检查挂在它身上的询问……', [C.state(x, 'visited')], { line: 10 });
        [u0, v0].forEach(end => {
          if (end !== x) return;
          const other = end === u0 ? v0 : u0;
          if (color[other] === 'black') {
            const a = find(other);
            b.step('另一端 ' + other + ' **已是黑色** → `anc[find(' + other + ')]` = **' + a +
              '**，不用任何跳步直接作答：LCA(' + u0 + ', ' + v0 + ') = ' + a + '。', [
              dsuSync(), C.state(a, 'path')
            ], { line: 10, milestone: '方法③答案 = ' + a });
            stat.tarjan = '一次 DFS';
          } else {
            b.step('另一端 ' + other + ' 还没变黑（仍在其子树里），**先挂起**——等它回溯变黑时再从那一端作答。', [
              C.state(other, 'frontier')
            ], { line: 10 });
          }
        });
      };
      tarjan('A');
      b.step('方法③完成：整个 DFS 里没有一次逐层攀爬，答案在回溯瞬间"掉"出来。代价：**必须离线**——' +
        '询问要提前收齐，这是它与在线倍增法的本质区别。成绩记入对比表。', [
        C.table('cmp', 'Tarjan 离线', 'steps', '一次 DFS')
      ], { line: 10 });

      /* ================= 方法④ 欧拉序 RMQ ================= */
      const euler = [], edArr = [], first = {};
      (function eu(x, d) {
        if (first[x] === undefined) first[x] = euler.length;
        euler.push(x); edArr.push(d);
        kids[x].forEach(y => { eu(y, d + 1); euler.push(x); edArr.push(d); });
      })('A', 0);
      const labels = euler.map((_, i) => String(i));
      b.step('—— **方法④：欧拉序转 RMQ** —— DFS 走一条欧拉环游：**进点记一次、从孩子回溯再记一次**，' +
        '长度 2n-1 = ' + euler.length + '。同时记下每点首次出现的位置 `first[·]`。', reset().concat([
        C.array('euler', euler, [], labels), C.array('eulerd', edArr, [], labels)
      ]).concat(ids.map(id => C.table('dep', id, 'first', first[id]))),
        { line: 11, milestone: '方法④：欧拉序 RMQ', stage: true });
      let L = first[u0], R = first[v0];
      if (L > R) { const t = L; L = R; R = t; }
      const hl = [];
      for (let i = L; i <= R; i++) hl.push(i);
      b.step('查询 **LCA(' + u0 + ', ' + v0 + ')**：`first[' + u0 + '] = ' + first[u0] + '`、`first[' + v0 +
        '] = ' + first[v0] + '`，取欧拉序区间 **[' + L + ', ' + R + ']**（两条数组条中被框住的段）。' +
        '结论：**区间里深度最小的点就是 LCA**。', [
        C.array('euler', euler, hl, labels), C.array('eulerd', edArr, hl, labels),
        C.state(u0, 'active'), C.state(v0, 'active')
      ], { line: 11, stage: true, vars: [{ name: 'L', value: L }, { name: 'R', value: R }] });
      let best = L;
      for (let i = L; i <= R; i++) if (edArr[i] < edArr[best]) best = i;
      const lcaR = euler[best];
      const cand = [];
      for (let i = L; i <= R; i++) cand.push(euler[i] + '(' + edArr[i] + ')');
      stat.rmq = '区间 ' + (R - L + 1) + ' 次比较';
      b.step('区间扫描：' + cand.join('、') + '。深度最小的是位置 **' + best + '** 上的 ' + lcaR +
        '（深度 ' + edArr[best] + '）→ **LCA = ' + lcaR + '**。用 ST 表预处理后，这一步是严格的 O(1)。' +
        '成绩记入对比表。', [
        C.array('eulerd', edArr, [best], labels), C.array('euler', euler, [best], labels),
        C.state(lcaR, 'path'), C.table('cmp', '欧拉序 RMQ', 'steps', stat.rmq)
      ], { line: 11, milestone: '方法④答案 = ' + lcaR });

      /* ================= 四法对比汇总 ================= */
      const rows = [
        ['朴素上跳', 'O(n)', 'O(n)', 'O(n)', stat.naive + ' 步', '最直观；树退化为长链时最坏'],
        ['倍增', 'O(n log n)', 'O(log n)', 'O(n log n)', stat.binary + ' 次跳跃', '在线查询，支持动态换询问'],
        ['Tarjan 离线', 'O(n·α(n))', 'α(n) 均摊', 'O(n)', '一次 DFS', '询问必须提前收齐（离线）'],
        ['欧拉序 RMQ', 'O(n log n)', 'O(1)', 'O(2n)', stat.rmq, 'ST 表加持后单次查询最快']
      ];
      const cmAll = [];
      rows.forEach(r => {
        ['pre', 'query', 'space', 'steps', 'note'].forEach((ck, i) => cmAll.push(C.table('cmp', r[0], ck, r[i + 1])));
      });
      b.step('**四法会师**：同一组询问，四种策略全部得到 **LCA(' + u0 + ', ' + v0 + ') = ' + lcaR +
        '**。看底部对比表——朴素法步数最多但最好写；倍增在线、查询 O(log n)；Tarjan 一次 DFS 解决全部询问但必须离线；' +
        '欧拉序 RMQ 查询 O(1) 最快。选哪种，取决于**询问是否离线、查询次数与实现预算**。', cmAll.concat([
        C.state(lcaR, 'path'), C.state(u0, 'visited'), C.state(v0, 'visited')
      ]), { line: 12, milestone: '四法一致：LCA = ' + lcaR });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
