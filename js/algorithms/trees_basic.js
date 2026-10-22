/* ============================================================
 * 第一卷 · T1 二叉树与多叉树遍历 / T2 BST 基础
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;
  const Lib = TGV.TreeLib = {};

  /* ---------- 通用工具 ---------- */
  Lib.eid = (a, b) => a + '>' + b;

  /** 由层序数组构造二叉树（null 表示空位） */
  Lib.buildLevel = function (arr) {
    const nodes = [], edges = [], map = {};
    arr.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const id = String(v);
      map[i] = { id, key: v, left: null, right: null, idx: i };
      nodes.push({ id, label: String(v), key: v, ord: v });
    });
    const at = i => map[i];
    arr.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const n = map[i];
      const li = 2 * i + 1, ri = 2 * i + 2;
      if (map[li]) { n.left = map[li]; edges.push({ id: Lib.eid(n.id, map[li].id), source: n.id, target: map[li].id }); }
      if (map[ri]) { n.right = map[ri]; edges.push({ id: Lib.eid(n.id, map[ri].id), source: n.id, target: map[ri].id }); }
    });
    return { root: map[0], nodes, edges, at };
  };

  /** 用于面板的节点顺序 */
  Lib.rowOrder = nodes => nodes.map(n => n.id);

  function mkBuilder(meta, nodes, edges, panels) {
    return new TGV.Builder(meta, { nodes: nodes.slice(), edges: edges.slice(), panels });
  }

  function finish(b) {
    return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
  }

  /* ============================================================
   * 1. 先序遍历（递归 / 迭代）
   * ============================================================ */
  const PRE_ARR = [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7];

  const preMeta = {
    id: 'preorder', name: '二叉树先序遍历（递归 / 迭代）', category: '树 · 遍历',
    layout: 'tree', childOrder: 'key',
    panels: [
      { id: 'out', type: 'list', title: '访问序列' },
      { id: 'stk', type: 'stack', title: '函数调用栈 / 显式栈' }
    ],
    pseudocode: [
      '// 递归版：根 → 左 → 右',
      'function preorder(u):',
      '    if u == null: return',
      '    visit(u)                 // ① 访问根',
      '    preorder(u.left)         // ② 递归左子树',
      '    preorder(u.right)        // ③ 递归右子树',
      '// 迭代版：用显式栈模拟，先压右孩子再压左孩子',
      'stack.push(root)',
      'while stack not empty:',
      '    u = stack.pop(); visit(u)',
      '    if u.right: stack.push(u.right)',
      '    if u.left:  stack.push(u.left)'
    ],
    presets: [
      { id: 'rec', label: '递归版 · 标准教学树', desc: '7 结点满二叉树，展示调用栈的压入与弹出', data: () => ({ mode: 'rec', arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'rec2', label: '递归版 · 五层深度树', desc: '11 结点，观察一路向左深入的过程', data: () => ({ mode: 'rec', arr: PRE_ARR }) },
      { id: 'iter', label: '迭代版 · 显式栈', desc: '左孩子后入栈先访问，看到"倒出"顺序', data: () => ({ mode: 'iter', arr: [8, 4, 12, 2, 6, 10, 14] }) }
    ],
    acceptsGraph: false,
    run(input) {
      const tree = Lib.buildLevel(input.arr || [8, 4, 12, 2, 6, 10, 14]);
      const b = mkBuilder(this, tree.nodes, tree.edges, this.panels);
      const rec = input.mode !== 'iter';
      const out = [];
      b.step('先序遍历的规则是 **根 → 左 → 右**：先访问当前结点，再完整地遍历左子树，最后遍历右子树。下面从根结点 ' + tree.root.key + ' 开始。', [], { line: 1 });

      if (rec) {
        (function dfs(u, depth, parent) {
          if (!u) return;
          b.step('进入 `preorder(' + u.key + ')`：把这一层调用压入调用栈（栈深 ' + (depth + 1) + '），局部变量 `u = ' + u.key + '`。', [
            C.push('stk', { label: 'preorder(' + u.key + ')', meta: 'u=' + u.key })
          ], { line: 2, vars: [{ name: 'u', value: u.key }] });
          b.step('检查 `u != null` 成立，继续执行，不会触发 return。', [C.state(u.id, 'active')], { line: 3 });
          out.push(u.key);
          b.step('**访问结点 ' + u.key + '**，把它加入访问序列（第 ' + out.length + ' 个）。', [
            C.state(u.id, 'visited'),
            C.push('out', u.key)
          ], { line: 4, milestone: out.length === 1 ? '访问根结点 ' + u.key : '访问 ' + u.key });
          if (u.left) {
            b.step('沿左指针深入左子树，调用 `preorder(' + u.left.key + ')`。边的方向就是递归下降的方向。', [
              C.pulse(Lib.eid(u.id, u.left.id), { color: '#4F46E5' })
            ], { line: 5 });
            dfs(u.left, depth + 1, u);
          } else {
            b.step('结点 ' + u.key + ' 没有左孩子，跳过第 5 行，直接处理右子树。', [], { line: 5 });
          }
          if (u.right) {
            b.step('左子树已全部遍历完毕，回到 ' + u.key + '，转向右子树 `preorder(' + u.right.key + ')`。', [
              C.pulse(Lib.eid(u.id, u.right.id), { color: '#0EA5E9' })
            ], { line: 6 });
            dfs(u.right, depth + 1, u);
          } else {
            b.step('结点 ' + u.key + ' 没有右孩子，右子树遍历直接结束。', [], { line: 6 });
          }
          b.step('`preorder(' + u.key + ')` 执行完毕，弹栈返回上一层（栈深回到 ' + depth + '）。', [
            C.pop('stk', 1)
          ], { line: 2 });
        })(tree.root, 0, null);
      } else {
        const stack = [];
        b.step('迭代版先准备一个显式栈，把根结点 ' + tree.root.key + ' 压栈。注意：**栈是后进先出**，所以稍后要"先压右、后压左"，才能保证左子树先被访问。', [
          C.setQ('stk', [{ label: 'stack', meta: '空' }]),
          C.q('stk', 'set', [{ label: tree.root.key }]),
          C.state(tree.root.id, 'frontier')
        ], { line: 8 });
        stack.push(tree.root);
        let guard = 0;
        while (stack.length && guard++ < 100) {
          const u = stack.pop();
          b.step('弹出栈顶结点 `' + u.key + '`。栈内剩余：' + (stack.length ? stack.map(x => x.key).join(', ') : '空') + '。', [
            C.pop('stk', 1),
            C.state(u.id, 'active')
          ], { line: 10 });
          out.push(u.key);
          b.step('**访问 ' + u.key + '**，加入访问序列。', [C.state(u.id, 'visited'), C.push('out', u.key)], { line: 10, milestone: out.length === 1 ? '访问根结点 ' + u.key : null });
          if (u.right) {
            stack.push(u.right);
            b.step('因为有右孩子 ' + u.right.key + '，先把它压栈——它会比左孩子更晚被弹出。', [
              C.q('stk', 'push', [{ label: u.right.key }]),
              C.state(u.right.id, 'frontier')
            ], { line: 11 });
          }
          if (u.left) {
            stack.push(u.left);
            b.step('再把左孩子 ' + u.left.key + ' 压栈，它位于栈顶，下一次就会先被弹出访问。', [
              C.q('stk', 'push', [{ label: u.left.key }]),
              C.state(u.left.id, 'frontier')
            ], { line: 12 });
          }
        }
        b.step('栈已空，遍历结束。先序序列：**' + out.join(' → ') + '**。', [], { line: 9, milestone: '遍历完成' });
      }
      return finish(b);
    }
  };
  TGV.register(preMeta);

  /* ============================================================
   * 2. 中序遍历（递归 / 迭代）
   * ============================================================ */
  TGV.register({
    id: 'inorder', name: '二叉树中序遍历（递归 / 迭代）', category: '树 · 遍历',
    layout: 'tree', childOrder: 'key',
    panels: [
      { id: 'out', type: 'list', title: '访问序列' },
      { id: 'stk', type: 'stack', title: '函数调用栈 / 显式栈' }
    ],
    pseudocode: [
      '// 递归版：左 → 根 → 右',
      'function inorder(u):',
      '    if u == null: return',
      '    inorder(u.left)          // ① 先递归左子树',
      '    visit(u)                 // ② 再访问根',
      '    inorder(u.right)         // ③ 最后递归右子树',
      '// 迭代版：一路向左压栈，弹出即访问',
      'cur = root',
      'while cur or stack not empty:',
      '    while cur: stack.push(cur); cur = cur.left',
      '    u = stack.pop(); visit(u)',
      '    cur = u.right'
    ],
    presets: [
      { id: 'rec', label: '递归版 · 标准教学树', desc: '对二叉搜索树做中序，应得到升序序列', data: () => ({ mode: 'rec', arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'iter', label: '迭代版 · 一路向左压栈', desc: '展示"压到底再弹出访问"的经典模式', data: () => ({ mode: 'iter', arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'iter2', label: '迭代版 · 非完全树', desc: '单边树能更清楚看到栈的变化', data: () => ({ mode: 'iter', arr: [5, 3, 8, 1, 4, null, 9] }) }
    ],
    run(input) {
      const tree = Lib.buildLevel(input.arr || [8, 4, 12, 2, 6, 10, 14]);
      const b = mkBuilder(this, tree.nodes, tree.edges, this.panels);
      const rec = input.mode !== 'iter';
      const out = [];
      b.step('中序遍历的规则是 **左 → 根 → 右**。对二叉搜索树而言，中序序列一定单调递增，这也是检验 BST 正确性的最直接方法。', [], { line: 1 });

      if (rec) {
        (function dfs(u, depth) {
          if (!u) return;
          b.step('进入 `inorder(' + u.key + ')`，压入调用栈。', [C.push('stk', { label: 'inorder(' + u.key + ')', meta: 'u=' + u.key })], { line: 2 });
          b.step('`u != null` 成立，先不访问自己，而是**完整地遍历左子树**——这是中序与先序最大的区别。', [C.state(u.id, 'active')], { line: 3 });
          if (u.left) {
            b.step('左孩子是 ' + u.left.key + '，递归下降，' + u.key + ' 的访问必须等待左子树全部完成。', [C.pulse(Lib.eid(u.id, u.left.id), { color: '#4F46E5' })], { line: 4 });
            dfs(u.left, depth + 1);
          } else {
            b.step('没有左孩子，第 4 行无事可做，可以立即访问自己。', [], { line: 4 });
          }
          out.push(u.key);
          b.step('左子树已处理完毕，**现在访问根结点 ' + u.key + '**（第 ' + out.length + ' 个）。', [
            C.state(u.id, 'visited'), C.push('out', u.key)
          ], { line: 5, milestone: out.length === 1 ? '首个访问：' + u.key : null });
          if (u.right) {
            b.step('最后处理右子树 `inorder(' + u.right.key + ')`。', [C.pulse(Lib.eid(u.id, u.right.id), { color: '#0EA5E9' })], { line: 6 });
            dfs(u.right, depth + 1);
          } else {
            b.step('右子树为空，' + u.key + ' 的整个中序遍历完成，弹栈返回。', [C.pop('stk', 1)], { line: 6 });
          }
          if (u.right) b.step('`inorder(' + u.key + ')` 返回，弹栈。', [C.pop('stk', 1)], { line: 2 });
        })(tree.root, 0);
      } else {
        b.step('迭代版的核心是：**不断向左压栈直到为空，然后弹出一个结点访问，再转向它的右子树**。', [], { line: 8 });
        const stack = [];
        let cur = tree.root, guard = 0;
        while ((cur || stack.length) && guard++ < 120) {
          while (cur) {
            stack.push(cur);
            b.step('`cur = ' + cur.key + '` 不为空 → 压栈，继续向左走（`cur = cur.left`）。访问要等它出栈。', [
              C.q('stk', 'push', [{ label: cur.key }]), C.state(cur.id, 'frontier')
            ], { line: 10 });
            cur = cur.left;
          }
          if (!stack.length) break;
          const u = stack.pop();
          out.push(u.key);
          b.step('左边走到头了，弹出栈顶 **' + u.key + '** 并访问——此时它的左子树确实已经全部访问完。', [
            C.pop('stk', 1), C.state(u.id, 'visited'), C.push('out', u.key)
          ], { line: 11, milestone: out.length === 1 ? '首个访问：' + u.key : null });
          if (u.right) {
            b.step('转向右子树：`cur = ' + u.right.key + '`，重复"一路向左"的过程。', [
              C.pulse(Lib.eid(u.id, u.right.id), { color: '#0EA5E9' })
            ], { line: 12 });
          } else {
            b.step('右孩子为空，`cur` 置空，下一轮直接依赖栈中剩余结点。', [], { line: 12 });
          }
          cur = u.right;
        }
        b.step('栈空且 `cur` 为空，遍历结束。中序序列：**' + out.join(' → ') + '**。', [], { line: 9, milestone: '遍历完成' });
      }
      return finish(b);
    }
  });

  /* ============================================================
   * 3. 后序遍历（递归 / 单栈 prev 指针迭代）
   * ============================================================ */
  TGV.register({
    id: 'postorder', name: '二叉树后序遍历（递归 / 单栈迭代）', category: '树 · 遍历',
    layout: 'tree', childOrder: 'key',
    panels: [
      { id: 'out', type: 'list', title: '访问序列' },
      { id: 'stk', type: 'stack', title: '函数调用栈 / 显式栈' }
    ],
    pseudocode: [
      '// 递归版：左 → 右 → 根',
      'function postorder(u):',
      '    if u == null: return',
      '    postorder(u.left)',
      '    postorder(u.right)',
      '    visit(u)                 // 最后才访问根',
      '// 单栈迭代版：用 prev 记录上一个访问的结点',
      'cur = root; prev = null',
      'while cur or stack not empty:',
      '    if cur: stack.push(cur); cur = cur.left',
      '    else:',
      '        top = stack.top',
      '        if top.right and prev != top.right: cur = top.right',
      '        else: visit(top); prev = stack.pop()'
    ],
    presets: [
      { id: 'rec', label: '递归版 · 标准教学树', desc: '根最后访问，适合讲解"自底向上"', data: () => ({ mode: 'rec', arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'iter', label: '单栈 prev 指针迭代版', desc: '用 prev 判断右子树是否已经访问过', data: () => ({ mode: 'iter', arr: [8, 4, 12, 2, 6, 10, 14] }) }
    ],
    run(input) {
      const tree = Lib.buildLevel(input.arr || [8, 4, 12, 2, 6, 10, 14]);
      const b = mkBuilder(this, tree.nodes, tree.edges, this.panels);
      const rec = input.mode !== 'iter';
      const out = [];
      b.step('后序遍历的规则是 **左 → 右 → 根**：父结点的访问必须等两棵子树都完成，因此它是"自底向上"的遍历，常用于释放树、计算子树信息。', [], { line: 1 });
      if (rec) {
        (function dfs(u) {
          if (!u) return;
          b.step('进入 `postorder(' + u.key + ')`。', [C.push('stk', { label: 'postorder(' + u.key + ')', meta: 'u=' + u.key })], { line: 2 });
          b.step('先处理左子树，`' + u.key + '` 自己还远未到访问时机。', [C.state(u.id, 'active')], { line: 3 });
          if (u.left) { b.step('递归左子树 ' + u.left.key + '。', [C.pulse(Lib.eid(u.id, u.left.id), { color: '#4F46E5' })], { line: 4 }); dfs(u.left); }
          if (u.right) { b.step('左子树完成，递归右子树 ' + u.right.key + '。', [C.pulse(Lib.eid(u.id, u.right.id), { color: '#0EA5E9' })], { line: 5 }); dfs(u.right); }
          out.push(u.key);
          b.step('左右子树都已完成，**此时才访问根结点 ' + u.key + '**（第 ' + out.length + ' 个）。', [
            C.state(u.id, 'visited'), C.push('out', u.key)
          ], { line: 6, milestone: out.length === 1 ? '首个访问（最左下的叶子）' : null });
          b.step('`postorder(' + u.key + ')` 返回，弹栈。', [C.pop('stk', 1)], { line: 2 });
        })(tree.root);
      } else {
        const stack = [];
        let cur = tree.root, prev = null, guard = 0;
        b.step('迭代版用一个栈保存路径，再用 `prev` 记住**上一个真正被访问的结点**——它是判断"右子树是否已处理"的关键。', [], { line: 8 });
        while ((cur || stack.length) && guard++ < 160) {
          if (cur) {
            stack.push(cur);
            b.step('`cur = ' + cur.key + '`，压栈并向左下探。', [C.q('stk', 'push', [{ label: cur.key }]), C.state(cur.id, 'frontier')], { line: 10 });
            cur = cur.left;
          } else {
            const top = stack[stack.length - 1];
            if (top.right && prev !== top.right) {
              b.step('栈顶 ' + top.key + ' 有右孩子 ' + top.right.key + '，且尚未访问过（`prev != top.right`），于是转向右子树。', [
                C.state(top.id, 'active'), C.pulse(Lib.eid(top.id, top.right.id), { color: '#0EA5E9' })
              ], { line: 13, vars: [{ name: 'prev', value: prev ? prev.key : 'null' }] });
              cur = top.right;
            } else {
              out.push(top.key);
              b.step('栈顶 ' + top.key + ' 的右子树已处理完（或没有右孩子），**可以访问它了**，并令 `prev = ' + top.key + '`。', [
                C.pop('stk', 1), C.state(top.id, 'visited'), C.push('out', top.key)
              ], { line: 14, vars: [{ name: 'prev', value: top.key }] });
              prev = stack.pop();
            }
          }
        }
        b.step('遍历完成。后序序列：**' + out.join(' → ') + '**。可以看到根结点永远排在最后。', [], { line: 9, milestone: '遍历完成' });
      }
      return finish(b);
    }
  });

  /* ============================================================
   * 4. 层序遍历 BFS
   * ============================================================ */
  TGV.register({
    id: 'levelorder', name: '二叉树层序遍历（BFS 队列）', category: '树 · 遍历',
    layout: 'tree', childOrder: 'key',
    panels: [
      { id: 'q', type: 'queue', title: 'FIFO 队列' },
      { id: 'out', type: 'list', title: '按层输出' }
    ],
    pseudocode: [
      '// 层序遍历：借助先进先出队列逐层扩展',
      'queue.push(root)',
      'while queue not empty:',
      '    sz = queue.size              // 当前层的结点数',
      '    for i in 1..sz:',
      '        u = queue.pop_front()',
      '        visit(u)                 // 该层第 i 个',
      '        if u.left:  queue.push_back(u.left)',
      '        if u.right: queue.push_back(u.right)',
      '    // 一层结束，层号 +1'
    ],
    presets: [
      { id: 'full', label: '满二叉树 · 三层波纹', desc: '观察队列长度按 1→2→4 增长', data: () => ({ arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'deep', label: '非完全树 · 层间差异', desc: '同一层结点数不一致时的队列状态', data: () => ({ arr: [8, 4, 12, 2, 6, null, 14, 1, 3] }) }
    ],
    run(input) {
      const tree = Lib.buildLevel(input.arr || [8, 4, 12, 2, 6, 10, 14]);
      const b = mkBuilder(this, tree.nodes, tree.edges, this.panels);
      b.step('层序遍历按"离根的距离"由近及远访问，必须借助**先进先出队列**：先发现的结点先展开，天然保证同层结点连续输出。', [], { line: 1 });
      b.step('把根结点 ' + tree.root.key + ' 入队。', [C.q('q', 'push', [{ label: tree.root.key }]), C.state(tree.root.id, 'frontier')], { line: 2 });
      const q = [tree.root];
      let layer = 0, counter = 0;
      while (q.length) {
        const sz = q.length;
        b.step('**第 ' + layer + ' 层开始**：队列中恰好有 `sz = ' + sz + '` 个结点，它们都属于同一层。', [], { line: 4, milestone: '进入第 ' + layer + ' 层', stage: true });
        for (let i = 0; i < sz; i++) {
          const u = q.shift();
          b.step('队首出队：' + u.key + '（第 ' + layer + ' 层第 ' + (i + 1) + ' 个）。', [
            C.q('q', 'pop_front'), C.state(u.id, 'active')
          ], { line: 6, vars: [{ name: 'layer', value: layer }, { name: 'i', value: i + 1 }] });
          counter++;
          b.step('访问 ' + u.key + '，写入第 ' + layer + ' 层输出。', [C.state(u.id, 'visited'), C.push('out', { label: u.key, meta: 'L' + layer })], { line: 7 });
          if (u.left) {
            q.push(u.left);
            b.step('左孩子 ' + u.left.key + ' 入队尾。', [C.q('q', 'push', [{ label: u.left.key }]), C.state(u.left.id, 'frontier')], { line: 8 });
          }
          if (u.right) {
            q.push(u.right);
            b.step('右孩子 ' + u.right.key + ' 入队尾。', [C.q('q', 'push', [{ label: u.right.key }]), C.state(u.right.id, 'frontier')], { line: 9 });
          }
        }
        b.step('第 ' + layer + ' 层的 ' + sz + ' 个结点全部访问完毕，队列里留下的是下一层的结点。', [], { line: 10, stage: true });
        layer++;
      }
      b.step('队列为空，共访问 ' + counter + ' 个结点，最大层数 ' + layer + '。层序序列即广度优先序。', [], { line: 3, milestone: '遍历完成' });
      return finish(b);
    }
  });

  /* ============================================================
   * 5. 锯齿形层序遍历
   * ============================================================ */
  TGV.register({
    id: 'zigzag', name: '锯齿形（之字形）层序遍历', category: '树 · 遍历',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'q', type: 'deque', title: '双端队列 Deque' }, { id: 'out', type: 'list', title: '之字形输出' }],
    pseudocode: [
      '// 偶数层从左往右，奇数层从右往左',
      'deque.push_back(root)',
      'layer = 0',
      'while deque not empty:',
      '    sz = deque.size',
      '    for i in 1..sz:',
      '        if layer is even: u = deque.pop_front(); out.append(u)',
      '        else:            u = deque.pop_back();  out.prepend(u)',
      '        if u.left:  deque.push_back(u.left)',
      '        if u.right: deque.push_back(u.right)',
      '    layer += 1'
    ],
    presets: [
      { id: 'full', label: '满二叉树 · 方向翻转', desc: '奇偶层方向交替，用箭头提示当前扫描方向', data: () => ({ arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'deep', label: '四层树', desc: '观察第 3 层反转后的输出顺序', data: () => ({ arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }) }
    ],
    run(input) {
      const tree = Lib.buildLevel(input.arr || [8, 4, 12, 2, 6, 10, 14]);
      const b = mkBuilder(this, tree.nodes, tree.edges, this.panels);
      b.step('之字形层序遍历要求：**第 0 层从左到右、第 1 层从右到左、第 2 层又从左到右**……方向逐层翻转。', [], { line: 1 });
      b.step('根结点入队。', [C.q('q', 'push', [{ label: tree.root.key }]), C.state(tree.root.id, 'frontier')], { line: 2 });
      let layer = 0;
      const q = [tree.root];
      while (q.length) {
        const sz = q.length;
        const dir = layer % 2 === 0 ? '→' : '←';
        b.step('**第 ' + layer + ' 层**，扫描方向 ' + dir + '（' + (layer % 2 === 0 ? '从左往右' : '从右往左') + '），队列中有 ' + sz + ' 个结点。', [], {
          line: 4, milestone: '第 ' + layer + ' 层方向翻转 ' + dir, stage: true
        });
        for (let i = 0; i < sz; i++) {
          const u = (layer % 2 === 0) ? q.shift() : q.pop();
          b.step((layer % 2 === 0 ? '从队首取出 ' : '从队尾取出 ') + u.key + '。', [
            C.q('q', layer % 2 === 0 ? 'pop_front' : 'pop_back'), C.state(u.id, 'active')
          ], { line: layer % 2 === 0 ? 7 : 8 });
          b.step('把 ' + u.key + ' 写入第 ' + layer + ' 层输出' + (layer % 2 === 0 ? '末尾' : '开头') + '。', [
            C.state(u.id, 'visited'), C.push('out', { label: u.key, meta: 'L' + layer })
          ], { line: layer % 2 === 0 ? 7 : 8 });
          if (u.left) { q.push(u.left); b.step('左孩子 ' + u.left.key + ' 依旧压入队尾（孩子层永远从左往右准备）。', [C.q('q', 'push', [{ label: u.left.key }]), C.state(u.left.id, 'frontier')], { line: 9 }); }
          if (u.right) { q.push(u.right); b.step('右孩子 ' + u.right.key + ' 压入队尾。', [C.q('q', 'push', [{ label: u.right.key }]), C.state(u.right.id, 'frontier')], { line: 10 }); }
        }
        layer++;
      }
      b.step('注意一个关键点：**结点入队的顺序永远不变**，翻转的只是"从哪一端读出"。这就是双端队列的妙处。', [], { line: 11, milestone: '遍历完成' });
      return finish(b);
    }
  });

  /* ============================================================
   * 6. Morris 线索化中序遍历（O(1) 空间）
   * ============================================================ */
  TGV.register({
    id: 'morris', name: 'Morris 线索化中序遍历（O(1) 空间）', category: '树 · 遍历',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'out', type: 'list', title: '中序访问序列' }, { id: 'watch', type: 'table', title: '线索状态', columns: [{ key: 'thread', label: 'thread' }, { key: 'cur', label: 'cur' }] }],
    pseudocode: [
      'cur = root',
      'while cur != null:',
      '    if cur.left == null:',
      '        visit(cur); cur = cur.right',
      '    else:',
      '        pre = cur.left',
      '        while pre.right and pre.right != cur: pre = pre.right',
      '        if pre.right == null:',
      '            pre.right = cur          // 建立线索（彩色虚线）',
      '            cur = cur.left',
      '        else:',
      '            pre.right = null         // 拆除线索，恢复原树',
      '            visit(cur); cur = cur.right'
    ],
    presets: [
      { id: 'std', label: '标准教学树 · 线索建立与拆除', desc: '看清临时前驱指针如何搭桥、又如何拆掉', data: () => ({ arr: [8, 4, 12, 2, 6, 10, 14] }) },
      { id: 'left', label: '左偏树 · 线索链较长', desc: '观察 pre 指针一路向右寻找前驱', data: () => ({ arr: [10, 6, 14, 3, 8, 12, null, 1, 4] }) }
    ],
    run(input) {
      const tree = Lib.buildLevel(input.arr || [8, 4, 12, 2, 6, 10, 14]);
      const b = mkBuilder(this, tree.nodes, tree.edges, this.panels);
      b.step('Morris 遍历的野心：**不用栈、不用递归，只用 O(1) 额外空间**完成中序遍历。诀窍是借用叶子结点空着的右指针，临时搭一条"线索"指向中序后继。', [], { line: 1 });
      let cur = tree.root;
      const out = [];
      let guard = 0;
      while (cur && guard++ < 200) {
        b.step('当前 `cur = ' + cur.key + '`。', [C.state(cur.id, 'active')], { line: 2, vars: [{ name: 'cur', value: cur.key }] });
        if (!cur.left) {
          out.push(cur.key);
          b.step(cur.key + ' 没有左孩子 → 它自己就是中序序列的下一个，**直接访问**，然后向右走。', [
            C.state(cur.id, 'visited'), C.push('out', cur.key)
          ], { line: 4 });
          cur = cur.right;
        } else {
          let pre = cur.left;
          b.step('左子树存在，先找它的**中序前驱**：从左孩子出发，一路向右，直到右指针为空或指回 cur。', [C.state(pre.id, 'frontier')], { line: 6 });
          while (pre.right && pre.right !== cur) {
            pre = pre.right;
            b.step('`pre = pre.right` → ' + pre.key + '，继续向右探。', [C.state(pre.id, 'frontier')], { line: 7 });
          }
          if (!pre.right) {
            b.step('找到前驱 **' + pre.key + '**，它的右指针为空。于是**建立线索**：`pre.right = ' + cur.key + '`（彩色虚线），这样将来就能从 ' + pre.key + ' 直接跳回 ' + cur.key + '。', [
              C.arc('th_' + pre.id, pre.id, cur.id, { color: '#8B5CF6', label: 'thread' }),
              C.table('watch', pre.id, 'thread', cur.key, true),
              C.state(pre.id, 'path')
            ], { line: 9, milestone: '建立线索 ' + pre.key + ' → ' + cur.key });
            cur = cur.left;
          } else {
            b.step('前驱 ' + pre.key + ' 的右指针已经指向 ' + cur.key + '，说明**左子树已经遍历完**。拆掉线索恢复原树，然后访问 ' + cur.key + '。', [
              C.clearArc('th_' + pre.id),
              C.table('watch', pre.id, 'thread', '-', true),
              C.state(pre.id, 'default')
            ], { line: 12 });
            out.push(cur.key);
            b.step('**访问 ' + cur.key + '**（第 ' + out.length + ' 个），随后转向右子树。', [
              C.state(cur.id, 'visited'), C.push('out', cur.key)
            ], { line: 13, milestone: out.length === 1 ? '首个访问：' + cur.key : null });
            cur = cur.right;
          }
        }
      }
      b.step('遍历结束：**' + out.join(' → ') + '**。全程没有使用递归栈，所有临时线索都已拆除，树的形状完全复原。', [], { line: 3, milestone: '遍历完成（线索全部拆除）' });
      return finish(b);
    }
  });

  /* ============================================================
   * 7. N 叉树先序遍历
   * ============================================================ */
  TGV.register({
    id: 'nary_preorder', name: 'N 叉树先序遍历', category: '树 · 遍历',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'out', type: 'list', title: '访问序列' }, { id: 'stk', type: 'stack', title: '递归栈' }],
    pseudocode: [
      '// N 叉树：孩子存放在数组 children[] 中',
      'function dfs(u):',
      '    visit(u)',
      '    for each child v in u.children:',
      '        dfs(v)',
      '// 迭代版需要逆序压栈，保证第一个孩子先出栈'
    ],
    presets: [
      { id: 'org', label: '组织架构树（3 叉）', desc: '扇出为 3，观察多孩子如何依次展开', data: () => ({}) }
    ],
    run(input) {
      let nodes, kids;
      if (input && input.edges && input.edges.length) {
        const ids = new Set();
        input.edges.forEach(([p, c]) => { ids.add(String(p)); ids.add(String(c)); });
        nodes = [...ids].map(id => ({ id, label: id, key: id }));
        kids = {};
        nodes.forEach(n => { kids[n.id] = []; });
        input.edges.forEach(([p, c]) => { kids[String(p)].push(String(c)); });
      } else {
        nodes = [
          { id: 'CEO', label: 'CEO', key: 'CEO' },
          { id: 'CTO', label: 'CTO', key: 'CTO' },
          { id: 'CFO', label: 'CFO', key: 'CFO' },
          { id: 'COO', label: 'COO', key: 'COO' },
          { id: 'A', label: '前端', key: 'A' },
          { id: 'B', label: '后端', key: 'B' },
          { id: 'C', label: '算法', key: 'C' },
          { id: 'D', label: '财务', key: 'D' },
          { id: 'E', label: '运营', key: 'E' }
        ];
        kids = {
          CEO: ['CTO', 'CFO', 'COO'], CTO: ['A', 'B', 'C'], CFO: ['D'], COO: ['E'],
          A: [], B: [], C: [], D: [], E: []
        };
      }
      const edges = [];
      Object.keys(kids).forEach(p => kids[p].forEach(c => edges.push({ id: Lib.eid(p, c), source: p, target: c })));
      const b = mkBuilder(this, nodes, edges, this.panels);
      const out = [];
      b.step('N 叉树没有"左右"之分，孩子按数组下标有序。先序遍历依旧是"**先自己，再依次钻进每个孩子**"。', [], { line: 1 });
      (function dfs(u) {
        b.step('进入 dfs(' + u + ')，访问自身。', [C.push('stk', { label: 'dfs(' + u + ')' }), C.state(u, 'active')], { line: 2 });
        out.push(u);
        b.step('**访问 ' + u + '**（第 ' + out.length + ' 个）。', [C.state(u, 'visited'), C.push('out', u) ], { line: 3, milestone: out.length === 1 ? '访问根结点' : null });
        kids[u].forEach((v, i) => {
          b.step('处理第 ' + (i + 1) + ' 个孩子 ' + v + '。', [C.pulse(Lib.eid(u, v), { color: '#4F46E5' })], { line: 4 });
          dfs(v);
        });
        b.step('dfs(' + u + ') 的所有孩子处理完毕，返回到父结点。', [C.pop('stk', 1)], { line: 2 });
      })(input.start != null ? String(input.start) : 'CEO');
      b.step('先序序列：**' + out.join(' → ') + '**。与二叉树唯一的不同是：这里有 for 循环依次处理多个孩子。', [], { line: 6, milestone: '遍历完成' });
      return finish(b);
    }
  });

  /* ============================================================
   * BST 工具
   * ============================================================ */
  function BST() { this.root = null; this.map = {}; this.edges = {}; }
  BST.prototype.add = function (key, cmds) {
    const id = String(key);
    const nd = { id, key, left: null, right: null };
    this.map[id] = nd;
    if (cmds) cmds.push(C.addNode(id, id, { key, ord: key }));
    return nd;
  };
  BST.prototype.link = function (p, c, cmds) {
    const id = Lib.eid(p.id, c.id);
    if (!this.edges[id]) {
      this.edges[id] = { id, source: p.id, target: c.id };
      cmds.push(C.addEdge(id, p.id, c.id));
    }
  };
  BST.prototype.unlink = function (p, c, cmds) {
    const id = Lib.eid(p.id, c.id);
    if (this.edges[id]) {
      delete this.edges[id];
      cmds.push(C.removeEdge(id));
    }
  };
  BST.prototype.edgeList = function () { return Object.keys(this.edges).map(k => this.edges[k]); };
  BST.prototype.nodes = function () {
    const out = [];
    Object.keys(this.map).forEach(id => out.push({ id, label: id, key: this.map[id].key, ord: this.map[id].key }));
    return out;
  };
  BST.prototype.height = function (n) {
    if (!n) return 0;
    return 1 + Math.max(this.height(n.left), this.height(n.right));
  };

  function bstBuild(keys) {
    const t = new BST();
    keys.forEach(k => {
      const n = t.add(k, []);
      if (!t.root) { t.root = n; return; }
      let cur = t.root;
      while (true) {
        if (k < cur.key) { if (!cur.left) { cur.left = n; t.link(cur, n, []); break; } cur = cur.left; }
        else { if (!cur.right) { cur.right = n; t.link(cur, n, []); break; } cur = cur.right; }
      }
    });
    return t;
  }

  /* ============================================================
   * 8. BST 插入
   * ============================================================ */
  TGV.register({
    id: 'bst_insert', name: '二叉搜索树 · 插入', category: '树 · 二叉搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'walk', type: 'list', title: '比较路径' }],
    pseudocode: [
      '// 插入 key：一路比较，找到空位挂上新结点',
      'function insert(root, key):',
      '    if root == null: return new Node(key)',
      '    cur = root; parent = null',
      '    while cur != null:',
      '        parent = cur',
      '        if key < cur.key: cur = cur.left      // 小则向左',
      '        else:             cur = cur.right     // 大则向右',
      '    if key < parent.key: parent.left = new Node(key)',
      '    else:                parent.right = new Node(key)'
    ],
    presets: [
      { id: 'p1', label: '标准插入 45', desc: '已有 8 个结点的树中插入 45', data: () => ({ keys: [50, 30, 70, 20, 40, 60, 80, 35], insert: 45 }) },
      { id: 'p2', label: '退化链插入', desc: '升序插入会退化成链表', data: () => ({ keys: [10, 20, 30], insert: 40 }) },
      { id: 'p3', label: '插入为根', desc: '空树直接建根', data: () => ({ keys: [], insert: 42 }) },
      { id: 'p4', label: '插入小值', desc: '一路向左找到空位', data: () => ({ keys: [50, 30, 70, 20, 40], insert: 10 }) }
    ],
    run(input) {
      const keys = input.keys || [];
      const key = input.insert != null ? input.insert : 45;
      const t = bstBuild(keys);
      const b = mkBuilder(this, t.nodes(), t.edgeList(), this.panels);
      const nodeCmds = [];
      const nn = t.add(key, nodeCmds);
      b.step('目标：在二叉搜索树中插入 ' + key + '。BST 的性质是 **左子树全部小于根、右子树全部大于根**，所以插入位置由比较结果唯一确定。', [], { line: 1, vars: [{ name: 'key', value: key }] });
      if (!t.root) {
        t.root = nn;
        b.step('当前是空树，新结点 ' + key + ' 直接成为根结点。', nodeCmds.concat([C.state(nn.id, 'active')]), { line: 3, milestone: '插入为根结点' });
        b.step('插入完成，树的规模 +1。', [C.state(nn.id, 'visited')], { line: 3 });
        return finish(b);
      }
      let cur = t.root, parent = null, guard = 0;
      b.step('从根结点 ' + cur.key + ' 开始比较。', [C.state(cur.id, 'active')], { line: 4 });
      while (cur && guard++ < 60) {
        parent = cur;
        b.step('比较：`' + key + '` ' + (key < cur.key ? '<' : '>') + ' `' + cur.key + '`，应该往' + (key < cur.key ? '左' : '右') + '走。', [
          C.state(cur.id, 'visited'), C.push('walk', key + (key < cur.key ? ' < ' : ' > ') + cur.key)
        ], { line: key < cur.key ? 7 : 8, vars: [{ name: 'key', value: key }, { name: 'cur', value: cur.key }] });
        const next = key < cur.key ? cur.left : cur.right;
        if (!next) { b.step((key < cur.key ? '左' : '右') + '孩子为空 —— 这就是新结点 ' + key + ' 应该挂载的位置。', [], { line: 9 }); break; }
        b.step('继续下降到 ' + next.key + '。', [C.pulse(Lib.eid(cur.id, next.id), { color: '#4F46E5' }), C.state(next.id, 'active')], { line: key < cur.key ? 7 : 8 });
        cur = next;
      }
      if (key < parent.key) parent.left = nn; else parent.right = nn;
      b.step('把新结点 ' + key + ' 作为 **' + parent.key + ' 的' + (key < parent.key ? '左' : '右') + '孩子** 挂上去，BST 性质依旧成立（不需要任何旋转）。', [
        ...nodeCmds, C.addEdge(Lib.eid(parent.id, nn.id), parent.id, nn.id), C.state(nn.id, 'active')
      ], { line: key < parent.key ? 9 : 10, milestone: '挂载新结点 ' + key });
      b.step('插入完成。当前树高 = ' + t.height(t.root) + '。若插入序列本身有序，树会退化成链，查找退化为 O(n)——这正是 AVL / 红黑树要解决的问题。', [
        C.state(nn.id, 'visited')
      ], { line: 10 });
      return finish(b);
    }
  });

  /* ============================================================
   * 9. BST 查找
   * ============================================================ */
  TGV.register({
    id: 'bst_search', name: '二叉搜索树 · 查找', category: '树 · 二叉搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'walk', type: 'list', title: '比较路径' }],
    pseudocode: [
      'function search(root, target):',
      '    cur = root',
      '    while cur != null:',
      '        if target == cur.key: return cur     // 命中',
      '        if target < cur.key:  cur = cur.left',
      '        else:                 cur = cur.right',
      '    return null                              // 未找到'
    ],
    presets: [
      { id: 'hit', label: '命中：查找 60', desc: '两次比较即命中', data: () => ({ keys: [50, 30, 70, 20, 40, 60, 80], target: 60 }) },
      { id: 'miss', label: '未命中：查找 65', desc: '走到空指针才失败', data: () => ({ keys: [50, 30, 70, 20, 40, 60, 80], target: 65 }) },
      { id: 'deep', label: '深路径：查找 15', desc: '层层向左，展示比较次数', data: () => ({ keys: [50, 30, 70, 20, 40, 60, 80, 10, 25, 15], target: 15 }) }
    ],
    run(input) {
      const t = bstBuild(input.keys || []);
      const target = input.target != null ? input.target : 60;
      const b = mkBuilder(this, t.nodes(), t.edgeList(), this.panels);
      b.step('在 BST 中查找 ' + target + '：每比较一次就能**排除一半的子树**，这是 O(h) 查找效率的来源。', [], { line: 1 });
      let cur = t.root, cmp = 0, guard = 0;
      while (cur && guard++ < 60) {
        cmp++;
        b.step('第 ' + cmp + ' 次比较：`' + target + '` ' + (target === cur.key ? '==' : (target < cur.key ? '<' : '>')) + ' `' + cur.key + '`。', [
          C.state(cur.id, 'active'), C.push('walk', '第' + cmp + '次: ' + target + ' vs ' + cur.key)
        ], { line: 4, vars: [{ name: 'target', value: target }, { name: 'cur', value: cur.key }] });
        if (target === cur.key) {
          b.step('**命中！** 共比较 ' + cmp + ' 次。查找成功，返回该结点。', [C.state(cur.id, 'path')], { line: 4, milestone: '命中 ' + target + '（' + cmp + ' 次比较）' });
          return finish(b);
        }
        const next = target < cur.key ? cur.left : cur.right;
        b.step((target < cur.key ? '目标更小 → 丢弃整个右子树，向左走。' : '目标更大 → 丢弃整个左子树，向右走。'), [
          C.state(cur.id, 'visited')
        ], { line: target < cur.key ? 5 : 6 });
        if (next) b.step('进入 ' + next.key + '。', [C.pulse(Lib.eid(cur.id, next.id), { color: '#4F46E5' })], { line: target < cur.key ? 5 : 6 });
        cur = next;
      }
      b.step('走到空指针，说明 **' + target + ' 不在树中**。共比较 ' + cmp + ' 次。', [], { line: 7, milestone: '查找失败' });
      return finish(b);
    }
  });

  /* ============================================================
   * 10. BST 删除（三种情况全覆盖）
   * ============================================================ */
  TGV.register({
    id: 'bst_delete', name: '二叉搜索树 · 删除（三种情况）', category: '树 · 二叉搜索树',
    layout: 'tree', childOrder: 'key',
    panels: [{ id: 'note', type: 'text', title: '当前处理的情况' }],
    pseudocode: [
      'function delete(root, key):',
      '    u = find(root, key)',
      '    // 情况 1：叶子结点 → 直接摘除',
      '    // 情况 2：只有一个孩子 → 子承父业',
      '    // 情况 3：两个孩子 → 找中序后继替换后转删后继',
      '    if u.left == null: return transplant(u, u.right)',
      '    if u.right == null: return transplant(u, u.left)',
      '    s = min(u.right)                 // 中序后继',
      '    u.key = s.key                    // 复制键值',
      '    u.right = delete(u.right, s.key) // 递归删除后继结点'
    ],
    presets: [
      { id: 'leaf', label: '情况 1 · 删除叶子 20', desc: '叶子直接摘除，最简情形', data: () => ({ keys: [50, 30, 70, 20, 40, 60, 80], del: 20 }) },
      { id: 'one', label: '情况 2 · 删除单孩子结点 30', desc: '孩子顶替父位', data: () => ({ keys: [50, 30, 70, 20, 40], del: 30 }) },
      { id: 'two', label: '情况 3 · 删除双子结点 50', desc: '找中序后继替换，再转删后继（重点）', data: () => ({ keys: [50, 30, 70, 20, 40, 60, 80], del: 50 }) },
      { id: 'root', label: '情况 3 · 删除根 30（后继有右孩子）', desc: '后继自身带右子树时的接枝', data: () => ({ keys: [30, 20, 50, 40, 60, 55], del: 30 }) }
    ],
    run(input) {
      const keys = input.keys || [];
      const del = input.del;
      const t = bstBuild(keys);
      const b = mkBuilder(this, t.nodes(), t.edgeList(), this.panels);
      const parentOf = (n) => {
        if (!n || n === t.root) return null;
        let cur = t.root, guard = 0;
        while (cur && guard++ < 100) {
          if (cur.left === n || cur.right === n) return cur;
          cur = n.key < cur.key ? cur.left : cur.right;
        }
        return null;
      };
      b.step('删除比插入复杂：必须**保持 BST 的有序性**。先定位结点，再按孩子数量分三种情况处理。本次删除目标：' + del + '。', [], { line: 1, vars: [{ name: 'key', value: del }] });
      let u = t.root, guard = 0;
      while (u && u.key !== del && guard++ < 60) {
        b.step('比较 ' + del + ' 与 ' + u.key + '，向' + (del < u.key ? '左' : '右') + '下降。', [C.state(u.id, 'active')], { line: 2 });
        u = del < u.key ? u.left : u.right;
      }
      if (!u) {
        b.step('树中不存在 ' + del + '，无需删除。', [], { line: 2 });
        return finish(b);
      }
      b.step('**定位到待删结点 ' + del + '**。', [C.state(u.id, 'path')], { line: 2, milestone: '定位待删结点 ' + del });
      const p = parentOf(u);
      if (!u.left && !u.right) {
        b.step('**情况 1：叶子结点**。它没有任何子树需要照顾，直接从父结点 ' + (p ? p.key : '（无）') + ' 上摘掉即可。', [C.state(u.id, 'conflict')], { line: 3, milestone: '情况 1：删除叶子' });
        if (p) { if (p.left === u) p.left = null; else p.right = null; t.unlink(p, u, []); }
        else t.root = null;
        const cmds = [C.removeNode(u.id)];
        if (p) { const eid = Lib.eid(p.id, u.id); delete t.edges[eid]; }
        delete t.map[u.id];
        b.step('删除完成，其余结点的相对位置完全不变。', cmds, { line: 3 });
          return finish(b);
      }
      if (!u.left || !u.right) {
        const child = u.left || u.right;
        b.step('**情况 2：只有一个孩子 ' + child.key + '**。让孩子"子承父业"，直接接到 ' + (p ? p.key : '根位置') + ' 上。', [
          C.state(u.id, 'conflict'), C.state(child.id, 'active')
        ], { line: 4, milestone: '情况 2：子承父业' });
        if (p) {
          t.unlink(p, u, []);
          if (p.left === u) p.left = child; else p.right = child;
        } else t.root = child;
        const eid = Lib.eid(u.id, child.id);
        delete t.edges[eid];
        delete t.map[u.id];
        const cmds = [C.removeNode(u.id)];
        if (p) cmds.push(C.addEdge(Lib.eid(p.id, child.id), p.id, child.id));
        b.step('摘下 ' + u.key + '，把 ' + child.key + ' 挂到原位置，BST 性质依然成立。', cmds, { line: 4 });
          return finish(b);
      }
      // 两个孩子
      b.step('**情况 3：有两个孩子**。不能简单摘除——必须找一个"替身"。最佳替身是**中序后继**：右子树中的最小结点，它比左子树所有结点都大、又比右子树其余结点都小。', [
        C.state(u.id, 'conflict')
      ], { line: 5, milestone: '情况 3：寻找中序后继' });
      let sp = u, s = u.right;
      b.step('从右孩子 ' + s.key + ' 出发，一路向左找最小值。', [C.state(s.id, 'active')], { line: 8 });
      while (s.left) {
        sp = s; s = s.left;
        b.step('还有左孩子 → 继续向左：' + s.key + '。', [C.state(s.id, 'active')], { line: 8 });
      }
      b.step('**中序后继是 ' + s.key + '**。做法：把它的键值复制到待删结点，问题就转化为"删除 ' + s.key + '"——而后继最多只有一个右孩子。', [
        C.state(s.id, 'path'), C.state(u.id, 'frontier')
      ], { line: 9, milestone: '后继 = ' + s.key });
      const oldKey = u.key;
      u.key = s.key;
      const cmds = [C.badge(u.id, 'key', s.key)];
      // 结点标签无法直接改，这里用 badge 标注
      b.step('把 ' + s.key + ' 复制到原 ' + oldKey + ' 的位置（角标显示新键值）。', cmds, { line: 9 });
      if (s.right) {
        b.step('后继 ' + s.key + ' 还有一个右孩子 ' + s.right.key + '，让它代替后继的位置。', [C.state(s.right.id, 'active')], { line: 10 });
      }
      if (sp.left === s) sp.left = s.right; else sp.right = s.right;
      if (s.right) { delete t.edges[Lib.eid(s.id, s.right.id)]; }
      delete t.edges[Lib.eid(sp.id, s.id)];
      delete t.map[s.id];
      const rm = [C.removeNode(s.id)];
      if (s.right) rm.push(C.addEdge(Lib.eid(sp.id, s.right.id), sp.id, s.right.id));
      b.step('删除后继结点 ' + s.key + '（这是情况 1 或情况 2，一步完成）。整棵树的有序性完全保留。', rm, { line: 10, milestone: '删除完成' });
      return finish(b);
    }
  });

})();
