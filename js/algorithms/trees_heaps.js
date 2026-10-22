/* ============================================================
 * 第一卷 · T12 可并堆家族
 * 左偏树 · 斜堆 · 配对堆 · 二项堆
 * 共同点：merge 是核心操作，删除最小值 = 合并根的左右儿子
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* ---------------- 通用：森林布局（按叶子游标计算 x） ---------------- */
  function layoutForest(roots, kidsOf, hGap, vGap) {
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
      const x = (xs[0] + xs[xs.length - 1]) / 2;
      pos[u] = { x, y: depth * vg };
      return x;
    }
    roots.forEach(r => { if (r) { walk(r, 0); cursor += 0.9; } });
    // 居中
    const xs0 = Object.keys(pos).map(k => pos[k].x);
    const mid = xs0.length ? (Math.min.apply(null, xs0) + Math.max.apply(null, xs0)) / 2 : 0;
    Object.keys(pos).forEach(k => { pos[k] = { x: pos[k].x - mid + 420, y: pos[k].y + 90 }; });
    return pos;
  }

  /* 结构同步：删掉所有旧边，按当前结构重新连边 */
  function makeSync() {
    let live = [];
    return function (cmds, struct, kidsOf, roots) {
      live.forEach(id => cmds.push(C.removeEdge(id)));
      live = [];
      roots.forEach(r => {
        const stack = [r];
        while (stack.length) {
          const u = stack.pop();
          kidsOf(u).forEach(v => {
            if (!v) return;
            const id = u + '>' + v;
            cmds.push(C.addEdge(id, u, v));
            live.push(id);
            stack.push(v);
          });
        }
      });
    };
  }

  const BASE_VALS = [5, 3, 8, 1, 9, 2, 7];
  const valsOf = (input) => (input && input.vals && input.vals.length >= 2 ? input.vals : BASE_VALS);

  function defNodes(vals) {
    return vals.map(v => ({ id: 'v' + v, label: String(v), x: 420, y: 200, hidden: true }));
  }

  /* ============================================================
   * 1. 左偏树
   * ============================================================ */
  TGV.register({
    id: 'leftist_heap', name: '左偏树（可并堆 · 保持左偏性质）', category: '树 · 堆与可并堆',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'skew_heap',
    panels: [
      { id: 'op', type: 'list', title: '操作序列' },
      { id: 'watch', type: 'table', title: 'dist（右路径长度）', columns: [{ key: 'dist', label: 'dist' }, { key: 'v', label: 'key' }] }
    ],
    pseudocode: [
      '// dist[u] = 从 u 出发一直向右走能走多深（空节点 dist = 0）',
      'merge(a, b):',
      '    if a 为空: return b',
      '    if b 为空: return a',
      '    if key[a] > key[b]: swap(a, b)      // 小的当根',
      '    a.right = merge(a.right, b)         // 递归合并右子树',
      '    if dist[a.left] < dist[a.right]: swap(a.left, a.right)   // 保持左偏',
      '    dist[a] = dist[a.right] + 1',
      '    return a',
      '// 插入 = merge(堆, 单个节点)；删最小 = merge(根的左右儿子)'
    ],
    presets: [
      { id: 'std', label: '依次插入 5,3,8,1,9,2 → 弹出最小值', desc: '观察 dist 与左右交换如何维持"左偏"', data: () => ({}) }
    ],
    run(input) {
      const VALS = valsOf(input);
      const b = new TGV.Builder(this, { nodes: defNodes(VALS), edges: [], panels: this.panels });
      const st = {};       // id -> {v, l, r, dist}
      const kidsOf = id => (st[id] ? [st[id].l, st[id].r] : []);
      const rootsOf = () => Object.keys(st).filter(id => !Object.keys(st).some(k => st[k].l === id || st[k].r === id));
      const sync = makeSync();
      const shown = {};
      const distOf = id => (id ? st[id].dist : 0);

      const showCmds = () => {
        const cmds = [];
        Object.keys(st).forEach(id => {
          if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); }
        });
        return cmds;
      };
      const reLayout = (cmds) => {
        const roots = rootsOf();
        const pos = layoutForest(roots, kidsOf, 62, 88);
        sync(cmds, st, kidsOf, roots);
        cmds.push(C.morph(pos, 420));
      };

      b.step('**左偏树**是一种"可并堆"：除了堆序（父 ≤ 子），它还额外要求**左儿子的 dist 不小于右儿子**。' +
        '`dist[u]` 定义为"从 u 一路向右能走多远"。这个约束保证**右路径长度 ≤ log(n+1)**，于是合并只需递归处理右路径，复杂度 O(log n)。' +
        '注意：左偏树**不保证平衡**，它保证的是"右边一定比左边短"。', [], { line: 1 });

      const merge = (a, c, depth) => {
        if (!a) return c;
        if (!c) return a;
        let A = a, B = c;
        if (st[A].v > st[B].v) { const t = A; A = B; B = t; }
        b.step('合并 ' + st[A].v + ' 与 ' + st[B].v + '：`' + st[A].v + ' ≤ ' + st[B].v + '` → **' + st[A].v + ' 当根**，' +
          '把 ' + st[B].v + ' 递归合并到它的**右子树**上。', [
          C.state(A, 'active'), C.state(B, 'frontier')
        ], { line: 6, vars: [{ name: 'depth', value: depth }] });
        st[A].r = merge(st[A].r, B, depth + 1);
        if (distOf(st[A].l) < distOf(st[A].r)) {
          const t = st[A].l; st[A].l = st[A].r; st[A].r = t;
          b.step(st[A].v + ' 的左 dist (' + distOf(st[A].r) + ') 小于右 dist (' + distOf(st[A].l) + ') → **交换左右儿子**，恢复左偏性质。',
            [C.state(A, 'active')], { line: 7, milestone: A + ' 左右交换' });
        }
        st[A].dist = distOf(st[A].r) + 1;
        const cmds = [C.badge(A, 'dist', st[A].dist, true), C.table('watch', A, 'dist', st[A].dist, true), C.table('watch', A, 'v', st[A].v)];
        b.step(st[A].v + ' 的 `dist` 更新为右儿子 dist + 1 = **' + st[A].dist + '**，返回 ' + st[A].v + '。', cmds, { line: 8 });
        return A;
      };

      let root = null;
      for (let i = 0; i < VALS.length; i++) {
        const id = 'v' + VALS[i];
        st[id] = { v: VALS[i], l: null, r: null, dist: 1 };
        b.step('**插入 ' + VALS[i] + '**：先把它变成一个单点堆，再与原堆 merge。', [
          C.state(id, 'active')
        ], { line: 10, milestone: '插入 ' + VALS[i] });
        root = merge(root, id, 0);
        const cmds = showCmds();
        cmds.push(C.q('op', 'push', [{ key: id, label: 'insert ' + VALS[i], meta: 'root=' + root }]));
        reLayout(cmds);
        b.step('插入完成，堆根是 **' + root + '（' + st[root].v + '）**。当前结构：' +
          Object.keys(st).map(k => k + '(' + st[k].v + ',d' + st[k].dist + ')').join(' '), cmds,
          { line: 9, milestone: '插入 ' + VALS[i] + ' 完成' });
      }

      // 删除最小值
      b.step('**删除最小值**：根就是最小值 ' + st[root].v + '。删掉它以后，把它的**左右两棵子树 merge 起来**就是新堆 —— 这一步是 O(log n)。', [
        C.state(root, 'conflict')
      ], { line: 10, milestone: '弹出 ' + st[root].v });
      const oldRoot = root;
      const L = st[root].l, R = st[root].r;
      delete st[root];
      const cmds = [C.hide(oldRoot), C.q('op', 'push', [{ key: 'del', label: 'pop_min ' + st[oldRoot] ? '' : '', meta: 'del ' + oldRoot }])];
      root = merge(L, R, 0);
      cmds.push(C.q('op', 'push', [{ key: 'del2', label: 'pop_min（删除根）', meta: '新根 ' + (root || '空') }]));
      reLayout(cmds);
      b.step('新的堆根是 **' + (root ? root + '（' + st[root].v + '）' : '空') + '**。' +
        '左偏树的全部操作都是 merge 的包装：插入是 merge 单点，删最小是 merge 两棵子树，两个堆合并就是一次 merge。' +
        '**这正是它比二叉堆强的地方** —— 二叉堆合并要 O(n)，左偏树只要 O(log n)。', cmds,
        { line: 10, milestone: '删除完成', stage: true });

      return { nodes: defNodes(VALS), edges: [], frames: b.frames, panels: b.panels, directed: true };
    }
  });

  /* ============================================================
   * 2. 斜堆
   * ============================================================ */
  TGV.register({
    id: 'skew_heap', name: '斜堆（无条件交换左右儿子）', category: '树 · 堆与可并堆',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'leftist_heap',
    panels: [
      { id: 'op', type: 'list', title: '操作序列' }
    ],
    pseudocode: [
      '// 斜堆 = 左偏树的"懒人版"：不存 dist，merge 后无条件交换左右',
      'merge(a, b):',
      '    if a 为空: return b',
      '    if b 为空: return a',
      '    if key[a] > key[b]: swap(a, b)',
      '    a.right = merge(a.right, b)',
      '    swap(a.left, a.right)        // 无条件交换，不需要 dist 判断',
      '    return a',
      '// 均摊 O(log n)：靠"势能"分析，单次最坏可能 O(n)'
    ],
    presets: [
      { id: 'std', label: '依次插入 5,3,8,1,9,2 → 弹最小', desc: '对比左偏树：结构不同但堆序一致', data: () => ({}) }
    ],
    run(input) {
      const VALS = valsOf(input);
      const b = new TGV.Builder(this, { nodes: defNodes(VALS), edges: [], panels: this.panels });
      const st = {};
      const kidsOf = id => (st[id] ? [st[id].l, st[id].r] : []);
      const rootsOf = () => Object.keys(st).filter(id => !Object.keys(st).some(k => st[k].l === id || st[k].r === id));
      const sync = makeSync();
      const shown = {};
      const showCmds = () => {
        const cmds = [];
        Object.keys(st).forEach(id => { if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); } });
        return cmds;
      };
      const reLayout = (cmds) => {
        const roots = rootsOf();
        const pos = layoutForest(roots, kidsOf, 62, 88);
        sync(cmds, st, kidsOf, roots);
        cmds.push(C.morph(pos, 400));
      };

      b.step('**斜堆**是左偏树的简化版：它**完全不记录 dist**，而是在每次 merge 之后**无条件交换左右儿子**。' +
        '听起来很随意，但可以证明它的**均摊**复杂度仍是 O(log n) —— 用的是势能分析：每次交换都在"整理"右路径。' +
        '代价是**单次操作最坏可能退化成 O(n)**（而左偏树每次都是 O(log n)）。', [], { line: 1 });

      const merge = (a, c, depth) => {
        if (!a) return c;
        if (!c) return a;
        let A = a, B = c;
        if (st[A].v > st[B].v) { const t = A; A = B; B = t; }
        b.step('merge(' + st[A].v + ', ' + st[B].v + ')：' + st[A].v + ' 更小（≤ ' + st[B].v + '），它继续当根，' +
          st[B].v + ' 下沉到右子树。', [C.state(A, 'active'), C.state(B, 'frontier')], { line: 5, vars: [{ name: 'depth', value: depth }] });
        st[A].r = merge(st[A].r, B, depth + 1);
        const t = st[A].l; st[A].l = st[A].r; st[A].r = t;
        b.step('**无条件交换** ' + st[A].v + ' 的左右儿子 —— 不管谁深谁浅。这一步看似浪费，但它把"刚刚处理过的右路径"翻到了左边，' +
          '下次就不会重复付出代价。', [C.state(A, 'active'), C.badge(A, 'sw', '⇄')], { line: 7 });
        return A;
      };

      let root = null;
      for (let i = 0; i < VALS.length; i++) {
        const id = 'v' + VALS[i];
        st[id] = { v: VALS[i], l: null, r: null };
        b.step('**插入 ' + VALS[i] + '**：merge 到现有堆上。', [C.state(id, 'active')], { line: 9, milestone: '插入 ' + VALS[i] });
        root = merge(root, id, 0);
        const cmds = showCmds();
        cmds.push(C.q('op', 'push', [{ key: id, label: 'insert ' + VALS[i], meta: 'root=' + root }]));
        reLayout(cmds);
        b.step('插入完成，根是 **' + root + '（' + st[root].v + '）**。', cmds, { line: 9 });
      }

      const oldRoot = root;
      const L = st[root].l, R = st[root].r;
      delete st[root];
      const cmds = [C.hide(oldRoot)];
      root = merge(L, R, 0);
      cmds.push(C.q('op', 'push', [{ key: 'del', label: 'pop_min（删除 ' + oldRoot + '）', meta: '新根 ' + (root || '空') }]));
      reLayout(cmds);
      b.step('弹出最小值 ' + oldRoot + ' 之后，新根是 **' + (root ? root : '空') + '**。' +
        '把左偏树和斜堆放在一起看：**它们做的是同一件事，只是一个用"记录"（dist）判断要不要换，另一个用"总是换"来摊销**。' +
        '这就是算法设计里常见的取舍 —— 用一点点额外信息换最坏情况保证。', cmds, { line: 8, milestone: '删除完成', stage: true });

      return { nodes: defNodes(VALS), edges: [], frames: b.frames, panels: b.panels, directed: true };
    }
  });

  /* ============================================================
   * 3. 配对堆
   * ============================================================ */
  TGV.register({
    id: 'pairing_heap', name: '配对堆（多路合并 · 两趟配对）', category: '树 · 堆与可并堆',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'leftist_heap',
    panels: [
      { id: 'op', type: 'list', title: '操作序列' },
      { id: 'kids', type: 'list', title: '根的孩子们（待配对）' }
    ],
    pseudocode: [
      '// 每个节点可以有任意多个孩子，用"根最小的挂到根大的下面"来合并',
      'merge(a, b): 把 key 大的那个直接挂成 key 小的那个的孩子（O(1)！）',
      'insert(x): merge(堆, x)                                   // O(1)',
      'delete_min():',
      '    第 1 趟：把根的所有孩子从左到右两两配对合并',
      '    第 2 趟：把配对结果从右到左依次合并',
      '// 均摊 O(log n)，实现极简，实际跑得非常快'
    ],
    presets: [
      { id: 'std', label: '插入 5,3,8,1,9,2 → 弹最小（两趟配对）', desc: '注意删最小后孩子们如何被两两配对', data: () => ({}) }
    ],
    run(input) {
      const VALS = valsOf(input);
      const b = new TGV.Builder(this, { nodes: defNodes(VALS), edges: [], panels: this.panels });
      const st = {};
      const kidsOf = id => (st[id] ? st[id].kids.filter(Boolean) : []);
      const rootsOf = () => Object.keys(st).filter(id => !Object.keys(st).some(k => st[k].kids.indexOf(id) >= 0));
      const sync = makeSync();
      const shown = {};
      const showCmds = () => {
        const cmds = [];
        Object.keys(st).forEach(id => { if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); } });
        return cmds;
      };
      const reLayout = (cmds) => {
        const roots = rootsOf();
        const pos = layoutForest(roots, kidsOf, 58, 88);
        sync(cmds, st, kidsOf, roots);
        cmds.push(C.morph(pos, 400));
      };

      b.step('**配对堆**把"合并"做到了极致：`merge(a,b)` 只要把 key 较大的那个**直接挂成另一个的孩子**，一次指针操作，**O(1)**。' +
        '代价都堆在 `delete_min` 上：根被删掉后，它的一堆孩子需要重新整理 —— 做法是**两趟配对**（先从左到右两两合并，再从右到左合并）。', [],
        { line: 1 });

      let root = null;
      for (let i = 0; i < VALS.length; i++) {
        const id = 'v' + VALS[i];
        st[id] = { v: VALS[i], kids: [] };
        const cmds = showCmds();
        if (!root) {
          root = id;
          cmds.push(C.state(id, 'active'));
          b.step('堆为空，' + VALS[i] + ' 直接成为根。', cmds, { line: 3, milestone: '插入 ' + VALS[i] });
        } else if (st[id].v < st[root].v) {
          st[id].kids.push(root);
          cmds.push(C.state(id, 'active'), C.state(root, 'frontier'));
          b.step('插入 ' + VALS[i] + '：它比当前根 ' + st[root].v + ' 还小 → **新节点当根**，老根直接变成它的孩子。一次指针操作，O(1)。', cmds,
            { line: 2, milestone: '插入 ' + VALS[i] + '（成为新根）' });
          root = id;
        } else {
          st[root].kids.push(id);
          cmds.push(C.state(id, 'frontier'));
          b.step('插入 ' + VALS[i] + '：比根 ' + st[root].v + ' 大 → 直接挂成根的孩子。同样 O(1)。', cmds,
            { line: 2, milestone: '插入 ' + VALS[i] });
        }
        cmds.push(C.q('op', 'push', [{ key: id, label: 'insert ' + VALS[i], meta: 'O(1)' }]));
        reLayout(cmds);
        b.step('现在根是 **' + root + '（' + st[root].v + '）**，它下面挂着 ' + st[root].kids.length + ' 个孩子。', cmds, { line: 3 });
      }

      // delete_min
      const oldRoot = root;
      const kids = st[oldRoot].kids.slice();
      b.step('**弹出最小值 ' + st[oldRoot].v + '**：根被拿走后留下 ' + kids.length + ' 个孩子（它们各自的子树都还是合法堆）。' +
        '下面要做的就是把这一排孩子重新合并成一个堆。', [
        C.state(oldRoot, 'conflict'),
        C.q('kids', 'set', kids.map(k => ({ key: k, label: k + '(' + st[k].v + ')' })))
      ], { line: 4, milestone: '删除根 ' + oldRoot });

      // 第一趟：两两配对
      let pass1 = [];
      for (let i = 0; i < kids.length; i += 2) {
        if (i + 1 >= kids.length) { pass1.push(kids[i]); break; }
        let a = kids[i], c = kids[i + 1];
        if (st[a].v > st[c].v) { const t = a; a = c; c = t; }
        st[a].kids.push(c);
        pass1.push(a);
        b.step('**第一趟**：配对 ' + kids[i] + '(' + st[kids[i]].v + ') 与 ' + kids[i + 1] + '(' + st[kids[i + 1]].v + ') → ' +
          '大的挂到小的下面，胜出者 **' + a + '**。', [
          C.state(a, 'active'), C.state(c, 'frontier')
        ], { line: 5 });
      }
      b.step('第一趟结束，剩下 ' + pass1.length + ' 个候选：' + pass1.join('、') + '。', [], { line: 5 });

      // 第二趟：从右到左
      let acc = pass1[pass1.length - 1];
      for (let i = pass1.length - 2; i >= 0; i--) {
        let a = pass1[i], c = acc;
        if (st[a].v > st[c].v) { const t = a; a = c; c = t; }
        st[a].kids.push(c);
        acc = a;
        b.step('**第二趟**（从右往左）：把 ' + pass1[i] + ' 与当前结果 ' + c + ' 合并 → **' + a + '**。' +
          '从右往左是为了让一开始配对出的"小根"最后再合并，减少比较次数。', [C.state(a, 'active')], { line: 6 });
      }
      root = acc;
      delete st[oldRoot];
      const cmds = [C.hide(oldRoot), C.q('kids', 'clear'), C.q('op', 'push', [{ key: 'del', label: 'pop_min（删除 ' + oldRoot + '）', meta: '新根 ' + root }])];
      reLayout(cmds);
      b.step('两趟配对完成，**新根是 ' + root + '（' + st[root].v + '）**。' +
        '配对堆的哲学是"**把工作推迟**"：插入和合并都是 O(1)，只有删最小才做整理，且均摊下来仍是 O(log n)。' +
        '它没有左偏树那样漂亮的最坏情况保证，但常数极小，是实践中最快的可并堆之一（Dijkstra 优化常用）。', cmds,
        { line: 7, milestone: '新根 ' + root, stage: true });

      return { nodes: defNodes(VALS), edges: [], frames: b.frames, panels: b.panels, directed: true };
    }
  });

  /* ============================================================
   * 4. 二项堆
   * ============================================================ */
  const BIN_VALS = [5, 3, 8, 1, 9, 2];

  TGV.register({
    id: 'binomial_heap', name: '二项堆（二项树森林 · 按度数合并）', category: '树 · 堆与可并堆',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'binary_heap',
    panels: [
      { id: 'op', type: 'list', title: '操作序列' },
      { id: 'forest', type: 'list', title: '当前森林（按度数排列）' }
    ],
    pseudocode: [
      '// 二项树 Bk：根有 k 个孩子，分别是 B0, B1, …, B(k-1)；共 2^k 个节点',
      '// 二项堆 = 若干棵"度数互不相同"的二项树组成的森林',
      'insert(x): 把 x 看成 B0，像二进制进位一样合并同度数的树',
      'merge(H1, H2): 按度数从小到大扫描，同度数就链接（根小的当父）',
      'delete_min(): 找到最小根 → 摘掉它 → 它的孩子们拆成森林 → 合并回去',
      '// 森林里树的度数 = n 的二进制位，所以最多 O(log n) 棵',
      '// 二项堆的价值：可并。两个堆合并不需要重建，按度数扫一遍即可'
    ],
    presets: [
      { id: 'std', label: '插入 5,3,8,1,9,2 → 弹最小', desc: '每次插入都像二进制加一：进位合并同度数树', data: () => ({}) }
    ],
    run(input) {
      const BIN_VALS = (input && input.vals && input.vals.length >= 2) ? input.vals : [5, 3, 8, 1, 9, 2];
      const b = new TGV.Builder(this, { nodes: defNodes(BIN_VALS), edges: [], panels: this.panels });
      const st = {};       // id -> {v, deg, kids: []}
      const kidsOf = id => (st[id] ? st[id].kids.filter(Boolean) : []);
      const rootsOf = () => Object.keys(st).filter(id => !Object.keys(st).some(k => st[k].kids.indexOf(id) >= 0))
        .sort((x, y) => st[x].deg - st[y].deg);
      const sync = makeSync();
      const shown = {};
      const showCmds = () => {
        const cmds = [];
        Object.keys(st).forEach(id => { if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); } });
        return cmds;
      };
      const forestCmds = () => rootsOf().map((r, i) => ({ key: r, label: 'B' + st[r].deg + ' @' + r, meta: 'key=' + st[r].v }));

      const reLayout = (cmds) => {
        const roots = rootsOf();
        const pos = layoutForest(roots, kidsOf, 56, 84);
        sync(cmds, st, kidsOf, roots);
        cmds.push(C.morph(pos, 400));
      };

      b.step('**二项堆**换了个思路：不再追求"一棵树"，而是维护一片**森林**。' +
        '森林里每棵树的形状固定叫**二项树** Bk：根有 k 个孩子，从左到右分别是 B(k−1)…B0，共 2^k 个节点。' +
        '关键性质：**整个森林里每种度数最多只有一棵树** —— 于是 n 个节点最多 O(log n) 棵树，正好对应 n 的二进制表示。', [],
        { line: 1 });

      const link = (a, c) => {
        // a, c 同度数，把大根挂到小根下面
        let A = a, B = c;
        if (st[A].v > st[B].v) { const t = A; A = B; B = t; }
        st[A].kids.unshift(B);
        st[A].deg += 1;
        return A;
      };

      let forest = [];
      for (let i = 0; i < BIN_VALS.length; i++) {
        const id = 'v' + BIN_VALS[i];
        st[id] = { v: BIN_VALS[i], deg: 0, kids: [] };
        b.step('**插入 ' + BIN_VALS[i] + '**：先当成一棵 B0 加入森林。如果已存在 B0，就合并成 B1；若还有 B1，再合并成 B2……' +
          '**这就是二进制进位**。', [C.state(id, 'active')], { line: 3, milestone: '插入 ' + BIN_VALS[i] });
        forest.push(id);
        // 进位
        let guard = 0;
        while (guard++ < 8) {
          const byDeg = {};
          let dup = null;
          for (let k = 0; k < forest.length; k++) {
            const d = st[forest[k]].deg;
            if (byDeg[d] !== undefined) { dup = [byDeg[d], forest[k], d]; break; }
            byDeg[d] = forest[k];
          }
          if (!dup) break;
          const [a, c, d] = dup;
          const keep = link(a, c);
          forest = forest.filter(x => x !== a && x !== c);
          forest.push(keep);
          const cmds = showCmds();
          cmds.push(C.q('op', 'push', [{ key: 'm' + i + d, label: 'B' + d + ' + B' + d + ' → B' + (d + 1), meta: '进位' }]));
          reLayout(cmds);
          b.step('森林里有两棵 **B' + d + '** → 合并成一棵 B' + (d + 1) + '：把 key 大的根挂到 key 小的根下面，' +
            '度数相加。新树的根是 **' + keep + '（' + st[keep].v + '）**。', cmds, { line: 4, milestone: 'B' + d + '→B' + (d + 1) });
        }
        const cmds2 = showCmds();
        cmds2.push(C.q('forest', 'set', forestCmds()));
        reLayout(cmds2);
        b.step('插入完成。当前森林：' + rootsOf().map(r => 'B' + st[r].deg + '(根 ' + st[r].v + ')').join('、') + '。' +
          '节点数 ' + (i + 1) + '，二进制 ' + (i + 1).toString(2) + ' —— 森林里的度数正好对应 1 的位置。', cmds2,
          { line: 5, milestone: '森林：' + rootsOf().map(r => 'B' + st[r].deg).join(' ') });
      }

      // delete_min
      const roots = rootsOf();
      let minRoot = roots[0];
      roots.forEach(r => { if (st[r].v < st[minRoot].v) minRoot = r; });
      b.step('**弹出最小值**：先在 ' + roots.length + ' 个树根里找最小的 —— 是 **' + minRoot + '（' + st[minRoot].v + '）**。' +
        '注意！最小值一定在某个**根**上（堆序性质），所以只需扫 O(log n) 个根，不用遍历所有节点。', [
        C.state(minRoot, 'conflict')
      ], { line: 6, milestone: '最小根 ' + minRoot });

      const children = st[minRoot].kids.slice();
      b.step('摘掉 ' + minRoot + ' 之后，它的 ' + children.length + ' 个孩子（度数分别是 ' +
        children.map(c => st[c].deg).join('、') + '）各自成为一棵新树的根 —— 因为 Bk 的根的孩子恰好是 B(k−1)…B0，' +
        '**度数互不相同**，所以它们直接构成一个合法的二项堆森林。', [
        C.q('forest', 'set', children.map(c => ({ key: c, label: 'B' + st[c].deg + ' @' + c, meta: 'key=' + st[c].v })))
      ], { line: 6 });

      delete st[minRoot];
      forest = forest.filter(x => x !== minRoot).concat(children);
      const cmds = [C.hide(minRoot), C.q('op', 'push', [{ key: 'del', label: 'pop_min ' + minRoot, meta: '拆出 ' + children.length + ' 棵树' }])];
      reLayout(cmds);
      b.step('把"剩下的森林"与"孩子们组成的森林"再**合并**一次（同样的进位规则），就完成了删最小。' +
        '二项堆的每个操作都是 O(log n)：`insert` 均摊 O(1)（进位次数均摊很少），`delete_min` 需要 O(log n) 次合并。' +
        '它的价值在于**可并**：两个二项堆合并只需按度数扫描一次，而二叉堆要重建。', cmds,
        { line: 7, milestone: '删除完成', stage: true });

      return { nodes: defNodes(BIN_VALS), edges: [], frames: b.frames, panels: b.panels, directed: true };
    }
  });

})();
