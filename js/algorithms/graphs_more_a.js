/* ============================================================
 * 第二卷 · 图算法补充（一）
 * 次短路 / 第 K 短路（Yen） · 朱刘算法（最小树形图） · 点双连通与圆方树
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  function fmtW(x) { return x === Infinity ? '∞' : x; }

  /* ============================================================
   * 1. 次短路 与 第 K 短路
   * ============================================================ */
  const KS_NODES = [['A', 140, 300], ['B', 320, 170], ['C', 320, 430], ['D', 500, 300], ['E', 680, 430], ['F', 860, 300]];
  const KS_EDGES = [['A', 'B', 1], ['A', 'C', 5], ['B', 'C', 2], ['B', 'D', 4], ['C', 'D', 1], ['C', 'E', 2], ['D', 'F', 2], ['E', 'F', 2]];

  TGV.register({
    id: 'k_shortest', name: '次短路 与 第 K 短路（Yen 算法）', category: '图 · 最短路径',
    layout: 'fixed', directed: true,
    compareWith: 'dijkstra',
    panels: [],
    pseudocode: [
      '// 次短路：每个点维护两个距离槽位 dist1（最短）与 dist2（严格次短）',
      'relax(u, v, w):',
      '    nd = dist1[u] + w',
      '    if nd < dist1[v]: dist2[v] = dist1[v]; dist1[v] = nd      // 挤掉旧的最短',
      '    elif dist1[v] < nd < dist2[v]: dist2[v] = nd             // 落进次短槽',
      '// 注意第二个条件要求严格大于 dist1 —— 否则"绕一圈回来"的等长路会被误当次短',
      '',
      '// 第 K 短路（Yen）：在最短路上逐个"偏离点"做手脚',
      'yen(s, t, K):',
      '    A[1] = 最短路；候选池 B = {}',
      '    for k = 2..K:',
      '        prev = A[k-1]',
      '        for i = 0 .. len(prev)-2:                    // 枚举偏离点 spur = prev[i]',
      '            rootPath = prev[0..i]',
      '            屏蔽 rootPath 用过的出边、屏蔽 rootPath 上的其它结点',
      '            spurPath = 在残余图上跑最短路(spur → t)',
      '            B.push(rootPath + spurPath)               // 拼成一条完整候选',
      '        A[k] = B 中代价最小的、且没出现过的路径',
      '    return A'
    ],
    presets: [
      { id: 'second', label: '次短路 · 双距离槽位松弛', desc: '每个点同时维护 dist1 与 dist2', data: () => ({ mode: 'second', s: 'A', t: 'F' }) },
      { id: 'yen3', label: '第 K 短路 · Yen 算法 K=3', desc: '偏离点 + 候选池，逐条挖出第 2、第 3 短路', data: () => ({ mode: 'yen', s: 'A', t: 'F', K: 3 }) }
    ],
    run(input) {
      const mode = input.mode || 'second';
      const s = input.s || 'A', t = input.t || 'F';
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: true })
        : TGV.GraphLib.mkGraph(KS_NODES, KS_EDGES, { directed: true });
      const ids = g.nodes.map(n => n.id);
      const panels = mode === 'second'
        ? [{ id: 'watch', type: 'table', title: '双距离槽位', columns: [{ key: 'd1', label: 'dist1 最短' }, { key: 'd2', label: 'dist2 次短' }], rowOrder: ids },
          { id: 'order', type: 'list', title: '松弛顺序' }]
        : [{ id: 'pool', type: 'list', title: '候选路径池 B' },
          { id: 'found', type: 'list', title: '已确定的短路 A[]' }];
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels });

      /* ---------------- 次短路 ---------------- */
      if (mode === 'second') {
        const INF = Infinity;
        const d1 = {}, d2 = {};
        ids.forEach(id => { d1[id] = INF; d2[id] = INF; });
        d1[s] = 0;
        const q = [s];
        const order = [];
        const init = ids.map(id => C.table('watch', id, 'd1', '∞')).concat(ids.map(id => C.table('watch', id, 'd2', '∞')));
        init.push(C.table('watch', s, 'd1', 0, true));
        b.step('**次短路**：不满足于"最短路"的一条，我们想知道**第二短**的那条。做法是给每个点开两个槽位：' +
          '`dist1`（最短）与 `dist2`（严格次短）。松弛时要么"挤掉旧最短"，要么"落进次短槽"。',
        init, { line: 1, milestone: '初始化：dist1[A] = 0' });

        let guard = 0;
        while (q.length && guard++ < 80) {
          const u = q.shift();
          order.push(u);
          b.step('从 **' + u + '** 出发松弛所有出边（它当前：dist1=' + fmtW(d1[u]) + '、dist2=' + fmtW(d2[u]) + '）。',
            [C.state(u, 'active'), C.setQ('order', order.slice())], { line: 3, vars: [{ name: 'u', value: u }] });

          g.adj[u].forEach(link => {
            const v = link.to, w = link.w;
            [d1[u], d2[u]].forEach((du, slot) => {
              if (du === INF) return;
              const nd = du + w;
              if (nd < d1[v]) {
                d2[v] = d1[v];
                d1[v] = nd;
                q.push(v);
                b.step('用 ' + u + (slot ? ' 的**次短槽**' : ' 的**最短槽**') + ' 松弛 ' + u + '→' + v + '：' +
                  fmtW(du) + ' + ' + w + ' = **' + nd + '** < dist1[' + v + '] → 原来的最短被挤到次短槽。',
                [C.pulse(link.eid, { color: '#4F46E5' }), C.edge(link.eid, 'path'),
                  C.table('watch', v, 'd1', nd, true), C.table('watch', v, 'd2', d2[v] === INF ? '∞' : d2[v])],
                { line: 4, vars: [{ name: 'nd', value: nd }] });
              } else if (nd > d1[v] && nd < d2[v]) {
                d2[v] = nd;
                q.push(v);
                b.step('松弛 ' + u + '→' + v + '：' + fmtW(du) + ' + ' + w + ' = **' + nd + '**，' +
                  '比 dist1[' + v + ']=' + d1[v] + ' 大、比 dist2[' + v + '] 小 → 落入**次短槽**。',
                [C.pulse(link.eid, { color: '#0EA5E9' }), C.edge(link.eid, 'active'),
                  C.table('watch', v, 'd2', nd, true)],
                { line: 5, vars: [{ name: 'nd', value: nd }] });
              }
            });
          });
          b.step(u + ' 松弛完毕，出队。', [C.state(u, 'visited')], { line: 3 });
        }

        const fin = [C.state(t, 'path')];
        ids.forEach(id => fin.push(C.table('watch', id, 'd1', d1[id] === INF ? '∞' : d1[id])));
        ids.forEach(id => fin.push(C.table('watch', id, 'd2', d2[id] === INF ? '∞' : d2[id])));
        b.step('**结果**：到 ' + t + ' 的最短路 dist1 = **' + fmtW(d1[t]) + '**，次短路 dist2 = **' + fmtW(d2[t]) + '**。' +
          '`nd > dist1[v]` 这个条件不能省，否则"在原路上多绕一次"会被误判成次短。',
        fin, { line: 5, milestone: t + '：最短 ' + fmtW(d1[t]) + '，次短 ' + fmtW(d2[t]) });
        return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
      }

      /* ---------------- Yen 第 K 短路 ---------------- */
      const K = input.K || 3;
      const bannedE = new Set(), bannedN = new Set();

      const dijkstra = (src, dst) => {
        const dist = {}, prev = {};
        ids.forEach(id => { dist[id] = Infinity; });
        if (bannedN.has(src)) return null;
        dist[src] = 0;
        const used = new Set();
        let guard = 0;
        while (guard++ < 60) {
          let u = null, best = Infinity;
          ids.forEach(id => { if (!used.has(id) && dist[id] < best) { best = dist[id]; u = id; } });
          if (u === null) break;
          used.add(u);
          if (u === dst) break;
          g.adj[u].forEach(link => {
            if (bannedE.has(link.eid) || bannedN.has(link.to)) return;
            if (dist[u] + link.w < dist[link.to]) {
              dist[link.to] = dist[u] + link.w;
              prev[link.to] = { u, to: link.to, eid: link.eid, w: link.w };
            }
          });
        }
        if (dist[dst] === Infinity) return null;
        const edges = [];
        let cur = dst;
        let g2 = 0;
        while (prev[cur] && g2++ < 30) { edges.unshift(prev[cur]); cur = prev[cur].u; }
        if (!edges.length) return null;
        return { cost: dist[dst], edges };
      };
      const fmtPath = (p) => (p && p.edges && p.edges.length ? p.edges.map(e => e.u + '→' + e.to).join(' ') : '—');
      const clearBan = (cmds) => {
        bannedE.forEach(eid => cmds.push(C.edge(eid, 'default')));
        bannedN.forEach(id => cmds.push(C.state(id, 'default')));
        bannedE.clear(); bannedN.clear();
      };
      const poolLabel = () => pool.slice().sort((x, y) => x.cost - y.cost).map((p, i) => ({ key: 'c' + i, label: p.label }));

      b.step('**第 K 短路（Yen 算法）**：先求最短路，然后沿着它**依次枚举"偏离点"（spur node）**——' +
        '偏离点之前的路径保持不动，把"已经用过的出边"和"根路径上的其它结点"屏蔽掉，' +
        '在残余图上再跑一次最短路，拼成一条新候选。候选里最便宜的那条就是下一短路。',
      [], { line: 8 });

      const A = [];
      const pool = [];
      const first = dijkstra(s, t);
      A.push(first);
      b.step('**第 1 短路**：直接跑一次 Dijkstra → ' + fmtPath(first) + '，代价 **' + first.cost + '**。',
        [C.setQ('found', [{ key: 'p1', label: '#1  ' + fmtPath(first) + '  (=' + first.cost + ')' }])].concat(
          first.edges.map(e => C.edge(e.eid, 'path'))
        ), { line: 9, milestone: '第 1 短路 = ' + first.cost });

      for (let k = 2; k <= K; k++) {
        const prev = A[k - 2];
        if (!prev || !prev.edges.length) break;
        b.step('**求第 ' + k + ' 短路**：以第 ' + (k - 1) + ' 短路 ' + fmtPath(prev) + ' 为基准，依次在每个结点上"偏离"一次。',
          [], { line: 11, milestone: '开始求第 ' + k + ' 短路', stage: true });

        for (let i = 0; i < prev.edges.length; i++) {
          const spurNode = prev.edges[i].u;
          const rootEdges = prev.edges.slice(0, i);
          clearBan([]);
          const cm = [C.state(spurNode, 'conflict')];
          rootEdges.forEach(re => { bannedE.add(re.eid); cm.push(C.edge(re.eid, 'rejected')); });
          const rootNodes = [];
          rootEdges.forEach(re => { if (!rootNodes.includes(re.u)) rootNodes.push(re.u); });
          rootNodes.forEach(nid => { if (nid !== spurNode) { bannedN.add(nid); cm.push(C.state(nid, 'ghost')); } });
          cm.push(C.setQ('pool', poolLabel()));
          b.step('偏离点 **' + spurNode + '**（根路径 ' + (rootEdges.length ? rootEdges.map(e => e.u + '→' + e.to).join(' ') : '(空)') + '）：' +
            '把根路径上的边与点屏蔽掉（虚线/灰色），强迫新路径在这里分道扬镳。',
          cm, { line: 15, vars: [{ name: 'spur', value: spurNode }, { name: 'i', value: i }] });

          const sub = dijkstra(spurNode, t);
          if (!sub) {
            const cmR = [];
            clearBan(cmR);
            b.step('偏离点 ' + spurNode + ' 在残余图里已经到不了 ' + t + '，**跳过**。', cmR, { line: 16 });
            continue;
          }
          const total = rootEdges.reduce((acc, e) => acc + e.w, 0) + sub.cost;
          const full = { cost: total, edges: rootEdges.concat(sub.edges) };
          const label = fmtPath(full) + '  (=' + total + ')';
          if (!pool.some(p => fmtPath(p.res) === fmtPath(full)) && !A.some(a => fmtPath(a) === fmtPath(full))) {
            pool.push({ cost: total, label: label, res: full });
          }
          const cm2 = [C.setQ('pool', poolLabel())];
          full.edges.forEach(e => cm2.push(C.edge(e.eid, 'path')));
          clearBan(cm2);
          b.step('从 ' + spurNode + ' 到 ' + t + ' 的最短路是 ' + fmtPath(sub) + '（' + sub.cost + '）；拼上根路径得到候选 **' + label + '**，投入候选池。',
            cm2, { line: 17 });
        }

        pool.sort((x, y) => x.cost - y.cost);
        const pickIdx = pool.findIndex(p => !A.some(a => fmtPath(a) === fmtPath(p.res)));
        if (pickIdx < 0) {
          b.step('候选池已空，第 ' + k + ' 短路不存在，算法结束。', [], { line: 18 });
          break;
        }
        const picked = pool.splice(pickIdx, 1)[0];
        A.push(picked.res);
        const cm3 = [C.setQ('found', A.map((a, idx) => ({ key: 'p' + idx, label: '#' + (idx + 1) + '  ' + fmtPath(a) + '  (=' + a.cost + ')' }))),
          C.setQ('pool', poolLabel())];
        A.forEach(a => a.edges.forEach(e => cm3.push(C.edge(e.eid, 'path'))));
        b.step('候选池里最便宜且没出现过的是 **' + picked.label + '** → 它就是第 ' + k + ' 短路。',
          cm3, { line: 18, milestone: '第 ' + k + ' 短路 = ' + picked.cost });
      }

      b.step('**Yen 的账**：K 条路径 × 每条最多枚举 O(路径长度) 个偏离点 × 每次跑一次 Dijkstra，' +
        '总复杂度 O(K·n·Dijkstra)。它最妙的地方是**用"屏蔽 + 重跑"代替了复杂的第 K 短路 DP**，' +
        '代价是会产生重复候选，所以必须用候选池去重。', [], { line: 19, milestone: '演示完成' });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 2. 朱刘算法（有向图最小树形图）
   * ============================================================ */
  const CL_NODES = [['A', 420, 110], ['B', 260, 320], ['C', 580, 320], ['D', 420, 500]];
  const CL_EDGES = [['A', 'B', 3], ['A', 'C', 5], ['B', 'C', 1], ['C', 'B', 2], ['B', 'D', 4], ['C', 'D', 6]];

  TGV.register({
    id: 'chu_liu', name: '朱刘算法（有向图最小树形图）', category: '图 · 最小生成树',
    layout: 'fixed', directed: true,
    compareWith: 'prim',
    panels: [
      { id: 'in', type: 'table', title: '每个点的最小入边', columns: [{ key: 'from', label: '从' }, { key: 'w', label: '权重' }] },
      { id: 'log', type: 'list', title: '缩环记录' }
    ],
    pseudocode: [
      '// 最小树形图：以 root 为根、所有点可达、除根外每点恰好一条入边',
      '// 无向图用 Prim/Kruskal，有向图必须用朱刘算法（Chu-Liu / Edmonds）',
      'chu_liu(nodes, edges, root):',
      '    for each v != root: in[v] = 权值最小的入边(u → v)      // ① 贪心选最小入边',
      '    if 存在 v 没有入边: 无解（有不可达点）',
      '    if 选出的入边不成环: 完成，这些边就是最小树形图          // ② 无环直接结束',
      '    把每个环缩成一个超级结点 X:                            // ③ 缩环',
      '        for 进入环的边 (u → v), v 在环内: w\' = w - in[v]   //    权重扣除环内已付的代价',
      '        环内边全部丢弃（它们已经被 in[] 选中）',
      '    递归求解缩点后的图                                   // ④ 递归',
      '    展开超级结点：保留环内除"被外部边顶掉的那条"以外的所有入边',
      '// 为什么 w\' = w - in[v]：环内的入边已经支付过 in[v]，外部边来替代它时只需补差额'
    ],
    presets: [
      { id: 'std', label: '4 点图 · 第 1 轮就出现 2-环', desc: 'B⇄C 成环 → 缩点重赋权 → 展开，总权 8', data: () => ({ root: 'A' }) },
      { id: 'chain', label: '同一张图换个根', desc: '换根后最小入边集合完全不同', data: () => ({ root: 'B' }) }
    ],
    run(input) {
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: true })
        : TGV.GraphLib.mkGraph(CL_NODES, CL_EDGES, { directed: true });
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const root = input.root || g.nodes[0].id;
      const ids = g.nodes.map(n => n.id);
      const logs = [];
      const fmtE = (e) => e.from + '→' + e.to + '(' + e.w + ')';

      const solve = (ns, es, rt, depth) => {
        /* ① 每个点选最小入边 */
        const inE = {};
        es.forEach(e => {
          if (e.to === rt) return;
          if (!inE[e.to] || e.w < inE[e.to].w) inE[e.to] = e;
        });
        const miss = ns.filter(v => v !== rt && !inE[v]);
        if (miss.length) return { ok: false, reason: '结点 ' + miss.join(',') + ' 没有入边，无解' };

        const cm = [];
        ns.forEach(v => { if (inE[v]) cm.push(C.table('in', v, 'from', inE[v].from), C.table('in', v, 'w', inE[v].w, true)); });
        Object.keys(inE).forEach(v => cm.push(C.edge(inE[v].vid, 'path')));
        b.step('**第 ' + (depth + 1) + ' 轮 · 选最小入边**：除根 ' + rt + ' 外，每个点各自挑一条权值最小的入边 —— ' +
          Object.keys(inE).map(v => fmtE(inE[v])).join('、') + '。贪心保证每点入度恰好为 1。',
        cm, { line: 4, milestone: '第 ' + (depth + 1) + ' 轮：选最小入边' });

        /* ② 找环 */
        let cycle = null;
        ns.forEach(start => {
          if (cycle || start === rt) return;
          const seen = {};
          let cur = start;
          const path = [];
          let guard = 0;
          while (cur && cur !== rt && !seen[cur] && guard++ < 30) {
            seen[cur] = path.length;
            path.push(cur);
            cur = inE[cur] ? inE[cur].from : null;
          }
          if (cur && seen[cur] !== undefined) cycle = path.slice(seen[cur]);
        });

        if (!cycle) {
          b.step('**检查成环**：顺着每个点的最小入边往上走，没有环 → 这些入边就构成最小树形图，**算法结束**。',
            [], { line: 6, milestone: '第 ' + (depth + 1) + ' 轮：无环，完成' });
          return { ok: true, picked: Object.keys(inE).map(v => inE[v]) };
        }

        const cmC = [C.hull('cyc' + depth, cycle, '#F59E0B', '有向环')];
        cycle.forEach(v => cmC.push(C.state(v, 'conflict')));
        cycle.forEach(v => cmC.push(C.edge(inE[v].vid, 'active')));
        b.step('**发现环**：' + cycle.join(' → ') + ' → ' + cycle[0] + '。这一圈入边"互相满意"，但树形图不允许环！' +
          '必须把整个环**缩成一个超级结点**，让外部边来打破它。',
        cmC, { line: 6, milestone: '发现环：' + cycle.join('-'), stage: true });

        /* ③ 缩环 */
        const cid = 'X' + (depth + 1);
        const inCost = {};
        cycle.forEach(v => { inCost[v] = inE[v].w; });
        const newEdges = [];
        const best = {};
        const cmS = [C.setQ('log', logs.concat(['缩环 ' + cycle.join('-') + ' → ' + cid]))];
        es.forEach(e => {
          const fIn = cycle.includes(e.from), tIn = cycle.includes(e.to);
          if (fIn && tIn) return;
          const nf = fIn ? cid : e.from;
          const nt = tIn ? cid : e.to;
          const w = tIn ? e.w - inCost[e.to] : e.w;
          const cand = { id: nf + '>' + nt, vid: e.vid, from: nf, to: nt, w: w, from0: e.from, to0: e.to, w0: e.w };
          const key = nf + '>' + nt;
          if (!best[key] || best[key].w > w) best[key] = cand;
          if (tIn) {
            cmS.push(C.label(e.vid, e.w + ' ⇒ ' + w, true), C.edge(e.vid, 'active'));
            b.step('进入环的边 ' + fmtE({ from: e.from, to: e.to, w: e.w }) + '：环内已经为 ' + e.to + ' 付过 ' + inCost[e.to] + '，' +
              '替代它只需补差额 **' + e.w + ' − ' + inCost[e.to] + ' = ' + w + '**。这就是缩环时的**重赋权**。',
            [C.label(e.vid, e.w + ' ⇒ ' + w, true), C.edge(e.vid, 'active')],
            { line: 8, vars: [{ name: "w'", value: w }] });
          }
        });
        Object.keys(best).forEach(k => newEdges.push(best[k]));
        const newNs = ns.filter(v => !cycle.includes(v)).concat([cid]);
        logs.push('缩环 ' + cycle.join('-') + ' → ' + cid + '，候选边 ' + newEdges.length + ' 条');
        b.step('**缩环完成**：' + cycle.join('、') + ' 合并为超级结点 **' + cid + '**，环内边全部丢弃（已被 in[] 选中），' +
          '进出环的边按 `w\' = w − in[v]` 重赋权。在缩小后的图上继续递归。',
        cmS, { line: 9, milestone: '缩环为 ' + cid });

        /* ④ 递归 */
        const sub = solve(newNs, newEdges, rt, depth + 1);
        if (!sub.ok) return sub;

        /* ⑤ 展开 */
        let dropped = null;
        const out = [];
        sub.picked.forEach(e => {
          if (e.to === cid) {
            dropped = e.to0;
            out.push({ id: e.id, vid: e.vid, from: e.from0, to: e.to0, w: e.w0 });
          } else if (e.from === cid) {
            out.push({ id: e.id, vid: e.vid, from: e.from0, to: e.to0, w: e.w0 });
          } else {
            out.push(e);
          }
        });
        cycle.forEach(v => { if (v !== dropped) out.push(inE[v]); });

        const cmE = [C.clearHull('cyc' + depth)];
        out.forEach(e => cmE.push(C.edge(e.vid, 'path')));
        cycle.forEach(v => cmE.push(C.state(v, 'visited')));
        b.step('**展开 ' + cid + '**：外部边从 ' + (dropped || '?') + ' 进入环，于是环内**指向 ' + (dropped || '?') + ' 的入边被顶掉**，' +
          '环上其余入边全部保留。这样既打破环，又只付出最小代价。',
        cmE, { line: 11, milestone: '展开 ' + cid + '（顶掉指向 ' + dropped + ' 的入边）' });
        return { ok: true, picked: out };
      };

      b.step('**最小树形图**（最优分支）：给定有向图和根，求一棵**根可达所有点、除根外每点入度为 1** 的生成子图，使总权最小。' +
        '无向图的 Prim / Kruskal 在这里彻底失效（有向边不能反向用），必须用朱刘算法。根 = **' + root + '**，' +
        '边：' + CL_EDGES.map(e => e.join('·')).join('，') + '。',
      [C.setQ('log', ['根 = ' + root])], { line: 2 });

      const res = solve(ids, g.edges.map(e => ({ id: e.id, vid: e.id, from: e.source, to: e.target, w: e.weight })), root, 0);
      if (!res.ok) {
        b.step('**无解**：' + res.reason, [], { line: 5, milestone: '无解' });
      } else {
        const total = res.picked.reduce((a, e) => a + e.w, 0);
        const cm = res.picked.map(e => C.edge(e.vid, 'path'));
        b.step('**最小树形图完成**：' + res.picked.map(e => e.from + '→' + e.to).join('、') + '，总权 = **' + total + '**。' +
          '朱刘算法的骨架是"**先贪心、遇环就缩、缩完递归、最后展开**"：每缩一次环问题规模一定变小，' +
          '所以最多 O(V) 轮，总复杂度 O(VE)。', cm, { line: 12, milestone: '最小树形图：总权 = ' + total });
      }
      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 3. 点双连通分量 与 圆方树
   * ============================================================ */
  const VB_NODES = [['A', 240, 130], ['B', 420, 130], ['C', 520, 300], ['D', 720, 130], ['E', 860, 300], ['F', 1010, 300]];
  const VB_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D'], ['D', 'E'], ['E', 'C'], ['E', 'F']];

  TGV.register({
    id: 'vbcc', name: '点双连通分量 与 圆方树', category: '图 · 连通性',
    layout: 'fixed', directed: false,
    compareWith: 'e_bcc',
    panels: [
      { id: 'watch', type: 'table', title: 'dfn / low', columns: [{ key: 'dfn', label: 'dfn' }, { key: 'low', label: 'low' }], rowOrder: ['A', 'B', 'C', 'D', 'E', 'F'] },
      { id: 'estack', type: 'stack', title: '边栈（点双专用）' },
      { id: 'blocks', type: 'list', title: '点双分量' }
    ],
    pseudocode: [
      '// 点双连通分量（v-BCC）：删掉任意一个点都不会断开的极大子图',
      '// 与 Tarjan SCC 的区别：① 边栈里压的是"边"；② 判定条件是 low[v] >= dfn[u]',
      'dfs(u, parentEdge):',
      '    dfn[u] = low[u] = ++timer',
      '    for each 边 (u,v,eid), eid != parentEdge:',
      '        if v 未访问:',
      '            边栈.push(eid); dfs(v, eid)',
      '            low[u] = min(low[u], low[v])',
      '            if low[v] >= dfn[u]:                  // u 是这个点双分量的"入口"',
      '                弹边直到 eid，弹出的边构成一个点双分量',
      '        elif dfn[v] < dfn[u]:                     // 只从祖先方向压一次，避免同边压两次',
      '            边栈.push(eid); low[u] = min(low[u], dfn[v])',
      '// 圆方树：原图每个顶点画成"圆点 ●"，每个点双分量画成"方点 ■"',
      '// 圆点连向它所属的所有方点 → 复杂无向图变成一棵树，树上问题立刻可做'
    ],
    presets: [
      { id: 'std', label: '两个三角形共享割点 + 一条桥 → 圆方树', desc: '点双 #1 = {A,B,C}、#2 = {C,D,E}、#3 = {E,F}', data: () => ({}) }
    ],
    run(input) {
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: false })
        : TGV.GraphLib.mkGraph(VB_NODES, VB_EDGES, { directed: false });
      /* 方点：预先声明为隐藏结点（slots=['■'] 会渲染成方形），坐标稍后用 morph 摆放 */
      const sqCount = Math.max(3, g.nodes.length + 2);
      const sq = Array.from({ length: sqCount }, (_, i) => ({
        id: 'S' + (i + 1), label: '', x: 300 + i * 88, y: 330, slots: ['■'], hidden: true
      }));
      const b = new TGV.Builder(this, { nodes: g.nodes.concat(sq), edges: g.edges, panels: this.panels });

      const adj = {};
      g.nodes.forEach(n => adj[n.id] = []);
      g.edges.forEach(e => {
        adj[e.source].push({ to: e.target, eid: e.id });
        adj[e.target].push({ to: e.source, eid: e.id });
      });
      const dfn = {}, low = {}, eStack = [];
      let timer = 0;
      const blocks = [];
      const COLORS = ['#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B'];

      b.step('**点双连通分量**：如果一个连通块里**删掉任意一个点都仍然连通**，它就是点双连通的。' +
        '求法与 Tarjan SCC 很像，但有两处关键差别：① 栈里压的是**边**；② 判定条件是 `low[v] ≥ dfn[u]`。' +
        '本图是两个三角形共享割点 C，再挂一条桥 E–F。',
      [], { line: 1 });

      const dfs = (u, pe) => {
        dfn[u] = low[u] = ++timer;
        b.step('进入 ' + u + '：`dfn = low = ' + dfn[u] + '`。',
          [C.state(u, 'active'), C.table('watch', u, 'dfn', dfn[u], true), C.table('watch', u, 'low', low[u], true)],
          { line: 4, vars: [{ name: 'dfn', value: dfn[u] }] });

        adj[u].forEach(link => {
          const v = link.to;
          if (link.eid === pe) return;
          if (!dfn[v]) {
            eStack.push(link.eid);
            b.step('树边 ' + u + '–' + v + ' **压入边栈**，继续 DFS。',
              [C.edge(link.eid, 'active'), C.setQ('estack', eStack.slice())], { line: 7 });
            dfs(v, link.eid);
            low[u] = Math.min(low[u], low[v]);
            b.step(v + ' 回溯：`low[' + u + '] = min(low[' + u + '], low[' + v + ']=' + low[v] + ') = ' + low[u] + '`。' +
              '判定式 **low[v] ≥ dfn[u]** → ' + (low[v] >= dfn[u] ? '成立：' + u + ' 是这个点双分量的"入口点"' : '不成立：继续往上找'),
            [C.table('watch', u, 'low', low[u], true), C.edge(link.eid, 'visited')], { line: 8 });

            if (low[v] >= dfn[u]) {
              const blk = [];
              let popped = null;
              do {
                popped = eStack.pop();
                if (popped) blk.push(popped);
              } while (popped && popped !== link.eid);
              blocks.push(blk);
              const vs = [];
              blk.forEach(eid => {
                const e = g.edges.find(x => x.id === eid);
                if (e) { if (!vs.includes(e.source)) vs.push(e.source); if (!vs.includes(e.target)) vs.push(e.target); }
              });
              const col = COLORS[(blocks.length - 1) % COLORS.length];
              const cm3 = [C.setQ('estack', eStack.slice()),
                C.hull('blk' + blocks.length, vs, col, '点双 #' + blocks.length),
                C.push('blocks', { key: 'b' + blocks.length, label: '#' + blocks.length + '  {' + vs.join(',') + '}' })
              ];
              blk.forEach(eid => cm3.push(C.edgeColor(eid, col)));
              b.step('**弹边成块**：从边栈弹出 ' + blk.length + ' 条边（直到刚才那条树边），它们构成点双分量 **#' + blocks.length +
                '** = {' + vs.join(', ') + '}。注意割点会同时出现在多个点双里（C 就属于两个三角形）。',
              cm3, { line: 10, milestone: '发现点双 #' + blocks.length + '：{' + vs.join(',') + '}' });
            }
          } else if (dfn[v] < dfn[u]) {
            eStack.push(link.eid);
            low[u] = Math.min(low[u], dfn[v]);
            b.step('发现**回边** ' + u + '–' + v + '（v 是祖先，dfn[' + v + ']=' + dfn[v] + ' < dfn[' + u + ']）：压栈，并让 `low[' + u + '] = ' +
              low[u] + '`。只从祖先方向压一次，避免同一条边被压两遍。',
            [C.edge(link.eid, 'active'), C.setQ('estack', eStack.slice()), C.table('watch', u, 'low', low[u], true)],
            { line: 12 });
          }
        });
        b.step(u + ' 处理完毕。', [C.state(u, 'visited')], { line: 4 });
      };
      dfs(input.start != null ? String(input.start) : 'A', null);

      b.step('**点双全部找完**：共 ' + blocks.length + ' 个点双分量。现在把它们"展开"成圆方树：' +
        '原图每个顶点是**圆点 ●**，每个点双分量生成一个**方点 ■**，方点连向它包含的所有圆点。',
      [C.setQ('blocks', blocks.map((blk, i) => ({ key: 'b' + (i + 1), label: '#' + (i + 1) })))],
      { line: 13, milestone: '点双 = ' + blocks.length + ' 个' });

      /* ---------- 圆方树 ---------- */
      const topX = { A: 200, B: 360, C: 520, D: 680, E: 840, F: 1000 };
      const posAll = {};
      Object.keys(topX).forEach(id => { posAll[id] = { x: topX[id], y: 120 }; });
      const cmM = [C.morph(JSON.parse(JSON.stringify(posAll)), 480)];
      g.edges.forEach(e => cmM.push(C.hideEdge(e.id)));
      blocks.forEach((_, i) => cmM.push(C.clearHull('blk' + (i + 1))));
      b.step('第一步：把原图摊平——所有圆点排到同一行，原图边暂时隐藏。', cmM, { line: 13 });

      blocks.forEach((blk, i) => {
        const sid = 'S' + (i + 1);
        const vs = [];
        blk.forEach(eid => {
          const e = g.edges.find(x => x.id === eid);
          if (e) { if (!vs.includes(e.source)) vs.push(e.source); if (!vs.includes(e.target)) vs.push(e.target); }
        });
        const cx = vs.reduce((a, v) => a + topX[v], 0) / vs.length;
        posAll[sid] = { x: cx, y: 330 };
        const cm = [C.show(sid), C.state(sid, 'conflict'), C.morph(JSON.parse(JSON.stringify(posAll)), 420)];
        vs.forEach(v => {
          cm.push(C.addEdge(sid + '-' + v, sid, v));
          cm.push(C.state(v, 'active'));
        });
        b.step('生成**方点 ■ ' + sid + '** 代表点双 #' + (i + 1) + '，向其中的每个圆点 {' + vs.join(', ') + '} 连边。' +
          '方点本身不参与搜索，它只是"这些点属于同一个双连通块"的记录。',
        cm, { line: 14, milestone: '方点 ' + sid + ' 挂接 ' + vs.length + ' 个圆点' });
      });

      b.step('**圆方树构造完成**：' + g.nodes.length + ' 个圆点 + ' + blocks.length + ' 个方点 = ' +
        (g.nodes.length + blocks.length) + ' 个结点，圆点与方点交替出现、**绝无环**。' +
        '于是"删掉某个点后图分几块""两点间有几条点不相交路径"这类问题，全都变成树上的简单统计。',
      [], { line: 14, milestone: '圆方树建完（' + (g.nodes.length + blocks.length) + ' 点）' });

      return { nodes: b.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
