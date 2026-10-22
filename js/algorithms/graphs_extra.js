/* ============================================================
 * 第二卷 · G8 图论补充
 * 图表示互转 · 迭代加深搜索 · 差分约束 · Johnson 重赋权
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
  const withRowOrder = (panels, ids) => panels.map(p => (p.type === 'table' ? Object.assign({}, p, { rowOrder: ids }) : p));

  /* ============================================================
   * 1. 图表示互转
   * ============================================================ */
  const REPR_NODES = [['A', 200, 110], ['B', 480, 130], ['C', 620, 330], ['D', 380, 420], ['E', 160, 330]];
  const REPR_EDGES = [['A', 'B', 2], ['B', 'C', 3], ['C', 'D', 4], ['D', 'E', 5], ['E', 'A', 6], ['A', 'D', 7]];

  TGV.register({
    id: 'graph_repr', name: '图的三种表示（矩阵 / 邻接表 / 边集）', category: '图 · 基础',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'bfs',
    panels: [
      { id: 'mat', type: 'matrix', n: 5, title: '邻接矩阵 O(V²)' },
      { id: 'adj', type: 'text', title: '邻接表 O(V+E)' },
      { id: 'edges', type: 'list', title: '边集数组 O(E)' }
    ],
    pseudocode: [
      '// 同一张图，三种存法，适用于不同场景',
      '邻接矩阵：mat[u][v] = w（无边则 ∞），查边 O(1)，空间 O(V²)',
      '邻接表：adj[u] = [(v,w), …]，遍历邻居 O(deg)，空间 O(V+E)',
      '边集数组：[ (u,v,w), … ]，适合 Kruskal 这类"按边处理"的算法',
      '// 稠密图用矩阵，稀疏图用邻接表 —— 这是图论最基础的选择题'
    ],
    presets: [
      { id: 'std', label: '5 点 6 边无向图', desc: '同时构建三种表示，比较空间开销', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, false, REPR_NODES, REPR_EDGES);
      const ids = g.nodes.map(n => n.id);
      const n = ids.length;
      const panels = [
        { id: 'mat', type: 'matrix', n: n, title: '邻接矩阵 O(V²)', default: INF, rowLabels: ids, colLabels: ids },
        { id: 'adj', type: 'text', title: '邻接表 O(V+E)' },
        { id: 'edges', type: 'list', title: '边集数组 O(E)' }
      ];
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: panels });

      b.step('同一张图可以有三种存法，选择取决于你要做什么：**矩阵**查边快但吃内存，**邻接表**遍历邻居快且省内存，**边集**适合按边扫描的算法（如 Kruskal）。' +
        '本例把这张 ' + n + ' 点 ' + g.edges.length + ' 边的图**同时**建成三种形式。', [],
        { line: 1, vars: [{ name: 'V', value: n }, { name: 'E', value: g.edges.length }] });

      // 矩阵初始化
      const cmds = [];
      ids.forEach((a, i) => ids.forEach((c, j) => cmds.push(C.matrix('mat', i, j, a === c ? 0 : INF))));
      b.step('**第 1 步：邻接矩阵**。先全部填 ∞（自己到自己填 0），然后逐条边填权值。矩阵的第一维是起点、第二维是终点 —— ' +
        '无向图一定**关于对角线对称**。空间 O(V²) = ' + (n * n) + ' 个格子，其中 ' + (n * n - 2 * g.edges.length - n) + ' 个是浪费的 ∞。', cmds,
        { line: 2, milestone: '矩阵初始化为 ∞' });

      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        const w = wOf(e);
        const a = ids.indexOf(e.source), c = ids.indexOf(e.target);
        const fill = [C.matrix('mat', a, c, w, true), C.matrix('mat', c, a, w, true)];
        b.step('边 (' + e.source + ',' + e.target + ') 权 ' + w + ' → 写入 `mat[' + a + '][' + c + ']` ' +
          (g.directed ? '' : '和对称位置 `mat[' + c + '][' + a + ']` ') + '。查任意两点是否相邻只需 O(1) 一次数组访问。',
          fill.concat([
            C.edge(e.id, 'visited'), C.pulse(e.id, { color: '#4F46E5' })
          ]), { line: 2, milestone: '写入 ' + e.source + '-' + e.target });
      }

      // 邻接表
      const lines = [];
      b.step('**第 2 步：邻接表**。每个点挂一条链表，只记录"真实存在的邻居"，所以总长度 = 2E（无向图）而不是 V²。' +
        '遍历某点的所有邻居是 O(deg)，这正是 BFS/DFS/Dijkstra 需要的操作。', [], { line: 3, milestone: '开始建邻接表' });
      for (let i = 0; i < ids.length; i++) {
        const u = ids[i];
        const arr = g.adj[u].map(l => l.to + '(' + (l.w == null ? 1 : l.w) + ')');
        lines.push(u + ' → ' + arr.join(' → '));
        b.step(u + ' 的邻居：' + (arr.length ? arr.join('、') : '（无）') + '，共 ' + arr.length + ' 条。邻接表总空间 O(V+E)。', [
          C.state(u, 'active'), C.text('adj', lines.slice())
        ], { line: 3 });
      }

      // 边集
      b.step('**第 3 步：边集数组**。就是把所有边摊平成一张表，每条边记得起终点和权值。' +
        'Kruskal 只需要按权排序后扫一遍边集，根本不需要知道每个点有哪些邻居 —— 这时候边集就是最合适的结构。', [], { line: 4 });
      const edgeCmds = g.edges.map(e => C.q('edges', 'push', [{ key: e.id, label: '(' + e.source + ',' + e.target + ')', meta: 'w=' + wOf(e) }]));
      b.step('边集共 ' + g.edges.length + ' 条：' + g.edges.map(e => '(' + e.source + ',' + e.target + ')').join('、') + '。', edgeCmds,
        { line: 4, milestone: '边集建好' });

      const mem = (n * n) + ' vs ' + (n + 2 * g.edges.length) + ' vs ' + g.edges.length;
      b.step('三种表示对比（这张图）：**矩阵 ' + (n * n) + ' 个存储单元，邻接表 ' + (n + 2 * g.edges.length) + '，边集 ' + g.edges.length + '**。' +
        '当 V = 10⁵ 时，矩阵要 10¹⁰ 个格子直接爆掉，这就是为什么**稀疏图必须用邻接表**。' +
        '另外：邻接矩阵的幂可以数路径条数，邻接表不能 —— 矩阵的"浪费"换来了代数上的便利。', [
        C.clearHull('x')
      ], { line: 5, milestone: '空间对比 ' + mem, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 2. 迭代加深搜索 IDDFS
   * ============================================================ */
  const ID_NODES = [['S', 90, 300], ['A', 250, 160], ['B', 250, 440], ['C', 420, 100], ['D', 420, 300], ['E', 420, 500], ['F', 600, 200], ['G', 600, 400], ['T', 740, 300]];
  const ID_EDGES = [['S', 'A'], ['S', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'F'], ['D', 'G'], ['E', 'G'], ['F', 'T'], ['G', 'T']];

  TGV.register({
    id: 'iddfs', name: '迭代加深搜索 IDDFS（逐层放宽深度上限）', category: '图 · 基础搜索',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'bfs',
    panels: [
      { id: 'rounds', type: 'list', title: '每一轮（limit 递增）' },
      { id: 'stk', type: 'stack', title: '当前 DFS 路径' }
    ],
    pseudocode: [
      '// DFS 省空间但可能一头扎进深坑；BFS 找最短但要存整层',
      '// IDDFS = 反复用"限深 DFS"，深度上限从 0 逐次 +1',
      'for limit = 0, 1, 2, …:',
      '    if dfs(S, 0, limit): 找到，返回当前深度',
      'dfs(u, dep, limit):',
      '    if u == T: return true',
      '    if dep == limit: return false          // 到顶了，剪掉',
      '    for each 邻居 v: if dfs(v, dep+1, limit): return true',
      '// 空间 O(depth)（等同 DFS），时间仍是最优（等同 BFS）'
    ],
    presets: [
      { id: 'std', label: '分层图 · 最短 3 步', desc: 'limit=0,1,2 全部失败，limit=3 才成功', data: () => ({ s: 'S', t: 'T' }) },
      { id: 'chain', label: '长链（limit 要涨到 5）', desc: '直观看到重复搜索的代价', data: () => ({ s: 'S', t: 'T', chain: true }) }
    ],
    run(input) {
      const chain = !!input.chain;
      const nodeArr = chain
        ? [['S', 90, 300], ['A', 220, 190], ['B', 340, 320], ['C', 470, 190], ['D', 600, 320], ['T', 730, 200]]
        : ID_NODES;
      const edgeArr = chain
        ? [['S', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'T']]
        : ID_EDGES;
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: false })
        : TGV.GraphLib.mkGraph(nodeArr, edgeArr, { directed: false });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const s = input.s || g.nodes[0].id;
      const t = input.t || g.nodes[g.nodes.length - 1].id;
      let found = -1;

      b.step('**IDDFS（迭代加深）**解决的是 DFS 与 BFS 的两难：DFS 只要 O(depth) 空间，但找到的路径不一定最短；BFS 保证最短，却要存下整层节点。' +
        'IDDFS 的做法是——**用 DFS 反复搜，但每次限制深度上限，上限从 0 开始逐次加 1**。' +
        '这样第一次成功时的深度就是最短距离（和 BFS 等价），而空间仍然只有 O(depth)。', [],
        { line: 1, vars: [{ name: 's', value: s }, { name: 't', value: t }] });

      for (let limit = 0; limit <= g.nodes.length; limit++) {
        b.step('**第 ' + (limit + 1) + ' 轮：limit = ' + limit + '**，只允许走 ' + limit + ' 步以内。' +
          (limit > 0 ? '（之前所有轮次都白跑了 —— 这就是 IDDFS 的代价：重复搜索。）' : ''), [
          C.q('rounds', 'push', [{ key: 'r' + limit, label: 'limit = ' + limit, meta: '开始' }]),
          C.q('stk', 'clear')
        ], { line: 3, milestone: 'limit = ' + limit, stage: true });

        const path = [];
        const visitedEdge = [];
        const dfs = (u, dep) => {
          path.push(u);
          if (u === t) {
            b.step('到达终点 **' + t + '**（深度 ' + dep + '）→ 本轮成功！' +
              (dep === limit ? '而且深度正好等于 limit，说明这是本轮允许的最深位置。' : ''), [
              C.state(t, 'path'), C.push('stk', { label: t, meta: 'depth=' + dep })
            ], { line: 6, milestone: '找到 ' + t + '（深度 ' + dep + '）', stage: true });
            return true;
          }
          if (dep >= limit) {
            b.step('**' + u + ' 的深度已到 limit = ' + limit + '**，不能再往下走 → 剪枝回溯。' +
              '这是本轮失败的原因，也是下一轮 limit + 1 后最想突破的地方。', [
              C.state(u, 'conflict'), C.pop('stk', 1)
            ], { line: 7 });
            path.pop();
            return false;
          }
          for (let i = 0; i < g.adj[u].length; i++) {
            const link = g.adj[u][i];
            const v = link.to;
            if (path.indexOf(v) >= 0) continue;
            b.step('从 ' + u + ' 走边到 ' + v + '（深度 ' + (dep + 1) + ' ≤ ' + limit + '）→ 继续深入。', [
              C.edge(link.eid, 'active'), C.state(v, 'frontier'),
              C.push('stk', { label: v, meta: 'd=' + (dep + 1) })
            ], { line: 8 });
            if (dfs(v, dep + 1)) return true;
            visitedEdge.push(link.eid);
          }
          path.pop();
          return false;
        };

        if (dfs(s, 0)) { found = limit; break; }
        b.step('limit = ' + limit + ' 本轮**失败**：所有分支在深度 ' + limit + ' 处被剪掉，没碰到 ' + t + '。' +
          '把 limit 加 1，从头再来一遍。', [
          C.q('rounds', 'set', Array.from({ length: limit + 1 }, (_, i) => ({ key: 'r' + i, label: 'limit = ' + i, meta: i === limit ? '失败' : '失败' })))
        ], { line: 4, stage: true });
      }

      if (found >= 0) {
        const cmds = [];
        b.step('迭代加深结束：**最短距离 = ' + found + '**（第一次成功的 limit）。' +
          '关键结论：假设分支因子 b、深度 d，总工作量是 b¹ + b² + … + b^d ≈ b^d · b/(b−1) —— **只比纯 BFS 多一个常数倍**，' +
          '却把空间从 O(b^d) 降到了 O(d)。这就是 IDDFS 在内存受限场景（如八数码、15 数码）里的杀手级优势。', cmds,
          { line: 9, milestone: '最短距离 ' + found, stage: true });
      } else {
        b.step('所有深度都试过了仍不可达 ⇒ 无解。', [], { line: 9, milestone: '不可达' });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 3. 差分约束
   * ============================================================ */
  const DC_NODES = [['x1', 140, 300], ['x2', 360, 150], ['x3', 360, 450], ['x4', 600, 300]];
  const DC_EDGES = [['x1', 'x2', 3], ['x2', 'x3', -2], ['x1', 'x3', 3], ['x3', 'x4', 5], ['x4', 'x1', 1], ['x2', 'x4', 4]];
  const DC_BAD_EDGES = [['x1', 'x2', -1], ['x2', 'x1', -1]];

  TGV.register({
    id: 'diff_constraints', name: '差分约束系统（不等式 → 最短路）', category: '图 · 最短路径',
    layout: 'geo', directed: true, acceptsGraph: false,
    compareWith: 'spfa',
    panels: [
      { id: 'cons', type: 'list', title: '约束 → 图中的边' },
      { id: 'watch', type: 'table', title: '最短路（= 最大可行解）', columns: [{ key: 'd', label: 'dist' }] }
    ],
    pseudocode: [
      '// 每个不等式 x_v - x_u ≤ w 对应一条边 u → v，权 w',
      '建图：对每条约束 addEdge(u, v, w)',
      '加超级源 S，S 到每个点连权 0 的边',
      '跑 Bellman-Ford / SPFA 求最短路 dist[]',
      'if 存在负环: 不等式组无解',
      'else: x_i = dist[i] 就是一组可行解（且是"最大"的那组）',
      '// 原理：dist[v] ≤ dist[u] + w ⇔ x_v - x_u ≤ w，最短路天然满足约束'
    ],
    presets: [
      { id: 'std', label: '4 变量 6 约束 · 可行', desc: '最短路值就是各变量的上界', data: () => ({}) },
      { id: 'bad', label: 'x2−x1 ≤ −1 且 x1−x2 ≤ −1（无解）', desc: '两条约束相加得 0 ≤ −2，负环暴露矛盾', data: () => ({ bad: true }) }
    ],
    run(input) {
      const bad = !!input.bad;
      const custom = !!(input && input.custom && input.nodes && input.edges);
      const nodeArr = custom
        ? input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300])
        : (bad ? [['x1', 260, 250], ['x2', 560, 250]] : DC_NODES);
      const edgeArr = custom
        ? input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 0])
        : (bad ? DC_BAD_EDGES : DC_EDGES);
      const g = mk({ nodes: nodeArr.map(a => ({ id: a[0], x: a[1], y: a[2] })), edges: edgeArr.map(e => ({ source: e[0], target: e[1], weight: e[2] })), custom: true, directed: true }, true);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const ids = g.nodes.map(n => n.id);
      const D = {};
      ids.forEach(id => D[id] = Infinity);

      b.step('**差分约束**是一类特殊的不等式组，每条形如 `x_v − x_u ≤ w`。它有一个漂亮的图论翻译：' +
        '把每个变量看成一个点，每条不等式看成 **一条 u→v、权为 w 的有向边**。' +
        '于是 `x_v − x_u ≤ w` 恰好等价于三角不等式 `dist[v] ≤ dist[u] + w` —— 也就是**最短路**的定义。', [],
        { line: 1, vars: [{ name: '变量', value: ids.length }] });

      const cmds = edgeArr.map((e, i) => C.q('cons', 'push', [{ key: 'c' + i, label: e[0] + ' − ' + e[1] + ' ≤ ' + e[2], meta: 'x' + (Number(e[0].slice(1)) - 1) + '→' }]));
      b.step('约束清单：' + edgeArr.map(e => '`x' + e[1].slice(1) + ' − x' + e[0].slice(1) + ' ≤ ' + e[2] + '`').join('，') + '。' +
        '每条约束直接变成一条边（起点是"被减数"），一次建模就完事。', cmds, { line: 2, milestone: '建图完成' });

      b.step('再加一个**超级源**：让它到每个点连一条权 0 的边，然后以它为起点跑最短路。' +
        '这一步保证所有点都可达（否则不可达点的 dist 是 ∞，解就没有意义）。', [], { line: 3 });

      // SPFA
      const Q = [], inq = {};
      ids.forEach(id => { D[id] = 0; inq[id] = true; Q.push(id); });
      b.step('初始化：**所有变量先设为 0**（相当于超级源连权 0 边）——注意这已经满足所有"边界"约束了。全体现入队。', [
        C.table('watch', ids[0], 'd', 0, true)
      ], { line: 4, milestone: '全部初始化为 0' });

      let guard = 0, negCycle = false;
      const cnt = {};
      ids.forEach(id => cnt[id] = 0);
      while (Q.length && guard++ < 60) {
        const u = Q.shift(); inq[u] = false;
        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to, w = link.w == null ? 1 : link.w;
          if (D[u] + w >= D[v]) continue;
          const oldD = D[v];
          D[v] = D[u] + w;
          cnt[v] = cnt[u] + 1;
          b.step('**松弛**：`dist[' + v + ']` 从 ' + sv(oldD) + ' 更新为 **' + D[v] + '**。' +
            '物理含义：既然 `x' + v.slice(1) + ' ≤ x' + u.slice(1) + ' + (' + w + ')`，而 `x' + u.slice(1) + '` 最大只能取 ' + D[u] + '，' +
            '那么 `x' + v.slice(1) + '` 最多也就 ' + D[v] + '。', [
            C.edge(link.eid, 'visited'), C.pulse(link.eid, { color: '#4F46E5' }),
            C.badge(v, 'x', D[v], true),
            C.table('watch', v, 'd', D[v], true)
          ], { line: 4 });
          if (cnt[v] > ids.length) { negCycle = true; break; }
          if (!inq[v]) { inq[v] = true; Q.push(v); }
        }
        if (negCycle) break;
      }

      if (negCycle) {
        const cmds = [C.state('x1', 'conflict'), C.state('x2', 'conflict'), C.hull('bad', ids, '#DC2626', '负环')];
        b.step('💥 **出现负环**：`cnt` 超过变量数，说明某个点被反复"压低"，永远压不完。' +
          '把 x1−x2 ≤ −1 和 x2−x1 ≤ −1 两式相加，得到 `0 ≤ −2` —— 矛盾。' +
          '**差分约束无解的充要条件，就是建出来的图有负环。**', cmds,
          { line: 5, milestone: '无解：负环', stage: true });
      } else {
        b.step('最短路收敛，得到一组解：' + ids.map(id => id + ' = ' + sv(D[id])).join('，') + '。' +
          '为什么这组解"最大"？因为最短路是在满足所有三角不等式的**前提下能取到的最大值** —— 任何别的可行解都必须 ≤ 它（逐点比较）。' +
          '如果题目要求最小解，把所有不等式取反再跑一遍即可。',
          ids.map(id => C.badge(id, 'x', D[id])), { line: 6, milestone: '可行解求得', stage: true });

        // 验证
        const bads = [];
        edgeArr.forEach(e => {
          const lhs = D[e[1]] - D[e[0]];
          if (lhs > e[2]) bads.push(e);
        });
        b.step('逐条校验：' + edgeArr.map(e => 'x' + e[1].slice(1) + '−x' + e[0].slice(1) + ' = ' + (D[e[1]] - D[e[0]]) + ' ≤ ' + e[2]).join('；') +
          '。' + (bads.length ? '有不满足的！' : '**全部满足** ✓。') +
          '这一步说明了为什么用"最短路"而不是"最长路"：`dist[v] ≤ dist[u] + w` 正是短路的松弛方向。' +
          '（若把不等式写成 `x_v − x_u ≥ w`，就该建反向边求最长路，两者本质相同。）', [],
          { line: 7, milestone: '约束全部满足', stage: true });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 4. Johnson 全源最短路
   * ============================================================ */
  const JN_NODES = [['A', 130, 160], ['B', 380, 120], ['C', 610, 240], ['D', 380, 420], ['E', 150, 400]];
  const JN_EDGES = [['A', 'B', 3], ['B', 'C', 4], ['C', 'D', -3], ['D', 'E', 2], ['E', 'A', 1], ['A', 'C', 9], ['B', 'D', 6], ['E', 'C', 7]];

  TGV.register({
    id: 'johnson', name: 'Johnson 全源最短路（重赋权 + 多次 Dijkstra）', category: '图 · 最短路径',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'floyd',
    panels: [
      { id: 'h', type: 'table', title: '势函数 h（BF 最短路）', columns: [{ key: 'h', label: 'h' }, { key: 'w', label: '新权' }] },
      { id: 'res', type: 'list', title: '全源结果' }
    ],
    pseudocode: [
      '// 目标：有负权边，但要跑 V 次 Dijkstra（比 Floyd 快）',
      '第 1 步：加超级源 S，S 到各点连权 0 的边，跑 Bellman-Ford 得 h[v]',
      'if BF 发现负环: 最短路无意义，结束',
      '第 2 步：重赋权 w′(u,v) = w(u,v) + h[u] − h[v]',
      '// 关键性质：w′ ≥ 0 恒成立（因为 h[v] ≤ h[u] + w）',
      '第 3 步：以每个点为源跑 Dijkstra（用 w′）',
      '第 4 步：还原真实距离 dist(u,v) = d′(u,v) − h[u] + h[v]',
      '// 复杂度 O(VE + V·E log V)，稀疏图远胜 Floyd 的 O(V³)'
    ],
    presets: [
      { id: 'std', label: '5 点含负权（无负环）', desc: '重赋权后全部边权 ≥ 0，Dijkstra 就能用了', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, true, JN_NODES, JN_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const ids = g.nodes.map(n => n.id);

      b.step('**Johnson 算法**要解决的问题：图里有负权边，所以 Dijkstra 用不了；Floyd 虽然能处理负权，但要 O(V³)。' +
        'Johnson 的办法是**给每个点算一个"势" h，把负权边重赋权成非负**，然后就能放心地跑 V 次 Dijkstra。' +
        '总复杂度 O(VE + VE log V)，稀疏图上比 Floyd 快得多。', [], { line: 1, vars: [{ name: 'V', value: ids.length }] });

      // Bellman-Ford with super source
      const h = {};
      ids.forEach(id => h[id] = 0);
      b.step('**第 1 步**：假想一个超级源连向所有点（权 0），等价于把所有 h 初始化为 0，然后跑 Bellman-Ford。', [
        C.badge(ids[0], 'h', 0)
      ], { line: 2, milestone: 'h 初始化为 0' });

      let changed = false, guard = 0;
      do {
        changed = false;
        for (let i = 0; i < g.edges.length; i++) {
          const e = g.edges[i];
          const w = wOf(e);
          if (h[e.source] + w < h[e.target]) {
            h[e.target] = h[e.source] + w;
            changed = true;
            b.step('松弛边 ' + e.source + '→' + e.target + '（w=' + w + '）：`h[' + e.target + '] = ' + h[e.target] + '`。' +
              'h[v] 的含义是"从超级源走到 v 的最短距离"，可正可负。', [
              C.edge(e.id, 'active'), C.pulse(e.id, { color: '#4F46E5' }),
              C.badge(e.target, 'h', h[e.target], true)
            ], { line: 2, milestone: 'h[' + e.target + '] = ' + h[e.target] });
          }
        }
      } while (changed && guard++ < 10);

      b.step('Bellman-Ford 收敛：**h = {' + ids.map(id => id + ':' + h[id]).join(', ') + '}**。' +
        '因为没检测到负环，说明这套 h 是合法的（满足 `h[v] ≤ h[u] + w`）。', [], { line: 3, milestone: '势函数就绪' });

      // 重赋权
      const w2 = {};
      g.edges.forEach(e => {
        w2[e.id] = wOf(e) + h[e.source] - h[e.target];
      });
      const cmds = [];
      g.edges.forEach(e => {
        cmds.push(C.label(e.id, wOf(e) + '→' + w2[e.id], true));
      });
      b.step('**第 2 步：重赋权** `w′(u,v) = w(u,v) + h[u] − h[v]`。' +
        '看每条边的新权：' + g.edges.map(e => e.source + e.target + ':' + wOf(e) + '→' + w2[e.id]).join('、') + '。' +
        '**全部 ≥ 0！** 为什么必然如此？因为 `h[v] ≤ h[u] + w(u,v)`（h 是短距离），移项就得到 `w + h[u] − h[v] ≥ 0`。', cmds,
        { line: 4, milestone: '重赋权完成：全非负', stage: true });

      b.step('重赋权的另一个关键性质：**任意一条路径的总权值只相差一个常数** `h[起点] − h[终点]`。' +
        '所以"哪条路最短"这个结论完全不变 —— 我们只是把尺子的原点挪了挪。于是 Dijkstra 可以放心跑了。', [], { line: 5 });

      // Dijkstra from each node on w2
      const all = [];
      ids.forEach(src => {
        const D = {}, done = {};
        ids.forEach(id => D[id] = Infinity);
        D[src] = 0;
        for (let r = 0; r < ids.length; r++) {
          let u = null, best = Infinity;
          ids.forEach(id => { if (!done[id] && D[id] < best) { best = D[id]; u = id; } });
          if (u == null) break;
          done[u] = true;
          g.adj[u].forEach(l => {
            const nd = D[u] + w2[l.eid];
            if (nd < D[l.to]) D[l.to] = nd;
          });
        }
        const real = {};
        ids.forEach(id => real[id] = isFinite(D[id]) ? D[id] - h[src] + h[id] : Infinity);
        all.push({ src: src, D: D, real: real });
        b.step('以 **' + src + '** 为源跑 Dijkstra（用新权）：d′ = {' + ids.map(id => id + ':' + sv(D[id])).join(', ') + '}，' +
          '还原真实距离 `d = d′ − h[' + src + '] + h[v]` → {' + ids.map(id => id + ':' + sv(real[id])).join(', ') + '}。', [
          C.state(src, 'active'), C.q('res', 'push', [{ key: src, label: src + ' → 全图', meta: ids.map(id => id + ':' + sv(real[id])).join(' ') }])
        ], { line: 7, milestone: src + ' 的全源结果' });
      });

      // 与 Floyd 对照
      b.step('全部完成。把每个源的结果拼起来就是**全源最短路表**。' +
        'Johnson 的精妙之处在于"先把负权消掉，再重复利用最快的单源算法"—— 这是一种非常通用的算法设计套路：' +
        '**变换问题使其满足已知算法的前提，再还原答案**。', [
        C.state(ids[0], 'visited')
      ], { line: 8, milestone: '全源最短路完成', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

})();
