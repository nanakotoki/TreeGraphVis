/* ============================================================
 * 第一卷 · T3 多路平衡搜索树（B 树 / B+ 树）
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;
  const Lib = TGV.TreeLib;

  function bTreeLayoutNodes(nodes) {
    return nodes.map(n => ({
      id: n.id,
      label: n.keys.length ? String(n.keys[0]) : '',
      key: n.keys.length ? n.keys[0] : 0,
      ord: n.minKey != null ? n.minKey : (n.keys[0] || 0),
      slots: n.keys.map(String)
    }));
  }

  function edgeId(p, c) { return p + '>' + c; }

  /* ============================================================
   * B 树插入（含上溢分裂）
   * ============================================================ */
  TGV.register({
    id: 'btree_insert', name: 'B 树 · 插入上溢分裂', category: '树 · 多路搜索树',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'note', type: 'text', title: '结点容量' }],
    pseudocode: [
      '// M 阶 B 树：每个结点最多 M-1 个键、M 个孩子',
      'insert(key):',
      '    u = root',
      '    while u is not leaf:',
      '        i = 第一个使 key < u.keys[i] 的位置',
      '        u = u.children[i]                 // 一路下潜到叶子',
      '    u.keys.insert_sorted(key)',
      '    while u.keys.size > M-1:               // 上溢 → 分裂',
      '        mid = floor(keys.size / 2)',
      '        right = new Node(keys[mid+1 ..])',
      '        midKey = keys[mid]; keys = keys[..mid-1]',
      '        if u is root: root = new Node([midKey], [u, right])',
      '        else: 父结点插入 midKey 与 right 指针; u = 父结点'
    ],
    presets: [
      { id: 'p1', label: 'M=4：插入 10,20,30,40 触发首次分裂', desc: '叶子满 3 个键后再插入即上溢', data: () => ({ order: 4, seq: [10, 20, 30, 40] }) },
      { id: 'p2', label: 'M=4：连续插入触发多层分裂', desc: '10~90 依次插入，观察根的分裂', data: () => ({ order: 4, seq: [10, 20, 30, 40, 50, 60, 70, 80, 90] }) },
      { id: 'p3', label: 'M=5：更大结点容量', desc: '每结点最多 4 键，树更矮', data: () => ({ order: 5, seq: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }) },
      { id: 'p4', label: '随机乱序插入', desc: '验证 B 树对插入顺序不敏感', data: () => ({ order: 4, seq: [50, 20, 80, 10, 30, 60, 90, 25, 35, 55] }) }
    ],
    run(input) {
      const M = input.order || 4;
      const maxKeys = M - 1;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      let idc = 0, root = null;
      const all = [];
      const parentOf = {};
      const childList = {};   // pid -> ordered child ids (用于控制边顺序)

      const newNode = (leaf) => {
        const n = { id: 'B' + (++idc), keys: [], children: [], leaf, parent: null, minKey: 0 };
        all.push(n);
        return n;
      };
      const nodeById = id => all.find(n => n.id === id);

      const syncChildren = (p, cmds, force) => {
        const prev = childList[p.id] || [];
        const now = p.children.map(c => c.id);
        const same = prev.join(',') === now.join(',');
        if (same && !force) return;
        prev.forEach(cid => cmds.push(C.removeEdge(edgeId(p.id, cid))));
        now.forEach(cid => cmds.push(C.addEdge(edgeId(p.id, cid), p.id, cid)));
        childList[p.id] = now;
      };
      const sub = (cmds, n) => {
        cmds.push(C.slots(n.id, n.keys.map(String)));
        if (n.keys.length) cmds.push(C.badge(n.id, 'k', n.keys.length));
      };
      const refresh = (cmds) => {
        all.forEach(n => {
          cmds.push(C.slots(n.id, n.keys.map(String)));
          cmds.push(C.badge(n.id, 'k', n.keys.length));
        });
      };

      b.step('**' + M + ' 阶 B 树**：每个结点最多 ' + maxKeys + ' 个键、' + M + ' 个孩子；所有叶子在同一深度，因此树高恒为 O(log_M n)。先把根建出来。', [
        C.text('note', ['阶 M = ' + M, '最多键数 = M-1 = ' + maxKeys, '最多孩子 = M = ' + M])
      ], { line: 1 });

      const insertKey = (key) => {
        b.step('**插入 ' + key + '**', [], { line: 2, vars: [{ name: 'key', value: key }], stage: true });
        if (!root) {
          root = newNode(true);
          const cmds = [C.addNode(root.id, '', { slots: [], key, ord: key }), C.state(root.id, 'active')];
          root.keys.push(key);
          sub(cmds, root);
          b.step('树为空，新建根结点并放入 ' + key + '。', cmds, { line: 3, milestone: '建立根结点' });
          return;
        }
        let u = root;
        const path = [];
        let guard = 0;
        while (!u.leaf && guard++ < 20) {
          path.push(u);
          let i = 0;
          while (i < u.keys.length && key > u.keys[i]) i++;
          b.step('在内部结点 [' + u.keys.join(' | ') + '] 中定位：' + key + ' 应落入第 ' + (i + 1) + ' 个子树（孩子指针 c' + i + '）。', [
            C.state(u.id, 'active')
          ], { line: 5, vars: [{ name: 'u', value: u.keys.join('|') }, { name: 'i', value: i }] });
          u = u.children[i];
        }
        b.step('到达叶子结点 [' + (u.keys.join(' | ') || '空') + ']，插入位置确定。', [C.state(u.id, 'active')], { line: 6 });
        // 插入
        let pos = 0;
        while (pos < u.keys.length && key > u.keys[pos]) pos++;
        u.keys.splice(pos, 0, key);
        const cm = [];
        sub(cm, u);
        b.step('把 ' + key + ' 插入叶子的第 ' + (pos + 1) + ' 个槽位。', cm, { line: 6, milestone: key + ' 落入叶子' });
        // 上溢
        let cur = u;
        guard = 0;
        while (cur && cur.keys.length > maxKeys && guard++ < 10) {
          const mid = Math.floor(cur.keys.length / 2);
          const midKey = cur.keys[mid];
          b.step('**结点上溢**：[' + cur.keys.join(' | ') + '] 有 ' + cur.keys.length + ' 个键，超过上限 ' + maxKeys + '。取中间键 **' + midKey + '** 准备上移。', [
            C.state(cur.id, 'conflict')
          ], { line: 8, milestone: '上溢分裂：中间键 ' + midKey + ' 上移', stage: true });
          const right = newNode(cur.leaf);
          right.keys = cur.keys.slice(mid + 1);
          if (!cur.leaf) {
            right.children = cur.children.slice(mid + 1);
            right.children.forEach(c => c.parent = right);
            cur.children = cur.children.slice(0, mid + 1);
          }
          cur.keys = cur.keys.slice(0, mid);
          const cm1 = [C.addNode(right.id, '', { slots: [], key: right.keys[0], ord: right.keys[0] })];
          sub(cm1, right);
          sub(cm1, cur);
          if (!cur.leaf) { syncChildren(cur, cm1, true); syncChildren(right, cm1, true); }
          b.step('左半区保留 [' + cur.keys.join(' | ') + ']，右半区新建结点 [' + right.keys.join(' | ') + ']，中间键 ' + midKey + ' 腾空上移。', cm1, { line: 10 });
          if (!cur.parent) {
            const nr = newNode(false);
            nr.keys = [midKey];
            nr.children = [cur, right];
            cur.parent = nr; right.parent = nr;
            root = nr;
            const cm2 = [C.addNode(nr.id, '', { slots: [String(midKey)], key: midKey, ord: midKey }), C.state(nr.id, 'path')];
            sub(cm2, nr);
            syncChildren(nr, cm2, true);
            b.step('分裂的是根结点 → **新建一层根**：根只含 [' + midKey + ']，两个孩子分别指向左右半区。**B 树是自底向上生长的**，这是它保持完美平衡的关键。', cm2, { line: 11, milestone: '树高 +1（新根 ' + midKey + '）' });
            break;
          }
          const p = cur.parent;
          right.parent = p;
          let i = p.children.indexOf(cur);
          p.children.splice(i + 1, 0, right);
          let kp = 0;
          while (kp < p.keys.length && midKey > p.keys[kp]) kp++;
          p.keys.splice(kp, 0, midKey);
          const cm3 = [C.state(p.id, 'active')];
          sub(cm3, p);
          syncChildren(p, cm3, true);
          b.step('把中间键 ' + midKey + ' 与右半区指针插入父结点 → [' + p.keys.join(' | ') + ']。若父结点也上溢，继续向上处理。', cm3, { line: 12 });
          cur = p;
        }
        const fin = [];
        refresh(fin);
        all.forEach(n => fin.push(C.state(n.id, 'default')));
        b.step('本轮结束。当前根：[' + root.keys.join(' | ') + ']，树高 ' + (function h(n) { return n.leaf ? 1 : 1 + h(n.children[0]); })(root) + '。', fin, { line: 8, milestone: '插入 ' + key + ' 完成' });
      };

      input.seq.forEach(k => insertKey(k));
      b.step('全部插入完成。B 树的结点键数控制在 [' + Math.ceil((M - 1) / 2) + ', ' + maxKeys + '] 之间，树高始终 O(log_' + M + ' n)，这正是磁盘索引与数据库选择 B 树的原因。', [], { line: 12, milestone: '构建完成' });
      b.nodes = bTreeLayoutNodes(all);
      b.edges = [];
      all.forEach(p => p.children.forEach(c => b.edges.push({ id: edgeId(p.id, c.id), source: p.id, target: c.id })));
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * B+ 树：索引结点 + 叶子链表 + 范围查询
   * ============================================================ */
  TGV.register({
    id: 'bplus_range', name: 'B+ 树 · 叶子链表与范围查询', category: '树 · 多路搜索树',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'note', type: 'text', title: '查询计划' }, { id: 'out', type: 'list', title: '命中结果' }],
    pseudocode: [
      '// B+ 树：内部结点只存路由键（副本），全部数据在叶子层',
      '// 叶子结点用双向链表串起来，天然支持范围扫描',
      'range_query(L, R):',
      '    u = root',
      '    while u is not leaf:',
      '        u = u.children[第一个 >= L 的分支]     // ① 树形下潜定位 L',
      '    while u != null and u.keys[0] <= R:        // ② 沿叶子链表横向滑行',
      '        for k in u.keys: if k >= L and k <= R: output(k)',
      '        u = u.next'
    ],
    presets: [
      { id: 'range', label: '范围查询 [25, 68]', desc: '先下潜定位 25，再沿链表扫到 68', data: () => ({ keys: [5, 12, 18, 25, 30, 38, 42, 50, 55, 62, 68, 75, 82, 90], lo: 25, hi: 68, leafMax: 3 }) },
      { id: 'point', label: '单点查询 55', desc: '只走一条根到叶的路径', data: () => ({ keys: [5, 12, 18, 25, 30, 38, 42, 50, 55, 62, 68, 75, 82, 90], lo: 55, hi: 55, leafMax: 3 }) },
      { id: 'range2', label: '范围查询 [60, 85]', desc: '跨多个叶子的连续扫描', data: () => ({ keys: [5, 12, 18, 25, 30, 38, 42, 50, 55, 62, 68, 75, 82, 90], lo: 60, hi: 85, leafMax: 3 }) }
    ],
    run(input) {
      const keys = input.keys || [];
      const leafMax = input.leafMax || 3;
      const lo = input.lo, hi = input.hi;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      const all = [];
      let idc = 0;

      // 递归建树：叶子按 leafMax 分组，内部结点按每 3 个孩子分组
      function build(arr, leaf) {
        const n = { id: 'P' + (++idc), keys: [], children: [], leaf };
        all.push(n);
        if (leaf) { n.keys = arr.slice(); return n; }
        return n;
      }
      // 先生成叶子
      const leaves = [];
      for (let i = 0; i < keys.length; i += leafMax) {
        const lf = build(keys.slice(i, i + leafMax), true);
        leaves.push(lf);
      }
      leaves.forEach((lf, i) => { lf.next = leaves[i + 1] || null; lf.prev = leaves[i - 1] || null; });
      // 逐层构造内部结点
      let level = leaves;
      while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 3) {
          const parent = { id: 'P' + (++idc), keys: [], children: level.slice(i, i + 3), leaf: false };
          all.push(parent);
          parent.children.forEach(c => { c.parent = parent; });
          parent.keys = parent.children.slice(1).map(c => c.keys[0]); // 路由键 = 子树最小键
          nextLevel.push(parent);
        }
        level = nextLevel;
      }
      const root = level[0];

      const nodesDef = all.map(n => ({
        id: n.id,
        label: n.keys.length ? String(n.keys[0]) : '',
        key: n.keys.length ? n.keys[0] : 0,
        ord: n.keys.length ? n.keys[0] : 0,
        slots: n.keys.map(String)
      }));
      const edges = [];
      all.forEach(p => p.children.forEach(c => edges.push({ id: edgeId(p.id, c.id), source: p.id, target: c.id })));
      b.nodes = nodesDef;
      b.edges = edges;

      // 叶子链表弧线
      const linkCmds = [];
      leaves.forEach((lf, i) => {
        if (lf.next) linkCmds.push(C.arc('nxt_' + i, lf.id, lf.next.id, { color: '#0EA5E9', label: 'next', dashed: true, curve: 46 }));
      });
      b.step('**B+ 树**与 B 树的根本区别：**内部结点只存路由键的副本，全部真实数据都在叶子层**，并且叶子之间用双向链表串起来。这一层链表就是范围查询的"高速公路"。', [
        C.text('note', ['叶子数 = ' + leaves.length, '内部结点键 = 子树最小键的副本', '范围 [' + lo + ', ' + hi + ']'])
      ].concat(linkCmds), { line: 1 });

      // 下潜定位
      let u = root;
      const pathIds = [];
      let guard = 0;
      while (!u.leaf && guard++ < 10) {
        pathIds.push(u.id);
        let i = 0;
        // 找第一个子树的 min key > lo 的前一个
        i = u.children.length - 1;
        for (let j = 0; j < u.children.length; j++) {
          const mn = u.children[j].keys[0];
          if (lo < mn) { i = j - 1; break; }
        }
        if (i < 0) i = 0;
        b.step('在内部结点 [' + u.keys.join(' | ') + '] 中路由：' + lo + ' 落在第 ' + (i + 1) + ' 个分支（子树最小键 ' + u.children[i].keys[0] + '）。', [
          C.state(u.id, 'active')
        ], { line: 6, vars: [{ name: 'L', value: lo }, { name: 'branch', value: i }] });
        u = u.children[i];
      }
      b.step('下潜到叶子 [' + u.keys.join(' | ') + ']，**定位完成**。注意：内部结点只是"路标"，真正的键值只在叶子里。', [
        C.state(u.id, 'path')
      ], { line: 6, milestone: '下潜定位 L = ' + lo, stage: true });

      // 链表扫描
      const out = [];
      let leaf = u, step = 0;
      while (leaf && guard++ < 20) {
        let stopped = false;
        for (const k of leaf.keys) {
          if (k > hi) { stopped = true; break; }
          if (k >= lo) out.push(k);
        }
        if (out.length) {
          const cm = [C.state(leaf.id, 'path')].concat(out.map(k => C.push('out', k)));
          b.step('扫描叶子 [' + leaf.keys.join(' | ') + ']：命中 ' + leaf.keys.filter(k => k >= lo && k <= hi).join(', ') + '，累计 ' + out.length + ' 个。', cm, { line: 8, milestone: '命中 ' + out.length + ' 个键' });
        }
        if (stopped || !leaf.next) break;
        b.step('本叶子扫描完毕，沿 **next 指针横向滑行**到下一个叶子 —— 不需要回到根重新查找，这是 B+ 树范围查询高效的原因。', [
          C.pulse('nxt_' + leaves.indexOf(leaf), { color: '#0EA5E9' })
        ], { line: 9 });
        leaf = leaf.next;
        step++;
      }
      b.step('**范围查询完成**：[' + lo + ', ' + hi + '] 内共 ' + out.length + ' 个键 → ' + (out.join(', ') || '无') + '。全程只有一次树形下潜 + 若干次链表跳转。', [], { line: 9, milestone: '查询结束：' + out.length + ' 条结果' });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

})();
