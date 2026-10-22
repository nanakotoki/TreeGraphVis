/* ============================================================
 * 第二卷 · G6 网络流 + G7 二分图匹配
 * 二分图判定 · Edmonds-Karp · Dinic · 最小割
 * 最小费用最大流 · 匈牙利算法 · KM 最佳匹配
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  const wOf = e => (e.weight == null ? 1 : e.weight);
  const withRowOrder = (panels, ids) => panels.map(p => (p.type === 'table' ? Object.assign({}, p, { rowOrder: ids }) : p));

  /* ---------------- 网络流基础设施 ---------------- */
  function flowNet(nodeArr, edgeArr) {
    const g = TGV.GraphLib.mkGraph(nodeArr, edgeArr, { directed: true });
    const cap = {}, flow = {};
    g.edges.forEach(e => { cap[e.id] = wOf(e); flow[e.id] = 0; });
    const eidOf = (u, v) => {
      const e = g.edges.find(x => x.source === u && x.target === v);
      return e ? e.id : null;
    };
    const resid = (u, v) => {
      let r = 0;
      const f = eidOf(u, v); if (f) r += cap[f] - flow[f];
      const b = eidOf(v, u); if (b) r += flow[b];
      return r;
    };
    return { g, cap, flow, eidOf, resid };
  }
  const flowCmds = (net) => net.g.edges.map(e => C.flowEdge(e.id, net.flow[e.id], net.cap[e.id]));

  /* 自定义网络：规模生成器 / 编辑器传入 custom 对象格式 */
  function netOf(input, nodeArr, edgeArr) {
    if (input && input.custom && input.nodes && input.edges) {
      return flowNet(
        input.nodes.map(n => [n.id, n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
        input.edges.map(e => [e.source, e.target, e.weight != null ? e.weight : 1])
      );
    }
    return flowNet(nodeArr, edgeArr);
  }

  const NET_NODES = [['S', 80, 300], ['A', 290, 150], ['B', 290, 450], ['C', 500, 150], ['D', 500, 450], ['T', 710, 300]];
  const NET_EDGES = [['S', 'A', 10], ['S', 'B', 10], ['A', 'C', 4], ['A', 'D', 8], ['B', 'D', 9], ['C', 'T', 10], ['D', 'C', 6], ['D', 'T', 10]];

  /* ============================================================
   * 1. 二分图判定
   * ============================================================ */
  const BI_NODES = [['L1', 180, 120], ['L2', 180, 270], ['L3', 180, 420], ['R1', 560, 120], ['R2', 560, 270], ['R3', 560, 420]];
  const BI_EDGES = [['L1', 'R1'], ['L1', 'R2'], ['L2', 'R2'], ['L2', 'R3'], ['L3', 'R1'], ['L3', 'R3']];
  const BI_ODD_NODES = [['A', 260, 150], ['B', 480, 150], ['C', 590, 340], ['D', 370, 460], ['E', 150, 340]];
  const BI_ODD_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']];

  TGV.register({
    id: 'bip_color', name: '二分图判定（BFS 二染色）', category: '图 · 匹配与网络流',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'hungarian',
    panels: [
      { id: 'q', type: 'queue', title: 'BFS 队列' },
      { id: 'side', type: 'list', title: '两侧集合' }
    ],
    pseudocode: [
      '// 二分图 ⇔ 点集能分成左右两边，所有边都跨两边 ⇔ 不存在奇环',
      'for each 未染色的点 s:',
      '    color[s] = 0；s 入队',
      '    while 队列非空:',
      '        u = 队首出队',
      '        for each 邻边 (u, v):',
      '            if v 未染色: color[v] = color[u] ^ 1；v 入队',
      '            elif color[v] == color[u]: 冲突！不是二分图',
      '// 奇环是唯一的障碍：偶数环可以交替染色，奇数环必然撞色'
    ],
    presets: [
      { id: 'std', label: '二分图（左 3 右 3）', desc: 'BFS 交替染色，两侧颜色不同', data: () => ({}) },
      { id: 'odd', label: '五元环（不是二分图）', desc: '奇环让最后一个点无处可染', data: () => ({ odd: true }) }
    ],
    run(input) {
      const odd = !!input.odd;
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target)]),
            { directed: false })
        : (odd ? TGV.GraphLib.mkGraph(BI_ODD_NODES, BI_ODD_EDGES, { directed: false })
               : TGV.GraphLib.mkGraph(BI_NODES, BI_EDGES, { directed: false }));
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const color = {};
      g.nodes.forEach(n => color[n.id] = -1);
      const q = [];
      let conflict = null;
      const SIDE = [
        { fill: '#DBEAFE', stroke: '#2563EB', text: '#1E3A8A' },
        { fill: '#FEF3C7', stroke: '#D97706', text: '#78350F' }
      ];

      b.step('**二分图**：能把点分成左右两拨，使每条边都跨在两拨之间。等价说法是「**不存在奇数长度的环**」—— 因为沿环交替染色时，偶数环刚好回到起点用色，奇环则会撞色。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }] });

      const start = g.nodes[0].id;
      color[start] = 0; q.push(start);
      b.step('从 ' + start + ' 开始染成 **左侧（0）**，入队。', [
        C.state(start, 'active'), C.style(start, SIDE[0]), C.badge(start, 'c', 0),
        C.q('q', 'push', [{ key: start, label: start, meta: 'c=0' }])
      ], { line: 3, milestone: '起点 ' + start + ' = 左' });

      let guard = 0;
      while (q.length && guard++ < 100) {
        const u = q.shift();
        b.step('出队 **' + u + '**（颜色 ' + color[u] + '），把它的邻居都染成相反的颜色。', [
          C.q('q', 'pop_front'), C.state(u, 'visited')
        ], { line: 5, vars: [{ name: 'u', value: u }] });
        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to;
          if (color[v] === -1) {
            color[v] = color[u] ^ 1;
            q.push(v);
            b.step('邻点 ' + v + ' 未染色 → 染成 **' + (color[v] === 0 ? '左侧' : '右侧') + '** 并入队。', [
              C.edge(link.eid, 'visited'), C.state(v, 'frontier'),
              C.style(v, SIDE[color[v]]), C.badge(v, 'c', color[v]),
              C.q('q', 'push', [{ key: v, label: v, meta: 'c=' + color[v] }])
            ], { line: 7, milestone: v + ' = ' + (color[v] === 0 ? '左' : '右') });
          } else if (color[v] === color[u]) {
            conflict = link.eid;
            b.step('邻点 ' + v + ' 已经染成 **和 ' + u + ' 相同的颜色** → 冲突！这两个点相邻却不能异色，说明图中存在**奇环**，' +
              '**不是二分图**。', [
              C.edge(link.eid, 'conflict'), C.pulse(link.eid, { color: '#DC2626' }),
              C.state(u, 'conflict'), C.state(v, 'conflict')
            ], { line: 8, milestone: '冲突：不是二分图', stage: true });
          } else {
            b.step('邻点 ' + v + ' 已经染成相反颜色（' + color[v] + '）→ 没问题。', [C.edge(link.eid, 'visited')], { line: 7 });
          }
        }
      }

      // 补染剩余连通块
      g.nodes.forEach(n => {
        if (color[n.id] === -1) {
          color[n.id] = 0; q.push(n.id);
          b.step('还有未染色的点 ' + n.id + '（另一个连通块）→ 从它重新开始染色。', [
            C.style(n.id, SIDE[0]), C.badge(n.id, 'c', 0), C.q('q', 'push', [{ key: n.id, label: n.id, meta: 'c=0' }])
          ], { line: 2 });
          while (q.length) {
            const u = q.shift();
            g.adj[u].forEach(link => {
              const v = link.to;
              if (color[v] === -1) { color[v] = color[u] ^ 1; q.push(v); C.style(v, SIDE[color[v]]); C.badge(v, 'c', color[v]); }
              else if (color[v] === color[u]) conflict = link.eid;
            });
          }
        }
      });

      if (!conflict) {
        const left = g.nodes.filter(n => color[n.id] === 0).map(n => n.id);
        const right = g.nodes.filter(n => color[n.id] === 1).map(n => n.id);
        b.step('染色完成，无冲突 → **是二分图**。左侧 **{' + left.join(',') + '}**，右侧 **{' + right.join(',') + '}**。' +
          '这个划分不是"猜"出来的：从任一点出发交替染色，结果唯一确定（每个连通块有 2 种等价选择）。' +
          '二分图是匹配、最小点覆盖、最大独立集这一整套理论的入口。', [
          C.q('side', 'push', [{ key: 'l', label: '左 { ' + left.join(',') + ' }', meta: left.length + ' 点' }]),
          C.q('side', 'push', [{ key: 'r', label: '右 { ' + right.join(',') + ' }', meta: right.length + ' 点' }])
        ], { line: 9, milestone: '二分图确认', stage: true });
      } else {
        b.step('因为有奇环，**这张图不是二分图** —— 后面的匈牙利算法、KM 算法都不能直接用在它上面。' +
          '（工程上遇到这种情况，通常要先"破环"或者改用一般图匹配：带花树。）', [
          C.edge(conflict, 'conflict')
        ], { line: 9, milestone: '不是二分图', stage: true });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 2. Edmonds-Karp
   * ============================================================ */
  TGV.register({
    id: 'ff_ek', name: '最大流 · Edmonds-Karp（BFS 找增广路）', category: '图 · 匹配与网络流',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'dinic',
    panels: [
      { id: 'q', type: 'queue', title: 'BFS 队列' },
      { id: 'aug', type: 'list', title: '增广路 / 瓶颈' }
    ],
    pseudocode: [
      '// 不断在"残留网络"里找一条 S→T 的路径，沿路推流，直到找不到为止',
      'while BFS 能找到残留容量 > 0 的路径:',
      '    沿路径取最小残留容量 = 瓶颈 b',
      '    for each 边 (u,v) on path:',
      '        flow[u][v] += b',
      '        flow[v][u] -= b      // 反向边获得"反悔"能力',
      '    总流量 += b',
      '// 残留网络 = 还能压多少；反向边让我们可以撤销之前的错误决定'
    ],
    presets: [
      { id: 'std', label: '6 点网络 · 最大流 19', desc: '4 条增广路，注意第 3 条借用了反向边', data: () => ({}) }
    ],
    run(input) {
      const net = netOf(input, NET_NODES, NET_EDGES);
      const g = net.g;
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const S = 'S', T = 'T';
      let total = 0, rounds = 0;

      b.step('最大流问题：每条管道有容量上限，问从 S 到 T 最多能送多少。' +
        '**Ford-Fulkerson** 的思路是"能推就推"：只要残留网络里还有 S→T 的通路（增广路），就沿路推一个瓶颈量。' +
        '**Edmonds-Karp** 的改进是每次用 **BFS 找最短的增广路**，保证复杂度 O(VE²)。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }, { name: 'E', value: g.edges.length }] });

      b.step('初始状态：所有边流量为 0，边上的标签是 **流量/容量**。', flowCmds(net), { line: 2, milestone: '初始流量 0' });

      let guard = 0;
      while (guard++ < 30) {
        // BFS
        const prev = {}, pedge = {}, vis = {};
        const q = [S]; vis[S] = true;
        b.step('**第 ' + (rounds + 1) + ' 次 BFS**：从 S 出发，只走残留容量 > 0 的边。', [
          C.q('q', 'set', [{ key: S, label: S }]), C.state(S, 'active')
        ], { line: 2 });
        while (q.length) {
          const u = q.shift();
          for (let i = 0; i < g.adj[u].length; i++) {
            const link = g.adj[u][i];
            const v = link.to;
            if (vis[v]) continue;
            const r = net.resid(u, v);
            if (r <= 0) continue;
            vis[v] = true;
            prev[v] = u;
            pedge[v] = { eid: link.eid, forward: net.eidOf(u, v) === link.eid };
            q.push(v);
          }
          if (vis[T]) break;
        }

        if (!vis[T]) {
          b.step('BFS 无法到达 T —— **残留网络里已经没有增广路了**。根据最大流最小割定理，当前流量就是最大值。', [
            C.state(T, 'conflict')
          ], { line: 1, milestone: '无增广路，流量最大', stage: true });
          break;
        }

        // 还原路径
        const path = [];
        let cur = T;
        while (cur !== S) { path.unshift(cur); cur = prev[cur]; }
        path.unshift(S);
        let bottleneck = Infinity;
        const cmds = [];
        for (let i = 0; i + 1 < path.length; i++) {
          const u = path[i], v = path[i + 1];
          const r = net.resid(u, v);
          bottleneck = Math.min(bottleneck, r);
          cmds.push(C.state(u, 'active'));
        }
        cmds.push(C.state(T, 'active'));
        b.step('找到增广路 **' + path.join(' → ') + '**。沿途残留容量的最小值就是这次能推的**瓶颈 = ' + bottleneck + '**。', cmds,
          { line: 3, vars: [{ name: 'b', value: bottleneck }] });

        const push = [];
        for (let i = 0; i + 1 < path.length; i++) {
          const u = path[i], v = path[i + 1];
          const fwd = net.eidOf(u, v);
          if (fwd) { net.flow[fwd] += bottleneck; push.push(C.flowEdge(fwd, net.flow[fwd], net.cap[fwd]), C.pulse(fwd, { color: '#16A34A' }), C.edge(fwd, 'visited')); }
          const bwd = net.eidOf(v, u);
          if (bwd) { net.flow[bwd] -= bottleneck; push.push(C.flowEdge(bwd, net.flow[bwd], net.cap[bwd])); }
        }
        total += bottleneck;
        rounds++;
        b.step('沿路推流 **' + bottleneck + '**：正向边流量 +' + bottleneck + '，**反向边流量 −' + bottleneck + '**（这就是"反悔"机制 —— 允许后面的增广路撤销之前的决定）。' +
          '当前总流量 **' + total + '**。', push.concat([
          C.q('aug', 'push', [{ key: 'a' + rounds, label: path.join('→'), meta: 'b=' + bottleneck + ' 累计 ' + total }])
        ]), { line: 6, milestone: '增广 ' + bottleneck + '，总流量 ' + total });
      }

      b.step('最大流 = **' + total + '**，共增广 ' + rounds + ' 次。' +
        '看一眼标签就能验证流量守恒：每个中间点"流入 = 流出"，每条边流量 ≤ 容量，S 的净流出 = T 的净流入 = ' + total + '。' +
        '如果一开始就用贪心乱推（比如每次都推满一条路），可能要多推很多次甚至无法结束；BFS 的最短增广路保证了多项式时间。', flowCmds(net),
        { line: 8, milestone: '最大流 ' + total, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 3. Dinic
   * ============================================================ */
  TGV.register({
    id: 'dinic', name: '最大流 · Dinic（分层图 + 阻塞流）', category: '图 · 匹配与网络流',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'ff_ek',
    panels: [
      { id: 'level', type: 'list', title: '分层（level）' },
      { id: 'aug', type: 'list', title: '本层阻塞流的路径' }
    ],
    pseudocode: [
      '// 每一轮：BFS 分层，然后在层次图上 DFS 一次性推完所有最短路',
      'while BFS 能分层到 T:',
      '    构造 level[]（只保留 level 递增的边）',
      '    while DFS(S) 还能找到路径:',
      '        沿层次图推流（当前弧优化，避免重复扫描）',
      '    // 这一层的"阻塞流"推完后，层次图必然被破坏',
      '// 每轮至少让最短增广路长度 +1，最多 V 轮 ⇒ O(V²E)'
    ],
    presets: [
      { id: 'std', label: '6 点网络 · 一轮推完', desc: 'Dinic 只需 1~2 个 BFS 阶段，而 EK 要 4 次', data: () => ({}) }
    ],
    run(input) {
      const net = netOf(input, NET_NODES, NET_EDGES);
      const g = net.g;
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const S = 'S', T = 'T';
      let total = 0, phase = 0;

      b.step('Dinic 的加速点在于：**一次 BFS 分层，然后在层次图上一次性推完所有最短增广路**（这叫阻塞流）。' +
        'EK 每次 BFS 只推一条路，浪费了大量重复搜索。', [], { line: 1 });

      b.step('初始流量全 0。', flowCmds(net), { line: 1, milestone: '初始流量 0' });

      let guard = 0;
      while (guard++ < 12) {
        // BFS 分层
        const level = {}, q = [S];
        g.nodes.forEach(n => level[n.id] = -1);
        level[S] = 0;
        while (q.length) {
          const u = q.shift();
          g.adj[u].forEach(l => {
            if (level[l.to] === -1 && net.resid(u, l.to) > 0) { level[l.to] = level[u] + 1; q.push(l.to); }
          });
        }
        if (level[T] === -1) {
          b.step('BFS 到不了 T（没有 level）⇒ 残留网络无增广路，算法结束。', [], { line: 2, milestone: '结束', stage: true });
          break;
        }
        phase++;
        const lvItems = g.nodes.filter(n => level[n.id] >= 0).sort((x, y) => level[x.id] - level[y.id])
          .map(n => ({ key: n.id, label: n.id, meta: 'L' + level[n.id] }));
        b.step('**第 ' + phase + ' 阶段 BFS 分层**：' + g.nodes.filter(n => level[n.id] >= 0).map(n => n.id + '@L' + level[n.id]).join('、') + '。' +
          '之后只允许沿 level +1 的边走，于是所有增广路都是**当前最短**的。', [
          C.q('level', 'set', lvItems)
        ].concat(g.nodes.filter(n => level[n.id] >= 0).map(n => C.badge(n.id, 'lv', level[n.id]))),
          { line: 3, milestone: '分层：T 在第 ' + level[T] + ' 层', stage: true });

        // DFS 阻塞流
        const iter = {};
        g.nodes.forEach(n => iter[n.id] = 0);
        const paths = [];
        const dfs = (u, limit) => {
          if (u === T) return limit;
          for (; iter[u] < g.adj[u].length; iter[u]++) {
            const link = g.adj[u][iter[u]];
            const v = link.to;
            if (level[v] !== level[u] + 1) continue;
            const r = net.resid(u, v);
            if (r <= 0) continue;
            const got = dfs(v, Math.min(limit, r));
            if (got > 0) {
              const fwd = net.eidOf(u, v);
              if (fwd) net.flow[fwd] += got;
              const bwd = net.eidOf(v, u);
              if (bwd) net.flow[bwd] -= got;
              paths.push(u + '→' + v + ' ' + got);
              return got;
            }
          }
          return 0;
        };

        let phaseFlow = 0, cnt = 0;
        while (cnt++ < 40) {
          const got = dfs(S, Infinity);
          if (got <= 0) break;
          phaseFlow += got;
          total += got;
          b.step('层次图上推流 **' + got + '**（当前弧优化：走过的边不再回头扫）→ 本阶段累计 **' + phaseFlow + '**，总流量 ' + total + '。',
            flowCmds(net).concat([C.q('aug', 'push', [{ key: 'p' + phase + '_' + cnt, label: '第' + phase + '阶段', meta: '+' + got + ' 累计 ' + total }])]),
            { line: 5, milestone: '阶段 ' + phase + ' 推流 +' + got });
        }
        b.step('**第 ' + phase + ' 阶段结束**：阻塞流推完 ' + phaseFlow + '。此时层次图上再没有任何 S→T 通路，' +
          '说明所有最短增广路都被榨干了 —— 需要重新 BFS 分层（最短路径长度至少 +1）。', [], { line: 6, stage: true });
      }

      b.step('最大流 = **' + total + '**，只用了 ' + phase + ' 个 BFS 阶段。' +
        'Dinic 的复杂度 O(V²E)，在单位容量图上更是 O(E√E) —— 这正是它成为竞赛"最大流默认解"的原因。' +
        '两个关键优化：**分层图**保证只沿最短路推流，**当前弧**保证每条边每阶段只被扫一次。', flowCmds(net),
        { line: 7, milestone: '最大流 ' + total, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 4. 最小割
   * ============================================================ */
  TGV.register({
    id: 'min_cut', name: '最小割（最大流最小割定理）', category: '图 · 匹配与网络流',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'ff_ek',
    panels: [
      { id: 'side', type: 'list', title: 'S 侧集合（残量可达）' },
      { id: 'cuts', type: 'list', title: '割边' }
    ],
    pseudocode: [
      '// 割：把点分成 S 侧与 T 侧，容量 = 所有从 S 侧指向 T 侧的边容量之和',
      '// 定理：最大流 = 最小割',
      '先求最大流（任意算法）',
      '在最终残留网络上，从源点 BFS 一次：',
      '    能到达的点 = S 侧；到不了的点 = T 侧',
      '容量 > 0 且从 S 侧指向 T 侧的边 = 割边',
      '// 为什么？这些边一定已经满流（否则还能增广），且总流量 = 割容量'
    ],
    presets: [
      { id: 'std', label: '6 点网络 · 最小割 = 19', desc: '割边是 S→A 与 B→D', data: () => ({}) }
    ],
    run(input) {
      const net = netOf(input, NET_NODES, NET_EDGES);
      const g = net.g;
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const S = 'S', T = 'T';
      let total = 0;

      b.step('**割**是把点分成两拨（源在 S 侧、汇在 T 侧），**割的容量** = 所有从 S 侧跨到 T 侧的边的容量和。' +
        '**最大流最小割定理**：最大流的流量 = 最小割的容量。它把"能送多少"和"要断哪几根管子"这两件看起来无关的事绑在了一起。', [],
        { line: 1 });

      // 先跑 EK（静默），记录帧用于展示
      let guard = 0;
      while (guard++ < 30) {
        const prev = {}, vis = {};
        const q = [S]; vis[S] = true;
        while (q.length) {
          const u = q.shift();
          g.adj[u].forEach(l => {
            if (!vis[l.to] && net.resid(u, l.to) > 0) { vis[l.to] = true; prev[l.to] = u; q.push(l.to); }
          });
        }
        if (!vis[T]) break;
        const path = [];
        let cur = T;
        while (cur !== S) { path.unshift(cur); cur = prev[cur]; }
        path.unshift(S);
        let bn = Infinity;
        for (let i = 0; i + 1 < path.length; i++) bn = Math.min(bn, net.resid(path[i], path[i + 1]));
        for (let i = 0; i + 1 < path.length; i++) {
          const u = path[i], v = path[i + 1];
          const f = net.eidOf(u, v); if (f) net.flow[f] += bn;
          const r = net.eidOf(v, u); if (r) net.flow[r] -= bn;
        }
        total += bn;
        b.step('第 ' + guard + ' 条增广路 **' + path.join(' → ') + '**，推 ' + bn + '，累计流量 **' + total + '**。', flowCmds(net),
          { line: 3, milestone: '流量 ' + total });
      }
      b.step('最大流求完，**流量 = ' + total + '**。现在做关键的一步：**在最终残留网络上从 S 做一次 BFS**。' +
        '能走到的点构成 S 侧 —— 走不到说明所有连向它们的边都已经满流。', flowCmds(net), { line: 4, milestone: '最大流 ' + total });

      const reach = {}, q = [S];
      reach[S] = true;
      while (q.length) {
        const u = q.shift();
        g.adj[u].forEach(l => { if (!reach[l.to] && net.resid(u, l.to) > 0) { reach[l.to] = true; q.push(l.to); } });
      }
      const sSide = g.nodes.filter(n => reach[n.id]).map(n => n.id);
      const tSide = g.nodes.filter(n => !reach[n.id]).map(n => n.id);
      const cutEdges = g.edges.filter(e => reach[e.source] && !reach[e.target]);

      const cmds = [];
      sSide.forEach(id => cmds.push(C.state(id, 'active')));
      tSide.forEach(id => cmds.push(C.state(id, 'ghost')));
      sSide.forEach(id => cmds.push(C.badge(id, '侧', 'S')));
      tSide.forEach(id => cmds.push(C.badge(id, '侧', 'T')));
      b.step('残留可达集合 = **{' + sSide.join(',') + '}**（S 侧），其余 **{' + tSide.join(',') + '}** 是 T 侧。' +
        '注意 B 虽然在 S 侧，但它指向 D 的边已经满流，所以才走不过去 —— 这正是"割边一定满流"的直观体现。', cmds.concat([
        C.q('side', 'push', [{ key: 'S', label: 'S 侧 {' + sSide.join(',') + '}', meta: sSide.length + ' 点' }]),
        C.q('side', 'push', [{ key: 'T', label: 'T 侧 {' + tSide.join(',') + '}', meta: tSide.length + ' 点' }])
      ]), { line: 5, milestone: 'S 侧 {' + sSide.join(',') + '}' });

      const cutCmds = [];
      let cutCap = 0;
      cutEdges.forEach(e => {
        cutCap += net.cap[e.id];
        cutCmds.push(C.edge(e.id, 'conflict'), C.pulse(e.id, { color: '#DC2626' }));
        cutCmds.push(C.q('cuts', 'push', [{ key: e.id, label: e.source + '→' + e.target, meta: net.flow[e.id] + '/' + net.cap[e.id] }]));
      });
      cutCmds.push(C.clearCut('cut'));
      cutCmds.push(C.cut('cut', sSide, '#DC2626', '割容量 ' + cutCap, tSide));
      b.step('割边：**' + cutEdges.map(e => e.source + '→' + e.target + '(' + net.cap[e.id] + ')').join(' + ') + '**，容量和 = **' + cutCap + '**。' +
        '这个数**恰好等于最大流 ' + total + '** —— 这就是最大流最小割定理的实证。' +
        '工程含义：想让 S 到 T 彻底断流，最少要"砍掉"这么多容量；而当前的最大流已经用满了这些管子。', cutCmds,
        { line: 6, milestone: '最小割容量 ' + cutCap, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 5. 最小费用最大流
   * ============================================================ */
  const MCMF_NODES = [['S', 90, 300], ['A', 300, 160], ['B', 300, 440], ['C', 520, 160], ['D', 520, 440], ['T', 720, 300]];
  // [u, v, cap, cost]
  const MCMF_EDGES = [['S', 'A', 2, 1], ['S', 'B', 2, 2], ['A', 'C', 1, 1], ['A', 'D', 1, 2], ['B', 'C', 1, 2], ['B', 'D', 1, 1], ['C', 'T', 2, 1], ['D', 'T', 2, 1]];

  TGV.register({
    id: 'mcmf', name: '最小费用最大流（SPFA 找最便宜增广路）', category: '图 · 匹配与网络流',
    layout: 'geo', directed: true, acceptsGraph: false,
    compareWith: 'ff_ek',
    panels: [
      { id: 'cost', type: 'table', title: 'SPFA 最短路（费用）', columns: [{ key: 'd', label: 'dist' }, { key: 'p', label: 'prev' }] },
      { id: 'path', type: 'list', title: '每次增广' }
    ],
    pseudocode: [
      '// 每条边多一个"单位费用"，要求在最大流的前提下总费用最小',
      'while 能用 SPFA 找到一条 S→T 的最便宜增广路:',
      '    取瓶颈 b，沿路推流 b',
      '    cost += b × 路长',
      '// 反向边的费用取负，于是"退流"会退还费用',
      '// 因为每次走的都是最短路，费用流具有"凸性"，所以贪心正确'
    ],
    presets: [
      { id: 'std', label: '6 点 / 8 边 · 最大流 4，最小费用 16', desc: '边上的标签是 流量/容量 · 单位费用', data: () => ({}) }
    ],
    run(input) {
      const custom = !!(input && input.custom && input.nodes && input.edges);
      const net = netOf(input, MCMF_NODES, MCMF_EDGES.map(e => [e[0], e[1], e[2]]));
      const g = net.g;
      const cost = {};
      g.edges.forEach((e, i) => {
        cost[e.id] = custom
          ? (input.edges[i] && input.edges[i].cost != null ? input.edges[i].cost : 1)
          : MCMF_EDGES[i][3];
      });
      const panels = this.panels;
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(panels, g.nodes.map(n => n.id)) });
      const S = 'S', T = 'T';
      let totalFlow = 0, totalCost = 0, round = 0;

      const labelAll = () => g.edges.map(e => C.flowEdge(e.id, net.flow[e.id], net.cap[e.id]));
      b.step('**最小费用最大流**：先保证流量最大，再让总费用最小。每条边多一个"单位费用"，代价 = 流量 × 单位费用。' +
        '做法是**每次都用 SPFA 找单位费用之和最小的增广路**，把这条路的瓶颈推满。' +
        '为什么这样贪心是对的？因为费用流问题具有**凸性**：沿最短路增广不会破坏后续的最优性。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }] });

      const costItems = g.edges.map(e => C.label(e.id, net.flow[e.id] + '/' + net.cap[e.id] + ' ·c' + cost[e.id]));
      b.step('初始状态：所有边流量 0，标签格式是 **流量/容量 · 单位费用**。', costItems, { line: 1, milestone: '初始流量 0' });

      let guard = 0;
      while (guard++ < 20) {
        // SPFA on residual with cost
        const dist = {}, inq = {}, prev = {}, vis = {};
        g.nodes.forEach(n => { dist[n.id] = Infinity; inq[n.id] = false; prev[n.id] = null; });
        dist[S] = 0;
        const q = [S]; inq[S] = true;
        while (q.length) {
          const u = q.shift(); inq[u] = false;
          g.adj[u].forEach(l => {
            const v = l.to;
            if (net.resid(u, v) <= 0) return;
            const c = cost[l.eid] == null ? 0 : cost[l.eid];
            if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; if (!inq[v]) { inq[v] = true; q.push(v); } }
          });
        }
        if (!isFinite(dist[T])) {
          b.step('SPFA 找不到增广路（dist[T] = ∞）⇒ 已经达到最大流，停止。', [], { line: 3, milestone: '最大流达成', stage: true });
          break;
        }
        const path = [];
        let cur = T;
        while (cur !== S) { path.unshift(cur); cur = prev[cur]; }
        path.unshift(S);
        let bn = Infinity;
        for (let i = 0; i + 1 < path.length; i++) bn = Math.min(bn, net.resid(path[i], path[i + 1]));
        round++;
        const cmds = [];
        g.nodes.forEach(n => {
          cmds.push(C.table('cost', n.id, 'd', isFinite(dist[n.id]) ? dist[n.id] : '∞', true));
          cmds.push(C.table('cost', n.id, 'p', prev[n.id] || '-'));
        });
        path.forEach(id => cmds.push(C.state(id, 'active')));
        b.step('SPFA 找到**最便宜**的增广路 **' + path.join(' → ') + '**，单位费用之和 = **' + dist[T] + '**，瓶颈 = ' + bn + '。', cmds,
          { line: 2, vars: [{ name: 'dist', value: dist[T] }] });

        const push = [];
        for (let i = 0; i + 1 < path.length; i++) {
          const u = path[i], v = path[i + 1];
          const f = net.eidOf(u, v);
          if (f) push.push(C.flowEdge(f, net.flow[f] + bn, net.cap[f]), C.pulse(f, { color: '#16A34A' }), C.edge(f, 'visited'));
          if (f) net.flow[f] += bn;
          const r = net.eidOf(v, u);
          if (r) { net.flow[r] -= bn; push.push(C.flowEdge(r, net.flow[r], net.cap[r])); }
        }
        totalFlow += bn;
        totalCost += bn * dist[T];
        b.step('推流 ' + bn + '：费用增加 `' + bn + ' × ' + dist[T] + ' = ' + (bn * dist[T]) + '`，累计 **流量 ' + totalFlow + ' / 费用 ' + totalCost + '**。',
          push.concat([C.q('path', 'push', [{ key: 'r' + round, label: path.join('→'), meta: '×' + bn + ' c=' + dist[T] }])]),
          { line: 4, milestone: '流量 ' + totalFlow + '，费用 ' + totalCost });
      }

      b.step('结束：**最大流 ' + totalFlow + '，最小费用 ' + totalCost + '**。' +
        '注意这里的顺序：每一条增广路都必须是最小费用路，才能保证最终总费用最小 —— 如果随便找一条路推，费用会更高（甚至需要靠反向边"反悔"才能扳回来）。' +
        '把费用换成时间就是"最快流"，换成损失就是"最小代价流"，模型通用性极强。', labelAll(),
        { line: 6, milestone: '最小费用 ' + totalCost, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 6. 匈牙利算法
   * ============================================================ */
  const HM_NODES = [['L1', 180, 110], ['L2', 180, 240], ['L3', 180, 370], ['L4', 180, 500], ['R1', 580, 110], ['R2', 580, 240], ['R3', 580, 370], ['R4', 580, 500]];
  const HM_EDGES = [['L1', 'R1'], ['L1', 'R2'], ['L2', 'R1'], ['L2', 'R3'], ['L3', 'R2'], ['L3', 'R4'], ['L4', 'R3']];

  TGV.register({
    id: 'hungarian', name: '匈牙利算法（二分图最大匹配）', category: '图 · 匹配与网络流',
    layout: 'geo', directed: false, acceptsGraph: false,
    compareWith: 'bip_color',
    panels: [
      { id: 'match', type: 'list', title: '匹配边' },
      { id: 'try', type: 'list', title: '本轮增广尝试' }
    ],
    pseudocode: [
      '// 对左侧每个点尝试"找对象"，找到就配，找不到就试着让别人换一个',
      'for each 左点 u:',
      '    clear visited（每轮重置）',
      '    if dfs(u): 匹配数 +1',
      'dfs(u):',
      '    for each u 的邻点 v:',
      '        if v 本轮未访问:',
      '            标记 v 已访问',
      '            if v 未匹配 or dfs(matchR[v]): 让 v 配给 u，返回 true',
      '    return false',
      '// 这就是"增广路"：顺着已匹配边往回走，再沿未匹配边前进，匹配数 +1'
    ],
    presets: [
      { id: 'std', label: '左 4 右 4 · 最大匹配 4', desc: '注意 L4 成功"抢"到 R3 时的连锁换位', data: () => ({}) }
    ],
    run(input) {
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target)]),
            { directed: false })
        : TGV.GraphLib.mkGraph(HM_NODES, HM_EDGES, { directed: false });
      // 只保留 L→R 方向的邻接
      const adjL = {};
      g.nodes.filter(n => n.id.charAt(0) === 'L').forEach(n => adjL[n.id] = []);
      g.edges.forEach(e => {
        if (e.source.charAt(0) === 'L') adjL[e.source].push(e.target);
        else adjL[e.target].push(e.source);
      });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const matchR = {}, matchL = {};
      let matched = 0;

      const edgeOf = (u, v) => g.edges.find(e => (e.source === u && e.target === v) || (e.source === v && e.target === u));

      b.step('二分图匹配：给尽量多的左点配上右点，每个点最多配一次。匈牙利算法本质是**不断找增广路**：' +
        '从一个未匹配的左点出发，沿"未匹配边 → 已匹配边 → 未匹配边…"交替走，如果能走到一个未匹配的右点，就说明匹配数还能 +1（沿路把匹配边翻转）。', [],
        { line: 1 });

      const tryDfs = (u, vis, depth) => {
        for (let i = 0; i < adjL[u].length; i++) {
          const v = adjL[u][i];
          if (vis[v]) continue;
          vis[v] = true;
          const e = edgeOf(u, v);
          if (matchR[v] === undefined) {
            matchL[u] = v; matchR[v] = u;
            b.step('**' + u + ' 找到空位 ' + v + '** → 直接配对。', [
              C.edge(e.id, 'visited'), C.pulse(e.id, { color: '#16A34A' }),
              C.state(u, 'visited'), C.state(v, 'visited'),
              C.q('match', 'push', [{ key: u + v, label: u + ' — ' + v }])
            ], { line: 9, milestone: u + ' — ' + v });
            return true;
          }
          b.step('边 ' + u + '—' + v + '：' + v + ' 已经被 ' + matchR[v] + ' 占了 → 试着让 ' + matchR[v] + ' **换一个**（递归增广）。', [
            C.edge(e.id, 'active'), C.state(v, 'conflict')
          ], { line: 9 });
          if (tryDfs(matchR[v], vis, depth + 1)) {
            const old = matchR[v];
            matchL[u] = v; matchR[v] = u;
            delete matchL[old];
            b.step('**增广成功**：' + v + ' 改配给 ' + u + '，' + old + ' 让位并找到了新对象。匹配边发生了连锁调整 —— 这就是"翻转增广路"。', [
              C.edge(e.id, 'visited'), C.pulse(e.id, { color: '#D97706' }),
              C.state(u, 'visited'), C.state(v, 'visited'),
              C.q('match', 'push', [{ key: u + v, label: u + ' — ' + v, meta: '(换位)' }])
            ], { line: 9, milestone: '连锁增广：' + u + ' — ' + v });
            return true;
          }
          b.step('让 ' + matchR[v] + ' 换位失败 → 边 ' + u + '—' + v + ' 走不通，换下一个邻点。', [C.edge(e.id, 'ghost')], { line: 9 });
        }
        return false;
      };

      g.nodes.filter(n => n.id.charAt(0) === 'L').forEach(u => {
        b.step('给左点 **' + u.id + '** 找对象（本轮 visited 清空，防止绕圈）。', [
          C.state(u.id, 'active'), C.q('try', 'push', [{ key: u.id, label: '尝试 ' + u.id }])
        ], { line: 2, vars: [{ name: 'u', value: u.id }] });
        const vis = {};
        if (tryDfs(u.id, vis, 0)) {
          matched++;
        } else {
          b.step(u.id + ' **找不到可配的右点**（所有可达的右点都已被占且无法腾挪）→ 它只能空着。', [
            C.state(u.id, 'ghost')
          ], { line: 10, milestone: u.id + ' 无法匹配' });
        }
      });

      const cmds = [];
      Object.keys(matchL).forEach(u => {
        const e = edgeOf(u, matchL[u]);
        if (e) { cmds.push(C.edge(e.id, 'path')); cmds.push(C.pulse(e.id, { color: '#D97706' })); }
        cmds.push(C.state(u, 'path'), C.state(matchL[u], 'path'));
      });
      b.step('**最大匹配 = ' + matched + '**：' + Object.keys(matchL).map(u => u + '—' + matchL[u]).join('、') + '。' +
        '复杂度 O(VE)：每个左点做一次 DFS。有趣的是它其实在求**最大流**（源连左、右连汇、边容量 1），匈牙利只是把 BFS 手写得更轻。' +
        '还有一个副产品 —— **König 定理**：最大匹配 = 最小点覆盖。', cmds,
        { line: 11, milestone: '最大匹配 ' + matched, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 7. KM 最佳完美匹配
   * ============================================================ */
  const KM_W = [
    [3, 5, 5, 4],
    [2, 3, 2, 3],
    [4, 3, 2, 3],
    [3, 2, 3, 2]
  ];
  const KM_NODES = [['L1', 160, 100], ['L2', 160, 230], ['L3', 160, 360], ['L4', 160, 490], ['R1', 620, 100], ['R2', 620, 230], ['R3', 620, 360], ['R4', 620, 490]];

  TGV.register({
    id: 'km', name: 'KM 算法（二分图最佳完美匹配）', category: '图 · 匹配与网络流',
    layout: 'geo', directed: false, acceptsGraph: false,
    compareWith: 'hungarian',
    panels: [
      { id: 'w', type: 'matrix', n: 4, rowLabels: ['L1', 'L2', 'L3', 'L4'], colLabels: ['R1', 'R2', 'R3', 'R4'], title: '权值矩阵 w[i][j]' },
      { id: 'match', type: 'list', title: '当前匹配 / 权值' }
    ],
    pseudocode: [
      '// 带权完美匹配：让匹配边的权值和最大',
      '初始化 lx[i] = max_j w[i][j]，ly[j] = 0（保证 lx+ly ≥ w 恒成立）',
      '对每个左点 i 尝试增广:',
      '    只在"相等子图"（lx[i]+ly[j] == w[i][j]）上找增广路',
      '    若找不到: 计算 d = min(lx[x]+ly[y]-w[x][y])（x 已访问, y 未访问）',
      '             已访问的 lx -= d，已访问的 ly += d，再试一次',
      '// 每次调整都放宽一点点条件，直到出现新的相等边'
    ],
    presets: [
      { id: 'std', label: '4×4 权值矩阵', desc: '观察顶标的削减/增加如何"造出"新的相等边', data: () => ({}) }
    ],
    run(input) {
      const custom = !!(input && input.custom && input.nodes && input.edges);
      const N = custom
        ? Math.max(1, input.nodes.filter(n => String(n.id).charAt(0) === 'L').length)
        : 4;
      const g = custom
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            [], { directed: false })
        : TGV.GraphLib.mkGraph(KM_NODES, [], { directed: false });
      const W = custom ? Array.from({ length: N }, () => new Array(N).fill(1)) : KM_W;
      if (custom) {
        input.edges.forEach(e => {
          const li = Number(String(e.source).slice(1)) - 1;
          const rj = Number(String(e.target).slice(1)) - 1;
          if (li >= 0 && li < N && rj >= 0 && rj < N) W[li][rj] = e.weight != null ? e.weight : 1;
        });
      }
      // 全连接边
      const edges = [];
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          edges.push({ id: 'L' + (i + 1) + '>R' + (j + 1), source: 'L' + (i + 1), target: 'R' + (j + 1), weight: W[i][j] });
        }
      }
      g.edges = edges;
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const lx = [], ly = [], matchR = [], matchL = [];
      for (let i = 0; i < N; i++) { lx[i] = Math.max.apply(null, W[i]); ly[i] = 0; matchR[i] = -1; matchL[i] = -1; }
      let total = 0;

      const eidOf = (i, j) => 'L' + (i + 1) + '>R' + (j + 1);
      const rowOf = id => Number(id.slice(1)) - 1;

      const labelCmds = () => {
        const cmds = [];
        for (let i = 0; i < N; i++) {
          cmds.push(C.badge('L' + (i + 1), 'lx', lx[i], true));
          cmds.push(C.badge('R' + (i + 1), 'ly', ly[i], true));
        }
        return cmds;
      };

      b.step('**KM 算法**解决"带权完美匹配"：每个左点都要配一个右点，且总权值最大。' +
        '它维护两组**顶标** lx、ly，并始终保持 `lx[i] + ly[j] ≥ w[i][j]`。只允许走**相等边**（取等号的那些），' +
        '在相等子图上找增广路；找不到就**整体下调/上调顶标**，把新的边"拉进"相等子图。', [],
        { line: 1, vars: [{ name: 'N', value: N }] });

      const initCmds = labelCmds();
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) initCmds.push(C.matrix('w', i, j, W[i][j]));
      }
      b.step('初始化：`lx[i] = 第 i 行的最大值`（' + lx.join(',') + '），`ly[j] = 0`。' +
        '这样 `lx[i] + ly[j] ≥ w[i][j]` 天然成立（行最大值不小于该行任何元素），所有边权都不超过"顶标之和"。' +
        'KM 的核心不变量就是：**任何匹配的权值和 ≤ 任何可行顶标的和** —— 当两者相等时，就拿到了最优解。', initCmds,
        { line: 2, milestone: '顶标初始化' });

      for (let i = 0; i < N; i++) {
        b.step('给 **L' + (i + 1) + '** 找匹配（目标：进相等子图）。', [C.state('L' + (i + 1), 'active')], { line: 3 });
        let guard = 0;
        while (guard++ < 12) {
          const visX = new Array(N).fill(false), visY = new Array(N).fill(false);
          const slack = new Array(N).fill(Infinity);
          const slackFrom = new Array(N).fill(-1);
          const dfs = (x) => {
            visX[x] = true;
            for (let y = 0; y < N; y++) {
              if (visY[y]) continue;
              const gap = lx[x] + ly[y] - W[x][y];
              if (gap === 0) {
                visY[y] = true;
                if (matchR[y] === -1 || dfs(matchR[y])) { matchR[y] = x; matchL[x] = y; return true; }
              } else if (gap < slack[y]) { slack[y] = gap; slackFrom[y] = x; }
            }
            return false;
          };
          if (dfs(i)) {
            const y = matchL[i];
            b.step('L' + (i + 1) + ' 在**相等子图**上找到了增广路 → 匹配 **L' + (i + 1) + ' — R' + (y + 1) + '**（w=' + W[i][y] + '）。' +
              (matchR[y] !== i ? '' : ''), [
              C.edge(eidOf(i, y), 'visited'), C.pulse(eidOf(i, y), { color: '#16A34A' }),
              C.state('L' + (i + 1), 'visited'), C.state('R' + (y + 1), 'visited'),
              C.q('match', 'push', [{ key: 'm' + i, label: 'L' + (i + 1) + ' — R' + (y + 1), meta: 'w=' + W[i][y] }])
            ], { line: 4, milestone: '匹配 L' + (i + 1) + '—R' + (y + 1) });
            break;
          }
          // 调整顶标
          let d = Infinity, pickY = -1, pickX = -1;
          for (let y = 0; y < N; y++) {
            if (!visY[y] && slack[y] < d) { d = slack[y]; pickY = y; pickX = slackFrom[y]; }
          }
          if (!isFinite(d)) break;
          const cmds = [];
          for (let x = 0; x < N; x++) if (visX[x]) lx[x] -= d;
          for (let y = 0; y < N; y++) if (visY[y]) ly[y] += d;
          cmds.push.apply(cmds, labelCmds());
          if (pickX >= 0 && pickY >= 0) {
            cmds.push(C.edge(eidOf(pickX, pickY), 'frontier'));
            cmds.push(C.pulse(eidOf(pickX, pickY), { color: '#F59E0B' }));
          }
          b.step('相等子图里没有增广路 → **调整顶标**：所有已访问的 lx 减 ' + d + '，已访问的 ly 加 ' + d + '。' +
            '这一步会让原本"差 ' + d + '"的边 **' + 'L' + (pickX + 1) + '—R' + (pickY + 1) + '** 恰好取等号，进入相等子图。' +
            '顶标之和减少了 ' + d + '，但依然满足 `lx+ly ≥ w` —— 这正是 KM 能不断"让步"而不破坏最优性的关键。', cmds,
            { line: 6, milestone: '顶标调整 d=' + d });
        }
      }

      const cmds = [];
      for (let i = 0; i < N; i++) {
        if (matchL[i] < 0) continue;
        total += W[i][matchL[i]];
        cmds.push(C.edge(eidOf(i, matchL[i]), 'path'));
        cmds.push(C.pulse(eidOf(i, matchL[i]), { color: '#D97706' }));
        cmds.push(C.state('L' + (i + 1), 'path'), C.state('R' + (matchL[i] + 1), 'path'));
      }
      cmds.push(C.q('match', 'push', [{ key: 'sum', label: '总权值', meta: String(total) }]));
      b.step('完美匹配完成：' + Array.from({ length: N }, (_, i) => 'L' + (i + 1) + '—R' + (matchL[i] + 1)).join('、') +
        '，**总权值 = ' + total + '**。' +
        '此刻所有匹配边都是相等边，所以 `Σlx + Σly = 匹配权值和`；而任何匹配都不可能超过顶标和 ⇒ **这就是最优解**。' +
        '（KM 的复杂度 O(n³)，本质是"线性规划对偶"的一个漂亮实例：顶标就是对偶变量。）', cmds,
        { line: 7, milestone: '最优权值 ' + total, stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

})();
