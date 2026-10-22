/* ============================================================
 * 第一卷 · 规范清单补齐（三）
 *   #16 B 树 · 删除下溢修复（借键旋转 / 父键下沉合并 / 级联 / 根降层）
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  TGV.register({
    id: 'btree_delete', name: 'B 树 · 删除下溢（借键 / 合并）', category: '树 · 多路搜索树',
    layout: 'tree', childOrder: 'none',
    compareWith: 'btree_insert',
    panels: [
      { id: 'note', type: 'text', title: '阶与容量' },
      { id: 'log', type: 'list', title: '修复动作' }
    ],
    pseudocode: [
      '// M 阶 B 树：非根结点至少 ceil(M/2)-1 个键。删少了叫【下溢】',
      'delete(key):',
      '    u = search(key)                          // 找到键所在的结点',
      '    if u 不是叶子:                            // 内部结点的键不能直接删',
      '        用【前驱】（左子树最大键）覆盖这个键，再转去删前驱',
      '    从叶子里删掉这个键',
      '    while u != root and u.keys.size < minKeys:        // 下溢修复循环',
      '        if 右兄弟.keys.size > minKeys:                // ① 借键（右兄弟富余）',
      '            父的分隔键下移到 u 末尾；右兄弟最小键上移补位；右兄弟最左孩子改挂 u',
      '        elif 左兄弟.keys.size > minKeys:              // ② 借键（左兄弟富余）',
      '            父的分隔键下移到 u 头部；左兄弟最大键上移补位；左兄弟最右孩子改挂 u',
      '        else:                                        // ③ 兄弟都穷 → 合并',
      '            父的分隔键下沉，与兄弟的所有键一起并入 u；删除兄弟结点',
      '            u = u.parent                             // 父结点也可能下溢 → 级联',
      '    if u == root and root.keys.size == 0:             // 根被掏空 → 整棵树降一层',
      '        root = root.children[0]'
    ],
    presets: [
      { id: 'plain', label: '① 删叶子键 · 不下溢', desc: 'M=4，叶子删完还剩 1 个键，正好卡在下限', data: () => ({ order: 4, seq: [10, 20, 30, 40, 50, 60, 70, 80], del: 80 }) },
      { id: 'borrow', label: '② 借键 · 向右兄弟富余处借', desc: 'M=3，删 3 后结点空了，右兄弟 [5|6] 有 2 个键可借', data: () => ({ order: 3, seq: [1, 2, 3, 4, 5, 6], del: 3 }) },
      { id: 'merge', label: '③ 合并 → 级联 → 根降层', desc: 'M=3，删 1：叶合并 → 父也空 → 再合并 → 根降层', data: () => ({ order: 3, seq: [1, 2, 3, 4, 5, 6, 7], del: 1 }) },
      { id: 'inner', label: '④ 删内部结点的键 · 前驱顶替', desc: 'M=4，删根里的 60，先用左子树最大键 50 覆盖', data: () => ({ order: 4, seq: [10, 20, 30, 40, 50, 60, 70, 80], del: 60 }) }
    ],
    run(input) {
      const M = input.order || 4;
      const maxKeys = M - 1;
      const minKeys = Math.ceil(M / 2) - 1;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      let idc = 0, root = null;
      const all = [];
      const childList = {};
      const log = [];

      const newNode = leaf => {
        const n = { id: 'B' + (++idc), keys: [], children: [], leaf, parent: null, minKey: 0 };
        all.push(n);
        return n;
      };
      const recalcOrd = () => {
        const walk = u => {
          if (u.leaf) u.minKey = u.keys.length ? u.keys[0] : (u.parent ? u.parent.minKey : 0);
          else { u.children.forEach(walk); u.minKey = u.children.length ? u.children[0].minKey : (u.keys[0] || 0); }
        };
        if (root) walk(root);
      };
      const syncKids = (cmds, p) => {
        const prev = childList[p.id] || [];
        const now = p.children.map(c => c.id);
        if (prev.join(',') === now.join(',')) return;
        prev.forEach(cid => cmds.push(C.removeEdge(p.id + '>' + cid)));
        now.forEach(cid => cmds.push(C.addEdge(p.id + '>' + cid, p.id, cid)));
        childList[p.id] = now;
      };
      const paint = (cmds, n) => {
        cmds.push(C.addNode(n.id, n.keys.length ? String(n.keys[0]) : '\u2205', {
          slots: n.keys.map(String), key: n.minKey, ord: n.minKey
        }));
        // 空结点用单个 ∅ 占位槽，避免宽度塌成 0 后图形失真
        cmds.push(C.slots(n.id, n.keys.length ? n.keys.map(String) : ['\u2205']));
        cmds.push(C.setLabel(n.id, n.keys.length ? String(n.keys[0]) : '\u2205'));
        cmds.push(C.badge(n.id, 'k', n.keys.length));
      };
      const paintAll = (cmds) => {
        recalcOrd();
        // 两趟：先把所有结点补齐（ADD_NODE 幂等），再加边，避免"边先于端点"
        const order = [];
        (function walk(u) {
          if (!u) return;
          order.push(u);
          u.children.forEach(walk);
        })(root);
        order.forEach(n => paint(cmds, n));
        order.forEach(n => syncKids(cmds, n));
        return cmds;
      };

      /* ---- 建树（静默插入，不产生帧） ---- */
      const insertSilent = key => {
        if (!root) { root = newNode(true); root.keys.push(key); return; }
        let u = root;
        while (!u.leaf) {
          let i = 0;
          while (i < u.keys.length && key > u.keys[i]) i++;
          u = u.children[i];
        }
        let pos = 0;
        while (pos < u.keys.length && key > u.keys[pos]) pos++;
        u.keys.splice(pos, 0, key);
        let cur = u;
        while (cur.keys.length > maxKeys) {
          const mid = Math.floor(cur.keys.length / 2);
          const midKey = cur.keys[mid];
          const right = newNode(cur.leaf);
          right.keys = cur.keys.slice(mid + 1);
          cur.keys = cur.keys.slice(0, mid);
          if (!cur.leaf) {
            right.children = cur.children.slice(mid + 1);
            right.children.forEach(c => { c.parent = right; });
            cur.children = cur.children.slice(0, mid + 1);
          }
          if (!cur.parent) {
            const nr = newNode(false);
            nr.keys = [midKey];
            nr.children = [cur, right];
            cur.parent = nr; right.parent = nr;
            root = nr;
            break;
          }
          const p = cur.parent;
          right.parent = p;
          const idx = p.children.indexOf(cur);
          p.keys.splice(idx, 0, midKey);
          p.children.splice(idx + 1, 0, right);
          cur = p;
        }
      };

      b.step('**' + M + ' 阶 B 树**：每个结点最多 ' + maxKeys + ' 个键；**非根结点至少 ' + minKeys + ' 个键**（' +
        '这就是"半满"底线）。删除的危险在于：从一个只有 ' + minKeys + ' 个键的结点里再删一个，它就"饿"了。' +
        '先建好这棵 ' + input.seq.length + ' 个键的树。', [
        C.text('note', ['阶 M = ' + M, '最多键数 = ' + maxKeys, '最少键数 = ' + minKeys])
      ], { line: 1 });
      input.seq.forEach(k => insertSilent(k));
      const cmB = [];
      paintAll(cmB);
      b.step('建树完成。**所有叶子在同一层**，右侧面板显示每个结点的键数 `k`。现在执行 **delete(' + input.del + ')**。',
        cmB, { line: 2, milestone: '建树完成', stage: true });

      /* ---- 1. 定位 ---- */
      let u = root, idx = -1;
      while (u) {
        let i = 0;
        while (i < u.keys.length && input.del > u.keys[i]) i++;
        if (u.keys[i] === input.del) { idx = i; break; }
        if (u.leaf) { u = null; break; }
        u = u.children[i];
      }
      if (!u) {
        b.step('树里没有 ' + input.del + '，无需删除。', [], { line: 2 });
        return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
      }
      b.step('在' + (u === root ? '**根结点**' : '结点') + ' [' + u.keys.join(' | ') + '] 的第 ' + (idx + 1) + ' 个槽位找到 **' + input.del + '**。' +
        '它是' + (u.leaf ? '叶子结点，可以直接删。' : '**内部结点**，键不能直接抽走 —— 否则它两侧的子树就失去了分隔。'),
      [C.state(u.id, 'active')], { line: 3, vars: [{ name: 'key', value: input.del }] });

      if (!u.leaf) {
        b.step('内部结点的删法：找**前驱** —— 左子树里最大的那个键。它一定在叶子上，而且可以安全地删。' +
          '用前驱覆盖掉待删的键，问题就转化成"删掉叶子上的前驱"。', [
          C.text('log', ['内部结点：找前驱替换'])
        ], { line: 4 });
        let p = u.children[idx];
        while (!p.leaf) p = p.children[p.children.length - 1];
        const predKey = p.keys[p.keys.length - 1];
        b.step('前驱是 **' + predKey + '**（在叶子 [' + p.keys.join(' | ') + '] 的最右端）。把它复制到内部结点覆盖 ' +
          input.del + '，这样中序顺序完全不变。', [
          C.state(p.id, 'active'), C.pulse(u.id + '>' + u.children[idx].id)
        ], { line: 5, milestone: '前驱 = ' + predKey });
        u.keys[idx] = predKey;
        const cUp = [];
        paintAll(cUp);
        b.step('覆盖完成：内部结点变成 [' + u.keys.join(' | ') + ']。接着转去叶子删掉 ' + predKey + '。', cUp, { line: 5 });
        u = p;
        idx = u.keys.length - 1;
      }

      const removed = u.keys.splice(idx, 1)[0];
      const cmD = [];
      paintAll(cmD);
      log.push('删除 ' + removed);
      b.step('从叶子 [' + (u.keys.join(' | ') || '空') + '] 中删除 **' + removed + '**。现在这个结点有 ' + u.keys.length +
        ' 个键，下限是 ' + minKeys + ' → ' + (u.keys.length >= minKeys ? '**仍然合法**，收工。' : '**下溢（Underflow）！** 必须修复。'),
      cmD, { line: 6, milestone: '删除 ' + removed + (u.keys.length >= minKeys ? '（合法）' : '（下溢）') });

      /* ---- 2. 下溢修复 ---- */
      let guard = 0;
      while (u !== root && u.keys.length < minKeys && guard++ < 30) {
        const p = u.parent;
        if (!p) break;
        const ci = p.children.indexOf(u);
        const rSib = ci + 1 < p.children.length ? p.children[ci + 1] : null;
        const lSib = ci > 0 ? p.children[ci - 1] : null;
        b.step('**下溢修复**：结点 [' + (u.keys.join(' | ') || '空') + '] 只有 ' + u.keys.length + ' 个键，少于 ' + minKeys +
          '。先看兄弟能不能"借"：右兄弟 ' + (rSib ? '[' + (rSib.keys.join(' | ') || '空') + ']（' + rSib.keys.length + ' 键）' : '无') +
          '、左兄弟 ' + (lSib ? '[' + (lSib.keys.join(' | ') || '空') + ']（' + lSib.keys.length + ' 键）' : '无') + '。', [
          C.state(u.id, 'conflict'), C.state(p.id, 'active')
        ], { line: 7, stage: true });

        if (rSib && rSib.keys.length > minKeys) {
          b.step('**向右兄弟借键**：右兄弟有 ' + rSib.keys.length + ' 个键 > 下限 ' + minKeys + '，还富余。' +
            '但键不能跨越兄弟直接搬 —— 必须**经过父结点中转**：把父的分隔键 ' + p.keys[ci] + ' 下移到 u 末尾，' +
            '再把右兄弟最小的键 ' + rSib.keys[0] + ' 上移补上父结点的空位。' +
            (rSib.children.length ? '右兄弟最左边的孩子也要改挂到 u 名下（BST 有序性要求）。' : ''), [
            C.state(rSib.id, 'active'), C.state(p.id, 'active'),
            C.pulse(p.id + '>' + u.id)
          ], { line: 8, milestone: '借键：' + rSib.keys[0] + ' ↑ / ' + p.keys[ci] + ' ↓' });
          u.keys.push(p.keys[ci]);
          p.keys[ci] = rSib.keys.shift();
          if (rSib.children.length) {
            const kid = rSib.children.shift();
            kid.parent = u;
            u.children.push(kid);
          }
          const c = [];
          paintAll(c);
          log.push('借键 → ' + u.keys[u.keys.length - 1] + ' 下移');
          b.step('借键完成：u 变成 [' + u.keys.join(' | ') + ']，父结点变成 [' + p.keys.join(' | ') + ']，' +
            '右兄弟变成 [' + (rSib.keys.join(' | ') || '空') + ']。**三个结点的键数全都合法了**，一处下溢，三个结点受益。',
          c.concat([C.setQ('log', log.map((x, i) => ({ key: 'l' + i, label: x })))]),
          { line: 9, milestone: '借键完成' });
          break;
        }
        if (lSib && lSib.keys.length > minKeys) {
          b.step('**向左兄弟借键**（右兄弟借不出）：左兄弟有 ' + lSib.keys.length + ' 个键。对称地，' +
            '父的分隔键 ' + p.keys[ci - 1] + ' 下移到 u 的**头部**，左兄弟最大的键 ' + lSib.keys[lSib.keys.length - 1] +
            ' 上移补位；左兄弟最右的孩子改挂到 u 的最前面。', [
            C.state(lSib.id, 'active'), C.state(p.id, 'active')
          ], { line: 10, milestone: '借键：' + lSib.keys[lSib.keys.length - 1] + ' ↑ / ' + p.keys[ci - 1] + ' ↓' });
          u.keys.unshift(p.keys[ci - 1]);
          p.keys[ci - 1] = lSib.keys.pop();
          if (lSib.children.length) {
            const kid = lSib.children.pop();
            kid.parent = u;
            u.children.unshift(kid);
          }
          const c = [];
          paintAll(c);
          log.push('借键 ← ' + p.keys[ci - 1] + ' 上移');
          b.step('借键完成：u 变成 [' + u.keys.join(' | ') + ']，父结点 [' + p.keys.join(' | ') + ']，' +
            '左兄弟 [' + (lSib.keys.join(' | ') || '空') + ']。下溢解除，**树的高度一点没变**。',
          c.concat([C.setQ('log', log.map((x, i) => ({ key: 'l' + i, label: x })))]),
          { line: 11, milestone: '借键完成' });
          break;
        }

        /* ---- 合并 ---- */
        const sib = rSib || lSib;
        const useRight = !!rSib;
        const sepKey = useRight ? p.keys[ci] : p.keys[ci - 1];
        const sepAt = useRight ? ci : ci - 1;
        b.step('**兄弟都只有 ' + minKeys + ' 个键，借不出**。唯一出路是**合并**：把父结点里夹在这两个兄弟之间的分隔键 **' +
          sepKey + '** 拉下来，与两个兄弟的所有键拼成一个结点。' +
          '结果这个结点有 ' + (u.keys.length + sib.keys.length + 1) + ' 个键（即使满也 ≤ ' + maxKeys + '，因为两边都只有 ' + minKeys + '），合法。', [
          C.state(sib.id, 'conflict'), C.state(p.id, 'active')
        ], { line: 12, milestone: '合并：父键 ' + sepKey + ' 下沉' });

        if (useRight) {
          u.keys = u.keys.concat([sepKey], sib.keys);
          sib.children.forEach(c2 => { c2.parent = u; });
          u.children = u.children.concat(sib.children);
        } else {
          u.keys = sib.keys.concat([sepKey], u.keys);
          sib.children.forEach(c2 => { c2.parent = u; });
          u.children = sib.children.concat(u.children);
        }
        p.keys.splice(sepAt, 1);
        p.children.splice(useRight ? ci + 1 : ci, 1);

        const cM = [];
        paintAll(cM);
        cM.push(C.removeNode(sib.id));
        all.splice(all.indexOf(sib), 1);
        delete childList[sib.id];
        cM.push(C.setQ('log', log.concat(['合并 ' + sepKey + ' 下沉']).map((x, i) => ({ key: 'l' + i, label: x }))));
        log.push('合并 → ' + sepKey + ' 下沉');
        b.step('合并完成：结点变成 [' + u.keys.join(' | ') + ']，兄弟被删除，父结点少了一个键一个孩子 → 现在是 [' +
          (p.keys.join(' | ') || '空') + ']。' +
          (p === root ? '**父结点是根的话可以空着**，但要检查是否需要降层。' : '**父结点也可能因此下溢**，循环继续向上。'),
        cM, { line: 13, milestone: '合并完成，父结点剩 ' + p.keys.length + ' 个键' });
        u = p;

        if (u === root && u.keys.length === 0) {
          const oldRootId = root.id;
          const oldKids = (childList[oldRootId] || []).slice();
          b.step('**根被掏空了**：根结点没有任何键，却还挂着一个孩子 —— 这时整棵树应该**降一层**：' +
            '直接让这个孩子当新根。这是 B 树唯一会降低高度的时机（对应的，插入分裂是唯一升高的时机）。',
          oldKids.map(cid => C.removeEdge(oldRootId + '>' + cid)).concat([
            C.removeNode(oldRootId), C.state(u.children[0].id, 'path')
          ]), { line: 14, milestone: '根降层' });
          const old = root;
          root = old.children[0];
          root.parent = null;
          delete childList[old.id];
          all.splice(all.indexOf(old), 1);
          log.push('根降层');
          u = root;
          const cR = [];
          paintAll(cR);
          b.step('新根是 [' + root.keys.join(' | ') + ']，树高减一。', cR, { line: 15 });
          break;
        }
      }

      const cF = [];
      paintAll(cF);
      const leafCount = all.filter(n => n.leaf).length;
      cF.push(C.setQ('log', log.map((x, i) => ({ key: 'l' + i, label: x }))));
      b.step('修复结束，**整棵树重新满足所有 B 树性质**：每个非根结点至少 ' + minKeys + ' 个键、所有叶子同层、' +
        '当前叶子 ' + leafCount + ' 个。回顾整体策略 —— 删除永远只发生在叶子上（内部结点靠前驱替换绕开），' +
        '下溢只有三种出路：**借键（O(1)，高度不变）**、**合并（可能级联，但每次级联都让结点数减少，均摊 O(log n)）**、' +
        '**根降层（整棵树变矮）**。',
      cF, { line: 16, milestone: '删除完成，性质全部恢复' });
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
