/* ============================================================
 * TreeGraphVis · 规模生成器（结点数量自定义）
 * 不逐个修改算法：用四种输入形态去「试跑」当前算法，
 * 只有返回的结点集合与生成的标签完全一致，才认为它支持自定义规模；
 * 否则明确拒绝（例如红黑树删除的四个 Case 必须用固定树）。
 *
 * 输入形态（按优先级）：
 *   arr   —— 层序数组，供遍历类算法（preorder / zigzag / morris …）
 *   keys  —— 键序列 {keys, chain, seq}，供 BST / AVL / 红黑树 / Treap …
 *   tree  —— 父子对 [[p,c], …]，供 LCA / 树的直径 / 并查集 等树算法
 *   graph —— {nodes, edges, start}，供图算法
 *
 * 合理性判断：算法级上限（复杂度过高者收紧）+ 帧数上限（超限自动降规模）
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};

  /* 单步开销随规模增长很快的算法：上限单独收紧 */
  const HEAVY = {
    floyd: 12, johnson: 10, k_shortest: 10, second_mst: 14, chu_liu: 14,
    max_clique: 16, km: 12, ac_automaton: 16, suffix_tree: 14, lct: 18,
    hlpp: 14, blossom: 16, mcmf: 16, dinic: 22, min_cut: 24, graph_repr: 12,
    fib_heap: 40, kd_tree: 40, quadtree: 40, hld: 24, persistent_seg: 36
  };
  const ABS_MIN = 5;          // 少于 5 个结点，多数算法演示不出结构变化
  const ABS_MAX = 56;         // 画布可读上限（标签 + 边不会糊成一片）
  const FRAME_CAP = 2600;     // 单次演示帧数上限，超过则自动降规模

  const KIND_LABEL = { arr: '层序数组', keys: '键序列', seq: '操作序列', seqPair: '键+优先级序列', tree: '树边集', graph: '随机图', special: '按算法族生成' };

  function rngOf(seed) {
    let s = (seed >>> 0) || 20261021;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  function limitsFor(id) {
    const heavy = HEAVY[id];
    return {
      min: ABS_MIN,
      max: heavy || ABS_MAX,
      reason: heavy
        ? '该算法单步开销随规模增长很快（可达 O(n²)~O(n³)），'
        : '画布需要保证结点标签与边不互相遮挡，'
    };
  }

  /* ---------------- 四种输入形态 ---------------- */
  function buildInput(kind, n, meta, seed) {
    const rnd = rngOf(seed + n * 131);
    if (kind === 'arr') {
      const vals = shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd);
      return { arr: vals, mode: 'rec' };
    }
    if (kind === 'keys') {
      const pool = Array.from({ length: n * 3 }, (_, i) => i + 1);
      const vals = shuffle(pool, rnd).slice(0, n);
      const sorted = vals.slice().sort((a, b) => a - b);
      return {
        keys: vals, chain: vals,
        base: vals,                                 // Splay 等：先建 n 个再插入
        target: sorted[Math.floor(n / 2)],          // 查找类：命中中位数
        insert: Math.max.apply(null, vals) + 1,     // 插入类：插入一个新值
        key: Math.max.apply(null, vals) + 2,
        op: 'insert', pri: 50
      };
    }
    if (kind === 'seq') {
      const pool = Array.from({ length: n * 3 }, (_, i) => i + 1);
      const vals = shuffle(pool, rnd).slice(0, n);
      return { seq: vals, del: vals[Math.floor(n / 2)], base: [] };
    }
    if (kind === 'seqPair') {
      const pool = Array.from({ length: n * 3 }, (_, i) => i + 1);
      const keys = shuffle(pool, rnd).slice(0, n);
      const pris = shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd);
      return { seq: keys.map((k, i) => [k, pris[i]]), build: keys.slice() };
    }
    if (kind === 'tree') {
      const labels = shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd);
      const edges = [];
      for (let i = 2; i <= n; i++) edges.push([labels[Math.floor(i / 2) - 1], labels[i - 1]]);
      const leaves = [];
      for (let i = Math.floor(n / 2) + 1; i <= n; i++) leaves.push(labels[i - 1]);
      const u = leaves[0] != null ? leaves[0] : labels[0];
      const v = leaves[leaves.length - 1] != null ? leaves[leaves.length - 1] : labels[1];
      return { edges, start: labels[0], u, v, pair: [u, v], queries: [[u, v]] };
    }
    // graph：图算法统一走 custom 对象格式；拓扑 / AOE 需要 DAG，边只从小下标指向大下标
    const ids = Array.from({ length: n }, (_, i) => String(i + 1));
    const dag = DAG_IDS.has(meta.id);
    const edges = [];
    for (let i = 1; i < n; i++) edges.push([ids[Math.floor(rnd() * i)], ids[i]]);   // 生成树保证连通
    const seen = {};
    edges.forEach(([a, b]) => { seen[a + '|' + b] = true; seen[b + '|' + a] = true; });
    let extra = Math.min(Math.floor(n * 0.45), (n * (n - 1)) / 2 - (n - 1));
    let guard = 0;
    while (extra > 0 && guard++ < n * 40) {
      let ai = Math.floor(rnd() * n), bi = Math.floor(rnd() * n);
      if (dag && ai > bi) { const t = ai; ai = bi; bi = t; }
      const a = ids[ai], b = ids[bi];
      if (a === b || seen[a + '|' + b]) continue;
      seen[a + '|' + b] = true; seen[b + '|' + a] = true;
      edges.push([a, b]);
      extra--;
    }
    const R = Math.max(150, n * 7.4);
    const nodes = ids.map((id, i) => {
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        id, label: id,
        x: Math.round(400 + Math.cos(ang) * R),
        y: Math.round(320 + Math.sin(ang) * R)
      };
    });
    return {
      custom: true,                       // 图算法统一走 custom 对象分支
      nodes,
      edges: edges.map(([s, t], i) => ({ id: 'e' + i, source: s, target: t, weight: 1 + Math.floor(rnd() * 9) })),
      s: ids[0], t: ids[ids.length - 1], start: ids[0],
      directed: meta.directed !== false
    };
  }

  /* 结构规模：静态 def 结点数，或动态 ADD_NODE 的唯一 id 数 */
  function countNodes(d) {
    if (!d) return -1;
    if (d.nodes && d.nodes.length) return d.nodes.length;
    const ids = new Set();
    (d.frames || []).forEach(f => (f.commands || []).forEach(c => {
      if (c.op === 'ADD_NODE') ids.add(c.id);
    }));
    return ids.size;
  }

  const SEED = 20261021;

  /* ---------------- 专用生成器（按算法族提供正确输入形态） ---------------- */
  function wordsOf(n, rnd, minLen, maxLen) {
    const A = 'abcdefghijklmnop';
    const out = [];
    for (let i = 0; i < n; i++) {
      const len = minLen + Math.floor(rnd() * (maxLen - minLen + 1));
      let w = '';
      for (let k = 0; k < len; k++) w += A[Math.floor(rnd() * 12)];
      out.push(w + i.toString(36));           // 保证互不相同
    }
    return out;
  }

  /* 二分图：左侧 L*、右侧 R*，保证每个点至少一条边 */
  function bipInput(n, rnd) {
    const nl = Math.max(2, Math.floor(n / 2));
    const nr = Math.max(2, n - nl);
    const nodes = [];
    for (let i = 1; i <= nl; i++) nodes.push({ id: 'L' + i, label: 'L' + i, x: 180, y: 90 + (i - 1) * Math.max(44, 400 / Math.max(1, nl - 1)) });
    for (let j = 1; j <= nr; j++) nodes.push({ id: 'R' + j, label: 'R' + j, x: 640, y: 90 + (j - 1) * Math.max(44, 400 / Math.max(1, nr - 1)) });
    const edges = [];
    for (let i = 1; i <= nl; i++) {
      for (let j = 1; j <= nr; j++) {
        if (rnd() < 0.45) edges.push({ source: 'L' + i, target: 'R' + j });
      }
    }
    for (let i = 1; i <= nl; i++) {
      if (!edges.some(e => e.source === 'L' + i)) edges.push({ source: 'L' + i, target: 'R' + (1 + Math.floor(rnd() * nr)) });
    }
    for (let j = 1; j <= nr; j++) {
      if (!edges.some(e => e.target === 'R' + j)) edges.push({ source: 'L' + (1 + Math.floor(rnd() * nl)), target: 'R' + j });
    }
    return { custom: true, nodes, edges, directed: false };
  }

  function flowInput(n, rnd) {    const k = Math.max(2, n - 2);
    const mid = Array.from({ length: k }, (_, i) => 'm' + (i + 1));
    const R = Math.max(150, k * 9);
    const nodes = [{ id: 'S', label: 'S', x: 90, y: 330 }]
      .concat(mid.map((id, i) => {
        const ang = (i / k) * Math.PI * 2;
        return { id, x: Math.round(470 + Math.cos(ang) * R), y: Math.round(330 + Math.sin(ang) * R) };
      }))
      .concat([{ id: 'T', label: 'T', x: 880, y: 330 }]);
    const edges = [];
    const add = (u, v, cap, cost) => {
      edges.push({ source: u, target: v, weight: cap, cost });
      edges.push({ source: v, target: u, weight: 0, cost: -cost });   // 反向边（残量）
    };
    const half = Math.max(1, Math.floor(k / 2));
    for (let i = 0; i < half; i++) add('S', mid[i], 4 + Math.floor(rnd() * 6), 1 + Math.floor(rnd() * 5));
    for (let i = half; i < k; i++) add(mid[i], 'T', 4 + Math.floor(rnd() * 6), 1 + Math.floor(rnd() * 5));
    for (let i = 0; i < half; i++) {
      for (let j = half; j < k; j++) {
        if (rnd() < 0.45) add(mid[i], mid[j], 1 + Math.floor(rnd() * 8), 1 + Math.floor(rnd() * 5));
      }
    }
    add('S', mid[0], 6, 1);                    // 保底通路
    add(mid[0], mid[half], 6, 1);
    add(mid[half], 'T', 6, 1);
    return { custom: true, nodes, edges, s: 'S', start: 'S', directed: true };
  }

  const SPECIAL = {
    /* 二分图：左侧 L*、右侧 R*，保证每个点至少一条边 */
    bip_color: bipInput,
    hungarian: bipInput,
    /* 0-1 BFS：边权只允许 0 / 1 */
    zero_one_bfs(n, rnd) {
      const k = Math.max(2, n);
      const ids = Array.from({ length: k }, (_, i) => String(i + 1));
      const R = Math.max(150, k * 8);
      const nodes = ids.map((id, i) => {
        const ang = (i / k) * Math.PI * 2;
        return { id, x: Math.round(430 + Math.cos(ang) * R), y: Math.round(320 + Math.sin(ang) * R) };
      });
      const edges = [];
      for (let i = 1; i < k; i++) {
        edges.push({ source: ids[Math.floor(rnd() * i)], target: ids[i], weight: rnd() < 0.5 ? 0 : 1 });
      }
      for (let e = 0; e < Math.floor(k * 0.4); e++) {
        const a = ids[Math.floor(rnd() * k)], b = ids[Math.floor(rnd() * k)];
        if (a !== b) edges.push({ source: a, target: b, weight: rnd() < 0.5 ? 0 : 1 });
      }
      return { custom: true, nodes, edges, s: ids[0], t: ids[k - 1], start: ids[0], directed: false };
    },
    /* 并查集：n 个元素 + 随机 union/find */
    dsu(n, rnd) {
      const ops = [];
      for (let i = 0; i < n; i++) {
        ops.push(['union', 1 + Math.floor(rnd() * n), 1 + Math.floor(rnd() * n)]);
      }
      ops.push(['find', 1 + Math.floor(rnd() * n)]);
      return { n, ops };
    },
    /* 四个可并堆：插入序列 */
    leftist_heap(n, rnd) { return { vals: shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd) }; },
    skew_heap(n, rnd) { return { vals: shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd) }; },
    pairing_heap(n, rnd) { return { vals: shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd) }; },
    binomial_heap(n, rnd) { return { vals: shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd) }; },
    /* 字符串族 */
    trie(n, rnd) {
      const words = wordsOf(n, rnd, 3, 5);
      return { words, query: words[0], prefix: words[0].slice(0, 2) };
    },
    ac_automaton(n, rnd) {
      const patterns = wordsOf(n, rnd, 3, 4);
      return { patterns, text: patterns.join('') + 'x' };
    },
    huffman(n, rnd) {
      const ws = wordsOf(n, rnd, 1, 2);
      return { items: ws.map(w => [w, 1 + Math.floor(rnd() * 50)]) };
    },
    xor_trie(n, rnd) {
      const bits = Math.max(4, Math.min(12, Math.ceil(Math.log2(n + 2)) + 2));
      const max = 1 << bits;
      const nums = shuffle(Array.from({ length: max }, (_, i) => i), rnd).slice(0, n);
      return { nums, bits, ask: true };
    },
    radix_trie(n, rnd) { return { words: wordsOf(n, rnd, 2, 4) }; },
    suffix_tree(n, rnd) {
      const A = 'abc';
      let text = '';
      for (let i = 0; i < n; i++) text += A[Math.floor(rnd() * A.length)];
      return { text: text + '$' };
    },
    /* 多路树 */
    two_three_four(n, rnd) {
      return { mode: 'bottomUp', seq: shuffle(Array.from({ length: n }, (_, i) => (i + 1) * 10), rnd) };
    },
    bstar_tree(n, rnd) {
      return { seq: shuffle(Array.from({ length: n }, (_, i) => (i + 1) * 10), rnd) };
    },
    /* 主席树 / FHQ-Treap */
    persistent_seg(n, rnd) {
      const a = Array.from({ length: n }, () => 1 + Math.floor(rnd() * 99));
      return { a, ups: [[Math.floor(n / 2), 1 + Math.floor(rnd() * 99)]] };
    },
    fhq_treap(n, rnd) {
      const keys = shuffle(Array.from({ length: n }, (_, i) => i + 1), rnd);
      const build = keys.slice(0, Math.max(2, Math.floor(n / 2))).map(k => [k, 1 + Math.floor(rnd() * 90)]);
      return { build, op: 'insert', key: Math.max.apply(null, keys) + 1, pri: 50 };
    },
    /* 空间划分树：二维点集 */
    kd_tree(n, rnd) {
      return {
        points: Array.from({ length: n }, (_, i) => [
          Math.round(80 + (i % 8) * 78 + rnd() * 30),
          Math.round(70 + Math.floor(i / 8) * 62 + rnd() * 26)
        ])
      };
    },
    quadtree(n, rnd) {
      return { points: Array.from({ length: n }, () => [ +(0.05 + rnd() * 0.9).toFixed(3), +(0.05 + rnd() * 0.9).toFixed(3) ]) };
    },
    /* 带权并查集：n 个元素的 union/query 序列 */
    dsu_weighted(n, rnd) {
      const ids = Array.from({ length: n }, (_, i) => String(i + 1));
      const ops = [];
      for (let i = 1; i < ids.length; i++) {
        ops.push(['union', ids[Math.floor(rnd() * i)], ids[i], Math.floor(rnd() * 3)]);
      }
      ops.push(['query', ids[0], ids[ids.length - 1]]);
      return { ops };
    },
    /* 差分约束：x_i - x_{i-1} <= w 的链式约束（必有解） */
    diff_constraints(n, rnd) {
      const ids = Array.from({ length: n }, (_, i) => 'x' + (i + 1));
      const nodes = ids.map((id, i) => ({
        id, label: id, x: 120 + (i % 6) * 130, y: 110 + Math.floor(i / 6) * 110
      }));
      const edges = [];
      for (let i = 1; i < n; i++) {
        edges.push({ source: ids[i - 1], target: ids[i], weight: 1 + Math.floor(rnd() * 5) });
      }
      for (let k = 0; k < Math.floor(n * 0.4); k++) {
        const a = Math.floor(rnd() * (n - 1)), b = a + 1 + Math.floor(rnd() * Math.min(3, n - a - 1));
        if (b < n) edges.push({ source: ids[a], target: ids[b], weight: 1 + Math.floor(rnd() * 4) });
      }
      return { custom: true, nodes, edges, directed: true };
    },
    /* 2-SAT：n/2 个变量，随机子句 */
    two_sat(n, rnd) {
      const v = Math.max(2, Math.floor(n / 2));
      const nodes = [];
      for (let i = 1; i <= v; i++) {
        nodes.push({ id: 'x' + i, label: 'x' + i, x: 150, y: 80 + i * 46 });
        nodes.push({ id: '¬x' + i, label: '¬x' + i, x: 620, y: 80 + i * 46 });
      }
      const lit = () => (rnd() < 0.5 ? 'x' : '¬x') + (1 + Math.floor(rnd() * v));
      const neg = s => (s.charAt(0) === '¬' ? s.slice(1) : '¬' + s);
      const edges = [], clauses = [];
      const k = Math.max(2, Math.floor(v * 1.4));
      for (let c = 0; c < k; c++) {
        const a = lit(), b = lit();
        clauses.push('(' + a + ' ∨ ' + b + ')');
        edges.push({ source: neg(a), target: b });
        edges.push({ source: neg(b), target: a });
      }
      return { custom: true, nodes, edges, clauses, directed: true };
    },
    /* 网络流族 */
    ff_ek: flowInput,
    dinic: flowInput,
    min_cut: flowInput,
    mcmf: flowInput,
    hlpp: flowInput
  };
  SPECIAL.min_cut = flowInput;
  SPECIAL.hlpp = flowInput;

  const ORDER = ['arr', 'keys', 'seq', 'seqPair', 'tree', 'graph'];
  const DAG_IDS = new Set(['topo_kahn', 'topo_dfs', 'aoe_cpm']);

  /**
   * 为算法生成 n 个结点的输入。
   * 判定「是否真的采用输入」：同一形态分别跑 n 与 n+1，
   * 结构规模必须随之增长（否则说明算法用的是内置用例）。
   * @returns {kind, input, n, frames, reduced} 或 null（不支持）
   */
  function build(meta, n, depth) {
    depth = depth || 0;
    const lim = limitsFor(meta.id);
    const target = Math.max(lim.min, Math.min(lim.max, Math.round(n)));
    const kindList = (SPECIAL[meta.id] ? ['special'] : []).concat(ORDER);
    for (const kind of kindList) {
      const makeInp = size => (kind === 'special'
        ? SPECIAL[meta.id](size, rngOf(SEED + size * 7))
        : buildInput(kind, size, meta, SEED));
      let d = null, c1 = -1, f1 = 0, grown = false;
      for (let extra = 0; extra <= 3; extra++) {
        let dd = null;
        try { dd = meta.run(clone(makeInp(target + extra))); } catch (e) { break; }
        const c = countNodes(dd), fr = dd.frames ? dd.frames.length : 0;
        if (extra === 0) { d = dd; c1 = c; f1 = fr; }
        else if (c > c1 || fr > f1 + 3) { grown = true; break; }   // 结构或演示规模随规模增长
      }
      if (!d || c1 < 2 || !grown) continue;
      // 帧数过多：自动降低规模后重试（最多 3 次）
      if (d.frames.length > FRAME_CAP && target > lim.min && depth < 3) {
        const smaller = Math.max(lim.min, Math.floor(target * 0.72));
        const again = build(meta, smaller, depth + 1);
        if (again) { again.reduced = true; return again; }
      }
      return { kind, input: makeInp(target), n: target, frames: d.frames.length, reduced: target !== n };
    }
    return null;
  }

  TGV.Scale = {
    build, limitsFor, KIND_LABEL, ABS_MIN, ABS_MAX, FRAME_CAP,
    /** 只判断是否支持（用一个较小的规模试，避免开销） */
    supports(meta) { return !!build(meta, Math.max(ABS_MIN, 8)); }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
