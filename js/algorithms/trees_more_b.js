/* ============================================================
 * 第一卷 · T4 堆与优先队列树族（补充）
 * 斐波那契堆：惰性合并 + Consolidate 度数桶 + 级联切断
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* 森林布局（与可并堆文件同款：按叶子游标计算 x） */
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
    roots.forEach(r => { if (r) { walk(r, 0); cursor += 1.1; } });
    const xs0 = Object.keys(pos).map(k => pos[k].x);
    const mid = xs0.length ? (Math.min.apply(null, xs0) + Math.max.apply(null, xs0)) / 2 : 0;
    Object.keys(pos).forEach(k => { pos[k] = { x: pos[k].x - mid + 430, y: pos[k].y + 110 }; });
    return pos;
  }

  TGV.register({
    id: 'fib_heap', name: '斐波那契堆（惰性合并 + 级联切断）', category: '树 · 堆与可并堆',
    layout: 'fixed', directed: true, acceptsGraph: false,
    compareWith: 'binomial_heap',
    panels: [
      { id: 'roots', type: 'list', title: '根链表（min 指针指向最小根）' },
      { id: 'bucket', type: 'array', title: 'Consolidate 度数桶', values: [], labels: ['d0', 'd1', 'd2', 'd3'] },
      { id: 'watch', type: 'table', title: '结点状态', columns: [{ key: 'key', label: 'key' }, { key: 'deg', label: 'deg' }, { key: 'mark', label: 'mark' }] }
    ],
    pseudocode: [
      '// 斐波那契堆 = 一组"堆序树"组成的森林 + 一个 min 指针，根之间用循环链表串起来',
      '// insert：直接挂进根链表，O(1)，先不整理（惰性合并）',
      'insert(x): 把 x 作为单结点树加入根链表；if key[x] < key[min]: min = x',
      'extractMin():',
      '    取出 min 结点；把 min 的所有孩子直接搬进根链表',
      '    for 根链表中的每个结点 x:              // Consolidate：按度数归并',
      '        d = degree[x]',
      '        while bucket[d] 非空: y = bucket[d]',
      '            link(x, y)：键大的挂到键小的下面，degree + 1',
      '        bucket[d] = x',
      '    重建根链表，min = 新链表中的最小者',
      'decreaseKey(x, k):',
      '    key[x] = k；if k < key[父]: 把 x 剪断（cut）挂到根链表',
      '    级联切断：若父已被 mark，继续剪断父；否则给父打上 mark',
      '// 势能分析保证 consolidate 把每棵树的度数控制在 O(log n)'
    ],
    presets: [
      { id: 'std', label: '插入 7 个键 → extractMin → decreaseKey', desc: '观察惰性插入、度数桶归并、级联切断 mark 变色', data: () => ({ seq: [7, 3, 18, 24, 5, 12, 9], dec: 20 }) },
      { id: 'big', label: '更长的序列（两次 extractMin）', desc: '第二次归并时根链表已经很规整', data: () => ({ seq: [11, 4, 26, 8, 17, 2, 33, 14, 21, 6], dec: 30 }) }
    ],
    run(input) {
      const seq = input.seq || [7, 3, 18, 24, 5, 12, 9];
      const nodesDef = seq.map(v => ({ id: 'n' + v, label: String(v), x: 0, y: 0, hidden: true }));
      const b = new TGV.Builder(this, { nodes: nodesDef, edges: [], panels: this.panels });

      const st = {};
      let roots = [];
      let minId = null;
      let live = [];
      const kidsOf = id => (st[id] ? st[id].kids : []);
      const sync = (cmds) => {
        live.forEach(e => cmds.push(C.removeEdge(e)));
        live = [];
        const walk = id => st[id].kids.forEach(c => {
          const eid = id + '>' + c;
          cmds.push(C.addEdge(eid, id, c));
          live.push(eid);
          walk(c);
        });
        roots.forEach(r => { if (st[r]) walk(r); });
      };
      const reLayout = (cmds) => {
        const pos = layoutForest(roots.filter(r => st[r]), kidsOf, 70, 96);
        sync(cmds);
        cmds.push(C.morph(pos, 420));
      };
      const rootsPanel = () => C.setQ('roots', roots.filter(r => st[r]).map(r => ({ key: r, label: st[r].v + (r === minId ? ' ← min' : '') })));
      const bucketArr = (bucket) => bucket.map(x => (x && st[x] ? String(st[x].v) : '—'));
      const paintAll = (cmds) => {
        Object.keys(st).forEach(id => {
          cmds.push(C.badge(id, 'deg', st[id].deg));
          if (st[id].mark) cmds.push(C.badge(id, 'mark', '✓', true));
          else cmds.push(C.badge(id, 'mark', null));
          cmds.push(C.table('watch', id, 'key', st[id].v));
          cmds.push(C.table('watch', id, 'deg', st[id].deg));
          cmds.push(C.table('watch', id, 'mark', st[id].mark ? '✓' : ''));
        });
      };
      const height = () => {
        let h = 0;
        const walk = (u, d) => { h = Math.max(h, d); st[u].kids.forEach(c => walk(c, d + 1)); };
        roots.forEach(r => { if (st[r]) walk(r, 1); });
        return h;
      };

      b.step('**斐波那契堆**的关键思想是"**能拖就拖**"：插入、合并都只花 O(1)（直接挂到根链表），' +
        '真正耗时的整理（Consolidate）推迟到 `extractMin` 时一次性完成。' +
        '根之间用**循环双向链表**串成一个森林，`min` 指针永远指向最小的根。',
      [C.setQ('roots', []), C.array('bucket', ['—', '—', '—', '—'])], { line: 1 });

      /* ---------- 插入（惰性） ---------- */
      seq.forEach((key, idx) => {
        const id = 'n' + key;
        st[id] = { v: key, parent: null, kids: [], deg: 0, mark: false };
        roots.push(id);
        const isNewMin = minId === null || key < st[minId].v;
        const oldMin = minId;
        if (isNewMin) minId = id;
        const cm = [C.show(id), C.setLabel(id, String(key)), C.badge(id, 'deg', 0)];
        if (isNewMin && oldMin) cm.push(C.badge(oldMin, 'min', null));
        if (isNewMin) cm.push(C.badge(id, 'min', '★', true));
        reLayout(cm);
        cm.push(rootsPanel());
        b.step('插入 **' + key + '**：新结点直接成为一棵单结点树，挂进根链表即可，**不动任何旧结构**（O(1) 惰性插入）。' +
          (isNewMin ? ' 因为 ' + key + ' 比当前最小值 ' + (oldMin ? st[oldMin].v : '-') + ' 更小，`min` 指针改指向它。' : ' 最小值仍是 ' + st[minId].v + '。'),
        cm, { line: 3, vars: [{ name: 'key', value: key }, { name: 'min', value: st[minId].v }], milestone: idx === seq.length - 1 ? '插入完成' : null });
      });

      /* ---------- extractMin + Consolidate ---------- */
      const doExtractMin = (tag) => {
        const m = minId;
        const mVal = st[m].v;
        const cm0 = [C.state(m, 'conflict')];
        b.step('**extractMin**：取出最小值 ' + mVal + '（min 结点）。注意它下面可能挂着一大串孩子——它们即将被**整体拆迁**到根链表。',
          cm0, { line: 5, milestone: 'extractMin：弹出 ' + mVal, stage: true });

        const kids = st[m].kids.slice();
        kids.forEach(c => { st[c].parent = null; });
        st[m].kids = [];
        roots = roots.filter(r => r !== m);
        kids.forEach(c => roots.push(c));
        roots = roots.filter(r => st[r]);
        st[m].hidden = true;
        st[m].deg = 0;
        const cm1 = [C.hide(m)];
        kids.forEach(c => cm1.push(C.badge(c, 'deg', st[c].deg)));
        if (roots.length) {
          let best = roots[0];
          roots.forEach(r => { if (st[r].v < st[best].v) best = r; });
          minId = best;
          Object.keys(st).forEach(id => cm1.push(C.badge(id, 'min', null)));
          cm1.push(C.badge(minId, 'min', '★', true));
        }
        reLayout(cm1);
        cm1.push(rootsPanel());
        b.step('把 ' + mVal + ' 的 **' + kids.length + ' 个孩子**全部提升为根（父指针清空），从根链表里摘掉最小结点。' +
          '此刻根链表变得很"散"——这正是需要 Consolidate 的原因。', cm1, { line: 5 });

        /* Consolidate */
        const DMAX = 8;
        const bucket = new Array(DMAX).fill(null);
        const order = roots.slice();
        let guard = 0;
        const cmA = [C.array('bucket', bucketArr(bucket))];
        b.step('**Consolidate**：准备一个按"度数"索引的桶数组（类似二进制加法的进位槽）。' +
          '逐个处理根链表中的树，度相同的两棵树合并，于是度数像二进制进位一样不断上升。', cmA, { line: 6, milestone: 'Consolidate 开始' });

        for (let oi = 0; oi < order.length; oi++) {
          let x = order[oi];
          if (!st[x] || st[x].parent) continue;   // 已被合并到别人下面
          let d = st[x].deg;
          let hops = 0;
          while (bucket[d] && hops++ < 10) {
            let y = bucket[d];
            bucket[d] = null;
            let a = x, c = y;
            if (st[a].v > st[c].v) { const t = a; a = c; c = t; }
            st[c].parent = a;
            st[a].kids.push(c);
            st[a].deg++;
            const cm = [C.state(a, 'active'), C.state(c, 'path'),
              C.array('bucket', bucketArr(bucket), [d])];
            reLayout(cm);
            b.step('度数 **d=' + d + '** 的槽里已经有一棵树 ' + st[y].v + '；把 ' + st[x].v + ' 与它合并：' +
              '**键大的挂到键小的下面**（' + st[c].v + ' → ' + st[a].v + '），合并后度数变为 ' + (d + 1) + '，继续看下一层桶。',
            cm, { line: 8, vars: [{ name: 'd', value: d }, { name: 'a', value: st[a].v }, { name: 'b', value: st[c].v }] });
            x = a;
            d = st[a].deg;
          }
          bucket[d] = x;
          const cm = [C.array('bucket', bucketArr(bucket), [d]), C.state(x, 'visited')];
          paintAll(cm);
          reLayout(cm);
          b.step('结点 ' + st[x].v + ' 的度数收敛到 **d=' + d + '**，放进桶里。根链表现在只剩合并后的"大块头"。', cm, { line: 10 });
        }

        roots = bucket.filter(Boolean);
        let best = roots[0];
        roots.forEach(r => { if (st[r].v < st[best].v) best = r; });
        minId = best;
        const cm2 = [];
        Object.keys(st).forEach(id => cm2.push(C.badge(id, 'min', null)));
        Object.keys(st).forEach(id => cm2.push(C.state(id, st[id].hidden ? 'default' : 'default')));
        cm2.push(C.badge(minId, 'min', '★', true));
        cm2.push(rootsPanel());
        cm2.push(C.array('bucket', bucketArr(bucket)));
        paintAll(cm2);
        reLayout(cm2);
        b.step('**重建根链表**：只剩 ' + roots.length + ' 棵树（每个度数槽各留一棵），' +
          '`min` 重新指向其中最小的 ' + st[minId].v + '。归并后每个根的度数不超过 O(log n)，这就是斐波那契堆"摊还 O(1) 插入"的秘密：' +
          '<b>整理成本被推迟并摊薄了</b>。', cm2, { line: 11, milestone: tag + '：根链表收敛为 ' + roots.length + ' 棵树' });
      };

      doExtractMin('第一次 extractMin');

      /* ---------- decreaseKey + 级联切断 ---------- */
      const pickDeep = () => {
        let best = null;
        const walk = (u, d) => {
          const nd = st[u];
          if (nd.parent) {
            const gd = (st[nd.parent].parent ? 10 : 0) + d + nd.v * 0.001;
            if (!best || gd > best.d) best = { id: u, d: gd };
          }
          nd.kids.forEach(c => walk(c, d + 1));
        };
        roots.forEach(r => walk(r, 0));
        return best ? best.id : null;
      };
      const target = pickDeep();
      const decTo = (minId ? st[minId].v : 2) - 1;
      if (target) {
        const pId = st[target].parent;
        const oldV = st[target].v;
        const cm0 = [C.state(target, 'active')];
        b.step('**decreaseKey**：把结点 ' + oldV + ' 的键减小到 **' + decTo + '**。' +
          '它现在比自己的父结点 ' + st[pId].v + ' 还小了 → 违反了堆序，必须**剪断（cut）**出来。', cm0,
        { line: 13, milestone: 'decreaseKey(' + oldV + ' → ' + decTo + ')', stage: true });

        st[target].v = decTo;
        st[target].label = String(decTo);
        const cm1 = [C.setLabel(target, String(decTo)), C.table('watch', target, 'key', decTo)];
        paintAll(cm1);
        reLayout(cm1);
        b.step('键值已改为 ' + decTo + '。接下来把它从父结点 ' + st[pId].v + ' 的孩子链表中摘出、挂到根链表。', cm1, { line: 13 });

        /* cut(x) */
        const doCut = (x, deep) => {
          const p = st[x].parent;
          const cm = [C.state(x, 'conflict'), C.state(p, 'conflict')];
          st[p].kids = st[p].kids.filter(c => c !== x);
          st[p].deg--;
          st[x].parent = null;
          st[x].mark = false;
          roots.push(x);
          cm.push(C.badge(p, 'deg', st[p].deg));
          cm.push(C.badge(x, 'mark', null));
          paintAll(cm);
          reLayout(cm);
          cm.push(rootsPanel());
          b.step('**cut(' + st[x].v + ')**：从父结点 ' + st[p].v + ' 的孩子链表摘下，整棵子树挂到根链表；' +
            '父结点度数降为 ' + st[p].deg + '，被剪断结点的 `mark` 清零。', cm, { line: 13 });
          return p;
        };

        let cur = doCut(target, false);
        if (minId && st[target].v < st[minId].v) {
          const old = minId;
          minId = target;
          const cm = [C.badge(old, 'min', null), C.badge(minId, 'min', '★', true), rootsPanel()];
          b.step('新键 ' + decTo + ' 比原最小值 ' + st[old].v + ' 还小 → `min` 指针改指向它。', cm, { line: 13 });
        }

        /* 级联切断 */
        let guard = 0;
        while (cur && st[cur].parent && guard++ < 6) {
          if (!st[cur].mark) {
            st[cur].mark = true;
            const cm = [C.badge(cur, 'mark', '✓', true), C.state(cur, 'active')];
            paintAll(cm);
            b.step('**级联切断的判定**：父结点 ' + st[cur].v + ' 之前**没有 mark**，于是给它打上 mark 就停下。' +
              '`mark` 的含义是"这个结点刚刚失去过一个孩子"——第二次再失去孩子时就要被剪断了。', cm, { line: 14 });
            break;
          }
          st[cur].mark = false;
          const cmMark = [C.badge(cur, 'mark', null)];
          paintAll(cmMark);
          b.step('父结点 ' + st[cur].v + ' **已经被 mark 过**（它之前已经失去过一个孩子）→ 触发**级联切断**，把它也剪出来。', cmMark, { line: 14, milestone: '级联切断：' + st[cur].v });
          cur = doCut(cur, true);
        }
        const fin = [];
        Object.keys(st).forEach(id => fin.push(C.state(id, 'default')));
        paintAll(fin);
        reLayout(fin);
        b.step('**decreaseKey 完成**。级联切断的意义：被剪掉的子树之后可以整体并回根链表，' +
          '从而保证"一棵树的度数最多 O(log n)"这个势能不变式不被破坏。当前树高 ' + height() + '，根链表 ' + roots.length + ' 棵树。',
        fin, { line: 14, milestone: 'decreaseKey 结束' });
      }

      b.step('演示结束。**斐波那契堆的性能账本**：insert / merge / decreaseKey 都是摊还 O(1)，' +
        'extractMin 摊还 O(log n)。代价是实现复杂（循环链表 + 度数桶 + mark 位），' +
        '所以实际工程里只有在 decreaseKey 极频繁的场景（如 Dijkstra、Prim 的稠密图版本）才会赢过二叉堆。',
      [], { line: 15, milestone: '演示完成' });

      b.nodes = nodesDef;
      b.edges = [];
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
