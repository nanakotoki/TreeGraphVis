/* ============================================================
 * 第二卷 · G2 最短路径
 * Dijkstra（朴素/堆 + 负权反例）· Bellman-Ford（负环追踪）
 * SPFA · Floyd（矩阵热力联动）· A* · 0-1 BFS
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;
  const INF = '∞';

  /* ---------------- 公共工具 ---------------- */
  function graphOf(input, directedDefault) {
    input = input || {};
    const directed = input.directed !== undefined ? input.directed !== false : directedDefault !== false;
    if (input.custom) {
      const nd = (input.nodes || []).map(n => [n.id, n.x != null ? n.x : 400, n.y != null ? n.y : 300, n.label]);
      const ed = (input.edges || []).map(e => [e.source, e.target, e.weight != null ? e.weight : null]);
      return TGV.GraphLib.mkGraph(nd, ed, { directed });
    }
    return TGV.GraphLib.mkGraph(input.nodes || [], input.edges || [], { directed });
  }

  function wOf(e) { return e.weight == null ? 1 : e.weight; }
  function sv(x) { return isFinite(x) ? x : INF; }

  /* 让表格行按节点声明顺序固定，避免"按发现顺序漂移" */
  function withRowOrder(panels, ids) {
    return panels.map(p => (p.type === 'table' ? Object.assign({}, p, { rowOrder: ids }) : p));
  }

  function edgeBetween(g, a, b) {
    return g.edges.find(e => (e.source === a && e.target === b) || (!g.directed && e.source === b && e.target === a));
  }

  function tracePath(prev, s, t) {
    const out = [];
    let cur = t, guard = 0;
    while (cur !== s && cur !== '-' && cur != null && guard++ < 300) {
      out.unshift(cur);
      cur = prev[cur];
    }
    if (cur !== s) return null;
    out.unshift(s);
    return out;
  }

  /* Bellman-Ford 的纯数值版本，用于「真值」对照 */
  function bfTrue(g, s) {
    const D = {};
    g.nodes.forEach(n => D[n.id] = Infinity);
    D[s] = 0;
    for (let i = 0; i < g.nodes.length - 1; i++) {
      let ch = false;
      g.edges.forEach(e => {
        const u = e.source, v = e.target, w = wOf(e);
        if (!isFinite(D[u])) return;
        if (D[u] + w < D[v]) { D[v] = D[u] + w; ch = true; }
      });
      if (!ch) break;
    }
    return D;
  }

  function dijkstraD(g, s) {
    const D = {}, done = {};
    g.nodes.forEach(n => D[n.id] = Infinity);
    D[s] = 0;
    for (let round = 0; round < g.nodes.length; round++) {
      let u = null, best = Infinity;
      g.nodes.forEach(n => { if (!done[n.id] && D[n.id] < best) { best = D[n.id]; u = n.id; } });
      if (u == null) break;
      done[u] = true;
      g.adj[u].forEach(l => { const nd = D[u] + (l.w == null ? 1 : l.w); if (nd < D[l.to]) D[l.to] = nd; });
    }
    return D;
  }

  TGV.ShortestLib = { bfTrue, dijkstraD, tracePath, graphOf };

  /* ============================================================
   * 1. Dijkstra
   * ============================================================ */
  const STD_NODES = [['A', 110, 150], ['B', 330, 90], ['C', 560, 150], ['D', 170, 330], ['E', 400, 300], ['F', 630, 340], ['G', 300, 480], ['H', 540, 490]];
  const STD_EDGES = [['A', 'B', 4], ['A', 'D', 2], ['B', 'C', 7], ['B', 'E', 3], ['C', 'F', 3], ['D', 'E', 5], ['D', 'G', 8], ['E', 'C', 1], ['E', 'F', 6], ['E', 'G', 4], ['G', 'H', 2], ['F', 'H', 5]];

  function stdData(s, mode, t) {
    return {
      s: s, t: t || 'H', mode: mode, directed: false,
      nodes: STD_NODES.map(a => a.slice()), edges: STD_EDGES.map(a => a.slice())
    };
  }

  TGV.register({
    id: 'dijkstra', name: 'Dijkstra 单源最短路（贪心 + 松弛）', category: '图 · 最短路径',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'bellman_ford',
    panels: [
      { id: 'pq', type: 'heap', title: '优先队列 / 候选集' },
      { id: 'watch', type: 'table', title: '距离表', columns: [{ key: 'dist', label: 'dist' }, { key: 'prev', label: 'prev' }, { key: 'fixed', label: '确定' }] }
    ],
    pseudocode: [
      '// 贪心：每次取 dist 最小的未确定点，它的 dist 就已经是最终答案',
      'dist[s] = 0；把 (s, 0) 放进优先队列',
      'while 队列非空:',
      '    u = 队列里 dist 最小的点',
      '    if u 已确定: 丢弃这条过期记录（惰性删除）',
      '    标记 u 已确定：dist[u] 从此不再改变',
      '    for each 边 (u, v, w) in adj[u]:',
      '        if dist[u] + w < dist[v]:        // 松弛 relax',
      '            dist[v] = dist[u] + w',
      '            prev[v] = u',
      '            把 (v, dist[v]) 放进队列',
      '// 前提是没有负权边；否则"已确定"会被后来的负权路径推翻'
    ],
    presets: [
      { id: 'std', label: '标准带权无向图 · 堆优化', desc: '堆顶出队即「最短距离确定」，观察惰性删除', data: () => stdData('A', 'heap', 'H') },
      { id: 'naive', label: '朴素 O(V²) · 线性扫描找最小', desc: '没有堆，每轮扫一遍所有未确定点', data: () => stdData('A', 'naive', 'H') },
      { id: 'mid', label: '源点在中间 D（对比扩展顺序）', desc: '换一个源点，最短路径树的形状完全不同', data: () => stdData('D', 'heap', 'C') },
      { id: 'neg', label: '反例：负权边让 Dijkstra 失效', desc: '已确定的距离被负权边推翻，答案错误', data: () => ({ s: 'S', t: 'T', directed: true, nodes: [['S', 120, 280], ['A', 330, 150], ['B', 330, 410], ['T', 560, 280]], edges: [['S', 'A', 1], ['S', 'B', 2], ['B', 'A', -2], ['A', 'T', 1]] }) }
    ],
    run(input) {
      const g = graphOf(input, false);
      const mode = input.mode === 'naive' ? 'naive' : 'heap';
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const D = {}, prev = {}, fixed = {};
      g.nodes.forEach(n => { D[n.id] = Infinity; prev[n.id] = '-'; fixed[n.id] = '—'; });
      const s = input.s || g.nodes[0].id;
      const pq = [];
      const sptE = {};
      let heatEid = null;
      let violated = false;

      const openItems = () => {
        if (mode === 'naive') {
          return g.nodes
            .filter(n => fixed[n.id] === '—' && isFinite(D[n.id]))
            .sort((x, y) => D[x.id] - D[y.id] || String(x.id).localeCompare(String(y.id)))
            .map(n => ({ key: n.id, label: n.id, meta: 'd=' + D[n.id] }));
        }
        return pq.slice()
          .sort((x, y) => x.d - y.d || String(x.id).localeCompare(String(y.id)))
          .map(it => ({ key: it.id + '@' + it.d, label: it.id, meta: 'd=' + it.d }));
      };
      // 点亮当前边，同时熄灭上一条（避免高亮堆积）
      const hot = (eid, cmds) => {
        const pre = (heatEid && heatEid !== eid) ? [C.edge(heatEid, sptE[heatEid] ? 'visited' : 'default')] : [];
        heatEid = eid;
        return pre.concat(cmds);
      };

      b.step('Dijkstra 的核心是**贪心**：把点分成「已确定」和「未确定」两派，每次从未确定里挑出 `dist` 最小的那个 —— 它的 `dist` 就一定是最短的，因为任何绕远路的走法都不可能更短。' +
        (mode === 'naive' ? '本次用**朴素实现**：每轮线性扫描所有点找最小，复杂度 O(V²)。' : '本次用**二叉堆**维护候选集，复杂度 O((V+E)logV)，代价是堆里会出现过期记录。'),
        [], { line: 1, vars: [{ name: 's', value: s }, { name: 'mode', value: mode === 'naive' ? 'O(V²)' : '堆优化' }] });

      D[s] = 0;
      if (mode === 'heap') pq.push({ id: s, d: 0 });
      b.step('初始化：`dist[' + s + '] = 0`，其余都是 ∞。源点 ' + (mode === 'naive' ? '进入候选集' : '压入优先队列') + '。', [
        C.state(s, 'frontier'), C.badge(s, 'd', 0),
        C.table('watch', s, 'dist', 0, true),
        C.table('watch', s, 'prev', '-'),
        C.table('watch', s, 'fixed', '未确定'),
        C.q('pq', 'set', openItems())
      ], { line: 2, milestone: '源点 ' + s + ' 就绪' });

      let settled = 0, guard = 0;
      while (guard++ < 200) {
        let u = null;
        if (mode === 'naive') {
          const cand = g.nodes.filter(n => fixed[n.id] === '—' && isFinite(D[n.id]));
          if (!cand.length) break;
          cand.sort((x, y) => D[x.id] - D[y.id] || String(x.id).localeCompare(String(y.id)));
          b.step('**线性扫描**：未确定的点还有 ' + cand.length + ' 个，逐个比较 `dist` —— ' +
            cand.map(n => n.id + ':' + D[n.id]).join('、') + '。最小的就是 ' + cand[0].id + '。', [
            C.q('pq', 'set', openItems())
          ].concat(cand.map(n => C.state(n.id, 'frontier'))), { line: 4 });
          u = cand[0].id;
        } else {
          if (!pq.length) break;
          pq.sort((x, y) => x.d - y.d || String(x.id).localeCompare(String(y.id)));
          const cur = pq.shift();
          b.step('堆顶出队：**' + cur.id + '**（记录的 dist = ' + cur.d + '）。', [
            C.q('pq', 'set', openItems()), C.state(cur.id, 'active')
          ], { line: 4 });
          if (fixed[cur.id] !== '—') {
            b.step(cur.id + ' 其实早就确定了，这条是松弛过程中留下的**过期副本** —— 堆没法原地改键，只能重复插入，出队时再丢弃（惰性删除）。', [
              C.state(cur.id, 'visited')
            ], { line: 5 });
            continue;
          }
          u = cur.id;
        }
        fixed[u] = '✓';
        settled++;
        b.step('**' + u + ' 尚未确定 ⇒ `dist[' + u + '] = ' + D[u] + '` 就是最终答案**（第 ' + settled + ' 个确定的点）。', [
          C.state(u, 'visited'), C.badge(u, 'd', D[u], true),
          C.table('watch', u, 'fixed', '✓', true)
        ], { line: 6, milestone: '确定 ' + u + ' = ' + D[u] });

        for (let k = 0; k < g.adj[u].length; k++) {
          const link = g.adj[u][k];
          const v = link.to, w = link.w == null ? 1 : link.w;
          const nd = D[u] + w;
          if (isFinite(D[v]) && nd >= D[v]) {
            b.step('边 ' + u + '→' + v + '（w=' + w + '）：`' + D[u] + ' + ' + w + ' = ' + nd + '` 不优于已知的 `dist[' + v + '] = ' + D[v] + '` → **不松弛**。', hot(link.eid, [
              C.edge(link.eid, 'active')
            ]), { line: 8 });
            continue;
          }
          if (fixed[v] === '✓') {
            violated = true;
            b.step('⚠️ **矛盾出现了**：`dist[' + u + '] + (' + w + ') = ' + nd + ' < dist[' + v + '] = ' + D[v] + '`，但 ' + v + ' 早已被标记为「确定」。' +
              '负权边让贪心的前提彻底失效 —— Dijkstra 不会再回头修改已确定的点，于是答案被永久锁错。', [
              C.edge(link.eid, 'conflict'),
              C.pulse(link.eid, { color: '#DC2626' }),
              C.state(v, 'conflict'), C.state(u, 'conflict'),
              C.label(link.eid, 'w=' + w, true)
            ], { line: 12, milestone: '贪心前提被负权边打破', stage: true });
            continue;
          }
          const old = D[v];
          D[v] = nd;
          prev[v] = u;
          sptE[link.eid] = true;
          if (mode === 'heap') pq.push({ id: v, d: nd });
          b.step('**松弛成功**：走 ' + u + ' 到 ' + v + ' 更便宜，`dist[' + v + ']` 从 ' + sv(old) + ' 降到 **' + nd + '**，前驱记为 ' + u +
            (mode === 'heap' ? '，并把 (v, ' + nd + ') 压入堆。' : '，更新候选集。'), hot(link.eid, [
            C.pulse(link.eid, { color: '#16A34A' }),
            C.edge(link.eid, 'visited'),
            C.badge(v, 'd', nd, true), C.state(v, 'frontier'),
            C.table('watch', v, 'dist', nd, true),
            C.table('watch', v, 'prev', u, true),
            C.q('pq', 'set', openItems())
          ]), { line: 9, milestone: '松弛 ' + u + '→' + v + '：' + sv(old) + '→' + nd });
        }
      }

      const reach = g.nodes.filter(n => isFinite(D[n.id]));
      const t = input.t || reach.sort((x, y) => D[y.id] - D[x.id])[0].id;
      const path = tracePath(prev, s, t);
      if (!violated && path && path.length > 1) {
        const cmds = [];
        for (let i = 0; i + 1 < path.length; i++) {
          const e = edgeBetween(g, path[i], path[i + 1]);
          cmds.push(C.state(path[i], 'path'));
          if (e) { cmds.push(C.edge(e.id, 'path')); cmds.push(C.pulse(e.id, { color: '#D97706' })); }
        }
        cmds.push(C.state(t, 'path'));
        b.step('从 ' + s + ' 到 ' + t + ' 的最短路径沿 `prev` 指针回溯：**' + path.join(' → ') + '**，总代价 **' + D[t] + '**。' +
          '所有被标成橙色的边合起来就是**最短路径树（SPT）**：' + settled + ' 个点全部挂在这棵树上。', cmds,
          { line: 6, milestone: '最短路径 ' + s + '→' + t + ' = ' + D[t] });
      }

      const summary = g.nodes.map(n => n.id + '=' + sv(D[n.id])).join('，');
      if (violated) {
        const truth = bfTrue(g, s);
        b.step('**结论：Dijkstra 给出的答案是错的。** 它得到 ' + summary + '；而用 Bellman-Ford 求出真值是 ' +
          g.nodes.map(n => n.id + '=' + sv(truth[n.id])).join('，') + '。' +
          '根源在于负权边 B→A = -2 让「S→B→A = 0」比「S→A = 1」更短，可 A 早已出堆被锁死。**有负权边就必须换 Bellman-Ford / SPFA。**', [
          C.state('T', 'conflict'),
          C.badge('T', '真值', truth['T'], true)
        ], { line: 12, milestone: '答案错误：Dijkstra 不适用负权', stage: true });
      } else {
        b.step('队列已空，算法结束。最终单源最短路：' + summary + '。每个点只会被确定一次，每条边只会被松弛两次（有向图一次）—— 这正是 Dijkstra 高效的原因。', [], { line: 3, milestone: '单源最短路完成' });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 2. Bellman-Ford
   * ============================================================ */
  const BF_NODES = [['A', 100, 300], ['B', 270, 150], ['C', 430, 300], ['D', 580, 150], ['E', 690, 340]];
  const BF_EDGES = [['D', 'E', 1], ['C', 'D', 2], ['B', 'C', 3], ['A', 'B', 4], ['A', 'C', 10], ['A', 'E', 20], ['B', 'E', 9], ['C', 'E', 5]];
  const BF_NEG_NODES = [['S', 100, 280], ['A', 280, 150], ['B', 450, 150], ['C', 450, 400], ['D', 660, 300]];
  const BF_NEG_EDGES = [['S', 'A', 1], ['A', 'B', 2], ['B', 'C', -4], ['C', 'B', 1], ['B', 'D', 3], ['C', 'D', 6]];

  TGV.register({
    id: 'bellman_ford', name: 'Bellman-Ford（V-1 轮全局松弛 + 负环检测）', category: '图 · 最短路径',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'spfa',
    panels: [
      { id: 'log', type: 'text', title: '轮次仪表盘' },
      { id: 'watch', type: 'table', title: '距离表', columns: [{ key: 'dist', label: 'dist' }, { key: 'prev', label: 'prev' }] }
    ],
    pseudocode: [
      '// 对所有边做 V-1 轮松弛：第 i 轮后"最多 i 条边"的最短路已确定',
      'dist[s] = 0，其余 ∞',
      'for i = 1 to V-1:',
      '    for each 边 (u, v, w):',
      '        if dist[u] + w < dist[v]:',
      '            dist[v] = dist[u] + w',
      '            prev[v] = u',
      '// 第 V 轮：如果还能松弛，说明存在从 s 可达的负环',
      'for each 边 (u, v, w):',
      '    if dist[u] + w < dist[v]: 报告"存在负环"'
    ],
    presets: [
      { id: 'std', label: '5 点有向图 · 边序故意打乱', desc: '边按逆序排列，需要整整 V-1 轮才能收敛', data: () => ({ s: 'A', directed: true, nodes: BF_NODES.map(a => a.slice()), edges: BF_EDGES.map(a => a.slice()) }) },
      { id: 'neg', label: '负环检测（B→C→B 权 -3）', desc: '第 V 轮仍能松弛 ⇒ 负环，红色气泡圈出环', data: () => ({ s: 'S', directed: true, nodes: BF_NEG_NODES.map(a => a.slice()), edges: BF_NEG_EDGES.map(a => a.slice()) }) }
    ],
    run(input) {
      const g = graphOf(input, true);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const V = g.nodes.length;
      const D = {}, prev = {};
      g.nodes.forEach(n => { D[n.id] = Infinity; prev[n.id] = '-'; });
      const s = input.s || g.nodes[0].id;
      const log = [];
      let heat = null;

      const pushLog = line => {
        log.push(line);
        if (log.length > 7) log.shift();
        return C.text('log', log.slice());
      };

      b.step('Bellman-Ford 不挑点，它**对所有边做 V-1 轮全局扫描**。理由：从源点出发的任何简单路径最多 V-1 条边，所以第 i 轮结束后，所有「最多用 i 条边」的最短路都已确定。它比 Dijkstra 慢（O(VE)），但**能处理负权边、还能顺便检测负环**。', [],
        { line: 1, vars: [{ name: 'V', value: V }, { name: 'E', value: g.edges.length }] });

      D[s] = 0;
      b.step('初始化：`dist[' + s + '] = 0`，其余 ∞。此时「最多用 0 条边」的最短路已确定。', [
        C.state(s, 'frontier'), C.badge(s, 'd', 0),
        C.table('watch', s, 'dist', 0, true),
        C.table('watch', s, 'prev', '-'),
        pushLog('init:  ' + s + ' = 0')
      ], { line: 2, milestone: '初始化' });

      for (let round = 1; round <= V - 1; round++) {
        let changes = 0;
        b.step('**第 ' + round + ' 轮**开始：把 ' + g.edges.length + ' 条边从前往后依次扫一遍。本轮结束后，「最多用 ' + round + ' 条边」的最短路将全部确定。', [
          pushLog('round ' + round + ': 扫描 ' + g.edges.length + ' 条边')
        ], { line: 3, vars: [{ name: 'i', value: round }] });

        for (let ei = 0; ei < g.edges.length; ei++) {
          const e = g.edges[ei];
          const u = e.source, v = e.target, w = wOf(e);
          const reset = heat ? [C.edge(heat, 'default')] : [];
          heat = e.id;
          if (!isFinite(D[u])) {
            b.step('边 ' + u + '→' + v + '（w=' + w + '）：`dist[' + u + ']` 还是 ∞，这条边暂时够不着。', reset.concat([
              C.edge(e.id, 'ghost')
            ]), { line: 4 });
            continue;
          }
          const nd = D[u] + w;
          if (nd >= D[v]) {
            b.step('边 ' + u + '→' + v + '（w=' + w + '）：`' + D[u] + ' + ' + w + ' = ' + nd + '` ≥ `dist[' + v + '] = ' + sv(D[v]) + '` → 不松弛。', reset.concat([
              C.edge(e.id, 'active')
            ]), { line: 5 });
            continue;
          }
          const old = D[v];
          D[v] = nd;
          prev[v] = u;
          changes++;
          b.step('**松弛**：`dist[' + v + ']` 从 ' + sv(old) + ' 降到 **' + nd + '**（经 ' + u + '），`prev[' + v + '] = ' + u + '`。', reset.concat([
            C.pulse(e.id, { color: '#16A34A' }),
            C.edge(e.id, 'visited'),
            C.badge(v, 'd', nd, true), C.state(v, 'frontier'),
            C.table('watch', v, 'dist', nd, true),
            C.table('watch', v, 'prev', u, true)
          ]), { line: 6, milestone: '第 ' + round + ' 轮松弛 ' + u + '→' + v + ' = ' + nd });
        }
        const snap = g.nodes.map(n => n.id + '=' + sv(D[n.id])).join(' ');
        b.step('第 ' + round + ' 轮结束，本轮生效 ' + changes + ' 次。距离快照：' + snap + '。' +
          (changes === 0 ? ' **本轮没有任何变化 ⇒ 已经收敛，后面的轮次可以提前跳过。**' : ''), [
          pushLog('r' + round + ': ' + changes + ' 次更新 → ' + snap)
        ], { line: 3, stage: true });
        if (changes === 0) break;
      }

      b.step('**第 ' + V + ' 轮：再做一次全局扫描，专门用于负环检测。** 如果所有最短路都已在 V-1 轮内收敛，这一轮应该纹丝不动；只要还有边能被松弛，就说明存在**从 ' + s + ' 可达的负环**。', [
        pushLog('check: 第 ' + V + ' 轮负环检测')
      ], { line: 8, vars: [{ name: 'V', value: V }], stage: true });

      let cycEdge = null, cycNode = null;
      for (let ei = 0; ei < g.edges.length; ei++) {
        const e = g.edges[ei];
        const u = e.source, v = e.target, w = wOf(e);
        if (!isFinite(D[u])) continue;
        const nd = D[u] + w;
        if (nd < D[v]) {
          cycEdge = e; cycNode = v;
          b.step('💥 边 ' + u + '→' + v + '（w=' + w + '）仍可松弛：`dist[' + u + '] + (' + w + ') = ' + nd + ' < dist[' + v + '] = ' + D[v] + '`。' +
            '这不是「还没收敛」，而是**每绕环一圈距离就变小一点** —— 负环会让最短路变成 -∞。', [
            C.edge(e.id, 'conflict'),
            C.state(u, 'conflict'), C.state(v, 'conflict'),
            pushLog('✗ 负环确认：' + u + '→' + v + ' 可继续松弛')
          ], { line: 10, milestone: '检测到负环', stage: true });
          break;
        }
      }

      if (cycEdge) {
        let x = cycNode;
        for (let i = 0; i < V; i++) {
          if (prev[x] === '-' || prev[x] == null) break;
          x = prev[x];
        }
        const cyc = [x];
        let y = prev[x], g2 = 0;
        while (y !== x && y !== '-' && y != null && g2++ < V + 2) { cyc.push(y); y = prev[y]; }
        const cmds = [];
        for (let i = 0; i < cyc.length; i++) {
          const a = cyc[i], c = cyc[(i + 1) % cyc.length];
          const e = edgeBetween(g, a, c);
          cmds.push(C.state(a, 'conflict'));
          if (e) { cmds.push(C.edge(e.id, 'conflict')); cmds.push(C.pulse(e.id, { color: '#DC2626' })); }
        }
        cmds.push(C.hull('neg', cyc, '#DC2626', '负环'));
        b.step('沿 `prev` 指针回溯并绕行，锁定这个负环：**' + cyc.join(' → ') + ' → ' + cyc[0] + '**。' +
          '环上总权为负，因此可以无限绕圈把距离压到 -∞，最短路**根本不存在**。检测到负环时，Bellman-Ford 不是「算错」，而是正确地报告了「无解」。', cmds,
          { line: 10, milestone: '负环：' + cyc.join('→'), stage: true });
      } else {
        b.step('第 ' + V + ' 轮没有任何边可以松弛 ⇒ **不存在从 ' + s + ' 可达的负环**，前面 V-1 轮的结果就是最终答案：' +
          g.nodes.map(n => n.id + '=' + sv(D[n.id])).join('，') + '。', [], { line: 9, milestone: '无负环 · 结果有效' });

        const reach = g.nodes.filter(n => isFinite(D[n.id]));
        const t = input.t || reach.sort((x, y) => D[y.id] - D[x.id])[0].id;
        const path = tracePath(prev, s, t);
        if (path && path.length > 1) {
          const cmds = [];
          for (let i = 0; i + 1 < path.length; i++) {
            const e = edgeBetween(g, path[i], path[i + 1]);
            cmds.push(C.state(path[i], 'path'));
            if (e) { cmds.push(C.edge(e.id, 'path')); cmds.push(C.pulse(e.id, { color: '#D97706' })); }
          }
          cmds.push(C.state(t, 'path'));
          b.step('最远点 ' + t + ' 的最短路：**' + path.join(' → ') + '**，代价 ' + D[t] + '（用了 ' + (path.length - 1) + ' 条边）。', cmds,
            { line: 7, milestone: '路径 ' + path.join('→') });
        }
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 3. SPFA
   * ============================================================ */
  TGV.register({
    id: 'spfa', name: 'SPFA（队列优化的 Bellman-Ford）', category: '图 · 最短路径',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'bellman_ford',
    panels: [
      { id: 'q', type: 'queue', title: '松弛队列' },
      { id: 'watch', type: 'table', title: '距离 / 入队次数', columns: [{ key: 'dist', label: 'dist' }, { key: 'prev', label: 'prev' }, { key: 'inq', label: '在队' }, { key: 'cnt', label: 'cnt' }] }
    ],
    pseudocode: [
      '// Bellman-Ford 的队列优化：只有"距离刚变小"的点才需要重新扩展',
      'dist[s] = 0；队列 = [s]；inq[s] = true',
      'while 队列非空:',
      '    u = 队首出队；inq[u] = false',
      '    for each 边 (u, v, w) in adj[u]:',
      '        if dist[u] + w < dist[v]:',
      '            dist[v] = dist[u] + w；prev[v] = u',
      '            if not inq[v]: 入队；inq[v] = true',
      '            cnt[v] = cnt[u] + 1',
      '            if cnt[v] >= V: 存在负环',
      '// 每个点最多入队 V 次；超过就说明在负环上打转'
    ],
    presets: [
      { id: 'std', label: '5 点有向图 · 队列只传「变了」的点', desc: '对比 Bellman-Ford 的固定轮数，SPFA 只扩展必要的点', data: () => ({ s: 'A', directed: true, nodes: BF_NODES.map(a => a.slice()), edges: BF_EDGES.map(a => a.slice()) }) },
      { id: 'neg', label: '负环（cnt 超过 V 时爆掉）', desc: 'B→C→B 权 -3，cnt[B] 一路涨到 V', data: () => ({ s: 'S', directed: true, nodes: BF_NEG_NODES.map(a => a.slice()), edges: BF_NEG_EDGES.map(a => a.slice()) }) }
    ],
    run(input) {
      const g = graphOf(input, true);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const V = g.nodes.length;
      const D = {}, prev = {}, inq = {}, cnt = {};
      g.nodes.forEach(n => { D[n.id] = Infinity; prev[n.id] = '-'; inq[n.id] = '—'; cnt[n.id] = 0; });
      const s = input.s || g.nodes[0].id;
      const q = [];
      let heat = null;
      let negStart = null;

      const qItems = () => q.map(id => ({ key: id, label: id, meta: 'd=' + sv(D[id]) }));

      b.step('SPFA 是 Bellman-Ford 的**队列优化版**：Bellman-Ford 每轮傻傻地扫所有边，而实际上只有「距离刚刚变小」的点，才可能继续影响邻居。于是用一个队列存这些点，只处理它们 —— 平均复杂度大幅下降（最坏仍是 O(VE)）。', [],
        { line: 1, vars: [{ name: 'V', value: V }, { name: 'E', value: g.edges.length }] });

      D[s] = 0; inq[s] = '✓'; q.push(s);
      b.step('源点 ' + s + ' 入队，`dist[' + s + '] = 0`。', [
        C.state(s, 'frontier'), C.badge(s, 'd', 0),
        C.table('watch', s, 'dist', 0, true),
        C.table('watch', s, 'prev', '-'),
        C.table('watch', s, 'inq', '✓', true),
        C.table('watch', s, 'cnt', 0),
        C.q('q', 'set', qItems())
      ], { line: 2, milestone: '源点入队' });

      let guard = 0;
      while (q.length && guard++ < 120) {
        const u = q.shift();
        inq[u] = '—';
        const reset = heat ? [C.edge(heat, 'default')] : [];
        heat = null;
        b.step('队首 **' + u + '** 出队（dist = ' + sv(D[u]) + '），`inq[' + u + '] = false`。接下来扫描它的所有出边。', reset.concat([
          C.q('q', 'pop_front'),
          C.state(u, 'active'),
          C.table('watch', u, 'inq', '—')
        ]), { line: 4, vars: [{ name: 'u', value: u }] });

        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to, w = link.w == null ? 1 : link.w;
          const nd = D[u] + w;
          if (nd >= D[v]) {
            b.step('边 ' + u + '→' + v + '（w=' + w + '）：`' + D[u] + ' + ' + w + ' = ' + nd + '` ≥ ' + sv(D[v]) + ' → 不松弛。', [
              C.edge(link.eid, 'active')
            ], { line: 6 });
            heat = link.eid;
            continue;
          }
          const old = D[v];
          D[v] = nd;
          prev[v] = u;
          cnt[v] = cnt[u] + 1;
          heat = link.eid;
          const cmds = [
            C.pulse(link.eid, { color: '#16A34A' }),
            C.edge(link.eid, 'visited'),
            C.badge(v, 'd', nd, true), C.state(v, 'frontier'),
            C.table('watch', v, 'dist', nd, true),
            C.table('watch', v, 'prev', u, true),
            C.table('watch', v, 'cnt', cnt[v], true)
          ];
          if (inq[v] === '✓') {
            b.step('**松弛**：`dist[' + v + ']` 从 ' + sv(old) + ' 降到 ' + nd + '。' + v + ' 已经在队列里了，**不重复入队**（等它出队时自然会用到新的 dist）。', cmds,
              { line: 7, milestone: '松弛 ' + u + '→' + v + ' = ' + nd });
          } else {
            inq[v] = '✓';
            q.push(v);
            cmds.push(C.table('watch', v, 'inq', '✓', true), C.q('q', 'set', qItems()));
            b.step('**松弛成功**：`dist[' + v + ']` 从 ' + sv(old) + ' 降到 ' + nd + '。' + v + ' 原来不在队列里 → **入队**，之后会用它继续扩展。', cmds,
              { line: 8, milestone: '入队 ' + v + '（dist=' + nd + '）' });
          }
          if (cnt[v] >= V) { negStart = v; break; }
        }
        if (negStart) break;
      }

      if (negStart) {
        let x = negStart;
        for (let i = 0; i < V; i++) {
          if (prev[x] === '-' || prev[x] == null) break;
          x = prev[x];
        }
        const cyc = [x];
        let y = prev[x], g2 = 0;
        while (y !== x && y !== '-' && y != null && g2++ < V + 2) { cyc.push(y); y = prev[y]; }
        const cmds = [];
        for (let i = 0; i < cyc.length; i++) {
          const a = cyc[i], c = cyc[(i + 1) % cyc.length];
          const e = edgeBetween(g, a, c);
          cmds.push(C.state(a, 'conflict'));
          if (e) { cmds.push(C.edge(e.id, 'conflict')); cmds.push(C.pulse(e.id, { color: '#DC2626' })); }
        }
        cmds.push(C.hull('neg', cyc, '#DC2626', '负环'));
        b.step('💥 `cnt[' + negStart + '] = ' + cnt[negStart] + ' ≥ V = ' + V + '`。' +
          '`cnt[x]` 记录的是「当前最优路径用了几条边」：一条简单路径最多 V-1 条边，超过 V 就说明**路径在绕圈**，而每绕一圈距离还在变小 ⇒ 负环。', cmds.concat([
          C.table('watch', negStart, 'cnt', cnt[negStart], true)
        ]), { line: 10, milestone: 'cnt 超过 V：负环', stage: true });
        b.step('环是 **' + cyc.join(' → ') + ' → ' + cyc[0] + '**，权值和为负 ⇒ 最短路不存在（可以无限绕）。SPFA 在负环图上会**永远跑不完**，`cnt` 检查就是那个紧急刹车。', [],
          { line: 11, milestone: '负环：' + cyc.join('→'), stage: true });
      } else {
        b.step('队列为空，算法结束。最终最短路：' + g.nodes.map(n => n.id + '=' + sv(D[n.id])).join('，') + '。' +
          '对照一下：Bellman-Ford 无论图长什么样都要扫满 V-1 轮，而 SPFA 只处理「距离变过」的点。', [], { line: 3, milestone: 'SPFA 完成' });
        const reach = g.nodes.filter(n => isFinite(D[n.id]));
        const t = input.t || reach.sort((x, y) => D[y.id] - D[x.id])[0].id;
        const path = tracePath(prev, s, t);
        if (path && path.length > 1) {
          const cmds = [];
          for (let i = 0; i + 1 < path.length; i++) {
            const e = edgeBetween(g, path[i], path[i + 1]);
            cmds.push(C.state(path[i], 'path'));
            if (e) { cmds.push(C.edge(e.id, 'path')); cmds.push(C.pulse(e.id, { color: '#D97706' })); }
          }
          cmds.push(C.state(t, 'path'));
          b.step('回溯路径：**' + path.join(' → ') + '**，代价 ' + D[t] + '。', cmds, { line: 7, milestone: '路径 ' + path.join('→') });
        }
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 4. Floyd-Warshall
   * ============================================================ */
  const FW_NODES = [['A', 110, 140], ['B', 330, 110], ['C', 560, 150], ['D', 200, 380], ['E', 450, 400]];
  const FW_EDGES = [['A', 'B', 3], ['A', 'D', 8], ['B', 'C', 2], ['B', 'E', 6], ['C', 'E', 1], ['D', 'B', 4], ['D', 'E', 9], ['C', 'D', 7]];
  const FW_NEG_EDGES = [['A', 'B', 4], ['B', 'C', -2], ['A', 'C', 5], ['C', 'D', 3], ['D', 'E', 2], ['B', 'E', 10]];

  TGV.register({
    id: 'floyd', name: 'Floyd-Warshall（区间 DP + 矩阵热力联动）', category: '图 · 最短路径',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'dijkstra',
    panels: [
      { id: 'mat', type: 'matrix', n: 5, title: 'dp 距离矩阵' },
      { id: 'res', type: 'text', title: '结果' }
    ],
    pseudocode: [
      '// dp[i][j]：只允许经过前 k 个点作为中转时，i → j 的最短距离',
      '初始化：dp[i][i] = 0；有边 i→j 则 dp[i][j] = w；否则 ∞',
      'for k = 1 to n:',
      '    for i = 1 to n:',
      '        for j = 1 to n:',
      '            if dp[i][k] + dp[k][j] < dp[i][j]:',
      '                dp[i][j] = dp[i][k] + dp[k][j]',
      '// 结束后若 dp[i][i] < 0 ⇒ 存在负环'
    ],
    presets: [
      { id: 'std', label: '5 点有向图 · 逐轮放开中转点', desc: '矩阵热力值随 k 增大不断被压低', data: () => ({ s: 'A', directed: true, nodes: FW_NODES.map(a => a.slice()), edges: FW_EDGES.map(a => a.slice()) }) },
      { id: 'neg', label: '含负权边（无负环）', desc: 'Floyd 天然支持负权，dp[B][C] 会被压到 -2', data: () => ({ s: 'A', directed: true, nodes: FW_NODES.map(a => a.slice()), edges: FW_NEG_EDGES.map(a => a.slice()) }) }
    ],
    run(input) {
      const g = graphOf(input, true);
      const ids = g.nodes.map(n => n.id);
      const n = ids.length;
      const panels = [
        { id: 'mat', type: 'matrix', n: n, title: 'dp 距离矩阵', default: INF, rowLabels: ids, colLabels: ids },
        { id: 'res', type: 'text', title: '结果' }
      ];
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: panels });
      const dp = {};
      ids.forEach(a => ids.forEach(c => { dp[a + '|' + c] = a === c ? 0 : Infinity; }));
      g.edges.forEach(e => {
        const w = wOf(e);
        const k = e.source + '|' + e.target;
        if (w < dp[k]) dp[k] = w;
        if (!g.directed) {
          const rk = e.target + '|' + e.source;
          if (w < dp[rk]) dp[rk] = w;
        }
      });

      const initCmds = [];
      ids.forEach((a, i) => ids.forEach((c, j) => initCmds.push(C.matrix('mat', i, j, sv(dp[a + '|' + c])))));

      b.step('Floyd 是**区间 DP**：`dp[i][j]` 表示「只允许把 ' + ids.join('、') + ' 里前 k 个点当中转站」时 i→j 的最短距离。' +
        '每增加一个允许的中转点 k，就检查「绕一下 k 会不会更便宜」。三层循环一共 n³ 次比较，代码只有 4 行 —— 这就是它最迷人的地方。', [],
        { line: 1, vars: [{ name: 'n', value: n }] });

      b.step('初始化矩阵：`dp[i][i] = 0`（自己到自己），有边就填权值，没边填 ∞。对角线填 0，这样「绕 k 中转」的公式才能自然成立。', initCmds,
        { line: 2, milestone: '初始化 n×n 矩阵' });

      let totalUpd = 0;
      for (let k = 0; k < n; k++) {
        const mid = ids[k];
        b.step('**第 ' + (k + 1) + ' 轮：把 ' + mid + ' 加入允许的中转点集合。** 现在检查所有 (i, j)，看 `dp[i][' + mid + '] + dp[' + mid + '][j]` 是否比 `dp[i][j]` 更小。' +
          '（`i = ' + mid + '` 或 `j = ' + mid + '` 的组合可以直接跳过 —— 这一轮它们不会变。）', [
          C.state(mid, 'active'), C.badge(mid, 'k', k + 1, true),
          C.hull('mid', [mid], '#4F46E5', '中转 ' + mid)
        ], { line: 3, milestone: '中转点 k = ' + mid, stage: true, vars: [{ name: 'k', value: mid }] });

        let upd = 0;
        for (let i = 0; i < n; i++) {
          const a = ids[i];
          if (a === mid) continue;
          for (let j = 0; j < n; j++) {
            const c = ids[j];
            if (c === mid || a === c) continue;
            const dik = dp[a + '|' + mid], dkj = dp[mid + '|' + c], dij = dp[a + '|' + c];
            if (!isFinite(dik) || !isFinite(dkj)) continue;
            const nd = dik + dkj;
            if (nd < dij) {
              dp[a + '|' + c] = nd;
              upd++; totalUpd++;
              const cmds = [C.matrix('mat', i, j, nd, true)];
              const ea = edgeBetween(g, a, mid), ec = edgeBetween(g, mid, c);
              if (ea) cmds.push(C.pulse(ea.id, { color: '#4F46E5' }));
              if (ec) cmds.push(C.pulse(ec.id, { color: '#4F46E5' }));
              b.step('`dp[' + a + '][' + c + ']`：原来 ' + dij + '，走 ' + a + '→' + mid + '→' + c + ' 只要 **' + dik + ' + ' + dkj + ' = ' + nd + '** → 更新。' +
                '矩阵里这一格同时也是一个「路径记录」：以后再用别的点当中转，就会自动继承这条更便宜的走法。', cmds,
                { line: 7, milestone: a + '→' + c + ' 经 ' + mid + ' = ' + nd });
            }
          }
        }
        b.step('第 ' + (k + 1) + ' 轮结束，本轮更新 ' + upd + ' 格。允许的中转集合现在是 {' + ids.slice(0, k + 1).join(',') + '}。' +
          (upd === 0 ? '（这一轮没有变便宜，说明 ' + mid + ' 帮不上忙。）' : ''), [
          C.state(mid, 'visited'),
          C.clearHull('mid')
        ], { line: 3, stage: true });
      }

      const negRow = ids.filter(a => dp[a + '|' + a] < 0);
      const res = ids.map(a => ids.map(c => a + '→' + c + ' ' + sv(dp[a + '|' + c])).join('   '));
      if (negRow.length) {
        b.step('⚠️ 对角线出现负数：' + negRow.map(a => 'dp[' + a + '][' + a + '] = ' + dp[a + '|' + a]).join('，') +
          '。自己到自己居然是负的 ⇒ 存在负环，最短路无意义。', [
          C.state(negRow[0], 'conflict')
        ], { line: 8, milestone: '负环', stage: true });
      } else {
        b.step('三层循环跑完，**任意两点间的最短路全部求出**（共 ' + (n * n - n) + ' 个有序对，累计更新 ' + totalUpd + ' 次）。' +
          'Floyd 一次就能算出所有点对，而且天然支持负权边 —— 代价是 O(n³) 时间和 O(n²) 空间。', [
          C.text('res', res)
        ], { line: 8, milestone: '全源最短路完成', stage: true });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 5. A*
   * ============================================================ */
  function geoGraph(nodeArr, pairArr, directed) {
    const pos = {};
    nodeArr.forEach(a => { pos[a[0]] = { x: a[1], y: a[2] }; });
    const edges = pairArr.map(pr => {
      const A = pos[pr[0]], B = pos[pr[1]];
      const d = Math.hypot(A.x - B.x, A.y - B.y);
      return [pr[0], pr[1], Math.max(1, Math.ceil(d / 60))];
    });
    return TGV.GraphLib.mkGraph(nodeArr, edges, { directed: !!directed });
  }

  const AS_NODES = [
    ['S', 90, 300],
    ['A', 210, 120], ['B', 210, 300], ['C', 210, 480],
    ['D', 330, 120], ['E', 330, 300], ['F', 330, 480],
    ['G', 450, 120], ['H', 450, 300], ['I', 450, 480],
    ['J', 570, 120], ['K', 570, 300], ['L', 570, 480],
    ['T', 690, 300]
  ];
  const AS_EDGES = [
    ['S', 'A'], ['S', 'B'], ['S', 'C'],
    ['A', 'D'], ['B', 'E'], ['C', 'F'],
    ['D', 'E'], ['E', 'F'],
    ['D', 'G'], ['E', 'H'], ['F', 'I'],
    ['G', 'H'], ['H', 'I'],
    ['G', 'J'], ['H', 'K'], ['I', 'L'],
    ['J', 'K'], ['K', 'L'],
    ['J', 'T'], ['K', 'T'], ['L', 'T']
  ];
  const AS_CORRIDOR_NODES = [['S', 90, 300], ['A', 220, 300], ['B', 350, 170], ['C', 480, 170], ['D', 610, 300], ['T', 720, 360]];
  const AS_CORRIDOR_EDGES = [['S', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'T']];

  TGV.register({
    id: 'astar', name: 'A* 启发式搜索（f = g + h）', category: '图 · 最短路径',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'dijkstra',
    panels: [
      { id: 'open', type: 'heap', title: 'Open 表（按 f 排序）' },
      { id: 'closed', type: 'list', title: 'Closed 表（已扩展）' },
      { id: 'watch', type: 'table', title: 'g / h / f', columns: [{ key: 'g', label: 'g' }, { key: 'h', label: 'h' }, { key: 'f', label: 'f' }] }
    ],
    pseudocode: [
      '// f = g + h：g 是起点到 u 的实际代价，h 是 u 到终点的"乐观估计"',
      'open = {s}；g[s] = 0；f[s] = h(s)',
      'while open 非空:',
      '    u = open 中 f 最小的点',
      '    if u == t: 沿 prev 回溯，得到最短路径，结束',
      '    把 u 从 open 移到 closed',
      '    for each 边 (u, v, w) in adj[u]:',
      '        if g[u] + w < g[v]:',
      '            g[v] = g[u] + w；prev[v] = u',
      '            f[v] = g[v] + h(v)',
      '            if v 不在 open 也不在 closed: 加入 open',
      '// h 必须"可采纳"（永不高估）才能保证最优；h ≡ 0 就退化成 Dijkstra'
    ],
    presets: [
      { id: 'grid', label: '4×3 网格 · 直线距离启发', desc: 'h 引导搜索直扑终点，比 Dijkstra 少扩展很多点', data: () => ({ s: 'S', t: 'T' }) },
      { id: 'corridor', label: '单走廊（h 帮不上忙）', desc: '只有一条路时 h 提供不了区分度，退化成 Dijkstra', data: () => ({ s: 'S', t: 'T', corridor: true }) }
    ],
    run(input) {
      const corridor = !!input.corridor;
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: false })
        : (corridor ? geoGraph(AS_CORRIDOR_NODES, AS_CORRIDOR_EDGES, false) : geoGraph(AS_NODES, AS_EDGES, false));
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const pos = {};
      g.nodes.forEach(n => { pos[n.id] = { x: n.x, y: n.y }; });
      const s = input.s || g.nodes[0].id;
      const t = input.t || g.nodes[g.nodes.length - 1].id;
      const hOf = id => Math.floor(Math.hypot(pos[id].x - pos[t].x, pos[id].y - pos[t].y) / 60);
      const G = {}, F = {}, H = {}, prev = {}, inOpen = {}, inClosed = {};
      g.nodes.forEach(n => { G[n.id] = Infinity; F[n.id] = Infinity; H[n.id] = hOf(n.id); prev[n.id] = '-'; });
      const open = [], closed = [];
      const openItems = () => open.slice().sort((x, y) => F[x] - F[y] || String(x).localeCompare(String(y)))
        .map(id => ({ key: id, label: id, meta: 'f=' + F[id] }));
      const closedItems = () => closed.map(id => ({ key: id, label: id, meta: 'f=' + F[id] }));
      let heat = null;
      const hot = (eid, cmds) => {
        const pre = (heat && heat !== eid) ? [C.edge(heat, 'default')] : [];
        heat = eid;
        return pre.concat(cmds);
      };

      b.step('A* 把「已经走了多远」（g）和「还差多远」（h）加起来，用 **f = g + h** 排序。' +
        'h 必须**可采纳**（永不高估真实剩余距离）：本图每条边权取 `ceil(直线距离/60)`，而 `h = floor(直线距离/60)`，所以 h 一定不超过真实代价。' +
        '当 h ≡ 0 时，A* 就完全退化成 Dijkstra。', [], { line: 1, vars: [{ name: 's', value: s }, { name: 't', value: t }] });

      G[s] = 0; F[s] = H[s]; inOpen[s] = true; open.push(s);
      b.step('初始化：`g[' + s + '] = 0`，`h[' + s + '] = ' + H[s] + '`（直线距离/60 向下取整），`f[' + s + '] = ' + F[s] + '`，加入 Open 表。', [
        C.state(s, 'frontier'), C.badge(s, 'f', F[s], true),
        C.table('watch', s, 'g', 0), C.table('watch', s, 'h', H[s], true), C.table('watch', s, 'f', F[s], true),
        C.q('open', 'set', openItems())
      ], { line: 2, milestone: 'open = {' + s + '}' });

      let found = false, guard = 0;
      while (open.length && guard++ < 120) {
        open.sort((x, y) => F[x] - F[y] || String(x).localeCompare(String(y)));
        const u = open.shift();
        delete inOpen[u];
        b.step('Open 表里 **f 最小的是 ' + u + '**（f = ' + F[u] + ' = g ' + G[u] + ' + h ' + H[u] + '），取出来扩展。' +
          'h 越接近终点越小，所以搜索天然朝着 ' + t + ' 的方向推进。', [
          C.q('open', 'set', openItems()),
          C.state(u, 'active')
        ], { line: 4, vars: [{ name: 'u', value: u }, { name: 'f', value: F[u] }] });

        if (u === t) { found = true; inClosed[u] = true; closed.push(u); break; }

        inClosed[u] = true; closed.push(u);
        b.step(u + ' 不是终点 → 移入 **Closed 表**（它的 g 已是最优，不必再碰）。', [
          C.state(u, 'visited'),
          C.q('closed', 'set', closedItems())
        ], { line: 6, milestone: '扩展 ' + u + '（f=' + F[u] + '）' });

        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to, w = link.w == null ? 1 : link.w;
          const ng = G[u] + w;
          if (inClosed[v]) {
            b.step('边 ' + u + '→' + v + '：' + v + ' 已在 Closed 表里（g = ' + G[v] + '），跳过。', hot(link.eid, [
              C.edge(link.eid, 'ghost')
            ]), { line: 11 });
            continue;
          }
          if (ng >= G[v]) {
            b.step('边 ' + u + '→' + v + '（w=' + w + '）：`g[' + u + '] + ' + w + ' = ' + ng + '` 不优于 `g[' + v + '] = ' + sv(G[v]) + '` → 不更新。' +
              (isFinite(G[v]) ? '（h 相同，g 更大 ⇒ f 也更大，没必要再看）' : ''), hot(link.eid, [
              C.edge(link.eid, 'active')
            ]), { line: 8 });
            continue;
          }
          const old = G[v];
          G[v] = ng; F[v] = ng + H[v]; prev[v] = u;
          const cmds = [
            C.pulse(link.eid, { color: '#16A34A' }),
            C.edge(link.eid, 'visited'),
            C.badge(v, 'f', F[v], true),
            C.state(v, 'frontier'),
            C.table('watch', v, 'g', G[v], true),
            C.table('watch', v, 'h', H[v]),
            C.table('watch', v, 'f', F[v], true)
          ];
          if (!inOpen[v]) { inOpen[v] = true; open.push(v); cmds.push(C.q('open', 'push', [{ key: v, label: v, meta: 'f=' + F[v] }])); }
          b.step('更新 ' + v + '：`g` 从 ' + sv(old) + ' 降到 **' + ng + '**，`f = ' + ng + ' + ' + H[v] + ' = ' + F[v] + '`。' +
            (inOpen[v] ? '它已在 Open 表 → 用新的 f 重新排队。' : '加入 Open 表。'), hot(link.eid, cmds),
            { line: 9, milestone: 'g[' + v + '] = ' + ng });
        }
      }

      const dCount = (function () {
        const D = {}, done = {};
        g.nodes.forEach(n => D[n.id] = Infinity);
        D[s] = 0;
        let cnt = 0;
        for (let r = 0; r < g.nodes.length; r++) {
          let u = null, best = Infinity;
          g.nodes.forEach(n => { if (!done[n.id] && D[n.id] < best) { best = D[n.id]; u = n.id; } });
          if (u == null) break;
          done[u] = true; cnt++;
          if (u === t) break;
          g.adj[u].forEach(l => { const nd = D[u] + (l.w == null ? 1 : l.w); if (nd < D[l.to]) D[l.to] = nd; });
        }
        return cnt;
      })();

      if (found) {
        const path = tracePath(prev, s, t);
        const cmds = [];
        for (let i = 0; i + 1 < path.length; i++) {
          const e = edgeBetween(g, path[i], path[i + 1]);
          cmds.push(C.state(path[i], 'path'));
          if (e) { cmds.push(C.edge(e.id, 'path')); cmds.push(C.pulse(e.id, { color: '#D97706' })); }
        }
        cmds.push(C.state(t, 'path'), C.clearHull('mid'));
        b.step('弹出终点 **' + t + '** ⇒ 找到最短路：**' + path.join(' → ') + '**，总代价 **' + G[t] + '**。' +
          'A* 一共扩展了 **' + closed.length + '** 个点' + (corridor
            ? '。这条图只有一条走廊，每个点都别无选择，h 提供不了区分度 —— 此时 A* 与 Dijkstra 完全等价。这也说明了「启发式只有在有岔路时才有价值」。'
            : '；同样的问题 Dijkstra 要扩展 **' + dCount + '** 个点。省下来的部分，全靠 h 把「明显背离终点」的分支提前压到队尾。'), cmds,
          { line: 5, milestone: '最短路径 ' + s + '→' + t + ' = ' + G[t] });
        b.step('最后强调：如果 h 高估了真实距离（不可采纳），A* 可能提前把终点弹出，返回一条**次优**路径。h ≡ 0 时它退化成 Dijkstra（一定最优但更慢）；h 恰好等于真实剩余距离时，它一步不绕直达终点（最快）。', [],
          { line: 12, milestone: 'A* 完成：' + closed.length + ' 次扩展' });
      } else {
        b.step('Open 表空了还没碰到 ' + t + ' ⇒ 不可达。', [], { line: 3, milestone: '不可达' });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 6. 0-1 BFS
   * ============================================================ */
  TGV.register({
    id: 'zero_one_bfs', name: '0-1 BFS（双端队列替代优先队列）', category: '图 · 最短路径',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'dijkstra',
    panels: [
      { id: 'dq', type: 'deque', title: '双端队列' },
      { id: 'watch', type: 'table', title: '距离表', columns: [{ key: 'dist', label: 'dist' }, { key: 'prev', label: 'prev' }] }
    ],
    pseudocode: [
      '// 边权只有 0 / 1 时，用双端队列代替优先队列，O(V+E) 解决',
      'dist[s] = 0；deque = [s]',
      'while deque 非空:',
      '    u = deque.pop_front()',
      '    if u 已处理过: continue',
      '    for each 边 (u, v, w) in adj[u]:',
      '        if dist[u] + w < dist[v]:',
      '            dist[v] = dist[u] + w；prev[v] = u',
      '            if w == 0: deque.push_front(v)   // 不增加距离，插到队首',
      '            else:      deque.push_back(v)    // 距离 +1，放到队尾',
      '// 队列中的 dist 始终单调不降 ⇒ 出队顺序就是最终顺序'
    ],
    presets: [
      { id: 'std', label: '0/1 权混合图', desc: '0 权边插队首，1 权边排队尾，一次扫描即最优', data: () => ({ s: 'S', t: 'T' }) },
      { id: 'long', label: '长链 0 权跳跃', desc: '一串 0 权边瞬间把整条链拉成距离 0', data: () => ({ s: '1', t: '6', long: true }) }
    ],
    run(input) {
      const isLong = !!input.long;
      const nodeArr = isLong
        ? [['1', 90, 300], ['2', 210, 190], ['3', 330, 300], ['4', 450, 190], ['5', 570, 300], ['6', 690, 190]]
        : [['S', 100, 300], ['A', 240, 160], ['B', 240, 300], ['C', 240, 440], ['D', 400, 160], ['E', 400, 440], ['T', 560, 300]];
      const edgeArr = isLong
        ? [['1', '2', 0], ['2', '3', 0], ['3', '4', 0], ['4', '5', 0], ['5', '6', 1], ['1', '3', 1], ['2', '6', 1]]
        : [['S', 'A', 0], ['S', 'B', 1], ['S', 'C', 1], ['A', 'B', 0], ['B', 'C', 0], ['A', 'D', 1], ['B', 'D', 1], ['B', 'E', 1], ['C', 'E', 1], ['D', 'T', 0], ['E', 'T', 1]];
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: false })
        : TGV.GraphLib.mkGraph(nodeArr, edgeArr, { directed: false });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const D = {}, prev = {}, done = {};
      g.nodes.forEach(n => { D[n.id] = Infinity; prev[n.id] = '-'; done[n.id] = false; });
      const s = input.s || g.nodes[0].id;
      const t = input.t || g.nodes[g.nodes.length - 1].id;
      const dq = [];
      let heat = null;
      const dqItems = () => dq.map(id => ({ key: id, label: id, meta: 'd=' + sv(D[id]) }));

      b.step('如果边权只有 **0 和 1**，就不需要堆了：用**双端队列**。遇到 0 权边松弛成功，说明「到达 v 的代价和 u 一样」，把 v 插到**队首**（马上处理）；' +
        '遇到 1 权边，v 的代价比 u 大 1，放到**队尾**。这样队列里的 dist 永远单调不降，出队顺序天然就是最优顺序，复杂度降到 O(V+E)。', [],
        { line: 1, vars: [{ name: 's', value: s }, { name: 't', value: t }] });

      D[s] = 0; dq.push(s);
      b.step('源点入队：`dist[' + s + '] = 0`。', [
        C.state(s, 'frontier'), C.badge(s, 'd', 0),
        C.table('watch', s, 'dist', 0, true),
        C.table('watch', s, 'prev', '-'),
        C.q('dq', 'set', dqItems())
      ], { line: 2, milestone: '源点入队' });

      let guard = 0;
      while (dq.length && guard++ < 100) {
        const u = dq.shift();
        const reset = heat ? [C.edge(heat, 'default')] : [];
        heat = null;
        if (done[u]) {
          b.step(u + ' 之前已经处理过了（同一个点可能被多次入队），跳过。', reset.concat([
            C.q('dq', 'pop_front')
          ]), { line: 5 });
          continue;
        }
        done[u] = true;
        b.step('队首出队 **' + u + '**（dist = ' + D[u] + '）。因为队列里的 dist 单调不降，' + u + ' 一旦出队，它的距离就已经是最终值。', reset.concat([
          C.q('dq', 'pop_front'),
          C.state(u, 'visited'), C.badge(u, 'd', D[u], true)
        ]), { line: 4, vars: [{ name: 'u', value: u }] });

        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to, w = link.w == null ? 1 : link.w;
          const nd = D[u] + w;
          if (nd >= D[v]) {
            b.step('边 ' + u + '→' + v + '（w=' + w + '）：`' + D[u] + ' + ' + w + ' = ' + nd + '` ≥ ' + sv(D[v]) + ' → 不松弛。', [
              C.edge(link.eid, 'active')
            ], { line: 7 });
            heat = link.eid;
            continue;
          }
          const old = D[v];
          D[v] = nd; prev[v] = u;
          heat = link.eid;
          const at = dq.indexOf(v);
          if (at >= 0) dq.splice(at, 1);
          if (w === 0) {
            dq.unshift(v);
            b.step('**0 权边松弛**：`dist[' + v + ']` 从 ' + sv(old) + ' 降到 ' + nd + '，和 ' + u + ' 一样大。' +
              '为了让 ' + v + ' 立刻被处理，**插到队首**（push_front）—— 这是双端队列的关键动作。', [
              C.pulse(link.eid, { color: '#16A34A' }),
              C.edge(link.eid, 'visited'),
              C.badge(v, 'd', nd, true), C.state(v, 'frontier'),
              C.table('watch', v, 'dist', nd, true),
              C.table('watch', v, 'prev', u, true),
              C.q('dq', 'set', dqItems())
            ], { line: 9, milestone: 'push_front ' + v + '（w=0，d=' + nd + '）' });
          } else {
            dq.push(v);
            b.step('**1 权边松弛**：`dist[' + v + ']` 从 ' + sv(old) + ' 降到 ' + nd + '，比 ' + u + ' 多 1。' +
              '放到**队尾**（push_back），保证所有距离更小的点先被处理。', [
              C.pulse(link.eid, { color: '#F59E0B' }),
              C.edge(link.eid, 'visited'),
              C.badge(v, 'd', nd, true), C.state(v, 'frontier'),
              C.table('watch', v, 'dist', nd, true),
              C.table('watch', v, 'prev', u, true),
              C.q('dq', 'set', dqItems())
            ], { line: 10, milestone: 'push_back ' + v + '（w=1，d=' + nd + '）' });
          }
        }
      }

      const path = tracePath(prev, s, t);
      if (path && path.length > 1) {
        const cmds = [];
        for (let i = 0; i + 1 < path.length; i++) {
          const e = edgeBetween(g, path[i], path[i + 1]);
          cmds.push(C.state(path[i], 'path'));
          if (e) { cmds.push(C.edge(e.id, 'path')); cmds.push(C.pulse(e.id, { color: '#D97706' })); }
        }
        cmds.push(C.state(t, 'path'));
        b.step('队列空，结束。' + s + ' → ' + t + ' 的最短路：**' + path.join(' → ') + '**，代价 **' + D[t] + '**。' +
          '每一步只需要 O(1) 的队列操作。把 0 权看成「同一层」、1 权看成「下一层」，0-1 BFS 其实就是 **BFS 分层思想在带权图上的推广**。', cmds,
          { line: 11, milestone: '最短路径 ' + s + '→' + t + ' = ' + D[t] });
      } else {
        b.step('队列空，' + t + ' 不可达。', [], { line: 3, milestone: '不可达' });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

})();
