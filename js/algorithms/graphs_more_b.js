/* ============================================================
 * 第二卷 · 图算法补充（二）
 * HLPP 最高标号预流推进 · 带花树（一般图最大匹配） · 最大团（Bron-Kerbosch）
 * ============================================================ */
(function () {
  'use strict';
  const C = TGV.C;

  /* ============================================================
   * 1. HLPP 最高标号预流推进
   * ============================================================ */
  const HL_NODES = [['S', 150, 300], ['1', 400, 150], ['2', 400, 450], ['3', 660, 300], ['T', 920, 300]];
  const HL_EDGES = [['S', '1', 10], ['S', '2', 10], ['1', '2', 4], ['1', '3', 3], ['2', '3', 8], ['3', 'T', 10], ['1', 'T', 6]];

  TGV.register({
    id: 'hlpp', name: 'HLPP 最高标号预流推进', category: '图 · 匹配与网络流',
    layout: 'fixed', directed: true,
    compareWith: 'dinic',
    panels: [
      { id: 'state', type: 'table', title: '高度 h 与超额流 e', columns: [{ key: 'h', label: 'h[·] 高度' }, { key: 'e', label: 'e[·] 超额流' }] },
      { id: 'active', type: 'list', title: '活跃点（e>0 且非 S/T）' }
    ],
    pseudocode: [
      '// 预流推进彻底抛弃"增广路"，改用"水往低处流"的物理直觉',
      '// 每个点有高度 h（离汇的"势"）与超额流 e（灌进来的水还没流走）',
      'init:',
      '    h[S] = V（把源点抬到最高，水才会往下流）；其余 h = 0',
      '    把 S 的所有出边灌满：e[S] = 0，对应邻点 e[v] += cap(S,v)   // 预流（不守恒）',
      'while 还存在"活跃点" u（e[u] > 0 且 u 不是 S/T）:',
      '    u = 高度 h 最大的活跃点                        // 这就是"最高标号"',
      '    discharge(u):',
      '        if 存在残余边 (u,v) 且 h[u] == h[v] + 1:',
      '            push: d = min(e[u], 残余容量)；e[u]-=d；e[v]+=d',
      '        else:',
      '            relabel: h[u] = min{ h[v] } + 1         // 邻居都比自己高，只好抬高自己',
      '// 结束时 e[T] 就是最大流；且任何时刻 h 都满足"残余边两端高度差 ≤ 1"',
      '// 最高标号策略让 relabel 次数降到 O(V²)，整体 O(V²√E)'
    ],
    presets: [
      { id: 'std', label: '5 点网络 · 水往低处流', desc: '观察 push 与 relabel 交替，超额流最终汇入 T', data: () => ({}) },
      { id: 'tall', label: '相同网络 · 换成普通 FIFO 顺序', desc: '同样正确，但推进会慢一些（帧更多）', data: () => ({ fifo: true }) }
    ],
    run(input) {
      const fifo = !!input.fifo;
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [n.id, n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [e.source, e.target, e.weight != null ? e.weight : 1]),
            { directed: true })
        : TGV.GraphLib.mkGraph(HL_NODES, HL_EDGES, { directed: true });
      const ids = g.nodes.map(n => n.id);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const S = 'S', T = 'T';
      const n = ids.length;

      /* 残量网络 */
      const net = [];
      const pairOf = {};
      g.edges.forEach(e => {
        const fi = net.length;
        net.push({ u: e.source, v: e.target, cap: e.weight, flow: 0, eid: e.id, rev: fi + 1, isRev: false });
        net.push({ u: e.target, v: e.source, cap: 0, flow: 0, eid: e.id, rev: fi, isRev: true });
        pairOf[e.id] = fi;
      });
      const resid = (i) => net[i].cap - net[i].flow;
      const outOf = {};
      ids.forEach(id => outOf[id] = []);
      net.forEach((e, i) => outOf[e.u].push(i));

      const h = {}, ex = {};
      ids.forEach(id => { h[id] = 0; ex[id] = 0; });

      const paint = (cmds) => {
        ids.forEach(id => {
          cmds.push(C.badge(id, 'h', h[id], h[id] > 0));
          cmds.push(C.badge(id, 'e', ex[id], ex[id] > 0));
          cmds.push(C.table('state', id, 'h', h[id]));
          cmds.push(C.table('state', id, 'e', ex[id]));
        });
        // 边流量
        g.edges.forEach(e => {
          const i = pairOf[e.id];
          cmds.push(C.flowEdge(e.id, net[i].flow, net[i].cap));
        });
      };
      const activeList = () => ids.filter(id => id !== S && id !== T && ex[id] > 0);

      b.step('**预流推进**的思路完全不同于增广路：它把流想象成**水**，每个点有一个高度 `h`，' +
        '水只能从高处流向低处（`h[u] == h[v] + 1`）。源点被抬到最高 `h[S] = V`，' +
        '水从它灌出去后，靠"超额流 `e`"在图中堆积、抬升、再下泄，最终全部流入汇点。',
      [], { line: 2 });

      /* 预流：把 S 的出边灌满 */
      h[S] = n;
      const cm0 = [];
      outOf[S].forEach(i => {
        const e = net[i];
        if (e.isRev || e.cap <= 0) return;
        e.flow = e.cap;
        net[e.rev].flow = -e.cap;
        ex[e.v] += e.cap;
        cm0.push(C.edge(e.eid, 'path'));
      });
      paint(cm0);
      b.step('**初始化**：`h[S] = ' + n + '`（抬到最高），然后把 S 的每条出边**直接灌满**。' +
        '注意此刻流量并不守恒——S 灌出去的水还堆在邻点上，这些没流走的量就叫**超额流 e**。' +
        '预流（preflow）允许"流入 ≥ 流出"，这是它与普通流的唯一区别。',
      cm0, { line: 5, milestone: '预流：h[S] = ' + n + '，e[1]=' + ex['1'] + '、e[2]=' + ex['2'], stage: true });

      let guard = 0;
      while (guard++ < 200) {
        const act = activeList();
        if (!act.length) break;
        act.sort((a, b2) => (fifo ? 0 : h[b2] - h[a]));
        const u = act[0];
        b.step('**选点**：当前活跃点 ' + act.join('、') + '。' +
          (fifo ? '（FIFO 顺序）' : '**最高标号策略**：挑高度最大的 ' + u + '（h=' + h[u] + '）。'),
        [C.state(u, 'active'), C.setQ('active', act.slice())], { line: 7, vars: [{ name: 'u', value: u }, { name: 'h', value: h[u] }] });

        /* discharge */
        let inner = 0;
        while (ex[u] > 0 && inner++ < 30) {
          let pushed = false;
          const outs = outOf[u];
          for (let k = 0; k < outs.length; k++) {
            const i = outs[k], e = net[i];
            if (resid(i) <= 0) continue;
            if (h[u] === h[e.v] + 1) {
              const d = Math.min(ex[u], resid(i));
              e.flow += d;
              net[e.rev].flow -= d;
              ex[u] -= d;
              ex[e.v] += d;
              const cm = [C.edge(e.eid, 'path'), C.pulse(e.eid, { color: '#0EA5E9' })];
              paint(cm);
              cm.push(C.flowEdge(e.eid, e.flow, e.cap));
              b.step('**push(' + u + ' → ' + e.v + ')**：h[' + u + ']=' + h[u] + '、h[' + e.v + ']=' + h[e.v] + '，正好差 1，' +
                '残余容量 ' + (resid(i) + d) + '，可推 ' + d + ' → 推 **' + d + '** 单位。`e[' + u + ']` 降为 ' + ex[u] + '，`e[' + e.v + ']` 升为 ' + ex[e.v] + '。',
              cm, { line: 10, vars: [{ name: 'Δ', value: d }] });
              pushed = true;
              break;   // 推一次后重新从小到大扫描（当前弧）
            }
          }
          if (pushed) continue;
          /* relabel */
          let mn = Infinity;
          outs.forEach(i => {
            if (resid(i) > 0) mn = Math.min(mn, h[net[i].v]);
          });
          const old = h[u];
          h[u] = (mn === Infinity ? old + 1 : mn + 1);
          const cm = [C.state(u, 'conflict')];
          paint(cm);
          b.step('**relabel(' + u + ')**：所有还有残余容量的邻居高度都 ≥ ' + old + '，没有可以流下去的地方 → ' +
            '把自己的高度抬到"最矮邻居 + 1" = **' + h[u] + '**。这就是水被堵住时"水位上涨"的过程。',
          cm, { line: 12, milestone: 'relabel ' + u + '：' + old + ' → ' + h[u], vars: [{ name: 'h', value: h[u] }] });
        }
        paint([]);
        b.step(u + ' 的超额流清零，退出活跃点集合。', [C.state(u, ex[u] > 0 ? 'active' : 'visited')], { line: 9 });
      }

      const cmF = [];
      paint(cmF);
      cmF.push(C.state(T, 'path'));
      b.step('**最大流 = e[T] = ' + ex[T] + '**。注意此时源点的出边可能并没有全部灌满又退回来了——' +
        '预流推进允许"走回头路"（残余网络中的反向边），所以它从不需要"找增广路"，' +
        '只需要**push 和 relabel 两个原子动作**。最高标号策略保证 relabel 次数是 O(V²)，总复杂度 O(V²√E)。',
      cmF, { line: 13, milestone: '最大流 = ' + ex[T] });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 2. 带花树（一般图最大匹配）
   * ============================================================ */
  const BL_NODES = [['1', 300, 130], ['2', 560, 130], ['3', 430, 300], ['4', 660, 400], ['5', 420, 500]];
  const BL_EDGES = [['1', '2'], ['2', '3'], ['3', '1'], ['3', '4'], ['4', '5']];

  TGV.register({
    id: 'blossom', name: '一般图最大匹配 · 带花树算法', category: '图 · 匹配与网络流',
    layout: 'fixed', directed: false,
    compareWith: 'hungarian',
    panels: [
      { id: 'match', type: 'table', title: '匹配状态', columns: [{ key: 'p', label: 'match' }] },
      { id: 'tree', type: 'list', title: '交错树（偶点 / 奇点）' }
    ],
    pseudocode: [
      '// 二分图能用匈牙利，一般图（有奇环）必须用带花树 / Blossom',
      '// 奇环会让"外层点—外层点"直接相遇，破坏二部结构 → 必须把整个奇环缩成一朵"花"',
      'for root in 所有未匹配点:',
      '    BFS 建交错树：root 是偶点(outer)，它的邻居是奇点(inner)，再往外又是偶点',
      '    扫到边 (v, to):',
      '        if to 已被访问且在同一棵树 → 发现奇环（花）',
      '            找出环的 lca，把环上所有点 base 都改成 lca',
      '            环上所有点重新变成偶点并继续 BFS（花被整体压缩，但仍能往外扩）',
      '        elif to 未匹配:',
      '            沿交替路把匹配边状态翻转（增广）→ 匹配数 +1，break',
      '        else:',
      '            把 to 的匹配伙伴拉进树，继续 BFS',
      '// 花（Blossom）被压缩后依然可以往外找增广路，找到后展开还原 —— 这是它最精妙之处'
    ],
    presets: [
      { id: 'std', label: '三角形 + 挂链 → 出现一朵花', desc: '奇环 1-2-3 会被压缩成花，再找到增广路', data: () => ({}) }
    ],
    run(input) {
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: false })
        : TGV.GraphLib.mkGraph(BL_NODES, BL_EDGES, { directed: false });
      const ids = g.nodes.map(n => n.id);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const n = ids.length;
      const idx = {}; ids.forEach((id, i) => idx[id] = i);
      const adj = ids.map(() => []);
      g.edges.forEach(e => {
        adj[idx[e.source]].push({ to: idx[e.target], eid: e.id });
        adj[idx[e.target]].push({ to: idx[e.source], eid: e.id });
      });
      const eidOf = (a, c) => {
        const e = g.edges.find(x => (x.source === ids[a] && x.target === ids[c]) || (x.source === ids[c] && x.target === ids[a]));
        return e ? e.id : null;
      };

      let match = new Array(n).fill(-1);
      let p = new Array(n).fill(-1);
      let base = new Array(n).fill(0).map((_, i) => i);
      let used = new Array(n).fill(false);
      let blossom = new Array(n).fill(false);
      let hullSeq = 0;

      const paintMatch = (cmds) => {
        ids.forEach((id, i) => {
          cmds.push(C.table('match', id, 'p', match[i] === -1 ? '自由' : ids[match[i]]));
        });
        g.edges.forEach(e => {
          const a = idx[e.source], c = idx[e.target];
          if (match[a] === c) cmds.push(C.edgeColor(e.id, '#EC4899', false, 3.6));
          else cmds.push(C.edge(e.id, 'default'));
        });
      };
      const paintTree = (cmds) => {
        for (let i = 0; i < n; i++) {
          if (used[i]) cmds.push(C.state(ids[i], 'active'));       // 偶点 outer
          else if (p[i] !== -1) cmds.push(C.state(ids[i], 'frontier')); // 奇点 inner
          else cmds.push(C.state(ids[i], 'default'));
        }
      };
      const clearStates = (cmds) => { for (let i = 0; i < n; i++) cmds.push(C.state(ids[i], 'default')); };

      const nm = (i) => (i === -1 ? '自由' : ids[i]);

      b.step('**一般图最大匹配**：二分图可以用匈牙利算法，但一般图里有**奇环**——' +
        '沿着"非匹配边 → 匹配边 → 非匹配边"走下去，会在奇环上撞见另一个外层点，二部结构被破坏。' +
        '带花树的解法是：**把整个奇环收缩成一朵"花"，在压缩后的图上继续找增广路，找到后再展开**。' +
        '本图是一个三角形 1-2-3 挂上 3-4-5 的链。',
      [C.setQ('tree', [])], { line: 1 });

      const lca = (a, c) => {
        const usedPath = new Array(n).fill(false);
        let guard = 0;
        while (guard++ < 50) {
          a = base[a];
          usedPath[a] = true;
          if (match[a] === -1) break;
          a = p[match[a]];
          if (a === -1) break;
        }
        guard = 0;
        while (guard++ < 50) {
          c = base[c];
          if (usedPath[c]) return c;
          if (match[c] === -1) return c;
          c = p[match[c]];
          if (c === -1) return -1;
        }
        return -1;
      };
      const markPath = (v, bbase, child) => {
        let guard = 0;
        while (base[v] !== bbase && guard++ < 50) {
          blossom[base[v]] = true;
          blossom[base[match[v]]] = true;
          p[v] = child;
          child = match[v];
          v = p[match[v]];
          if (v === -1) break;
        }
      };

      const findPath = (root) => {
        used = new Array(n).fill(false);
        p = new Array(n).fill(-1);
        base = new Array(n).fill(0).map((_, i) => i);
        used[root] = true;
        const q = [root];
        const cmR = [C.state(ids[root], 'active'),
          C.setQ('tree', [{ key: 'o', label: '偶点(outer) ' + ids[root] }])];
        paintTree(cmR);
        b.step('以未匹配点 **' + ids[root] + '** 为根，开始 BFS 建**交错树**：根是偶点（外层），' +
          '沿非匹配边走一步得到奇点（内层），再沿匹配边走一步又变回偶点。',
        cmR, { line: 4, milestone: '从 ' + ids[root] + ' 开始找增广路', stage: true });

        let guard = 0;
        while (q.length && guard++ < 40) {
          const v = q.shift();
          for (const link of adj[v]) {
            const to = link.to;
            if (base[v] === base[to] || match[v] === to) continue;
            if (to === root || (match[to] !== -1 && p[match[to]] !== -1)) {
              /* 发现花 */
              const cb = lca(v, to);
              const ring = [];
              blossom = new Array(n).fill(false);
              markPath(v, cb, to);
              markPath(to, cb, v);
              for (let i = 0; i < n; i++) {
                if (blossom[base[i]]) {
                  base[i] = cb;
                  if (!used[i]) { used[i] = true; q.push(i); }
                  ring.push(ids[i]);
                }
              }
              const cm = [C.hull('bl' + (++hullSeq), ring, '#F59E0B', '花 ✿'), C.edge(link.eid, 'active')];
              paintTree(cm);
              cm.push(C.edgeColor(link.eid, '#F59E0B', true));
              b.step('**发现奇环（花 ✿）**！扫到边 ' + ids[v] + '–' + ids[to] + ' 时，两端都是**偶点**且已在同一棵树里。' +
                '环上结点 {' + ring.join(', ') + '} 被整体收缩，`base` 全部改成 lca = **' + ids[cb] + '**，' +
                '环上原本的内层点也一并升级成偶点继续向外扩展。',
              cm, { line: 7, milestone: '花收缩：{' + ring.join(',') + '}', vars: [{ name: 'lca', value: ids[cb] }] });
            } else if (p[to] === -1) {
              p[to] = v;
              if (match[to] === -1) {
                /* 增广 */
                const pathNodes = [];
                let cur = to, g2 = 0;
                while (cur !== -1 && g2++ < 30) {
                  const pv = p[cur];
                  if (pv === -1) break;
                  const ppv = match[pv];
                  match[cur] = pv; match[pv] = cur;
                  pathNodes.push(ids[cur] + '–' + ids[pv]);
                  cur = ppv;
                }
                const cm = [];
                paintMatch(cm);
                paintTree(cm);
                clearStates(cm);
                cm.push(C.hull('aug' + root, pathNodes.map(s => s.split('–')).flat(), '#10B981', '增广路'));
                b.step('走到**自由点 ' + ids[to] + '** → 找到一条增广路！沿这条路把匹配状态**整体翻转**：' +
                  pathNodes.join('、') + ' 变成匹配边。匹配数 +1。',
                cm, { line: 10, milestone: '增广：' + pathNodes.join('、') });
                return true;
              }
              used[match[to]] = true;
              q.push(match[to]);
              const cm = [C.edge(link.eid, 'visited')];
              paintTree(cm);
              cm.push(C.setQ('tree', ids.map((id, i) => (used[i] ? { key: 'o' + i, label: '偶点 ' + id } : (p[i] !== -1 ? { key: 'i' + i, label: '奇点 ' + id } : null))).filter(Boolean)));
              b.step('边 ' + ids[v] + '–' + ids[to] + '：' + ids[to] + ' 已匹配给 ' + nm(match[to]) + '，' +
                '于是把 ' + ids[to] + ' 当成奇点、把它的匹配伙伴 **' + nm(match[to]) + '** 拉进树当新的偶点。',
              cm, { line: 12 });
            }
          }
        }
        return false;
      };

      let matched = 0;
      for (let v = 0; v < n; v++) {
        if (match[v] !== -1) continue;
        b.step('**轮次**：点 ' + ids[v] + ' 还没有匹配，尝试为它找一条增广路。',
          [C.state(ids[v], 'active')], { line: 3, milestone: '尝试为 ' + ids[v] + ' 增广' });
        const ok = findPath(v);
        if (ok) matched++;
        for (let i = 0; i <= hullSeq; i++) { /* 花保留在画布上作为痕迹 */ }
        if (!ok) b.step('以 ' + ids[v] + ' 为根**找不到增广路**（它的连通块已经达到最大匹配），放弃这一轮。', [], { line: 9 });
      }

      const cmF = [];
      paintMatch(cmF);
      clearStates(cmF);
      const pairs = [];
      for (let i = 0; i < n; i++) if (match[i] > i) pairs.push(ids[i] + '–' + ids[match[i]]);
      b.step('**一般图最大匹配完成**：匹配数 = **' + pairs.length + '**，匹配边为 ' + (pairs.join('、') || '无') + '。' +
        '带花树的关键洞察是：**奇环被压缩成花之后，与花内部任何一点相连的边都等价于与花相连**，' +
        '所以压缩不丢失信息；找到增广路后再把花展开，就能还原出真实的匹配方案。',
      cmF, { line: 13, milestone: '最大匹配 = ' + pairs.length });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });

  /* ============================================================
   * 3. 最大团（Bron-Kerbosch）
   * ============================================================ */
  const MC_NODES = [['1', 260, 160], ['2', 420, 130], ['3', 380, 320], ['4', 620, 300], ['5', 760, 180], ['6', 760, 430]];
  const MC_EDGES = [['1', '2'], ['1', '3'], ['2', '3'], ['3', '4'], ['4', '5'], ['3', '5'], ['5', '6'], ['4', '6']];

  TGV.register({
    id: 'max_clique', name: '最大团 · Bron-Kerbosch（枢轴剪枝）', category: '图 · 连通性',
    layout: 'fixed', directed: false,
    compareWith: 'graph_color',
    panels: [
      { id: 'sets', type: 'table', title: '三个集合（R / P / X）', columns: [{ key: 'R', label: 'R 当前团' }, { key: 'P', label: 'P 候选' }, { key: 'X', label: 'X 已排除' }] },
      { id: 'best', type: 'text', title: '已知最大团' }
    ],
    pseudocode: [
      '// 团（clique）= 两两相邻的点集；最大团是 NP-hard 的经典问题',
      'bron_kerbosch(R, P, X):',
      '    if P 与 X 都为空:',
      '        记录 R 为一个极大团；if |R| 更大: best = R',
      '        return',
      '    // 枢轴优化：从 P ∪ X 里挑一个"邻居最多的点" u 作为枢轴',
      '    u = argmax |P ∩ N(u)|',
      '    for each v in P \\ N(u):                 // 只枚举"不与枢轴相邻"的点',
      '        bron_kerbosch(R ∪ {v}, P ∩ N(v), X ∩ N(v))',
      '        P = P \\ {v}; X = X ∪ {v}           // 回溯：v 处理完，移入 X',
      '// 枢轴剪枝的意义：不选枢轴 u 的分支被整体跳过，因为 u 自己那一支会覆盖它',
      '// 最坏仍是 O(3^(n/3))，但实测快几倍到几十倍'
    ],
    presets: [
      { id: 'std', label: '6 点图 · 最大团 {3,4,5}', desc: '观察 R/P/X 的递归演变与枢轴剪枝', data: () => ({}) }
    ],
    run(input) {
      const g = (input && input.custom && input.nodes && input.edges)
        ? TGV.GraphLib.mkGraph(
            input.nodes.map(n => [String(n.id), n.x != null ? n.x : 400, n.y != null ? n.y : 300]),
            input.edges.map(e => [String(e.source), String(e.target), e.weight != null ? e.weight : 1]),
            { directed: false })
        : TGV.GraphLib.mkGraph(MC_NODES, MC_EDGES, { directed: false });
      const ids = g.nodes.map(n => n.id);
      const b = new TGV.Builder(this, { nodes: g.nodes, edges: g.edges, panels: this.panels });
      const adjSet = {};
      ids.forEach(id => adjSet[id] = new Set());
      g.edges.forEach(e => {
        adjSet[e.source].add(e.target);
        adjSet[e.target].add(e.source);
      });
      const inter = (arr, set) => arr.filter(x => set.has(x));
      let best = [];
      let hullN = 0;
      const setText = (arr) => (arr.length ? arr.join(',') : '∅');

      b.step('**团**是两两相邻的点集，**最大团**就是要找最大的那个。这是 NP 难问题，主流做法是 ' +
        'Bron-Kerbosch 的"三个集合"递归：`R`（当前已选的团）、`P`（还能选的候选）、`X`（已排除，用来去重）。' +
        '当 `P` 与 `X` 都空时，`R` 就是一个**极大团**。',
      [C.text('best', ['当前已知最大团：∅', '最大团大小：0'])], { line: 1 });

      const rec = (R, P, X, depth) => {
        const cmA = [
          C.table('sets', 'depth' + depth, 'R', setText(R)),
          C.table('sets', 'depth' + depth, 'P', setText(P)),
          C.table('sets', 'depth' + depth, 'X', setText(X))
        ];
        ids.forEach(id => {
          if (R.includes(id)) cmA.push(C.state(id, 'path'));
          else if (P.includes(id)) cmA.push(C.state(id, 'active'));
          else if (X.includes(id)) cmA.push(C.state(id, 'visited'));
          else cmA.push(C.state(id, 'ghost'));
        });
        b.step('**递归第 ' + depth + ' 层**：R = {' + setText(R) + '}，P = {' + setText(P) + '}，X = {' + setText(X) + '}。' +
          (P.length + X.length ? '还有待探索的分支。' : '**P 与 X 都空了 → R 是一个极大团！**'),
        cmA, { line: 3, vars: [{ name: '|R|', value: R.length }] });

        if (!P.length && !X.length) {
          const isBest = R.length > best.length;
          if (isBest) best = R.slice();
          const cm = [];
          if (R.length) cm.push(C.hull('clq' + (++hullN), R, '#EC4899', '极大团 |R|=' + R.length));
          if (isBest) {
            cm.push(C.text('best', ['当前已知最大团：{' + setText(R) + '}', '最大团大小：' + R.length]));
          }
          b.step('**找到一个极大团** {' + setText(R) + '}，大小 ' + R.length + (isBest ? ' —— **刷新了最大值**！' : '（不比已知最优更大，忽略）'),
            cm, { line: 4, milestone: '极大团 {' + setText(R) + '}  size=' + R.length });
          return;
        }

        /* 枢轴：选 P ∪ X 中"在 P 里邻居最多"的点 */
        const union = P.concat(X);
        let pivot = null, bestCnt = -1;
        union.forEach(u => {
          const cnt = inter(P, adjSet[u]).length;
          if (cnt > bestCnt) { bestCnt = cnt; pivot = u; }
        });
        const branch = P.filter(v => !adjSet[pivot] || !adjSet[pivot].has(v));
        const cmP = [C.state(pivot, 'conflict')];
        b.step('**枢轴（pivot）** 选 **' + pivot + '**：它在候选集 P 里有 ' + bestCnt + ' 个邻居，是最"热门"的点。' +
          '于是我们只枚举 `P \\ N(u)` = {' + setText(branch) + '} —— **不和枢轴相邻的点**。' +
          '凡是与枢轴相邻的候选点都不必单独试，因为枢轴那一支已经覆盖了它们，这就是剪枝。',
        cmP, { line: 7, milestone: '枢轴 ' + pivot + '，待试 ' + branch.length + ' 个' });

        branch.forEach(v => {
          const nv = adjSet[v];
          const cm = [C.state(v, 'conflict')];
          b.step('把 **' + v + '** 加入当前团，继续往深处递归：新候选 = P ∩ N(' + v + ') = {' + setText(inter(P, nv)) + '}。',
            cm, { line: 8 });
          rec(R.concat([v]), inter(P, nv), inter(X, nv), depth + 1);
          /* 回溯 */
          const idxP = P.indexOf(v);
          if (idxP >= 0) P.splice(idxP, 1);
          X.push(v);
          b.step('回溯：把 ' + v + ' 从 P 移到 X（它已经彻底探索完，以后不再重复尝试）。',
            [C.table('sets', 'depth' + depth, 'P', setText(P)), C.table('sets', 'depth' + depth, 'X', setText(X)), C.state(v, 'visited')],
            { line: 10 });
        });
      };

      rec([], ids.slice(), [], 0);

      const cmF = [];
      if (best.length) cmF.push(C.hull('final', best, '#EC4899', '最大团'));
      ids.forEach(id => cmF.push(C.state(id, best.includes(id) ? 'path' : 'ghost')));
      cmF.push(C.text('best', ['最大团：{' + setText(best) + '}', '大小：' + best.length]));
      b.step('**最大团 = {' + setText(best) + '}，大小 ' + best.length + '**。' +
        'Bron-Kerbosch 的复杂度上界依然是 O(3^(n/3))（最大团是 NP 难的），' +
        '但"枢轴剪枝 + 位运算优化"能让实际运行快上几十倍，它是目前精确求解最大团最常用的骨架。',
      cmF, { line: 12, milestone: '最大团 = {' + setText(best) + '}' });

      return { nodes: g.nodes, edges: g.edges, frames: b.frames, panels: b.panels };
    }
  });
})();
