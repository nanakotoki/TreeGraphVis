/* ============================================================
 * 第二卷 · G1 图的表示与基础搜索
 * 图工具库 + BFS + DFS（四类边分类）+ 双向 BFS
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* ---------- 图构造工具 ---------- */
  function mkGraph(nodeArr, edgeArr, opts) {
    opts = opts || {};
    const directed = opts.directed !== false;
    const nodes = nodeArr.map(a => ({
      id: String(a[0]), label: String(a.length > 3 ? a[3] : a[0]),
      key: a[0], ord: 0, x: a[1], y: a[2]
    }));
    const map = {};
    nodes.forEach(n => map[n.id] = n);
    const edges = [];
    edgeArr.forEach(a => {
      const id = String(a[0]) + '>' + String(a[1]);
      edges.push({ id, source: String(a[0]), target: String(a[1]), weight: a[2] != null ? a[2] : null });
    });
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
      adj[e.source].push({ to: e.target, w: e.weight, eid: e.id });
      if (!directed) adj[e.target].push({ to: e.source, w: e.weight, eid: e.id });
    });
    return { nodes, edges, adj, directed, map, opts };
  }
  TGV.GraphLib = { mkGraph };

  function customGraph(input) {
    if (!input || !input.nodes || !input.custom) return null;
    const nodes = input.nodes.map(n => [n.id, n.x || 400, n.y || 300]);
    const edges = input.edges.map(e => [e.source, e.target, e.weight]);
    return mkGraph(nodes, edges, { directed: input.directed !== false });
  }

  /* ============================================================
   * BFS 广度优先搜索
   * ============================================================ */
  TGV.register({
    id: 'bfs', name: '广度优先搜索 BFS（队列 + 波纹分层）', category: '图 · 基础搜索',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'dfs_classify',
    panels: [
      { id: 'q', type: 'queue', title: 'FIFO 队列' },
      { id: 'watch', type: 'table', title: '距离与前驱', columns: [{ key: 'dist', label: 'dist' }, { key: 'prev', label: 'prev' }, { key: 'color', label: '状态' }] }
    ],
    pseudocode: [
      '// BFS：按"离源点的边数"由近及远逐层扩展',
      'dist[s] = 0; queue.push(s)',
      'while queue not empty:',
      '    u = queue.pop_front()',
      '    for each (u, v) in adj[u]:',
      '        if dist[v] == INF:              // 第一次到达 = 最短路',
      '            dist[v] = dist[u] + 1',
      '            prev[v] = u',
      '            queue.push_back(v)',
      '// BFS 树边 = 首次发现 v 的那条边'
    ],
    presets: [
      { id: 'std', label: '标准无向图 · 从 A 出发', desc: '观察波纹按层推进，队列长度逐层变化', data: () => ({ s: 'A', nodes: [['A', 380, 90], ['B', 200, 210], ['C', 560, 210], ['D', 120, 360], ['E', 300, 360], ['F', 470, 360], ['G', 640, 360], ['H', 200, 500], ['I', 400, 500]], edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['C', 'G'], ['D', 'H'], ['E', 'H'], ['E', 'I'], ['F', 'I'], ['G', 'F']], directed: false }) },
      { id: 'dir', label: '有向图 BFS · 从 S 出发', desc: '有向边只沿箭头方向扩展', data: () => ({ s: 'S', directed: true, nodes: [['S', 380, 80], ['A', 200, 210], ['B', 560, 210], ['C', 120, 360], ['D', 320, 360], ['E', 560, 380], ['F', 760, 250]], edges: [['S', 'A'], ['S', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'E'], ['C', 'D'], ['D', 'E'], ['E', 'F']], directed: true }) }
    ],
    run(input) {
      const g = customGraph(input) || mkGraph(input.nodes, input.edges, { directed: input.directed });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const INF = '∞';
      const dist = {}, prev = {}, color = {};
      g.nodes.forEach(n => { dist[n.id] = INF; prev[n.id] = '-'; color[n.id] = '未访问'; });
      const src = input.s || g.nodes[0].id;
      b.step('BFS 从源点 `' + src + '` 出发，用**先进先出队列**保证"先发现的先扩展"，因此每个点第一次被访问时的距离就是最短距离（边权为 1 时）。', [], { line: 1, vars: [{ name: 's', value: src }] });
      dist[src] = 0; color[src] = '在队列';
      const q = [src];
      b.step('初始化：`dist[' + src + '] = 0`，源点入队。', [
        C.q('q', 'push', [{ label: src }]),
        C.table('watch', src, 'dist', 0, true),
        C.table('watch', src, 'prev', '-'),
        C.table('watch', src, 'color', '在队列'),
        C.state(src, 'active'), C.badge(src, 'd', 0)
      ], { line: 2, milestone: '源点入队 ' + src });

      let layer = 0;
      while (q.length) {
        const u = q.shift();
        layer = dist[u];
        b.step('队首出队 **' + u + '**（dist = ' + dist[u] + '），准备扫描它的所有邻居。', [
          C.q('q', 'pop_front'), C.state(u, 'active')
        ], { line: 4, vars: [{ name: 'u', value: u }] });
        color[u] = '已确定';
        b.step('结点 ' + u + ' 的最短距离永久确定：`dist[' + u + '] = ' + dist[u] + '`。', [
          C.state(u, 'visited'), C.table('watch', u, 'color', '已确定', true)
        ], { line: 4 });
        const treeEdges = {};
        g.adj[u].forEach(link => {
          const v = link.to;
          if (dist[v] !== INF) {
            if (treeEdges[link.eid] || (link._tree)) return;
            b.step('邻居 ' + v + ' 已被访问过 → 边 (' + u + ',' + v + ') 是**非树边**，直接跳过（BFS 只在首次发现时扩展）。', [
              C.edge(link.eid, 'rejected')
            ], { line: 6 });
            return;
          }
          link._tree = true;
          dist[v] = dist[u] + 1;
          prev[v] = u;
          color[v] = '在队列';
          q.push(v);
          b.step('邻居 ' + v + ' **首次被发现** → 记录 `dist[' + v + '] = ' + dist[v] + '`、`prev[' + v + '] = ' + u + '`，并入队。这条边就是 **BFS 树边**。', [
            C.pulse(link.eid, { color: '#16A34A' }),
            C.edge(link.eid, 'visited'),
            C.badge(v, 'd', dist[v]),
            C.state(v, 'frontier'),
            C.q('q', 'push', [{ label: v }]),
            C.table('watch', v, 'dist', dist[v], true),
            C.table('watch', v, 'prev', u, true),
            C.table('watch', v, 'color', '在队列', true)
          ], { line: 9, milestone: '发现 ' + v + '（距离 ' + dist[v] + '）' });
        });
        b.step('第 ' + layer + ' 层扩展完毕，队列：' + (q.length ? q.join(' → ') : '空') + '。', [], { line: 3, stage: true });
      }
      b.step('队列为空，BFS 结束。所有可达点的最短距离已求出：' + g.nodes.map(n => n.id + '=' + dist[n.id]).join('，') + '。', [], { line: 3, milestone: '遍历完成' });
      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * DFS 深度优先 + 边分类
   * ============================================================ */
  const TREE_C = '#16A34A', BACK_C = '#DC2626', FORE_C = '#2563EB', CROSS_C = '#EA580C';
  TGV.register({
    id: 'dfs_classify', name: '深度优先搜索 DFS · 四类边分类', category: '图 · 基础搜索',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'bfs',
    panels: [{ id: 'stk', type: 'stack', title: '递归调用栈' }, { id: 'watch', type: 'table', title: '时间戳', columns: [{ key: 'd', label: 'd[]' }, { key: 'f', label: 'f[]' }, { key: 'k', label: '边分类' }] }],
    pseudocode: [
      '// 颜色：白=未访问，灰=在栈中，黑=已完成',
      'dfs(u):',
      '    color[u] = GRAY; d[u] = ++timer',
      '    for each (u, v) in adj[u]:',
      '        if color[v] == WHITE:  dfs(v)          // 树边 Tree',
      '        elif color[v] == GRAY: 标记后向边 Back   // 指向祖先 → 有环',
      '        elif d[v] > d[u]:      标记前向边 Forward',
      '        else:                  标记横叉边 Cross',
      '    color[u] = BLACK; f[u] = ++timer',
      '// 括号化定理：d[u] < d[v] < f[v] < f[u] ⇔ v 是 u 的后代'
    ],
    presets: [
      { id: 'four', label: '四类边齐全的教学图', desc: '树边/后向边/前向边/横叉边同时出现', data: () => ({ s: 'A', nodes: [['A', 160, 110], ['B', 380, 110], ['C', 160, 330], ['D', 380, 330], ['E', 590, 210]], edges: [['A', 'B'], ['A', 'C'], ['A', 'E'], ['B', 'D'], ['D', 'E'], ['E', 'B'], ['C', 'D']] }) },
      { id: 'cycle', label: '含环有向图', desc: '后向边即时暴露环', data: () => ({ s: 'A', nodes: [['A', 250, 100], ['B', 480, 160], ['C', 520, 380], ['D', 250, 400], ['E', 120, 250]], edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'], ['B', 'E']] }) }
    ],
    run(input) {
      const g = customGraph(input) || mkGraph(input.nodes, input.edges, { directed: input.directed !== false });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const color = {}, d = {}, f = {};
      g.nodes.forEach(n => { color[n.id] = 'white'; d[n.id] = '-'; f[n.id] = '-'; });
      const src = input.s || g.nodes[0].id;
      let timer = 0;
      const counts = { 树边: 0, 后向边: 0, 前向边: 0, 横叉边: 0 };

      b.step('DFS 沿着一条路径**尽可能深入**，走不通才回溯。同时记录进入时间 `d[u]` 与离开时间 `f[u]`，就能把每条边精确分类。有三种颜色：白（未访问）、灰（在递归栈中）、黑（已完成）。', [], { line: 1, vars: [{ name: 's', value: src }] });

      const classify = (eid, kind, u, v) => {
        counts[kind]++;
        const color = kind === '树边' ? TREE_C : kind === '后向边' ? BACK_C : kind === '前向边' ? FORE_C : CROSS_C;
        return [
          C.edge(eid, 'custom'), C.edgeColor(eid, color, kind !== '树边', kind === '树边' ? 2.6 : 1.8),
          C.table('watch', u, 'k', kind + '→' + v, true)
        ];
      };

      const dfs = (u, depth) => {
        color[u] = 'gray';
        d[u] = ++timer;
        b.step('进入 **' + u + '**：染灰（进栈），`d[' + u + '] = ' + d[u] + '`。', [
          C.push('stk', { label: 'dfs(' + u + ')', meta: 'd=' + d[u] }),
          C.state(u, 'active'),
          C.badge(u, 'd', d[u]),
          C.table('watch', u, 'd', d[u], true),
          C.table('watch', u, 'k', 'GRAY')
        ], { line: 3, vars: [{ name: 'u', value: u }, { name: 'timer', value: d[u] }] });
        g.adj[u].forEach(link => {
          const v = link.to;
          if (color[v] === 'white') {
            b.step('邻边 ' + u + ' → ' + v + '：' + v + ' 是**白色**（未访问）→ 递归深入，这条边是**树边**。', [
              C.state(v, 'frontier')
            ].concat(classify(link.eid, '树边', u, v)), { line: 5, milestone: '树边 ' + u + '→' + v });
            dfs(v, depth + 1);
          } else if (color[v] === 'gray') {
            b.step('邻边 ' + u + ' → ' + v + '：' + v + ' 还是**灰色**（仍在递归栈中，是 u 的祖先）→ **后向边**！它意味着图中存在环。', [
              C.state(v, 'conflict'), C.state(u, 'conflict')
            ].concat(classify(link.eid, '后向边', u, v)), { line: 6, milestone: '发现环：后向边 ' + u + '→' + v, stage: true });
          } else if (d[v] > d[u]) {
            b.step('邻边 ' + u + ' → ' + v + '：' + v + ' 已变黑，但 `d[' + v + '] = ' + d[v] + ' > d[' + u + '] = ' + d[u] + '` → ' + v + ' 是 u 的**后代**（跨过一层），这是**前向边**。', [
              C.state(v, 'visited')
            ].concat(classify(link.eid, '前向边', u, v)), { line: 7, milestone: '前向边 ' + u + '→' + v });
          } else {
            b.step('邻边 ' + u + ' → ' + v + '：' + v + ' 已变黑且 `d[' + v + '] = ' + d[v] + ' < d[' + u + '] = ' + d[u] + '` → 它属于**另一条已完成的子树**，这是**横叉边**。', [
              C.state(v, 'visited')
            ].concat(classify(link.eid, '横叉边', u, v)), { line: 8, milestone: '横叉边 ' + u + '→' + v });
          }
        });
        color[u] = 'black';
        f[u] = ++timer;
        b.step('**' + u + ' 的所有邻边处理完毕**：染黑（出栈），`f[' + u + '] = ' + f[u] + '`。区间 `[' + d[u] + ', ' + f[u] + ']` 完整包住了它所有后代的区间。', [
          C.pop('stk', 1), C.state(u, 'visited'),
          C.badge(u, 'f', f[u]),
          C.table('watch', u, 'f', f[u], true),
          C.table('watch', u, 'k', 'BLACK')
        ], { line: 9, vars: [{ name: 'f', value: f[u] }] });
      };

      dfs(src, 0);
      // 非连通图
      g.nodes.forEach(n => {
        if (color[n.id] === 'white') {
          b.step('还有白色结点 ' + n.id + '，说明它不可达 → 从它重新发起一次 DFS。', [], { line: 2 });
          dfs(n.id, 0);
        }
      });
      b.step('DFS 完成。边分类统计：**树边 ' + counts['树边'] + ' 条、后向边 ' + counts['后向边'] + ' 条、前向边 ' + counts['前向边'] + ' 条、横叉边 ' + counts['横叉边'] + ' 条**。后向边存在 ⇔ 有向图有环。', [], { line: 9, milestone: '遍历完成' });
      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 双向 BFS
   * ============================================================ */
  TGV.register({
    id: 'bidir_bfs', name: '双向 BFS（两股波纹中途会师）', category: '图 · 基础搜索',
    layout: 'geo', directed: false, acceptsGraph: true,
    panels: [{ id: 'qa', type: 'queue', title: '正向队列（蓝）' }, { id: 'qb', type: 'queue', title: '反向队列（橙）' }],
    pseudocode: [
      '// 同时从 S 与 T 出发，谁的前沿小就扩展谁',
      'dS[S] = 0; dT[T] = 0',
      'while 两个队列都不空:',
      '    扩展较小的一侧前沿（每次一层）',
      '    新点 x：若另一侧已访问过 x → 会师！',
      '    return dS[x] + dT[x]        // 拼出最短路径'
    ],
    presets: [
      { id: 'p1', label: '网格状图 S → T', desc: '双向搜索只需扩展一半的层数', data: () => ({ s: 'S', t: 'T', nodes: [['S', 90, 300], ['A', 200, 160], ['B', 200, 440], ['C', 340, 100], ['D', 340, 300], ['E', 340, 500], ['F', 500, 160], ['G', 500, 440], ['H', 630, 300], ['T', 730, 300]], edges: [['S', 'A'], ['S', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'F'], ['D', 'G'], ['E', 'G'], ['F', 'H'], ['G', 'H'], ['H', 'T']] }) },
      { id: 'p2', label: '长链图', desc: '中间相遇效果最明显', data: () => ({ s: '1', t: '9', nodes: [['1', 90, 300], ['2', 180, 220], ['3', 270, 340], ['4', 360, 220], ['5', 450, 340], ['6', 540, 220], ['7', 630, 340], ['8', 720, 220], ['9', 810, 300]], edges: [['1', '2'], ['2', '3'], ['3', '4'], ['4', '5'], ['5', '6'], ['6', '7'], ['7', '8'], ['8', '9']] }) }
    ],
    run(input) {
      const g = customGraph(input) || mkGraph(input.nodes, input.edges, { directed: false });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const s = input.s || g.nodes[0].id, t = input.t || g.nodes[g.nodes.length - 1].id;
      const dS = {}, dT = {}, pS = {}, pT = {};
      g.nodes.forEach(n => { dS[n.id] = '∞'; dT[n.id] = '∞'; pS[n.id] = '-'; pT[n.id] = '-'; });
      dS[s] = 0; dT[t] = 0;
      const qa = [s], qb = [t];
      b.step('双向 BFS 从 **' + s + '** 和 **' + t + '** 同时出发。若最短路径长度为 L，单向 BFS 要扩展 b^L 个结点，双向只要 2·b^(L/2)——指数级的加速。', [
        C.q('qa', 'push', [{ label: s }]), C.q('qb', 'push', [{ label: t }]),
        C.state(s, 'frontier'), C.state(t, 'frontier'),
        C.badge(s, 'dS', 0), C.badge(t, 'dT', 0)
      ], { line: 2, vars: [{ name: 'S', value: s }, { name: 'T', value: t }] });

      let meet = null, guard = 0;
      while (qa.length && qb.length && guard++ < 60) {
        const useA = qa.length <= qb.length;
        const q = useA ? qa : qb;
        const dMe = useA ? dS : dT;
        const dOther = useA ? dT : dS;
        const pMe = useA ? pS : pT;
        const pOther = useA ? pT : pS;
        const panel = useA ? 'qa' : 'qb';
        const color = useA ? '#4F46E5' : '#F59E0B';
        const u = q.shift();
        b.step((useA ? '**正向**' : '**反向**') + '扩展：出队 ' + u + '（距离 ' + dMe[u] + '）。', [
          C.q(panel, 'pop_front'), C.state(u, 'active')
        ], { line: 4, vars: [{ name: 'frontier', value: useA ? 'S 侧' : 'T 侧' }] });
        g.adj[u].forEach(link => {
          const v = link.to;
          if (dMe[v] !== '∞') return;
          dMe[v] = dMe[u] + 1;
          pMe[v] = u;
          q.push(v);
          b.step('发现 ' + v + '（' + (useA ? 'dS' : 'dT') + ' = ' + dMe[v] + '）' + (dOther[v] !== '∞' ? '，而另一侧也已经访问过它！' : '，入队。'), [
            C.pulse(link.eid, { color }),
            C.edge(link.eid, 'custom'), C.edgeColor(link.eid, color, false, 2.2),
            C.badge(v, useA ? 'dS' : 'dT', dMe[v]),
            C.state(v, 'frontier'),
            C.q(panel, 'push', [{ label: v }])
          ], { line: 5 });
          if (dOther[v] !== '∞' && !meet) {
            meet = v;
            b.step('**两股波纹在 ' + v + ' 会师！** 最短路径长度 = dS[' + v + '] + dT[' + v + '] = ' + dS[v] + ' + ' + dT[v] + ' = ' + (dS[v] + dT[v]) + '。', [
              C.state(v, 'path'), C.hull('meet', [v], '#DC2626', '会师点 ' + v)
            ], { line: 6, milestone: '会师于 ' + v + '，距离 ' + (dS[v] + dT[v]), stage: true });
          }
        });
        if (meet) break;
      }
      if (meet) {
        const left = [];
        let cur = meet;
        while (cur !== s && cur !== '-') { left.unshift(cur); cur = pS[cur]; }
        left.unshift(s);
        const right = [];
        cur = pT[meet];
        while (cur !== t && cur !== '-') { right.push(cur); cur = pT[cur]; }
        const full = left.concat(right, [t]);
        const cm = [];
        for (let i = 0; i + 1 < full.length; i++) {
          const a = full[i], c = full[i + 1];
          const e = g.edges.find(x => (x.source === a && x.target === c) || (!g.directed && x.source === c && x.target === a));
          if (e) { cm.push(C.edge(e.id, 'path')); }
          cm.push(C.state(a, 'path'));
        }
        cm.push(C.state(t, 'path'));
        b.step('沿前驱指针回溯并拼接：**' + full.join(' → ') + '**。', cm, { line: 6, milestone: '拼出最短路径' });
      } else {
        b.step('一侧队列已空仍未相遇 → S 与 T 不连通。', [], { line: 3, milestone: '不可达' });
      }
      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

})();
