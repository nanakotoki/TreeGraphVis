/* ============================================================
 * 第一卷 · T5/T6 补充：后缀树（Ukkonen）· 四叉树 · 动态树（Link-Cut Tree）
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  function layoutForest(rootId, kidsOf, hGap, vGap) {
    let cursor = 0;
    const pos = {};
    const hg = hGap || 1, vg = vGap || 1;
    function walk(u, depth) {
      const kids = kidsOf(u).filter(Boolean);
      if (!kids.length) {
        pos[u] = { x: (cursor + 0.5) * hg, y: depth * vg };
        cursor += 1;
        return pos[u].x;
      }
      const xs = kids.map(k => walk(k, depth + 1));
      pos[u] = { x: (xs[0] + xs[xs.length - 1]) / 2, y: depth * vg };
      return pos[u].x;
    }
    walk(rootId, 0);
    const xs0 = Object.keys(pos).map(k => pos[k].x);
    const mid = xs0.length ? (Math.min.apply(null, xs0) + Math.max.apply(null, xs0)) / 2 : 0;
    Object.keys(pos).forEach(k => { pos[k] = { x: pos[k].x - mid + 470, y: pos[k].y + 90 }; });
    return pos;
  }

  /* ============================================================
   * 1. 后缀树 · Ukkonen 在线构建
   * ============================================================ */
  TGV.register({
    id: 'suffix_tree', name: '后缀树 · Ukkonen 在线构建', category: '树 · 字符串',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'ac_automaton',
    panels: [
      { id: 'state', type: 'text', title: '活动点三元组' },
      { id: 'leaves', type: 'list', title: '叶子 = 后缀起点' },
      { id: 'suffix', type: 'list', title: '已识别的后缀' }
    ],
    pseudocode: [
      '// 后缀树：把 s 的所有 n 个后缀插进一棵压缩 Trie（边上标字符串）',
      '// 暴力做法 O(n²)。Ukkonen 的三大加速：① 隐式结点  ② 活动点  ③ 后缀链接',
      'for i = 0 .. n-1:                         // 逐字符"在线"扩展',
      '    remainder += 1                        // 还有几个后缀没挂上去',
      '    last = null',
      '    while remainder > 0:',
      '        if activeLength == 0: activeEdge = s[i]',
      '        if 活动点下没有 activeEdge 这条边:',
      '            新建叶子（边 = 当前剩余后缀），remainder -= 1',
      '        elif 边上第 activeLength 个字符 == s[i]:',
      '            activeLength += 1; break       // 规则 3：已存在，本轮可以停了',
      '        else:',
      '            在活动点处"劈开"那条边，插一个内部结点，再挂新叶子',
      '        if last != null: last.link = 活动点   // 后缀链接：跳到下一个待扩展后缀',
      '    若活动点是根: activeLength -= 1; activeEdge 右移',
      '    否则: 活动点 = 活动点的后缀链接（或根）'
    ],
    presets: [
      { id: 'banana', label: 'banana$ · 经典 Ukkonen 演示', desc: '观察活动点如何"停在边中间"，以及后缀链接的跳转', data: () => ({ text: 'banana$' }) },
      { id: 'mississippi', label: 'mississippi$ · 更多分叉', desc: '重复子串更多，劈边与后缀链接更密集', data: () => ({ text: 'mississippi$' }) }
    ],
    run(input) {
      const text = (input.text || 'banana$');
      const n = text.length;
      const pool = [];
      for (let i = 1; i <= n * 3 + 6; i++) pool.push({ id: 't' + i, label: '', x: 0, y: 0, hidden: true });
      const b = new TGV.Builder(this, { nodes: pool, edges: [], panels: this.panels });

      const st = {};
      let idc = 0;
      const mk = (edge, parent) => {
        const id = 't' + (++idc);
        st[id] = { edge: edge, parent: parent, kids: [], link: null };
        return id;
      };
      const shown = {};
      const root = mk('', null);
      shown[root] = true;
      const kidsOf = id => st[id].kids;
      let liveEdges = [];
      const leaves = [];       // { id, start }
      let activeNode = root, activeEdge = 0, activeLength = 0, remainder = 0;

      const sync = (cmds) => {
        liveEdges.forEach(e => cmds.push(C.removeEdge(e)));
        liveEdges = [];
        const walk = (id) => st[id].kids.forEach(c => {
          const eid = id + '>' + c;
          cmds.push(C.addEdge(eid, id, c));
          cmds.push(C.label(eid, st[c].edge));
          liveEdges.push(eid);
          walk(c);
        });
        walk(root);
      };
      const reLayout = (cmds) => {
        const pos = layoutForest(root, kidsOf, 74, 96);
        sync(cmds);
        cmds.push(C.morph(pos, 400));
      };
      const reveal = (cmds) => Object.keys(st).forEach(id => {
        if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); }
      });
      const refresh = (cmds) => {
        // 叶子边随文本增长而变长
        leaves.forEach(l => { st[l.id].edge = text.slice(l.start, refresh.end + 1); });
        Object.keys(st).forEach(id => {
          cmds.push(C.setLabel(id, st[id].edge || '∅'));
          cmds.push(C.badge(id, 'd', depthOf(id)));
        });
        reveal(cmds);
        reLayout(cmds);
      };
      const depthOf = (id) => { let d = 0, u = id; while (st[u].parent) { d++; u = st[u].parent; } return d; };
      refresh.end = -1;
      const stateText = (i) => C.text('state', [
        'i = ' + i + '（当前字符 "' + text[i] + '"）',
        'activeNode = ' + (activeNode === root ? 'root' : activeNode),
        'activeEdge = ' + activeEdge + '（字符 "' + (text[activeEdge] || '-') + '"）',
        'activeLength = ' + activeLength,
        'remainder = ' + remainder + '（还有 ' + remainder + ' 个后缀待挂）'
      ]);
      const leavesPanel = () => C.setQ('leaves', leaves.map(l => ({ key: l.id, label: text.slice(l.start) })));

      const cm0 = [];
      reveal(cm0);
      reLayout(cm0);
      cm0.push(stateText(0));
      b.step('**后缀树**：把 `"' + text + '"` 的 ' + n + ' 个后缀全部插入一棵**压缩 Trie**（每条边标一段字符串）。' +
        '暴力插入是 O(n²)，Ukkonen 用三个技巧做到 O(n)：**隐式结点**（不落到结点上，停在边的中间）、' +
        '**活动点三元组** `(activeNode, activeEdge, activeLength)`、以及**后缀链接**（内部结点之间的虚线捷径）。',
      cm0, { line: 1, milestone: '开始构建' });

      for (let i = 0; i < n; i++) {
        const ch = text[i];
        refresh.end = i;
        remainder++;
        let last = null;
        const cmS = [];
        refresh(cmS);
        cmS.push(stateText(i));
        b.step('**扩展阶段 i=' + i + '**（字符 `"' + ch + '"`）：`remainder` 变成 ' + remainder + '，表示还有 ' + remainder +
          ' 个后缀没挂到合适位置。注意所有叶子边都"长"了一位——后缀树是在线生长的。',
        cmS, { line: 3, milestone: '扩展字符 "' + ch + '"', vars: [{ name: 'remainder', value: remainder }] });

        let guard = 0;
        while (remainder > 0 && guard++ < 30) {
          if (activeLength === 0) activeEdge = i;
          const key = text[activeEdge];
          const childId = st[activeNode].kids.find(k => st[k].edge[0] === key);

          if (!childId) {
            /* 规则 2：新建叶子 */
            const leaf = mk(text.slice(i), activeNode);
            st[activeNode].kids.push(leaf);
            leaves.push({ id: leaf, start: i });
            if (last) st[last].link = activeNode;
            const cm = [];
            refresh(cm);
            cm.push(stateText(i), leavesPanel(), C.state(leaf, 'conflict'));
            b.step('活动点下**没有以 `"' + key + '"` 开头的边** → 规则 2：挂一个新叶子，边标签为剩余后缀 `"' + text.slice(i) + '"`。' +
              '这就是"隐式结点"的含义：后缀直接挂在边的末端，不必为每个字符都建一个结点。',
            cm, { line: 9, milestone: '新建叶子 suffix="' + text.slice(i) + '"' });
            last = null;
          } else {
            const edge = st[childId].edge;
            if (activeLength >= edge.length) {
              activeEdge += edge.length;
              activeLength -= edge.length;
              activeNode = childId;
              b.step('`activeLength` 已经越过整条边 "' + edge + '" → 把**活动结点下移**到 ' + childId + '，再继续处理当前字符。',
                [stateText(i), C.state(childId, 'active')], { line: 7 });
              continue;
            }
            if (edge[activeLength] === ch) {
              if (last) st[last].link = activeNode;
              const at = activeLength;
              activeLength++;
              const cm = [];
              refresh(cm);
              cm.push(stateText(i), C.state(childId, 'path'));
              b.step('**规则 3（可以停了）**：边 "' + edge + '" 上第 ' + (at + 1) + ' 个字符正好是 `"' + ch + '"`，' +
                '说明这个后缀**已经隐式存在**于树中，本阶段剩余的扩展全部不用做。' +
                '活动点现在停在**边的中间**（activeLength=' + activeLength + '）——这就是 Ukkonen 省掉大量工作的关键。',
              cm, { line: 11, milestone: '规则 3：隐式包含，本阶段停止' });
              break;
            }
            /* 劈边 */
            const splitEdge = edge.slice(0, activeLength);
            const split = mk(splitEdge, activeNode);
            st[activeNode].kids.push(split);
            st[activeNode].kids = st[activeNode].kids.filter(k => k !== childId);
            st[childId].edge = edge.slice(activeLength);
            st[childId].parent = split;
            st[split].kids.push(childId);
            const li = leaves.findIndex(l => l.id === childId);
            if (li >= 0) leaves[li].start += activeLength;
            const leaf = mk(ch, split);
            st[split].kids.push(leaf);
            leaves.push({ id: leaf, start: i });
            if (last) st[last].link = split;
            last = split;
            const cm = [];
            refresh(cm);
            cm.push(stateText(i), C.state(split, 'conflict'), C.state(leaf, 'path'));
            b.step('**劈边（split）**：边 "' + edge + '" 的第 ' + (activeLength + 1) + ' 个字符与 `"' + ch + '"` 不同，' +
              '于是在活动点位置把它劈成 "' + splitEdge + '" + "' + st[childId].edge + '"，中间插入内部结点 ' + split + '，再把新叶子挂上去。' +
              '**这是唯一会产生内部结点的时机**，也就是"隐式结点 → 显式结点"的转化。',
            cm, { line: 13, milestone: '劈边：新建内部结点 ' + split });
          }

          /* 更新活动点 / 后缀链接 */
          remainder--;
          if (activeNode === root && activeLength > 0) {
            activeLength--;
            activeEdge = i - remainder + 1;
            b.step('活动点是根：把 `activeLength` 减一、`activeEdge` 右移一位 —— 相当于"去掉后缀的首字符"，继续尝试下一个后缀。',
              [stateText(i)], { line: 14 });
            activeNode = root;
          } else if (activeNode !== root) {
            const nxt = st[activeNode].link || root;
            const cm = [];
            refresh(cm);
            if (st[activeNode].link) cm.push(C.arc('lnk' + activeNode, activeNode, st[activeNode].link, { color: '#8B5CF6', dashed: true, label: 'suffix link' }));
            cm.push(stateText(i));
            b.step('沿着**后缀链接**从 ' + activeNode + ' 跳到 **' + nxt + '**（后缀链接指向"去掉首字符后的对应内部结点"），' +
              '所以不必从根重新走一遍 —— 这是 O(n) 复杂度的最后一块拼图。', cm,
            { line: 15, milestone: '后缀链接跳转 → ' + nxt });
            activeNode = nxt;
          } else {
            activeNode = root;
          }
        }
      }

      const cmF = [C.setQ('suffix', leaves.map((l, i) => ({ key: 's' + i, label: text.slice(l.start) })))];
      reLayout(cmF);
      Object.keys(st).forEach(id => { if (st[id].link) cmF.push(C.arc('lnk' + id, id, st[id].link, { color: '#8B5CF6', dashed: true })); });
      b.step('**后缀树构建完成**：' + Object.keys(st).length + ' 个结点（含根），' + leaves.length + ' 个叶子 —— ' +
        '**叶子数恰好等于后缀数 ' + n + '**。树上任何一条根到叶子的路径都对应一个后缀，' +
        '这正是后缀树能做 O(m) 模式匹配、O(n) 求最长重复子串、以及在线性时间内构造后缀数组的原因。',
      cmF, { line: 16, milestone: '构建完成：' + leaves.length + ' 个后缀' });

      b.nodes = pool;
      b.edges = [];
      return { nodes: pool, edges: [], frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 2. 四叉树（QuadTree）
   * ============================================================ */
  TGV.register({
    id: 'quadtree', name: '四叉树（空间递归四分 + 范围检索）', category: '树 · 进阶',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'kd_tree',
    panels: [
      { id: 'cell', type: 'text', title: '当前单元' },
      { id: 'hit', type: 'list', title: '命中点' }
    ],
    pseudocode: [
      '// 四叉树：把平面按"横竖各切一刀"分成四个象限，递归直到每格只剩一个点',
      'build(cell, points, depth):',
      '    if points.size <= 1 or depth == MAX: 成为叶子，存下这个点',
      '    把 cell 四等分：NW / NE / SW / SE',
      '    for each 子象限 q:',
      '        build(q, points ∩ q, depth + 1)      // 点按坐标落入唯一象限',
      '// 查询：矩形 [x1,x2]×[y1,y2]',
      'query(node, rect):',
      '    if node 的矩形与 rect 不相交: return        // 整棵子树直接剪掉！',
      '    if node 是叶子: 检查它的点是否落在 rect 内',
      '    else: 对四个孩子递归 query',
      '// 复杂度：建树 O(n log n)，查询 O(√n + k)（k 为命中数）'
    ],
    presets: [
      { id: 'std', label: '8 个点建四叉树 + 矩形范围检索', desc: '注意哪些子树被"整块剪掉"', data: () => ({}) },
      { id: 'nn', label: '最近邻搜索（剪枝）', desc: '以查询点为圆心，距离超过当前最优的象限直接跳过', data: () => ({ nn: true }) }
    ],
    run(input) {
      const PTS = (input.points && input.points.length)
        ? input.points.map((p, i) => ['p' + (i + 1), p[0], p[1]])
        : [
            ['p1', 0.18, 0.22], ['p2', 0.36, 0.12], ['p3', 0.12, 0.72], ['p4', 0.42, 0.62],
            ['p5', 0.66, 0.28], ['p6', 0.84, 0.18], ['p7', 0.72, 0.66], ['p8', 0.9, 0.82]
          ];
      const S = 760, OFF = 150, TOP = 90;
      const toX = u => OFF + u * S;
      const toY = v => TOP + v * S;
      const nodesDef = [];
      const st = {};
      let idc = 0;
      const mk = (x0, y0, x1, y1, dep, parent) => {
        const id = 'q' + (++idc);
        st[id] = { id, x0, y0, x1, y1, dep, parent, kids: [], pts: [], leaf: false };
        nodesDef.push({
          id, label: '', x: toX((x0 + x1) / 2), y: toY((y0 + y1) / 2), hidden: true
        });
        return id;
      };
      const b0 = { x0: 0, y0: 0, x1: 1, y1: 1 };
      const root = mk(b0.x0, b0.y0, b0.x1, b0.y1, 0, null);

      const b = new TGV.Builder(this, { nodes: nodesDef, edges: [], panels: this.panels });
      const shown = {};
      const reveal = (cmds) => Object.keys(st).forEach(id => { if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); } });
      let liveEdges = [];
      const sync = (cmds) => {
        liveEdges.forEach(e => cmds.push(C.removeEdge(e)));
        liveEdges = [];
        const walk = id => st[id].kids.forEach(c => {
          const eid = id + '>' + c;
          cmds.push(C.addEdge(eid, id, c));
          liveEdges.push(eid);
          walk(c);
        });
        walk(root);
      };
      const inCell = (p, c) => p[1] >= c.x0 && p[1] <= c.x1 && p[2] >= c.y0 && p[2] <= c.y1;
      /* 位置表：内部结点在单元中心，被定位的叶子挪到点本身；每次 morph 都传全量 */
      const posAll = {};
      const posInit = () => {
        Object.keys(st).forEach(id => {
          const c = st[id];
          if (!posAll[id]) posAll[id] = { x: toX((c.x0 + c.x1) / 2), y: toY((c.y0 + c.y1) / 2) };
        });
      };

      b.step('**四叉树**是二维空间的分治结构：把一个正方形单元**横竖各切一刀**分成四个象限，' +
        '点按坐标落入唯一象限，递归直到每格至多一个点。' +
        '画布上：**内部结点放在它所在格子中心**，**叶子结点直接放在点本身的坐标上**，于是树形结构与空间划分一眼可见。',
      [], { line: 1 });

      const build = (id, pts, depth) => {
        const c = st[id];
        const cm = [C.state(id, 'active')];
        reveal(cm);
        sync(cm);
        cm.push(C.text('cell', ['深度 ' + depth, '单元 x∈[' + c.x0.toFixed(2) + ',' + c.x1.toFixed(2) + ']  y∈[' + c.y0.toFixed(2) + ',' + c.y1.toFixed(2) + ']', '落入点数 = ' + pts.length]));
        b.step('**build(深度 ' + depth + ')**：单元 x∈[' + c.x0.toFixed(2) + ',' + c.x1.toFixed(2) + ']、y∈[' + c.y0.toFixed(2) + ',' + c.y1.toFixed(2) + '] 里有 **' + pts.length + '** 个点' +
          (pts.length <= 1 || depth >= 3 ? ' → 数量足够小，**成为叶子**，直接记住这个点。' : ' → 仍然太多，**继续四分**。'),
        cm, { line: 3, milestone: '单元(深度' + depth + ') ' + pts.length + ' 点' });

        if (pts.length <= 1 || depth >= 3) {
          c.leaf = true;
          c.pts = pts.slice();
          if (pts.length === 1) {
            const p = pts[0];
            // 把叶子的位置挪到点本身
            posInit();
            posAll[id] = { x: toX(p[1]), y: toY(p[2]) };
            const cm2 = [C.morph(JSON.parse(JSON.stringify(posAll)), 420), C.setLabel(id, p[0]), C.state(id, 'path')];
            b.step('叶子结点落到点 **' + p[0] + '** 的真实坐标上（' + p[1].toFixed(2) + ', ' + p[2].toFixed(2) + '）。' +
              '注意：树的"深度"就是空间划分的次数，叶子所在层越深，说明那块区域越拥挤。', cm2,
            { line: 3, milestone: '叶子：' + p[0] });
          }
          return;
        }
        const mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2;
        const quads = [
          { name: 'NW', box: [c.x0, c.y0, mx, my] }, { name: 'NE', box: [mx, c.y0, c.x1, my] },
          { name: 'SW', box: [c.x0, my, mx, c.y1] }, { name: 'SE', box: [mx, my, c.x1, c.y1] }
        ];
        quads.forEach(q => {
          const sub = [];
          pts.forEach(p => {
            if (p[1] >= q.box[0] && p[1] <= q.box[2] && p[2] >= q.box[1] && p[2] <= q.box[3]) sub.push(p);
          });
          if (!sub.length) return;
          const cid = mk(q.box[0], q.box[1], q.box[2], q.box[3], depth + 1, id);
          st[id].kids.push(cid);
          const cmQ = [C.state(id, 'active')];
          reveal(cmQ);
          sync(cmQ);
          cmQ.push(C.badge(cid, 'n', sub.length));
          b.step('切出 **' + q.name + '** 象限，落进去 ' + sub.length + ' 个点：' + sub.map(p => p[0]).join('、') + '。' +
            '点按坐标自动分流，**不需要任何比较排序**——这就是空间划分结构比平衡树更适合几何查询的原因。',
          cmQ, { line: 6 });
          build(cid, sub, depth + 1);
        });
        const cmD = [C.state(id, 'visited')];
        b.step('单元（深度 ' + depth + '）的四个象限处理完毕。', cmD, { line: 6 });
      };
      build(root, PTS, 0);

      /* ---------- 查询 ---------- */
      if (input.nn) {
        const qx = 0.5, qy = 0.4;
        let best = null, bestD = Infinity;
        const cmQ = [C.text('cell', ['查询点 Q = (' + qx + ', ' + qy + ')', '寻找最近的已知点'])];
        b.step('**最近邻查询**：从根开始，用"当前最优距离"当半径去剪枝——' +
          '如果某个象限离查询点的**最小可能距离**都超过了当前最优，那整棵子树就可以直接扔掉。',
        cmQ, { line: 9 });
        const rec = (id) => {
          const c = st[id];
          const dx = Math.max(c.x0 - qx, 0, qx - c.x1);
          const dy = Math.max(c.y0 - qy, 0, qy - c.y1);
          const minDist = Math.hypot(dx, dy);
          if (minDist > bestD) {
            b.step('单元（深度 ' + c.dep + '）离查询点**最近也有 ' + minDist.toFixed(3) + '**，已经超过当前最优 ' + bestD.toFixed(3) +
              ' → **整棵子树剪掉**。', [C.state(id, 'ghost')], { line: 9, milestone: '剪枝：深度 ' + c.dep });
            return;
          }
          if (c.leaf) {
            c.pts.forEach(p => {
              const dd = Math.hypot(p[1] - qx, p[2] - qy);
              if (dd < bestD) {
                bestD = dd; best = p;
                b.step('检查叶子上的点 **' + p[0] + '**：距离 ' + dd.toFixed(3) + ' < 当前最优 → 更新最近邻。',
                  [C.state(id, 'path'), C.push('hit', p[0] + ' d=' + dd.toFixed(3))], { line: 10, milestone: '最近邻更新为 ' + p[0] });
              }
            });
            return;
          }
          b.step('单元（深度 ' + c.dep + '）可能更近（下界 ' + minDist.toFixed(3) + ' ≤ ' + (bestD === Infinity ? '∞' : bestD.toFixed(3)) + '），必须递归检查。',
            [C.state(id, 'active')], { line: 8 });
          c.kids.forEach(k => rec(k));
        };
        rec(root);
        b.step('**最近邻 = ' + (best ? best[0] : '无') + '**，距离 ' + bestD.toFixed(3) + '。' +
          '整个过程中真正被检查的点通常只有 O(log n) 个 —— 这就是空间索引的威力。',
        [C.setQ('hit', [{ key: 'best', label: '最近邻 ' + (best ? best[0] : '-') + '  d=' + bestD.toFixed(3) }])],
        { line: 11, milestone: '最近邻 = ' + (best ? best[0] : '-') });
      } else {
        const R = { x0: 0.3, y0: 0.45, x1: 0.8, y1: 0.8 };
        b.step('**矩形范围检索** [x∈(' + R.x0 + ',' + R.x1 + '), y∈(' + R.y0 + ',' + R.y1 + ')]：' +
          '从根开始递归，凡是与该矩形**完全不相交**的单元都整块剪掉。',
        [C.text('cell', ['查询矩形', 'x ∈ [' + R.x0 + ', ' + R.x1 + ']', 'y ∈ [' + R.y0 + ', ' + R.y1 + ']'])], { line: 7 });
        const hit = [];
        const rec = (id) => {
          const c = st[id];
          const noHit = c.x1 < R.x0 || c.x0 > R.x1 || c.y1 < R.y0 || c.y0 > R.y1;
          if (noHit) {
            b.step('单元（深度 ' + c.dep + '）与查询矩形**不相交** → 整棵子树剪掉，一个点都不用看。',
              [C.state(id, 'ghost')], { line: 9, milestone: '剪枝：深度 ' + c.dep });
            return;
          }
          if (c.leaf) {
            c.pts.forEach(p => {
              if (p[1] >= R.x0 && p[1] <= R.x1 && p[2] >= R.y0 && p[2] <= R.y1) hit.push(p);
            });
            b.step('与矩形相交的叶子：检查它的点，累计命中 **' + hit.length + '** 个。',
              [C.state(id, 'path')].concat(hit.map(p => C.push('hit', p[0]))), { line: 10, milestone: '命中 ' + hit.length + ' 个' });
            return;
          }
          b.step('单元（深度 ' + c.dep + '）与矩形部分相交 → 继续递归四个孩子。', [C.state(id, 'active')], { line: 8 });
          c.kids.forEach(k => rec(k));
        };
        rec(root);
        b.step('**范围检索完成**：命中 ' + hit.length + ' 个点 → ' + hit.map(p => p[0]).join('、') + '。' +
          '注意我们只访问了"与矩形相交"的那些单元，其余整棵子树被一次性剪掉——' +
          '这正是四叉树 / R 树在 GIS、地图瓦片、碰撞检测里无处不在的原因。',
        [C.setQ('hit', hit.map(p => p[0]))], { line: 11, milestone: '范围检索命中 ' + hit.length + ' 个' });
      }

      return { nodes: nodesDef, edges: [], frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 3. 动态树 · Link-Cut Tree
   * ============================================================ */
  const LCT_NODES = [['1', 430, 110], ['2', 430, 250], ['3', 250, 380], ['4', 610, 380], ['5', 430, 430], ['6', 430, 570]];
  const LCT_EDGES = [['1', '2'], ['2', '3'], ['2', '4'], ['4', '5'], ['5', '6']];

  TGV.register({
    id: 'lct', name: '动态树 · Link-Cut Tree（实边 / 虚边）', category: '树 · 进阶',
    layout: 'fixed', directed: false,
    compareWith: 'hld',
    panels: [
      { id: 'path', type: 'list', title: '当前实链（Preferred Path）' },
      { id: 'log', type: 'list', title: '操作日志' },
      { id: 'ops', type: 'table', title: '结点状态', columns: [{ key: 'chain', label: '实/虚' }] }
    ],
    pseudocode: [
      '// LCT 维护一片森林，支持任意 link / cut / 路径查询，均摊 O(log n)',
      '// 核心：把"从根到某点的路径"切成若干条【实链】，每条实链用一个 Splay 维护',
      '// 实边（Preferred Edge）粗实线；虚边（Path-Parent）细虚线，认父不认子',
      'access(x):',
      '    last = null',
      '    while x != null:',
      '        splay(x)                       // 把 x 转到它所在实链的根',
      '        x.right = last                 // 旧实儿子降级为虚边，last 升级为实边',
      '        update(x); last = x; x = x.fa  // x.fa 是"路径父亲"（虚边）',
      '    splay(原 x)                        // 此时根到 x 的整条路径成为一条实链',
      'makeRoot(x): access(x); 再翻转整条链的左右儿子   // 让 x 变成所在树的根',
      'link(x, y): makeRoot(x); x.fa = y                // 把 x 挂到 y 下面（虚边）',
      'cut(x, y): makeRoot(x); access(y); 此时 x 是 y 的左儿子 → 断开',
      '// 关键洞察：access 一趟就把"路径"变成"一条链"，路径查询 = Splay 上的区间查询'
    ],
    presets: [
      { id: 'access', label: 'access(6)：打通根到 6 的实链', desc: '观察沿途哪些边升级为实边、哪些被降级', data: () => ({ ops: [['access', '6']] }) },
      { id: 'linkcut', label: 'access → cut → link 全套', desc: '切断 1–2，再把 1 挂到 6 上', data: () => ({ ops: [['access', '6'], ['cut', '1', '2'], ['link', '1', '6']] }) }
    ],
    run(input) {
      const g = (input && input.edges && input.edges.length)
        ? (() => {
            const ids = new Set();
            input.edges.forEach(([a, b]) => { ids.add(a); ids.add(b); });
            return TGV.GraphLib.mkGraph([...ids].map(v => [String(v), 0, 0]),
              input.edges.map(([a, b]) => [String(a), String(b)]), { directed: false });
          })()
        : TGV.GraphLib.mkGraph(LCT_NODES, LCT_EDGES, { directed: false });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const ids = g.nodes.map(n => n.id);
      const par = {}, kids = {}, pref = {};
      ids.forEach(id => { par[id] = null; kids[id] = []; pref[id] = null; });
      g.edges.forEach(e => {
        const u = e.source < e.target ? e.source : e.target;
        const v = e.source < e.target ? e.target : e.source;
        if (!kids[u].includes(v)) kids[u].push(v);
        par[v] = u;
      });
      const edgeId = (u, v) => {
        if (!u || !v) return null;
        const e = g.edges.find(x => (x.source === u && x.target === v) || (x.source === v && x.target === u));
        return e ? e.id : null;
      };
      const logs = [];
      const onChain = {};
      const paint = (cmds) => {
        ids.forEach(u => {
          kids[u].slice().forEach(v => {
            const eid = edgeId(u, v);
            if (!eid) return;
            if (pref[u] === v) cmds.push(C.edgeColor(eid, '#F97316', false, 3.4));
            else cmds.push(C.edgeColor(eid, '#94A3B8', true, 1.6));
          });
        });
        ids.forEach(id => {
          cmds.push(C.table('ops', id, 'chain', onChain[id] ? '实链上' : '虚边旁挂'));
          if (onChain[id]) cmds.push(C.state(id, 'path'));
        });
      };
      const pathTo = (x) => {
        const out = [];
        let u = x, guard = 0;
        while (u && guard++ < 30) { out.unshift(u); u = par[u]; }
        return out;
      };
      const clearChainMark = () => ids.forEach(id => { onChain[id] = false; });

      const access = (x) => {
        b.step('**access(' + x + ')**：把"根 → ' + x + '"的整条路径变成**一条实链**。做法是从 ' + x +
          ' 一路往上，把每一层的"实儿子"都切换成路径上的那个孩子。',
        [C.state(x, 'conflict')], { line: 4, milestone: 'access(' + x + ')', stage: true });
        let last = null, u = x, guard = 0;
        while (u && guard++ < 20) {
          const cm = [];
          const oldPref = pref[u];
          pref[u] = last;
          if (last) {
            const eid = edgeId(u, last);
            if (eid) { cm.push(C.edgeColor(eid, '#F97316', false, 3.4), C.pulse(eid, { color: '#4F46E5' })); }
          }
          paint(cm);
          cm.push(C.state(u, 'active'));
          b.step('在 ' + u + ' 处**切换实边**：' +
            (last ? '把通往 ' + last + ' 的边升级为**实边**（与它进同一棵 Splay）' : '（起点 ' + x + ' 下方没有路径）') +
            (oldPref && oldPref !== last ? '，同时把原来的实儿子 ' + oldPref + ' 降级为**虚边**（认父不认子）' : '') + '。',
          cm, { line: 7, vars: [{ name: 'x', value: u }] });
          if (last) logs.push(u + ' ⇢ ' + last + ' 变实边');
          last = u;
          u = par[u];
        }
        const chain = pathTo(x);
        clearChainMark();
        chain.forEach(id => { onChain[id] = true; });
        const cm2 = [C.setQ('path', chain.map((id, i) => ({ key: 'c' + i, label: id }))),
          C.setQ('log', logs.slice())];
        paint(cm2);
        b.step('**access 完成**：根到 ' + x + ' 的路径 {' + chain.join(' → ') + '} 现在是一条**实链**，' +
          '在 LCT 内部就是一棵 Splay；这条链上的边全部变成粗实线。' +
          '于是"路径信息"变成了"一棵 Splay 上的区间"，查询只要在 Splay 上做一次聚合。',
        cm2, { line: 9, milestone: '实链：' + chain.join('→') });
        return chain;
      };
      const makeRoot = (x) => {
        const chain = access(x);
        for (let i = chain.length - 1; i >= 1; i--) {
          const a = chain[i], c = chain[i - 1];
          kids[a] = kids[a].filter(t => t !== c);
          if (!kids[c].includes(a)) kids[c].push(a);
          par[a] = c;
          par[c] = null;
          pref[a] = c;
        }
        const cm = [C.setQ('path', chain.slice().reverse().map((id, i) => ({ key: 'c' + i, label: id })))];
        clearChainMark();
        chain.forEach(id => { onChain[id] = true; });
        paint(cm);
        b.step('**makeRoot(' + x + ')**：access 之后整条路径已经是一棵 Splay，只需**把这条链整体翻转**' +
          '（左右儿子互换，就是一个"区间反转"懒标记），' + x + ' 就成了新根。' +
          '画布上可以看到父子方向整体倒过来了：现在是 ' + chain.slice().reverse().join(' → ') + '。',
        cm, { line: 10, milestone: 'makeRoot(' + x + ')：' + x + ' 成为根' });
        logs.push('makeRoot(' + x + ')');
      };
      const cut = (u, v) => {
        makeRoot(u);
        access(v);
        const a = par[u] === v ? u : (par[v] === u ? v : null);
        if (a) {
          const c2 = a === u ? v : u;
          const eid = edgeId(a, c2);
          kids[c2] = kids[c2].filter(t => t !== a);
          par[a] = null;
          pref[c2] = null;
          const cm = [];
          if (eid) cm.push(C.removeEdge(eid));
          paint(cm);
          b.step('**cut(' + u + ', ' + v + ')**：makeRoot(' + u + ') + access(' + v + ') 之后，' + u + ' 一定是 ' + v + ' 的**左儿子**（且无右儿子），' +
            '于是断开这一条边即可 —— **树被劈成两棵**。',
          cm, { line: 12, milestone: 'cut(' + u + ',' + v + ')：树一分为二' });
          logs.push('cut ' + u + '–' + v);
        } else {
          b.step('**cut(' + u + ', ' + v + ')**：makeRoot + access 之后发现 ' + u + ' 并不是 ' + v + ' 的左儿子，' +
            '说明这条边在树上并不存在（或已断开），操作无效。', [], { line: 12 });
        }
      };
      const link = (u, v) => {
        makeRoot(u);
        par[u] = v;
        if (!kids[v].includes(u)) kids[v].push(u);
        const eid = 'L' + u + '-' + v;
        const cm = [C.addEdge(eid, u, v), C.edgeColor(eid, '#94A3B8', true, 1.6), C.state(v, 'active')];
        b.step('**link(' + u + ', ' + v + ')**：makeRoot(' + u + ') 让 ' + u + ' 成为所在树的根，' +
          '于是只需要把 `fa[' + u + '] = ' + v + '` 挂上去——新边立刻是一条**虚边**，O(1) 完成，不做任何重构。' +
          '这就是 LCT 支持"动态加边"的全部代价。',
        cm, { line: 11, milestone: 'link(' + u + ',' + v + ')：合并两棵树' });
        logs.push('link ' + u + '–' + v);
      };

      b.step('**Link-Cut Tree** 解决的是"**树在变**"的问题：树链剖分一旦结构改变就要重剖，' +
        '而 LCT 支持任意 `link` / `cut` / 路径查询，均摊 O(log n)。' +
        '核心是把树拆成若干条**实链**，每条实链用一个 Splay 维护；**实边**（粗线）在 Splay 内部，' +
        '**虚边**（虚线）只是"认父不认子"的路径父亲指针。',
      [C.setQ('log', [])], { line: 2 });

      (input.ops || [['access', '6']]).forEach(op => {
        if (op[0] === 'access') access(op[1]);
        else if (op[0] === 'cut') cut(op[1], op[2]);
        else if (op[0] === 'link') link(op[1], op[2]);
        else if (op[0] === 'makeroot') makeRoot(op[1]);
      });

      b.step('演示结束。LCT 的复杂度是**均摊** O(log n)：splay 的均摊分析加上 access 中"实边切换次数"的上界共同保证总代价可控。' +
        '它最经典的用途是维护动态森林连通性、动态最小生成树（用 LCT 维护 MST 上的最大边）、' +
        '以及各种"树上路径第 k 大"问题。', [], { line: 13, milestone: '演示完成' });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
