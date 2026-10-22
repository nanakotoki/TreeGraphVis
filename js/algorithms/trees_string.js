/* ============================================================
 * 第一卷 · T5 字符串树 / 前缀结构 / 自动机 + 哈夫曼树
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* ============================================================
   * Trie 字典树
   * ============================================================ */
  TGV.register({
    id: 'trie', name: '字典树 Trie · 插入与前缀匹配', category: '树 · 字符串树',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'out', type: 'list', title: '操作结果' }],
    pseudocode: [
      '// 从根出发，沿字符边走；不存在的边就新建结点',
      'insert(word):',
      '    u = root',
      '    for ch in word:',
      '        if child(u, ch) == null:',
      '            child(u, ch) = new Node(ch)',
      '        u = child(u, ch)',
      '    u.isEnd = true                     // 单词结尾打标记',
      'search(word): 走完 word，返回 u != null and u.isEnd',
      'startsWith(pre): 走完 pre，返回 u != null'
    ],
    presets: [
      { id: 'ins', label: '构建 ["cat","car","card","do","dog"]', desc: '观察共享前缀如何复用结点', data: () => ({ words: ['cat', 'car', 'card', 'do', 'dog'], query: 'card' }) },
      { id: 'pref', label: '前缀查询 "ca"', desc: '前缀匹配不需要 isEnd 标记', data: () => ({ words: ['cat', 'car', 'card', 'do', 'dog'], query: 'ca', prefix: true }) },
      { id: 'miss', label: '查找不存在的 "cab"', desc: '走到空指针即失败', data: () => ({ words: ['cat', 'car', 'card', 'do', 'dog'], query: 'cab' }) }
    ],
    run(input) {
      const words = input.words || [];
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      let idc = 0;
      const all = [];
      const root = { id: 'T0', ch: '·', children: {}, end: false };
      all.push(root);
      const nodeDefs = () => all.map(n => ({ id: n.id, label: n.id === 'T0' ? '·' : n.ch, key: n.id === 'T0' ? 0 : n.ch, ord: n.id === 'T0' ? 0 : n.ch.charCodeAt(0) }));
      const edgeList = () => {
        const out = [];
        all.forEach(n => Object.keys(n.children).forEach(ch => {
          const c = n.children[ch];
          out.push({ id: n.id + '>' + c.id, source: n.id, target: c.id });
        }));
        return out;
      };
      b.nodes = nodeDefs();
      b.step('字典树把**公共前缀压缩成共享路径**：`cat` 与 `card` 共用 `ca`，`car` 与 `card` 共用 `car`。每个结点代表一个前缀。', [], { line: 1 });
      let created = 0;
      words.forEach(w => {
        b.step('**插入 "' + w + '"**', [], { line: 2, vars: [{ name: 'word', value: w }], stage: true });
        let u = root;
        for (const ch of w) {
          if (!u.children[ch]) {
            const nd = { id: 'T' + (++idc), ch, children: {}, end: false };
            all.push(nd);
            u.children[ch] = nd;
            created++;
            b.step('不存在字符边 `' + ch + '` → 新建结点 ' + nd.id + '，挂在 ' + u.id + ' 下。', [
              C.addNode(nd.id, ch, { key: ch.charCodeAt(0), ord: ch.charCodeAt(0) }),
              C.addEdge(u.id + '>' + nd.id, u.id, nd.id),
              C.state(nd.id, 'active')
            ], { line: 6, milestone: '新建结点 ' + ch });
          } else {
            b.step('字符边 `' + ch + '` 已存在 → **复用**已有结点 ' + u.children[ch].id + '，这就是前缀共享。', [
              C.pulse(u.id + '>' + u.children[ch].id, { color: '#4F46E5' }), C.state(u.children[ch].id, 'active')
            ], { line: 5 });
          }
          u = u.children[ch];
          C.state(u.id, 'visited');
        }
        u.end = true;
        b.step('word 结束，把结点 ' + u.id + ' 标记为**单词结尾**（isEnd = true，画布上用双环高亮表示）。', [
          C.state(u.id, 'path')
        ], { line: 8, milestone: '标记单词结尾：' + w });
      });
      b.step('全部插入完成，共创建 ' + (all.length - 1) + ' 个结点（其中 ' + created + ' 个是本轮新建）。若不共享前缀，5 个单词需要 3+3+4+2+3 = 15 个结点。', [], { line: 1 });
      // 查询
      const q = input.query;
      b.step('**查询 "' + q + '"**（' + (input.prefix ? '前缀查询' : '完全匹配') + '）。', [], { line: 9, vars: [{ name: 'query', value: q }], stage: true });
      let cur = root, ok = true;
      for (const ch of q) {
        if (!cur.children[ch]) {
          ok = false;
          b.step('在结点 ' + cur.id + ' 上找不到字符边 `' + ch + '` → **查询失败**。', [], { line: 9, milestone: '未找到' });
          break;
        }
        const nxt = cur.children[ch];
        b.step('沿 `' + ch + '` 走到结点 ' + nxt.id + '。', [
          C.pulse(cur.id + '>' + nxt.id, { color: '#4F46E5' }),
          C.state(nxt.id, 'active')
        ], { line: 9 });
        cur = nxt;
      }
      if (ok) {
        if (input.prefix) b.step('前缀 `' + q + '` 存在，以它为前缀的所有单词都在结点 ' + cur.id + ' 的子树里。', [C.state(cur.id, 'path')], { line: 10, milestone: '前缀存在' });
        else if (cur.end) b.step('走完整个单词且 `isEnd = true` → **完全匹配成功**。', [C.state(cur.id, 'path')], { line: 9, milestone: '完全匹配成功' });
        else b.step('路径存在，但 `isEnd = false` → 它只是某个更长单词的前缀，不算命中。', [C.state(cur.id, 'conflict')], { line: 9, milestone: '仅前缀，不构成单词' });
      }
      b.nodes = nodeDefs();
      b.edges = edgeList();
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * AC 自动机
   * ============================================================ */
  TGV.register({
    id: 'ac_automaton', name: 'AC 自动机 · fail 指针与多模式匹配', category: '树 · 字符串树',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'q', type: 'queue', title: 'BFS 队列（构建 fail）' }, { id: 'out', type: 'list', title: '命中模式串' }],
    pseudocode: [
      '// 阶段 1：把模式串插入 Trie',
      '// 阶段 2：BFS 逐层建立失配指针 fail',
      'build_fail():',
      '    根的孩子 fail = 根，全部入队',
      '    while 队列非空:',
      '        u = pop(); for ch in u.children:',
      '            v = u.children[ch]; f = fail[u]',
      '            while f and f 没有 ch 边: f = fail[f]',
      '            fail[v] = f 的 ch 边 (或根)',
      '// 阶段 3：主串扫描，失配就沿 fail 跳',
      'for ch in text:',
      '    while u 没有 ch 边 and u != root: u = fail[u]',
      '    u = 沿 ch 边走; 沿 fail 链收集所有命中的模式串'
    ],
    presets: [
      { id: 'p1', label: '模式 {he, she, his, hers}，主串 ushers', desc: '经典教学样例，命中 she / he / hers', data: () => ({ patterns: ['he', 'she', 'his', 'hers'], text: 'ushers' }) },
      { id: 'p2', label: '模式 {a, ab, bab, bc, bca, c, caa}，主串 abccab', desc: '更多 fail 跳转', data: () => ({ patterns: ['a', 'ab', 'bab', 'bc', 'bca', 'c', 'caa'], text: 'abccab' }) }
    ],
    run(input) {
      const pats = input.patterns || [];
      const text = input.text || '';
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      let idc = 0;
      const all = [];
      const root = { id: 'A0', ch: '·', children: {}, fail: null, depth: 0, end: [] };
      all.push(root);
      const nodeDefs = () => all.map(n => ({ id: n.id, label: n.id === 'A0' ? '·' : n.ch, key: n.id === 'A0' ? 0 : n.ch.charCodeAt(0) + n.depth * 100, ord: n.id === 'A0' ? 0 : n.ch.charCodeAt(0) + n.depth * 100 }));
      const edgeList = () => {
        const out = [];
        all.forEach(n => Object.keys(n.children).forEach(ch => {
          const c = n.children[ch];
          out.push({ id: n.id + '>' + c.id, source: n.id, target: c.id });
        }));
        return out;
      };
      // 阶段 1
      b.step('**阶段 1：构建 Trie**。把 ' + pats.length + ' 个模式串全部插入字典树，单词结尾结点记录命中的模式。', [], { line: 1 });
      pats.forEach(p => {
        b.step('**插入模式串 "' + p + '"**', [], { line: 1, vars: [{ name: 'pattern', value: p }], stage: true });
        let u = root;
        for (const ch of p) {
          if (!u.children[ch]) {
            const nd = { id: 'A' + (++idc), ch, children: {}, fail: null, depth: u.depth + 1, end: [] };
            all.push(nd);
            u.children[ch] = nd;
            b.step('新建结点 ' + ch + '（' + nd.id + '）。', [
              C.addNode(nd.id, ch, { key: ch.charCodeAt(0) + nd.depth * 100, ord: ch.charCodeAt(0) + nd.depth * 100 }),
              C.addEdge(u.id + '>' + nd.id, u.id, nd.id), C.state(nd.id, 'active')
            ], { line: 1 });
          } else {
            b.step('字符 `' + ch + '` 边已存在，复用结点 ' + u.children[ch].id + '。', [C.state(u.children[ch].id, 'active')], { line: 1 });
          }
          u = u.children[ch];
        }
        u.end.push(p);
        b.step('结点 ' + u.id + ' 标记为模式串 "' + p + '" 的结尾。', [C.state(u.id, 'path'), C.badge(u.id, 'end', p)], { line: 1, milestone: '结束标记 "' + p + '"' });
      });

      // 阶段 2：BFS 建立 fail
      b.step('**阶段 2：BFS 逐层建立失配指针 `fail`**。`fail[v]` 表示"当 v 处匹配失败时，应该退回到哪个结点继续匹配"——它指向 v 的最长真后缀。', [], { line: 2, milestone: '开始构建 fail 指针', stage: true });
      const q = [];
      Object.keys(root.children).forEach(ch => {
        const c = root.children[ch];
        c.fail = root;
        q.push(c);
        b.step('根的孩子 ' + c.ch + '（' + c.id + '）的 fail 指向根——因为它们没有更短的真后缀。入队。', [
          C.q('q', 'push', [{ label: c.ch }]), C.arc('f_' + c.id, c.id, root.id, { color: '#94A3B8', label: 'fail', curve: 30 })
        ], { line: 4 });
      });
      while (q.length) {
        const u = q.shift();
        b.step('出队 ' + u.ch + '（' + u.id + '），处理它的所有孩子。', [C.q('q', 'pop_front'), C.state(u.id, 'active')], { line: 6 });
        Object.keys(u.children).forEach(ch => {
          const v = u.children[ch];
          let f = u.fail;
          while (f && !f.children[ch]) f = f.fail;
          v.fail = (f && f.children[ch] && f.children[ch] !== v) ? f.children[ch] : root;
          q.push(v);
          b.step('子结点 `' + ch + '`（' + v.id + '）：从父的 fail (' + (u.fail ? u.fail.id : '-') + ') 出发沿 fail 链向上找，找到拥有 `' + ch + '` 边的祖先 → **fail[' + v.id + '] = ' + (v.fail === root ? '根' : v.fail.id) + '**。', [
            C.arc('f_' + v.id, v.id, v.fail.id, { color: '#8B5CF6', label: 'fail', curve: 38 }),
            C.q('q', 'push', [{ label: ch }]),
            C.state(v.id, 'visited')
          ], { line: 9, milestone: 'fail[' + ch + '] → ' + (v.fail === root ? 'root' : v.fail.ch) });
        });
      }
      b.step('fail 指针全部建好（画布上的紫色虚线弧）。它们构成一棵"失配树"：沿 fail 链向上，就是不断丢弃前缀、寻找更短后缀的过程。', [], { line: 9, milestone: 'fail 构建完成' });

      // 阶段 3
      b.step('**阶段 3：主串扫描 "' + text + '"**', [], { line: 10, milestone: '开始扫描主串', stage: true });
      let u = root;
      const hits = [];
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        b.step('读入第 ' + (i + 1) + ' 个字符 `' + ch + '`，当前位于结点 ' + u.id + '。', [], { line: 11, vars: [{ name: 'i', value: i }, { name: 'ch', value: ch }], stage: false });
        let guard = 0;
        while (u !== root && !u.children[ch] && guard++ < 20) {
          b.step('结点 ' + u.id + ' 没有 `' + ch + '` 边 → **沿 fail 跳到 ' + (u.fail === root ? '根' : u.fail.id) + '**。', [
            C.pulse('f_' + u.id, { color: '#8B5CF6', direction: 'reverse' })
          ], { line: 12, vars: [{ name: 'u', value: u.id }] });
          u = u.fail;
        }
        if (u.children[ch]) {
          u = u.children[ch];
          b.step('沿 `' + ch + '` 边进入结点 ' + u.id + '。', [C.state(u.id, 'active')], { line: 13 });
        } else {
          b.step('根也没有 `' + ch + '` 边，停留在根。', [], { line: 13 });
        }
        // 收集命中
        let t = u;
        const found = [];
        let g2 = 0;
        while (t && g2++ < 20) {
          t.end.forEach(p => found.push({ p, at: i - p.length + 1 }));
          t = t === root ? null : t.fail;
        }
        if (found.length) {
          const cm = [];
          found.forEach(f => { hits.push(f.p + ' @' + f.at); cm.push(C.push('out', f.p + ' @' + f.at)); cm.push(C.state(u.id, 'path')); });
          b.step('沿 fail 链收集命中：**' + found.map(f => '"' + f.p + '"（位置 ' + f.at + '）').join('、') + '**。', cm, { line: 13, milestone: '命中 ' + found.map(f => f.p).join('/') });
        }
      }
      b.step('扫描结束，共命中 ' + hits.length + ' 次：' + (hits.join('、') || '无') + '。AC 自动机的复杂度是 O(总模式长度 + 主串长度 + 命中次数)，与模式串数量无关。', [], { line: 13, milestone: '匹配完成' });
      b.nodes = nodeDefs();
      b.edges = edgeList();
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 哈夫曼树
   * ============================================================ */
  TGV.register({
    id: 'huffman', name: '哈夫曼树与最优前缀编码', category: '树 · 字符串树',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'pool', type: 'list', title: '待合并森林（按频率升序）' }, { id: 'code', type: 'table', title: '哈夫曼编码表', columns: [{ key: 'freq', label: '频率' }, { key: 'code', label: '编码' }] }],
    pseudocode: [
      '// 每次取频率最小的两棵树合并，新树频率 = 两者之和',
      'heap = 所有字符结点（按频率建小根堆）',
      'while heap.size > 1:',
      '    a = heap.pop(); b = heap.pop()       // 两个最小',
      '    node = new Node(freq = a.freq + b.freq)',
      '    node.left = a; node.right = b',
      '    heap.push(node)',
      '// 从根出发：左 0，右 1，得到每个字符的编码',
      'encode(root, prefix):',
      '    if 叶子: code[ch] = prefix',
      '    else: encode(left, prefix + "0"); encode(right, prefix + "1")'
    ],
    presets: [
      { id: 'p1', label: '经典样例 A~F', desc: '频率 5,9,12,13,16,45', data: () => ({ items: [['A', 5], ['B', 9], ['C', 12], ['D', 13], ['E', 16], ['F', 45]] }) },
      { id: 'p2', label: '英文句子字频', desc: '9 个字符的频率分布', data: () => ({ items: [['e', 45], ['t', 32], ['a', 28], ['o', 25], ['i', 20], ['n', 18], ['s', 12], ['h', 8], ['r', 5]] }) }
    ],
    run(input) {
      const items = input.items || [];
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      let idc = 0;
      const all = [];
      const forest = [];
      items.forEach(([ch, f]) => {
        const n = { id: 'H' + (++idc), ch, freq: f, left: null, right: null };
        all.push(n);
        forest.push(n);
      });
      const nodeDefs = () => all.map(n => ({ id: n.id, label: n.ch, key: n.freq, ord: n.idx || 0 }));
      const edgeList = () => {
        const out = [];
        all.forEach(n => {
          if (n.left) out.push({ id: n.id + '>' + n.left.id, source: n.id, target: n.left.id, label: '0' });
          if (n.right) out.push({ id: n.id + '>' + n.right.id, source: n.id, target: n.right.id, label: '1' });
        });
        return out;
      };
      b.nodes = nodeDefs();
      const bd = [];
      all.forEach(n => bd.push(C.badge(n.id, 'f', n.freq)));
      b.step('哈夫曼编码的核心思想：**让高频字符用短码、低频字符用长码**。每次取出频率最小的两棵树合并，正是贪心策略。', bd, { line: 1 });

      const listCmds = () => C.setQ('pool', forest.slice().sort((x, y) => x.freq - y.freq).map(n => ({ label: (n.ch || '*') + ':' + n.freq })));
      b.step('初始森林：每个字符都是一棵单结点树，按频率升序排列在右侧。', [listCmds()], { line: 2, milestone: '初始化森林' });

      let guard = 0;
      while (forest.length > 1 && guard++ < 30) {
        forest.sort((x, y) => x.freq - y.freq);
        const a = forest.shift(), c = forest.shift();
        const node = { id: 'H' + (++idc), ch: '', freq: a.freq + c.freq, left: a, right: c };
        all.push(node);
        forest.push(node);
        b.step('取出频率最小的两棵树：**' + (a.ch || '*') + '(' + a.freq + ')** 与 **' + (c.ch || '*') + '(' + c.freq + ')**，合并为新结点，频率 = ' + node.freq + '。', [
          C.addNode(node.id, '', { key: node.freq, ord: node.freq }),
          C.badge(node.id, 'f', node.freq),
          C.addEdge(node.id + '>' + a.id, node.id, a.id, { label: '0' }),
          C.addEdge(node.id + '>' + c.id, node.id, c.id, { label: '1' }),
          C.edge(node.id + '>' + a.id, 'visited'),
          C.edge(node.id + '>' + c.id, 'visited'),
          C.state(node.id, 'active'),
          listCmds()
        ], { line: 5, milestone: '合并 ' + a.freq + ' + ' + c.freq + ' = ' + node.freq, stage: true });
        b.step('新树加入森林，森林规模 ' + forest.length + '。', [C.state(node.id, 'visited')], { line: 7 });
      }

      const root = forest[0];
      b.step('森林只剩一棵树——**哈夫曼树构建完成**。所有字符都变成叶子，频率越低的字符被压得越深。', [
        C.state(root.id, 'path')
      ], { line: 7, milestone: '哈夫曼树完成' });

      // 生成编码
      const codes = {};
      (function dfs(u, prefix) {
        if (!u.left && !u.right) { codes[u.ch] = prefix || '0'; return; }
        if (u.left) dfs(u.left, prefix + '0');
        if (u.right) dfs(u.right, prefix + '1');
      })(root, '');
      const cm = [];
      items.forEach(([ch, f]) => {
        cm.push(C.table('code', ch, 'freq', f));
        cm.push(C.table('code', ch, 'code', codes[ch] || '-'));
      });
      b.step('约定**左分支标 0、右分支标 1**，从根走到叶子的路径就是该字符的编码：' + items.map(([ch]) => ch + '=' + (codes[ch] || '')).join('，') + '。前缀性质保证了**没有任何编码是另一个的前缀**，因此解码无歧义。', cm, { line: 11, milestone: '生成编码表' });
      const wpl = items.reduce((s, [ch, f]) => s + f * (codes[ch] || '').length, 0);
      b.step('加权路径长度 WPL = Σ 频率 × 码长 = **' + wpl + '**，这是所有前缀编码方案中的最小值（哈夫曼树的贪心最优性）。', [], { line: 11, milestone: 'WPL = ' + wpl });
      b.nodes = nodeDefs();
      b.edges = edgeList();
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 0-1 异或字典树
   * ============================================================ */
  TGV.register({
    id: 'xor_trie', name: '0-1 异或字典树 · 最大异或对', category: '树 · 字符串树',
    layout: 'tree', childOrder: 'none',
    panels: [{ id: 'arr', type: 'array', title: '整数与二进制' }, { id: 'note', type: 'text', title: '贪心决策' }],
    pseudocode: [
      '// 把每个整数按二进制位从高到低插入 0-1 Trie',
      'insert(x): for b = 30 down to 0:',
      '    bit = (x >> b) & 1; 若不存在则新建',
      'queryMax(x):                        // 找与 x 异或最大的数',
      '    u = root; ans = 0',
      '    for b = 30 down to 0:',
      '        bit = (x >> b) & 1',
      '        if 存在 !bit 分支: u = 该分支; ans |= (1 << b)   // 贪心走相反位',
      '        else: u = bit 分支',
      '    return ans'
    ],
    presets: [
      { id: 'p1', label: '4 位演示：[3, 10, 5, 25, 2, 8]', desc: '只展示低 4 位，看贪心决策路径', data: () => ({ nums: [3, 10, 5, 25, 2, 8], bits: 4 }) },
      { id: 'p2', label: '问最大异或对', desc: '对每个数查询后取最大', data: () => ({ nums: [3, 10, 5, 25, 2, 8], bits: 4, ask: true }) }
    ],
    run(input) {
      const nums = input.nums || [];
      const B = input.bits || 4;
      const b = new TGV.Builder(this, { nodes: [], edges: [], panels: this.panels });
      let idc = 0;
      const all = [];
      const root = { id: 'X0', bit: '·', children: {}, depth: 0 };
      all.push(root);
      const nodeDefs = () => all.map(n => ({ id: n.id, label: n.bit, key: n.depth * 10 + Number(n.bit === '·' ? 0 : n.bit), ord: n.depth * 10 + Number(n.bit === '·' ? 0 : n.bit) }));
      const edgeList = () => {
        const out = [];
        all.forEach(n => Object.keys(n.children).forEach(k => {
          const c = n.children[k];
          out.push({ id: n.id + '>' + c.id, source: n.id, target: c.id, label: k });
        }));
        return out;
      };
      b.nodes = nodeDefs();
      const bin = x => x.toString(2).padStart(B, '0');
      b.step('0-1 字典树把每个整数按**二进制位从高到低**插入，形成一棵二叉前缀树。它能高效回答"与 x 异或最大的数是多少"。', [
        C.array('arr', nums.map(n => n + '=' + bin(n)), [], nums.map((n, i) => 'a' + i))
      ], { line: 1 });

      nums.forEach((x, i) => {
        b.step('**插入 ' + x + '（' + bin(x) + '）**', [], { line: 2, vars: [{ name: 'x', value: x }], stage: true });
        let u = root;
        for (let k = B - 1; k >= 0; k--) {
          const bit = (x >> k) & 1;
          if (!u.children[bit]) {
            const nd = { id: 'X' + (++idc), bit: String(bit), children: {}, depth: B - k };
            all.push(nd);
            u.children[bit] = nd;
            b.step('第 ' + (B - k) + ' 位是 `' + bit + '`，该分支不存在 → 新建结点。', [
              C.addNode(nd.id, String(bit), { key: nd.depth * 10 + bit, ord: nd.depth * 10 + bit }),
              C.addEdge(u.id + '>' + nd.id, u.id, nd.id, { label: String(bit) }),
              C.state(nd.id, 'active')
            ], { line: 3, vars: [{ name: 'bit', value: bit }] });
          } else {
            b.step('第 ' + (B - k) + ' 位是 `' + bit + '`，分支已存在 → 复用。', [C.pulse(u.id + '>' + u.children[bit].id, { color: '#4F46E5' })], { line: 3 });
          }
          u = u.children[bit];
        }
        b.step(x + ' 插入完成（' + bin(x) + ' 的路径已就位）。', [C.state(u.id, 'path')], { line: 3, milestone: '插入 ' + x });
      });

      const doQuery = (x) => {
        let u = root, ans = 0;
        const path = [];
        b.step('**查询与 ' + x + '（' + bin(x) + '）异或最大的数**：每一位都贪心地尝试走**相反比特**的分支。', [], { line: 4, vars: [{ name: 'x', value: x }], stage: true });
        for (let k = B - 1; k >= 0; k--) {
          const bit = (x >> k) & 1;
          const want = 1 - bit;
          if (u.children[want]) {
            ans |= (1 << k);
            path.push(k);
            b.step('第 ' + (B - k) + ' 位：x 是 `' + bit + '`，优先走相反的 `' + want + '` 分支 → **异或结果这一位为 1**。', [
              C.state(u.children[want].id, 'active'),
              C.text('note', ['第 ' + (B - k) + ' 位：走反位 ' + want, 'ans 累加 1<<' + k])
            ], { line: 7 });
            u = u.children[want];
          } else {
            b.step('第 ' + (B - k) + ' 位：相反的 `' + want + '` 分支不存在，只能走 `' + bit + '` → 这一位异或为 0。', [
              C.state(u.children[bit].id, 'frontier')
            ], { line: 8 });
            u = u.children[bit];
          }
        }
        b.step('查询结束，最大异或值 = **' + ans + '**（' + bin(ans) + '）。', [], { line: 9, milestone: x + ' 的最大异或 = ' + ans });
        return ans;
      };
      const q = nums[nums.length - 1];
      doQuery(q);
      if (input.ask) {
        let best = 0, pair = null;
        nums.forEach(a => nums.forEach(c => { if ((a ^ c) > best) { best = a ^ c; pair = [a, c]; } }));
        b.step('对全部 ' + nums.length + ' 个数两两比较，**全局最大异或对 = ' + pair[0] + ' ^ ' + pair[1] + ' = ' + best + '**。若对每个数都做一次 O(B) 查询，总复杂度 O(nB)，远优于 O(n²) 暴力。', [], { line: 6, milestone: '最大异或对 = ' + best });
      }
      b.nodes = nodeDefs();
      b.edges = edgeList();
      return { nodes: b.nodes, edges: b.edges, frames: b.frames, panels: b.panels };
    }
  });

})();
