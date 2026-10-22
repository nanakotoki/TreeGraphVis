/* ============================================================
 * 第一卷 · 规范清单补齐（一）
 *   #3  后序遍历 · 双栈法（与递归版 / prev 单栈版构成三版对照）
 *   #36 最近公共祖先 · 朴素逐层上跳（与倍增 / Tarjan / RMQ 构成四法）
 *   #37 树的直径 · 树形 DP（d1 / d2，与两次 BFS 对照）
 *   #31 带权并查集（维护到根的偏移量）
 *   #31 可撤销并查集（按秩合并 + 操作栈回滚）
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;
  const Lib = TGV.TreeLib;

  const finish = b => ({ nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels });
  const items = arr => arr.map(x => (typeof x === 'object' ? x : { label: String(x) }));
  /** 给所有 table 面板注入固定行序，避免行按插入顺序漂移 */
  const rowOrder = (panels, ids) => panels.map(p => (p.type === 'table' ? Object.assign({}, p, { rowOrder: ids }) : p));

  /* ============================================================
   * 1. 后序遍历 · 双栈法
   * ============================================================ */
  TGV.register({
    id: 'postorder_2stack', name: '后序遍历 · 双栈法（先序的镜像）', category: '树 · 遍历',
    layout: 'tree', childOrder: 'key',
    compareWith: 'postorder',
    panels: [
      { id: 's1', type: 'stack', title: '栈 1 · 工作栈' },
      { id: 's2', type: 'stack', title: '栈 2 · 收集栈' },
      { id: 'out', type: 'list', title: '读出（栈 2 逆序）= 后序' }
    ],
    pseudocode: [
      '// 双栈法的巧思：后序 = 「根 → 右 → 左」的逆序',
      '// 而「根 → 右 → 左」只是把先序的左右压栈顺序对调',
      'stack1 = [root];  stack2 = []',
      'while stack1 not empty:',
      '    u = stack1.pop()',
      '    stack2.push(u)                    // 根先进收集栈',
      '    if u.left:  stack1.push(u.left)    // 左先压 → 后弹出',
      '    if u.right: stack1.push(u.right)   // 右后压 → 先弹出',
      '// 最后把 stack2 从栈顶往下读，恰好是「左 → 右 → 根」'
    ],
    presets: [
      { id: 'full', label: '满二叉树 · 三栈对照', desc: '观察栈 2 的压入顺序与最终读出的镜像关系', data: () => ({ arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'deep', label: '斜树 · 最坏情况', desc: '退化成链时两栈深度的变化', data: () => ({ arr: [1, 2, null, 3, null, null, null, 4] }) }
    ],
    run(input) {
      const tree = Lib.buildLevel(input.arr || [8, 4, 12, 2, 6, 10, 14]);
      const b = new TGV.Builder(this, { nodes: tree.nodes.slice(), edges: tree.edges.slice(), panels: this.panels });
      const s1 = [tree.root], s2 = [], out = [];
      b.step('递归后序的痛点是"根要在左右都回来之后才访问"，单栈迭代必须额外记住状态。**双栈法**绕开了这个问题：' +
        '先按「根 → 右 → 左」的顺序收集，最后逆序读出，就是「左 → 右 → 根」。', [], { line: 1 });
      b.step('把根 ' + tree.root.key + ' 压入**工作栈** stack1。', [
        C.setQ('s1', items(s1.map(x => x.key))), C.state(tree.root.id, 'frontier')
      ], { line: 3 });
      let guard = 0;
      while (s1.length && guard++ < 40) {
        const u = s1.pop();
        b.step('从 stack1 弹出 **' + u.key + '**，这就是本轮处理的结点。', [
          C.setQ('s1', items(s1.map(x => x.key))), C.state(u.id, 'active')
        ], { line: 5 });
        s2.push(u);
        b.step('把 ' + u.key + ' 压入**收集栈** stack2。注意这里是"根最先进入"，所以它最后才会被读出 —— 这正是后序要的。', [
          C.setQ('s2', items(s2.map(x => x.key))), C.state(u.id, 'visited')
        ], { line: 6, vars: [{ name: 'u', value: u.key }] });
        if (u.left) {
          s1.push(u.left);
          b.step('左孩子 ' + u.left.key + ' 压入 stack1。**注意顺序：先压左**，它会被后压的右孩子盖住，因而**后弹出**。', [
            C.setQ('s1', items(s1.map(x => x.key))), C.state(u.left.id, 'frontier'), C.pulse(Lib.eid(u.id, u.left.id))
          ], { line: 7 });
        }
        if (u.right) {
          s1.push(u.right);
          b.step('右孩子 ' + u.right.key + ' 压入 stack1。它压在左孩子之上，**下一轮会先弹出** —— 于是收集栈里"右"排在"左"前面。', [
            C.setQ('s1', items(s1.map(x => x.key))), C.state(u.right.id, 'frontier'), C.pulse(Lib.eid(u.id, u.right.id))
          ], { line: 8 });
        }
      }
      b.step('stack1 空了，遍历结束。此时 stack2 里是 **' + s2.map(x => x.key).join(', ') + '**（栈顶在左）。', [], { line: 8, stage: true });
      for (let i = s2.length - 1; i >= 0; i--) {
        const u = s2[i];
        out.push(u.key);
        b.step('从 stack2 栈顶往下依次读出：**' + u.key + '**。为什么逆序就是后序？因为 stack2 的压入顺序是「根、右子树、左子树」，' +
          '而"根最先压入 → 最后读出、右先于左"这两件事恰好把顺序翻成了「左、右、根」。', [
          C.state(u.id, 'path'), C.push('out', { label: u.key })
        ], { line: 9, vars: [{ name: 'k', value: out.length }] });
      }
      b.step('最终后序序列：**' + out.join(' → ') + '**。' +
        '双栈法时间 O(n)、空间 O(n)（最坏两栈合计 n）；比 prev 单栈法更好写，代价是多一个栈。', [],
      { line: 9, milestone: '后序 = ' + out.join('→') });
      return finish(b);
    }
  });

  /* ============================================================
   * 2. 最近公共祖先 · 朴素逐层上跳
   * ============================================================ */
  TGV.register({
    id: 'lca_naive', name: '最近公共祖先 · 朴素逐层上跳', category: '树 · 最近公共祖先',
    layout: 'tree', childOrder: 'none',
    compareWith: 'lca_binary',
    panels: [
      { id: 'dep', type: 'table', title: 'depth（深度）', columns: [{ key: 'd', label: 'dep' }] },
      { id: 'log', type: 'list', title: '跳跃日志' }
    ],
    pseudocode: [
      '// 最直白的版本：谁深谁先往上爬，爬到一样深再一起爬',
      'depth(): DFS 一遍求出每点深度',
      'while dep[u] > dep[v]: u = fa[u]      // ① 深的一方向上对齐',
      'while dep[v] > dep[u]: v = fa[v]',
      'while u != v:                          // ② 并肩向上',
      '    u = fa[u]; v = fa[v]',
      'return u                               // 相遇点就是 LCA',
      '// 复杂度 O(n)：最坏要爬遍整条链；倍增 / Tarjan / 欧拉序 RMQ 把它降到 O(log n) 或 O(1)'
    ],
    presets: [
      { id: 'p1', label: '标准树：LCA(7, 8)', desc: '两点深度相同，直接并肩向上', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [5, 9]], u: 7, v: 8 }) },
      { id: 'p2', label: '深度悬殊：LCA(9, 3)', desc: '先让深的一路爬到同一层', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [5, 9]], u: 9, v: 3 }) },
      { id: 'p3', label: '父子：LCA(5, 9)', desc: '对齐后直接命中', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [5, 9]], u: 5, v: 9 }) }
    ],
    run(input) {
      const edgesIn = input.edges || [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [5, 9]];
      const seen = new Set();
      edgesIn.forEach(([p, c]) => { seen.add(p); seen.add(c); });
      const nodes = [...seen].sort((a, b) => a - b).map(v => ({ id: 'n' + v, label: String(v), key: v }));
      const edges = edgesIn.map(([p, c]) => ({ id: 'n' + p + '>n' + c, source: 'n' + p, target: 'n' + c }));
      const b = new TGV.Builder(this, { nodes, edges, panels: rowOrder(this.panels, nodes.map(n => n.id)) });
      const adj = {}, fa = {}, dep = {};
      nodes.forEach(n => { adj[n.key] = []; });
      edgesIn.forEach(([p, c]) => { adj[p].push(c); adj[c].push(p); });
      (function dfs(u, p, d) {
        dep[u] = d; fa[u] = p;
        adj[u].forEach(v => { if (v !== p) dfs(v, u, d + 1); });
      })(input.start != null ? input.start : 1, 0, 0);
      const cm0 = [];
      nodes.forEach(n => { cm0.push(C.table('dep', n.id, 'd', dep[n.key])); });
      b.step('朴素法的全部预处理就是一遍 DFS 求深度和父亲 —— 没有倍增表，没有栈，什么都没有。' +
        '右侧是每个结点的深度。', cm0, { line: 2, vars: [{ name: 'V', value: nodes.length }] });
      let u = input.u, v = input.v, hops = 0;
      b.step('查询 **LCA(' + u + ', ' + v + ')**：dep[' + u + '] = ' + dep[u] + '，dep[' + v + '] = ' + dep[v] + '。' +
        '朴素法的策略非常朴素：**谁深谁先爬**，爬到一样高再一起爬。', [
        C.state('n' + u, 'active'), C.state('n' + v, 'active')
      ], { line: 3, milestone: 'LCA(' + u + ',' + v + ')', stage: true });
      const upStep = (x, other, tag) => {
        const p = fa[x];
        hops++;
        b.step('dep[' + x + '] = ' + dep[x] + ' 比 dep[' + other + '] = ' + dep[other] + ' 深 → ' + x +
          ' 往上跳一步到父亲 **' + p + '**。', [
          C.pulse('n' + x + '>n' + p), C.state('n' + x, 'visited'), C.state('n' + p, tag),
          C.push('log', { label: x + '↑' + p, meta: 'hop ' + hops })
        ], { line: 4, vars: [{ name: 'u', value: x }, { name: 'hops', value: hops }] });
        return p;
      };
      let guard = 0;
      while (dep[u] > dep[v] && guard++ < 30) u = upStep(u, v, 'active');
      guard = 0;
      while (dep[v] > dep[u] && guard++ < 30) v = upStep(v, u, 'active');
      if (u === v) {
        b.step('深度对齐后 **u == v == ' + u + '**：说明其中一个是另一个的祖先，答案直接就是 ' + u + '。' +
          '一共只跳了 ' + hops + ' 步。', [C.state('n' + u, 'path')], { line: 7, milestone: '答案 = ' + u });
        return finish(b);
      }
      b.step('两者深度已相同但还不是同一点，现在**并肩向上**：每一步都让 u 和 v 各走一格，直到相遇。' +
        '这是"最近"二字的保证 —— 相遇点上方一定不再是共同祖先。', [
        C.state('n' + u, 'active'), C.state('n' + v, 'active')
      ], { line: 5 });
      guard = 0;
      while (u !== v && guard++ < 30) {
        const pu = fa[u], pv = fa[v];
        hops += 2;
        b.step(u + ' 与 ' + v + ' 不同 → 同时上跳：' + u + ' → **' + pu + '**，' + v + ' → **' + pv + '**。', [
          C.pulse('n' + u + '>n' + pu), C.pulse('n' + v + '>n' + pv),
          C.state('n' + u, 'visited'), C.state('n' + v, 'visited'),
          C.state('n' + pu, 'active'), C.state('n' + pv, 'active'),
          C.push('log', { label: u + '↑' + pu + ' & ' + v + '↑' + pv, meta: 'hop ' + hops })
        ], { line: 6, vars: [{ name: 'u', value: pu }, { name: 'v', value: pv }] });
        u = pu; v = pv;
      }
      b.step('相遇了！**LCA = ' + u + '**。全程一共走了 ' + hops + ' 步。' +
        '如果树退化成一条长链、被问的又是链两端的叶子，朴素法要走 O(n) 步——这正是倍增法（O(log n)）、' +
        'Tarjan 离线（O(n+q)）、欧拉序 RMQ（O(1) 查询）存在的理由。', [
        C.state('n' + u, 'path')
      ], { line: 7, milestone: '答案 = ' + u });
      return finish(b);
    }
  });

  /* ============================================================
   * 3. 树的直径 · 树形 DP
   * ============================================================ */
  TGV.register({
    id: 'tree_diameter_dp', name: '树的直径 · 树形 DP（d1 / d2）', category: '树 · 树的性质',
    layout: 'tree', childOrder: 'none',
    compareWith: 'tree_diameter',
    panels: [
      { id: 'dp', type: 'table', title: '向下最长 / 次长链', columns: [{ key: 'd1', label: 'd1' }, { key: 'd2', label: 'd2' }] },
      { id: 'log', type: 'list', title: '候选直径' }
    ],
    pseudocode: [
      '// 两遍 BFS 只能求出「一条」直径；树形 DP 一次 DFS 就能顺便统计所有信息',
      'dfs(u, p):',
      '    d1 = d2 = 0                     // 向下的最长链 / 次长链',
      '    for v in adj[u], v != p:',
      '        dfs(v, u)',
      '        len = down[v] + 1',
      '        if len > d1: d2 = d1; d1 = len',
      '        else if len > d2: d2 = len',
      '    down[u] = d1',
      '    ans = max(ans, d1 + d2)         // 经过 u 的最长路径 = 两个最深的子树拼起来',
      'return ans'
    ],
    presets: [
      { id: 'p1', label: '标准树：直径在 4–9 之间', desc: '每个结点回报自己的 d1 / d2', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [5, 6], [5, 7], [3, 8], [8, 9]] }) },
      { id: 'p2', label: '星形树：中心是枢纽', desc: 'd1 + d2 在中心达到最大', data: () => ({ edges: [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6]] }) },
      { id: 'p3', label: '链状树：贴边走', desc: 'DP 与两次 BFS 结果一致', data: () => ({ edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] }) }
    ],
    run(input) {
      const edgesIn = input.edges || [[1, 2], [1, 3], [2, 4], [2, 5], [5, 6], [5, 7], [3, 8], [8, 9]];
      const seen = new Set();
      edgesIn.forEach(([p, c]) => { seen.add(p); seen.add(c); });
      const nodes = [...seen].sort((a, b) => a - b).map(v => ({ id: 'n' + v, label: String(v), key: v }));
      const edges = edgesIn.map(([p, c]) => ({ id: 'n' + p + '>n' + c, source: 'n' + p, target: 'n' + c }));
      const b = new TGV.Builder(this, { nodes, edges, panels: rowOrder(this.panels, nodes.map(n => n.id)) });
      const adj = {}, down = {}, fa = {};
      nodes.forEach(n => { adj[n.key] = []; down[n.key] = 0; });
      edgesIn.forEach(([p, c]) => { adj[p].push(c); adj[c].push(p); });
      let best = 0, bestU = null;
      b.step('**树形 DP 求直径**的核心公式只有一行：`ans = max(ans, d1[u] + d2[u])`。' +
        '含义是"**经过 u 的最长路径 = u 往下最深的两条链拼起来**"。因为树上任意一条路径都有一个最高的点，' +
        '在那个点上它必然由两条向下的链组成 —— 所以枚举所有点就覆盖了所有路径。', [], { line: 1 });
      const order = [];
      (function build(u, p) {
        fa[u] = p; order.push(u);
        adj[u].forEach(v => { if (v !== p) build(v, u); });
      })(1, 0);
      // 逆后序（自底向上）计算
      for (let i = order.length - 1; i >= 0; i--) {
        const u = order[i];
        let d1 = 0, d2 = 0, son1 = null;
        const cm = [];
        const kids = adj[u].filter(v => v !== fa[u]);
        if (!kids.length) {
          b.step('**' + u + '** 是叶子：没有向下的边，`d1 = d2 = 0`，不可能产生经过它的长路径。', [
            C.table('dp', 'n' + u, 'd1', 0), C.table('dp', 'n' + u, 'd2', 0), C.state('n' + u, 'visited')
          ], { line: 9, vars: [{ name: 'u', value: u }] });
          continue;
        }
        kids.forEach(v => {
          const len = down[v] + 1;
          if (len > d1) { d2 = d1; d1 = len; son1 = v; }
          else if (len > d2) { d2 = len; }
          cm.push(C.pulse('n' + u + '>n' + v));
        });
        down[u] = d1;
        const through = d1 + d2;
        const better = through > best;
        if (better) { best = through; bestU = u; }
        b.step('回到 **' + u + '**：孩子 ' + kids.map(v => v + '（' + (down[v] + 1) + '）').join('、') +
          ' 依次汇报，取最长链 `d1 = ' + d1 + '`' + (d2 ? '、次长链 `d2 = ' + d2 + '`' : '、次长链 `d2 = 0`') + '。' +
          '经过 ' + u + ' 的最长路径 = ' + d1 + ' + ' + d2 + ' = **' + through + '**' +
          (better ? '，刷新全局答案！' : '，不如已记录的 ' + best + '。'), [
          C.table('dp', 'n' + u, 'd1', d1), C.table('dp', 'n' + u, 'd2', d2),
          C.state('n' + u, better ? 'path' : 'active'),
          C.push('log', { label: u + ': d1=' + d1 + ' d2=' + d2 + ' → ' + through, meta: better ? '★ 最优' : '' })
        ].concat(cm), { line: 10, vars: [{ name: 'd1', value: d1 }, { name: 'd2', value: d2 }], milestone: better ? '经过 ' + u + ' 的路径 = ' + through : null });
      }
      b.step('自底向上扫完所有结点，**直径 = ' + best + '**，最优的"拐点"是 ' + bestU + '。' +
        '与两次 BFS 相比：DP **一次 DFS** 就得到答案，且能顺便求出所有"过某点的最长路径"，' +
        '在需要换根 DP（二次扫描）的题目里是必需的基本功；代价是需要递归/显式栈，且不能像 BFS 那样直接给出路径两端。', [
        C.state('n' + bestU, 'path')
      ], { line: 10, milestone: '直径 = ' + best });
      return finish(b);
    }
  });

  /* ============================================================
   * 4. 带权并查集（维护到根的偏移量）
   * ============================================================ */
  const W_NODES = [['C', 480, 150], ['A', 210, 320], ['B', 750, 320], ['D', 180, 510], ['E', 480, 510], ['F', 780, 510]];
  TGV.register({
    id: 'dsu_weighted', name: '带权并查集（维护到根的偏移量）', category: '树 · 并查集',
    layout: 'fixed', directed: true,
    panels: [
      { id: 'dsu', type: 'dsu', title: '并查集森林（parent）' },
      { id: 'off', type: 'table', title: 'd[x]：x 到根的偏移', columns: [{ key: 'd', label: 'd[x]' }] },
      { id: 'log', type: 'list', title: '关系与判定' }
    ],
    pseudocode: [
      '// 普通并查集只回答「是否同集合」；带权并查集还能回答「关系是什么」',
      '// 经典模型：A 吃 B、B 吃 C、C 吃 A（模 3 循环），d[x] = x 相对根的偏移 ∈ {0,1,2}',
      'find(x):',
      '    if fa[x] == x: return x',
      '    r = find(fa[x])',
      '    d[x] = (d[x] + d[fa[x]]) % 3      // 路径压缩时把偏移一路累加',
      '    fa[x] = r; return r',
      'union(x, y, rel):                     // 已知 x 相对 y 的关系是 rel',
      '    rx = find(x); ry = find(y)',
      '    if rx == ry: return (d[x] - d[y] + 3) % 3 == rel   // 只能校验，不能合并',
      '    fa[rx] = ry; d[rx] = (d[y] - d[x] + rel + 3) % 3    // 反解出根之间的偏移'
    ],
    presets: [
      { id: 'p1', label: '食物链：A吃B、B吃C、C吃A', desc: '三条关系闭环，之后所有查询都能推出', data: () => ({ ops: [['union', 'A', 'B', 1], ['union', 'B', 'C', 1], ['query', 'A', 'C']] }) },
      { id: 'p2', label: '矛盾检测：谎话被识破', desc: 'A 吃 B 又说 B 吃 A，与已确立的关系冲突', data: () => ({ ops: [['union', 'A', 'B', 1], ['union', 'B', 'C', 1], ['union', 'C', 'A', 0]] }) }
    ],
    run(input) {
      const ops = (input.ops && input.ops.length) ? input.ops
        : [['union', 'A', 'B', 1], ['union', 'B', 'C', 1], ['query', 'A', 'C']];
      const idSet = new Set();
      ops.forEach(op => { [op[1], op[2]].forEach(v => { if (v != null) idSet.add(String(v)); }); });
      const nodeIds = [...idSet];
      const nodes = nodeIds.map((id, i) => ({
        id, label: id, x: 120 + (i % 6) * 128, y: 110 + Math.floor(i / 6) * 116
      }));
      const b = new TGV.Builder(this, { nodes, edges: [], panels: rowOrder(this.panels, nodeIds) });
      const fa = {}, d = {};
      nodeIds.forEach(id => { fa[id] = id; d[id] = 0; });
      /* 把 fa[] 画成橙色箭头边：并查集森林的形状就是这里唯一要看的东西 */
      const ptr = {}; let seq = 0;
      const sync = (cmds) => {
        const cm = cmds || [];
        nodeIds.forEach(x => {
          const want = fa[x] !== x ? fa[x] : null;
          const cur = ptr[x];
          if (!want) {
            if (cur) { cm.push(C.removeEdge(cur.eid)); delete ptr[x]; }
            return;
          }
          if (cur && cur.p === want) return;
          if (cur) cm.push(C.removeEdge(cur.eid));
          const eid = 'P' + (++seq);
          cm.push(C.addEdge(eid, x, want));
          cm.push(C.edgeColor(eid, '#F97316', false, 2.4));
          ptr[x] = { eid, p: want };
        });
        cm.push(C.dsu('dsu', Object.assign({}, fa), null));
        nodeIds.forEach(id => cm.push(C.table('off', id, 'd', d[id])));
        return cm;
      };
      b.step('**带权并查集**在 `fa[]` 之外多维护一个 `d[x]`：**x 到根的偏移量**。' +
        '普通并查集只能答"是否同一队"，带权版本还能答"谁吃谁""差多少""同类还是异类"。' +
        '本例用经典**食物链**模型：关系值 0 = 同类，1 = x 吃 y，2 = y 吃 x，模 3 循环。', sync([]), { line: 1 });
      const find = (x, log) => {
        if (fa[x] === x) return x;
        const p = fa[x];
        const r = find(p, log);
        const before = d[x];
        d[x] = (d[x] + d[p]) % 3;
        if (log && d[x] !== before) log.push('路径压缩：d[' + x + '] ' + before + ' → ' + d[x]);
        fa[x] = r;
        return r;
      };
      ops.forEach(op => {
        if (op[0] === 'union') {
          const [, x, y, rel] = op;
          b.step('**合并关系**：已知「' + x + ' 相对 ' + y + ' 的关系 = ' + rel +
            '」（' + (rel === 0 ? '同类' : rel === 1 ? x + ' 吃 ' + y : y + ' 吃 ' + x) + '）。先各自 find 到根。', [
            C.state(x, 'active'), C.state(y, 'active')
          ], { line: 8, vars: [{ name: 'x', value: x }, { name: 'y', value: y }] });
          const log = [];
          const rx = find(x, log), ry = find(y, log);
          b.step('find(' + x + ') = **' + rx + '**（d = ' + d[x] + '），find(' + y + ') = **' + ry + '**（d = ' + d[y] + '）。' +
            (log.length ? '路径压缩过程中偏移被累加：' + log.join('；') + '。' : '两者已经是根，偏移无需累加。'), sync([
            C.state(rx, 'path'), C.state(ry, 'path')
          ]), { line: 9 });
          if (rx === ry) {
            const real = (d[x] - d[y] + 3) % 3;
            const ok = real === rel;
            b.step('两个根相同 → **不能合并，只能校验**：按现有关系推出 ' + x + ' 相对 ' + y + ' 是 **' + real +
              '**，而题目声称 ' + rel + ' → ' + (ok ? '**一致，这条陈述为真**。' : '**矛盾！这是一句假话。**'), sync(ok ? [
              C.state(x, 'path'), C.state(y, 'path')
            ] : [
              C.state(x, 'conflict'), C.state(y, 'conflict'),
              C.push('log', { label: '✗ ' + x + ' vs ' + y + '：应为 ' + real + '，却声称 ' + rel, meta: '假话' })
            ]), { line: 10, milestone: ok ? '校验通过' : '★ 发现矛盾' });
          } else {
            fa[rx] = ry;
            const nd = (d[y] - d[x] + rel + 3) % 3;
            d[rx] = nd;
            b.step('两根不同 → 合并：`fa[' + rx + '] = ' + ry + '`，偏移要**反解**：' +
              '`d[' + rx + '] = (d[' + y + '] - d[' + x + '] + rel) mod 3 = ' + nd + '`。' +
              '这个式子的由来是"从 ' + x + ' 走到 ' + y + ' 有两条路，长度必须相等"，把未知的根间偏移单独解出来。', sync([
              C.state(rx, 'conflict'), C.state(ry, 'path'),
              C.push('log', { label: '✓ 合并 ' + rx + ' → ' + ry + '（d=' + nd + '）', meta: 'rel=' + rel })
            ]), { line: 11, milestone: 'fa[' + rx + '] = ' + ry });
          }
        } else if (op[0] === 'query') {
          const [, x, y] = op;
          const rx = find(x), ry = find(y);
          const rel = (d[x] - d[y] + 3) % 3;
          b.step('**查询 ' + x + ' 与 ' + y + ' 的关系**：若不同根 → 关系未知；同根（' + rx + ' / ' + ry + '）→ ' +
            '`rel = (d[' + x + '] - d[' + y + ']) mod 3 = (' + d[x] + ' - ' + d[y] + ') mod 3 = ' + rel + '`，即 **' +
            (rel === 0 ? '同类' : rel === 1 ? x + ' 吃 ' + y : y + ' 吃 ' + x) + '**。', sync([
            C.state(x, 'path'), C.state(y, 'path')
          ]), { line: 10, milestone: x + ' 与 ' + y + '：' + (rel === 0 ? '同类' : rel === 1 ? x + '吃' + y : y + '吃' + x) });
        }
      });
      b.step('**带权并查集的全部代价**只比普通并查集多一个 `d[]` 数组，但表达力从"是否连通"扩展到"任意可加/可模的关系"。' +
        '常见变体：维护到根的距离（`d[x] += d[fa[x]]`，加法群）、维护奇偶性（异或）、维护模 3 的捕食关系（本例）。' +
        '关键永远是那个**反解式子**：合并时用"两条路径等长"解出根间偏移。',
      nodeIds.map(id => C.state(id, 'default')).concat([C.state('C', 'path')]),
      { line: 1, milestone: '演示完成' });
      return finish(b);
    }
  });

  /* ============================================================
   * 5. 可撤销并查集
   * ============================================================ */
  const R_NODES = [['1', 470, 140], ['2', 300, 300], ['3', 660, 300], ['4', 190, 470], ['5', 400, 470], ['6', 660, 470]];
  const R_EDGES = [['1', '2'], ['1', '3'], ['2', '4'], ['2', '5'], ['3', '6']];
  TGV.register({
    id: 'dsu_rollback', name: '可撤销并查集（按秩合并 + 操作栈）', category: '树 · 并查集',
    layout: 'fixed', directed: true,
    panels: [
      { id: 'dsu', type: 'dsu', title: '并查集森林' },
      { id: 'stk', type: 'list', title: '历史操作栈（撤销顺序 = 逆序）' }
    ],
    pseudocode: [
      '// 普通并查集用路径压缩换来近 O(1)，但路径压缩会破坏历史，无法撤销',
      '// 可撤销版本：只用「按秩/按大小合并」，把每次修改记进栈里（节点角标 sz = 集合大小）',
      'find(x):                              // 注意：绝不能路径压缩',
      '    while fa[x] != x: x = fa[x]',
      '    return x                          // 复杂度 O(log n)，由树高保证',
      'union(x, y):',
      '    rx = find(x); ry = find(y)',
      '    if rx == ry: return false',
      '    if sz[rx] > sz[ry]: swap(rx, ry)  // 小树挂大树，树高 ≤ log n',
      '    stack.push((rx, ry)); fa[rx] = ry; sz[ry] += sz[rx]   // 只改两处，都可还原',
      'rollback():',
      '    (rx, ry) = stack.pop(); fa[rx] = rx; sz[ry] -= sz[rx]  // 精确回滚'
    ],
    presets: [
      { id: 'p1', label: '合并 → 撤销 → 再合并', desc: '观察栈顶出栈后森林精确还原', data: () => ({}) },
      { id: 'p2', label: '连续撤销三层', desc: '一路弹栈回到初始状态', data: () => ({ deep: true }) }
    ],
    run(input) {
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: false })
        : TGV.GraphLib.mkGraph(R_NODES, R_EDGES, { directed: false });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: rowOrder(this.panels, g.nodes.map(n => n.id)) });
      const ids = g.nodes.map(n => n.id);
      const fa = {}, sz = {}, rank = {};
      ids.forEach(id => { fa[id] = id; sz[id] = 1; rank[id] = 0; });
      const stack = [];
      /* 原图边只作"合并候选"的背景，真正要看的是橙色 fa 指针 */
      const ptr = {}; let seq = 0;
      const sync = (cmds) => {
        const cm = cmds || [];
        ids.forEach(x => {
          const want = fa[x] !== x ? fa[x] : null;
          const cur = ptr[x];
          if (!want) {
            if (cur) { cm.push(C.removeEdge(cur.eid)); delete ptr[x]; }
            return;
          }
          if (cur && cur.p === want) return;
          if (cur) cm.push(C.removeEdge(cur.eid));
          const eid = 'P' + (++seq);
          cm.push(C.addEdge(eid, x, want));
          cm.push(C.edgeColor(eid, '#F97316', false, 2.4));
          ptr[x] = { eid, p: want };
        });
        cm.push(C.dsu('dsu', Object.assign({}, fa), Object.assign({}, rank)));
        ids.forEach(id => cm.push(C.badge(id, 'sz', sz[id])));
        cm.push(C.setQ('stk', stack.map((s, i) => ({ key: 's' + i, label: s[0] + ' → ' + s[1], meta: '#' + (i + 1) }))));
        return cm;
      };
      const find = (x) => { let g2 = 0; while (fa[x] !== x && g2++ < 20) x = fa[x]; return x; };
      const edgeOf = (u, v) => g.edges.find(e => (e.source === u && e.target === v) || (e.source === v && e.target === u));
      b.step('**可撤销并查集**的适用场景：DFS 回溯、线段树分治、动态连通性——这些算法需要在"进入时合并、离开时拆开"。' +
        '但路径压缩会把 `fa[x]` 改得面目全非，历史无法还原。所以可撤销版本**只用按秩合并**，靠"小挂大"把树高控制在 log n。' +
        '灰色虚线的输入图只表示"允许合并哪些点"，**橙色箭头才是并查集森林的父指针**。',
      sync([]).concat(g.edges.map(e => C.edgeColor(e.id, '#CBD5E1', true, 1.4))), { line: 1 });
      const doUnion = (u, v) => {
        const e = edgeOf(u, v);
        b.step('尝试合并 **' + u + ' — ' + v + '**：先各自 find 到根（注意 find 里**不改任何指针**）。', [
          C.state(u, 'active'), C.state(v, 'active')
        ].concat(e ? [C.pulse(e.id)] : []), { line: 6 });
        let rx = find(u), ry = find(v);
        if (rx === ry) {
          b.step('两者根相同（都是 ' + rx + '）→ 已经在同一集合，本次**不压栈**。' +
            '可撤销并查集必须保证"每次操作最多压一条记录"，否则回滚就对不上了。', sync([]), { line: 8 });
          return;
        }
        if (sz[rx] > sz[ry]) { const t = rx; rx = ry; ry = t; }
        stack.push([rx, ry]);
        fa[rx] = ry; sz[ry] += sz[rx]; rank[ry] = Math.max(rank[ry], rank[rx] + 1);
        b.step('按大小合并：小树根 **' + rx + '** 挂到大树根 **' + ry + '** 下面（`sz[' + rx + '] = ' + (sz[ry] - sz[rx] > 0 ? sz[ry] - sz[rx] : 0) + ' < sz[' + ry + '] `）。' +
          '**只改了两处**：`fa[' + rx + ']` 和 `sz[' + ry + ']`。把 `(' + rx + ', ' + ry + ')` 压进历史栈，' +
          '回滚时把这两处原样改回去即可。', sync([
          C.state(rx, 'conflict'), C.state(ry, 'path'),
          C.push('stk', { label: rx + ' → ' + ry, meta: '#' + stack.length })
        ]), { line: 10, milestone: '合并 ' + rx + ' → ' + ry });
      };
      const doRollback = () => {
        if (!stack.length) {
          b.step('历史栈为空，**无法再撤销**。', [], { line: 11 });
          return;
        }
        const [rx, ry] = stack.pop();
        fa[rx] = rx; sz[ry] -= sz[rx];
        b.step('**撤销（rollback）**：弹出栈顶 **(' + rx + ', ' + ry + ')**，还原 `fa[' + rx + '] = ' + rx + '`、' +
          '`sz[' + ry + '] -= sz[' + rx + ']`。因为当初只改了这两处，所以**一次弹栈就能精确回到上一状态**，' +
          '没有"改了一半"的中间态 —— 这是可撤销并查集能用的根本前提。', sync([
          C.state(rx, 'path'), C.state(ry, 'active')
        ]), { line: 12, milestone: '撤销 ' + rx + ' → ' + ry });
      };
      if (input.deep) {
        doUnion('2', '4'); doUnion('2', '5'); doUnion('1', '2');
        b.step('三次合并后，{2,4,5} 已经全部挂到 2 号下面，1 又挂到了这个大集合上，栈深 3。接下来连续撤销三次。', sync([]), { line: 10, stage: true });
        doRollback(); doRollback(); doRollback();
        b.step('三次撤销后森林回到**完全初始**的状态：每个点自己成根、size 全为 1、栈空。' +
          '这就是"撤销操作"比"重新建一遍"强大的地方 —— 在 DFS 回溯里，重建成 O(n)，撤销是 O(1)。', sync([]), { line: 12, milestone: '回到初始状态' });
      } else {
        doUnion('2', '4'); doUnion('2', '5'); doUnion('1', '2');
        doRollback();
        b.step('撤销掉 1 → 2 后，1 重新独立，但 {2,4,5} 这个大集合**原封不动**。' +
          '这正符合栈的语义：只能撤销"最近一次"，不能跳过中间操作。', sync([]), { line: 12, milestone: '撤销一层' });
        doUnion('3', '6');
        b.step('继续合并 3 — 6。现在栈里是 (4→2)、(5→2)、(6→3) 三条记录。' +
          '**注意**：撤销后再次合并，栈的顺序依然是严格的"后进先出"，所以回滚序列唯一确定。', sync([]), { line: 10 });
      }
      b.step('**复杂度权衡**：没有路径压缩，单次 find 是 O(log n)（树高上界由按大小合并保证），比普通并查集慢一点点；' +
        '换来的是 O(1) 撤销。所以**能用普通并查集就别用可撤销版**，需要回溯的时候它才是唯一选择。', [], { line: 3, milestone: '演示完成' });
      return finish(b);
    }
  });
})();
