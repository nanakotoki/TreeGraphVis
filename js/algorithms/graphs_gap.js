/* ============================================================
 * 第二卷 · 规范清单补齐（图）
 *   #40 图的四种表示：链式前向星 head[]/to[]/nxt[]/w[] 指针跳转
 *   #49 A* 四种启发式同图对比（曼哈顿 / 欧氏 / 切比雪夫 / 零启发）
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  const finish = b => ({ nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels });

  /* ============================================================
   * 1. 链式前向星（数组模拟邻接表）
   * ============================================================ */
  const FS_NODES = [['1', 300, 120], ['2', 620, 120], ['3', 300, 330], ['4', 620, 330], ['5', 460, 520]];
  const FS_EDGES = [['1', '2', 4], ['1', '3', 2], ['2', '3', 1], ['2', '4', 5], ['3', '4', 8], ['3', '5', 10], ['4', '5', 2]];

  TGV.register({
    id: 'forward_star', name: '链式前向星（head / to / nxt 指针跳转）', category: '图 · 基础',
    layout: 'fixed', directed: true,
    compareWith: 'graph_repr',
    panels: [
      { id: 'head', type: 'table', title: 'head[u]：每个点的第一条出边', columns: [{ key: 'h', label: 'head' }] },
      { id: 'to', type: 'array', title: 'to[i]：第 i 条边的终点' },
      { id: 'nxt', type: 'array', title: 'nxt[i]：同起点的下一条边' },
      { id: 'w', type: 'array', title: 'w[i]：边权' }
    ],
    pseudocode: [
      '// 链式前向星：用 4 个平行数组模拟"邻接表"，是竞赛里最常用的存图方式',
      '// 没有指针、没有 vector，遍历时靠下标跳转，缓存友好',
      'add(u, v, w):',
      '    to[++tot] = v',
      '    wt[tot]  = w',
      '    nxt[tot] = head[u]      // 新边"头插"到 u 的链表最前面',
      '    head[u]  = tot          // head[u] 永远指向最新插入的那条边',
      'traverse(u):',
      '    for (i = head[u]; i != -1; i = nxt[i]):',
      '        v = to[i]; w = wt[i]',
      '        // 访问边 u → v（代价 w）',
      '// 注意：头插法导致遍历顺序与输入顺序【相反】—— 这是链式前向星的经典特征'
    ],
    presets: [
      { id: 'build', label: '建图 + 沿指针遍历 1 的出边', desc: '观察 head[1] 如何被反复覆盖、nxt 如何串成链', data: () => ({ from: '1' }) },
      { id: 'v3', label: '从点 3 出发遍历', desc: '同样的结构，换一个起点看指针链', data: () => ({ from: '3' }) },
      { id: 'v4', label: '从点 4 出发（只有一条出边）', desc: 'head[4] 直接就是唯一一条边', data: () => ({ from: '4' }) }
    ],
    run(input) {
      const custom = !!(input && input.custom && input.nodes && input.edges);
      const edgesIn = custom
        ? input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1])
        : FS_EDGES;
      const g = custom
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            edgesIn, { directed: true })
        : TGV.GraphLib.mkGraph(FS_NODES, FS_EDGES, { directed: true });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const ids = g.nodes.map(n => n.id);
      const m = edgesIn.length;
      const to = new Array(m).fill('-'), wt = new Array(m).fill('-'), nxt = new Array(m).fill('-');
      const head = {};
      ids.forEach(id => { head[id] = -1; });
      const syncArr = (cmds) => {
        cmds.push(C.array('to', to, [], Array.from({ length: m }, (_, i) => String(i))));
        cmds.push(C.array('nxt', nxt, [], Array.from({ length: m }, (_, i) => String(i))));
        cmds.push(C.array('w', wt, [], Array.from({ length: m }, (_, i) => String(i))));
        ids.forEach(id => cmds.push(C.table('head', id, 'h', head[id])));
        return cmds;
      };
      b.step('**链式前向星**是竞赛存图的标准写法：4 个平行数组 `head / to / nxt / w`，' +
        '用**下标代替指针**把每个点的所有出边串成一条链表。它比 `vector<vector<Edge>>` 快，' +
        '因为没有指针跳转、内存连续、常数极小。', syncArr([]), { line: 1 });
      b.step('初始化：`head[u] = -1`（-1 表示"没有边"，即空链表尾）。`to / nxt / w` 全部留空，' +
        '每条边插入时才占用一个下标。', syncArr([]), { line: 1, stage: true });
      edgesIn.forEach(([u, v, w], i) => {
        const eid = u + '>' + v;
        const oldHead = head[u];
        b.step('**插入第 ' + i + ' 条边** ' + u + ' → ' + v + '（权 ' + w + '）。三步走：' +
          '`to[' + i + '] = ' + v + '`、`w[' + i + '] = ' + w + '`，然后是关键的**头插**：' +
          '`nxt[' + i + '] = head[' + u + '] = ' + oldHead + '`，`head[' + u + '] = ' + i + '`。', [
          C.pulse(eid), C.state(u, 'active')
        ], { line: 3, vars: [{ name: 'tot', value: i }] });
        to[i] = v; wt[i] = w; nxt[i] = oldHead; head[u] = i;
        const cm = syncArr([]);
        cm.push(C.array('to', to, [i], Array.from({ length: m }, (_, k) => String(k))));
        cm.push(C.array('nxt', nxt, [i], Array.from({ length: m }, (_, k) => String(k))));
        cm.push(C.table('head', u, 'h', i, true));
        cm.push(C.edgeColor(eid, '#F97316', false, 2.6));
        b.step('插入完成：点 ' + u + ' 的链表头现在是第 ' + i + ' 条边，它"接"住了原来的头 ' + oldHead + '。' +
          '**每次插入只改两个数（nxt[i]、head[u]），O(1)** —— 这就是链式前向星快的根本原因。', cm,
        { line: 7, milestone: '插入边 ' + u + '→' + v + '（#i=' + i + '）' });
      });
      const cmDone = syncArr([]);
      b.step('7 条边全部插入完毕。右栏能看到三件事：`to / w` 按**输入顺序**排列（一条边一个下标）；' +
        '`nxt` 存的是"同起点的下一条边的下标"；`head[u]` 指向 u 的最新一条边。' +
        '三个数组配合起来，就等价于一个邻接表。', cmDone, { line: 7, milestone: '建图完成', stage: true });

      /* ---- 遍历 ---- */
      const from = input.from || '1';
      b.step('现在**遍历点 ' + from + ' 的所有出边**：`for (i = head[' + from + ']; i != -1; i = nxt[i])`。' +
        '整个过程只有一次数组下标访问和一次跳转，没有任何动态内存。', [
        C.state(from, 'path'), C.table('head', from, 'h', head[from], true)
      ], { line: 8, vars: [{ name: 'u', value: from }] });
      let i = head[from], guard = 0;
      const seq = [];
      while (i !== -1 && guard++ < 20) {
        const v = to[i];
        seq.push(to[i]);
        const c = [
          C.pulse(from + '>' + v), C.state(v, 'visited'),
          C.array('to', to, [i], Array.from({ length: m }, (_, k) => String(k))),
          C.array('nxt', nxt, [i], Array.from({ length: m }, (_, k) => String(k)))
        ];
        b.step('`i = ' + i + '` → 读出 `to[' + i + '] = ' + v + '`、`w[' + i + '] = ' + wt[i] + '`，' +
          '这就是一条边 **' + from + ' → ' + v + '**。接着 `i = nxt[' + i + '] = ' + nxt[i] + '` 跳向下一条。', c,
        { line: 9, vars: [{ name: 'i', value: i }, { name: 'v', value: v }] });
        i = nxt[i];
      }
      b.step('`i` 变成 **-1**，空链表尾，遍历结束。从点 ' + from + ' 出发的边依次是：**' +
        seq.join(' → ') + '**。' +
        '**注意这个顺序与输入顺序相反** —— 因为头插法每次都把新边塞到最前面。' +
        '想按输入顺序遍历，要么倒着建图，要么改用"尾插 + 额外记录 last[]"。', [
        C.state(from, 'path')
      ], { line: 10, milestone: '遍历顺序：' + seq.join('→') });
      b.step('**四种表示方式的位置**：矩阵适合稠密图与 Floyd（O(1) 查边，O(V²) 空间）；' +
        '邻接表适合大多数遍历；边集适合 Kruskal（按边处理）；**链式前向星 = 邻接表的数组实现**，' +
        '空间 O(V+E)、常数最小，是竞赛默认选择。它们存的是同一张图，只是"索引结构"不同。', [], { line: 11 });
      return finish(b);
    }
  });

  /* ============================================================
   * 2. A* 四种启发式同图对比
   * ============================================================ */
  const GRID_COLS = 4, GRID_ROWS = 3;
  const CELL_W = 168, CELL_H = 132;
  const gNodes = [], gEdges = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const id = String.fromCharCode(65 + r) + (c + 1);
      gNodes.push([id, 150 + c * CELL_W, 130 + r * CELL_H, id]);
    }
  }
  const gid = (r, c) => String.fromCharCode(65 + r) + (c + 1);
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (c + 1 < GRID_COLS) gEdges.push([gid(r, c), gid(r, c + 1), (r + c) % 3 === 0 ? 5 : 1]);
      if (r + 1 < GRID_ROWS) gEdges.push([gid(r, c), gid(r + 1, c), (r * c) % 4 === 0 ? 4 : 1]);
    }
  }
  const HS = [
    { id: 'man', name: '曼哈顿距离 |dx|+|dy|', fn: (a, c) => Math.abs(a.c - c.c) + Math.abs(a.r - c.r) },
    { id: 'euc', name: '欧氏距离 √(dx²+dy²)', fn: (a, c) => Math.hypot(a.c - c.c, a.r - c.r) },
    { id: 'cheb', name: '切比雪夫 max(|dx|,|dy|)', fn: (a, c) => Math.max(Math.abs(a.c - c.c), Math.abs(a.r - c.r)) },
    { id: 'zero', name: '零启发 h ≡ 0（退化为 Dijkstra）', fn: () => 0 }
  ];

  TGV.register({
    id: 'astar_heur', name: 'A* · 四种启发式同图对比', category: '图 · 最短路径',
    layout: 'fixed', directed: false,
    compareWith: 'astar',
    panels: [
      { id: 'res', type: 'table', title: '四种启发式对比', columns: [{ key: 'exp', label: '扩展点数' }, { key: 'len', label: '路径代价' }, { key: 'ok', label: '最优' }] },
      { id: 'open', type: 'list', title: '当前 Open 集（按 f 排序）' }
    ],
    pseudocode: [
      '// A* 的 f = g + h。g 是已走的真实代价，h 是对剩余距离的"猜测"',
      '// h 的选取决定了搜索的"形状"：越准，扩展的点越少；h ≡ 0 就退化成 Dijkstra',
      'astar(s, t, h):',
      '    g[s] = 0; open = {(f(s), s)}',
      '    while open 非空:',
      '        u = open 中 f 最小的点                    // 优先队列',
      '        if u == t: return g[t]                 // 首次弹出终点即最优',
      '        for (v, w) in adj[u]:',
      '            if g[u] + w < g[v]:                // 松弛',
      '                g[v] = g[u] + w; fa[v] = u',
      '                f[v] = g[v] + h(v, t); open.add(v)',
      '// 关键：h 必须是"可采纳的"（不高估真实剩余距离），否则答案会错'
    ],
    presets: [
      { id: 'all', label: '四种启发式依次跑（A1 → C4）', desc: '同图同起终点，只换 h，对比扩展点数', data: () => ({}) }
    ],
    run() {
      const g = TGV.GraphLib.mkGraph(gNodes, gEdges, { directed: false });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const pos = {};
      gNodes.forEach(([id, x, y]) => { pos[id] = { x, y, r: id.charCodeAt(0) - 65, c: parseInt(id.slice(1), 10) - 1 }; });
      const S = 'A1', T = 'C4';
      const adj = {};
      g.nodes.forEach(n => { adj[n.id] = []; });
      gEdges.forEach(([u, v, w]) => {
        adj[u].push({ v, w, eid: u + '>' + v });
        adj[v].push({ v: u, w, eid: u + '>' + v });
      });
      b.step('同一张 4×3 带权网格图，起点 **A1**、终点 **C4**。下面依次用四种启发式跑 A*：' +
        '**曼哈顿 / 欧氏 / 切比雪夫 / 零启发**。图、起终点、边权全都一样，**唯一的变量是 h**。' +
        '观察每种 h 之下"被扩展的点"有多少 —— 这就是启发式质量的直接度量。', [
        C.state(S, 'active'), C.state(T, 'conflict')
      ], { line: 1, milestone: '起点 A1 → 终点 C4', stage: true });

      const results = [];
      HS.forEach((H, hi) => {
        // 重置状态
        const reset = [];
        g.nodes.forEach(n => reset.push(C.state(n.id, 'default')));
        reset.push(C.state(S, 'active'), C.state(T, 'conflict'));
        b.step('**第 ' + (hi + 1) + '/4 种：' + H.name + '**。清空上一轮的标记，重新开始。' +
          (H.id === 'zero' ? '这一种 h 恒等于 0，f = g，**完全等价于 Dijkstra** —— 它是"没有信息"的基准线。' : ''),
        reset, { line: 2, milestone: '启发式：' + H.name, stage: true });

        const gd = {}, fa = {}, closed = {};
        g.nodes.forEach(n => { gd[n.id] = Infinity; });
        gd[S] = 0;
        const open = [{ id: S, f: H.fn(pos[S], pos[T]) }];
        let expanded = 0, guard = 0, done = false;
        const order = [];
        while (open.length && guard++ < 60 && !done) {
          open.sort((a, c) => a.f - c.f);
          const cur = open.shift();
          const u = cur.id;
          if (closed[u]) continue;
          closed[u] = true;
          expanded++;
          order.push(u);
          if (u === T) { done = true; break; }
          const cm = [C.state(u, 'visited'), C.state(u, 'active')];
          b.step('弹出 f 最小的 **' + u + '**（f = ' + cur.f.toFixed(2) + '，g = ' + gd[u] + '，h = ' +
            H.fn(pos[u], pos[T]).toFixed(2) + '）→ 标记为已确定。累计扩展 **' + expanded + '** 个点。' +
            (open.length ? '当前 Open 集：' + open.sort((a, c) => a.f - c.f).map(o => o.id + '(' + o.f.toFixed(1) + ')').join(' ') : 'Open 集已空'),
          cm.concat([C.setQ('open', open.sort((a, c) => a.f - c.f).map((o, k) => ({ key: 'o' + k, label: o.id, meta: 'f=' + o.f.toFixed(1) })))]),
          { line: 6, vars: [{ name: 'f', value: cur.f.toFixed(2) }, { name: 'expanded', value: expanded }] });
          adj[u].forEach(({ v, w, eid }) => {
            if (closed[v]) return;
            const ng = gd[u] + w;
            if (ng < gd[v]) {
              gd[v] = ng; fa[v] = u;
              const f2 = ng + H.fn(pos[v], pos[T]);
              const at = open.findIndex(o => o.id === v);
              if (at >= 0) open.splice(at, 1);
              open.push({ id: v, f: f2 });
              b.step('松弛 **' + u + ' → ' + v + '**：`g[' + v + '] = ' + ng + '`，`f[' + v + '] = ' + ng + ' + ' +
                H.fn(pos[v], pos[T]).toFixed(2) + ' = ' + f2.toFixed(2) + '`，入 Open 集。', [
                C.pulse(eid), C.state(v, 'frontier')
              ], { line: 8 });
            }
          });
        }
        // 回溯路径
        const path = [];
        let x = done ? T : null;
        let guard2 = 0;
        while (x && guard2++ < 30) { path.unshift(x); x = fa[x]; }
        const cmF = [];
        path.forEach((id, k) => {
          cmF.push(C.state(id, 'path'));
          if (k) cmF.push(C.pulse(path[k - 1] + '>' + id));
        });
        results.push({ h: H, exp: expanded, len: gd[T], path });
        b.step('本轮完成：**扩展 ' + expanded + ' 个点**，路径代价 **' + gd[T] + '**，路径 ' + path.join(' → ') + '。' +
          (H.id === 'man' ? '曼哈顿距离在这个 4 邻接网格上**恰好等于真实剩余代价的下界**，属于"完美启发"，扩展点数最少。' : '') +
          (H.id === 'euc' ? '欧氏距离比曼哈顿更小（同样可采纳但更松），所以扩展的点会略多。' : '') +
          (H.id === 'cheb' ? '切比雪夫距离在这里偏大 —— 在允许斜走的 8 邻接网格上才是准确的。' : '') +
          (H.id === 'zero' ? '零启发退化为 Dijkstra，相当于"以起点为圆心一圈圈扩散"，扩展点数最多。' : ''),
        cmF.concat([C.table('res', H.id, 'exp', expanded), C.table('res', H.id, 'len', gd[T]),
          C.table('res', H.id, 'ok', H.id === 'zero' ? '基准' : '✓')]),
        { line: 10, milestone: H.id + '：扩展 ' + expanded + ' 点 / 距离 ' + gd[T] });
        // 清掉路径高亮，进入下一轮
        b.step('（清理标记，准备下一种启发式）', g.nodes.map(n => C.state(n.id, 'default')), { line: 2 });
      });

      const tbl = [];
      results.forEach(r => {
        tbl.push(C.table('res', r.h.id, 'exp', r.exp));
        tbl.push(C.table('res', r.h.id, 'len', r.len));
        tbl.push(C.table('res', r.h.id, 'ok', r.h.id === 'zero' ? '基准' : '✓'));
      });
      const best = Math.min(...results.map(r => r.exp));
      const worst = Math.max(...results.map(r => r.exp));
      b.step('**四种启发式的扩展点数**：' + results.map(r => r.h.id + ' = ' + r.exp).join('、') + '。' +
        '路径代价全部等于 **' + results[0].len + '** —— 这说明四种 h 都是**可采纳的（admissible，不高估）**，' +
        '所以答案都正确。**h 只影响效率，不影响最优性**（前提是可采纳）。' +
        '扩展点数从 ' + best + ' 到 ' + worst + '，相差 ' + (worst / best).toFixed(1) + ' 倍 —— 这就是"启发式质量"的全部意义。', tbl,
      { line: 11, milestone: '完成：' + best + ' ~ ' + worst + ' 个扩展点' });
      b.step('（画布上重新标出起点 A1 与终点 C4；四条路径的**代价完全相同**，说明启发式再烂也不会把答案搞错，' +
        '只会白白多扩展一些点。）', [C.state(S, 'active'), C.state(T, 'conflict')], { line: 11 });
      return finish(b);
    }
  });
})();
