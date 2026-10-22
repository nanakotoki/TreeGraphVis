/* ============================================================
 * 第二卷 · G3 最小生成树 + G4 有向无环图
 * Prim · Kruskal · Borůvka · 次小生成树
 * Kahn 拓扑 · DFS 拓扑 · AOE 关键路径
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;
  const INF = '∞';

  function mk(input, directedDefault, nodeArr, edgeArr) {
    input = input || {};
    const directed = input.directed !== undefined ? input.directed !== false : directedDefault !== false;
    if (input.custom) {
      return TGV.GraphLib.mkGraph(
        (input.nodes || []).map(n => [n.id, n.x != null ? n.x : 400, n.y != null ? n.y : 300, n.label]),
        (input.edges || []).map(e => [e.source, e.target, e.weight != null ? e.weight : 1]),
        { directed });
    }
    return TGV.GraphLib.mkGraph(nodeArr, edgeArr, { directed });
  }
  const wOf = e => (e.weight == null ? 1 : e.weight);
  const sv = x => (isFinite(x) ? x : INF);

  function withRowOrder(panels, ids) {
    return panels.map(p => (p.type === 'table' ? Object.assign({}, p, { rowOrder: ids }) : p));
  }

  /* 并查集（带路径压缩 + 按秩合并），状态通过面板同步 */
  function makeDsu(ids) {
    const parent = {}, rank = {};
    ids.forEach(id => { parent[id] = id; rank[id] = 0; });
    const dsu = {
      parent: parent, rank: rank,
      find(x) {
        let r = x;
        while (parent[r] !== r) r = parent[r];
        while (parent[x] !== r) { const nx = parent[x]; parent[x] = r; x = nx; }
        return r;
      },
      union(a, b) {
        let ra = dsu.find(a), rb = dsu.find(b);
        if (ra === rb) return false;
        if (rank[ra] < rank[rb]) { const t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] === rank[rb]) rank[ra]++;
        return true;
      },
      snap() { return { parent: Object.assign({}, parent), rank: Object.assign({}, rank) }; }
    };
    return dsu;
  }

  const MST_NODES = [['A', 130, 120], ['B', 370, 90], ['C', 610, 140], ['D', 190, 340], ['E', 430, 300], ['F', 630, 380], ['G', 350, 500]];
  const MST_EDGES = [['A', 'B', 4], ['A', 'D', 3], ['B', 'C', 6], ['B', 'D', 5], ['B', 'E', 7], ['C', 'E', 2], ['C', 'F', 8], ['D', 'E', 4], ['D', 'G', 9], ['E', 'F', 3], ['E', 'G', 6], ['F', 'G', 5]];

  /* ============================================================
   * 1. Prim
   * ============================================================ */
  TGV.register({
    id: 'prim', name: 'Prim 最小生成树（割性质 + 优先队列）', category: '图 · 最小生成树',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'kruskal',
    panels: [
      { id: 'heap', type: 'heap', title: '候选边（按 key 排序）' },
      { id: 'watch', type: 'table', title: 'key / parent', columns: [{ key: 'key', label: 'key' }, { key: 'par', label: 'parent' }, { key: 'in', label: '在树中' }] }
    ],
    pseudocode: [
      '// 从任意点出发，每次把"离当前树最近"的点拉进来（割性质保证最优）',
      'key[s] = 0，其余 ∞；parent[] = 空',
      'while 优先队列非空:',
      '    u = 取出 key 最小的点',
      '    if u 已在树中: 跳过（过期记录）',
      '    把 u 加入树；边 (parent[u], u) 成为树边',
      '    for each 边 (u, v, w):',
      '        if v 不在树中 and w < key[v]:',
      '            key[v] = w；parent[v] = u；压入堆',
      '// 最小生成树总权 = Σ key[u]，共 V-1 条树边'
    ],
    presets: [
      { id: 'std', label: '7 点带权无向图 · 从 A 生长', desc: '观察树像"水滴"一样向外扩张，每次吞下最近的割边', data: () => ({ s: 'A' }) },
      { id: 'mid', label: '从中心 E 出发（对比生长顺序）', desc: '起点不同但最终总权一样 —— 这就是 MST 的唯一性（权值互异时）', data: () => ({ s: 'E' }) }
    ],
    run(input) {
      const g = mk(input, false, MST_NODES, MST_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const key = {}, par = {}, inTree = {};
      g.nodes.forEach(n => { key[n.id] = Infinity; par[n.id] = '-'; inTree[n.id] = '—'; });
      const s = input.s || g.nodes[0].id;
      const heap = [];
      let total = 0, heat = null;

      const heapItems = () => heap.slice()
        .sort((x, y) => x.k - y.k || String(x.id).localeCompare(String(y.id)))
        .map(it => ({ key: it.id + '@' + it.k, label: it.id, meta: 'key=' + it.k }));

      b.step('Prim 的直觉：把已经长成的树看成一个「连通块」，每次从**连接块内与块外的所有边**里挑最短的那条，把对面的点吞进来。' +
        '为什么这样一定对？因为**割性质**：横跨任意割的最短边，一定属于某棵最小生成树。', [], { line: 1, vars: [{ name: 's', value: s }] });

      key[s] = 0;
      heap.push({ id: s, k: 0 });
      b.step('初始化：`key[' + s + '] = 0`（源点免费入树），其余 ∞。`key[v]` 的含义是「v 到当前树的最近距离」。', [
        C.state(s, 'frontier'), C.table('watch', s, 'key', 0, true), C.table('watch', s, 'par', '-'),
        C.q('heap', 'set', heapItems())
      ], { line: 2, milestone: '源点 ' + s + ' 就绪' });

      let guard = 0;
      while (heap.length && guard++ < 200) {
        heap.sort((x, y) => x.k - y.k || String(x.id).localeCompare(String(y.id)));
        const cur = heap.shift();
        if (heat) { C.edge(heat, 'default'); heat = null; }
        b.step('取出 `key` 最小的点 **' + cur.id + '**（key = ' + cur.k + '）。', [
          C.q('heap', 'set', heapItems()), C.state(cur.id, 'active')
        ], { line: 4 });
        if (inTree[cur.id] === '✓') {
          b.step(cur.id + ' 早就在树里了 —— 这条是它被更短边更新前留下的过期记录，丢弃。', [C.state(cur.id, 'visited')], { line: 5 });
          continue;
        }
        inTree[cur.id] = '✓';
        const pe = par[cur.id] === '-' ? null : g.edges.find(e => (e.source === par[cur.id] && e.target === cur.id) || (e.source === cur.id && e.target === par[cur.id]));
        if (pe) { total += key[cur.id]; heat = pe.id; }
        b.step('**' + cur.id + ' 入树**' + (pe
          ? '，树边 **(' + par[cur.id] + ',' + cur.id + ')** 权 ' + key[cur.id] + '，当前总权 **' + total + '**。'
          : '（它是起点，不需要入树边）。'), [
          C.state(cur.id, 'visited'),
          C.table('watch', cur.id, 'in', '✓', true),
          pe ? C.pulse(pe.id, { color: '#16A34A' }) : C.state(cur.id, 'visited'),
          pe ? C.edge(pe.id, 'visited') : C.state(cur.id, 'visited')
        ], { line: 6, milestone: '入树 ' + cur.id + (pe ? '（边权 ' + key[cur.id] + '）' : '') });

        for (let i = 0; i < g.adj[cur.id].length; i++) {
          const link = g.adj[cur.id][i];
          const v = link.to, w = link.w == null ? 1 : link.w;
          if (inTree[v] === '✓') {
            b.step('边 ' + cur.id + '→' + v + '（w=' + w + '）：两端都已在树中，加入就会成环 → 跳过。', [
              C.edge(link.eid, 'rejected')
            ], { line: 8 });
            if (heat && heat !== link.eid) C.edge(heat, 'visited');
            continue;
          }
          if (w >= key[v]) {
            b.step('边 ' + cur.id + '→' + v + '（w=' + w + '）：不优于 `key[' + v + '] = ' + sv(key[v]) + '`，不动。', [
              C.edge(link.eid, 'active')
            ], { line: 8 });
            if (heat && heat !== link.eid) C.edge(heat, 'visited');
            continue;
          }
          const old = key[v];
          key[v] = w; par[v] = cur.id;
          heap.push({ id: v, k: w });
          b.step('**更新候选**：`key[' + v + ']` 从 ' + sv(old) + ' 降到 **' + w + '**，`parent[' + v + '] = ' + cur.id + '`，压入堆。' +
            '现在 ' + v + ' 通过 ' + cur.id + ' 挂到树上的代价更低了。', [
            C.pulse(link.eid, { color: '#F59E0B' }),
            C.edge(link.eid, 'frontier'),
            C.state(v, 'frontier'), C.badge(v, 'k', w, true),
            C.table('watch', v, 'key', w, true),
            C.table('watch', v, 'par', cur.id, true),
            C.q('heap', 'set', heapItems())
          ], { line: 9, milestone: 'key[' + v + '] = ' + w });
          if (heat && heat !== link.eid) { C.edge(heat, 'visited'); }
        }
      }

      const picked = g.edges.filter(e => heat === e.id);
      const mstEdges = g.edges.filter(e => {
        const gu = inTree[e.source] === '✓', gv = inTree[e.target] === '✓';
        return gu && gv && (par[e.target] === e.source || par[e.source] === e.target);
      });
      const cmds = mstEdges.map(e => C.edge(e.id, 'path'));
      mstEdges.forEach(e => cmds.push(C.pulse(e.id, { color: '#D97706' })));
      b.step('全部点入树，**最小生成树完成**：共 ' + (g.nodes.length - 1) + ' 条边，总权 **' + total + '**。' +
        'Prim 的复杂度是 O(E log V)（二叉堆），稠密图上比 Kruskal 更快；它的每一步都在维护「一棵树」，所以特别适合**从某个点开始**逐步建网。' +
        '注意：Prim 只对**连通图**有效，非连通图会退化成「最小生成森林」。', cmds,
        { line: 10, milestone: 'MST 总权 ' + total, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 2. Kruskal
   * ============================================================ */
  TGV.register({
    id: 'kruskal', name: 'Kruskal 最小生成树（边排序 + 并查集）', category: '图 · 最小生成树',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'prim',
    panels: [
      { id: 'dsu', type: 'dsu', title: '并查集（连通块）' },
      { id: 'picked', type: 'list', title: '已选树边 / 判定' }
    ],
    pseudocode: [
      '// 把所有边按权值升序排序，依次尝试加入；会成环就丢掉',
      'edges.sort(by weight)',
      'for each 边 (u, v, w) in edges:',
      '    ru = find(u); rv = find(v)',
      '    if ru == rv: 两端已连通 → 这条边成环，丢弃',
      '    else:        union(ru, rv)；把 (u,v) 加入生成树',
      '    if 已选 V-1 条边: break',
      '// 并查集让"是否成环"的判定接近 O(1)'
    ],
    presets: [
      { id: 'std', label: '7 点带权无向图 · 贪心加边', desc: '按边权从小到大扫，红虚线是被丢弃的成环边', data: () => ({}) },
      { id: 'tie', label: '含等权边（多种答案）', desc: '等权边顺序不同会得到不同的 MST，但总权相同', data: () => ({ tie: true }) }
    ],
    run(input) {
      const g = mk(input, false, MST_NODES, MST_EDGES);
      const panels = withRowOrder(this.panels, g.nodes.map(n => n.id));
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: panels });
      const dsu = makeDsu(g.nodes.map(n => n.id));
      const sorted = g.edges.slice().sort((x, y) => wOf(x) - wOf(y) || String(x.id).localeCompare(String(y.id)));
      let total = 0, count = 0;

      b.step('Kruskal 换个角度：不管树长什么样，直接**按边权从小到大排队**，能加就加。' +
        '判断「加了会不会成环」用并查集：两端已经在同一个集合里 ⇒ 成环。' +
        '这本质上是**拟阵贪心**——「无环边集」构成一个拟阵，所以按权排序后的贪心必然最优。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }, { name: 'E', value: g.edges.length }] });

      b.step('排序结果：' + sorted.map(e => e.source + e.target + '(' + wOf(e) + ')').join(' ≤ ') + '。', [
        C.dsu('dsu', dsu.parent, dsu.rank)
      ], { line: 2, milestone: '边已按权升序' });

      for (let i = 0; i < sorted.length && count < g.nodes.length - 1; i++) {
        const e = sorted[i];
        const u = e.source, v = e.target, w = wOf(e);
        const ru = dsu.find(u), rv = dsu.find(v);
        b.step('第 ' + (i + 1) + ' 条边 **(' + u + ',' + v + ')** 权 ' + w + '：`find(' + u + ') = ' + ru + '`，`find(' + v + ') = ' + rv + '`。', [
          C.edge(e.id, 'active'), C.state(u, 'active'), C.state(v, 'active'),
          C.badge(u, 'rt', ru), C.badge(v, 'rt', rv)
        ], { line: 4, vars: [{ name: 'w', value: w }] });

        if (ru === rv) {
          b.step('两个端点已经在同一棵并查集树里（根都是 ' + ru + '）→ 加这条边会**成环**，丢弃。' +
            '这正是 Kruskal 的全部智慧：用「是否连通」代替「是否成环」。', [
            C.edge(e.id, 'rejected'), C.pulse(e.id, { color: '#DC2626' }),
            C.q('picked', 'push', [{ key: e.id, label: u + ' — ' + v, meta: 'w=' + w + ' 成环 ✗' }]),
            C.dsu('dsu', dsu.parent, dsu.rank)
          ], { line: 5, milestone: '丢弃 ' + u + '-' + v + '（成环）' });
          continue;
        }

        dsu.union(u, v);
        total += w; count++;
        b.step('根不同（' + ru + ' ≠ ' + rv + '）→ **并入生成树**，并查集合并这两棵树。当前总权 **' + total + '**，已选 ' + count + ' 条边。', [
          C.edge(e.id, 'visited'), C.pulse(e.id, { color: '#16A34A' }),
          C.q('picked', 'push', [{ key: e.id, label: u + ' — ' + v, meta: 'w=' + w }]),
          C.dsu('dsu', dsu.parent, dsu.rank)
        ], { line: 6, milestone: '加入 ' + u + '—' + v + '（w=' + w + '，累计 ' + total + '）' });

        if (count === g.nodes.length - 1) {
          b.step('已经选满 **V-1 = ' + count + '** 条边，生成树必然连通且无环 → 提前结束（后面的边权只会更大，不用再看）。', [], { line: 7, stage: true });
        }
      }

      const tree = g.edges.filter(e => e.state === undefined);
      b.step('**最小生成树完成**：' + count + ' 条边，总权 **' + total + '**。' +
        '复杂度 O(E log E)（瓶颈在排序），比 Prim 更适合**稀疏图**；而且它对「最小生成森林」天然友好 —— 图不连通时，最后会得到若干棵树。', [
        C.clearHull('mst')
      ], { line: 8, milestone: 'MST 总权 ' + total, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 3. Borůvka
   * ============================================================ */
  const BOR_NODES = [['A', 130, 140], ['B', 350, 110], ['C', 570, 150], ['D', 170, 390], ['E', 410, 370], ['F', 630, 410]];
  const BOR_EDGES = [['A', 'B', 2], ['A', 'D', 6], ['B', 'C', 3], ['B', 'D', 5], ['B', 'E', 4], ['C', 'E', 7], ['C', 'F', 8], ['D', 'E', 1], ['E', 'F', 9], ['D', 'F', 10]];

  TGV.register({
    id: 'boruvka', name: 'Borůvka 最小生成树（每块找最短出边）', category: '图 · 最小生成树',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'prim',
    panels: [
      { id: 'dsu', type: 'dsu', title: '并查集（连通块）' },
      { id: 'best', type: 'list', title: '本轮各块的最短出边' }
    ],
    pseudocode: [
      '// 每一轮：每个连通块各自找一条"通往块外"的最短边，然后一起合并',
      '把每个点看成一个块',
      'while 块数 > 1:',
      '    对每个块: 扫描它的所有出边，记下最短的那条',
      '    把所有选中的边一起加入（用并查集合并）',
      '// 每轮块数至少减半 ⇒ 最多 O(log V) 轮',
      '// 总复杂度 O(E log V)，天然适合并行'
    ],
    presets: [
      { id: 'std', label: '6 点图 · 两轮收敛', desc: '第一轮 3 个块各自选边，第二轮只剩 2 个块', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, false, BOR_NODES, BOR_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const dsu = makeDsu(g.nodes.map(n => n.id));
      let total = 0, edgesUsed = 0;

      b.step('Borůvka 是最"古老"的 MST 算法（1926 年，为摩拉维亚电网设计）。它的思路非常适合并行：' +
        '**每一轮，每个连通块各自独立地找一条通往块外的最短边**，然后一次性全部合并。因为每轮块数至少减半，所以最多 O(log V) 轮。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }] });

      b.step('初始状态：每个点自成一个块，共 ' + g.nodes.length + ' 个块。', [
        C.dsu('dsu', dsu.parent, dsu.rank)
      ], { line: 2, milestone: '初始 ' + g.nodes.length + ' 个块' });

      let round = 0, guard = 0;
      while (guard++ < 12) {
        const comps = {};
        g.nodes.forEach(n => { const r = dsu.find(n.id); (comps[r] = comps[r] || []).push(n.id); });
        const roots = Object.keys(comps);
        if (roots.length <= 1) break;
        round++;
        b.step('**第 ' + round + ' 轮**：当前有 ' + roots.length + ' 个块 —— ' +
          roots.map(r => '[' + comps[r].join(',') + ']').join('、') + '。每个块独立寻找自己的最短出边。', [
          C.dsu('dsu', dsu.parent, dsu.rank),
          C.q('best', 'clear')
        ], { line: 3, vars: [{ name: 'round', value: round }], stage: true });

        const chosen = [];
        for (let ci = 0; ci < roots.length; ci++) {
          const r = roots[ci];
          const members = comps[r];
          let bestE = null, bestW = Infinity;
          for (let mi = 0; mi < members.length; mi++) {
            const u = members[mi];
            for (let i = 0; i < g.adj[u].length; i++) {
              const link = g.adj[u][i];
              if (dsu.find(link.to) === r) continue;
              const w = link.w == null ? 1 : link.w;
              if (w < bestW) { bestW = w; bestE = { eid: link.eid, u: u, v: link.to, w: w }; }
            }
          }
          if (!bestE) continue;
          chosen.push(bestE);
          b.step('块 **[' + members.join(',') + ']** 的最短出边是 **(' + bestE.u + ',' + bestE.v + ') w=' + bestW + '**。', [
            C.edge(bestE.eid, 'frontier'), C.pulse(bestE.eid, { color: '#F59E0B' }),
            C.state(bestE.u, 'active'), C.state(bestE.v, 'active'),
            C.q('best', 'push', [{ key: bestE.eid, label: '[' + members[0] + '…]', meta: bestE.u + '—' + bestE.v + ' w=' + bestW }])
          ], { line: 4 });
        }

        let merged = 0;
        for (let i = 0; i < chosen.length; i++) {
          const ch = chosen[i];
          if (!dsu.union(ch.u, ch.v)) continue;
          merged++;
          total += ch.w; edgesUsed++;
          C.edge(ch.eid, 'visited');
        }
        b.step('把本轮选出的 ' + chosen.length + ' 条边**一起加入**（实际生效 ' + merged + ' 条，重复的自动去重）。' +
          '累计总权 ' + total + '。块数从 ' + roots.length + ' 降到了 ' + Object.keys((function () {
            const m = {}; g.nodes.forEach(n => m[dsu.find(n.id)] = 1); return m;
          })()).length + '。', [
          C.dsu('dsu', dsu.parent, dsu.rank)
        ], { line: 5, milestone: '第 ' + round + ' 轮合并，总权 ' + total });
      }

      b.step('**最小生成树完成**：' + edgesUsed + ' 条边，总权 **' + total + '**。' +
        '对比一下：Prim 是「一个块慢慢长大」，Kruskal 是「全局按权贪心」，Borůvka 是「所有块同时长大」。' +
        '三者都基于割性质，所以结果（权值和）必然一致。', [], { line: 6, milestone: 'MST 总权 ' + total, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 4. 次小生成树
   * ============================================================ */
  TGV.register({
    id: 'second_mst', name: '次小生成树（换一条边，增量最小）', category: '图 · 最小生成树',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'kruskal',
    panels: [
      { id: 'try', type: 'list', title: '逐条尝试非树边' },
      { id: 'watch', type: 'table', title: '路径最大边 / 增量', columns: [{ key: 'mx', label: '树上最大边' }, { key: 'd', label: '增量' }] }
    ],
    pseudocode: [
      '// 次小生成树 = MST 换掉一条边，代价增加最少',
      '先用 Kruskal 求出 MST，记总权 W',
      'for each 非树边 (u, v, w):',
      '    在 MST 上找 u→v 路径上权最大的边 e_max',
      '    换边代价 delta = w - weight(e_max)',
      '    若 delta > 0: 候选答案 = W + delta',
      '取所有 delta 的最小值',
      '// delta = 0 说明存在等权替代方案，次小生成树与 MST 同权'
    ],
    presets: [
      { id: 'std', label: '7 点图 · 枚举换边', desc: '看哪条非树边能带来最小增量', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, false, MST_NODES, MST_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const dsu = makeDsu(g.nodes.map(n => n.id));
      const sorted = g.edges.slice().sort((x, y) => wOf(x) - wOf(y) || String(x.id).localeCompare(String(y.id)));
      const treeSet = {};
      let total = 0, cnt = 0;

      b.step('次小生成树的经典结论：**把 MST 换掉一条边，就能得到次小生成树**。' +
        '做法是枚举每条非树边 (u,v,w)，把它塞进树里会形成一个环，环上除了它之外权最大的那条边就是该被换掉的（记为 e_max），代价增加 `w - w(e_max)`。', [], { line: 1 });
      b.step('先跑 Kruskal 求 MST。', [], { line: 2 });

      for (let i = 0; i < sorted.length && cnt < g.nodes.length - 1; i++) {
        const e = sorted[i];
        if (dsu.find(e.source) === dsu.find(e.target)) continue;
        dsu.union(e.source, e.target);
        treeSet[e.id] = true;
        total += wOf(e); cnt++;
        C.edge(e.id, 'visited');
      }
      b.step('MST 共 ' + cnt + ' 条边，总权 **W = ' + total + '**（橙色实线）。接下来逐条尝试非树边。',
        g.edges.filter(e => treeSet[e.id]).map(e => C.edge(e.id, 'path')), { line: 2, milestone: 'MST W = ' + total });

      // 建树邻接
      const tadj = {};
      g.nodes.forEach(n => tadj[n.id] = []);
      g.edges.forEach(e => {
        if (!treeSet[e.id]) return;
        tadj[e.source].push({ to: e.target, w: wOf(e), eid: e.id });
        tadj[e.target].push({ to: e.source, w: wOf(e), eid: e.id });
      });
      const pathMax = (a, c) => {
        const prev = {}, pw = {}, pe = {};
        prev[a] = '-'; pw[a] = -Infinity;
        const q = [a];
        while (q.length) {
          const u = q.shift();
          if (u === c) break;
          for (let i = 0; i < tadj[u].length; i++) {
            const l = tadj[u][i];
            if (prev[l.to] !== undefined) continue;
            prev[l.to] = u; pw[l.to] = l.w; pe[l.to] = l.eid;
            q.push(l.to);
          }
        }
        if (prev[c] === undefined) return null;
        let mx = -Infinity, mxEid = null, cur = c;
        const nodes = [];
        while (cur !== a) {
          nodes.unshift(cur);
          if (pw[cur] > mx) { mx = pw[cur]; mxEid = pe[cur]; }
          cur = prev[cur];
        }
        nodes.unshift(a);
        return { mx: mx, eid: mxEid, nodes: nodes };
      };

      let bestDelta = Infinity, bestEdge = null, bestInfo = null;
      const nonTree = g.edges.filter(e => !treeSet[e.id]);
      for (let i = 0; i < nonTree.length; i++) {
        const e = nonTree[i];
        const w = wOf(e);
        const info = pathMax(e.source, e.target);
        if (!info) continue;
        const delta = w - info.mx;
        b.step('非树边 **(' + e.source + ',' + e.target + ') w=' + w + '**：它在树上对应的路径是 ' + info.nodes.join(' → ') +
          '，路径上最大边权 **' + info.mx + '** → 换边增量 `' + w + ' - ' + info.mx + ' = ' + delta + '`。' +
          (delta < bestDelta ? '**目前最优！**' : ''), [
          C.edge(e.id, 'active'), C.pulse(e.id, { color: '#4F46E5' }),
          C.arc('try', e.source, e.target, { color: '#4F46E5', label: 'Δ=' + delta, width: 1.8 }),
          C.clearHull('path'), C.hull('path', info.nodes, '#4F46E5', '环上路径'),
          C.table('watch', e.id, 'mx', info.mx, true), C.table('watch', e.id, 'd', delta, true),
          C.q('try', 'push', [{ key: e.id, label: e.source + '—' + e.target, meta: 'Δ=' + delta }])
        ], { line: 5, milestone: e.source + '-' + e.target + '：Δ=' + delta });
        if (delta > 0 && delta < bestDelta) { bestDelta = delta; bestEdge = e; bestInfo = info; }
      }

      if (bestEdge) {
        const cmds = [
          C.edge(bestEdge.id, 'path'), C.pulse(bestEdge.id, { color: '#D97706' }),
          C.edge(bestInfo.eid, 'conflict'),
          C.clearArc('try'), C.clearHull('path')
        ];
        bestInfo.nodes.forEach(n => cmds.push(C.state(n, 'path')));
        b.step('最优换法：**去掉 (' + bestEdge.source + ',' + bestEdge.target + ') 路径上的最大边 ' +
          (g.edges.find(x => x.id === bestInfo.eid) ? '(' + g.edges.find(x => x.id === bestInfo.eid).source + ',' + g.edges.find(x => x.id === bestInfo.eid).target + ')' : '') +
          '（权 ' + bestInfo.mx + '），换成非树边 (' + bestEdge.source + ',' + bestEdge.target + ')（权 ' + wOf(bestEdge) + '）**。' +
          '次小生成树总权 = ' + total + ' + ' + bestDelta + ' = **' + (total + bestDelta) + '**。' +
          '由于权值互异，这个增量一定 > 0；如果存在等权边，会出现 Δ = 0，说明次小生成树与 MST 同权（不唯一）。', cmds,
          { line: 7, milestone: '次小 MST = ' + (total + bestDelta), stage: true });
      } else {
        b.step('所有非树边的增量都 ≤ 0 ⇒ 不存在不同的生成树（图本身就是一棵树）。', [], { line: 7, milestone: '唯一生成树' });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 5. Kahn 拓扑排序
   * ============================================================ */
  const DAG_NODES = [['A', 110, 170], ['B', 300, 100], ['C', 300, 280], ['D', 490, 170], ['E', 490, 330], ['F', 670, 210], ['G', 680, 400]];
  const DAG_EDGES = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F'], ['E', 'G'], ['F', 'G']];

  TGV.register({
    id: 'topo_kahn', name: '拓扑排序 · Kahn 算法（入度表 + 队列）', category: '图 · 有向无环图',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'topo_dfs',
    panels: [
      { id: 'q', type: 'queue', title: '入度为 0 的队列' },
      { id: 'out', type: 'list', title: '拓扑序（输出）' }
    ],
    pseudocode: [
      '// 统计每个点的入度；入度为 0 的点没有任何前驱，可以立刻输出',
      'for each 边 (u, v): indeg[v]++',
      '把 indeg == 0 的点全部入队',
      'while 队列非空:',
      '    u = 队首出队，输出到拓扑序',
      '    for each 出边 (u, v):',
      '        indeg[v]--',
      '        if indeg[v] == 0: v 入队',
      '// 若输出的点数 < V ⇒ 图中有环，拓扑序不存在'
    ],
    presets: [
      { id: 'std', label: '标准 DAG（7 点 9 边）', desc: '入度归零的时刻就是它"可以出场"的时刻', data: () => ({}) },
      { id: 'cycle', label: '含环（拓扑序不存在）', desc: 'D→E→F→D 成环，最后会有点剩在队列外', data: () => ({ cycle: true }) }
    ],
    run(input) {
      const g = mk(input, true, DAG_NODES, DAG_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const indeg = {}, st = {};
      g.nodes.forEach(n => { indeg[n.id] = 0; st[n.id] = '未入队'; });
      g.edges.forEach(e => { indeg[e.target] = (indeg[e.target] || 0) + 1; });
      const q = [];
      const order = [];
      let heat = null;

      b.step('拓扑排序要回答的问题是：**把任务排成一个序列，使每个任务都排在它所有前置任务之后**。' +
        'Kahn 算法的思路非常直白：入度为 0 的点 = 没有任何未完成的前置任务 = 现在就可以执行。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }, { name: 'E', value: g.edges.length }] });

      const initCmds = [];
      g.nodes.forEach(n => {
        initCmds.push(C.badge(n.id, 'in', indeg[n.id]));
      });
      b.step('统计入度：每个点被多少条边指向。', [], { line: 2 });

      g.nodes.forEach(n => {
        if (indeg[n.id] === 0) {
          q.push(n.id);
          st[n.id] = '在队列';
        }
      });
      const zeroCmds = [];
      q.forEach(id => {
        zeroCmds.push(C.state(id, 'frontier'));
        zeroCmds.push(C.q('q', 'push', [{ key: id, label: id, meta: 'in=0' }]));
      });
      b.step('入度为 0 的点有 **' + q.join('、') + '** —— 它们没有前置任务，全部入队。', initCmds.concat(zeroCmds),
        { line: 3, milestone: '初始队列 [' + q.join(',') + ']' });

      let guard = 0;
      while (q.length && guard++ < 100) {
        const u = q.shift();
        st[u] = '已输出';
        order.push(u);
        if (heat) { C.edge(heat, 'default'); heat = null; }
        b.step('队首 **' + u + '** 出队 → 输出到拓扑序第 ' + order.length + ' 位。它的所有后继从此少了一个前置。', [
          C.q('q', 'pop_front'), C.state(u, 'visited'),
          C.badge(u, 'ord', order.length, true),
          C.q('out', 'push', [{ key: u, label: order.length + '. ' + u }])
        ], { line: 5, vars: [{ name: 'u', value: u }] });

        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to;
          indeg[v]--;
          heat = link.eid;
          const cmds = [
            C.edge(link.eid, 'visited'), C.pulse(link.eid, { color: '#16A34A' }),
            C.badge(v, 'in', indeg[v], true)
          ];
          if (indeg[v] === 0) {
            q.push(v);
            st[v] = '在队列';
            cmds.push(C.state(v, 'frontier'));
            cmds.push(C.q('q', 'push', [{ key: v, label: v, meta: 'in=0' }]));
            b.step('**' + u + '→' + v + '** 的入度减到 **0** → ' + v + ' 的所有前置都完成了，**入队**！', cmds,
              { line: 8, milestone: v + ' 入度归零，入队' });
          } else {
            b.step('**' + u + '→' + v + '**：' + v + ' 的入度从 ' + (indeg[v] + 1) + ' 减到 **' + indeg[v] + '**，还有前置没完成，继续等。', cmds,
              { line: 7 });
          }
        }
      }

      if (order.length === g.nodes.length) {
        b.step('所有点都被输出，拓扑序为 **' + order.join(' → ') + '**。' +
          'Kahn 本质是 **BFS 的一个变种**：把「入度为 0」当作「可以访问」。也因此它天然能检测环 —— 如果有点始终没能入队，说明它被环卡住了。' +
          '（提示：队列换成优先队列，就得到"字典序最小"的拓扑序。）', [], { line: 9, milestone: '拓扑序完成', stage: true });
      } else {
        const left = g.nodes.filter(n => order.indexOf(n.id) < 0);
        const cmds = [C.hull('cyc', left.map(n => n.id), '#DC2626', '卡住的点')];
        left.forEach(n => cmds.push(C.state(n.id, 'conflict')));
        b.step('队列空了，却只输出了 **' + order.length + ' / ' + g.nodes.length + '** 个点。剩下的 **' + left.map(n => n.id).join('、') +
          '** 互相牵制，入度永远降不到 0 —— **图中有环，拓扑序不存在**。', cmds,
          { line: 9, milestone: '检测到环：拓扑序不存在', stage: true });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 6. DFS 拓扑排序
   * ============================================================ */
  TGV.register({
    id: 'topo_dfs', name: '拓扑排序 · DFS 逆后序（时间戳）', category: '图 · 有向无环图',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'topo_kahn',
    panels: [
      { id: 'stk', type: 'stack', title: '递归栈' },
      { id: 'out', type: 'list', title: '逆后序（头插）' }
    ],
    pseudocode: [
      '// 结论：DFS 的"后序"反过来，就是一个拓扑序',
      'timer = 0；ans = 空',
      'dfs(u):',
      '    color[u] = GRAY; d[u] = ++timer',
      '    for each 出边 (u, v):',
      '        if color[v] == GRAY: 发现后向边 ⇒ 有环，失败',
      '        if color[v] == WHITE: dfs(v)',
      '    color[u] = BLACK; f[u] = ++timer',
      '    ans.push_front(u)        // 完成时刻晚的排在前面',
      'for each 未访问点: dfs(it)',
      '// 为什么对？u 完成时，它的所有后继都已完成 ⇒ 后继在 ans 里更靠前'
    ],
    presets: [
      { id: 'std', label: '标准 DAG · 从 A 出发', desc: '注意完成时间 f 越大的点排在越前面', data: () => ({}) },
      { id: 'multi', label: '多入口（不是所有点都从 A 可达）', desc: '需要外层循环补刀，DFS 森林', data: () => ({ multi: true }) }
    ],
    run(input) {
      const g = mk(input, true, DAG_NODES, DAG_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const color = {}, d = {}, f = {};
      g.nodes.forEach(n => { color[n.id] = 'white'; d[n.id] = '-'; f[n.id] = '-'; });
      let timer = 0, failed = false;
      const ans = [];

      b.step('DFS 拓扑排序只用一句话就能说清：**后序的逆序就是拓扑序**。' +
        '直觉是：u 的后序位置在它的所有后继之后，所以把后序翻过来，u 就排到了所有后继之前 —— 正好满足拓扑要求。' +
        '相比 Kahn，它不需要统计入度，但**必须额外判环**（灰色后继 = 后向边 = 有环）。', [], { line: 1 });

      const dfs = (u, depth) => {
        color[u] = 'gray';
        d[u] = ++timer;
        b.step('进入 **' + u + '**：染灰，`d[' + u + '] = ' + d[u] + '`，压入递归栈。', [
          C.push('stk', { label: 'dfs(' + u + ')', meta: 'd=' + d[u] }),
          C.state(u, 'active'), C.badge(u, 'd', d[u], true)
        ], { line: 4, vars: [{ name: 'u', value: u }] });

        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to;
          if (color[v] === 'gray') {
            failed = true;
            b.step('出边 ' + u + '→' + v + '：' + v + ' 还是**灰色**（正在递归栈里，是 ' + u + ' 的祖先）→ 这是**后向边**，' +
              '意味着存在环！拓扑排序无解。', [
              C.edge(link.eid, 'conflict'), C.state(u, 'conflict'), C.state(v, 'conflict'),
              C.pulse(link.eid, { color: '#DC2626' })
            ], { line: 6, milestone: '发现环：' + u + '→' + v, stage: true });
            return false;
          }
          if (color[v] === 'white') {
            b.step('出边 ' + u + '→' + v + '：' + v + ' 未访问 → 深入。', [
              C.edge(link.eid, 'visited'), C.state(v, 'frontier')
            ], { line: 7 });
            if (!dfs(v, depth + 1)) return false;
          } else {
            b.step('出边 ' + u + '→' + v + '：' + v + ' 已变黑（已完成），跳过这条横叉/前向边。', [
              C.edge(link.eid, 'ghost')
            ], { line: 7 });
          }
        }

        color[u] = 'black';
        f[u] = ++timer;
        ans.unshift(u);
        b.step('**' + u + ' 的所有后继都已完成**：染黑，`f[' + u + '] = ' + f[u] + '`，**头插**到答案序列 —— 现在它排在了所有后继之前。', [
          C.pop('stk', 1), C.state(u, 'visited'),
          C.badge(u, 'f', f[u], true),
          C.q('out', 'push_front', [{ key: u, label: u, meta: 'f=' + f[u] }])
        ], { line: 9, milestone: u + ' 完成（f=' + f[u] + '）' });
        return true;
      };

      for (let i = 0; i < g.nodes.length; i++) {
        const n = g.nodes[i];
        if (color[n.id] !== 'white') continue;
        if (i > 0) b.step('外层循环发现 **' + n.id + '** 还是白色（从 ' + g.nodes[0].id + ' 不可达）→ 从它重新发起 DFS。', [], { line: 10 });
        if (!dfs(n.id, 0)) break;
      }

      if (!failed) {
        b.step('DFS 结束，答案序列 **' + ans.join(' → ') + '**。验证一下：每条边 u→v 的完成时间都满足 `f[u] > f[v]`，' +
          '所以翻过来的后序里 u 一定在 v 前面 —— 这就是拓扑序。', [], { line: 11, milestone: '拓扑序完成', stage: true });
      } else {
        b.step('因为发现了后向边，DFS 提前终止 —— **有环的图不存在拓扑序**。这也给了我们一个副产品：**DFS 判环只需要看有没有灰色后继**。', [],
          { line: 6, milestone: '有环，无拓扑序', stage: true });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 7. AOE 关键路径
   * ============================================================ */
  const AOE_NODES = [['V1', 90, 300], ['V2', 280, 140], ['V3', 280, 460], ['V4', 480, 110], ['V5', 480, 420], ['V6', 690, 290]];
  const AOE_EDGES = [['V1', 'V2', 3], ['V1', 'V3', 2], ['V2', 'V4', 2], ['V2', 'V5', 4], ['V3', 'V5', 3], ['V4', 'V6', 3], ['V5', 'V6', 2]];

  TGV.register({
    id: 'aoe_cpm', name: 'AOE 网络 · 关键路径（ve / vl / 松弛）', category: '图 · 有向无环图',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'topo_kahn',
    panels: [
      { id: 'watch', type: 'table', title: '事件时间', columns: [{ key: 've', label: 've 最早' }, { key: 'vl', label: 'vl 最迟' }, { key: 'slack', label: '松弛' }] },
      { id: 'crit', type: 'list', title: '活动余量（ee/el）' }
    ],
    pseudocode: [
      '// 事件 v 的最早发生时间 ve：正向拓扑递推，取所有前驱的最大值',
      've[s] = 0；ve[v] = max(ve[u] + w(u,v))',
      '// 事件 v 的最迟发生时间 vl：反向拓扑递推，取所有后继的最小值',
      'vl[t] = ve[t]；vl[u] = min(vl[v] - w(u,v))',
      '// 活动 a=(u,v) 的余量：ee = ve[u]，el = vl[v] - w',
      '若 ee == el 则该活动没有余量 ⇒ 关键活动',
      '// 关键活动连成的路径就是关键路径，长度 = 最短工期'
    ],
    presets: [
      { id: 'std', label: '7 事件 7 活动 · 一条关键路径', desc: '关键活动零余量，动一天就延期一天', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, true, AOE_NODES, AOE_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const ids = g.nodes.map(n => n.id);
      const ve = {}, vl = {}, indeg = {}, outdeg = {};
      ids.forEach(id => { ve[id] = 0; vl[id] = Infinity; indeg[id] = 0; outdeg[id] = 0; });
      g.edges.forEach(e => { indeg[e.target]++; outdeg[e.source]++; });

      b.step('AOE（Activity On Edge）网络里，**边是活动、点是事件**。边权是活动持续时间。' +
        '要回答的问题是：整个工程**最短多久能完工**、**哪些活动一天都不能拖**。答案就是**关键路径**。', [],
        { line: 1, vars: [{ name: '事件数', value: ids.length }, { name: '活动数', value: g.edges.length }] });

      // 拓扑序
      const indeg2 = Object.assign({}, indeg);
      const q = ids.filter(id => indeg2[id] === 0);
      const topo = [];
      while (q.length) {
        const u = q.shift();
        topo.push(u);
        g.adj[u].forEach(l => { if (--indeg2[l.to] === 0) q.push(l.to); });
      }
      b.step('先用拓扑排序定好递推顺序：**' + topo.join(' → ') + '**。所有 DP 都必须按这个顺序做，才能保证"用到的值已经算好"。', [
        C.badge(topo[0], 'ord', 1, true)
      ], { line: 1, milestone: '拓扑序就绪' });

      // 正推 ve
      for (let i = 0; i < topo.length; i++) {
        const u = topo[i];
        const cmds = [C.table('watch', u, 've', ve[u], true), C.badge(u, 've', ve[u], true), C.state(u, 'visited')];
        b.step('正推事件 **' + u + '** 的最早发生时间 `ve[' + u + '] = ' + ve[u] +
          '`（它的所有前驱都已经算完，取最大值）。', cmds, { line: 2, vars: [{ name: 've', value: ve[u] }] });
        for (let j = 0; j < g.adj[u].length; j++) {
          const l = g.adj[u][j];
          const w = l.w == null ? 1 : l.w;
          if (ve[u] + w > ve[l.to]) {
            ve[l.to] = ve[u] + w;
            b.step('活动 ' + u + '→' + l.to + '（工期 ' + w + '）：`ve[' + u + '] + ' + w + ' = ' + (ve[u] + w) + '` 是目前 ' + l.to + ' 的最大值 → 更新 `ve[' + l.to + '] = ' + ve[l.to] + '`。', [
              C.edge(l.eid, 'active'), C.pulse(l.eid, { color: '#4F46E5' }),
              C.badge(l.to, 've', ve[l.to], true),
              C.table('watch', l.to, 've', ve[l.to], true)
            ], { line: 2 });
          } else {
            b.step('活动 ' + u + '→' + l.to + '（工期 ' + w + '）：`' + ve[u] + ' + ' + w + ' = ' + (ve[u] + w) + '` 不超过已知的 ' + ve[l.to] + ' → 不更新（' + l.to + ' 得等其他前驱）。', [
              C.edge(l.eid, 'ghost')
            ], { line: 2 });
          }
        }
      }

      const last = topo[topo.length - 1];
      vl[last] = ve[last];
      b.step('**反推最迟时间**：终点事件的最迟时间等于最早时间 `vl[' + last + '] = ve[' + last + '] = ' + ve[last] + '`，' +
        '然后倒着往前推。`vl[u] = min(vl[v] - w)` 的含义是：u 最晚必须在"所有后继的最迟时间减去各自工期"之前发生，否则后继就要延期。', [
        C.table('watch', last, 'vl', vl[last], true), C.badge(last, 'vl', vl[last], true),
        C.state(last, 'path')
      ], { line: 4, milestone: 'vl 反推起点' });

      for (let i = topo.length - 2; i >= 0; i--) {
        const u = topo[i];
        for (let j = 0; j < g.adj[u].length; j++) {
          const l = g.adj[u][j];
          const w = l.w == null ? 1 : l.w;
          if (vl[l.to] - w < vl[u]) vl[u] = vl[l.to] - w;
        }
        b.step('反推 **' + u + '**：取所有后继里 `vl[v] - w` 的最小值 → `vl[' + u + '] = ' + vl[u] + '`，松弛 `vl - ve = ' + (vl[u] - ve[u]) + '`。', [
          C.table('watch', u, 'vl', vl[u], true),
          C.table('watch', u, 'slack', vl[u] - ve[u], true),
          C.badge(u, 'vl', vl[u], true)
        ], { line: 4, vars: [{ name: 'vl', value: vl[u] }] });
      }

      // 活动余量
      const crit = [];
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        const w = wOf(e);
        const ee = ve[e.source], el = vl[e.target] - w;
        const isCrit = ee === el;
        if (isCrit) crit.push(e);
        b.step('活动 **' + e.source + '→' + e.target + '**（工期 ' + w + '）：最早开始 `ee = ve[' + e.source + '] = ' + ee + '`，' +
          '最迟开始 `el = vl[' + e.target + '] - ' + w + ' = ' + el + '` → 余量 **' + (el - ee) + '**。' +
          (isCrit ? '**零余量，是关键活动！**' : '有余量，可以拖。'), [
          C.edge(e.id, isCrit ? 'conflict' : 'ghost'),
          isCrit ? C.pulse(e.id, { color: '#DC2626' }) : C.edge(e.id, 'ghost'),
          C.q('crit', 'push', [{ key: e.id, label: e.source + '→' + e.target, meta: 'ee=' + ee + ' el=' + el + (isCrit ? ' 关键' : ' 余' + (el - ee)) }])
        ],
          { line: 6, milestone: isCrit ? '关键活动 ' + e.source + '→' + e.target : null });
      }

      const cmds = [];
      crit.forEach(e => { cmds.push(C.edge(e.id, 'path')); cmds.push(C.pulse(e.id, { color: '#D97706' })); cmds.push(C.state(e.source, 'path')); });
      cmds.push(C.state(crit.length ? crit[crit.length - 1].target : last, 'path'));
      cmds.push(C.hull('cp', crit.map(e => e.source).concat([last]), '#D97706', '关键路径'));
      b.step('**关键路径 = ' + crit.map(e => e.source).concat([last]).join(' → ') + '**，总工期 **' + ve[last] + '**。' +
        '这条路径上每个活动都是零余量的：任何一个拖 1 天，整个工程就拖 1 天。' +
        '工程管理的含义很直接 —— **要压缩工期，只能砸钱在关键活动上**；压缩非关键活动纯属浪费。', cmds,
        { line: 7, milestone: '关键路径长度 ' + ve[last], stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

})();
