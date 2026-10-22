/* ============================================================
 * 第二卷 · G5 连通性
 * Tarjan SCC · Kosaraju · 割点与桥 · 边双连通
 * 2-SAT · 欧拉回路 · 图着色
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

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
  const withRowOrder = (panels, ids) => panels.map(p => (p.type === 'table' ? Object.assign({}, p, { rowOrder: ids }) : p));

  const SCC_NODES = [['A', 110, 140], ['B', 310, 100], ['C', 310, 280], ['D', 500, 200], ['E', 660, 120], ['F', 660, 330], ['G', 470, 410]];
  const SCC_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D'], ['D', 'E'], ['E', 'D'], ['E', 'F'], ['F', 'G'], ['G', 'F']];

  const CUT_NODES = [['A', 120, 140], ['B', 320, 100], ['C', 320, 280], ['D', 520, 190], ['E', 700, 130], ['F', 700, 320], ['G', 500, 400], ['H', 150, 400]];
  const CUT_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D'], ['D', 'E'], ['E', 'F'], ['F', 'D'], ['F', 'G'], ['G', 'H']];

  /* ============================================================
   * 1. Tarjan 强连通分量
   * ============================================================ */
  TGV.register({
    id: 'tarjan_scc', name: 'Tarjan 强连通分量（low-link + 栈）', category: '图 · 连通性',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'kosaraju',
    panels: [
      { id: 'stk', type: 'stack', title: 'Tarjan 栈（未定归属的点）' },
      { id: 'sccs', type: 'list', title: '已确定的 SCC' }
    ],
    pseudocode: [
      '// dfn[u]：访问时间；low[u]：u 的子树能回溯到的最早"栈内"节点',
      'timer = 0；栈 = 空',
      'dfs(u):',
      '    dfn[u] = low[u] = ++timer；u 入栈',
      '    for each 出边 (u, v):',
      '        if v 未访问: dfs(v); low[u] = min(low[u], low[v])',
      '        elif v 仍在栈中: low[u] = min(low[u], dfn[v])',
      '    if low[u] == dfn[u]:            // u 是这个 SCC 的根',
      '        不断弹栈直到弹出 u，弹出的点同属一个 SCC',
      '// 只有"仍在栈中"的点才参与 low 更新 —— 跨 SCC 的边要忽略'
    ],
    presets: [
      { id: 'std', label: '3 个 SCC 的有向图', desc: '{A,B,C}、{D,E}、{F,G} 各自成环', data: () => ({}) },
      { id: 'chain', label: 'SCC 串成链（缩点后是 DAG）', desc: '观察 SCC 的弹出顺序正好是缩点图的逆拓扑序', data: () => ({ chain: true }) }
    ],
    run(input) {
      const g = mk(input, true, SCC_NODES, SCC_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const dfn = {}, low = {}, inStack = {}, comp = {};
      g.nodes.forEach(n => { dfn[n.id] = 0; low[n.id] = 0; inStack[n.id] = false; comp[n.id] = -1; });
      let timer = 0;
      const stack = [];
      const sccList = [];
      const COLORS = ['#4F46E5', '#0891B2', '#16A34A', '#D97706', '#DB2777'];

      b.step('强连通分量（SCC）= 极大的点集，**其中任意两点互相可达**。Tarjan 用一个栈 + 两个数组就能线性求出：' +
        '`dfn` 是时间戳，`low[u]` 是「u 及其子树能回溯到的最早栈内节点的时间戳」。当 `low[u] == dfn[u]` 时，u 就是这个 SCC 最早被访问的那个点（根），从栈顶弹到 u 就得到一个 SCC。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }] });

      const dfs = (u) => {
        dfn[u] = low[u] = ++timer;
        stack.push(u); inStack[u] = true;
        b.step('进入 **' + u + '**：`dfn[' + u + '] = low[' + u + '] = ' + dfn[u] + '`，入栈。', [
          C.state(u, 'active'), C.badge(u, 'dfn', dfn[u], true),
          C.push('stk', { label: u, meta: 'low=' + low[u] })
        ], { line: 4, vars: [{ name: 'u', value: u }] });

        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to;
          if (dfn[v] === 0) {
            b.step('出边 ' + u + '→' + v + '：' + v + ' 没访问过 → 深入。', [
              C.edge(link.eid, 'active'), C.state(v, 'frontier')
            ], { line: 6 });
            dfs(v);
            if (low[v] < low[u]) low[u] = low[v];
            b.step('从 ' + v + ' 回溯：`low[' + u + '] = min(' + low[u] + ', low[' + v + '] = ' + low[v] + ') = ' + low[u] + '`。' +
              '这意味着 u 也能到达 v 能到达的地方。', [
              C.edge(link.eid, 'visited'),
              C.badge(u, 'low', low[u], true)
            ], { line: 6 });
          } else if (inStack[v]) {
            if (dfn[v] < low[u]) low[u] = dfn[v];
            b.step('出边 ' + u + '→' + v + '：' + v + ' 已被访问且**仍在栈中**（属于尚未定型的 SCC）→ 用 `dfn[' + v + '] = ' + dfn[v] + '` 更新 low。' +
              '现在 `low[' + u + '] = ' + low[u] + '`。', [
              C.edge(link.eid, 'visited'), C.pulse(link.eid, { color: '#F59E0B' }),
              C.badge(u, 'low', low[u], true)
            ], { line: 7 });
          } else {
            b.step('出边 ' + u + '→' + v + '：' + v + ' 已出栈（属于**另一个已完成的 SCC**）→ **完全忽略**。' +
              '这是 Tarjan 最容易写错的地方：跨 SCC 的边不能参与 low 更新。', [
              C.edge(link.eid, 'ghost')
            ], { line: 7 });
          }
        }

        if (low[u] === dfn[u]) {
          const members = [];
          while (stack.length) {
            const w = stack.pop();
            inStack[w] = false;
            members.push(w);
            if (w === u) break;
          }
          members.reverse();
          const idx = sccList.length;
          sccList.push(members);
          const color = COLORS[idx % COLORS.length];
          const cmds = [];
          members.forEach(w => {
            comp[w] = idx;
            cmds.push(C.state(w, 'visited'));
            cmds.push(C.style(w, { stroke: color, fill: 'rgba(255,255,255,0)', text: null }));
            cmds.push(C.pop('stk', 1));
          });
          cmds.push(C.hull('scc' + idx, members, color, 'SCC#' + (idx + 1)));
          cmds.push(C.q('sccs', 'push', [{ key: 's' + idx, label: '{' + members.join(',') + '}', meta: 'SCC#' + (idx + 1) }]));
          b.step('`low[' + u + '] == dfn[' + u + '] = ' + dfn[u] + '` → **' + u + ' 是 SCC 的根**！从栈顶弹到 ' + u + '，得到 **{' + members.join(',') + '}**。' +
            '为什么？因为栈里 u 之上的所有点都还没能连回更早的节点，它们和 u 只能互相到达。', cmds,
            { line: 9, milestone: 'SCC#' + (idx + 1) + ' = {' + members.join(',') + '}', stage: true });
        }
      };

      g.nodes.forEach(n => {
        if (dfn[n.id] === 0) {
          b.step('外层循环：' + n.id + ' 还没被访问（不可达或有多个入口）→ 从它发起一次 DFS。', [], { line: 3 });
          dfs(n.id);
        }
      });

      b.step('Tarjan 结束，共找到 **' + sccList.length + ' 个强连通分量**：' +
        sccList.map((s, i) => '#' + (i + 1) + '{' + s.join(',') + '}').join('、') + '。' +
        '注意弹出的顺序：**越先弹出的 SCC，在缩点图中越靠"汇"端** —— 这正好是缩点 DAG 的逆拓扑序。' +
        '整体复杂度 O(V+E)，每个点只进栈出栈一次。', [], { line: 10, milestone: '共 ' + sccList.length + ' 个 SCC', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 2. Kosaraju
   * ============================================================ */
  TGV.register({
    id: 'kosaraju', name: 'Kosaraju 强连通分量（两遍 DFS + 反图）', category: '图 · 连通性',
    layout: 'geo', directed: true, acceptsGraph: true,
    compareWith: 'tarjan_scc',
    panels: [
      { id: 'order', type: 'list', title: '第一遍：完成序（栈）' },
      { id: 'sccs', type: 'list', title: '第二遍：反向图结果' }
    ],
    pseudocode: [
      '// 第一遍：在正向图上 DFS，按"完成时间"压栈',
      'dfs1(u): for each 出边 (u,v): if 未访问 dfs1(v); order.push(u)',
      '// 第二遍：在反图上，按 order 的逆序（即完成时间从晚到早）DFS',
      'for i = V-1 downto 0:',
      '    u = order[i]',
      '    if 未访问: dfs2(u) 能走到的点构成一个 SCC',
      '// 为什么对？SCC 缩点后是 DAG，完成最晚的点一定在 DAG 的"源"端'
    ],
    presets: [
      { id: 'std', label: '3 个 SCC 的有向图', desc: '第一遍拿顺序，第二遍在反图上收割', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, true, SCC_NODES, SCC_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      // 反图
      const radj = {};
      g.nodes.forEach(n => radj[n.id] = []);
      g.edges.forEach(e => radj[e.target].push({ to: e.source, eid: e.id }));

      const vis1 = {}, order = [];
      const dfs1 = (u) => {
        vis1[u] = true;
        b.step('**第一遍** DFS：进入 ' + u + '。', [C.state(u, 'active'), C.badge(u, 'd', '·')], { line: 2 });
        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          if (vis1[link.to]) continue;
          b.step('出边 ' + u + '→' + link.to + '：未访问，继续深入。', [C.edge(link.eid, 'active')], { line: 2 });
          dfs1(link.to);
        }
        order.push(u);
        b.step('**' + u + ' 完成**（它所有能到达的点都处理完了）→ 压入 order。order 现在是 [' + order.join(',') + ']。' +
          '完成时间越晚，越靠近缩点 DAG 的"源"。', [
          C.q('order', 'push', [{ key: u, label: u, meta: '#' + order.length }]),
          C.badge(u, 'f', order.length, true), C.state(u, 'visited')
        ], { line: 2, milestone: u + ' 完成（第 ' + order.length + '）' });
      };

      b.step('Kosaraju 的想法非常对称：**先在原图上 DFS 拿到"完成的先后"，再在反图上按相反顺序 DFS**，每次能搜到的就是一整个 SCC。' +
        '它比 Tarjan 多花一遍 DFS、还要存反图，但思路更容易证明。', [], { line: 1 });

      g.nodes.forEach(n => { if (!vis1[n.id]) dfs1(n.id); });

      b.step('第一遍完成，顺序（栈底→栈顶）：**' + order.join(' → ') + '**。现在建**反图**：把所有边掉个头。' +
        '关键性质：SCC 在反图里不变（环反过来还是环），但 SCC 之间的边方向全反了，于是"从源出发"变成了"从汇出发"。', [],
        { line: 3, milestone: '第一遍完成' });

      const vis2 = {}, sccList = [];
      const COLORS = ['#4F46E5', '#0891B2', '#16A34A', '#D97706', '#DB2777'];
      for (let i = order.length - 1; i >= 0; i--) {
        const u = order[i];
        if (vis2[u]) continue;
        const members = [];
        const st = [u];
        vis2[u] = true;
        while (st.length) {
          const x = st.pop();
          members.push(x);
          radj[x].forEach(l => { if (!vis2[l.to]) { vis2[l.to] = true; st.push(l.to); } });
        }
        const idx = sccList.length;
        sccList.push(members);
        const color = COLORS[idx % COLORS.length];
        const cmds = [C.q('sccs', 'push', [{ key: 's' + idx, label: '{' + members.join(',') + '}', meta: 'SCC#' + (idx + 1) }])];
        members.forEach(w => { cmds.push(C.state(w, 'visited')); cmds.push(C.style(w, { stroke: color, fill: 'rgba(255,255,255,0)', text: null })); });
        cmds.push(C.hull('k' + idx, members, color, 'SCC#' + (idx + 1)));
        b.step('按逆序取到 **' + u + '**（完成时间最晚的未处理点）→ 在**反图**上 DFS，只走得到 **{' + members.join(',') + '}**，' +
          '它们就是一个 SCC。为什么不会漏进别的点？因为 SCC 之间的边在反图里方向相反，从"源"往回走不出去。', cmds,
          { line: 6, milestone: 'SCC#' + (idx + 1) + ' = {' + members.join(',') + '}', stage: true });
      }

      b.step('Kosaraju 结束，同样得到 **' + sccList.length + ' 个 SCC**，与 Tarjan 完全一致（SCC 划分是唯一的）。' +
        '两遍 DFS ⇒ O(V+E)；缺点是必须显式构造反图。', [], { line: 7, milestone: '共 ' + sccList.length + ' 个 SCC', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 3. 割点与桥
   * ============================================================ */
  TGV.register({
    id: 'cut_bridge', name: '割点与桥（删掉就断开的点/边）', category: '图 · 连通性',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'e_bcc',
    panels: [
      { id: 'watch', type: 'table', title: 'dfn / low', columns: [{ key: 'dfn', label: 'dfn' }, { key: 'low', label: 'low' }, { key: 'tag', label: '判定' }] },
      { id: 'res', type: 'list', title: '割点 / 桥' }
    ],
    pseudocode: [
      '// low[v] >= dfn[u] ⇒ u 是割点；low[v] > dfn[u] ⇒ 边 (u,v) 是桥',
      'dfs(u, parent):',
      '    dfn[u] = low[u] = ++timer；child = 0',
      '    for each 邻边 (u, v):',
      '        if v == parent: continue',
      '        if v 未访问:',
      '            dfs(v, u); low[u] = min(low[u], low[v]); child++',
      '            if low[v] > dfn[u]: 边 (u,v) 是桥',
      '            if low[v] >= dfn[u] and u 不是根: u 是割点',
      '        else: low[u] = min(low[u], dfn[v])',
      '    if u 是根 and child >= 2: u 是割点',
      '// 直觉：low[v] 表示 v 的子树有没有"后路"绕过 u 回到祖先'
    ],
    presets: [
      { id: 'std', label: '三角 + 桥 + 三角', desc: 'C、D、F 是割点，C—D 与 F—G 是桥', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, false, CUT_NODES, CUT_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const dfn = {}, low = {}, vis = {}, isCut = {}, isBridge = {};
      g.nodes.forEach(n => { dfn[n.id] = 0; low[n.id] = 0; isCut[n.id] = false; });
      let timer = 0;
      const cuts = [], bridges = [];

      b.step('**割点**：删掉它，图就不连通了。**桥**：删掉它，图就不连通了（边版本）。' +
        'Tarjan 用 `low[v]` 一句话就判完了：`low[v]` 表示「v 的子树最多能"绕"回多早的祖先」。' +
        '如果 `low[v] >= dfn[u]`，说明 v 那一侧**没有后路**能绕过 u 回到 u 的祖先 —— u 就是割点。' +
        '如果 `low[v] > dfn[u]`，连回到 u 本身都做不到 —— 那么 (u,v) 就是桥。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }] });

      const dfs = (u, parent) => {
        dfn[u] = low[u] = ++timer;
        vis[u] = true;
        let child = 0;
        b.step('进入 **' + u + '**（parent = ' + (parent || '无') + '）：`dfn[' + u + '] = low[' + u + '] = ' + dfn[u] + '`。', [
          C.state(u, 'active'), C.badge(u, 'dfn', dfn[u], true),
          C.table('watch', u, 'dfn', dfn[u], true), C.table('watch', u, 'low', low[u])
        ], { line: 3, vars: [{ name: 'u', value: u }] });

        for (let i = 0; i < g.adj[u].length; i++) {
          const link = g.adj[u][i];
          const v = link.to;
          if (v === parent) {
            b.step('邻边 ' + u + '—' + v + '：这是回父亲的那条边，直接跳过（否则会当成环）。', [C.edge(link.eid, 'ghost')], { line: 5 });
            continue;
          }
          if (!vis[v]) {
            b.step('邻边 ' + u + '—' + v + '：' + v + ' 未访问 → 递归下去（这条边是**树边**）。', [
              C.edge(link.eid, 'active'), C.state(v, 'frontier')
            ], { line: 6 });
            dfs(v, u);
            child++;
            if (low[v] < low[u]) low[u] = low[v];
            if (low[v] > dfn[u]) {
              isBridge[link.eid] = true;
              bridges.push(link.eid);
              b.step('**' + v + ' 的子树没有任何后路**：`low[' + v + '] = ' + low[v] + ' > dfn[' + u + '] = ' + dfn[u] + '` → 边 (' + u + ',' + v + ') 是**桥**！' +
                '删掉它，' + v + ' 那一整块就和外界失联了。', [
                C.edge(link.eid, 'conflict'), C.pulse(link.eid, { color: '#DC2626' }),
                C.table('watch', u, 'low', low[u], true), C.table('watch', u, 'tag', '桥 ' + u + v, true),
                C.q('res', 'push', [{ key: 'b' + link.eid, label: '桥 ' + u + '—' + v, meta: 'bridge' }])
              ], { line: 8, milestone: '桥 ' + u + '—' + v });
            } else {
              b.step('回溯：`low[' + u + '] = min(' + low[u] + ', low[' + v + '] = ' + low[v] + ') = ' + low[u] + '`。' +
                (low[v] >= dfn[u] ? '`low[' + v + '] >= dfn[' + u + ']` ⇒ 没有后路绕过 ' + u + '。' : '有后路可以绕回更早的祖先，' + u + ' 不是割点（至少这条边上看）。'), [
                C.edge(link.eid, 'visited'), C.table('watch', u, 'low', low[u], true),
                C.badge(u, 'low', low[u], true)
              ], { line: 7 });
            }
            if (low[v] >= dfn[u] && parent) {
              isCut[u] = true;
              if (cuts.indexOf(u) < 0) {
                cuts.push(u);
                b.step('`low[' + v + '] >= dfn[' + u + ']` 且 ' + u + ' 不是根 → **' + u + ' 是割点**。' +
                  '删掉 ' + u + '，' + v + ' 所在的子树就会被隔出来。', [
                  C.state(u, 'conflict'), C.badge(u, 'cut', '割点', true),
                  C.table('watch', u, 'tag', '割点', true),
                  C.q('res', 'push', [{ key: 'c' + u, label: '割点 ' + u, meta: 'cut' }])
                ], { line: 9, milestone: '割点 ' + u });
              }
            }
          } else {
            if (dfn[v] < low[u]) low[u] = dfn[v];
            b.step('邻边 ' + u + '—' + v + '：' + v + ' 已访问 → 这是一条**回边**（祖先边），用 `dfn[' + v + '] = ' + dfn[v] + '` 更新 low。' +
              '现在 `low[' + u + '] = ' + low[u] + '` —— ' + u + ' 找到了绕过父亲的"后路"。', [
              C.edge(link.eid, 'visited'), C.pulse(link.eid, { color: '#0891B2' }),
              C.badge(u, 'low', low[u], true), C.table('watch', u, 'low', low[u], true)
            ], { line: 10 });
          }
        }
        b.step(u + ' 处理完毕。' + (isCut[u] ? '它已被标记为割点。' : ''), [C.state(u, 'visited')], { line: 11 });
        if (!parent && child >= 2) {
          isCut[u] = true;
          if (cuts.indexOf(u) < 0) cuts.push(u);
          b.step('**根节点特判**：' + u + ' 是 DFS 树的根，它有 ' + child + ' 棵子树 ⇒ 删掉它这些子树就互不相连了 → **' + u + ' 是割点**。' +
            '（根只有一个儿子时不是割点，因为它自己也"挂"在那棵子树上。）', [
            C.state(u, 'conflict'), C.badge(u, 'cut', '割点', true),
            C.q('res', 'push', [{ key: 'c' + u, label: '割点 ' + u, meta: 'cut' }])
          ], { line: 11, milestone: '割点（根）' + u });
        } else if (!parent) {
          b.step('根节点 ' + u + ' 只有 ' + child + ' 棵子树 → **不是割点**。', [], { line: 11 });
        }
      };

      g.nodes.forEach(n => { if (!vis[n.id]) dfs(n.id, null); });

      const cmds = [];
      bridges.forEach(eid => cmds.push(C.edge(eid, 'conflict')));
      cuts.forEach(u => cmds.push(C.state(u, 'conflict')));
      b.step('全部完成。**割点 ' + (cuts.length ? cuts.join('、') : '无') + '**；**桥 ' + (bridges.length ? bridges.join('、') : '无') + '**。' +
        '实用意义很直接：网络里这些点/边就是"单点故障"，加一条备用边（让 low 变小）就能把它们消掉。' +
        '整个过程 O(V+E)，一次 DFS。', cmds, { line: 12, milestone: '割点 ' + cuts.length + ' 个 / 桥 ' + bridges.length + ' 条', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 4. 边双连通分量（缩点）
   * ============================================================ */
  TGV.register({
    id: 'e_bcc', name: '边双连通分量（删掉所有桥后缩点）', category: '图 · 连通性',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'cut_bridge',
    panels: [
      { id: 'comp', type: 'list', title: '边双分量' },
      { id: 'watch', type: 'table', title: '标记', columns: [{ key: 'id', label: '所属分量' }, { key: 'tag', label: '备注' }] }
    ],
    pseudocode: [
      '// 边双连通分量：任意两点间存在两条"边不重复"的路径',
      '第 1 步：Tarjan 找出所有桥',
      '第 2 步：把所有桥删掉（或标记为不可走）',
      '第 3 步：剩下的连通块就是各个边双分量',
      '// 把每个分量缩成一个点，得到一棵树（桥就是树边）',
      '// 所以：边双缩点后一定是树，树的每条边都是原图的桥'
    ],
    presets: [
      { id: 'std', label: '三角 + 桥 + 三角 + 尾', desc: '缩点后变成一条 3 个点的链', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, false, CUT_NODES, CUT_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const dfn = {}, low = {}, vis = {}, bridge = {};
      g.nodes.forEach(n => { dfn[n.id] = 0; low[n.id] = 0; });
      let timer = 0;
      const bridges = [];

      const dfs = (u, pe) => {
        dfn[u] = low[u] = ++timer;
        vis[u] = true;
        g.adj[u].forEach(link => {
          if (link.eid === pe) return;
          const v = link.to;
          if (!vis[v]) {
            dfs(v, link.eid);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > dfn[u]) { bridge[link.eid] = true; bridges.push(link.eid); }
          } else {
            low[u] = Math.min(low[u], dfn[v]);
          }
        });
      };

      b.step('**边双连通分量（e-BCC）**的定义：分量内任意两点之间都有**两条边不重复**的路径 —— 换句话说，删掉任意**一条**边都不会断开。' +
        '所以边双分量的边界，正好就是**桥**。算法只有三步：找桥 → 删桥 → 剩下的连通块就是答案。', [], { line: 1 });

      b.step('第 1 步：Tarjan 找桥（同上一节）。', [], { line: 2 });
      g.nodes.forEach(n => { if (!vis[n.id]) dfs(n.id, null); });
      b.step('找出 **' + bridges.length + ' 条桥**：' + (bridges.length ? bridges.join('、') : '无') + '。', [
        C.edge(bridges[0], 'conflict')
      ].concat(bridges.map(e => C.edge(e, 'conflict'))), { line: 2, milestone: bridges.length + ' 条桥' });

      b.step('第 2 步：把桥标成"不可走"，然后做一次 flood fill。', [], { line: 3 });
      const comp = {}, comps = [];
      const COLORS = ['#4F46E5', '#0891B2', '#16A34A', '#D97706', '#DB2777'];
      g.nodes.forEach(n => {
        if (comp[n.id] !== undefined) return;
        const members = [];
        const st = [n.id];
        comp[n.id] = comps.length;
        while (st.length) {
          const x = st.pop();
          members.push(x);
          g.adj[x].forEach(link => {
            if (bridge[link.eid]) return;
            if (comp[link.to] === undefined) { comp[link.to] = comps.length; st.push(link.to); }
          });
        }
        const idx = comps.length;
        comps.push(members);
        const color = COLORS[idx % COLORS.length];
        const cmds = [];
        members.forEach(w => {
          cmds.push(C.badge(w, 'id', 'C' + (idx + 1)));
          cmds.push(C.style(w, { stroke: color, fill: 'rgba(255,255,255,0)', text: null }));
          cmds.push(C.table('watch', w, 'id', 'C' + (idx + 1), true));
        });
        cmds.push(C.hull('c' + idx, members, color, 'C' + (idx + 1)));
        cmds.push(C.q('comp', 'push', [{ key: 'c' + idx, label: 'C' + (idx + 1) + ' {' + members.join(',') + '}', meta: members.length + ' 点' }]));
        b.step('从 ' + n.id + ' 出发、**不走桥**能到达的集合是 **{' + members.join(',') + '}** → 一个边双分量 **C' + (idx + 1) + '**。', cmds,
          { line: 4, milestone: 'C' + (idx + 1) + ' = {' + members.join(',') + '}' });
      });

      const cmds = [C.clearHull('tree')];
      bridges.forEach(e => cmds.push(C.edge(e, 'path')));
      b.step('缩点结果：**' + comps.length + ' 个边双分量**，用 ' + bridges.length + ' 条桥把它们连起来。' +
        '由于分量之间只能靠桥相连，缩点后的图必然是一棵**树**（或森林）—— 这也解释了为什么「边双缩点」是处理桥问题的标准套路。' +
        '顺带一提：**点双连通**缩出来的是圆方树，因为割点可能属于多个分量，需要用"方点"来代表分量。', cmds,
        { line: 5, milestone: '缩点后 ' + comps.length + ' 个点 / ' + bridges.length + ' 条树边', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 5. 2-SAT
   * ============================================================ */
  const SAT_NODES = [
    ['x1', 150, 130], ['¬x1', 150, 400],
    ['x2', 380, 110], ['¬x2', 380, 420],
    ['x3', 620, 140], ['¬x3', 620, 400]
  ];
  const SAT_EDGES = [
    ['¬x1', 'x2', 0], ['¬x2', 'x1', 0],
    ['x1', 'x3', 0], ['¬x3', '¬x1', 0],
    ['x2', '¬x3', 0], ['x3', '¬x2', 0]
  ];

  TGV.register({
    id: 'two_sat', name: '2-SAT（蕴含图 + SCC 判可满足）', category: '图 · 连通性',
    layout: 'geo', directed: true, acceptsGraph: false,
    compareWith: 'tarjan_scc',
    panels: [
      { id: 'clauses', type: 'list', title: '子句 → 蕴含边' },
      { id: 'stk', type: 'stack', title: 'Tarjan 栈' },
      { id: 'res', type: 'text', title: '结论' }
    ],
    pseudocode: [
      '// 每个子句 (a ∨ b) 等价于两条蕴含：¬a → b 且 ¬b → a',
      '建蕴含图：2n 个节点（x 与 ¬x）',
      '    addEdge(not(a), b); addEdge(not(b), a)',
      '// 求 SCC',
      'for each 变量 x:',
      '    if comp[x] == comp[¬x]: 无解（x 必须既可真又可假）',
      '// 有解时：按 SCC 的拓扑序赋值',
      '    x = true  当 comp[x] 在缩点图中更靠"后"（拓扑序更大）',
      '// 道理：若 ¬x 能推出 x，就该选 x'
    ],
    presets: [
      { id: 'sat', label: '可满足：(x1∨x2) ∧ (¬x1∨x3) ∧ (¬x2∨¬x3)', desc: '两个 SCC，无矛盾', data: () => ({ sat: true }) },
      { id: 'unsat', label: '不可满足：(x1∨x1) ∧ (¬x1∨¬x1)', desc: 'x1 与 ¬x1 落到同一个 SCC，直接矛盾', data: () => ({ sat: false }) }
    ],
    run(input) {
      const sat = input.sat !== false;
      const custom = !!(input && input.custom && input.nodes && input.edges);
      const nodeArr = custom
        ? input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300])
        : (sat ? SAT_NODES : [['x1', 220, 250], ['¬x1', 520, 250]]);
      const edgeArr = custom
        ? input.edges.map(e => [String(e.source), String(e.target), 0])
        : (sat ? SAT_EDGES : [['x1', '¬x1', 0], ['¬x1', 'x1', 0]]);
      const g = TGV.GraphLib.mkGraph(nodeArr, edgeArr, { directed: true });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const clauses = custom
        ? (input.clauses || [])
        : (sat
            ? ['(x1 ∨ x2)', '(¬x1 ∨ x3)', '(¬x2 ∨ ¬x3)']
            : ['(x1 ∨ x1)', '(¬x1 ∨ ¬x1)']);

      b.step('2-SAT 要解的是：每个子句都是「两个文字取或」，问有没有一组真假赋值让它们全部成立。' +
        '关键转化：**(a ∨ b) 等价于 ¬a → b**，也等价于 ¬b → a。于是逻辑问题变成了图论问题 —— 在蕴含图上求 SCC。', [],
        { line: 1, vars: [{ name: '子句数', value: clauses.length }] });

      const cmds = [];
      clauses.forEach((c, i) => cmds.push(C.q('clauses', 'push', [{ key: 'c' + i, label: c, meta: '2 条蕴含' }])));
      cmds.push(C.q('stk', 'clear'));
      b.step('本题的子句：**' + clauses.join(' ∧ ') + '**。原图的 6 条边已经是转化后的蕴含边（每条子句贡献 2 条）：' +
        (sat ? '¬x1→x2、¬x2→x1；x1→x3、¬x3→¬x1；x2→¬x3、x3→¬x2。' : 'x1→¬x1、¬x1→x1。'), cmds,
        { line: 2, milestone: '蕴含图已建好' });

      // Tarjan
      const dfn = {}, low = {}, inStack = {}, comp = {};
      g.nodes.forEach(n => { dfn[n.id] = 0; low[n.id] = 0; inStack[n.id] = false; comp[n.id] = -1; });
      let timer = 0;
      const stack = [];
      const sccList = [];
      const dfs = (u) => {
        dfn[u] = low[u] = ++timer;
        stack.push(u); inStack[u] = true;
        g.adj[u].forEach(link => {
          const v = link.to;
          if (dfn[v] === 0) { dfs(v); low[u] = Math.min(low[u], low[v]); }
          else if (inStack[v]) low[u] = Math.min(low[u], dfn[v]);
        });
        if (low[u] === dfn[u]) {
          const members = [];
          while (stack.length) {
            const w = stack.pop(); inStack[w] = false; members.push(w);
            if (w === u) break;
          }
          const idx = sccList.length;
          members.forEach(w => comp[w] = idx);
          sccList.push(members);
        }
      };
      g.nodes.forEach(n => { if (dfn[n.id] === 0) dfs(n.id); });

      b.step('对蕴含图跑 Tarjan，得到 **' + sccList.length + ' 个 SCC**：' +
        sccList.map((s, i) => 'SCC#' + (i + 1) + '{' + s.join(',') + '}').join('、') + '。', [
        C.q('stk', 'clear')
      ].concat(g.nodes.map(n => C.badge(n.id, 'scc', '#' + (comp[n.id] + 1)))), { line: 4, milestone: 'SCC 划分完成', stage: true });

      // 检查矛盾
      let bad = null;
      g.nodes.forEach(n => {
        const id = n.id;
        const neg = id.charAt(0) === '¬' ? id.slice(1) : '¬' + id;
        if (g.nodes.some(m => m.id === neg) && comp[id] === comp[neg] && bad === null) bad = id;
      });

      if (bad) {
        const neg = bad.charAt(0) === '¬' ? bad.slice(1) : '¬' + bad;
        b.step('💥 **' + bad + ' 和 ' + neg + ' 落在同一个 SCC 里** —— 意味着 ' + bad + ' → … → ' + neg + ' → … → ' + bad + '，' +
          '「' + bad + ' 为真」能推出「' + bad + ' 为假」。这在逻辑上不可能成立，所以**无解**。', [
          C.state(bad, 'conflict'), C.state(neg, 'conflict'),
          C.hull('bad', [bad, neg], '#DC2626', '矛盾'),
          C.text('res', ['UNSAT', '', bad + ' 与 ' + neg + ' 同属 SCC#' + (comp[bad] + 1), '⇒ 无解'])
        ], { line: 6, milestone: '不可满足', stage: true });
      } else {
        const cmds2 = [];
        const assign = {};
        g.nodes.forEach(n => {
          const id = n.id;
          if (id.charAt(0) === '¬') return;
          const neg = '¬' + id;
          const hasNeg = g.nodes.some(m => m.id === neg);
          const val = hasNeg ? comp[id] > comp[neg] : true;
          assign[id] = val;
        });
        g.nodes.forEach(n => {
          const id = n.id;
          const base = id.charAt(0) === '¬' ? id.slice(1) : id;
          const isTrue = id.charAt(0) === '¬' ? !assign[base] : assign[base];
          cmds2.push(C.state(id, isTrue ? 'path' : 'ghost'));
          cmds2.push(C.badge(id, 'v', isTrue ? 'T' : 'F', true));
        });
        b.step('没有变量和它的否定同属一个 SCC ⇒ **可满足**。赋值规则：比较两个 SCC 的编号（Tarjan 先弹出的是"汇"端，编号越大拓扑序越靠前），' +
          '取 **x = true 当 comp[x] 的拓扑序更靠后** —— 因为若 ¬x 能推出 x，就该选 x。得到的解是：' +
          Object.keys(assign).map(k => k + ' = ' + (assign[k] ? 'true' : 'false')).join('，') + '。', cmds2.concat([
          C.text('res', ['SAT', ''].concat(Object.keys(assign).map(k => k + ' = ' + (assign[k] ? 'T' : 'F'))).concat(['', '校验：' + clauses.join(' ∧ ') + ' 全部为真']))
        ]), { line: 8, milestone: '可满足', stage: true });

        const check = clauses.map(c => {
          const parts = c.replace(/[()]/g, '').split('∨').map(s => s.trim());
          return parts.some(p => {
            const neg = p.charAt(0) === '¬';
            const base = neg ? p.slice(1) : p;
            return neg ? !assign[base] : assign[base];
          });
        });
        b.step('逐条验证：' + clauses.map((c, i) => c + ' = ' + (check[i] ? '真' : '假')).join('；') + '。' +
          '2-SAT 的优美之处在于：**它把 NP 问题的一个特例，化归成了线性时间可解的 SCC 判定**。3-SAT 就没有这种好运（NP 完全）。', [],
          { line: 9, milestone: '赋值校验通过', stage: true });
      }

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 6. 欧拉回路（Hierholzer）
   * ============================================================ */
  const EULER_NODES = [['A', 160, 160], ['B', 420, 120], ['C', 660, 220], ['D', 560, 420], ['E', 280, 420]];
  const EULER_EDGES = [['A', 'B', 1], ['B', 'C', 2], ['C', 'D', 3], ['D', 'E', 4], ['E', 'A', 5], ['A', 'C', 6], ['A', 'D', 7], ['B', 'D', 8]];

  TGV.register({
    id: 'euler', name: '欧拉回路（一笔画 · Hierholzer）', category: '图 · 连通性',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'cut_bridge',
    panels: [
      { id: 'stk', type: 'stack', title: '当前路径栈' },
      { id: 'circuit', type: 'list', title: '欧拉回路（逆序拼装）' },
      { id: 'deg', type: 'list', title: '度数（必须全为偶数）' }
    ],
    pseudocode: [
      '// 欧拉回路：每条边恰好走一次并回到起点。存在 ⇔ 连通且所有点度数为偶',
      'dfs(u):',
      '    while u 还有未走过的边 (u,v):',
      '        标记这条边走过了',
      '        dfs(v)',
      '    把 u 压入栈          // 回溯时才记录，这是 Hierholzer 的精髓',
      '从起点 dfs；栈的逆序就是欧拉回路',
      '// 为什么回溯时记录？因为"死路"一定是最后才走完的那条支路'
    ],
    presets: [
      { id: 'std', label: '8 条边 · 所有点度数为偶', desc: '一笔画完并回到 A', data: () => ({ s: 'A' }) }
    ],
    run(input) {
      const g = mk(input, false, EULER_NODES, EULER_EDGES);
      const panels = this.panels.map(p => (p.type === 'list' && p.id === 'deg'
        ? { id: 'deg', type: 'list', title: '度数（必须全为偶数）' } : p));
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: panels });
      const deg = {};
      g.nodes.forEach(n => deg[n.id] = 0);
      g.edges.forEach(e => { deg[e.source]++; deg[e.target]++; });
      const used = {};
      const stack = [];
      const circuit = [];
      const s = input.s || g.nodes[0].id;

      b.step('欧拉回路（一笔画）要求：**每条边恰好走一次，最后回到起点**。' +
        '存在条件是「图连通 + 所有点度数为偶数」—— 因为每进一次就必须出一次，进出必须配对。', [],
        { line: 1, vars: [{ name: 'E', value: g.edges.length }] });

      const degCmds = g.nodes.map(n => C.q('deg', 'push', [{ key: n.id, label: n.id, meta: 'deg=' + deg[n.id] }]));
      const odd = g.nodes.filter(n => deg[n.id] % 2 === 1);
      b.step('各点度数：' + g.nodes.map(n => n.id + '=' + deg[n.id]).join('，') + '。' +
        (odd.length ? '**有 ' + odd.length + ' 个奇度点 ⇒ 不存在欧拉回路**（但存在欧拉路径）。' : '**全部为偶数 ⇒ 欧拉回路存在**。'),
        degCmds, { line: 1, milestone: odd.length ? '奇度点 ' + odd.length + ' 个' : '度数为偶，可行' });

      const dfs = (u) => {
        b.step('进入 **' + u + '**：从它出发找第一条没走过的边。', [
          C.state(u, 'active'), C.badge(u, 'deg', deg[u])
        ], { line: 2 });
        while (true) {
          let pick = null;
          for (let i = 0; i < g.adj[u].length; i++) {
            const link = g.adj[u][i];
            if (!used[link.eid]) { pick = link; break; }
          }
          if (!pick) break;
          used[pick.eid] = true;
          deg[u]--; deg[pick.to]--;
          b.step('走边 **(' + u + ',' + pick.to + ')**（标记为已走），继续深入 —— **回溯时才会记录节点**，这是 Hierholzer 的精髓。', [
            C.edge(pick.eid, 'visited'), C.pulse(pick.eid, { color: '#4F46E5' }),
            C.push('stk', { label: 'dfs(' + u + ')', meta: '→' + pick.to })
          ], { line: 4 });
          dfs(pick.to);
        }
        stack.push(u);
        b.step('**' + u + ' 已经没有未走的边了** → 把 ' + u + ' 压入结果栈，回溯。' +
          '注意：一个点"走投无路"的时刻，正是它在欧拉回路上该出现的位置。', [
          C.pop('stk', 1),
          C.q('circuit', 'push', [{ key: u, label: u, meta: '#' + stack.length }]),
          C.state(u, 'visited')
        ], { line: 6, milestone: u + ' 入结果栈', vars: [{ name: 'u', value: u }] });
      };

      dfs(s);

      const tour = stack.slice().reverse();
      const cmds = [];
      for (let i = 0; i + 1 < tour.length; i++) {
        const e = g.edges.find(x => (x.source === tour[i] && x.target === tour[i + 1]) || (x.source === tour[i + 1] && x.target === tour[i]));
        if (e) { cmds.push(C.edge(e.id, 'path')); }
      }
      tour.forEach(n => cmds.push(C.state(n, 'path')));
      b.step('把栈**逆序**读出：**' + tour.join(' → ') + '**，共走了 ' + (tour.length - 1) + ' 条边（图中一共 ' + g.edges.length + ' 条）。' +
        '每条边恰好一次，回到了起点 —— 这就是欧拉回路。复杂度 O(E)，因为每条边只被检查、删除一次。', cmds,
        { line: 7, milestone: '欧拉回路 ' + tour.length + ' 个点', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

  /* ============================================================
   * 7. 图着色（Welsh-Powell 贪心）
   * ============================================================ */
  const COLOR_NODES = [
    ['A', 380, 100], ['B', 590, 200], ['C', 520, 400], ['D', 250, 400], ['E', 170, 200], ['F', 380, 260]
  ];
  const COLOR_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'], ['F', 'A'], ['F', 'B'], ['F', 'C'], ['F', 'D'], ['F', 'E']];
  const CCOLORS = [
    { fill: '#DBEAFE', stroke: '#2563EB', text: '#1E3A8A' },
    { fill: '#FEE2E2', stroke: '#DC2626', text: '#7F1D1D' },
    { fill: '#DCFCE7', stroke: '#16A34A', text: '#14532D' },
    { fill: '#FEF3C7', stroke: '#D97706', text: '#78350F' },
    { fill: '#F3E8FF', stroke: '#9333EA', text: '#581C87' }
  ];
  const CNAMES = ['蓝', '红', '绿', '橙', '紫'];

  TGV.register({
    id: 'graph_color', name: '图着色（Welsh-Powell 贪心 + 轮图）', category: '图 · 连通性',
    layout: 'geo', directed: false, acceptsGraph: true,
    compareWith: 'two_sat',
    panels: [
      { id: 'groups', type: 'list', title: '颜色分组' },
      { id: 'order', type: 'list', title: '按度数降序的处理顺序' }
    ],
    pseudocode: [
      '// 相邻点不能同色；最少需要几种颜色 = 色数 χ(G)',
      '把点按度数从大到小排序（Welsh-Powell 启发式）',
      'for each 点 u in 排序:',
      '    S = { 邻居已经用过的颜色 }',
      '    给 u 分配 S 之外最小的颜色编号',
      '// 贪心用的是"当前最优"，不保证最少色数',
      '// 但平面图有四色定理：χ(G) ≤ 4；奇环 χ=3，完全图 Kn 的 χ=n'
    ],
    presets: [
      { id: 'wheel', label: '轮图 W5（中心 + 5 边形）', desc: '需要 4 色：中心 1 色 + 外圈 3 色', data: () => ({}) }
    ],
    run(input) {
      const g = mk(input, false, COLOR_NODES, COLOR_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const deg = {};
      g.nodes.forEach(n => deg[n.id] = 0);
      g.edges.forEach(e => { deg[e.source]++; deg[e.target]++; });
      const order = g.nodes.slice().sort((x, y) => deg[y.id] - deg[x.id] || String(x.id).localeCompare(String(y.id)));
      const color = {};
      const groups = [];

      b.step('**图着色**：给每个点涂颜色，要求相邻点颜色不同。最少需要的颜色数叫**色数 χ(G)**，求它是 NP 难的；' +
        '但「贪心 + 合理顺序」往往能给出不错的近似。本节用的是 **Welsh-Powell**：优先处理度数大的点 —— 它们限制最多，先安排。', [],
        { line: 1, vars: [{ name: 'V', value: g.nodes.length }, { name: 'E', value: g.edges.length }] });

      b.step('度数：' + g.nodes.map(n => n.id + '(' + deg[n.id] + ')').join('、') + ' → 处理顺序 **' + order.map(n => n.id).join(' → ') + '**。',
        order.map(n => C.q('order', 'push', [{ key: n.id, label: n.id, meta: 'deg=' + deg[n.id] }])),
        { line: 2, milestone: '按度数排序完成' });

      for (let i = 0; i < order.length; i++) {
        const u = order[i].id;
        const usedBy = {};
        g.adj[u].forEach(l => { if (color[l.to] !== undefined) usedBy[color[l.to]] = l.to; });
        let c = 0;
        while (usedBy[c] !== undefined) c++;
        color[u] = c;
        if (!groups[c]) groups[c] = [];
        groups[c].push(u);
        const st = CCOLORS[c % CCOLORS.length];
        const cmds = [
          C.style(u, { fill: st.fill, stroke: st.stroke, text: st.text }),
          C.badge(u, 'c', c + 1, true),
          C.q('groups', 'set', groups.map((arr, ci) => ({ key: 'g' + ci, label: CNAMES[ci] + ' #' + (ci + 1), meta: arr.join(',') })))
        ];
        g.adj[u].forEach(l => { if (color[l.to] === c) cmds.push(C.edge(l.eid, 'conflict')); });
        b.step('给 **' + u + '** 涂色：邻居已经用了 ' + (Object.keys(usedBy).length ? Object.keys(usedBy).map(k => '#' + (+k + 1) + '(' + usedBy[k] + ')').join('、') : '（还没有邻居上色）') +
          ' → 最小可用颜色是 **' + CNAMES[c] + ' #' + (c + 1) + '**。', cmds,
          { line: 5, milestone: u + ' → 颜色 #' + (c + 1), stage: i === order.length - 1 });
      }

      const k = groups.filter(Boolean).length;
      b.step('着色完成，共用了 **' + k + ' 种颜色**。' +
        '这个轮图（中心 F + 5 边形）的色数正好是 4：外圈奇环需要 3 色，中心与所有外圈点相邻，必须第 4 色。' +
        '想验证「是不是最少」通常得靠回溯/分支限界；而**四色定理**告诉我们，任何平面图 4 色一定够。', [],
        { line: 7, milestone: '共用 ' + k + ' 色', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: g.directed };
    }
  });

})();
