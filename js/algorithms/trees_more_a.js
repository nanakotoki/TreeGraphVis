/* ============================================================
 * 第一卷 · T3 多路平衡搜索树（补充）
 * 2-3 树 / 2-3-4 树（自底向上 vs 自顶向下）· B* 树（兄弟转移 + 2-to-3 分裂）
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* 预置节点池：多路树的结点是动态分裂出来的，
     这里一次性声明足够多的隐藏结点，靠 C.show 逐个"点亮" */
  function pool(prefix, n) {
    const out = [];
    for (let i = 1; i <= n; i++) out.push({ id: prefix + i, label: '', x: 0, y: 0, hidden: true });
    return out;
  }

  /* ============================================================
   * 1. 2-3 树（自底向上分裂） vs 2-3-4 树（自顶向下预分裂）
   * ============================================================ */
  TGV.register({
    id: 'two_three_four', name: '2-3 树 / 2-3-4 树（自底向上 vs 自顶向下）', category: '树 · 多路搜索树',
    layout: 'tree', childOrder: 'none', directed: true, acceptsGraph: false,
    compareWith: 'btree_insert',
    panels: [
      { id: 'meta', type: 'text', title: '结点容量' },
      { id: 'seq', type: 'list', title: '插入顺序' }
    ],
    pseudocode: [
      '// 2-3 树：结点 1~2 个键、2~3 个孩子；2-3-4 树放宽到 1~3 个键、2~4 个孩子',
      '// 【自底向上 · 2-3 树】先插到叶子，溢出后再逐层向上分裂',
      'insert(key): u = root',
      '    沿 key 的比较一路下潜到叶子',
      '    把 key 插进叶子的有序槽位',
      '    while u.keys.size > 2:                  // 溢出 → 分裂',
      '        mid = 中间键，把它顶到父结点',
      '        剩下的键拆成左右两个结点',
      '        若分裂的是根 → 新建根，树高 +1',
      '// 【自顶向下 · 2-3-4 树】下潜途中遇到满结点就先分裂（预分裂）',
      'insert_topdown(key): u = root',
      '    if 根是满的（3 个键）: 先分裂根，得到新根',
      '    while u 不是叶子:',
      '        若目标孩子是满的: 先把它分裂，再重新选路',
      '        u = 目标孩子',
      '    把 key 插入叶子（此时必然有空槽）',
      '// 自顶向下法只需扫描一遍路径，代价是做了一些"可能用不上"的分裂'
    ],
    presets: [
      { id: 'two3', label: '2-3 树 · 自底向上分裂', desc: '插入 10,20,30 触发第一次分裂，30 顶到新根', data: () => ({ mode: 'bottomUp', seq: [10, 20, 30, 40, 50] }) },
      { id: 'two3b', label: '2-3 树 · 多层分裂', desc: '连续插入 6 个键，看分裂如何一路上传', data: () => ({ mode: 'bottomUp', seq: [10, 20, 30, 40, 50, 60, 70] }) },
      { id: 'two34', label: '2-3-4 树 · 自顶向下预分裂', desc: '根一满就在下潜前分裂，插入永不回溯', data: () => ({ mode: 'topDown', seq: [10, 20, 30, 40, 50, 60] }) },
      { id: 'two34b', label: '2-3-4 树 · 乱序插入', desc: '验证多路树对插入顺序不敏感', data: () => ({ mode: 'topDown', seq: [50, 20, 80, 10, 30, 60, 70] }) }
    ],
    run(input) {
      const mode = input.mode === 'topDown' ? 'topDown' : 'bottomUp';
      const maxK = mode === 'topDown' ? 3 : 2;
      const seq = input.seq || [10, 20, 30, 40, 50];
      const b = new TGV.Builder(this, { nodes: pool('M', 30), edges: [], panels: this.panels });

      const st = {};
      let idc = 0, root = null;
      let liveEdges = [];
      const shown = {};

      const mk = () => { const id = 'M' + (++idc); st[id] = { keys: [], children: [], parent: null }; return id; };
      const isLeaf = id => st[id].children.length === 0;
      const branchOf = (id, key) => {
        const ks = st[id].keys;
        let i = 0;
        while (i < ks.length && key > ks[i]) i++;
        return i;
      };
      const showNew = (cmds) => {
        Object.keys(st).forEach(id => { if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); } });
      };
      const sync = (cmds) => {
        liveEdges.forEach(e => cmds.push(C.removeEdge(e)));
        liveEdges = [];
        const walk = id => st[id].children.forEach(c => {
          const eid = id + '>' + c;
          cmds.push(C.addEdge(eid, id, c));
          liveEdges.push(eid);
          walk(c);
        });
        if (root) walk(root);
      };
      const paint = (cmds) => {
        Object.keys(st).forEach(id => {
          const n = st[id];
          cmds.push(C.slots(id, n.keys.map(String)));
          cmds.push(C.badge(id, 'k', n.keys.length));
          cmds.push(C.setLabel(id, n.keys.length ? String(n.keys[0]) : ''));
        });
      };
      const clearStates = (cmds) => Object.keys(st).forEach(id => cmds.push(C.state(id, 'default')));
      const height = () => {
        let h = 0, u = root;
        while (u) { h++; u = isLeaf(u) ? null : st[u].children[0]; }
        return h;
      };

      const splitNode = (u) => {
        const ks = st[u].keys, ch = st[u].children;
        const mid = Math.floor(ks.length / 2);
        const up = ks[mid];
        const rid = mk();
        st[rid].keys = ks.slice(mid + 1);
        st[rid].parent = st[u].parent;
        if (ch.length) {
          st[rid].children = ch.slice(mid + 1);
          st[rid].children.forEach(c => { st[c].parent = rid; });
          st[u].children = ch.slice(0, mid + 1);
        }
        st[u].keys = ks.slice(0, mid);
        return { up, right: rid };
      };

      b.step('**' + (mode === 'topDown' ? '2-3-4 树（自顶向下预分裂）' : '2-3 树（自底向上分裂）') + '**：' +
        '多路树把多个键塞进同一个结点，于是**每个结点有多个槽位、多个孩子**。' +
        '2-3 树每结点最多 2 个键，2-3-4 树最多 3 个键。两者都保证**所有叶子在同一层**，树高恒为 O(log n)。',
      [C.text('meta', [
        '当前模式：' + (mode === 'topDown' ? '自顶向下（预分裂）' : '自底向上（回溯分裂）'),
        '每结点最多键数 = ' + maxK,
        '每结点最多孩子 = ' + (maxK + 1)
      ]), C.setQ('seq', seq)], { line: 1 });

      const insertKey = (key) => {
        b.step('**插入 ' + key + '**', [], { line: 3, vars: [{ name: 'key', value: key }], stage: true });

        if (!root) {
          root = mk();
          st[root].keys = [key];
          const cmds = [];
          showNew(cmds); paint(cmds); sync(cmds);
          b.step('树是空的：建立根结点，把 ' + key + ' 放进第一个槽位。', cmds, { line: 5, milestone: '建立根结点 [' + key + ']' });
          return;
        }

        /* ---------- 路径下潜 ---------- */
        if (mode === 'topDown') {
          let guard = 0;
          while (st[root].keys.length > maxK - 1 && guard++ < 10) {
            const cmds = [C.state(root, 'conflict')];
            b.step('**根结点满**（' + st[root].keys.length + ' 个键 = 上限）：自顶向下法要求**在下潜之前**先把根分裂掉，' +
              '于是树的"根分裂"永远发生在最上面一层，插入过程中就不必再回溯。', cmds, { line: 12, milestone: '预分裂根结点' });
            const res = splitNode(root);
            const nr = mk();
            st[nr].keys = [res.up];
            st[nr].children = [root, res.right];
            st[root].parent = nr;
            st[res.right].parent = nr;
            root = nr;
            const cm=[]; showNew(cm); paint(cm); sync(cm); clearStates(cm);
            cm.push(C.state(root, 'path'));
            b.step('根裂成两半，中间键 **' + res.up + '** 升为新的根 → 树高 +1（现在是 ' + height() + '）。', cm, { line: 9 });
          }
        }

        let u = root, guard = 0;
        while (!isLeaf(u) && guard++ < 12) {
          let i = branchOf(u, key);
          b.step('在结点 [' + st[u].keys.join(' | ') + '] 上路由：' + key + ' 落在第 ' + (i + 1) + ' 棵子树（孩子指针 c' + i + '）。',
            [C.state(u, 'active')], { line: 4, vars: [{ name: 'u', value: st[u].keys.join('|') }, { name: 'i', value: i }] });

          if (mode === 'topDown') {
            const c = st[u].children[i];
            if (st[c].keys.length > maxK - 1) {
              const cm = [C.state(c, 'conflict')];
              b.step('**目标是满结点** [' + st[c].keys.join(' | ') + ']：自顶向下法在这里**先分裂、再下降**。' +
                '分裂后父结点多一个键、多一个孩子指针，我们再重新选一次路。', cm, { line: 14, milestone: '预分裂满孩子' });
              const res = splitNode(c);
              st[res.right].parent = u;
              st[u].children.splice(i + 1, 0, res.right);
              let kp = 0;
              while (kp < st[u].keys.length && res.up > st[u].keys[kp]) kp++;
              st[u].keys.splice(kp, 0, res.up);
              const cm2 = [];
              showNew(cm2); paint(cm2); sync(cm2); clearStates(cm2);
              cm2.push(C.state(u, 'path'));
              b.step('孩子裂成 [' + st[c].keys.join(' | ') + '] 与 [' + st[res.right].keys.join(' | ') + ']，' +
                '分隔键 ' + res.up + ' 上移到父结点的第 ' + (kp + 1) + ' 个槽位。', cm2, { line: 8 });
              i = branchOf(u, key);
            }
            u = st[u].children[i];
          } else {
            u = st[u].children[i];
          }
        }

        /* ---------- 插入叶子 ---------- */
        const pos = branchOf(u, key);
        st[u].keys.splice(pos, 0, key);
        const cmA = [];
        paint(cmA);
        b.step('到达叶子 [' + st[u].keys.join(' | ') + ']，把 ' + key + ' 插进第 ' + (pos + 1) + ' 个槽位。', cmA, { line: 5, milestone: key + ' 落入叶子' });

        /* ---------- 溢出处理 ---------- */
        if (mode === 'topDown') {
          const cm = [];
          clearStates(cm);
          paint(cm);
          b.step('自顶向下法保证**叶子一定有空槽**（一路上把满结点都裂开了），所以插入立刻结束，**没有任何回溯**。当前树高 ' + height() + '。',
            cm, { line: 16, milestone: '插入 ' + key + ' 完成（无回溯）' });
          return;
        }

        let cur = u;
        guard = 0;
        while (st[cur].keys.length > maxK && guard++ < 10) {
          b.step('**结点上溢**：[' + st[cur].keys.join(' | ') + '] 有 ' + st[cur].keys.length + ' 个键，超过上限 ' + maxK +
            '。取中间键 **' + st[cur].keys[Math.floor(st[cur].keys.length / 2)] + '** 准备上移。',
          [C.state(cur, 'conflict')], { line: 6, milestone: '上溢分裂', stage: true });

          if (cur === root) {
            const midKey = st[cur].keys[Math.floor(st[cur].keys.length / 2)];
            const res = splitNode(cur);
            const nr = mk();
            st[nr].keys = [res.up];
            st[nr].children = [cur, res.right];
            st[cur].parent = nr;
            st[res.right].parent = nr;
            root = nr;
            const cm = []; showNew(cm); paint(cm); sync(cm); clearStates(cm); cm.push(C.state(root, 'path'));
            b.step('分裂的是根 → **新建一层根**，只含 [' + res.up + ']。多路树就是这样"从上往下长高"的：树高增加的唯一途径是根分裂。',
              cm, { line: 9, milestone: '树高 +1（新根 ' + res.up + '）' });
            break;
          }

          const p = st[cur].parent;
          const i = st[p].children.indexOf(cur);
          const res = splitNode(cur);
          st[res.right].parent = p;
          st[p].children.splice(i + 1, 0, res.right);
          let kp = 0;
          while (kp < st[p].keys.length && res.up > st[p].keys[kp]) kp++;
          st[p].keys.splice(kp, 0, res.up);
          const cm = []; showNew(cm); paint(cm); sync(cm); clearStates(cm);
          cm.push(C.state(p, 'active'));
          b.step('左半区留下 [' + st[cur].keys.join(' | ') + ']，右半区新建 [' + st[res.right].keys.join(' | ') + ']，' +
            '中间键 ' + res.up + ' 挤进父结点 → [' + st[p].keys.join(' | ') + ']。若父结点也溢出，继续向上传播。',
          cm, { line: 7 });
          cur = p;
        }
        const fin = []; clearStates(fin); paint(fin);
        b.step('本轮结束。根结点 [' + st[root].keys.join(' | ') + ']，树高 ' + height() + '。', fin, { line: 7, milestone: '插入 ' + key + ' 完成' });
      };

      seq.forEach(k => insertKey(k));

      b.step('**两种策略的对比**：自底向上（2-3 树）只在真正溢出时分裂，但需要沿着父链回溯；' +
        '自顶向下（2-3-4 树）在下潜时就把满结点裂开，插入只需一遍扫描、无需回溯，代价是可能做了几个"事后并不需要"的分裂。' +
        '最终两者都保持**所有叶子同深度**，树高 ' + height() + '，查询代价 O(log n)。', [], { line: 17, milestone: '构建完成' });

      b.nodes = pool('M', 30);
      b.edges = [];
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 2. B* 树：兄弟转移（Redistribute）+ 2-to-3 分裂
   * ============================================================ */
  TGV.register({
    id: 'bstar_tree', name: 'B* 树（兄弟转移 + 2-to-3 分裂）', category: '树 · 多路搜索树',
    layout: 'tree', childOrder: 'none', directed: true, acceptsGraph: false,
    compareWith: 'btree_insert',
    panels: [
      { id: 'meta', type: 'text', title: '丰满度约束' },
      { id: 'log', type: 'list', title: '动作日志' }
    ],
    pseudocode: [
      '// B* 树：每个结点至少保持 2/3 满（M=4 → 每结点 2~3 个键）',
      '// 溢出时不急着分裂：先把键"挪"给还有空位的兄弟（redistribute）',
      'insert(key): 沿路下潜到叶子，插入有序槽位',
      'if 叶子键数 <= 3: 结束                       // 未溢出',
      'if 左右某个兄弟的键数 < 3:                    // 兄弟还能装',
      '    把 (兄弟 + 父分隔键 + 自己) 的键合并后重新平均分配',
      '    父结点里的分隔键换成新的分界键             // 只改键，不改结构',
      'else:                                        // 兄弟也满 → 2-to-3 分裂',
      '    把 (左兄弟 + 分隔键 + 自己) 共 8 个键合并',
      '    平均切成 3 个结点（如 2 / 2 / 2）',
      '    中间两个键上移给父结点，父的孩子指针 +1',
      'if 父结点因此溢出: 对父结点重复上述过程',
      '// 与 B 树对比：B 树满就分裂，B* 树优先"腾挪"，',
      '// 所以 B* 树的结点更满（≈2/3 而非 1/2）、树更矮、空间利用率更高',
      '// 一次 2-to-3 分裂新增 2 个结点，而 B 树一次分裂只新增 1 个'
    ],
    presets: [
      { id: 'rd', label: '触发兄弟转移（Redistribute）', desc: '左兄弟只有 2 个键，还能接收', data: () => ({ seq: [10, 20, 30, 40, 50, 60, 70] }) },
      { id: 's23', label: '触发 2-to-3 分裂', desc: '左右兄弟都满 → 两结点裂成三结点', data: () => ({ seq: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] }) },
      { id: 'mix', label: '混合：先转移、后分裂', desc: '完整观察 B* 树的两种溢出策略', data: () => ({ seq: [10, 20, 30, 40, 50, 60, 70, 80, 90] }) }
    ],
    run(input) {
      const MAXK = 3, MINOK = 2;
      const seq = input.seq || [];
      const b = new TGV.Builder(this, { nodes: pool('S', 40), edges: [], panels: this.panels });

      const st = {};
      let idc = 0, root = null, liveEdges = [];
      const shown = {};
      const logLines = [];

      const mk = () => { const id = 'S' + (++idc); st[id] = { keys: [], children: [], parent: null }; return id; };
      const isLeaf = id => st[id].children.length === 0;
      const branchOf = (id, key) => {
        const ks = st[id].keys;
        let i = 0;
        while (i < ks.length && key > ks[i]) i++;
        return i;
      };
      const showNew = (cmds) => Object.keys(st).forEach(id => { if (!shown[id]) { shown[id] = true; cmds.push(C.show(id)); } });
      const sync = (cmds) => {
        liveEdges.forEach(e => cmds.push(C.removeEdge(e)));
        liveEdges = [];
        const walk = id => st[id].children.forEach(c => {
          const eid = id + '>' + c;
          cmds.push(C.addEdge(eid, id, c));
          liveEdges.push(eid);
          walk(c);
        });
        if (root) walk(root);
      };
      const paint = (cmds) => {
        Object.keys(st).forEach(id => {
          const n = st[id];
          cmds.push(C.slots(id, n.keys.map(String)));
          cmds.push(C.badge(id, 'k', n.keys.length));
          cmds.push(C.badge(id, 'fill', Math.round(n.keys.length / MAXK * 100) + '%'));
          cmds.push(C.setLabel(id, n.keys.length ? String(n.keys[0]) : ''));
        });
      };
      const clearStates = (cmds) => Object.keys(st).forEach(id => cmds.push(C.state(id, 'default')));
      const height = () => { let h = 0, u = root; while (u) { h++; u = isLeaf(u) ? null : st[u].children[0]; } return h; };
      const addLog = (t) => { logLines.push(t); return C.setQ('log', logLines.slice()); };

      /* 把 parent 的第 i 与 i+1 个孩子合并成 3 个结点（2-to-3 split） */
      const split23 = (p, pId, i) => {
        const A = p.children[i], B = p.children[i + 1];
        const sep = p.keys[i];
        const allKeys = st[A].keys.concat([sep], st[B].keys);
        const allKids = st[A].children.concat(st[B].children);
        const T = allKeys.length;
        const n1 = Math.floor((T - 2) / 3);
        const rem = T - 2 - n1;
        const n2 = Math.floor(rem / 2);
        const n3 = rem - n2;
        const k1 = allKeys.slice(0, n1);
        const s1 = allKeys[n1];
        const k2 = allKeys.slice(n1 + 1, n1 + 1 + n2);
        const s2 = allKeys[n1 + 1 + n2];
        const k3 = allKeys.slice(n1 + 2 + n2);
        const Cid = mk();
        // 孩子切片
        if (allKids.length) {
          const c1 = allKids.slice(0, n1 + 1);
          const c2 = allKids.slice(n1 + 1, n1 + 1 + n2 + 1);
          const c3 = allKids.slice(n1 + 1 + n2 + 1);
          st[A].children = c1; c1.forEach(c => { st[c].parent = A; });
          st[B].children = c2; c2.forEach(c => { st[c].parent = B; });
          st[Cid].children = c3; c3.forEach(c => { st[c].parent = Cid; });
        }
        st[A].keys = k1;
        st[B].keys = k2;
        st[Cid].keys = k3;
        st[Cid].parent = pId;
        p.children.splice(i + 2, 0, Cid);
        p.keys.splice(i, 1, s1, s2);
        return { A, B, Cid, s1, s2, n: [k1.length, k2.length, k3.length] };
      };

      /* 兄弟转移：把 left+sep+right 的键重新平均分配 */
      const redistribute = (p, pId, i) => {
        const A = p.children[i], B = p.children[i + 1];
        const sep = p.keys[i];
        const allKeys = st[A].keys.concat([sep], st[B].keys);
        const allKids = st[A].children.concat(st[B].children);
        const total = allKeys.length;
        const mid = Math.floor(total / 2);
        const nA = mid - 1;               // A 拿 nA 个键 + 分隔键 + B
        const nB = total - nA - 1;
        const kA = allKeys.slice(0, nA);
        const newSep = allKeys[nA];
        const kB = allKeys.slice(nA + 1);
        if (allKids.length) {
          const cA = allKids.slice(0, nA + 1);
          const cB = allKids.slice(nA + 1);
          st[A].children = cA; cA.forEach(c => { st[c].parent = A; });
          st[B].children = cB; cB.forEach(c => { st[c].parent = B; });
        }
        st[A].keys = kA;
        st[B].keys = kB;
        p.keys[i] = newSep;
        return { nA: nA, nB: nB, oldSep: sep, newSep: newSep };
      };

      b.step('**B* 树**是 B 树的"高丰满度"版本：每个结点必须保持 **至少 2/3 满**（M=4 时即 2~3 个键）。' +
        '这样一来结点不会轻易分裂——**溢出时先看兄弟能不能接收，实在不行才把两个结点切成三个**。',
      [C.text('meta', [
        '阶 M = 4（最多 3 个键）',
        '最少键数 = 2（丰满度 ≥ 2/3）',
        '溢出策略：① 兄弟转移  ② 2-to-3 分裂'
      ]), C.setQ('log', [])], { line: 1 });

      const insertKey = (key) => {
        b.step('**插入 ' + key + '**', [], { line: 3, vars: [{ name: 'key', value: key }], stage: true });
        if (!root) {
          root = mk();
          st[root].keys = [key];
          const cm = []; showNew(cm); paint(cm); sync(cm);
          b.step('树为空：建立根结点并放入 ' + key + '。', cm, { line: 4, milestone: '建立根结点' });
          return;
        }
        let u = root, guard = 0;
        while (!isLeaf(u) && guard++ < 12) {
          const i = branchOf(u, key);
          b.step('在 [' + st[u].keys.join(' | ') + '] 上路由：' + key + ' → 第 ' + (i + 1) + ' 棵子树。', [C.state(u, 'active')], { line: 3 });
          u = st[u].children[i];
        }
        const pos = branchOf(u, key);
        st[u].keys.splice(pos, 0, key);
        const cm0 = []; paint(cm0);
        b.step('落进叶子 [' + st[u].keys.join(' | ') + ']。现在它有 ' + st[u].keys.length + ' 个键。', cm0, { line: 3, milestone: key + ' 落入叶子' });

        let cur = u;
        guard = 0;
        while (cur && st[cur].keys.length > MAXK && guard++ < 10) {
          b.step('**溢出**：[' + st[cur].keys.join(' | ') + '] 有 ' + st[cur].keys.length + ' 个键 > 上限 ' + MAXK + '。' +
            'B* 树先不分裂，先找一个"还装得下"的兄弟。', [C.state(cur, 'conflict')], { line: 4, milestone: '溢出：尝试兄弟转移', stage: true });

          if (cur === root) {
            // 根溢出：退化成分裂
            const ks = st[cur].keys, ch = st[cur].children;
            const mid = Math.floor(ks.length / 2);
            const up = ks[mid];
            const rid = mk();
            st[rid].keys = ks.slice(mid + 1);
            st[rid].parent = null;
            if (ch.length) {
              st[rid].children = ch.slice(mid + 1);
              st[rid].children.forEach(c => { st[c].parent = rid; });
              st[cur].children = ch.slice(0, mid + 1);
            }
            st[cur].keys = ks.slice(0, mid);
            const nr = mk();
            st[nr].keys = [up];
            st[nr].children = [cur, rid];
            st[cur].parent = nr; st[rid].parent = nr;
            root = nr;
            const cm = []; showNew(cm); paint(cm); sync(cm); clearStates(cm); cm.push(addLog('根分裂 → 树高 +1'));
            b.step('溢出的是根：没有兄弟可借，只能分裂根并新建一层。**树高 +1**。', cm, { line: 12, milestone: '树高 +1' });
            break;
          }

          const pId = st[cur].parent;
          const p = st[pId];
          const i = p.children.indexOf(cur);
          const left = i > 0 ? p.children[i - 1] : null;
          const right = i < p.children.length - 1 ? p.children[i + 1] : null;
          const leftOK = left && st[left].keys.length < MAXK;
          const rightOK = right && st[right].keys.length < MAXK;

          if (leftOK || rightOK) {
            const useLeft = !!leftOK;
            const pair = useLeft ? i - 1 : i;
            const sibId = p.children[useLeft ? i - 1 : i + 1];
            const cm = [C.state(cur, 'active'), C.state(sibId, 'active')];
            b.step('发现**兄弟还能装**（' + (useLeft ? '左' : '右') + '兄弟 [' + st[sibId].keys.join(' | ') +
              '] 只有 ' + st[sibId].keys.length + ' 个键）：执行**兄弟转移**。' +
              '把两个结点连同父结点里的分隔键**合起来重新平均分配**——注意结构（结点数、孩子数）完全不变，只有键在搬家。',
            cm, { line: 6, milestone: '兄弟转移（Redistribute）' });
            const r = redistribute(p, pId, pair);
            const cm2 = []; paint(cm2); sync(cm2); clearStates(cm2);
            cm2.push(addLog('redistribute: ' + r.oldSep + ' → ' + r.newSep));
            b.step('重新分配后：左结点 ' + r.nA + ' 个键、右结点 ' + r.nB + ' 个键，父结点分隔键由 ' + r.oldSep + ' 换成 **' + r.newSep + '**。' +
              '**没有新增结点，也没有回溯**——这正是 B* 树省空间的关键。', cm2, { line: 7 });
            break;
          }

          // 两边兄弟都满 → 2-to-3
          let pair = i > 0 ? i - 1 : i;
          const A = p.children[pair], Bv = p.children[pair + 1];
          const cm = [C.state(A, 'conflict'), C.state(Bv, 'conflict')];
          b.step('**左右兄弟都满了**：两个结点合并成 8 个键（3 + 1 + 4），再切成 3 个结点——这就是 **2-to-3 分裂**。' +
            '它一次性把"拥挤"摊到三个结点上，所以结点依然保持 2/3 以上的丰满度。', cm,
          { line: 9, milestone: '2-to-3 分裂', stage: true });
          const r = split23(p, pId, pair);
          const cm2 = []; showNew(cm2); paint(cm2); sync(cm2); clearStates(cm2);
          cm2.push(addLog('2-to-3: 分裂出 ' + r.n.join('/') + ' 三个结点'));
          b.step('切成 [' + r.n.join(' | ') + '] 三个结点，分隔键 **' + r.s1 + '**、**' + r.s2 + '** 上移给父结点。' +
            '父结点多了一个孩子指针，若父结点也溢出，则对它重复同样两步。', cm2, { line: 11 });
          cur = pId;
        }
        const fin = []; clearStates(fin); paint(fin);
        b.step('本轮结束。根 [' + st[root].keys.join(' | ') + ']，树高 ' + height() + '，结点数 ' + Object.keys(st).length + '。',
          fin, { line: 12, milestone: '插入 ' + key + ' 完成' });
      };

      seq.forEach(k => insertKey(k));

      const fills = Object.keys(st).map(id => st[id].keys.length);
      b.step('**B* 树完成**：共 ' + Object.keys(st).length + ' 个结点，键数分布 ' + fills.join('/') + '。' +
        '对比同规模的 B 树，B* 树的结点数更少、平均丰满度更高（约 2/3 而不是 1/2），因此**树更矮、磁盘 I/O 更少**。' +
        '代价是插入时要多看两个兄弟结点。', [addLog('完成：' + Object.keys(st).length + ' 个结点')], { line: 14, milestone: '构建完成' });

      b.nodes = pool('S', 40);
      b.edges = [];
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
