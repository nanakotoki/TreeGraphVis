/* ============================================================
 * 第一卷 · T6 区间树与进阶树（补充）
 * 可持久化线段树（主席树）· Tarjan 离线 LCA · 欧拉序转 RMQ
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* ============================================================
   * 1. 可持久化线段树 / 主席树
   *    多版本根并排 + 新建路径高亮 + 跨树共享指针
   * ============================================================ */
  TGV.register({
    id: 'persistent_seg', name: '可持久化线段树（主席树 · 版本共享）', category: '树 · 区间结构',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'segment_tree',
    panels: [
      { id: 'ver', type: 'table', title: '版本一览', columns: [{ key: 'root', label: '根结点' }, { key: 'fresh', label: '新建结点' }, { key: 'share', label: '共享结点' }] },
      { id: 'note', type: 'text', title: '空间账本' }
    ],
    pseudocode: [
      '// 主席树 = 线段树 + "只复制被修改的那一条链"',
      '// 一次单点修改只影响根到叶子的 O(log n) 个结点，其余照样复用旧版本',
      'build(l, r): 递归建出 v0，每个结点存区间和',
      'update(prev, l, r, pos, val):',
      '    cur = new Node()                     // ① 先照抄 prev 的聚合值',
      '    if l == r: cur.sum = val; return cur',
      '    m = (l + r) / 2',
      '    if pos <= m:',
      '        cur.left  = update(prev.left, l, m, pos, val)   // ② 只有一侧新建',
      '        cur.right = prev.right                          // ③ 另一侧直接指向旧结点',
      '    else: 对称处理',
      '    cur.sum = cur.left.sum + cur.right.sum',
      '    return cur',
      '// 于是 m 次修改的总空间 = O(n + m log n)，而不是 O(nm)'
    ],
    presets: [
      { id: 'std', label: 'v0 → v1(改 a[2]) → v2(改 a[4])', desc: '观察每次只有 3 个新结点，其余用虚线跨树共享', data: () => ({ a: [3, 8, 5, 9], ups: [[2, 6], [4, 2]] }) }
    ],
    run(input) {
      const arr = input.a || [3, 8, 5, 9];
      const ups = input.ups || [[2, 6], [4, 2]];
      const n = arr.length;
      const UNIT = 46, BAND = 330, TOP = 96, VG = 96;

      const segsOf = (l, r, out, dep) => {
        out.push({ l, r, d: dep });
        if (l < r) {
          const m = (l + r) >> 1;
          segsOf(l, m, out, dep + 1);
          segsOf(m + 1, r, out, dep + 1);
        }
        return out;
      };
      const pathOf = (l, r, pos, out, dep) => {
        out.push({ l, r, d: dep });
        if (l < r) {
          const m = (l + r) >> 1;
          if (pos <= m) pathOf(l, m, pos, out, dep + 1); else pathOf(m + 1, r, pos, out, dep + 1);
        }
        return out;
      };
      const xof = (l, r, ver) => 140 + ver * BAND + ((l + r) / 2) * UNIT;
      const yof = d => TOP + d * VG;
      const nid = (ver, l, r) => 'v' + ver + '_' + l + '-' + r;

      /* 预生成全部结点（隐藏），坐标固定 */
      const all = [];
      const seen = {};
      const pushSeg = (ver, seg) => {
        const id = nid(ver, seg.l, seg.r);
        if (seen[id]) return;
        seen[id] = true;
        all.push({ id, x: xof(seg.l, seg.r, ver), y: yof(seg.d), hidden: true, label: '' });
      };
      segsOf(1, n, [], 0).forEach(s => pushSeg(0, s));
      ups.forEach((u, i) => pathOf(1, n, u[0], [], 0).forEach(s => pushSeg(i + 1, s)));

      const b = new TGV.Builder(this, { nodes: all, edges: [], panels: this.panels });
      const ch = {};      // id -> [leftId, rightId]
      const sum = {};     // id -> 区间和
      const shown = {};
      const liveEdges = [];
      const valArr = arr.slice();
      let arcSeq = 0;

      const reveal = (cmds, id) => { if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); } };

      b.step('**主席树（可持久化线段树）**：每次修改并不复制整棵树，而是**只沿被改的那条链新建 O(log n) 个结点**，' +
        '未受影响的分支直接**指向旧版本的结点**——这就是"可持久化"的全部秘密。先看规模：数组 [' + arr.join(', ') + ']，' +
        '单版本 ' + (2 * n - 1) + ' 个结点，' + ups.length + ' 次修改，每次只需新造 ' + Math.ceil(Math.log2(n) + 1) + ' 个左右。',
      [C.text('note', ['数组 = [' + arr.join(', ') + ']', '版本数 = ' + (ups.length + 1), '单版本结点 = ' + (2 * n - 1)])], { line: 2 });

      /* ---------------- 建 v0 ---------------- */
      const build = (l, r, depth) => {
        const id = nid(0, l, r);
        if (l === r) {
          sum[id] = arr[l - 1];
          const cm = [C.setLabel(id, String(arr[l - 1])), C.state(id, 'path')];
          reveal(cm, id);
          b.step('建 v0：叶子结点 [' + l + ', ' + r + '] 存原数组值 **' + arr[l - 1] + '**。', cm, { line: 3 });
          return id;
        }
        const m = (l + r) >> 1;
        const L = build(l, m, depth + 1);
        const R = build(m + 1, r, depth + 1);
        ch[id] = [L, R];
        sum[id] = sum[L] + sum[R];
        const cm = [C.setLabel(id, String(sum[id]))];
        [L, R].forEach(c => {
          const eid = id + '>' + c;
          cm.push(C.addEdge(eid, id, c));
          liveEdges.push(eid);
        });
        reveal(cm, id);
        all.forEach(nd => { if (shown[nd.id]) cm.push(C.state(nd.id, 'default')); });
        cm.push(C.state(id, 'active'));
        b.step('建 v0：结点 [' + l + ', ' + r + '] 的区间和 = ' + sum[L] + ' + ' + sum[R] + ' = **' + sum[id] + '**。',
          cm, { line: 3, vars: [{ name: 'sum', value: sum[id] }] });
        return id;
      };

      const root0 = build(1, n, 0);
      const roots = [root0];
      b.step('v0 建好，根结点 = **' + sum[root0] + '**（整个数组的和）。所有版本的根都会单独保存，' +
        '于是任何历史版本随时可以被"回放"出来。', [C.table('ver', 'v0', 'root', root0), C.table('ver', 'v0', 'fresh', 2 * n - 1), C.table('ver', 'v0', 'share', 0)],
      { line: 3, milestone: 'v0 构建完成' });

      /* ---------------- 逐次修改 ---------------- */
      ups.forEach((pair, k) => {
        const ver = k + 1;
        const pos = pair[0], val = pair[1];
        const prevRoot = roots[roots.length - 1];
        let fresh = 0, shared = 0;
        b.step('**第 ' + ver + ' 次修改**：把 a[' + pos + '] 从 ' + valArr[pos - 1] + ' 改成 **' + val + '**。' +
          '从 v' + (ver - 1) + ' 的根出发，只要**沿着 pos=' + pos + ' 的那条路径**复制结点即可。', [],
        { line: 4, milestone: 'v' + ver + '：更新 a[' + pos + ']', stage: true, vars: [{ name: 'pos', value: pos }, { name: 'val', value: val }] });

        const upd = (prevId, l, r, depth) => {
          const id = nid(ver, l, r);
          fresh++;
          if (l === r) {
            sum[id] = val;
            const cm = [C.state(prevId, 'ghost'), C.state(id, 'conflict'), C.setLabel(id, String(val))];
            reveal(cm, id);
            b.step('叶子 [' + l + ', ' + r + '] 的值换成 ' + val + '（旧叶子 ' + prevId + ' 保留在 v' + (ver - 1) + ' 里，**历史版本不受影响**）。',
              cm, { line: 6, vars: [{ name: 'fresh', value: fresh }] });
            return id;
          }
          const m = (l + r) >> 1;
          const pc = ch[prevId] || [];
          let L, R;
          if (pos <= m) {
            L = upd(pc[0], l, m, depth + 1);
            R = pc[1];
          } else {
            R = upd(pc[1], m + 1, r, depth + 1);
            L = pc[0];
          }
          ch[id] = [L, R];
          sum[id] = (sum[L] || 0) + (sum[R] || 0);
          const cm = [C.setLabel(id, String(sum[id])), C.state(id, 'conflict')];
          reveal(cm, id);
          // 新建的一侧：正常边；共享的一侧：虚线跨树指针
          const freshChild = (pos <= m) ? L : R;
          const sharedChild = (pos <= m) ? R : L;
          const eid = id + '>' + freshChild;
          cm.push(C.addEdge(eid, id, freshChild));
          liveEdges.push(eid);
          const arcId = 'sh' + (++arcSeq);
          cm.push(C.arc(arcId, id, sharedChild, { color: '#8B5CF6', dashed: true, label: '共享' }));
          shared++;
          cm.push(C.table('ver', 'v' + ver, 'fresh', fresh));
          cm.push(C.table('ver', 'v' + ver, 'share', shared));
          b.step('结点 [' + l + ', ' + r + '] 被复制：区间和 = **' + sum[id] + '**。' +
            '注意它的另一侧子树**没有复制**，而是画了一条**紫色虚线指针直接指向 v' + (ver - 1) + ' 的旧结点**。',
          cm, { line: 9, vars: [{ name: 'l,r', value: l + ',' + r }, { name: 'sum', value: sum[id] }] });
          return id;
        };

        const newRoot = upd(prevRoot, 1, n, 0);
        roots.push(newRoot);
        const cm = [C.table('ver', 'v' + ver, 'root', newRoot)];
        [root0, ...roots.slice(1, -1)].forEach(r => cm.push(C.state(r, 'visited')));
        cm.push(C.state(newRoot, 'path'));
        cm.push(C.text('note', [
          'v0..v' + ver + ' 共 ' + roots.length + ' 个根',
          'v' + ver + ' 新建 ' + fresh + ' 个结点',
          '共享（复用）' + shared + ' 棵子树',
          '若暴力复制：' + (roots.length * (2 * n - 1)) + ' 个结点'
        ]));
        b.step('**v' + ver + ' 完成**：新建 **' + fresh + '** 个结点，**复用 ' + shared + '** 棵子树，根结点值 ' + sum[newRoot] + '。' +
          '如果把每次修改都整棵复制，' + roots.length + ' 个版本要占 ' + (roots.length * (2 * n - 1)) + ' 个结点；' +
          '现在只用了 ' + (2 * n - 1 + (roots.length - 1) * fresh) + ' 个左右。',
        cm, { line: 13, milestone: 'v' + ver + ' 完成：新建 ' + fresh + ' 个结点' });
        valArr[pos - 1] = val;
      });

      b.step('演示结束。**为什么主席树能"回到过去"**：每个版本的根结点各自完整保存，' +
        '从任一版本根往下走，看到的都是那个时刻的数据快照；而不同版本之间大量结点被共享，' +
        '所以 n 个元素、m 次修改的总空间只有 **O(n + m log n)**。' +
        '它最经典的用途是"区间第 k 小"——用 v[r] 减去 v[l-1] 做线段树上二分。', [], { line: 14, milestone: '演示完成' });

      b.edges = [];
      return { nodes: all, edges: [], frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 2. Tarjan 离线 LCA
   * ============================================================ */
  const LCA_NODES = [['A', 420, 100], ['B', 220, 240], ['C', 620, 240], ['D', 120, 380],
    ['E', 300, 380], ['F', 530, 380], ['G', 700, 380], ['H', 380, 500]];
  const LCA_EDGES = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['C', 'G'], ['E', 'H']];

  TGV.register({
    id: 'lca_tarjan', name: '最近公共祖先 · Tarjan 离线算法（DFS + 并查集）', category: '树 · 最近公共祖先',
    layout: 'tree', childOrder: 'none', directed: true, acceptsGraph: false,
    compareWith: 'lca_binary',
    panels: [
      { id: 'uf', type: 'dsu', title: '并查集（find 的结果就是 ancestor）' },
      { id: 'q', type: 'table', title: '离线询问', columns: [{ key: 'pair', label: '询问' }, { key: 'ans', label: 'LCA' }] },
      { id: 'stack', type: 'stack', title: 'DFS 递归栈（灰点）' }
    ],
    pseudocode: [
      '// 离线 LCA：把所有询问一次性收下，在**一遍 DFS** 里全部回答',
      'tarjan(u):',
      '    color[u] = 灰; anc[find(u)] = u            // 先把 u 记成自己集合的代表',
      '    for each 孩子 v:',
      '        tarjan(v)',
      '        并查集合并(u, v); anc[find(u)] = u     // v 的整棵子树挂到 u 底下',
      '    color[u] = 黑                               // u 的子树处理完毕',
      '    for each 询问 (u, v):',
      '        if color[v] == 黑:                      // 两边都回溯完了',
      '            answer(u, v) = anc[find(v)]         // 关键一步！',
      '// 为什么对？v 已黑说明 v 在 u 的某个"已经处理完的子树"里，',
      '// 此时 v 所在集合的代表就是那个子树根的父结点 —— 恰好就是 LCA'
    ],
    presets: [
      { id: 'std', label: '8 点树 · 3 组询问一次 DFS 全解', desc: '观察"黑色 v 的集合祖先"如何直接给出 LCA', data: () => ({ queries: [['D', 'F'], ['H', 'C'], ['E', 'G']] }) },
      { id: 'deep', label: '同一条链上的询问', desc: '祖先型询问：LCA 就是较浅的那个', data: () => ({ queries: [['D', 'E'], ['H', 'B'], ['D', 'H']] }) }
    ],
    run(input) {
      const queries = input.queries || [['D', 'F'], ['H', 'C']];
      const g = (input.edges && input.edges.length)
        ? (() => {
            const ids = new Set();
            input.edges.forEach(([a, b]) => { ids.add(a); ids.add(b); });
            return TGV.GraphLib.mkGraph([...ids].map(v => [String(v), 0, 0]),
              input.edges.map(([a, b]) => [String(a), String(b)]), { directed: true });
          })()
        : TGV.GraphLib.mkGraph(LCA_NODES, LCA_EDGES, { directed: true });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });

      const kids = {}, parent = {};
      g.edges.forEach(e => { (kids[e.source] = kids[e.source] || []).push(e.target); parent[e.target] = e.source; });
      const ids = g.nodes.map(n => n.id);
      const par = {}, anc = {}, color = {};
      ids.forEach(id => { par[id] = id; color[id] = 'white'; anc[id] = id; });
      const find = x => { let r = x; while (par[r] !== r) r = par[r]; while (par[x] !== r) { const nx = par[x]; par[x] = r; x = nx; } return r; };
      const dsuSync = () => ({ op: 'AUX_DSU_SYNC', panelId: 'uf', parent: Object.assign({}, par), rank: {} });
      const stackItems = [];
      const ans = {};
      const qOf = {};
      queries.forEach(([u, v], i) => {
        const key = 'q' + i;
        (qOf[u] = qOf[u] || []).push({ other: v, key });
        (qOf[v] = qOf[v] || []).push({ other: u, key });
      });
      const pairs = {};
      queries.forEach(([u, v], i) => { pairs['q' + i] = u + ' — ' + v; });

      b.step('**Tarjan 离线 LCA** 允许我们把**所有询问一次性收下**，然后只用一遍 DFS 全部回答。' +
        '核心技巧：DFS 回溯时用**并查集**把已完成的子树"收缩"到它的根上，`anc[find(v)]` 就恰好是 LCA。' +
        '本次共 ' + queries.length + ' 组询问：' + queries.map(q => q.join('—')).join('、') + '。',
      ids.map(id => C.state(id, 'default')).concat([dsuSync()]), { line: 1 });

      const dfs = (u) => {
        color[u] = 'gray';
        stackItems.push(u);
        const cm0 = [C.state(u, 'active'), C.push('stack', u)];
        b.step('进入 ' + u + '：染成**灰色（访问中）**，压入递归栈，并把它登记为自己集合的代表 `anc[find(' + u + ')] = ' + u + '`。',
          cm0, { line: 3, vars: [{ name: 'u', value: u }] });

        (kids[u] || []).forEach(v => {
          const cmE = [C.edge(u + '>' + v, 'active')];
          b.step('沿树边 ' + u + ' → ' + v + ' 递归下去。', cmE, { line: 4 });
          dfs(v);
          par[find(v)] = u;
          anc[find(u)] = u;
          stackItems.pop();
          const cm = [C.edge(u + '>' + v, 'visited'), dsuSync(), C.state(v, 'visited')];
          b.step(v + ' 的整棵子树处理完了：**并查集合并(u, ' + v + ')**，把 ' + v + ' 所在集合并进 ' + u + '，' +
            '并把代表记为 ' + u + '。于是从 ' + v + ' 子树里任何一点往上 `find` 都会落到 ' + u + '。', cm, { line: 6 });
        });

        color[u] = 'black';
        stackItems.pop();
        const cmB = [C.state(u, 'visited'), C.pop('stack')];
        b.step(u + ' 的所有孩子都回来了，染成**黑色（完全回溯）**。现在检查挂在 ' + u + ' 上的询问。', cmB, { line: 7 });

        (qOf[u] || []).forEach(q => {
          if (color[q.other] === 'black') {
            const a = anc[find(q.other)];
            ans[q.key] = a;
            const cm = [dsuSync(), C.table('q', q.key, 'ans', a), C.state(a, 'path')];
            b.step('询问 (' + u + ', ' + q.other + ')：' + q.other + ' **已经是黑色**，说明它落在 ' + u + ' 某个已完成的子树里。' +
              '直接取 `anc[find(' + q.other + ')]` = **' + a + '** —— 这就是答案。', cm,
            { line: 10, milestone: '回答 LCA(' + u + ',' + q.other + ') = ' + a });
          } else {
            const cm = [C.state(q.other, 'frontier')];
            b.step('询问 (' + u + ', ' + q.other + ')：' + q.other + ' 还不是黑色，**先挂起**——等它回溯完成时再从那一端回答。', cm, { line: 9 });
          }
        });
      };

      const qInit = queries.map((_, i) => C.table('q', 'q' + i, 'pair', pairs['q' + i]));
      b.step('先把询问登记进表格（答案先空着）。', qInit, { line: 1 });
      dfs(input.start != null ? String(input.start) : 'A');

      const done = queries.map(([u, v], i) => u + '—' + v + ' → **' + (ans['q' + i] || '?') + '**');
      b.step('**全部询问回答完毕**：' + done.join('；') + '。' +
        'Tarjan 算法的代价是 O(n + q·α(n))，比倍增法（O(n log n) 预处理 + O(log n) 每次查询）更快——' +
        '但**必须离线**（先把询问全收集好），这是它和在线倍增法的本质区别。',
      ids.map(id => C.state(id, 'default')), { line: 11, milestone: '全部完成' });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 3. 欧拉序转 RMQ
   * ============================================================ */
  TGV.register({
    id: 'lca_rmq', name: '最近公共祖先 · 欧拉序转 RMQ（区间最浅点）', category: '树 · 最近公共祖先',
    layout: 'tree', childOrder: 'none', directed: true, acceptsGraph: false,
    compareWith: 'lca_tarjan',
    panels: [
      { id: 'euler', type: 'array', title: '欧拉序（长度 2n-1）', values: [], labels: [] },
      { id: 'depth', type: 'array', title: '对应深度', values: [], labels: [] },
      { id: 'first', type: 'table', title: '每个点首次出现的位置', columns: [{ key: 'i', label: 'first' }] }
    ],
    pseudocode: [
      '// 树上 LCA 可以变成"一维数组上的 RMQ（区间最小值）"问题',
      '// ① 欧拉序：DFS 每进入一个点记一次，回溯到父结点时也记一次 → 长度 2n-1',
      'dfs(u, d):',
      '    euler.push(u); depth.push(d); if first[u] 未记录: first[u] = euler.size',
      '    for each 孩子 v: dfs(v, d + 1); euler.push(u); depth.push(d)',
      '// ② 关键结论：LCA(u, v) = 欧拉序区间 [first[u], first[v]] 中深度最小的那个点',
      'query(u, v):',
      '    L = first[u]; R = first[v]; if L > R: swap(L, R)',
      '    在 depth[L..R] 上找最小值的位置 p        // 用线段树 / ST 表 O(1)~O(log n)',
      '    return euler[p]',
      '// 预处理 O(n log n)，查询 O(1)；代价是 2n-1 的数组空间'
    ],
    presets: [
      { id: 'std', label: '询问 LCA(D, F)', desc: 'D 与 F 的欧拉区间里最浅的点就是 A', data: () => ({ pair: ['D', 'F'] }) },
      { id: 'deep', label: '询问 LCA(H, G)', desc: '看区间如何在深子树之间"跳过"共同祖先', data: () => ({ pair: ['H', 'G'] }) },
      { id: 'anc', label: '祖先型询问 LCA(H, E)', desc: '一端是另一端的祖先时 RMQ 依然正确', data: () => ({ pair: ['H', 'E'] }) }
    ],
    run(input) {
      const pair = input.pair || ['D', 'F'];
      const g = (input.edges && input.edges.length)
        ? (() => {
            const ids = new Set();
            input.edges.forEach(([a, b]) => { ids.add(a); ids.add(b); });
            return TGV.GraphLib.mkGraph([...ids].map(v => [String(v), 0, 0]),
              input.edges.map(([a, b]) => [String(a), String(b)]), { directed: true });
          })()
        : TGV.GraphLib.mkGraph(LCA_NODES, LCA_EDGES, { directed: true });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const kids = {}, dep = {};
      g.edges.forEach(e => { (kids[e.source] = kids[e.source] || []).push(e.target); });

      const euler = [], depthArr = [], first = {};
      const dfs = (u, d) => {
        dep[u] = d;
        if (first[u] === undefined) first[u] = euler.length;   // 0-based
        euler.push(u); depthArr.push(d);
        (kids[u] || []).forEach(v => {
          dfs(v, d + 1);
          euler.push(u); depthArr.push(d);
        });
      };
      dfs(input.start != null ? String(input.start) : 'A', 0);

      const labels = euler.map((_, i) => String(i));
      b.step('**欧拉序**：DFS 时每进入一个点记一次，**从孩子回溯到父结点时再记一次**，' +
        '于是长度为 2n-1 = ' + euler.length + '。这个序列有一个惊人的性质：' +
        '**任意两点的 LCA，就是它们在欧拉序中"首次出现位置之间"那个深度最小的点**。',
      [C.array('euler', euler, [], labels), C.array('depth', depthArr, [], labels)].concat(
        Object.keys(first).map(id => C.table('first', id, 'i', first[id]))
      ), { line: 2, milestone: '欧拉序构建完成（' + euler.length + ' 项）' });

      const u = pair[0], v = pair[1];
      let L = first[u], R = first[v];
      if (L > R) { const t = L; L = R; R = t; }
      const hl = [];
      for (let i = L; i <= R; i++) hl.push(i);
      b.step('查询 LCA(**' + u + ', ' + v + '**)：先查表得到 `first[' + u + '] = ' + first[u] + '`、`first[' + v + '] = ' + first[v] + '`，' +
        '取出区间 [' + L + ', ' + R + ']，下面这两条数组条中被框住的就是候选区间。',
      [C.array('euler', euler, hl, labels), C.array('depth', depthArr, hl, labels),
        C.state(u, 'active'), C.state(v, 'active')],
      { line: 8, vars: [{ name: 'L', value: L }, { name: 'R', value: R }], stage: true });

      let best = L;
      for (let i = L; i <= R; i++) if (depthArr[i] < depthArr[best]) best = i;
      const lca = euler[best];
      const cand = [];
      for (let i = L; i <= R; i++) cand.push(euler[i] + '(' + depthArr[i] + ')');
      b.step('在区间 [' + L + ', ' + R + '] 上做**区间最小值**：' + cand.join(' ') + '。' +
        '深度最小的是位置 **' + best + '** 上的点（深度 ' + depthArr[best] + '）→ LCA = **' + lca + '**。',
      [C.array('depth', depthArr, [best], labels), C.array('euler', euler, [best], labels), C.state(lca, 'path')],
      { line: 9, milestone: 'LCA(' + u + ',' + v + ') = ' + lca });

      b.step('**验证**：从 ' + u + ' 和 ' + v + ' 同时往上走，第一次相遇的点正是 ' + lca + '。' +
        '于是"树上 LCA"被彻底转化成"数组 RMQ"——用 ST 表预处理 O(n log n)、查询 O(1)；' +
        '用线段树预处理 O(n)、查询 O(log n)。这就是欧拉序法的全部价值：**把树上的问题搬到一维数组上**。',
      [C.state(lca, 'path'), C.state(u, 'visited'), C.state(v, 'visited')], { line: 10, milestone: '演示完成' });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
