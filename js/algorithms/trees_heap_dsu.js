/* ============================================================
 * 第一卷 · T4 堆 / T6 并查集 · 线段树 · 树状数组 · LCA · 树的直径
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;
  const Lib = TGV.TreeLib;

  /* ============================================================
   * 二叉堆（双视图：完全二叉树 + 紧凑数组）
   * ============================================================ */
  TGV.register({
    id: 'binary_heap', name: '二叉堆 · 上浮 / 下沉 / Floyd 建堆', category: '树 · 堆与优先队列',
    layout: 'tree', childOrder: 'none',
    panels: [
      { id: 'arr', type: 'array', title: '底层数组（下标 = 树形层序）' },
      { id: 'note', type: 'text', title: '下标映射公式' }
    ],
    pseudocode: [
      '// 小根堆：a[i] <= a[2i+1] 且 a[i] <= a[2i+2]',
      '// 下标映射：parent(i) = (i-1)/2, left = 2i+1, right = 2i+2',
      'sift_up(i):',
      '    while i > 0 and a[i] < a[parent(i)]:',
      '        swap(a[i], a[parent(i)]); i = parent(i)',
      'sift_down(i):',
      '    while left(i) exists:',
      '        j = 较小的那个孩子',
      '        if a[i] <= a[j]: break',
      '        swap(a[i], a[j]); i = j',
      'build_floyd():  for i = n/2-1 down to 0: sift_down(i)      // O(n)',
      'build_insert(): for i = 0..n-1: push(a[i])                  // O(n log n)'
    ],
    presets: [
      { id: 'floyd', label: 'Floyd 自底向上建堆 O(n)', desc: '[9,7,8,3,6,5,2,1] 逐个下沉', data: () => ({ arr: [9, 7, 8, 3, 6, 5, 2, 1], mode: 'floyd' }) },
      { id: 'insert', label: '逐个插入建堆 O(n log n)', desc: '观察每次上浮的路径', data: () => ({ arr: [9, 7, 8, 3, 6, 5, 2, 1], mode: 'insert' }) },
      { id: 'ops', label: '插入 0 与弹出堆顶', desc: '上浮与下沉的完整对照', data: () => ({ arr: [3, 6, 5, 9, 7, 8], mode: 'ops', push: 0 }) }
    ],
    run(input) {
      const base = input.arr || [];
      const mode = input.mode || 'floyd';
      let a = [];
      // 先建出 n 个结点（位置固定）
      const n = mode === 'ops' ? base.length + 1 : base.length;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const nodes = [], edges = [];
      for (let i = 0; i < n; i++) {
        nodes.push({ id: 'h' + i, label: '', key: i, ord: i });
        if (i > 0) edges.push({ id: 'h' + ((i - 1) >> 1) + '>h' + i, source: 'h' + ((i - 1) >> 1), target: 'h' + i });
      }
      b.nodes = nodes; b.edges = edges;
      const arrCmd = (hi) => C.array('arr', a.map(v => (v === undefined ? '·' : v)), hi || []);
      const setVal = (i, v) => { a[i] = v; return C.setLabel('h' + i, String(v)); };
      const parent = i => (i - 1) >> 1, left = i => 2 * i + 1, right = i => 2 * i + 2;

      b.step('二叉堆是一棵**完全二叉树**，因此可以用连续数组紧凑存储，不需要任何指针。父子下标关系为：`parent = (i-1)/2`，`left = 2i+1`，`right = 2i+2`。', [
        C.text('note', ['parent(i) = (i-1)/2', 'left(i) = 2i+1', 'right(i) = 2i+2', 'n = ' + n])
      ], { line: 2 });

      if (mode === 'floyd' || mode === 'insert') {
        a = base.slice();
        const init = [];
        a.forEach((v, i) => init.push(C.setLabel('h' + i, String(v))));
        init.push(arrCmd([]));
        b.step('初始数组：[' + a.join(', ') + ']。它的层序对应完全二叉树形状，但还不满足堆性质。', init, { line: 3 });

        const swap = (i, j) => {
          const t = a[i]; a[i] = a[j]; a[j] = t;
          return [setVal(i, a[i]), setVal(j, a[j])];
        };

        if (mode === 'floyd') {
          b.step('**Floyd 建堆**：从最后一个非叶子结点 `n/2 - 1 = ' + (Math.floor(n / 2) - 1) + '` 开始向前，对每个结点执行下沉。总复杂度 O(n)。', [], { line: 11, milestone: '开始 Floyd 建堆', stage: true });
          for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            b.step('对下标 ' + i + '（值 ' + a[i] + '）执行 `sift_down`。', [C.state('h' + i, 'active')], { line: 6, stage: true });
            let cur = i, guard = 0;
            while (left(cur) < n && guard++ < 30) {
              let j = left(cur);
              if (right(cur) < n && a[right(cur)] < a[j]) {
                b.step('左右孩子 ' + a[left(cur)] + ' 与 ' + a[right(cur)] + ' 中，**' + a[right(cur)] + ' 更小**，选它作为交换对象。', [
                  C.state('h' + right(cur), 'frontier'), C.state('h' + left(cur), 'frontier')
                ], { line: 8 });
                j = right(cur);
              }
              if (a[cur] <= a[j]) {
                b.step('父结点 ' + a[cur] + ' ≤ 孩子 ' + a[j] + '，**堆性质已满足**，下沉停止。', [C.state('h' + cur, 'visited')], { line: 9 });
                break;
              }
              b.step('父结点 ' + a[cur] + ' > 孩子 ' + a[j] + '，交换二者，游标下沉到 ' + j + '。', [
                C.pulse('h' + cur + '>h' + j, { color: '#F59E0B' })
              ].concat(swap(cur, j)).concat([arrCmd([cur, j])]), { line: 10, vars: [{ name: 'i', value: cur }, { name: 'j', value: j }] });
              C.state('h' + cur, 'default');
              cur = j;
              C.state('h' + cur, 'active');
            }
            b.step('下标 ' + i + ' 的子树已修复为合法小根堆。', [C.state('h' + i, 'visited')], { line: 6 });
          }
          b.step('Floyd 建堆完成：[' + a.join(', ') + ']。**每个结点最多下沉一次的总代价是 O(n)**，比逐个插入的 O(n log n) 更快。', [arrCmd([])], { line: 11, milestone: '建堆完成 O(n)' });
        } else {
          b.step('**逐个插入建堆**：每来一个元素就放到数组末尾，然后一路上浮。共 ' + n + ' 次插入，每次 O(log n)。', [], { line: 12, milestone: '开始逐个插入', stage: true });
          const heap = [];
          let filled = 0;
          a.forEach((v, i) => {
            heap.push(v);
            const cm = [setVal(i, v), arrCmd([i])];
            b.step('把 ' + v + ' 放到数组末尾（下标 ' + i + '），堆的有效长度变为 ' + (i + 1) + '。', cm, { line: 12, vars: [{ name: 'i', value: i }] });
            let cur = i, guard = 0;
            while (cur > 0 && guard++ < 30) {
              const p = parent(cur);
              if (a[cur] >= a[p]) {
                b.step('父结点 ' + a[p] + ' ≤ 新元素 ' + a[cur] + '，上浮停止。', [], { line: 4 });
                break;
              }
              b.step('新元素 ' + a[cur] + ' < 父结点 ' + a[p] + '，**交换上浮**。', [
                C.pulse('h' + p + '>h' + cur, { color: '#F59E0B', direction: 'reverse' })
              ].concat(swap(cur, p)).concat([arrCmd([cur, p])]), { line: 5, vars: [{ name: 'i', value: cur }] });
              C.state('h' + cur, 'default');
              cur = p;
              C.state('h' + cur, 'active');
            }
            C.state('h' + cur, 'visited');
            filled++;
          });
          b.step('全部插入完成：[' + a.join(', ') + ']。与 Floyd 相比，这里多做了一些无效的上浮——这就是 O(n log n) 与 O(n) 的差别。', [], { line: 12, milestone: '建堆完成 O(n log n)' });
        }
      } else {
        a = base.slice();
        const init = [];
        a.forEach((v, i) => init.push(C.setLabel('h' + i, String(v))));
        init.push(arrCmd([]));
        b.step('当前是一个合法小根堆：[' + a.join(', ') + ']。根结点 ' + a[0] + ' 是全局最小值。', init, { line: 1 });
        // push
        const v = input.push;
        const i = a.length;
        a.push(v);
        b.step('**插入 ' + v + '**：先放到数组末尾（下标 ' + i + '），保持完全二叉树形状。', [setVal(i, v), arrCmd([i]), C.state('h' + i, 'active')], { line: 12, milestone: '新元素 ' + v + ' 入堆' });
        let cur = i, guard = 0;
        while (cur > 0 && guard++ < 30) {
          const p = parent(cur);
          if (a[cur] >= a[p]) { b.step('父结点 ' + a[p] + ' ≤ ' + a[cur] + '，上浮结束。', [], { line: 4 }); break; }
          b.step(a[cur] + ' < 父结点 ' + a[p] + '，交换上浮。', [C.pulse('h' + p + '>h' + cur, { color: '#F59E0B', direction: 'reverse' }), setVal(cur, a[p]), setVal(p, a[cur]), arrCmd([cur, p])], { line: 5 });
          const t = a[cur]; a[cur] = a[p]; a[p] = t;
          C.state('h' + cur, 'default');
          cur = p;
          C.state('h' + cur, 'active');
        }
        b.step('上浮到位：' + v + ' 现在位于下标 ' + cur + '。堆数组 = [' + a.join(', ') + ']。', [C.state('h' + cur, 'path')], { line: 5, milestone: '上浮完成' });
        // pop
        b.step('**弹出堆顶**：先记录最小值 ' + a[0] + '，再把末尾元素 ' + a[a.length - 1] + ' 搬到根，最后下沉。', [C.state('h0', 'conflict')], { line: 6, milestone: '弹出堆顶 ' + a[0], stage: true });
        const last = a.length - 1;
        a[0] = a[last]; a.pop();
        const cm = [setVal(0, a[0]), C.setLabel('h' + last, '')];
        b.step('末尾元素 ' + a[0] + ' 顶到根位置，堆长度 -1。现在它大概率比孩子大，需要**下沉**。', cm.concat([arrCmd([0])]), { line: 7 });
        let c2 = 0; guard = 0;
        const size = a.length;
        while (left(c2) < size && guard++ < 30) {
          let j = left(c2);
          if (right(c2) < size && a[right(c2)] < a[j]) j = right(c2);
          if (a[c2] <= a[j]) { b.step('父结点 ' + a[c2] + ' ≤ 孩子 ' + a[j] + '，下沉结束。', [], { line: 9 }); break; }
          b.step(a[c2] + ' > 较小的孩子 ' + a[j] + '，交换并继续下沉。', [C.pulse('h' + c2 + '>h' + j, { color: '#F59E0B' }), setVal(c2, a[j]), setVal(j, a[c2]), arrCmd([c2, j])], { line: 10 });
          const t = a[c2]; a[c2] = a[j]; a[j] = t;
          C.state('h' + c2, 'default');
          c2 = j;
          C.state('h' + c2, 'active');
        }
        b.step('弹出完成，新堆顶为 ' + a[0] + '。数组 = [' + a.join(', ') + ']。', [C.state('h' + c2, 'path')], { line: 10, milestone: '下沉完成' });
      }
      const fin = arrCmd([]);
      b.step('最终数组：[' + a.join(', ') + ']。注意：**堆只保证父子有序，层序数组并不完全有序**——如果想得到排序结果，需要反复弹出堆顶（堆排序）。', fin, { line: 1, milestone: '结束' });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 并查集（按大小合并 + 路径压缩）
   * ============================================================ */
  TGV.register({
    id: 'dsu', name: '并查集 · 按秩合并与路径压缩', category: '树 · 并查集',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'dsu', type: 'dsu', title: '并查集森林（父指针）' }],
    pseudocode: [
      '// 每个集合是一棵树，树根代表整个集合',
      'find(x):',
      '    if fa[x] == x: return x',
      '    fa[x] = find(fa[x])      // 路径压缩：沿途结点直接挂到根',
      '    return fa[x]',
      'union(a, b):',
      '    ra = find(a); rb = find(b)',
      '    if ra == rb: return       // 已在同一集合',
      '    if size[ra] < size[rb]: swap(ra, rb)',
      '    fa[rb] = ra; size[ra] += size[rb]   // 小树挂到大树'
    ],
    presets: [
      { id: 'basic', label: '基础合并 6 次 + 路径压缩', desc: 'union(1,2)(2,3)(4,5)(5,6)(3,4) 后 find(3)', data: () => ({ n: 7, ops: [['union', 1, 2], ['union', 2, 3], ['union', 4, 5], ['union', 5, 6], ['union', 3, 4], ['find', 6]] }) },
      { id: 'compress', label: '深链路径压缩', desc: '链状结构被"折扇式"压平', data: () => ({ n: 8, ops: [['union', 1, 2], ['union', 2, 3], ['union', 3, 4], ['union', 4, 5], ['union', 5, 6], ['find', 6]] }) },
      { id: 'size', label: '按大小合并防止退化', desc: '对比小挂大与随机合并', data: () => ({ n: 9, ops: [['union', 1, 2], ['union', 3, 4], ['union', 1, 3], ['union', 5, 6], ['union', 7, 8], ['union', 5, 7], ['union', 1, 5], ['find', 8]] }) }
    ],
    run(input) {
      const n = input.n || 7;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const nodes = [], edges = [];
      const fa = {}, sz = {};
      for (let i = 1; i <= n; i++) { nodes.push({ id: 'd' + i, label: String(i), key: i, ord: i }); fa[i] = i; sz[i] = 1; }
      b.nodes = nodes;
      const edgeSet = {};
      const dsuCmd = () => {
        const p = {}, r = {};
        for (let i = 1; i <= n; i++) { p[i] = fa[i] === i ? null : fa[i]; r[i] = sz[i]; }
        return C.dsu('dsu', p, r);
      };
      b.step('并查集用**一棵树表示一个集合**，树根就是集合代表元。初始时每个元素自成一个集合。', [dsuCmd()], { line: 1 });

      const addEdge = (child, parent) => {
        const id = 'd' + parent + '>d' + child;
        if (!edgeSet[id]) { edgeSet[id] = 1; return [C.addEdge(id, 'd' + parent, 'd' + child)]; }
        return [];
      };
      const delEdge = (child, parent) => {
        const id = 'd' + parent + '>d' + child;
        if (edgeSet[id]) { delete edgeSet[id]; return [C.removeEdge(id)]; }
        return [];
      };
      const find = (x, verbose) => {
        const path = [];
        let cur = x;
        while (fa[cur] !== cur) { path.push(cur); cur = fa[cur]; }
        if (verbose) {
          b.step('`find(' + x + ')`：沿父指针一路向上 → ' + path.concat([cur]).map(v => 'fa[' + v + ']').join(' → ') + '，根为 **' + cur + '**。', [
            ...path.map(v => C.state('d' + v, 'frontier')), C.state('d' + cur, 'path')
          ], { line: 3, vars: [{ name: 'x', value: x }, { name: 'root', value: cur }] });
        }
        if (path.length > 1) {
          const cm = [];
          path.forEach(v => {
            const old = fa[v];
            if (old !== cur) cm.push(...delEdge(v, old));
            fa[v] = cur;
            if (old !== cur) cm.push(...addEdge(v, cur));
          });
          b.step('**路径压缩**：' + path.map(v => v).join(', ') + ' 全部直接挂到根 ' + cur + ' 下面。下次再查这些结点就是 O(1)。', cm.concat([dsuCmd()]), { line: 4, milestone: '路径压缩 → 根 ' + cur });
        }
        return cur;
      };

      input.ops.forEach((op, idx) => {
        if (op[0] === 'union') {
          const a = op[1], bb = op[2];
          b.step('**`union(' + a + ', ' + bb + ')`**：先分别找到两个集合的根。', [], { line: 6, vars: [{ name: 'a', value: a }, { name: 'b', value: bb }], stage: true });
          const ra = find(a), rb = find(bb);
          if (ra === rb) {
            b.step('两者根相同（' + ra + '），说明 **' + a + ' 与 ' + bb + ' 已在同一集合**，无需合并。', [], { line: 8 });
            return;
          }
          let big = ra, small = rb;
          if (sz[ra] < sz[rb]) { big = rb; small = ra; }
          b.step('按大小合并：集合 ' + ra + '（大小 ' + sz[ra] + '）与 ' + rb + '（大小 ' + sz[rb] + '），把**小树的根挂到大树根**下，避免树高疯长。', [
            C.state('d' + big, 'active'), C.state('d' + small, 'frontier')
          ], { line: 9 });
          fa[small] = big;
          sz[big] += sz[small];
          b.step('`fa[' + small + '] = ' + big + '`，合并后集合大小 = ' + sz[big] + '。', addEdge(small, big).concat([dsuCmd()]), { line: 10, milestone: '合并 ' + ra + ' ∪ ' + rb });
        } else {
          b.step('**`find(' + op[1] + ')`**：查询代表元，并顺带压缩路径。', [], { line: 2, stage: true });
          const r = find(op[1], true);
          b.step('返回根 ' + r + '。路径压缩 + 按秩合并的组合让单次操作的**均摊复杂度低至 O(α(n))**（反阿克曼函数，实际可视为常数）。', [dsuCmd()], { line: 4, milestone: '查询完成' });
        }
      });
      b.step('演示结束。当前有 ' + new Set(Object.keys(fa).filter(k => fa[k] === +k)).size + ' 个集合，每个集合都是一棵扁平的树。', [
        dsuCmd()
      ].concat(Object.keys(fa).map(k => C.state('d' + k, 'default'))), { line: 10, milestone: '结束' });
      b.edges = Object.keys(edgeSet).map(id => {
        const [s, t] = id.split('>');
        return { id, source: s, target: t };
      });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 线段树（区间查询 + 懒标记下传）
   * ============================================================ */
  TGV.register({
    id: 'segment_tree', name: '线段树 · 区间查询与懒标记下传', category: '树 · 区间结构',
    layout: 'tree', childOrder: 'key',
    panels: [
      { id: 'arr', type: 'array', title: '原数组' },
      { id: 'note', type: 'text', title: '当前操作' }
    ],
    pseudocode: [
      '// 每个结点管理一段区间 [L, R]，维护区间和 sum',
      'build(u, L, R):',
      '    if L == R: sum[u] = a[L]; return',
      '    mid = (L+R)/2; build(2u, L, mid); build(2u+1, mid+1, R)',
      '    sum[u] = sum[2u] + sum[2u+1]',
      'query(u, L, R, ql, qr):',
      '    if ql <= L and R <= qr: return sum[u]        // 完全覆盖',
      '    push_down(u); 递归左右; 合并答案',
      'update(u, L, R, ql, qr, v):',
      '    if 完全覆盖: sum[u] += v*(R-L+1); lazy[u] += v; return',
      '    push_down(u); 递归; sum[u] = 左 + 右',
      'push_down(u): lazy 分裂为两个子结点，自己清零'
    ],
    presets: [
      { id: 'query', label: '建树 + 区间查询 [2, 6]', desc: '高亮被完全覆盖的结点，跳过无关分支', data: () => ({ arr: [1, 3, 5, 7, 9, 11, 13, 15], ql: 2, qr: 6 }) },
      { id: 'lazy', label: '区间加 + 懒标记下传', desc: '对 [1,5] 加 10，再查询 [2,4] 触发 PushDown', data: () => ({ arr: [1, 3, 5, 7, 9, 11, 13, 15], ql: 2, qr: 6, lazyMode: true }) },
      { id: 'query2', label: '单点查询 [3, 3]', desc: '一条路径下潜到底', data: () => ({ arr: [1, 3, 5, 7, 9, 11, 13, 15], ql: 3, qr: 3 }) }
    ],
    run(input) {
      const a0 = input.arr || [1, 3, 5, 7, 9, 11, 13, 15];
      const n = a0.length;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const nodes = [], edges = [];
      let idc = 0;
      function build(L, R, depth) {
        const id = 's' + (++idc);
        const nd = { id, L, R, sum: 0, lazy: 0, depth };
        nodes.push({ id, label: '', key: (L + R) / 2, ord: L });
        if (L === R) { nd.sum = a0[L - 1]; nd.leaf = true; }
        else {
          const mid = (L + R) >> 1;
          const l = build(L, mid, depth + 1);
          nd.left = l; nd.right = build(mid + 1, R, depth + 1);
          nd.left.parent = nd; nd.right.parent = nd;
          nd.sum = nd.left.sum + nd.right.sum;
          edges.push({ id: id + '>' + l.id, source: id, target: l.id });
          edges.push({ id: id + '>' + nd.right.id, source: id, target: nd.right.id });
        }
        return nd;
      }
      const root = build(1, n, 0);
      b.nodes = nodes; b.edges = edges;
      const byRange = {};
      nodes.forEach(nd => { byRange[nd.id] = nd; });
      const all = [];
      (function walk(u) { if (!u) return; all.push(u); walk(u.left); walk(u.right); })(root);
      const label = (u) => '[' + u.L + ',' + u.R + ']';
      const paint = (cmds) => {
        all.forEach(u => {
          cmds.push(C.setLabel(u.id, String(u.sum)));
          cmds.push(C.badge(u.id, 'seg', label(u)));
          if (u.lazy) cmds.push(C.badge(u.id, 'lazy', '+' + u.lazy));
          else cmds.push(C.badge(u.id, 'lazy', null));
        });
      };
      b.step('线段树把数组区间**递归二分**，每个结点负责一段 `[L, R]` 并维护该区间的聚合值（这里是区间和）。结点上方的 `seg` 就是它管辖的区间。', [
        C.array('arr', a0, [], a0.map((v, i) => 'a' + (i + 1)))
      ], { line: 1 });
      paint([]);
      const init = [];
      paint(init);
      b.step('建树完成，共 ' + all.length + ' 个结点，高度 ⌈log₂n⌉+1 = ' + (Math.ceil(Math.log2(n)) + 1) + '。根结点管理整个区间 [1,' + n + ']，sum = ' + root.sum + '。', init, { line: 5, milestone: '建树完成' });

      const ql = input.ql, qr = input.qr;
      let hit = 0;
      const query = (u, depth) => {
        if (!u) return 0;
        if (ql <= u.L && u.R <= qr) {
          hit++;
          b.step('结点 ' + label(u) + ' **被查询区间完全覆盖** → 直接取它的 sum = ' + u.sum + '，**整棵子树都不用再往下递归**。这就是线段树 O(log n) 的来源。', [
            C.state(u.id, 'path')
          ], { line: 7, vars: [{ name: 'sum', value: u.sum }] });
          return u.sum;
        }
        if (u.R < ql || u.L > qr) {
          b.step('结点 ' + label(u) + ' 与查询区间**完全无关** → 剪枝返回 0。', [C.state(u.id, 'ghost')], { line: 6 });
          return 0;
        }
        b.step('结点 ' + label(u) + ' 与查询区间**部分相交**，必须继续向下递归。', [C.state(u.id, 'active')], { line: 8 });
        const s = query(u.left, depth + 1) + query(u.right, depth + 1);
        return s;
      };
      b.step('**区间查询 [' + ql + ', ' + qr + ']**：从根开始，只递归"部分相交"的分支。', [], { line: 6, milestone: '查询 [' + ql + ',' + qr + ']', stage: true });
      const ans = query(root, 0);
      b.step('查询结果 sum[' + ql + '..' + qr + '] = **' + ans + '**，共访问 ' + hit + ' 个"完全覆盖"结点。暴力求和需要 ' + (qr - ql + 1) + ' 次加法，线段树只需 O(log n) 次合并。', [], { line: 8, milestone: '查询结果 = ' + ans });

      if (input.lazyMode) {
        // 区间加
        const a = a0.slice();
        const ul = 1, ur = 5, v = 10;
        b.step('**区间加**：给 [1, 5] 每个元素加 ' + v + '。如果逐个更新要动 5 个叶子，线段树用**懒标记**只改 O(log n) 个结点。', [], { line: 9, milestone: '区间加 [' + ul + ',' + ur + '] +' + v, stage: true });
        const upd = (u) => {
          if (!u) return;
          if (ul <= u.L && u.R <= ur) {
            u.sum += v * (u.R - u.L + 1);
            u.lazy += v;
            const cm = [];
            paint(cm);
            cm.push(C.state(u.id, 'path'));
            b.step('结点 ' + label(u) + ' **被完全覆盖** → `sum += ' + v + '×' + (u.R - u.L + 1) + ' = ' + u.sum + '`，同时打上懒标记 `lazy = +' + u.lazy + '`，**不再向下递归**。', cm, { line: 10, milestone: '打上 lazy 标记 ' + label(u) });
            return;
          }
          if (u.R < ul || u.L > ur) return;
          if (u.lazy) {
            b.step('需要深入 ' + label(u) + '，但它带着 `lazy = +' + u.lazy + '` 的标记 → 必须先 **PushDown**：把标记拆给两个孩子。', [C.state(u.id, 'conflict')], { line: 11 });
            [u.left, u.right].forEach(c => {
              if (!c) return;
              c.sum += u.lazy * (c.R - c.L + 1);
              c.lazy += u.lazy;
            });
            const cm = [C.clearArc('lz' + u.id)];
            [u.left, u.right].forEach(c => { if (c) cm.push(C.pulse(u.id + '>' + c.id, { color: '#8B5CF6' })); });
            u.lazy = 0;
            paint(cm);
            b.step('懒标记像两颗粒子滑向左右孩子：两个孩子的 sum 各自加上 `lazy × 区间长度`，自己的 lazy 清零。', cm, { line: 11, milestone: 'PushDown → ' + label(u) });
          }
          upd(u.left); upd(u.right);
          u.sum = u.left.sum + u.right.sum;
          const cm = [];
          paint(cm);
          b.step('回溯更新 ' + label(u) + '：`sum = 左 + 右 = ' + u.sum + '`。', cm, { line: 11 });
        };
        upd(root);
        b.step('区间加完成。注意有些结点的 sum 已经是"加上懒标记之后"的值，而它们的子孙还没有更新——**懒标记就是把这项工作推迟到真正需要时再做**。', [], { line: 10 });

        const q2 = [2, 4];
        b.step('现在查询 [' + q2[0] + ', ' + q2[1] + ']：这条路径会经过带懒标记的结点，从而触发 PushDown。', [], { line: 6, milestone: '查询触发懒标记下传', stage: true });
        const res = (function q(u) {
          if (!u) return 0;
          if (q2[0] <= u.L && u.R <= q2[1]) {
            b.step('结点 ' + label(u) + ' 完全覆盖，返回 sum = ' + u.sum + '（其中已包含懒标记的贡献）。', [C.state(u.id, 'path')], { line: 7 });
            return u.sum;
          }
          if (u.R < q2[0] || u.L > q2[1]) return 0;
          if (u.lazy) {
            [u.left, u.right].forEach(c => { if (c) { c.sum += u.lazy * (c.R - c.L + 1); c.lazy += u.lazy; } });
            b.step('深入前先 PushDown 结点 ' + label(u) + ' 的 `lazy = +' + u.lazy + '`。', [C.state(u.id, 'conflict')], { line: 11, milestone: 'PushDown ' + label(u) });
            u.lazy = 0;
            const cm = []; paint(cm);
            b.step('标记已下传，孩子结点的 sum 得到更新。', cm, { line: 11 });
          }
          b.step('结点 ' + label(u) + ' 部分相交，继续递归。', [C.state(u.id, 'active')], { line: 8 });
          return q(u.left) + q(u.right);
        })(root);
        b.step('结果 = ' + res + '。手算校验：(3+10)+(5+10)+(7+10) = 45 ✓。懒标记保证了每次修改与查询都是 O(log n)。', [], { line: 7, milestone: '结果 = ' + res });
      }
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 树状数组 Fenwick
   * ============================================================ */
  TGV.register({
    id: 'fenwick', name: '树状数组 · lowbit 与区间覆盖', category: '树 · 区间结构',
    layout: 'fixed',
    panels: [
      { id: 'tree', type: 'array', title: '树状数组 c[i]' },
      { id: 'note', type: 'text', title: 'lowbit 分解' }
    ],
    pseudocode: [
      '// c[i] 管辖长度为 lowbit(i) = i & -i 的区间 (i-lowbit(i), i]',
      'update(i, v):                 // 单点加',
      '    while i <= n:',
      '        c[i] += v',
      '        i += lowbit(i)        // 沿"更新树"向上跳',
      'query(i):                     // 前缀和',
      '    s = 0',
      '    while i > 0:',
      '        s += c[i]',
      '        i -= lowbit(i)        // 沿"查询树"向下跳',
      '    return s'
    ],
    presets: [
      { id: 'upd', label: '单点更新 a[3] += 5', desc: '展示 i += lowbit(i) 的跳跃链', data: () => ({ arr: [1, 3, 5, 7, 9, 11, 13, 15], idx: 3, val: 5 }) },
      { id: 'q', label: '前缀和 query(7)', desc: '展示 i -= lowbit(i) 的跳跃链', data: () => ({ arr: [1, 3, 5, 7, 9, 11, 13, 15], idx: 7, val: 0, queryOnly: true }) }
    ],
    run(input) {
      const a = input.arr || [1, 3, 5, 7, 9, 11, 13, 15];
      const n = a.length;
      const c = new Array(n + 1).fill(0);
      for (let i = 1; i <= n; i++) for (let j = i; j > 0; j -= j & -j) { }
      a.forEach((v, i) => { for (let j = i + 1; j <= n; j += j & -j) c[j] += v; });
      const lowbit = x => x & -x;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const nodes = [], edges = [];
      // 两行布局：上排是原数组下标，下排 c 数组
      for (let i = 1; i <= n; i++) {
        nodes.push({ id: 'a' + i, label: String(a[i - 1]), key: i, ord: i, x: 90 + (i - 1) * 78, y: 150 });
        nodes.push({ id: 'c' + i, label: String(c[i]), key: i, ord: i, x: 90 + (i - 1) * 78, y: 330 });
        edges.push({ id: 'v' + i, source: 'a' + i, target: 'c' + i });
      }
      b.nodes = nodes; b.edges = edges;
      const arrCmd = (hi) => C.array('tree', c.slice(1), hi);
      b.step('树状数组把前缀和"分摊"到 ' + n + ' 个格子里：`c[i]` 管辖长度恰好是 `lowbit(i)` 的一段区间。上排是原数组，下排是 c 数组。', [
        C.text('note', ['lowbit(i) = i & -i', n + ' 个元素']), arrCmd([])
      ], { line: 1 });

      if (!input.queryOnly) {
        const idx = input.idx, val = input.val;
        b.step('**单点更新 a[' + idx + '] += ' + val + '**。所有"管辖区间包含下标 ' + idx + '"的 c 都要更新。', [], { line: 2, vars: [{ name: 'i', value: idx }], milestone: '开始更新 i=' + idx, stage: true });
        let i = idx;
        const chain = [];
        while (i <= n) {
          chain.push(i);
          b.step('`i = ' + i + '`，`lowbit = ' + lowbit(i) + '` → c[' + i + '] += ' + val + '，然后 `i += lowbit(i)` = ' + (i + lowbit(i)) + '。', [
            C.badge('c' + i, 'lb', lowbit(i), true),
            C.state('c' + i, 'active')
          ], { line: 5, vars: [{ name: 'i', value: i }, { name: 'lowbit', value: lowbit(i) }] });
          c[i] += val;
          const cm = [C.setLabel('c' + i, String(c[i])), arrCmd([i - 1])];
          b.step('c[' + i + '] 更新为 ' + c[i] + '。', cm, { line: 4 });
          i += lowbit(i);
        }
        b.step('更新链结束（i 越界）。共修改 ' + chain.length + ' 个格子 → **单点更新 O(log n)**。', [
          arrCmd([])
        ].concat(chain.map(k => C.state('c' + k, 'path'))), { line: 5, milestone: '更新完成，访问 ' + chain.length + ' 个结点' });
      }

      const qidx = input.queryOnly ? input.idx : n;
      b.step('**前缀和 query(' + qidx + ')**：从 i 出发，每次 `i -= lowbit(i)`，把途经的 c 累加就是 a[1..' + qidx + '] 的和。', [], { line: 6, vars: [{ name: 'i', value: qidx }], milestone: '开始查询 i=' + qidx, stage: true });
      let i2 = qidx, sum = 0;
      const chain2 = [];
      while (i2 > 0) {
        chain2.push(i2);
        b.step('累加 c[' + i2 + '] = ' + c[i2] + '（它管辖下标 (' + (i2 - lowbit(i2)) + ', ' + i2 + ']），然后 `i -= lowbit(i)` → ' + (i2 - lowbit(i2)) + '。', [
          C.state('c' + i2, 'path'), C.badge('c' + i2, 'lb', lowbit(i2), true), C.state('a' + i2, 'visited')
        ], { line: 10, vars: [{ name: 'i', value: i2 }, { name: 'sum', value: sum + c[i2] }] });
        sum += c[i2];
        i2 -= lowbit(i2);
      }
      b.step('前缀和 = **' + sum + '**，只访问了 ' + chain2.length + ' 个结点（' + chain2.join(' → ') + '）→ **查询 O(log n)**。对比朴素前缀和数组：查询 O(1) 但更新 O(n)，树状数组把两者都压到了 O(log n)。', [], { line: 10, milestone: '答案 = ' + sum });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * LCA 倍增
   * ============================================================ */
  TGV.register({
    id: 'lca_binary', name: '最近公共祖先 · 倍增法', category: '树 · 最近公共祖先',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'up', type: 'table', title: '倍增表 fa[u][k]', columns: [{ key: 'p1', label: '2^0' }, { key: 'p2', label: '2^1' }, { key: 'p3', label: '2^2' }] }],
    pseudocode: [
      '// fa[u][k] 表示 u 向上跳 2^k 步到达的祖先',
      'dfs(u, p, d): dep[u] = d; fa[u][0] = p; for k: fa[u][k] = fa[fa[u][k-1]][k-1]',
      'lca(u, v):',
      '    if dep[u] < dep[v]: swap(u, v)',
      '    for k = K down to 0:',
      '        if dep[u] - 2^k >= dep[v]: u = fa[u][k]    // ① 深度对齐',
      '    if u == v: return u',
      '    for k = K down to 0:',
      '        if fa[u][k] != fa[v][k]: u = fa[u][k]; v = fa[v][k]  // ② 同步上跳',
      '    return fa[u][0]'
    ],
    presets: [
      { id: 'p1', label: '标准树：LCA(7, 8)', desc: '先对齐深度，再同步上跳', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [5, 9]], u: 7, v: 8 }) },
      { id: 'p2', label: '父子关系：LCA(4, 8)', desc: '对齐后一方就是答案', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [5, 9]], u: 4, v: 8 }) },
      { id: 'p3', label: '深树：LCA(9, 7)', desc: '跨越根的两个分支', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [5, 9]], u: 9, v: 7 }) }
    ],
    run(input) {
      const edgesIn = input.edges || [];
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ids = new Set();
      edgesIn.forEach(([p, c]) => { ids.add(p); ids.add(c); });
      const nodes = [...ids].map(v => ({ id: 'n' + v, label: String(v), key: v, ord: v }));
      const edges = edgesIn.map(([p, c]) => ({ id: 'n' + p + '>n' + c, source: 'n' + p, target: 'n' + c }));
      b.nodes = nodes; b.edges = edges;
      const adj = {}, dep = {}, fa = {}, up = {};
      nodes.forEach(n => { adj[n.label] = []; fa[n.label] = {}; });
      edgesIn.forEach(([p, c]) => { adj[p].push(c); adj[c].push(p); });
      const root = input.start != null ? input.start : 1;
      const K = Math.max(3, Math.min(6, Math.ceil(Math.log2(nodes.length + 1))));
      (function dfs(u, p, d) {
        dep[u] = d; fa[u][0] = p;
        for (let k = 1; k <= K; k++) fa[u][k] = fa[fa[u][k - 1]] ? fa[fa[u][k - 1]][k - 1] : 0;
        adj[u].forEach(v => { if (v !== p) dfs(v, u, d + 1); });
      })(root, 0, 0);
      const tbl = [];
      nodes.forEach(n => {
        const u = +n.label;
        tbl.push(C.table('up', n.label, 'p1', fa[u][0] || 0));
        tbl.push(C.table('up', n.label, 'p2', fa[u][1] || 0));
        tbl.push(C.table('up', n.label, 'p3', fa[u][2] || 0));
        tbl.push(C.badge(n.id, 'dep', dep[u]));
      });
      b.step('预处理：一次 DFS 求出每个结点的深度 `dep` 与 `fa[u][0]`（父亲），然后 `fa[u][k] = fa[fa[u][k-1]][k-1]` 递推出倍增表。右侧表格就是完整的 fa 表。', tbl, { line: 2 });
      b.step('倍增表建好后，任意两个点的 LCA 只需 O(log n) 次跳跃。查询：**LCA(' + input.u + ', ' + input.v + ')**。', [], { line: 3, milestone: '查询 LCA(' + input.u + ',' + input.v + ')', stage: true });
      let u = input.u, v = input.v;
      b.step('初始：dep[' + u + '] = ' + dep[u] + '，dep[' + v + '] = ' + dep[v] + '。', [
        C.state('n' + u, 'active'), C.state('n' + v, 'active')
      ], { line: 4, vars: [{ name: 'u', value: u }, { name: 'v', value: v }] });
      if (dep[u] < dep[v]) {
        const t = u; u = v; v = t;
        b.step('交换两者，保证 u 更深：现在 u = ' + u + '，v = ' + v + '。', [], { line: 4 });
      }
      // 对齐
      for (let k = K; k >= 0; k--) {
        if (fa[u][k] && dep[u] - (1 << k) >= dep[v]) {
          b.step('u 比 v 深 ' + (dep[u] - dep[v]) + ' 层，尝试跳 2^' + k + ' = ' + (1 << k) + ' 步：跳到 **' + fa[u][k] + '**（仍不比 v 浅）。', [
            C.arc('jump' + k, 'n' + u, 'n' + fa[u][k], { color: '#8B5CF6', label: '2^' + k })
          ], { line: 6, milestone: '深度对齐：' + u + ' → ' + fa[u][k], stage: true });
          C.clearArc('jump' + k);
          u = fa[u][k];
          b.step('u 现在位于 ' + u + '，深度 ' + dep[u] + '。', [C.state('n' + u, 'active')], { line: 6 });
        }
      }
      if (u === v) {
        b.step('对齐后 u == v，说明 **LCA = ' + u + '**（其中一个是另一个的祖先）。', [C.state('n' + u, 'path')], { line: 7, milestone: '答案 = ' + u });
        return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
      }
      b.step('深度已对齐，但 u ≠ v。现在**从大到小同步上跳**，只要 2^k 祖先不同就一起跳，最终停在 LCA 的正下方。', [], { line: 8 });
      for (let k = K; k >= 0; k--) {
        if (fa[u][k] !== fa[v][k]) {
          b.step('2^' + k + ' 祖先不同（' + (fa[u][k] || '根外') + ' vs ' + (fa[v][k] || '根外') + '）→ 两者同时跳：u = ' + fa[u][k] + '，v = ' + fa[v][k] + '。', [
            C.arc('ju', 'n' + u, 'n' + fa[u][k], { color: '#8B5CF6', label: '2^' + k }),
            C.arc('jv', 'n' + v, 'n' + fa[v][k], { color: '#0EA5E9', label: '2^' + k })
          ], { line: 9, milestone: '同步上跳 2^' + k, stage: true });
          u = fa[u][k]; v = fa[v][k];
        }
      }
      const ans = fa[u][0];
      b.step('此时 u = ' + u + '、v = ' + v + ' 是 LCA 的两个不同孩子，答案就是它们的父亲：**LCA = ' + ans + '**。', [
        C.clearArcs('j'), C.state('n' + ans, 'path'), C.state('n' + u, 'visited'), C.state('n' + v, 'visited')
      ], { line: 10, milestone: '答案 = ' + ans });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 树的直径（两次 BFS）
   * ============================================================ */
  TGV.register({
    id: 'tree_diameter', name: '树的直径 · 两次 BFS 端点搜索', category: '树 · 树的性质',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'q', type: 'queue', title: 'BFS 队列' }],
    pseudocode: [
      '// 树上任意两点间最长路径称为"直径"',
      'diameter(T):',
      '    s = BFS(任意点) 返回的最远点',
      '    (t, d) = BFS(s) 返回的最远点与其距离',
      '    return (s, t, d)      // s-t 就是一条直径',
      '// 正确性：树上从任意点出发最远的点，一定是某条直径的端点'
    ],
    presets: [
      { id: 'p1', label: '标准树：两次 BFS', desc: '从 1 出发找到 9，再从 9 找到 4', data: () => ({ edges: [[1, 2], [1, 3], [2, 4], [2, 5], [5, 6], [5, 7], [3, 8], [8, 9]], start: 1 }) },
      { id: 'p2', label: '链状树', desc: '直径就是两端', data: () => ({ edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]], start: 3 }) }
    ],
    run(input) {
      const edgesIn = input.edges || [];
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ids = new Set();
      edgesIn.forEach(([p, c]) => { ids.add(p); ids.add(c); });
      const nodes = [...ids].map(v => ({ id: 'n' + v, label: String(v), key: v, ord: v }));
      const edges = edgesIn.map(([p, c]) => ({ id: 'n' + p + '>n' + c, source: 'n' + p, target: 'n' + c }));
      b.nodes = nodes; b.edges = edges;
      const adj = {};
      nodes.forEach(n => adj[n.label] = []);
      edgesIn.forEach(([p, c]) => { adj[p].push(c); adj[c].push(p); });
      const ekey = {};
      edgesIn.forEach(([p, c]) => { ekey[p + '-' + c] = 'n' + p + '>n' + c; ekey[c + '-' + p] = 'n' + p + '>n' + c; });

      const bfs = (s, tag) => {
        const dist = {}, par = {};
        dist[s] = 0; par[s] = null;
        const q = [s];
        b.step('**第 ' + tag + ' 次 BFS**：从 ' + s + ' 出发，队列初始化为 [' + s + ']。', [C.setQ('q', [{ label: String(s) }]), C.state('n' + s, 'frontier')], { line: 3 });
        while (q.length) {
          const u = q.shift();
          b.step('弹出 ' + u + '（dist = ' + dist[u] + '），扩展它的邻居。', [C.q('q', 'pop_front'), C.state('n' + u, 'visited')], { line: 3 });
          adj[u].forEach(v => {
            if (dist[v] !== undefined) return;
            dist[v] = dist[u] + 1; par[v] = u;
            q.push(v);
            b.step('邻居 ' + v + ' 首次访问，dist[' + v + '] = ' + dist[v] + '，入队。', [
              C.q('q', 'push', [{ label: String(v) }]), C.badge('n' + v, 'd', dist[v], true)
            ], { line: 3 });
          });
        }
        let far = s;
        Object.keys(dist).forEach(k => { if (dist[k] > dist[far]) far = +k; });
        b.step('BFS 结束。距离 ' + s + ' 最远的结点是 **' + far + '**，距离 ' + dist[far] + '。', [
          C.state('n' + far, 'path')
        ], { line: 3, milestone: '找到端点 ' + far + '（距离 ' + dist[far] + '）' });
        return { far: +far, dist, par };
      };

      b.step('树的直径（最长路径）有一个漂亮结论：**从任意点出发 BFS 到的最远点，一定是某条直径的端点**。因此只需两次 BFS。', [], { line: 1 });
      const r1 = bfs(input.start, '一');
      // 清空标记
      const clr = [];
      nodes.forEach(n => clr.push(C.state(n.id, 'default'), C.badge(n.id, 'd', null)));
      b.step('清空第一轮的距离标记，准备从端点 ' + r1.far + ' 再跑一次。', clr, { line: 4 });
      const r2 = bfs(r1.far, '二');
      // 回溯路径
      const pathKeys = [];
      let cur = r2.far;
      while (cur !== null && cur !== undefined) { pathKeys.push(cur); cur = r2.par[cur]; }
      pathKeys.reverse();
      const cm = [];
      for (let i = 0; i + 1 < pathKeys.length; i++) {
        const a = pathKeys[i], c = pathKeys[i + 1];
        if (ekey[a + '-' + c]) cm.push(C.edge(ekey[a + '-' + c], 'path'));
        cm.push(C.state('n' + a, 'path'));
      }
      cm.push(C.state('n' + pathKeys[pathKeys.length - 1], 'path'));
      b.step('回溯前驱指针得到直径路径：**' + pathKeys.join(' → ') + '**，长度为 **' + r2.dist[r2.far] + '**。', cm, { line: 5, milestone: '直径长度 = ' + r2.dist[r2.far] });
      b.step('两次 BFS 的复杂度都是 O(n)，远优于对每对点求距离的 O(n²)~O(n³)。树 DP 做法（维护向下最长链 d1 与次长链 d2）也能一次 DFS 求出答案。', [], { line: 6, milestone: '完成' });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

})();
