/* ============================================================
 * TreeGraphVis · 自动布局引擎
 *  - tree      : Reingold-Tilford 紧凑树布局（轮廓线 Contour 算法）
 *  - force     : Fruchterman-Reingold 力导向
 *  - layered   : Sugiyama 层次化 DAG 布局
 *  - bipartite : 双列二分图
 *  - radial    : 圆环
 *  - fixed     : 使用算法自带的坐标
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};
  const G = TGV.Geom;

  const H_GAP = 26;      // 同层兄弟子树最小水平间隙
  const V_GAP = 78;      // 层间垂直间隙

  function sizeOf(node) {
    // 多槽位节点更宽
    const slots = node.slots ? node.slots.length : 1;
    const w = node.w || (slots > 1 ? 26 + slots * 34 : 46);
    const h = node.h || 44;
    return { w, h };
  }

  /* ---------- Reingold-Tilford（轮廓线轮廓紧凑 + 父节点居中） ---------- */
  function tidyTree(nodes, edges, opt) {
    opt = opt || {};
    const hGap = opt.hGap || H_GAP;
    const vGap = opt.vGap || V_GAP;
    const byId = {};
    nodes.forEach(n => { byId[n.id] = n; });
    const children = {}, hasParent = {};
    nodes.forEach(n => { children[n.id] = []; });
    edges.forEach(e => {
      if (!children[e.source] || !byId[e.target]) return;
      children[e.source].push(e.target);
      hasParent[e.target] = true;
    });
    // 若是无向边（双向），按 source 顺序仍视作父子；避免重复
    Object.keys(children).forEach(k => {
      const seen = new Set();
      children[k] = children[k].filter(id => (seen.has(id) ? false : (seen.add(id), true)));
    });

    // 二叉搜索类树：按 key 升序排列左右子树，保证旋转后左右位置仍正确
    if (opt.childOrder === 'key') {
      const keyOf = id => {
        const nd = byId[id];
        const v = nd.ord != null ? nd.ord : (nd.key != null ? nd.key : nd.label);
        if (typeof v === 'number') return v;
        const f = parseFloat(v);
        return isNaN(f) ? null : f;
      };
      Object.keys(children).forEach(k => {
        children[k].sort((a, b) => {
          const ka = keyOf(a), kb = keyOf(b);
          if (ka !== null && kb !== null) return ka - kb;
          return String(keyOf(a)).localeCompare(String(keyOf(b)));
        });
      });
    }

    const roots = nodes.filter(n => !hasParent[n.id]).map(n => n.id);
    const out = {};
    let cursor = 0;

    function build(u, depth) {
      const kids = children[u] || [];
      const sz = sizeOf(byId[u]);
      if (!kids.length) {
        return { list: [{ id: u, x: 0, depth }], contour: [{ l: -sz.w / 2, r: sz.w / 2 }] };
      }
      const subs = [];
      let merged = null;
      for (let i = 0; i < kids.length; i++) {
        const sub = build(kids[i], depth + 1);
        let shift = 0;
        if (merged) {
          const dmax = Math.min(merged.length, sub.contour.length);
          for (let d = 0; d < dmax; d++) {
            shift = Math.max(shift, merged[d].r + hGap - sub.contour[d].l);
          }
        }
        for (const it of sub.list) it.x += shift;
        const cont = [];
        for (let d = 0; d < sub.contour.length; d++) {
          const L = sub.contour[d].l + shift, R = sub.contour[d].r + shift;
          cont.push({ l: L, r: R });
          if (!merged) merged = [];
          if (merged[d]) { merged[d].l = Math.min(merged[d].l, L); merged[d].r = Math.max(merged[d].r, R); }
          else merged[d] = { l: L, r: R };
        }
        subs.push({ list: sub.list, contour: cont, shift });
      }
      const firstX = subs[0].shift;
      const lastX = subs[subs.length - 1].shift;
      const px = (firstX + lastX) / 2;

      const list = [{ id: u, x: 0, depth }];
      const contour = [{ l: -sz.w / 2, r: sz.w / 2 }];
      for (const sub of subs) {
        for (const it of sub.list) list.push({ id: it.id, x: it.x - px, depth: it.depth });
        for (let d = 0; d < sub.contour.length; d++) {
          const L = sub.contour[d].l - px, R = sub.contour[d].r - px;
          if (contour[d + 1]) { contour[d + 1].l = Math.min(contour[d + 1].l, L); contour[d + 1].r = Math.max(contour[d + 1].r, R); }
          else contour[d + 1] = { l: L, r: R };
        }
      }
      return { list, contour };
    }

    for (const r of roots.length ? roots : [nodes[0] && nodes[0].id]) {
      if (!r) continue;
      const res = build(r, 0);
      let minX = Infinity, maxX = -Infinity;
      for (const it of res.list) {
        const w = sizeOf(byId[it.id]).w;
        minX = Math.min(minX, it.x - w / 2);
        maxX = Math.max(maxX, it.x + w / 2);
      }
      const dx = cursor - minX;
      for (const it of res.list) out[it.id] = { x: it.x + dx, y: it.depth * vGap };
      cursor = maxX + dx + (opt.forestGap || 46);
    }
    // 垂直居中到 0 起点
    let maxY = 0;
    Object.keys(out).forEach(k => { maxY = Math.max(maxY, out[k].y); });
    return { pos: out, width: cursor, height: maxY + 44 };
  }

  /* ---------- Fruchterman-Reingold 力导向 ---------- */
  function forceLayout(nodes, edges, opt) {
    opt = opt || {};
    const W = opt.width || 760, H = opt.height || 520;
    const n = nodes.length;
    if (!n) return { pos: {}, width: W, height: H };
    const rand = G.rng(opt.seed || 20240521);
    const pos = {}, disp = {};
    const ids = nodes.map(nd => nd.id);
    const deg = {}; ids.forEach(id => deg[id] = 0);
    edges.forEach(e => { deg[e.source] = (deg[e.source] || 0) + 1; deg[e.target] = (deg[e.target] || 0) + 1; });

    const anchors = nodes.filter(nd => typeof nd.x === 'number' && typeof nd.y === 'number');
    const hasAnchor = anchors.length === n;

    const cx = W / 2, cy = H / 2;
    ids.forEach((id, i) => {
      if (hasAnchor) {
        const nd = nodes[i];
        pos[id] = { x: nd.x, y: nd.y };
      } else {
        const ang = (i / n) * Math.PI * 2 + rand() * 0.4;
        const rad = Math.min(W, H) * (0.26 + 0.14 * rand());
        pos[id] = { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad };
      }
    });

    const k = Math.sqrt((W * H) / n) * (opt.kScale || 1.05);
    const iters = opt.iterations || 420;
    let temp = W / 6;

    for (let it = 0; it < iters; it++) {
      ids.forEach(id => disp[id] = { x: 0, y: 0 });
      // 斥力
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = pos[ids[i]], b = pos[ids[j]];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d = Math.hypot(dx, dy) || 0.01;
          const f = (k * k) / d;
          dx /= d; dy /= d;
          disp[ids[i]].x += dx * f; disp[ids[i]].y += dy * f;
          disp[ids[j]].x -= dx * f; disp[ids[j]].y -= dy * f;
        }
      }
      // 引力
      edges.forEach(e => {
        const a = pos[e.source], b = pos[e.target];
        if (!a || !b) return;
        let dx = a.x - b.x, dy = a.y - b.y;
        let d = Math.hypot(dx, dy) || 0.01;
        const f = (d * d) / k * (e.weight ? 1 : 0.9);
        dx /= d; dy /= d;
        disp[e.source].x -= dx * f; disp[e.source].y -= dy * f;
        disp[e.target].x += dx * f; disp[e.target].y += dy * f;
      });
      // 向心力，避免飞散
      ids.forEach(id => {
        disp[id].x += (cx - pos[id].x) * 0.035;
        disp[id].y += (cy - pos[id].y) * 0.035;
        const dd = Math.hypot(disp[id].x, disp[id].y) || 0.01;
        const lim = Math.min(dd, temp);
        pos[id].x += disp[id].x / dd * lim;
        pos[id].y += disp[id].y / dd * lim;
      });
      temp *= 0.985;
    }
    return normalize(pos, ids, W, H, 62);
  }

  function normalize(pos, ids, W, H, pad) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    ids.forEach(id => {
      minX = Math.min(minX, pos[id].x); maxX = Math.max(maxX, pos[id].x);
      minY = Math.min(minY, pos[id].y); maxY = Math.max(maxY, pos[id].y);
    });
    const sw = Math.max(maxX - minX, 1), sh = Math.max(maxY - minY, 1);
    const sx = (W - pad * 2) / sw, sy = (H - pad * 2) / sh;
    const s = Math.min(sx, sy, 1.9);
    const out = {};
    ids.forEach(id => {
      out[id] = {
        x: pad + (pos[id].x - minX) * s + (W - pad * 2 - sw * s) / 2,
        y: pad + (pos[id].y - minY) * s + (H - pad * 2 - sh * s) / 2
      };
    });
    return { pos: out, width: W, height: H };
  }

  /* ---------- Sugiyama 层次布局（DAG） ---------- */
  function layeredLayout(nodes, edges, opt) {
    opt = opt || {};
    const ids = nodes.map(n => n.id);
    const indeg = {}, adj = {};
    ids.forEach(id => { indeg[id] = 0; adj[id] = []; });
    edges.forEach(e => {
      if (adj[e.source] && indeg[e.target] !== undefined) { adj[e.source].push(e.target); indeg[e.target]++; }
    });
    // 最长路径分层
    const layer = {};
    const queue = ids.filter(id => indeg[id] === 0);
    queue.forEach(id => layer[id] = 0);
    const indeg2 = Object.assign({}, indeg);
    const q = queue.slice();
    while (q.length) {
      const u = q.shift();
      adj[u].forEach(v => {
        layer[v] = Math.max(layer[v] || 0, layer[u] + 1);
        if (--indeg2[v] === 0) q.push(v);
      });
    }
    // 有环兜底
    ids.forEach(id => { if (layer[id] === undefined) layer[id] = 0; });
    const maxLayer = Math.max(0, ...Object.values(layer));
    const cols = [];
    for (let i = 0; i <= maxLayer; i++) cols.push([]);
    ids.forEach(id => cols[layer[id]].push(id));
    // 重心法排序两轮
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 1; i <= maxLayer; i++) {
        const prev = cols[i - 1];
        const score = {};
        cols[i].forEach(id => {
          const ps = edges.filter(e => e.target === id && prev.indexOf(e.source) >= 0).map(e => prev.indexOf(e.source));
          score[id] = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 999;
        });
        cols[i].sort((a, b) => score[a] - score[b]);
      }
      for (let i = maxLayer - 1; i >= 0; i--) {
        const next = cols[i + 1];
        const score = {};
        cols[i].forEach(id => {
          const ps = edges.filter(e => e.source === id && next.indexOf(e.target) >= 0).map(e => next.indexOf(e.target));
          score[id] = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 999;
        });
        cols[i].sort((a, b) => score[a] - score[b]);
      }
    }
    const dir = opt.direction || 'LR';
    const gap = opt.gap || 108;
    const crossGap = opt.crossGap || 62;
    const pos = {};
    let maxCount = 0;
    cols.forEach(c => maxCount = Math.max(maxCount, c.length));
    const spanCross = (maxCount - 1) * crossGap;
    cols.forEach((col, li) => {
      const offset = (spanCross - (col.length - 1) * crossGap) / 2;
      col.forEach((id, ci) => {
        if (dir === 'LR') pos[id] = { x: 88 + li * (gap + 40), y: 70 + offset + ci * crossGap };
        else pos[id] = { x: 80 + offset + ci * crossGap, y: 62 + li * (gap + 20) };
      });
    });
    return { pos, width: 88 + (maxLayer + 1) * 150, height: spanCross + 140, layers: cols, layerOf: layer };
  }

  /* ---------- 二分图双列布局 ---------- */
  function bipartiteLayout(nodes, edges, opt) {
    opt = opt || {};
    const ids = nodes.map(n => n.id);
    const adj = {};
    ids.forEach(id => adj[id] = []);
    edges.forEach(e => { if (adj[e.source] && adj[e.target]) { adj[e.source].push(e.target); adj[e.target].push(e.source); } });
    const color = {};
    const left = [], right = [];
    for (const start of ids) {
      if (color[start] !== undefined) continue;
      color[start] = 0;
      const q = [start];
      while (q.length) {
        const u = q.shift();
        (color[u] === 0 ? left : right).push(u);
        adj[u].forEach(v => { if (color[v] === undefined) { color[v] = 1 - color[u]; q.push(v); } });
      }
    }
    const pos = {};
    const gap = opt.crossGap || 70;
    const place = (arr, x) => {
      const total = (arr.length - 1) * gap;
      arr.forEach((id, i) => { pos[id] = { x, y: 90 - total / 2 + i * gap + 140 }; });
    };
    place(left, 120);
    place(right, 500);
    return { pos, width: 620, height: Math.max(left.length, right.length) * gap + 180, side: color };
  }

  /* ---------- 圆环布局 ---------- */
  function radialLayout(nodes, edges, opt) {
    opt = opt || {};
    const ids = nodes.map(n => n.id);
    const R = opt.radius || Math.max(150, Math.min(300, ids.length * 24));
    const pos = {};
    ids.forEach((id, i) => {
      const ang = -Math.PI / 2 + (i / ids.length) * Math.PI * 2;
      pos[id] = { x: 380 + Math.cos(ang) * R, y: 300 + Math.sin(ang) * R };
    });
    return { pos, width: 760, height: 600 };
  }

  function gridLayout(nodes, edges, opt) {
    opt = opt || {};
    const cols = opt.cols || 4, gapX = opt.gapX || 120, gapY = opt.gapY || 110;
    const pos = {};
    nodes.forEach((n, i) => {
      pos[n.id] = { x: 90 + (i % cols) * gapX, y: 80 + Math.floor(i / cols) * gapY };
    });
    return { pos, width: 90 + cols * gapX, height: 80 + Math.ceil(nodes.length / cols) * gapY };
  }

  function compute(kind, nodes, edges, opt) {
    switch (kind) {
      case 'tree': return tidyTree(nodes, edges, opt);
      case 'force': return forceLayout(nodes, edges, opt);
      case 'layered': return layeredLayout(nodes, edges, opt);
      case 'bipartite': return bipartiteLayout(nodes, edges, opt);
      case 'radial': return radialLayout(nodes, edges, opt);
      case 'grid': return gridLayout(nodes, edges, opt);
      default: {
        const pos = {};
        nodes.forEach(n => pos[n.id] = { x: n.x, y: n.y });
        return { pos, width: 760, height: 600 };
      }
    }
  }

  TGV.Layouts = { compute, tidyTree, forceLayout, layeredLayout, bipartiteLayout, radialLayout, gridLayout, sizeOf };
})(typeof globalThis !== 'undefined' ? globalThis : this);
