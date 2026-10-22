/* ============================================================
 * 第一卷 · 规范清单补齐（二）
 *   #10 红黑树 · 删除修复（双黑 / Double Black + 四种 Case）
 *       采用「扩展二叉树」视图：每个空孩子都长出一个 NIL 小灰点，
 *       这样"双黑"永远有一个具体的可视化载体，而不是飘在空气里。
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  const RED = { fill: '#FEE2E2', stroke: '#DC2626', text: '#991B1B' };
  const BLACK = { fill: '#334155', stroke: '#0F172A', text: '#FFFFFF' };
  const NILC = { fill: '#E2E8F0', stroke: '#94A3B8', text: '#475569' };

  /* ---------------- 红黑树（扩展二叉树 + 父指针） ---------------- */
  function RB() {
    this.root = null;
    this.nodes = {};
    this.prev = { nodes: {}, edges: {} };
    this.nilSeq = 0;
  }
  RB.prototype.mk = function (key, red) {
    const n = { id: String(key), key: +key, left: null, right: null, p: null, red: !!red, nil: false };
    this.nodes[n.id] = n;
    this.attachNil(n);
    return n;
  };
  RB.prototype.attachNil = function (n) {
    if (!n) return;
    if (!n.left) { const a = this.mkNil(n, 'L'); n.left = a; }
    if (!n.right) { const b = this.mkNil(n, 'R'); n.right = b; }
  };
  RB.prototype.mkNil = function (p, side) {
    const id = 'nil' + (++this.nilSeq);
    // 排序键：左 NIL 略小于父、右 NIL 略大于父，保证 tidyTree 摆位正确
    const ordK = p ? (p.key + (side === 'L' ? -0.5 : 0.5)) : 0;
    const n = { id, key: null, left: null, right: null, p, red: false, nil: true, ordK };
    this.nodes[id] = n;
    return n;
  };
  RB.prototype.dump = function () {
    const nodes = {}, edges = {};
    const walk = u => {
      if (!u) return;
      nodes[u.id] = u;
      if (u.left) { edges[u.id + '>' + u.left.id] = [u.id, u.left.id]; walk(u.left); }
      if (u.right) { edges[u.id + '>' + u.right.id] = [u.id, u.right.id]; walk(u.right); }
    };
    walk(this.root);
    return { nodes, edges };
  };
  /** 与上一帧快照做差量：先删边、再删点、再加点、再加边 */
  RB.prototype.sync = function (cmds) {
    const cur = this.dump(), prev = this.prev;
    Object.keys(prev.edges).forEach(id => { if (!cur.edges[id]) cmds.push(C.removeEdge(id)); });
    Object.keys(prev.nodes).forEach(id => { if (!cur.nodes[id]) cmds.push(C.removeNode(id)); });
    Object.keys(cur.nodes).forEach(id => {
      if (prev.nodes[id]) return;
      const n = cur.nodes[id];
      cmds.push(C.addNode(n.id, n.nil ? 'NIL' : String(n.key), {
        key: n.nil ? n.ordK : n.key,
        ord: n.nil ? n.ordK : n.key,
        r: n.nil ? 10 : undefined,
        nil: n.nil ? true : undefined
      }));
    });
    Object.keys(cur.edges).forEach(id => {
      if (prev.edges[id]) return;
      cmds.push(C.addEdge(id, cur.edges[id][0], cur.edges[id][1]));
      const t = cur.nodes[cur.edges[id][1]];
      if (t && t.nil) cmds.push(C.edgeColor(id, '#CBD5E1', true, 1.3));
    });
    this.prev = cur;
    return cmds;
  };
  RB.prototype.paint = function (n, cmds) {
    if (!n) return;
    if (n.nil) { cmds.push(C.style(n.id, NILC)); return; }
    cmds.push(C.style(n.id, n.red ? RED : BLACK), C.badge(n.id, 'c', n.red ? 'R' : 'B'));
  };
  RB.prototype.paintAll = function (cmds) {
    const d = this.dump();
    Object.keys(d.nodes).forEach(id => this.paint(d.nodes[id], cmds));
    return cmds;
  };
  RB.prototype.rot = function (x, dir) {
    // dir = 'L'：x 的左子树上升（右旋）；'R'：x 的右子树上升（左旋）
    const y = dir === 'L' ? x.left : x.right;
    const mid = dir === 'L' ? y.right : y.left;
    const p = x.p;
    if (dir === 'L') { x.left = mid; if (mid) mid.p = x; y.right = x; }
    else { x.right = mid; if (mid) mid.p = x; y.left = x; }
    x.p = y; y.p = p;
    if (!p) this.root = y; else if (p.left === x) p.left = y; else p.right = y;
    return y;
  };
  RB.prototype.transplant = function (u, v) {
    if (!u.p) this.root = v;
    else if (u.p.left === u) u.p.left = v;
    else u.p.right = v;
    if (v) v.p = u.p;
  };
  RB.prototype.fix = function (n) { this.attachNil(n); };
  RB.prototype.repairNil = function () {
    // 保证每个真结点两侧都有 NIL（搬动后可能出现空洞）
    const d = this.dump();
    Object.keys(d.nodes).forEach(id => { const n = d.nodes[id]; if (!n.nil) this.attachNil(n); });
  };
  RB.prototype.find = function (k) {
    let u = this.root;
    while (u && !u.nil) {
      if (k === u.key) return u;
      u = k < u.key ? u.left : u.right;
    }
    return null;
  };
  RB.prototype.insert = function (k) {
    const z = this.mk(k, true);
    if (!this.root) { this.root = z; z.red = false; return z; }
    let u = this.root;
    while (true) {
      if (k < u.key) { if (u.left.nil) { u.left = z; z.p = u; break; } u = u.left; }
      else { if (u.right.nil) { u.right = z; z.p = u; break; } u = u.right; }
    }
    // 插入修复
    let n = z, guard = 0;
    while (n.p && n.p.red && guard++ < 40) {
      const p = n.p, g = p.p;
      const isLeft = p === g.left;
      const u2 = isLeft ? g.right : g.left;
      if (u2 && u2.red) {
        p.red = false; u2.red = false; g.red = true; n = g;
      } else {
        if (isLeft ? n === p.right : n === p.left) { n = p; this.rot(n, isLeft ? 'R' : 'L'); }
        const p2 = n.p;
        p2.red = false; p2.p.red = true;
        this.rot(p2.p, isLeft ? 'L' : 'R');
      }
    }
    this.root.red = false;
    return z;
  };

  const KEYS = [30, 15, 45, 8, 22, 38, 52, 4, 12, 18, 26, 34, 42, 48, 56];

  TGV.register({
    id: 'rbt_delete', name: '红黑树 · 删除修复（双黑 + 四 Case）', category: '树 · 平衡搜索树',
    layout: 'tree', childOrder: 'key',
    compareWith: 'rbt_insert',
    panels: [
      { id: 'case', type: 'text', title: '当前 Case 判定' },
      { id: 'bh', type: 'list', title: '各路径黑高校验' }
    ],
    pseudocode: [
      '// 删除的难点：摘掉一个【黑】结点会让经过它的路径黑高 -1',
      '// 解法：让顶替它的孩子 x 额外背一重黑（"双黑"），再把这重黑往上/往兄弟处转移',
      'delete(z):',
      '    y = z; yColor = z.red                 // y 是真正被摘走的结点',
      '    if z.left 是 NIL:  x = z.right; transplant(z, z.right)',
      '    elif z.right 是 NIL: x = z.left;  transplant(z, z.left)',
      '    else:                                 // 双子：用后继 y 顶替 z',
      '        y = min(z.right); yColor = y.red; x = y.right',
      '        if y.p != z: transplant(y, y.right); y.right = z.right; y.right.p = y',
      '        transplant(z, y); y.left = z.left; y.left.p = y',
      '        y.red = z.red                     // y 继承 z 的颜色，位置换人但颜色不变',
      '    if yColor == BLACK: fixup(x)          // x 现在背着"双黑"',
      'fixup(x):',
      '    while x != root and x.color == BLACK:',
      '        w = 兄弟(x)                       // 所有 Case 都盯着兄弟 w 和它的两个孩子',
      '        if w.red:                         // Case 1：兄弟红 → 转成兄弟黑',
      '            w.red = false; x.p.red = true; 旋转(x.p); w = 兄弟(x)',
      '        if w.left 黑 and w.right 黑:       // Case 2：双侄皆黑 → 兄弟变红，双黑上移',
      '            w.red = true; x = x.p',
      '        else:',
      '            if 远侄 黑:                    // Case 3：近侄红 → 旋成 Case 4',
      '                近侄.red = false; w.red = true; 旋转(w); w = 兄弟(x)',
      '            w.red = x.p.red; x.p.red = false; 远侄.red = false   // Case 4：收工',
      '            旋转(x.p); x = root',
      '    x.red = false                         // 双黑落地，重新变回单黑'
    ],
    presets: [
      { id: 'red', label: '① 删红色叶子 · 无需修复', desc: '红结点不贡献黑高，直接摘掉即可', data: () => ({ seq: [10, 20, 30, 40, 50], del: 50 }) },
      { id: 'c1', label: '② Case 1 · 兄弟红 → 退化为 Case 2', desc: '兄弟与父互换颜色后旋转，兄弟变黑', data: () => ({ seq: [1, 2, 3, 4, 5, 6], del: 1 }) },
      { id: 'c2', label: '③ Case 2 · 双侄皆黑', desc: '兄弟染红，双黑整体上移到父结点', data: () => ({ seq: [1, 2, 3, 4, 5, 6, 7, 8, 9], del: 2 }) },
      { id: 'c3', label: '④ Case 3 · 近侄红 转 Case 4', desc: '先绕兄弟旋转，把红挪到外侧', data: () => ({ seq: [27, 1, 22, 14, 30, 2, 10, 23], del: 1 }) },
      { id: 'c4', label: '⑤ Case 4 · 远侄红 → 一次旋转收工', desc: '兄弟继承父色、父黑、远侄黑，绕父旋转', data: () => ({ seq: [10, 20, 30, 40, 50], del: 10 }) },
      { id: 'two', label: '⑥ 删双子结点 · 后继顶替', desc: '用右子树最左结点替换，继承颜色后再看是否要修复', data: () => ({ del: 30 }) }
    ],
    run(input) {
      const t = new RB();
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      b.step('红黑树删除之所以难，是因为**摘掉一个黑结点会破坏"所有路径黑高相同"**。' +
        '标准解法是让顶替它的孩子 `x` 额外背一重黑，称为**双黑（Double Black）**，然后想办法把这重黑转移出去。' +
        '为了让双黑"看得见"，这里采用**扩展二叉树视图**：每个空孩子都长出一个灰色的 NIL 小点 —— 双黑就落在它身上。', [], { line: 1 });
      b.step('先建一棵合法的红黑树（插入序列 ' + (input.seq || KEYS).join(', ') + '）。画布上灰色小点是 NIL 哨兵，' +
        '它们是"合法的黑结点"，也是双黑最常见的落点。', [], { line: 1, stage: true });
      (input.seq || KEYS).forEach(k => { t.insert(k); t.repairNil(); });
      const cm1 = t.sync([]);
      t.paintAll(cm1);
      b.step('建树完成。每个结点左上角角标是颜色（R / B）。现在执行 **delete(' + input.del + ')**。', cm1,
        { line: 2, milestone: '建树完成', stage: true });

      /* ---- 1. 定位 z ---- */
      const z = t.find(input.del);
      if (!z) {
        b.step('树里没有 ' + input.del + '，无需删除。', [], { line: 2 });
        return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
      }
      b.step('定位到待删结点 **' + input.del + '**（' + (z.red ? '红' : '黑') + '）。' +
        '先看它有几个真孩子：' + (z.left.nil && z.right.nil ? '**零个**（两个都是 NIL）' : z.left.nil || z.right.nil ? '**一个**' : '**两个**') + '。', [
        C.state(z.id, 'conflict')
      ], { line: 3, vars: [{ name: 'z', value: input.del }] });

      let y = z, yColor = z.red, x = null;
      if (z.left.nil) {
        x = z.right;
        b.step('左孩子是 NIL → 用右孩子 ' + (x.nil ? '**NIL**' : x.key) + ' 顶替 z 的位置。' +
          (x.nil ? '注意：顶替者是 NIL，如果 z 是黑的，这个 NIL 立刻就会背上双黑。' : '顶替者是一个真结点。'), [
          C.state(x.id, 'active')
        ], { line: 4 });
        t.transplant(z, z.right);
      } else if (z.right.nil) {
        x = z.left;
        b.step('右孩子是 NIL → 用左孩子 ' + (x.nil ? '**NIL**' : x.key) + ' 顶替 z 的位置。', [
          C.state(x.id, 'active')
        ], { line: 5 });
        t.transplant(z, z.left);
      } else {
        b.step('**两个孩子都是真结点**：不能直接摘。做法是找**中序后继** —— 右子树里最小的那个结点，' +
          '把它整体搬到 z 的位置（这不改变中序顺序），然后问题就变成"删掉后继原来的位置"。', [], { line: 6 });
        y = z.right;
        while (!y.left.nil) y = y.left;
        yColor = y.red;
        x = y.right;
        b.step('中序后继是 **' + y.key + '**（' + (y.red ? '红' : '黑') + '），它的右孩子是 ' +
          (x.nil ? 'NIL' : x.key) + '。**记住 y 的颜色 ' + (yColor ? '红' : '黑') +
          '** —— 后面是否需要修复，只由"被摘走的那个点的颜色"决定。', [
          C.state(y.id, 'active'), C.arc('succ', z.id, y.id, { color: '#8B5CF6', dashed: true, label: '后继' })
        ], { line: 7, milestone: '后继 = ' + y.key });
        if (y.p !== z) {
          t.transplant(y, y.right);
          b.step('后继不是 z 的直接右孩子 → 先把它从原位置摘下来，用它的右孩子 ' + (x.nil ? 'NIL' : x.key) + ' 顶替。', [], { line: 8 });
          y.right = z.right; y.right.p = y;
        }
        t.transplant(z, y);
        y.left = z.left; y.left.p = y;
        y.red = z.red;
        b.step('把后继 ' + y.key + ' 搬到 z 的位置，接管 z 的左右子树，并**继承 z 的颜色**（' + (z.red ? '红' : '黑') + '）。' +
          '这样"位置上的颜色"没变，只有被摘走的那一侧少了一个' + (yColor ? '红' : '黑') + '结点。', [
          C.state(y.id, 'path'), C.clearArc('succ')
        ], { line: 9 });
      }

      // 删除 z（含它的 NIL 子树）
      delete t.nodes[z.id];
      t.repairNil();
      const cmDel = t.sync([]);
      t.paintAll(cmDel);
      b.step('结点 ' + input.del + ' 已从树上摘除。**被摘走的颜色是 ' + (yColor ? '红' : '黑') + '**：' +
        (yColor ? '红色不贡献黑高，直接结束，无需任何修复。' : '黑色会让经过它的路径黑高 -1 —— 顶替者 ' + (x.nil ? 'NIL' : x.key) + ' 现在背上**双黑**，必须修复。'),
      cmDel, { line: 10, milestone: '摘除 ' + input.del + '（' + (yColor ? '红' : '黑') + '结点）' });

      /* 双黑标记同一时刻只应存在于一个结点上，切换时必须先擦掉旧的 */
      let dbAt = null;
      const setDb = (cmds, id) => {
        if (dbAt && dbAt !== id) cmds.push(C.badge(dbAt, 'db', ''), C.state(dbAt, 'default'));
        dbAt = id;
        if (id) cmds.push(C.badge(id, 'db', '2B', true), C.state(id, 'conflict'));
        return cmds;
      };

      if (!yColor) {
        /* ---- 双黑修复 ---- */
        b.step('**双黑**意味着这个位置"欠了一层黑"。修复的四种 Case 全部取决于**兄弟 w 的颜色**和**两个侄子的颜色**。' +
          '先看兄弟：', setDb([], x.id), { line: 13, stage: true });
        let guard = 0;
        while (x !== t.root && !x.red && guard++ < 40) {
          const p = x.p;
          if (!p) break;
          const isLeft = p.left === x;
          let w = isLeft ? p.right : p.left;
          if (!w) break;
          const near = isLeft ? w.left : w.right;
          const far = isLeft ? w.right : w.left;
          const nearName = near ? near.key : null, farName = far ? far.key : null;

          if (w.red) {
            b.step('**Case 1：兄弟 ' + (w.nil ? 'NIL' : w.key) + ' 是红色**。兄弟红意味着父亲必定黑，' +
              '这也意味着兄弟的两个孩子必为黑 —— 这是个"临时状态"。解法：兄弟与父亲互换颜色，然后绕父亲朝 x 的方向旋转，' +
              '把兄弟变成新的"黑兄弟"。**Case 1 本身不解决问题，只是把问题转化成 Case 2/3/4**。', [
              C.state(w.id, 'conflict'), C.state(p.id, 'active'),
              C.text('case', ['Case 1：兄弟红', 'w.red = false', 'x.p.red = true', '旋转(x.p)', 'w = 新兄弟'])
            ], { line: 16, milestone: 'Case 1：兄弟红 → 转兄弟黑' });
            w.red = false; p.red = true;
            t.rot(p, isLeft ? 'R' : 'L');
            const c = [];
            t.sync(c); t.paintAll(c);
            b.step('旋转后，新的兄弟是原来的"近侄"，它现在是黑色的。' +
              '双黑还在原地，但**兄弟变黑了，可以进入真正的修复**。', c, { line: 16 });
            w = isLeft ? x.p.right : x.p.left;
            continue;
          }

          const nearBlack = !near || near.red === false;
          const farBlack = !far || far.red === false;
          if (nearBlack && farBlack) {
            b.step('**Case 2：兄弟黑，双侄皆黑**。既然兄弟那边"没有多余的红可以在旋转后补上黑"，' +
              '唯一的办法是让**兄弟也变红**（它那一侧的黑高同样 -1），于是整棵子树两边都少了 1 层黑 —— ' +
              '这就等价于"把双黑上移给父亲"。x 上移，继续循环。', [
              C.state(w.id, 'active'), C.text('case', ['Case 2：兄弟黑 + 双侄黑', 'w.red = true', 'x = x.p  // 双黑上移'])
            ], { line: 17, milestone: 'Case 2：兄弟变红，双黑上移' });
            w.red = true;
            const c = [];
            t.sync(c); t.paintAll(c);
            b.step('兄弟 ' + (w.nil ? 'NIL' : w.key) + ' 染红后，这一整棵子树的每条路径都少了 1 个黑 —— ' +
              '恰好和双黑"抵消"。于是双黑标记上移到父结点 ' + (p.nil ? 'NIL' : p.key) + '。', c, { line: 17 });
            x = p;
            b.step('新的 x = ' + (x.nil ? 'NIL' : x.key) + '（' + (x === t.root ? '已是根，循环会立即结束' : '继续检查') + '）。' +
              '注意双黑标记**整块搬走**了：原来那个位置已经"还清"，现在是父结点欠了一层黑。',
            setDb([], x.id), { line: 17 });
            continue;
          }

          if (farBlack) {
            b.step('**Case 3：兄弟黑，近侄红、远侄黑**。远侄是黑的，所以就算绕父亲旋转，' +
              '外侧也补不上黑。解法是**先把近侄的红"挪到"远侄那边**：近侄染黑、兄弟染红、绕兄弟反向旋转。' +
              '这样 Case 3 就变成了 Case 4。', [
              C.state(near.id, 'conflict'), C.text('case', ['Case 3：近侄红 / 远侄黑', '近侄.red = false', 'w.red = true', '旋转(w)   // 反向', 'w = 兄弟(x)'])
            ], { line: 20, milestone: 'Case 3：近侄转远侄' });
            near.red = false; w.red = true;
            t.rot(w, isLeft ? 'L' : 'R');
            const c = [];
            t.sync(c); t.paintAll(c);
            b.step('旋转后，原来那个红侄成了新的兄弟，且它的**外侧孩子是红的** —— 万事俱备，进入 Case 4。', c, { line: 20 });
            w = isLeft ? x.p.right : x.p.left;
          }

          const pp = x.p;
          const wFar = isLeft ? w.right : w.left;
          b.step('**Case 4：兄弟黑，远侄红**（决定性的一种）。三步收工：① 兄弟继承父亲的颜色（保住旋转后两侧黑高一致）；' +
            '② 父亲染黑（补上双黑欠的那层）；③ 远侄染黑；④ 绕父亲朝 x 方向旋转。' +
            '**此时双黑被彻底消化，x 直接置为根，循环结束**。', [
            C.state(w.id, 'path'), C.state(pp.id, 'active'),
            C.text('case', ['Case 4：远侄红', 'w.red = x.p.red', 'x.p.red = false', '远侄.red = false', '旋转(x.p);']
              .concat(['x = root  // 收工'])
          )], { line: 21, milestone: 'Case 4：一次旋转收工' });
          w.red = pp.red; pp.red = false; wFar.red = false;
          // x 在左侧 → 绕父亲【左旋】（右孩子上升），方向与 Case 1 相同
          t.rot(pp, isLeft ? 'R' : 'L');
          x = t.root;
          const c = setDb([], null);
          c.push(C.state(pp.id, 'default'), C.state(w.id, 'default'));
          t.sync(c); t.paintAll(c);
          b.step('旋转完成，双黑消失。注意观察：**根到每个 NIL 的黑结点数又完全一致了**。', c, { line: 22 });
        }
        if (x) {
          const wasRed = x.red;
          x.red = false;
          const c = [];
          t.sync(c); t.paintAll(c);
          b.step('循环退出后无条件执行 `x.red = false`：无论双黑是"上移到根"还是"落到一个红结点上"，' +
            '**把它染黑**都能吸收掉这层多余的黑（若 x 是红，则红+黑 = 黑；若 x 是根，双黑直接丢弃）。' +
            (wasRed ? '这次 x 本来是红的，染黑即可。' : ''), c, { line: 24, milestone: '双黑消除' });
        }
      }

      /* ---- 黑高校验 ---- */
      const paths = [];
      (function walk(u, blacks, trail) {
        if (!u) return;
        const nb = blacks + (u.red ? 0 : 1);
        const tr = trail.concat([u.nil ? 'NIL' : u.key]);
        if (u.nil) { paths.push({ label: tr.join('→'), meta: '黑高 ' + nb, v: nb }); return; }
        walk(u.left, nb, tr);
        walk(u.right, nb, tr);
      })(t.root, 0, []);
      const allSame = paths.every(p => p.v === paths[0].v);
      const cmF = t.paintAll([]);
      cmF.push(C.setQ('bh', paths.map((p, i) => ({ key: 'p' + i, label: p.label, meta: p.meta }))));
      cmF.push(C.text('case', [allSame ? '✓ 所有路径黑高一致 = ' + paths[0].v : '✗ 黑高不一致！']));
      b.step('**校验红黑性质**：从根出发的 ' + paths.length + ' 条到 NIL 的路径，黑结点数分别是 ' +
        paths.map(p => p.v).join(' / ') + ' → ' + (allSame ? '**全部相等，树仍然合法**。' : '**不相等，说明修复有误！**') +
        '这最后一道校验就是红黑树"黑高守恒"的铁证：插入靠变色与旋转维持它，删除靠双黑转移维持它。', cmF,
      { line: 24, milestone: allSame ? '黑高一致 = ' + paths[0].v : '黑高异常' });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
