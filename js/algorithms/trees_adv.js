/* ============================================================
 * 第一卷 · T13 进阶树结构
 * 压缩 Trie(Patricia) · 树的重心 · 树链剖分 · KD 树
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* ============================================================
   * 1. 压缩 Trie（Patricia / 基数树）
   * ============================================================ */
  TGV.register({
    id: 'radix_trie', name: '压缩 Trie（基数树 · 单链合并）', category: '树 · 字符串',
    layout: 'tree', directed: true, acceptsGraph: false,
    compareWith: 'trie',
    panels: [
      { id: 'words', type: 'list', title: '插入的单词' },
      { id: 'split', type: 'list', title: '本轮动作' }
    ],
    pseudocode: [
      '// 普通 Trie 每个字符一个节点；压缩 Trie 把"只有一个儿子"的链并成一条边',
      'insert(word):',
      '    从根出发，看当前边上的标号 seg 与 word 的剩余部分',
      '    lcp = 最长公共前缀(seg, word)',
      '    if lcp == seg 全部: 沿着这条边往下走，继续插剩余部分',
      '    if lcp 是 seg 的真前缀: 把 seg 拆成 lcp 与剩余两段，中间插一个新节点',
      '    if 没有匹配的边: 直接挂一条新边',
      '// 节点数 = O(单词数)，而不是 O(总字符数)'
    ],
    presets: [
      { id: 'std', label: 'do / dog / door / dot / cap / cat', desc: '注意 do 与 dog 共用 "do"，door 与 dot 拆出 "o"', data: () => ({}) }
    ],
    run(input) {
      const words = (input.words && input.words.length) ? input.words : ['do', 'dog', 'door', 'dot', 'cap', 'cat'];
      // 结构：id -> {seg, kids: [ids], end}
      const st = { root: { seg: '', kids: [], end: false } };
      let seq = 0;
      const newId = () => 'p' + (++seq);
      const kidsOf = id => (st[id] ? st[id].kids : []);
      const allEdges = () => {
        const out = [];
        Object.keys(st).forEach(u => st[u].kids.forEach(v => out.push({ id: u + '>' + v, source: u, target: v })));
        return out;
      };

      const b = new TGV.Builder(this, {
        nodes: [{ id: 'root', label: '(根)', x: 400, y: 60 }],
        edges: [], panels: this.panels
      });
      let liveEdges = [];
      const sync = (cmds) => {
        liveEdges.forEach(e => cmds.push(C.removeEdge(e)));
        liveEdges = [];
        allEdges().forEach(e => { cmds.push(C.addEdge(e.id, e.source, e.target)); liveEdges.push(e.id); });
        Object.keys(st).forEach(id => {
          if (id === 'root') return;
          cmds.push(C.setLabel(id, st[id].seg + (st[id].end ? '·' : '')));
          cmds.push(C.badge(id, 'seg', '"' + st[id].seg + '"'));
        });
      };

      b.step('**压缩 Trie（基数树 / Patricia）**针对普通 Trie 的浪费：一串只有一个儿子的节点（如 d→o→o→r）其实可以压成一条边，旁边标注字符串。' +
        '压缩后节点数只与单词数同阶，而不是总字符数。代价是插入时要**拆分边**。', [], { line: 1 });

      const insert = (word) => {
        b.step('**插入 "' + word + '"**。', [C.q('words', 'push', [{ key: word, label: word }])], { line: 2, milestone: '插入 ' + word });
        let u = 'root';
        let rest = word;
        let guard = 0;
        while (rest.length && guard++ < 12) {
          // 找首字符匹配的边
          let hit = null;
          for (let i = 0; i < st[u].kids.length; i++) {
            const v = st[u].kids[i];
            if (st[v].seg.charAt(0) === rest.charAt(0)) { hit = v; break; }
          }
          if (!hit) {
            const id = newId();
            st[id] = { seg: rest, kids: [], end: true };
            st[u].kids.push(id);
            const cmds = [C.addNode(id, rest, { hidden: false }), C.badge(id, 'seg', '"' + rest + '"')];
            b.step('在 ' + (u === 'root' ? '根' : '"' + st[u].seg + '"') + ' 下找不到以 "' + rest.charAt(0) + '" 开头的边 → **直接新建一条边 "' + rest + '"**。' +
              '这条边上挂着整个后缀，省掉了中间所有节点。', cmds.concat([
              C.q('split', 'push', [{ key: id, label: '新增边 "' + rest + '"' }])
            ]), { line: 7, milestone: '新增边 ' + rest });
            rest = '';
            break;
          }
          const seg = st[hit].seg;
          let lcp = 0;
          while (lcp < seg.length && lcp < rest.length && seg.charAt(lcp) === rest.charAt(lcp)) lcp++;
          if (lcp === seg.length) {
            b.step('边 "' + seg + '" 与剩余部分 "' + rest + '" 的前缀完全匹配 → **沿着这条边走下去**，还剩 "' + rest.slice(lcp) + '" 要处理。', [
              C.state(hit, 'active')
            ], { line: 4 });
            u = hit;
            rest = rest.slice(lcp);
            if (!rest.length) { st[u].end = true; }
            continue;
          }
          // 需要拆分
          const mid = newId();
          st[mid] = { seg: seg.slice(0, lcp), kids: [hit], end: false };
          st[hit].seg = seg.slice(lcp);
          const idx = st[u].kids.indexOf(hit);
          st[u].kids[idx] = mid;
          const cmds = [
            C.addNode(mid, st[mid].seg, {}),
            C.badge(mid, 'seg', '"' + st[mid].seg + '"'),
            C.removeEdge(u + '>' + hit)
          ];
          b.step('边 "' + seg + '" 与 "' + rest + '" 只有 **"' + seg.slice(0, lcp) + '"** 是公共前缀 → **拆分**：' +
            '中间插入新节点 "' + st[mid].seg + '"，原来那半段缩成 "' + st[hit].seg + '"。' +
            '这就是 Patricia 的"边分裂"，它保证了压缩后仍然是一棵合法的树。', cmds.concat([
            C.q('split', 'push', [{ key: mid, label: '拆分出 "' + st[mid].seg + '"' }])
          ]), { line: 5, milestone: '拆分 "' + seg + '" → "' + st[mid].seg + '" + "' + st[hit].seg + '"' });
          u = mid;
          rest = rest.slice(lcp);
        }
        st[u].end = true;
        const cmds = [];
        sync(cmds);
        b.step('单词 "' + word + '" 插入完成（末端节点打上"词尾"标记 ·）。', cmds, { line: 8 });
      };

      words.forEach(w => insert(w));

      const nodes = Object.keys(st).length;
      const chars = words.join('').length;
      b.step('全部插入完成：**' + words.length + ' 个单词共用 ' + nodes + ' 个节点**。' +
        '如果用普通 Trie，节点数大约是总字符数 ' + chars + ' 的量级；压缩后只与单词数相关。' +
        '路由表（IP 前缀匹配）、数据库索引、倒排索引里的"前缀压缩"用的都是这个思路。' +
        '代价是每次插入可能触发拆分，代码比普通 Trie 复杂不少。', [], { line: 8, milestone: '压缩完成：' + nodes + ' 节点', stage: true });

      return { nodes: [{ id: 'root', label: '(根)' }].concat(Object.keys(st).filter(k => k !== 'root').map(k => ({ id: k, label: st[k].seg }))), edges: allEdges(), frames: b.frames, panels: b.panels, directed: true };
    }
  });

  /* ============================================================
   * 2. 树的重心
   * ============================================================ */
  const CT_NODES = [['A', 120, 100], ['B', 300, 70], ['C', 480, 120], ['D', 620, 260], ['E', 470, 300], ['F', 300, 330], ['G', 140, 300], ['H', 300, 470]];
  const CT_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['C', 'E'], ['E', 'F'], ['F', 'G'], ['F', 'H']];

  TGV.register({
    id: 'tree_centroid', name: '树的重心（最大子树最小）', category: '树 · 进阶',
    layout: 'tree', directed: true, acceptsGraph: false,
    compareWith: 'tree_diameter',
    panels: [
      { id: 'watch', type: 'table', title: 'size / 最大子树', columns: [{ key: 'sz', label: 'size' }, { key: 'mx', label: '最大子树' }] },
      { id: 'res', type: 'list', title: '判定结果' }
    ],
    pseudocode: [
      '// 重心：删掉它以后，剩下各连通块（各子树）中最大的那个最小',
      'dfs(u, parent):',
      '    size[u] = 1',
      '    for each 儿子 v: dfs(v, u); size[u] += size[v]',
      '// 对每个点算"最大子树"',
      'mx[u] = max( max_size_of_children, n - size[u] )',
      '//             ↑ 儿子们              ↑ 父亲那一侧（向上看）',
      '重心 = 使 mx[u] 最小的点（可能有 2 个，相邻）',
      '// 性质：重心一定在直径中点附近；树最多有 2 个重心'
    ],
    presets: [
      { id: 'std', label: '8 点树 · 重心在 C', desc: '父亲那一侧的 n−size 别忘算', data: () => ({}) }
    ],
    run(input) {
      const g = (input && input.edges && input.edges.length)
        ? (() => {
            const ids = new Set();
            input.edges.forEach(([a, b]) => { ids.add(a); ids.add(b); });
            return TGV.GraphLib.mkGraph([...ids].map(v => [String(v), 0, 0]),
              input.edges.map(([a, b]) => [String(a), String(b)]), { directed: true });
          })()
        : TGV.GraphLib.mkGraph(CT_NODES, CT_EDGES, { directed: true });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const n = g.nodes.length;
      const size = {}, mx = {};
      const parent = {};

      b.step('**重心**的定义：删掉某个点后，图会裂成若干块，其中最大的那块大小记为 `mx[u]`。让 `mx[u]` 最小的点就是重心。' +
        '直观理解：重心是"最平衡"的位置，树上的"中位数"。它有一个容易漏掉的点 —— **父亲那一侧也算一块**。', [],
        { line: 1, vars: [{ name: 'n', value: n }] });

      const dfs = (u, p, depth) => {
        parent[u] = p;
        size[u] = 1;
        b.step('进入 **' + u + '**（父 = ' + (p || '无') + '）。', [
          C.state(u, 'active'), C.badge(u, 'sz', 1)
        ], { line: 3, vars: [{ name: 'depth', value: depth }] });
        let mxChild = 0;
        g.adj[u].forEach(link => {
          const v = link.to;
          if (v === p) return;
          dfs(v, u, depth + 1);
          size[u] += size[v];
          if (size[v] > mxChild) mxChild = size[v];
        });
        b.step(u + ' 处理完毕：`size[' + u + '] = ' + size[u] + '`（自己 + 所有子树）。' +
          '它的儿子里最大的一棵有 ' + mxChild + ' 个点。', [
          C.badge(u, 'sz', size[u], true),
          C.table('watch', u, 'sz', size[u], true)
        ], { line: 4, milestone: u + ' size=' + size[u] });
        mx[u] = Math.max(mxChild, n - size[u]);
        b.step('算 ' + u + ' 的最大连通块：**max( 儿子中最大 = ' + mxChild + ', 父亲那侧 = n − size = ' + (n - size[u]) + ' ) = ' + mx[u] + '**。' +
          (n - size[u] > mxChild ? '⚠ 注意这里"父亲那一侧"才是最大的那块 —— 向上看永远是最容易忘记的一步。' : ''), [
          C.table('watch', u, 'mx', mx[u], true), C.badge(u, 'mx', mx[u], true),
          C.state(u, 'visited')
        ], { line: 6, milestone: u + ' mx=' + mx[u] });
      };

      // 从 1 号点当根
      dfs(g.nodes[0].id, null, 0);

      let best = Infinity, bestNodes = [];
      g.nodes.forEach(nd => {
        if (mx[nd.id] < best) { best = mx[nd.id]; bestNodes = [nd.id]; }
        else if (mx[nd.id] === best) bestNodes.push(nd.id);
      });
      const cmds = bestNodes.map(id => C.state(id, 'path')).concat(bestNodes.map(id => C.pulse(g.edges[0].id, { color: '#D97706' })));
      cmds.push(C.hull('ct', bestNodes, '#D97706', '重心'));
      cmds.push(C.clearHull('ct'));
      cmds.push(C.hull('ct', bestNodes, '#D97706', '重心'));
      g.nodes.forEach(nd => cmds.push(C.q('res', 'push', [{ key: nd.id, label: nd.id, meta: 'mx=' + mx[nd.id] }])));
      b.step('全部算完：各点的"最大块"是 ' + g.nodes.map(nd => nd.id + ':' + mx[nd.id]).join('，') + '。' +
        '最小值 **' + best + '**，对应重心 **' + bestNodes.join('、') + '**。' +
        '重心的实用性质：以它为根时所有子树大小 ≤ n/2（这就是"点分治"为什么从重心切开 —— 保证递归深度 O(log n)）；' +
        '树上带权"邮局问题"的最优位置也在重心。树的**重心最多两个**，且如果两个，它们一定相邻。', cmds,
        { line: 8, milestone: '重心 ' + bestNodes.join(','), stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: true };
    }
  });

  /* ============================================================
   * 3. 树链剖分（HLD）
   * ============================================================ */
  const HLD_NODES = [['A', 340, 70], ['B', 180, 170], ['C', 480, 170], ['D', 100, 270], ['E', 260, 270], ['F', 420, 270], ['G', 560, 270], ['H', 260, 380], ['I', 420, 380]];
  const HLD_EDGES = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['C', 'G'], ['E', 'H'], ['F', 'I']];

  TGV.register({
    id: 'hld', name: '树链剖分（重儿子 · 链 · dfn 连续）', category: '树 · 进阶',
    layout: 'tree', directed: true, acceptsGraph: false,
    compareWith: 'lca_binary',
    panels: [
      { id: 'watch', type: 'table', title: 'size / 重儿子', columns: [{ key: 'sz', label: 'size' }, { key: 'son', label: '重儿子' }, { key: 'top', label: '链顶' }] },
      { id: 'chains', type: 'list', title: '重链' }
    ],
    pseudocode: [
      '// 两遍 DFS：第一遍算 size 找重儿子；第二遍沿重儿子切链编号',
      'dfs1(u): size[u] = 1 + Σ size[儿子]；重儿子 = size 最大的那个儿子',
      'dfs2(u, top):',
      '    dfn[u] = ++timer；top[u] = top',
      '    dfs2(重儿子, top)              // 重儿子继承链顶',
      '    for each 轻儿子 v: dfs2(v, v)   // 轻儿子开新链',
      '// 关键结论：任意点到根的路径上，最多只有 O(log n) 条重链',
      '// 于是"路径操作"可以拆成 O(log n) 段连续的 dfn 区间 → 套线段树 O(log² n)'
    ],
    presets: [
      { id: 'std', label: '9 点树 · 剖成 4 条重链', desc: '重链上的 dfn 是连续的，这是能套线段树的原因', data: () => ({}) }
    ],
    run(input) {
      const mkGraphFrom = (arr, edg) => {
        if (input && input.edges && input.edges.length) {
          const ids = new Set();
          input.edges.forEach(([a, b]) => { ids.add(a); ids.add(b); });
          return TGV.GraphLib.mkGraph([...ids].map(v => [String(v), 0, 0]),
            input.edges.map(([a, b]) => [String(a), String(b)]), { directed: true });
        }
        return TGV.GraphLib.mkGraph(arr, edg, { directed: true });
      };
      const g = mkGraphFrom(HLD_NODES, HLD_EDGES);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: withRowOrder(this.panels, g.nodes.map(n => n.id)) });
      const size = {}, heavy = {}, top = {}, dfn = {}, dep = {};
      let timer = 0;
      const chains = {};
      const root = input.start != null ? String(input.start) : 'A';

      b.step('**树链剖分**要解决的痛点：树上路径操作（比如"把 u 到 v 路径上所有点加 1"）如果用朴素做法是 O(n)。' +
        '剖分的思路是把树切成若干条**重链**，使得每条重链上的点在一维编号（dfn）里**连续**，' +
        '于是路径操作可以拆成 O(log n) 段区间，套上线段树就变成 O(log² n)。', [], { line: 1 });

      const dfs1 = (u, p, d) => {
        dep[u] = d;
        size[u] = 1;
        let bestSz = 0, bestSon = null;
        b.step('**第一遍 DFS**：进入 ' + u + '（深度 ' + d + '）。', [C.state(u, 'active')], { line: 2 });
        g.adj[u].forEach(link => {
          const v = link.to;
          if (v === p) return;
          dfs1(v, u, d + 1);
          size[u] += size[v];
          if (size[v] > bestSz) { bestSz = size[v]; bestSon = v; }
        });
        heavy[u] = bestSon;
        b.step(u + ' 的子树共 **' + size[u] + '** 个点，其中最大的儿子是 **' + (bestSon || '无') + '**（' + bestSz + ' 个点）→ 它就是**重儿子**。' +
          '重儿子连出的边叫重边，重边连成重链。', [
          C.badge(u, 'sz', size[u], true),
          C.table('watch', u, 'sz', size[u], true),
          C.table('watch', u, 'son', bestSon || '-', true)
        ], { line: 2, milestone: u + ' 重儿子 = ' + (bestSon || '无') });
        if (bestSon) {
          const e = g.edges.find(x => x.source === u && x.target === bestSon);
          if (e) b.step('把 ' + u + '→' + bestSon + ' 这条边标成**重边**（蓝色粗线）。', [
            C.edge(e.id, 'active'), C.pulse(e.id, { color: '#2563EB' })
          ], { line: 2 });
        }
      };

      const dfs2 = (u, tp) => {
        top[u] = tp;
        dfn[u] = ++timer;
        if (!chains[tp]) chains[tp] = [];
        chains[tp].push(u);
        const cmds = [
          C.badge(u, 'dfn', dfn[u], true),
          C.table('watch', u, 'top', tp, true),
          C.state(u, 'visited')
        ];
        b.step('**第二遍 DFS**：' + u + ' 的链顶是 **' + tp + '**，dfn 编号 **' + dfn[u] + '**。' +
          '注意编号顺序：先一路沿重儿子走到底，再回头处理轻儿子 —— 这样同一条链上的 dfn 才会连续。', cmds,
          { line: 4, milestone: u + ' dfn=' + dfn[u] + ' top=' + tp });
        if (heavy[u]) dfs2(heavy[u], tp);
        g.adj[u].forEach(link => {
          const v = link.to;
          if (v === heavy[u] || dep[v] < dep[u]) return;
          b.step('轻儿子 ' + v + ' → 它要**另开一条新链**，链顶就是它自己。', [], { line: 6 });
          dfs2(v, v);
        });
      };

      dfs1(root, null, 0);
      b.step('第一遍结束。重儿子关系：' + g.nodes.map(nd => nd.id + '→' + (heavy[nd.id] || '·')).join('，') + '。' +
        '现在做第二遍：沿重儿子一路编下去。', [], { line: 3, milestone: 'size 计算完成', stage: true });
      dfs2(root, root);

      const cmds = [];
      Object.keys(chains).forEach((tp, i) => {
        cmds.push(C.q('chains', 'push', [{ key: tp, label: '链 ' + chains[tp].join('→'), meta: 'dfn ' + dfn[chains[tp][0]] + '..' + dfn[chains[tp][chains[tp].length - 1]] }]));
      });
      b.step('剖分完成：一共 **' + Object.keys(chains).length + ' 条重链**：' +
        Object.keys(chains).map(tp => '[' + chains[tp].join('→') + ']').join('、') + '。' +
        '每条链内的 dfn 是**连续区间**，这就是它能配合线段树做区间操作的根本原因。', cmds, { line: 5, milestone: '共 ' + Object.keys(chains).length + ' 条链' });

      // 路径查询演示
      const from = 'H', to = 'G';
      b.step('**实战：查询 ' + from + ' → ' + to + ' 的路径**。做法是"两边轮流往上跳"：每次比较两条链的链顶深度，' +
        '让链顶更深的那一边先跳到链顶的父亲，同时把 `[dfn[链顶], dfn[u]]` 这一段交给线段树处理。' +
        '由于每次跳都会换一条链，而重链只有 O(log n) 条，所以总共只跳 O(log n) 次。', [], { line: 7, milestone: '路径查询 O(log² n)', stage: true });

      b.step('剖分的三条核心结论：**① 重儿子按 size 选，保证轻边最多 O(log n) 条；② 同链 dfn 连续，可套线段树；' +
        '③ 路径操作 = O(log n) 段区间，总复杂度 O(log² n)**。' +
        '树链剖分是"把树上问题变成序列问题"的经典范式，LCT（Link-Cut Tree）可以看作它的动态版本。', [], { line: 8, milestone: '树链剖分完成', stage: true });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels, directed: true };
    }
  });

  /* ============================================================
   * 4. KD 树
   * ============================================================ */
  const KD_PTS = [[3, 7], [5, 4], [1, 2], [8, 6], [6, 1], [2, 8], [7, 3], [4, 5]];
  const KD_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  TGV.register({
    id: 'kd_tree', name: 'KD 树（交替维度切分 + 最近邻）', category: '树 · 进阶',
    layout: 'tree', directed: true, acceptsGraph: false,
    compareWith: 'segment_tree',
    panels: [
      { id: 'split', type: 'list', title: '切分顺序' },
      { id: 'nn', type: 'text', title: '最近邻搜索' }
    ],
    pseudocode: [
      '// 二维点集建平衡二叉树：每一层按一个维度取中位数切分',
      'build(points, depth):',
      '    axis = depth % 2                      // 0 用 x 切，1 用 y 切',
      '    按 axis 排序，取中位数当根',
      '    左子树 = 左半边（axis 值更小），右子树 = 右半边',
      '    递归 build(左/右, depth+1)',
      '// 查询最近邻：先走到叶子，回溯时用"切分平面到查询点的距离"剪枝',
      '// 平均 O(log n)，最坏 O(n)'
    ],
    presets: [
      { id: 'std', label: '8 个二维点 · 建树 + 查最近邻', desc: '每层换一个维度切，形成二叉搜索树', data: () => ({}) }
    ],
    run(input) {
      const pts = (input.points && input.points.length)
        ? input.points.map((p, i) => ({ id: 'p' + (i + 1), x: p[0], y: p[1] }))
        : KD_PTS.map((p, i) => ({ id: KD_LABELS[i], x: p[0], y: p[1] }));
      const b = new TGV.Builder(this, {
        nodes: pts.map(p => ({ id: p.id, label: p.id, x: 0, y: 0 })),
        edges: [], panels: this.panels
      });
      const st = {};   // id -> {p, axis, l, r}
      let live = [];
      const kidsOf = id => (st[id] ? [st[id].l, st[id].r].filter(Boolean) : []);
      const reLayout = (cmds) => {
        const root = Object.keys(st).find(id => !Object.keys(st).some(k => st[k].l === id || st[k].r === id));
        const pos = {};
        let cursor = 0;
        const walk = (u, d) => {
          if (!u) return null;
          const kids = kidsOf(u);
          if (!kids.length) { pos[u] = { x: cursor * 70 + 90, y: d * 88 + 80 }; cursor++; return pos[u].x; }
          const xs = kids.map(k => walk(k, d + 1));
          const x = xs.reduce((a, c) => a + c, 0) / xs.length;
          pos[u] = { x, y: d * 88 + 80 };
          return x;
        };
        if (root) walk(root, 0);
        live.forEach(e => cmds.push(C.removeEdge(e)));
        live = [];
        Object.keys(st).forEach(u => {
          ['l', 'r'].forEach(side => {
            const v = st[u][side];
            if (v) { cmds.push(C.addEdge(u + '>' + v, u, v)); live.push(u + '>' + v); }
          });
        });
        cmds.push(C.morph(pos, 420));
      };

      b.step('**KD 树**是把二叉搜索树推广到 k 维空间：每一层选一个维度，按该维度的**中位数**切开，' +
        '左子树全是小的、右子树全是大的。二维就 x/y 交替切。它是 k 近邻搜索、范围查询的经典结构。', [],
        { line: 1, vars: [{ name: 'n', value: pts.length }] });

      const build = (arr, depth, parent) => {
        if (!arr.length) return null;
        const axis = depth % 2;
        const sorted = arr.slice().sort((a, c) => (axis === 0 ? a.x - c.x : a.y - c.y));
        const mid = Math.floor(sorted.length / 2);
        const root = sorted[mid];
        st[root.id] = { p: root, axis: axis, l: null, r: null };
        b.step('**深度 ' + depth + '，按 ' + (axis === 0 ? 'x' : 'y') + ' 维切分**：点集 ' + sorted.map(p => p.id).join('') +
          ' 按 ' + (axis === 0 ? 'x' : 'y') + ' 排序后取中位数 → 根是 **' + root.id + '(' + root.x + ',' + root.y + ')**。' +
          '左半边 ' + sorted.slice(0, mid).map(p => p.id).join('') + ' 进左子树，右半边 ' + sorted.slice(mid + 1).map(p => p.id).join('') + ' 进右子树。', [
          C.setLabel(root.id, root.id + '(' + root.x + ',' + root.y + ')'),
          C.badge(root.id, axis === 0 ? 'x' : 'y', axis === 0 ? root.x : root.y, true),
          C.badge(root.id, 'dep', depth),
          C.state(root.id, 'active')
        ], { line: 4, milestone: '按 ' + (axis === 0 ? 'x' : 'y') + ' 切，根 ' + root.id });
        st[root.id].l = build(sorted.slice(0, mid), depth + 1, root.id);
        st[root.id].r = build(sorted.slice(mid + 1), depth + 1, root.id);
        const cmds = [];
        reLayout(cmds);
        cmds.push(C.q('split', 'push', [{ key: 'd' + depth + root.id, label: '深度 ' + depth + ': ' + (axis === 0 ? 'x' : 'y') + ' 维', meta: '根 ' + root.id }]));
        cmds.push(C.state(root.id, 'visited'));
        b.step('以 ' + root.id + ' 为根的子树建好了（深度 ' + depth + '）。', cmds, { line: 5 });
        return root.id;
      };
      const rootId = build(pts, 0, null);

      // 最近邻
      const q = { x: 4.2, y: 6.1 };
      b.step('建树完成。现在查询 **离 (' + q.x + ',' + q.y + ') 最近的点**。' +
        '朴素做法要遍历 8 个点；KD 树可以**剪枝**：如果"查询点到切分平面的距离"已经大于当前最优距离，那一整棵子树都不用看了。', [
        C.text('nn', ['查询点 Q(' + q.x + ',' + q.y + ')', ''])
      ], { line: 6, milestone: '开始最近邻查询' });

      let bestId = null, bestD = Infinity;
      const log = ['查询点 Q(' + q.x + ',' + q.y + ')', ''];
      const search = (u) => {
        if (!u) return;
        const p = st[u].p;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < bestD) { bestD = d; bestId = u; }
        log.push('访问 ' + u + '(' + p.x + ',' + p.y + ') d=' + d.toFixed(2) + (bestId === u ? '  ★更优' : ''));
        const axis = st[u].axis;
        const diff = axis === 0 ? q.x - p.x : q.y - p.y;
        const near = diff < 0 ? st[u].l : st[u].r;
        const far = diff < 0 ? st[u].r : st[u].l;
        b.step('访问 **' + u + '(' + p.x + ',' + p.y + ')**，距离 ' + d.toFixed(2) + '。' +
          '查询点在切分线的**' + (diff < 0 ? '左' : '右') + '侧**，先去那边搜；另一侧只有在 `|' + (axis === 0 ? 'Δx' : 'Δy') + '| = ' +
          Math.abs(diff).toFixed(2) + ' < 当前最优 ' + (isFinite(bestD) ? bestD.toFixed(2) : '∞') + '` 时才需要回访。', [
          C.state(u, 'active'), C.text('nn', log.slice(-7))
        ], { line: 7 });
        search(near);
        if (Math.abs(diff) < bestD) { search(far); }
        else {
          log.push('剪枝：|' + Math.abs(diff).toFixed(2) + '| ≥ ' + bestD.toFixed(2) + '，另一侧不必看');
        }
        C.state(u, 'visited');
      };
      search(rootId);

      b.step('最近邻是 **' + bestId + '(' + st[bestId].p.x + ',' + st[bestId].p.y + ')**，距离 ' + bestD.toFixed(2) + '。' +
        '注意我们**没有访问全部 8 个点** —— 剪枝省掉了整整几棵子树。' +
        'KD 树平均 O(log n)，但维度一高就会退化（"维度灾难"），所以高维数据通常改用 HNSW、IVF 等近似算法。', [
        C.state(bestId, 'path'),
        C.text('nn', log.slice(-8))
      ], { line: 8, milestone: '最近邻 ' + bestId + '（d=' + bestD.toFixed(2) + '）', stage: true });

      return { nodes: pts.map(p => ({ id: p.id, label: p.id + '(' + p.x + ',' + p.y + ')' })), edges: [], frames: b.frames, panels: b.panels, directed: true };
    }
  });

  function withRowOrder(panels, ids) {
    return panels.map(p => (p.type === 'table' ? Object.assign({}, p, { rowOrder: ids }) : p));
  }
})();
