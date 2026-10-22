/* ============================================================
 * 第一卷 · T2 自平衡搜索树 / Treap / 笛卡尔树 / 替罪羊树
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;
  const Lib = TGV.TreeLib;

  /* ---------- 通用二叉树工具（带父指针） ---------- */
  function ND(key, extra) {
    return Object.assign({ id: String(key), key, left: null, right: null, p: null, h: 1 }, extra || {});
  }
  const H = u => (u ? u.h : 0);
  const updH = u => { u.h = 1 + Math.max(H(u.left), H(u.right)); };
  const bfOf = u => H(u.left) - H(u.right);

  function diffEdges(prev, cur, cmds) {
    Object.keys(prev).forEach(id => { if (!cur[id]) cmds.push(C.removeEdge(id)); });
    Object.keys(cur).forEach(id => { if (!prev[id]) cmds.push(C.addEdge(id, cur[id].source, cur[id].target)); });
    return cur;
  }

  function Ctx() {
    this.root = null;
    this.edges = {};
    this.nodes = {};
  }
  Ctx.prototype.add = function (k, extra, cmds) {
    const n = ND(k, extra);
    this.nodes[n.id] = n;
    if (cmds) cmds.push(C.addNode(n.id, n.id, { key: n.key, ord: n.key }));
    return n;
  };
  /* 由全部已知结点的 left/right 指针重建边集（可用于递归中途的“悬空子树”） */
  Ctx.prototype.allEdges = function () {
    const set = {};
    const self = this;
    Object.keys(this.nodes).forEach(id => {
      const u = self.nodes[id];
      if (!u) return;
      [u.left, u.right].forEach(c => {
        if (!c) return;
        const eid = Lib.eid(u.id, c.id);
        set[eid] = { id: eid, source: u.id, target: c.id };
      });
    });
    return set;
  };
  Ctx.prototype.sync = function (cmds) { this.edges = diffEdges(this.edges, this.allEdges(), cmds); };
  Ctx.prototype.badges = function (cmds) {
    const self = this;
    (function dfs(u) {
      if (!u) return;
      const bf = bfOf(u);
      cmds.push(...C.badges(u.id, { h: H(u), bf: (bf > 0 ? '+' : '') + bf }));
      dfs(u.left); dfs(u.right);
    })(self.root);
  };
  Ctx.prototype.rotateLeft = function (x) {
    const y = x.right, T2 = y.left, p = x.p;
    x.right = T2; if (T2) T2.p = x;
    y.left = x; x.p = y;
    y.p = p;
    if (!p) this.root = y; else if (p.left === x) p.left = y; else p.right = y;
    updH(x); updH(y);
    return y;
  };
  Ctx.prototype.rotateRight = function (x) {
    const y = x.left, T2 = y.right, p = x.p;
    x.left = T2; if (T2) T2.p = x;
    y.right = x; x.p = y;
    y.p = p;
    if (!p) this.root = y; else if (p.left === x) p.left = y; else p.right = y;
    updH(x); updH(y);
    return y;
  };

  function bstInsertRaw(root, key) {
    const n = ND(key);
    if (!root) return { root: n, path: [] };
    let cur = root, path = [];
    while (true) {
      path.push(cur);
      if (key < cur.key) { if (!cur.left) { cur.left = n; n.p = cur; break; } cur = cur.left; }
      else { if (!cur.right) { cur.right = n; n.p = cur; break; } cur = cur.right; }
    }
    return { root, path };
  }

  function findNode(root, k) {
    let u = root;
    while (u && u.key !== k) u = k < u.key ? u.left : u.right;
    return u;
  }

  function collectKeys(u, out) {
    out = out || [];
    if (!u) return out;
    collectKeys(u.left, out);
    out.push(u.key);
    collectKeys(u.right, out);
    return out;
  }

  function wrap(b) { return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels }; }

  /* ============================================================
   * AVL 树插入与四种旋转
   * ============================================================ */
  TGV.register({
    id: 'avl_insert', name: 'AVL 平衡树 · 插入与四种旋转', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'watch', type: 'table', title: '平衡因子监视', columns: [{ key: 'h', label: 'height' }, { key: 'bf', label: 'BF' }] }],
    pseudocode: [
      '// AVL：任意结点 |BF| ≤ 1，BF = h(左) - h(右)',
      'insert(root, key):',
      '    // 1) 按 BST 规则下降到空位插入新结点',
      '    // 2) 沿父链向上回溯，更新高度 h',
      '    u = parent; while u != null:',
      '        updH(u); bf = h(u.left) - h(u.right)',
      '        if bf > 1  and key < u.left.key:  return rotateRight(u)   // LL',
      '        if bf < -1 and key > u.right.key: return rotateLeft(u)    // RR',
      '        if bf > 1  and key > u.left.key:  rotateLeft(u.left); return rotateRight(u)   // LR',
      '        if bf < -1 and key < u.right.key: rotateRight(u.right); return rotateLeft(u)  // RL',
      '        u = u.p',
      'rotateRight(y): x = y.left; y.left = x.right; x.right = y; return x'
    ],
    presets: [
      { id: 'll', label: '① LL 型 → 右旋', desc: '插入 10 使根 +2 失衡，左左共线，单次右旋', data: () => ({ base: [30, 20], insert: 10 }) },
      { id: 'rr', label: '② RR 型 → 左旋', desc: '插入 30 触发右右共线，单次左旋', data: () => ({ base: [10, 20], insert: 30 }) },
      { id: 'lr', label: '③ LR 型 → 先左后右双旋', desc: '插入 20 形成折线，需要两次旋转', data: () => ({ base: [30, 10], insert: 20 }) },
      { id: 'rl', label: '④ RL 型 → 先右后左双旋', desc: '插入 20 形成反向折线', data: () => ({ base: [10, 30], insert: 20 }) },
      { id: 'chain', label: '⑤ 连续插入触发多次旋转', desc: '10,20,30,40,50,25 依次插入，观察旋转链', data: () => ({ chain: [10, 20, 30, 40, 50, 25] }) }
    ],
    run(input) {
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ctx = new Ctx();

      const insertOne = (key) => {
        b.step('**插入 ' + key + '**：先按 BST 规则一路比较，找到空位挂上新叶子。', [], { line: 3, vars: [{ name: 'key', value: key }], stage: true });
        if (!ctx.root) {
          ctx.add(key, {}, []);
          const n = ctx.nodes[key];
          ctx.root = n;
          const cm = [C.addNode(n.id, n.id, { key: n.key, ord: n.key })];
          cm.push(...C.badges(n.id, { h: 1, bf: '0' }));
          cm.push(C.state(n.id, 'active'));
          b.step('空树 → ' + key + ' 直接成为根结点，高度 h=1，BF=0。', cm, { line: 3, milestone: '建根 ' + key });
          return;
        }
        let cur = ctx.root;
        const path = [];
        let guard = 0;
        while (cur && guard++ < 60) {
          path.push(cur);
          const goLeft = key < cur.key;
          b.step('比较 `' + key + '` 与 `' + cur.key + '`，向' + (goLeft ? '左' : '右') + '下降。', [
            C.state(cur.id, 'active')
          ], { line: 3, vars: [{ name: 'key', value: key }, { name: 'u', value: cur.key }] });
          const next = goLeft ? cur.left : cur.right;
          if (!next) break;
          cur = next;
        }
        const parent = path[path.length - 1];
        ctx.add(key, {}, []);
        const n = ctx.nodes[key];
        n.p = parent;
        if (key < parent.key) parent.left = n; else parent.right = n;
        const cm = [C.addNode(n.id, n.id, { key: n.key, ord: n.key })];
        b.step('把 ' + key + ' 挂到 ' + parent.key + ' 的' + (key < parent.key ? '左' : '右') + '侧。此时它的父链上可能已经出现失衡。', cm, { line: 4, milestone: '挂载新结点 ' + key });
        ctx.sync(cm);
        b.step('插入完成，现在**沿父链向上回溯**，逐层更新高度并检查平衡因子。', cm, { line: 5 });

        let u = parent;
        guard = 0;
        while (u && guard++ < 40) {
          updH(u);
          const bf = bfOf(u);
          const c1 = [];
          c1.push(...C.badges(u.id, { h: H(u), bf: (bf > 0 ? '+' : '') + bf }));
          c1.push(C.table('watch', u.id, 'h', H(u), true), C.table('watch', u.id, 'bf', (bf > 0 ? '+' : '') + bf, true));
          c1.push(C.state(u.id, Math.abs(bf) > 1 ? 'conflict' : 'frontier'));
          b.step('回溯到 ' + u.key + '：左高 ' + H(u.left) + '、右高 ' + H(u.right) + ' → `BF = ' + (bf > 0 ? '+' : '') + bf + '`（h=' + H(u) + '）。' +
            (Math.abs(bf) > 1 ? '**|BF| > 1，该结点失衡！**' : '仍在允许范围内（|BF| ≤ 1）。'), c1, {
            line: 6, vars: [{ name: 'u', value: u.key }, { name: 'BF', value: (bf > 0 ? '+' : '') + bf }]
          });

          let newSub = u;
          if (bf > 1) {
            const l = u.left;
            if (key < l.key) {
              b.step('**LL 型**：失衡发生在左子树的左侧（' + key + ' < ' + l.key + '）。解法：对 ' + u.key + ' 执行一次**右旋**，' + l.key + ' 上升为子树根。', [
                C.state(u.id, 'conflict'), C.state(l.id, 'active')
              ], { line: 7, milestone: 'LL 失衡 → 右旋 ' + u.key, stage: true });
              newSub = ctx.rotateRight(u);
              const cm2 = [C.state(l.id, 'path')];
              ctx.sync(cm2);
              ctx.badges(cm2);
              b.step('右旋完成：' + l.key + ' 成为子树新根，' + u.key + ' 变为其右孩子，' + l.key + ' 的原右子树改挂到 ' + u.key + ' 的左侧。**中序序列不变，高度恢复平衡**。', cm2, { line: 12 });
            } else {
              const lr = l.right;
              b.step('**LR 型**：失衡点在左子树的右侧（' + key + ' > ' + l.key + '），是折线结构。第一步：先对左孩子 ' + l.key + ' 执行**左旋**，把它转成 LL 型。', [
                C.state(u.id, 'conflict'), C.state(l.id, 'active'), C.state(lr.id, 'active')
              ], { line: 9, milestone: 'LR：第一次左旋 ' + l.key, stage: true });
              ctx.rotateLeft(l);
              const cm1 = [];
              ctx.sync(cm1);
              ctx.badges(cm1);
              b.step('第一次旋转完成，现在 ' + lr.key + ' 是 ' + u.key + ' 的左孩子，结构已转为共线。', cm1, { line: 9 });
              b.step('第二步：对 ' + u.key + ' 执行**右旋**，' + lr.key + ' 上升为子树根。', [C.state(u.id, 'active'), C.state(lr.id, 'path')], { line: 9, milestone: 'LR：第二次右旋 ' + u.key, stage: true });
              newSub = ctx.rotateRight(u);
              const cm2 = [];
              ctx.sync(cm2);
              ctx.badges(cm2);
              b.step('LR 双旋完成，三层结构被压平为一层根 + 两个孩子。', cm2, { line: 9 });
            }
          } else if (bf < -1) {
            const r = u.right;
            if (key > r.key) {
              b.step('**RR 型**：失衡发生在右子树的右侧（' + key + ' > ' + r.key + '）。解法：对 ' + u.key + ' 执行一次**左旋**，' + r.key + ' 上升为子树根。', [
                C.state(u.id, 'conflict'), C.state(r.id, 'active')
              ], { line: 8, milestone: 'RR 失衡 → 左旋 ' + u.key, stage: true });
              newSub = ctx.rotateLeft(u);
              const cm2 = [C.state(r.id, 'path')];
              ctx.sync(cm2);
              ctx.badges(cm2);
              b.step('左旋完成：' + r.key + ' 成为子树新根，' + u.key + ' 变为其左孩子，' + r.key + ' 的原左子树改挂到 ' + u.key + ' 右侧。', cm2, { line: 8 });
            } else {
              const rl = r.left;
              b.step('**RL 型**：失衡点在右子树的左侧（' + key + ' < ' + r.key + '）。第一步：先对右孩子 ' + r.key + ' 执行**右旋**，转成 RR 型。', [
                C.state(u.id, 'conflict'), C.state(r.id, 'active'), C.state(rl.id, 'active')
              ], { line: 10, milestone: 'RL：第一次右旋 ' + r.key, stage: true });
              ctx.rotateRight(r);
              const cm1 = [];
              ctx.sync(cm1);
              ctx.badges(cm1);
              b.step('第一次旋转完成，' + rl.key + ' 成为 ' + u.key + ' 的右孩子。', cm1, { line: 10 });
              b.step('第二步：对 ' + u.key + ' 执行**左旋**，' + rl.key + ' 上升。', [C.state(u.id, 'active'), C.state(rl.id, 'path')], { line: 10, milestone: 'RL：第二次左旋 ' + u.key, stage: true });
              newSub = ctx.rotateLeft(u);
              const cm2 = [];
              ctx.sync(cm2);
              ctx.badges(cm2);
              b.step('RL 双旋完成。', cm2, { line: 10 });
            }
          }
          u = newSub.p;
        }
        const fin = [];
        ctx.badges(fin);
        Object.keys(ctx.nodes).forEach(id => fin.push(C.state(id, 'default')));
        b.step('回溯到根，全树 |BF| ≤ 1。AVL 性质恢复，树高维持 O(log n)。', fin, { line: 5, milestone: '插入 ' + key + ' 完成' });
      };

      if (input.chain) {
        b.step('连续插入 ' + input.chain.join(', ') + '，每一步都会检查并修复失衡，最终得到严格平衡的 AVL 树。', [], { line: 1 });
        input.chain.forEach(k => insertOne(k));
        b.step('**全部插入完成**。最终树高 = ' + H(ctx.root) + '，结点数 = ' + input.chain.length + '。无论插入顺序如何，AVL 都能把高度压到 ⌊1.44·log₂n⌋ 附近。', [], { line: 1, milestone: '构建完成' });
      } else {
        const base = input.base || [];
        base.forEach(k => { const r = bstInsertRaw(ctx.root, k); ctx.root = r.root; });
        ctx.nodes = {};
        (function collect(u) { if (!u) return; ctx.nodes[u.id] = u; collect(u.left); collect(u.right); })(ctx.root);
        ctx.edges = ctx.allEdges();
        (function fix(u) { if (!u) return; fix(u.left); fix(u.right); updH(u); })(ctx.root);
        const initNodes = [];
        (function collect(u) {
          if (!u) return;
          initNodes.push({ id: u.id, label: u.id, key: u.key, ord: u.key });
          collect(u.left); collect(u.right);
        })(ctx.root);
        b.nodes = initNodes;
        b.edges = Object.keys(ctx.edges).map(k => ctx.edges[k]);
        const ib = [];
        ctx.badges(ib);
        b.step('初始 AVL 树已就绪（' + base.join(', ') + ' 插入后的平衡结构）。每个结点上方显示 `h`（高度）与 `BF`（平衡因子）。', ib, { line: 1 });
        insertOne(input.insert != null ? input.insert : 10);
      }
      return wrap(b);
    }
  });

  /* ============================================================
   * 红黑树插入修复
   * ============================================================ */
  const RED = { fill: '#FEE2E2', stroke: '#DC2626', text: '#991B1B' };
  const BLACK = { fill: '#334155', stroke: '#0F172A', text: '#FFFFFF' };

  TGV.register({
    id: 'rbt_insert', name: '红黑树 · 插入修复（Case 1/2/3）', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'note', type: 'text', title: '修复 Case 判定' }],
    pseudocode: [
      '// 性质：根黑、红结点的孩子必黑、任一路径黑高相同',
      'insert(key): z = BST_insert(key); z.color = RED; fixup(z)',
      'fixup(z):',
      '    while z.p.color == RED:',
      '        u = uncle(z)',
      '        if u.color == RED:              // Case 1：叔红 → 变色上溢',
      '            z.p.color = BLACK; u.color = BLACK',
      '            z.p.p.color = RED; z = z.p.p',
      '        else:',
      '            if z 是折线: rotate(z.p); z = z.p   // Case 2：转共线',
      '            z.p.color = BLACK; z.p.p.color = RED',
      '            rotate(z.p.p)                        // Case 3：旋转终止',
      '    root.color = BLACK'
    ],
    presets: [
      { id: 'case3', label: '共线 Case 3 → 单旋 + 变色', desc: '10,20,30：叔为黑且共线', data: () => ({ seq: [10, 20, 30] }) },
      { id: 'case2', label: '折线 Case 2 → 转共线再 Case 3', desc: '10,30,20：先旋转转共线', data: () => ({ seq: [10, 30, 20] }) },
      { id: 'case1', label: '叔红 Case 1 → 连续变色上溢', desc: '50,30,70,20,40,60,80,10：两次上溢', data: () => ({ seq: [50, 30, 70, 20, 40, 60, 80, 10] }) }
    ],
    run(input) {
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ctx = new Ctx();
      const paint = (n, cmds) => {
        cmds.push(C.style(n.id, n.red ? RED : BLACK), C.badge(n.id, 'c', n.red ? 'R' : 'B'));
      };
      const paintAll = (cmds) => { Object.keys(ctx.nodes).forEach(id => { const n = ctx.nodes[id]; if (n) paint(n, cmds); }); };
      const grand = n => (n.p ? n.p.p : null);
      const uncle = n => {
        const g = grand(n);
        if (!g || !n.p) return null;
        return n.p === g.left ? g.right : g.left;
      };

      input.seq.forEach(key => {
        b.step('**插入 ' + key + '**：先按 BST 规则找到位置，新结点一律染成**红色**（红色不改变黑高，是最"便宜"的颜色）。', [], { line: 2, vars: [{ name: 'key', value: key }], stage: true });
        if (!ctx.root) {
          ctx.add(key, { red: false }, []);
          const n = ctx.nodes[key];
          ctx.root = n;
          const cm = [C.addNode(n.id, n.id, { key: n.key, ord: n.key })];
          paint(n, cm);
          ctx.badges(cm);
          b.step('空树插入 → ' + key + ' 成为根。**根必须是黑色**，所以直接染黑。', cm, { line: 13, milestone: '建根并染黑 ' + key });
          return;
        }
        let cur = ctx.root, path = [], guard = 0;
        while (cur && guard++ < 60) {
          path.push(cur);
          b.step('比较 `' + key + '` 与 `' + cur.key + '`，向' + (key < cur.key ? '左' : '右') + '下降。', [C.state(cur.id, 'active')], { line: 2, vars: [{ name: 'u', value: cur.key }] });
          const next = key < cur.key ? cur.left : cur.right;
          if (!next) break;
          cur = next;
        }
        const parent = path[path.length - 1];
        ctx.add(key, { red: true }, []);
        const z = ctx.nodes[key];
        z.p = parent;
        if (key < parent.key) parent.left = z; else parent.right = z;
        const cm = [C.addNode(z.id, z.id, { key: z.key, ord: z.key })];
        paint(z, cm);
        ctx.sync(cm);
        b.step('把红色结点 ' + key + ' 挂到 ' + parent.key + ' 的' + (key < parent.key ? '左' : '右') + '侧。', cm, { line: 2 });

        let node = z;
        guard = 0;
        while (node.p && node.p.red && guard++ < 30) {
          const p = node.p, g = grand(node), u = uncle(node);
          b.step('**双红冲突**：' + node.key + ' 与父结点 ' + p.key + ' 都是红色，违反"红结点的孩子必须为黑"。检查叔结点：' +
            (u ? u.key + '（' + (u.red ? '红' : '黑') + '）' : 'NIL（视为黑）') + '。', [
            C.state(node.id, 'conflict'), C.state(p.id, 'conflict')
          ], { line: 4, vars: [{ name: 'z', value: node.key }, { name: 'uncle', value: u ? u.key : 'NIL' }] });
          if (u && u.red) {
            b.step('**Case 1：叔结点为红**。解法是"变色上溢"：父与叔同时染黑，祖父染红，然后把冲突指针上移到祖父继续检查。', [
              C.state(u.id, 'active'), C.state(g.id, 'active'),
              C.text('note', ['Case 1：叔红 → 变色上溢', 'z.p.color = BLACK', 'u.color = BLACK', 'z.p.p.color = RED', 'z = z.p.p'])
            ], { line: 6, milestone: 'Case 1：叔红上溢（' + g.key + ' 变红）', stage: true });
            p.red = false; u.red = false; g.red = true;
            const c2 = [];
            paint(p, c2); paint(u, c2); paint(g, c2);
            b.step('染色完成：' + p.key + '、' + u.key + ' → 黑，' + g.key + ' → 红。双红冲突被推到了 ' + g.key + ' 与它的父结点之间。', c2, { line: 8 });
            node = g;
            continue;
          }
          const isLeft = p === g.left;
          if (isLeft && node === p.right) {
            b.step('**Case 2：叔黑且折线**（' + node.key + ' 是 ' + p.key + ' 的右孩子）。先对父结点 ' + p.key + ' 做**左旋**，把折线掰成共线，转化为 Case 3。', [
              C.state(node.id, 'active'), C.state(p.id, 'active')
            ], { line: 10, milestone: 'Case 2：折线 → 左旋转共线', stage: true });
            ctx.rotateLeft(p);
            const cm2 = [];
            ctx.sync(cm2);
            b.step('旋转后 ' + node.key + ' 上升成为 ' + g.key + ' 的左孩子，结构变为共线。注意：此时 `z` 指针要改成原来的父结点 ' + p.key + '。', cm2, { line: 10 });
            node = p;
          } else if (!isLeft && node === p.left) {
            b.step('**Case 2：叔黑且折线**（' + node.key + ' 是 ' + p.key + ' 的左孩子）。先对父结点 ' + p.key + ' 做**右旋**，转成共线。', [
              C.state(node.id, 'active'), C.state(p.id, 'active')
            ], { line: 10, milestone: 'Case 2：折线 → 右旋转共线', stage: true });
            ctx.rotateRight(p);
            const cm2 = [];
            ctx.sync(cm2);
            b.step('旋转完成，转为共线结构，`z` 指针改为 ' + p.key + '。', cm2, { line: 10 });
            node = p;
          }
          const pp = node.p, gg = grand(node);
          b.step('**Case 3：叔黑且共线**。把父结点 ' + pp.key + ' 染黑、祖父 ' + gg.key + ' 染红，然后对祖父做一次**旋转**。旋转后不再有双红冲突，修复终止。', [
            C.state(pp.id, 'active'), C.state(gg.id, 'active')
          ], { line: 11, milestone: 'Case 3：旋转 + 变色，修复终止', stage: true });
          pp.red = false; gg.red = true;
          const cm3 = [];
          paint(pp, cm3); paint(gg, cm3);
          if (gg.left === pp) ctx.rotateRight(gg); else ctx.rotateLeft(gg);
          ctx.sync(cm3);
          b.step('旋转完成，冲突消除。', cm3, { line: 12 });
          break;
        }
        if (ctx.root.red) {
          ctx.root.red = false;
          const cm4 = [];
          paint(ctx.root, cm4);
          b.step('最后确保**根结点为黑色**（性质 2）。', cm4, { line: 13 });
        }
        const fin = [];
        paintAll(fin);
        Object.keys(ctx.nodes).forEach(id => fin.push(C.state(id, 'default')));
        b.step('插入 ' + key + ' 的修复结束。红黑树靠"变色 + 至多两次旋转"消解冲突，用比 AVL 更少的旋转换来同样 O(log n) 的高度上界。', fin, { line: 13, milestone: '插入 ' + key + ' 完成' });
      });
      return wrap(b);
    }
  });

  /* ============================================================
   * Splay 伸展树
   * ============================================================ */
  TGV.register({
    id: 'splay', name: '伸展树 Splay · Zig / Zig-Zig / Zig-Zag', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'log', type: 'list', title: '旋转序列' }],
    pseudocode: [
      '// 每次访问后，把访问到的结点旋转到根（局部性原理）',
      'splay(x):',
      '    while x.p != null:',
      '        p = x.p; g = p.p',
      '        if g == null: rotate(x)                 // Zig 单旋',
      '        elif (x == p.left) == (p == g.left):',
      '            rotate(p); rotate(x)                // Zig-Zig 同向双旋',
      '        else:',
      '            rotate(x); rotate(x)                // Zig-Zag 异向双旋',
      'insert(key): bst_insert(key); splay(new_node)'
    ],
    presets: [
      { id: 'zigzig', label: 'Zig-Zig：共线结构双旋', desc: '先转父、后转自己', data: () => ({ base: [20, 10], insert: 5 }) },
      { id: 'zigzag', label: 'Zig-Zag：折线结构双旋', desc: '连转自己两次', data: () => ({ base: [20, 30], insert: 25 }) },
      { id: 'deep', label: '深链一路伸展到根', desc: '升序插入后访问最小值', data: () => ({ base: [10, 20, 30, 40, 50], insert: 5 }) }
    ],
    run(input) {
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ctx = new Ctx();
      const base = input.base || [];
      const key = input.insert;
      base.forEach(k => { const r = bstInsertRaw(ctx.root, k); ctx.root = r.root; });
      (function collect(u) { if (!u) return; ctx.nodes[u.id] = u; collect(u.left); collect(u.right); })(ctx.root);
      ctx.edges = ctx.allEdges();
      const initNodes = [];
      (function collect(u) { if (!u) return; initNodes.push({ id: u.id, label: u.id, key: u.key, ord: u.key }); collect(u.left); collect(u.right); })(ctx.root);
      b.nodes = initNodes;
      b.edges = Object.keys(ctx.edges).map(k => ctx.edges[k]);
      b.step('伸展树不存任何平衡信息，它靠**"访问即上浮"**保证均摊 O(log n)。每次操作后，被访问的结点会被一路旋转到根。', [], { line: 1 });
      b.step('初始树：' + base.join(', ') + ' 依次插入（此时是普通 BST 形态）。', [], { line: 1 });
      if (!ctx.root) return wrap(b);

      let cur = ctx.root, parent = null, guard = 0;
      b.step('**插入 ' + key + '**：标准 BST 下降。', [], { line: 10, vars: [{ name: 'key', value: key }] });
      while (cur && guard++ < 60) {
        b.step('比较 ' + key + ' 与 ' + cur.key + '，向' + (key < cur.key ? '左' : '右') + '。', [C.state(cur.id, 'active')], { line: 10 });
        parent = cur;
        const next = key < cur.key ? cur.left : cur.right;
        if (!next) break;
        cur = next;
      }
      ctx.add(key, {}, []);
      const z = ctx.nodes[key];
      z.p = parent;
      if (parent) { if (key < parent.key) parent.left = z; else parent.right = z; }
      else ctx.root = z;
      const cm = [C.addNode(z.id, z.id, { key: z.key, ord: z.key }), C.state(z.id, 'active')];
      ctx.sync(cm);
      b.step('新结点 ' + key + ' 挂在 ' + (parent ? parent.key : '根') + ' 位置。接下来开始**伸展（Splay）**。', cm, { line: 10 });

      let x = z, guard2 = 0;
      while (x.p && guard2++ < 40) {
        const p = x.p, g = p.p;
        if (!g) {
          b.step('**Zig（单旋）**：' + x.key + ' 的父结点 ' + p.key + ' 就是根，只需旋转一次就能让 ' + x.key + ' 登顶。', [
            C.state(x.id, 'active'), C.state(p.id, 'active')
          ], { line: 5, milestone: 'Zig 单旋 → ' + key + ' 成为根', stage: true });
          if (p.left === x) ctx.rotateRight(p); else ctx.rotateLeft(p);
          const c = []; ctx.sync(c);
          c.push(C.push('log', 'Zig(' + x.key + ')'));
          b.step('旋转后 ' + x.key + ' 成为新的根。', c, { line: 5 });
          break;
        }
        const sameDir = (x === p.left) === (p === g.left);
        if (sameDir) {
          b.step('**Zig-Zig（同向双旋）**：' + x.key + ' 与父 ' + p.key + ' 相对于各自父亲方向相同（都是' + (x === p.left ? '左' : '右') + '孩子）。第一步：**先旋转父结点 ' + p.key + '**。', [
            C.state(x.id, 'active'), C.state(p.id, 'active'), C.state(g.id, 'active')
          ], { line: 7, milestone: 'Zig-Zig：先转父 ' + p.key, stage: true });
          if (p === g.left) ctx.rotateRight(g); else ctx.rotateLeft(g);
          const c1 = []; ctx.sync(c1);
          c1.push(C.push('log', 'zig-zig① ' + p.key));
          b.step('父结点 ' + p.key + ' 上升一层。第二步：**再旋转自己 ' + x.key + '**。', c1, { line: 7 });
          if (x.p && x.p.left === x) ctx.rotateRight(x.p); else if (x.p) ctx.rotateLeft(x.p);
          const c2 = []; ctx.sync(c2);
          c2.push(C.push('log', 'zig-zig② ' + x.key));
          b.step('Zig-Zig 完成，' + x.key + ' 上升两层。**注意顺序：先转父、后转自己**，这与 Zig-Zag 不同。', c2, { line: 7 });
        } else {
          b.step('**Zig-Zag（异向双旋）**：' + x.key + ' 与父 ' + p.key + ' 方向相反，构成折线。第一步：**先旋转自己 ' + x.key + '**。', [
            C.state(x.id, 'active'), C.state(p.id, 'active'), C.state(g.id, 'active')
          ], { line: 9, milestone: 'Zig-Zag：先转自己 ' + x.key, stage: true });
          if (p.left === x) ctx.rotateRight(p); else ctx.rotateLeft(p);
          const c1 = []; ctx.sync(c1);
          c1.push(C.push('log', 'zig-zag① ' + x.key));
          b.step(x.key + ' 先顶替了父结点 ' + p.key + ' 的位置。第二步：**再旋转自己一次**，继续上浮。', c1, { line: 9 });
          if (x.p && x.p.left === x) ctx.rotateRight(x.p); else if (x.p) ctx.rotateLeft(x.p);
          const c2 = []; ctx.sync(c2);
          c2.push(C.push('log', 'zig-zag② ' + x.key));
          b.step('Zig-Zag 完成，' + x.key + ' 上升两层。', c2, { line: 9 });
        }
      }
      b.step('**伸展结束**：' + key + ' 已成为根结点。势能分析保证 M 次操作的总代价是 O((M+N)log N)，即均摊 O(log N)。', [
        C.state(z.id, 'path')
      ], { line: 3, milestone: '伸展完成' });
      return wrap(b);
    }
  });

  /* ============================================================
   * Treap（旋转版）
   * ============================================================ */
  TGV.register({
    id: 'treap', name: 'Treap 树堆（旋转维护堆性质）', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'note', type: 'text', title: '双属性 (key, priority)' }],
    pseudocode: [
      '// 每个结点 = (key, priority)：key 满足 BST，priority 满足小根堆',
      'insert(u, key, pri):',
      '    if u == null: return new Node(key, pri)',
      '    if key < u.key: u.left = insert(u.left, key, pri)',
      '    else:           u.right = insert(u.right, key, pri)',
      '    if u.left and u.left.pri < u.pri:  u = rotateRight(u)   // 左孩子优先级更小 → 上浮',
      '    if u.right and u.right.pri < u.pri: u = rotateLeft(u)   // 右孩子优先级更小 → 上浮',
      '    return u'
    ],
    presets: [
      { id: 'p1', label: '优先级触发两次上浮', desc: '(50,50)(30,20)(70,60)(20,10)：20 一路转到根', data: () => ({ seq: [[50, 50], [30, 20], [70, 60], [20, 10]] }) },
      { id: 'p2', label: '随机优先级建树', desc: '7 组键值，观察堆性质逐步建立', data: () => ({ seq: [[40, 42], [20, 18], [60, 77], [10, 9], [30, 31], [50, 55], [70, 66]] }) }
    ],
    run(input) {
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ctx = new Ctx();
      const ins = (u, key, pri) => {
        if (!u) {
          ctx.add(key, { pri }, []);
          const n = ctx.nodes[key];
          const cm = [C.addNode(n.id, n.id, { key: n.key, ord: n.key }), C.badge(n.id, 'pri', pri), C.state(n.id, 'active')];
          b.step('到达空位，创建结点 `(' + key + ', pri=' + pri + ')`，新结点先作为叶子。', cm, { line: 3, vars: [{ name: 'key', value: key }, { name: 'pri', value: pri }] });
          return n;
        }
        b.step('在 ' + u.key + ' 处比较：' + key + ' ' + (key < u.key ? '<' : '>') + ' ' + u.key + '，向' + (key < u.key ? '左' : '右') + '递归。', [C.state(u.id, 'active')], { line: 4 });
        if (key < u.key) {
          const c = ins(u.left, key, pri);
          c.p = u; u.left = c;
          const cm = []; ctx.sync(cm);
          if (cm.length) b.step('回溯：把 ' + c.key + ' 接入 ' + u.key + ' 的左侧。', cm, { line: 4 });
        } else {
          const c = ins(u.right, key, pri);
          c.p = u; u.right = c;
          const cm = []; ctx.sync(cm);
          if (cm.length) b.step('回溯：把 ' + c.key + ' 接入 ' + u.key + ' 的右侧。', cm, { line: 5 });
        }
        if (u.left && u.left.pri < u.pri) {
          b.step('**堆性质被破坏**：左孩子 ' + u.left.key + ' 的优先级 ' + u.left.pri + ' 小于父结点 ' + u.key + ' 的 ' + u.pri + '。执行**右旋**把高优先级孩子转上来。', [
            C.state(u.id, 'active'), C.state(u.left.id, 'path')
          ], { line: 6, milestone: '右旋：' + u.left.key + ' 上浮', stage: true });
          const newRoot = ctx.rotateRight(u);
          const cm = []; ctx.sync(cm);
          b.step('右旋完成，' + newRoot.key + ' 成为子树根，堆性质在这一层恢复。', cm, { line: 6 });
          return newRoot;
        }
        if (u.right && u.right.pri < u.pri) {
          b.step('**堆性质被破坏**：右孩子 ' + u.right.key + ' 的优先级 ' + u.right.pri + ' 小于父结点 ' + u.key + ' 的 ' + u.pri + '。执行**左旋**。', [
            C.state(u.id, 'active'), C.state(u.right.id, 'path')
          ], { line: 7, milestone: '左旋：' + u.right.key + ' 上浮', stage: true });
          const newRoot = ctx.rotateLeft(u);
          const cm = []; ctx.sync(cm);
          b.step('左旋完成，' + newRoot.key + ' 上升。', cm, { line: 7 });
          return newRoot;
        }
        return u;
      };

      b.step('Treap = **Tree + Heap**：键值满足 BST（中序有序），随机优先级满足小根堆。随机优先级相当于给 BST 做了一次随机洗牌，期望树高 O(log n)。', [], { line: 1 });
      input.seq.forEach(([k, pr]) => {
        b.step('**插入 (' + k + ', pri=' + pr + ')**。', [], { line: 2, vars: [{ name: 'key', value: k }, { name: 'pri', value: pr }], stage: true });
        ctx.root = ins(ctx.root, k, pr);
        const fin = [];
        Object.keys(ctx.nodes).forEach(id => {
          fin.push(C.badge(id, 'pri', ctx.nodes[id].pri));
          fin.push(C.state(id, 'default'));
        });
        b.step('本轮结束。当前根为 ' + ctx.root.key + '（优先级 ' + ctx.root.pri + '，全树最小）。', fin, { line: 7, milestone: '插入 ' + k + ' 完成' });
      });
      b.step('全部插入完成。从叶到根优先级递减，树高被随机优先级"控制"住了。', [], { line: 7, milestone: '构建完成' });
      return wrap(b);
    }
  });

  /* ============================================================
   * FHQ-Treap
   * ============================================================ */
  TGV.register({
    id: 'fhq_treap', name: 'FHQ-Treap · 分裂 Split 与合并 Merge', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'note', type: 'text', title: '父子树' }],
    pseudocode: [
      '// 无旋 Treap：一切操作都由 split 与 merge 组合而成',
      'split(u, key) -> (L, R):        // L 全部 < key，R 全部 >= key',
      '    if u == null: return (null, null)',
      '    if u.key < key: (a, b) = split(u.right, key); u.right = a; return (u, b)',
      '    else:           (a, b) = split(u.left,  key); u.left  = b; return (a, u)',
      'merge(L, R) -> u:               // 要求 L 全部 < R',
      '    if L == null: return R',
      '    if R == null: return L',
      '    if L.pri > R.pri: L.right = merge(L.right, R); return L',
      '    else:             R.left  = merge(L, R.left);  return R'
    ],
    presets: [
      { id: 'split', label: '按值分裂 Split(T, 40)', desc: '把树拆成 <40 与 ≥40 两棵', data: () => ({ build: [[50, 90], [30, 70], [70, 40], [20, 20], [40, 60], [60, 30]], op: 'split', key: 40 }) },
      { id: 'insert', label: '分裂 + 合并完成插入 45', desc: 'split 后 merge 回新结点', data: () => ({ build: [[50, 90], [30, 70], [70, 40], [20, 20], [40, 60], [60, 30]], op: 'insert', key: 45, pri: 50 }) }
    ],
    run(input) {
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ctx = new Ctx();
      const built = input.build || [];
      const nodesArr = built.map(([k, p]) => ({ key: k, pri: p }));
      function buildRange(arr) {
        if (!arr.length) return null;
        let mi = 0;
        arr.forEach((n, i) => { if (n.pri > arr[mi].pri) mi = i; });
        ctx.add(arr[mi].key, { pri: arr[mi].pri }, []);
        const n = ctx.nodes[arr[mi].key];
        const l = buildRange(arr.slice(0, mi));
        const r = buildRange(arr.slice(mi + 1));
        n.left = l; n.right = r;
        if (l) l.p = n;
        if (r) r.p = n;
        return n;
      }
      ctx.root = buildRange(nodesArr);
      ctx.edges = ctx.allEdges();
      const init = [];
      (function collect(u) { if (!u) return; init.push({ id: u.id, label: u.id, key: u.key, ord: u.key }); collect(u.left); collect(u.right); })(ctx.root);
      b.nodes = init;
      b.edges = Object.keys(ctx.edges).map(k => ctx.edges[k]);
      const bd = [];
      Object.keys(ctx.nodes).forEach(id => bd.push(C.badge(id, 'pri', ctx.nodes[id].pri)));
      b.step('初始 FHQ-Treap（按优先级建成的合法笛卡尔树）。**无旋**的含义是：不靠旋转调整结构，而靠 `split` 拆树与 `merge` 拼树。', bd, { line: 1 });

      const key = input.key;
      b.step('**执行 `split(root, ' + key + ')`**：目标是拆成 L（全部 < ' + key + '）与 R（全部 ≥ ' + key + '）两棵树。', [], { line: 2, vars: [{ name: 'key', value: key }], milestone: '开始分裂 key=' + key, stage: true });
      const splitTrace = [];
      (function walk(u, k) {
        if (!u) return;
        splitTrace.push({ node: u, goRight: u.key < k });
        walk(u.key < k ? u.right : u.left, k);
      })(ctx.root, key);
      splitTrace.forEach(t => {
        const u = t.node;
        b.step('访问结点 ' + u.key + '：' + (t.goRight ? u.key + ' < ' + key + '，它归入 **L 树**，接着把它的右子树拿去继续分裂。' : u.key + ' ≥ ' + key + '，它归入 **R 树**，接着分裂它的左子树。'), [
          C.state(u.id, 'active')
        ], { line: t.goRight ? 4 : 5 });
      });
      ctx.root = buildRange(nodesArr);
      ctx.edges = ctx.allEdges();
      const splitOnce = (u, k) => {
        if (!u) return [null, null];
        if (u.key < k) { const [a, bb] = splitOnce(u.right, k); u.right = a; if (a) a.p = u; return [u, bb]; }
        const [a, bb] = splitOnce(u.left, k); u.left = bb; if (bb) bb.p = u; return [a, u];
      };
      const [L, R] = splitOnce(ctx.root, key);
      if (L) L.p = null;
      if (R) R.p = null;
      const cm = [];
      ctx.sync(cm);
      cm.push(C.text('note', ['L: ' + (L ? collectKeys(L).join(', ') : '空'), 'R: ' + (R ? collectKeys(R).join(', ') : '空')]));
      b.step('**分裂完成**：L = [' + (L ? collectKeys(L).join(', ') : '') + ']，R = [' + (R ? collectKeys(R).join(', ') : '') + ']。两棵树各自仍满足 BST 与堆性质。', cm, { line: 5, milestone: '分裂完成 L | R' });

      if (input.op === 'insert') {
        const pri = input.pri != null ? input.pri : 50;
        ctx.add(key, { pri }, []);
        const n = ctx.nodes[key];
        const c1 = [C.addNode(n.id, n.id, { key: n.key, ord: n.key }), C.badge(n.id, 'pri', pri), C.state(n.id, 'active')];
        b.step('新建结点 `(' + key + ', pri=' + pri + ')`，它自成一根。', c1, { line: 7 });
        const merge = (a, c) => {
          if (!a) return c;
          if (!c) return a;
          if (a.pri > c.pri) {
            b.step('`merge(' + a.key + ', ' + c.key + ')`：' + a.key + '(pri=' + a.pri + ') 优先级更大，当根，把 ' + c.key + ' 并入它的右子树。', [C.state(a.id, 'active')], { line: 9 });
            a.right = merge(a.right, c); if (a.right) a.right.p = a;
            return a;
          }
          b.step('`merge(' + a.key + ', ' + c.key + ')`：' + c.key + '(pri=' + c.pri + ') 优先级更大，当根，把 ' + a.key + ' 并入它的左子树。', [C.state(c.id, 'active')], { line: 10 });
          c.left = merge(a, c.left); if (c.left) c.left.p = c;
          return c;
        };
        b.step('**`merge(L, ' + key + ')`**：比较根的优先级，大者当根，另一棵树递归塞进它的子树 —— 这就是"拉链式缝合"。', [], { line: 6 });
        const m1 = merge(L, n);
        const c2 = []; ctx.sync(c2);
        b.step('第一轮合并完成。', c2, { line: 9 });
        ctx.root = merge(m1, R);
        const c3 = []; ctx.sync(c3);
        b.step('**插入完成**：' + key + ' 已就位。整个过程没有任何旋转，所以 FHQ-Treap 天然支持**可持久化**（只复制路径上的 O(log n) 个结点）。', c3, { line: 6, milestone: '插入完成' });
      }
      return wrap(b);
    }
  });

  /* ============================================================
   * 笛卡尔树（单调栈）
   * ============================================================ */
  TGV.register({
    id: 'cartesian', name: '笛卡尔树（单调栈 O(n) 建树）', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'stk', type: 'stack', title: '单调栈（维护右链）' }, { id: 'arr', type: 'array', title: '原数组（下标 / 值）' }],
    pseudocode: [
      '// 下标满足 BST，值满足小根堆',
      'stack = []',
      'for i in 1..n:',
      '    last = null',
      '    while stack not empty and a[stack.top] > a[i]:',
      '        last = stack.pop()          // 被 i 弹出的都成为 i 的左子树',
      '    node[i].left = last',
      '    if stack not empty: stack.top.right = node[i]',
      '    stack.push(i)',
      'root = stack[0]                    // 栈底即全树最小值（根）'
    ],
    presets: [
      { id: 'a', label: '经典数组 [3,1,4,1,5,9,2,6]', desc: '观察右链的弹出与接入', data: () => ({ arr: [3, 1, 4, 1, 5, 9, 2, 6] }) },
      { id: 'b', label: '单调递增数组', desc: '退化为一条右链（链状树）', data: () => ({ arr: [1, 2, 3, 4, 5] }) }
    ],
    run(input) {
      const arr = input.arr || [3, 1, 4, 1, 5, 9, 2, 6];
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      let myEdges = {};
      const nodesByPos = [];
      arr.forEach((v, i) => {
        nodesByPos.push({ id: 'i' + i, key: v, ord: i, left: null, right: null });
      });
      const syncEdges = (cmds) => {
        const cur = {};
        nodesByPos.forEach(u => {
          [u.left, u.right].forEach(c => {
            if (!c) return;
            const id = Lib.eid(u.id, c.id);
            cur[id] = { id, source: u.id, target: c.id };
          });
        });
        myEdges = diffEdges(myEdges, cur, cmds);
      };
      b.step('笛卡尔树：把**数组下标作为 BST 键**、**数组值作为堆键**，得到的树中序遍历恰好是原数组。用单调栈可以 O(n) 建成。', [
        C.array('arr', arr, [], arr.map((v, i) => 'i' + i))
      ], { line: 1 });
      b.nodes = nodesByPos.map(n => ({ id: n.id, label: String(n.key), key: n.ord, ord: n.ord }));
      const stack = [];
      arr.forEach((v, i) => {
        const n = nodesByPos[i];
        const cm = [C.addNode(n.id, String(v), { key: i, ord: i })];
        b.step('处理第 ' + (i + 1) + ' 个元素 `a[' + i + '] = ' + v + '`：先创建结点（BST 键 = 下标 ' + i + '）。', cm, { line: 3, vars: [{ name: 'i', value: i }, { name: 'a[i]', value: v }] });
        let last = null;
        const pops = [];
        while (stack.length && arr[stack[stack.length - 1]] > v) {
          last = stack.pop();
          pops.push('i' + last);
          b.step('栈顶 a[' + last + '] = ' + arr[last] + ' **大于** ' + v + '，需要弹出——它将成为新结点 ' + v + ' 的**左子树**。', [
            C.state('i' + last, 'frontier')
          ], { line: 6 });
        }
        if (last !== null) {
          n.left = nodesByPos[last];
          const c = [C.state(n.id, 'active')];
          syncEdges(c);
          b.step('把弹出的子树挂到 ' + v + ' 的左边（其根为 ' + arr[last] + '）。', c, { line: 7, milestone: 'a[' + i + ']=' + v + ' 接管左子树 ' + arr[last] });
        }
        if (stack.length) {
          const top = stack[stack.length - 1];
          nodesByPos[top].right = n;
          const c = [];
          syncEdges(c);
          b.step('栈顶 a[' + top + '] = ' + arr[top] + ' 成为新结点 ' + v + ' 的**父亲**（新结点接在它的右链上）。', c, { line: 8 });
        }
        stack.push(i);
        const c2 = [C.setQ('stk', stack.map(x => ({ label: String(arr[x]), meta: 'i' + x }))), C.state(n.id, 'visited'), C.array('arr', arr, [i])];
        pops.forEach(id => c2.push(C.state(id, 'default')));
        b.step('把下标 ' + i + ' 压栈。当前栈（底 → 顶）：' + stack.map(x => arr[x]).join(' → ') + '，值单调递增。', c2, { line: 9 });
      });
      const rootPos = stack[0];
      b.step('全部处理完毕，**栈底 ' + arr[rootPos] + ' 就是整棵树的最小值，即根结点**。它左边的元素构成左子树、右边的构成右子树。', [
        C.state('i' + rootPos, 'path')
      ], { line: 10, milestone: '建树完成，根 = ' + arr[rootPos] });
      b.edges = Object.keys(myEdges).map(k => myEdges[k]);
      return wrap(b);
    }
  });

  /* ============================================================
   * 替罪羊树
   * ============================================================ */
  TGV.register({
    id: 'scapegoat', name: '替罪羊树 · 拍平重构（Flatten & Rebuild）', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'note', type: 'text', title: 'α 权重平衡' }],
    pseudocode: [
      '// 子树大小满足 size(child) <= α * size(u)，α 常取 0.7',
      'insert(key):',
      '    u = bst_insert(key); size[all ancestors] += 1',
      '    // 从新结点向上找到第一个失衡结点（替罪羊）',
      '    scapegoat = deepest ancestor violating α-balance',
      '    if scapegoat != null:',
      '        arr = inorder(scapegoat)                 // ① 拍平成有序数组',
      '        scapegoat = build(arr, 0, n-1)           // ② 每次取中点递归重构'
    ],
    presets: [
      { id: 's1', label: '升序插入触发重构', desc: 'α=0.7，插入 60 后重构', data: () => ({ seq: [30, 20, 40, 10, 25, 35, 50, 60], alpha: 0.7 }) },
      { id: 's2', label: '连续升序多次重构', desc: '观察重构后的临时完美平衡', data: () => ({ seq: [10, 20, 30, 40, 50, 60, 70], alpha: 0.7 }) }
    ],
    run(input) {
      const seq = input.seq || [30, 20, 40, 10, 25, 35, 50, 60];
      const alpha = input.alpha || 0.7;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const ctx = new Ctx();
      const sz = u => (u ? u.size : 0);
      const upd = u => { if (u) u.size = 1 + sz(u.left) + sz(u.right); };
      const updAll = () => { (function go(u) { if (!u) return; go(u.left); go(u.right); upd(u); })(ctx.root); };
      const badges = (cmds) => { (function go(u) { if (!u) return; cmds.push(C.badge(u.id, 'sz', u.size)); go(u.left); go(u.right); })(ctx.root); };

      b.step('替罪羊树不存高度、不存颜色，只存**子树大小 size**。当某个子树的规模超过 α 比例（默认 α = 0.7）时，就把它"拍平"成数组再二分重建。', [], { line: 1 });

      seq.forEach(key => {
        b.step('**插入 ' + key + '**（BST 规则下降，沿途 size 全部 +1）。', [], { line: 3, vars: [{ name: 'key', value: key }], stage: true });
        if (!ctx.root) {
          ctx.add(key, { size: 1 }, []);
          const n = ctx.nodes[key];
          ctx.root = n;
          const cm = [C.addNode(n.id, n.id, { key: n.key, ord: n.key }), C.badge(n.id, 'sz', 1), C.state(n.id, 'active')];
          b.step('空树 → ' + key + ' 成为根。', cm, { line: 2 });
          return;
        }
        let cur = ctx.root, path = [], guard = 0;
        while (cur && guard++ < 80) {
          path.push(cur);
          b.step('比较 ' + key + ' 与 ' + cur.key + '，向' + (key < cur.key ? '左' : '右') + '。', [C.state(cur.id, 'active')], { line: 3 });
          const next = key < cur.key ? cur.left : cur.right;
          if (!next) break;
          cur = next;
        }
        const parent = path[path.length - 1];
        ctx.add(key, { size: 1 }, []);
        const n = ctx.nodes[key];
        n.p = parent;
        if (key < parent.key) parent.left = n; else parent.right = n;
        const cm = [C.addNode(n.id, n.id, { key: n.key, ord: n.key }), C.badge(n.id, 'sz', 1), C.state(n.id, 'active')];
        ctx.sync(cm);
        b.step('新叶子 ' + key + ' 挂载完成。', cm, { line: 3 });
        path.forEach(u => u.size += 1);
        const bcm = []; badges(bcm);
        b.step('沿父链把 size 全部 +1，结点角标显示其子树规模。', bcm, { line: 3 });

        let scape = null;
        for (let i = path.length - 1; i >= 0; i--) {
          const u = path[i];
          const mx = Math.max(sz(u.left), sz(u.right));
          if (mx > alpha * u.size) { scape = u; break; }
        }
        if (scape) {
          b.step('**发现替罪羊 ' + scape.key + '**：它的较重子树规模 ' + Math.max(sz(scape.left), sz(scape.right)) + ' 超过 α·size = ' + (alpha * scape.size).toFixed(1) + '，权重不再平衡。', [
            C.state(scape.id, 'conflict'),
            C.text('note', ['替罪羊 = ' + scape.key, 'size = ' + scape.size, 'max child = ' + Math.max(sz(scape.left), sz(scape.right)), '阈值 α·size = ' + (alpha * scape.size).toFixed(1)])
          ], { line: 5, milestone: '定位替罪羊 ' + scape.key, stage: true });

          const flat = collectKeys(scape);
          const hullIds = [];
          (function go(u) { if (!u) return; hullIds.push(u.id); go(u.left); go(u.right); })(scape);
          b.step('**第一步：拍平（Flatten）**。对 ' + scape.key + ' 的子树做中序遍历，得到有序数组：[' + flat.join(', ') + ']。', [
            C.hull('scape', hullIds, '#8B5CF6', '待重构子树')
          ], { line: 7, milestone: '拍平为有序数组', stage: true });

          const removed = [];
          (function go(u) { if (!u) return; removed.push(u); go(u.left); go(u.right); })(scape);
          removed.forEach(u => { u.left = null; u.right = null; });
          const cur2 = [];
          ctx.sync(cur2);
          b.step('拆散原子树的全部指针——画布上这些结点会重新排成一行，直观对应"有序数组"。', cur2, { line: 7 });

          const nodeOf = {};
          removed.forEach(u => { nodeOf[u.key] = u; });
          function rebuild(keys) {
            if (!keys.length) return null;
            const mid = Math.floor(keys.length / 2);
            const u = nodeOf[keys[mid]];
            u.left = rebuild(keys.slice(0, mid));
            u.right = rebuild(keys.slice(mid + 1));
            if (u.left) u.left.p = u;
            if (u.right) u.right.p = u;
            upd(u);
            return u;
          }
          const newRoot = rebuild(flat);
          newRoot.p = scape.p;
          if (!scape.p) ctx.root = newRoot;
          else if (scape.p.left === scape) scape.p.left = newRoot; else scape.p.right = newRoot;
          const cm2 = [];
          ctx.sync(cm2);
          ctx.badges(cm2);
          cm2.push(C.clearHull('scape'));
          b.step('**第二步：重构（Rebuild）**。每次取数组**中点**作为根，递归建左右子树，得到一棵完美平衡的 BST。', cm2, { line: 8, milestone: '取中点重构为完美平衡树' });
          updAll();
          const cm3 = []; badges(cm3);
          b.step('重构完成，替罪羊子树高度降到 ⌊log₂(n+1)⌋ 级别。**摊还代价 O(log n)**：重构一次要 Ω(size) 次插入才会再次发生。', cm3, { line: 8 });
        } else {
          b.step('没有任何祖先违反 α 平衡，无需重构。', [], { line: 5 });
        }
      });
      b.step('全部插入结束。替罪羊树的巧妙之处：**不平衡就立刻物理重构**，用摊还分析证明总代价仍是 O(n log n)。', [], { line: 8, milestone: '构建完成' });
      return wrap(b);
    }
  });

})();
