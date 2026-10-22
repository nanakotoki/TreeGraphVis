/* ============================================================
 * TreeGraphVis · 高 DPI 矢量 SVG 渲染引擎
 * 纯矢量图元：圆形/圆角矩形节点、二阶贝塞尔边、脉冲粒子、
 * 临时虚线弧、凸包气泡、锯齿割线。所有关键绘制属性写成
 * 属性而非 CSS 类，保证 SVG 导出保真。
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};
  const G = TGV.Geom;
  const NS = 'http://www.w3.org/2000/svg';

  const PALETTE = {
    light: {
      bg: '#F7F9FC', ink: '#0F172A', muted: '#64748B', line: '#E2E8F0',
      node: {
        default: { fill: '#FFFFFF', stroke: '#C3CCDB', text: '#1E293B' },
        active: { fill: '#EEF2FF', stroke: '#4F46E5', text: '#312E81' },
        frontier: { fill: '#FFF8E6', stroke: '#F59E0B', text: '#92400E' },
        visited: { fill: '#DCFCE7', stroke: '#16A34A', text: '#14532D' },
        path: { fill: '#FEF3C7', stroke: '#D97706', text: '#78350F' },
        conflict: { fill: '#FEE2E2', stroke: '#DC2626', text: '#991B1B' },
        ghost: { fill: '#F1F5F9', stroke: '#CBD5E1', text: '#94A3B8' },
        custom: { fill: '#FFFFFF', stroke: '#94A3B8', text: '#334155' }
      },
      edge: { default: '#C3CCDB', active: '#4F46E5', frontier: '#F59E0B', visited: '#16A34A', path: '#D97706', rejected: '#DCE3EC', conflict: '#DC2626', ghost: '#DDE5EF' },
      chip: { fill: '#FFFFFF', stroke: '#CBD5E1', text: '#334155' },
      chipHot: { fill: '#4F46E5', stroke: '#4338CA', text: '#FFFFFF' },
      pill: { fill: '#FFFFFF', stroke: '#CBD5E1', text: '#334155' }
    },
    dark: {
      bg: '#0B1220', ink: '#E6EDF7', muted: '#8FA3BF', line: '#1E293B',
      node: {
        default: { fill: '#16233A', stroke: '#3B4A63', text: '#E2E8F0' },
        active: { fill: '#1E2A5A', stroke: '#818CF8', text: '#E0E7FF' },
        frontier: { fill: '#3A2A0E', stroke: '#FBBF24', text: '#FDE68A' },
        visited: { fill: '#0F3324', stroke: '#34D399', text: '#D1FAE5' },
        path: { fill: '#3A2408', stroke: '#F59E0B', text: '#FDE68A' },
        conflict: { fill: '#3B1219', stroke: '#F87171', text: '#FECACA' },
        ghost: { fill: '#131E30', stroke: '#293850', text: '#64748B' },
        custom: { fill: '#16233A', stroke: '#64748B', text: '#E2E8F0' }
      },
      edge: { default: '#3B4A63', active: '#818CF8', frontier: '#FBBF24', visited: '#34D399', path: '#F59E0B', rejected: '#26344A', conflict: '#F87171', ghost: '#26344A' },
      chip: { fill: '#1B2740', stroke: '#334155', text: '#CBD5E1' },
      chipHot: { fill: '#818CF8', stroke: '#6366F1', text: '#0B1220' },
      pill: { fill: '#1B2740', stroke: '#334155', text: '#CBD5E1' }
    }
  };

  const EDGE_COLOR_ALIAS = {
    tree: 'visited', back: 'conflict', forward: '#2563EB', cross: '#EA580C',
    'reject': 'rejected', flow: '#0EA5E9', flowActive: '#0284C7'
  };

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function textW(str, size) {
    // 中英混排的近似宽度
    let w = 0;
    for (const ch of String(str)) {
      const c = ch.charCodeAt(0);
      w += c > 255 ? (size * 0.98) : (size * 0.60);
    }
    return w;
  }

  function Renderer(host, opts) {
    this.host = host;
    this.theme = (opts && opts.theme) || 'light';
    this.pal = PALETTE[this.theme];
    this.def = null;
    this.curPos = {};
    this.targetPos = {};
    this.manual = {};
    this.anim = null;
    this.view = { x: 0, y: 0, k: 1 };
    this.nodeEls = {};
    this.edgeEls = {};
    this.scene = null;
    this.residual = false;   // 残量网络视图（网络流算法专用）
    this.W = 1000;
    this.H = 700;

    host.innerHTML = '';
    this.svg = el('svg', {
      viewBox: '0 0 ' + this.W + ' ' + this.H,
      preserveAspectRatio: 'xMidYMid meet',
      style: 'width:100%;height:100%;display:block;touch-action:none'
    }, host);
    this.defs = el('defs', {}, this.svg);
    this.vp = el('g', { id: 'viewport' }, this.svg);
    this.gHull = el('g', { class: 'layer-hulls' }, this.vp);
    this.gCut = el('g', { class: 'layer-cuts' }, this.vp);
    this.gEdge = el('g', { class: 'layer-edges' }, this.vp);
    this.gRes = el('g', { class: 'layer-residual' }, this.vp);
    this.gArc = el('g', { class: 'layer-arcs' }, this.vp);
    this.gNode = el('g', { class: 'layer-nodes' }, this.vp);
    this.gPulse = el('g', { class: 'layer-pulses' }, this.vp);

    this._bindView();
    this.buildDefs();
  }

  Renderer.prototype.buildDefs = function () {
    const pal = this.pal;
    while (this.defs.firstChild) this.defs.removeChild(this.defs.firstChild);
    // 网格底纹（仅装饰，不代表拓扑）
    const pat = el('pattern', { id: 'dots', width: 26, height: 26, patternUnits: 'userSpaceOnUse' }, this.defs);
    el('circle', { cx: 1.4, cy: 1.4, r: 1.4, fill: this.theme === 'light' ? '#DDE5EF' : '#1B2740' }, pat);

    const colors = {};
    Object.keys(pal.edge).forEach(k => {
      let v = pal.edge[k];
      if (v && v.charAt(0) === '#') colors[k] = v;
    });
    // 额外自定义色
    ['#2563EB', '#EA580C', '#0284C7', '#0EA5E9', '#8B5CF6', '#DB2777', '#0891B2'].forEach(c => colors['c' + c.replace('#', '')] = c);

    Object.keys(colors).forEach(key => {
      const color = colors[key];
      const m = el('marker', {
        id: 'arw-' + key, viewBox: '0 0 10 10', refX: 9, refY: 5,
        markerWidth: 6.2, markerHeight: 6.2, orient: 'auto-start-reverse', markerUnits: 'strokeWidth'
      }, this.defs);
      el('path', { d: 'M 0 1 L 9.4 5 L 0 9 z', fill: color }, m);
    });
    const soft = el('filter', { id: 'softGlow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, this.defs);
    el('feGaussianBlur', { stdDeviation: 3.4, result: 'b' }, soft);
    const fm = el('feMerge', {}, soft);
    el('feMergeNode', { in: 'b' }, fm);
    el('feMergeNode', { in: 'SourceGraphic' }, fm);

    const shadow = el('filter', { id: 'dropShadow', x: '-40%', y: '-40%', width: '180%', height: '200%' }, this.defs);
    el('feDropShadow', {
      dx: 0, dy: 2.2, stdDeviation: 2.6, 'flood-color': this.theme === 'light' ? '#0F172A' : '#000000',
      'flood-opacity': this.theme === 'light' ? 0.12 : 0.45
    }, shadow);
  };

  Renderer.prototype.setTheme = function (theme) {
    this.theme = theme;
    this.pal = PALETTE[theme];
    this.host.setAttribute('data-theme', theme);
    this.buildDefs();
    if (this.def) this.setDef(this.def, true);
    if (this.scene) this.render(this.scene, { animate: false, positions: this.curPos });
  };

  /* --------- 载入算法静态拓扑 --------- */
  Renderer.prototype.setDef = function (def, keepPos) {
    this.def = def;
    // 双向边/多重边偏移
    const pairKey = {};
    def.edges.forEach(e => {
      const k = [e.source, e.target].sort().join('|');
      pairKey[k] = (pairKey[k] || 0) + 1;
    });
    const seen = {};
    this.edgeMeta = {};
    def.edges.forEach(e => {
      const k = [e.source, e.target].sort().join('|');
      const both = def.edges.some(o => o.id !== e.id && o.source === e.target && o.target === e.source);
      let off = 0;
      if (both) {
        const isForward = e.source < e.target;
        off = isForward ? 22 : -22;
      }
      if (pairKey[k] > 1 && !both) {
        seen[k] = (seen[k] || 0) + 1;
        off = (seen[k] - 1) * 20 - (pairKey[k] - 1) * 10;
      }
      if (e.curve !== undefined && e.curve !== null) off = e.curve;
      this.edgeMeta[e.id] = { offset: off };
    });

    while (this.gNode.firstChild) this.gNode.removeChild(this.gNode.firstChild);
    while (this.gEdge.firstChild) this.gEdge.removeChild(this.gEdge.firstChild);
    this.nodeEls = {};
    this.edgeEls = {};

    const pal = this.pal;

    // 节点（多角标 + 多槽位 + 状态光环）
    def.nodes.forEach(n => {
      const g = el('g', { class: 'node', 'data-id': n.id }, this.gNode);
      const r = n.r || 21;
      const halo = el('circle', { class: 'halo', cx: 0, cy: 0, r: r + 7, fill: 'none', stroke: 'transparent' }, g);
      const dblRing = el('circle', { class: 'dbl-ring', cx: 0, cy: 0, r: r + 11, fill: 'none', stroke: pal.node.conflict.stroke, 'stroke-width': 3.4, opacity: 0 }, g);
      const core = el('circle', {
        class: 'core', cx: 0, cy: 0, r,
        fill: pal.node.default.fill, stroke: pal.node.default.stroke, 'stroke-width': 1.7,
        filter: 'url(#dropShadow)'
      }, g);
      const coreRect = el('rect', {
        class: 'core-rect', x: 0, y: -17, width: 0, height: 34, rx: 9,
        fill: pal.node.default.fill, stroke: pal.node.default.stroke, 'stroke-width': 1.7,
        filter: 'url(#dropShadow)', style: 'display:none'
      }, g);
      const slotLayer = el('g', { class: 'slots' }, g);
      const label = el('text', {
        class: 'core-label', x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 14.5, 'font-weight': 700, fill: pal.node.default.text,
        'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace'
      }, g);
      label.textContent = n.label != null ? n.label : n.id;
      const sub = el('text', {
        class: 'node-sub', x: 0, y: r + 17, 'text-anchor': 'middle',
        'font-size': 10.5, fill: pal.muted, 'font-family': 'ui-monospace, monospace'
      }, g);
      if (n.sub) sub.textContent = n.sub;
      const badgeLayer = el('g', { class: 'badges' }, g);
      this.nodeEls[n.id] = { g, halo, dblRing, core, coreRect, slotLayer, label, sub, badgeLayer, r, slotSig: null, badgeSig: null, badgeMap: {} };
    });

    // 边（先绘制，位于节点下方）
    def.edges.forEach(e => {
      const g = el('g', { class: 'edge', 'data-id': e.id }, this.gEdge);
      const hit = el('path', { class: 'edge-hit', fill: 'none', stroke: 'transparent', 'stroke-width': 16 }, g);
      const p = el('path', { class: 'edge-line', fill: 'none', 'stroke-width': 1.7, 'stroke-linecap': 'round' }, g);
      const flow = el('path', { class: 'edge-flow', fill: 'none', 'stroke-width': 4.4, 'stroke-linecap': 'round', opacity: 0 }, g);
      const pill = el('g', { class: 'edge-pill' }, g);
      const rect = el('rect', { rx: 7, ry: 7, height: 17, fill: this.pal.pill.fill, stroke: this.pal.pill.stroke, 'stroke-width': 1 }, pill);
      const txt = el('text', {
        'font-size': 11, 'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
        'text-anchor': 'middle', fill: this.pal.pill.text, y: 4
      }, pill);
      this.edgeEls[e.id] = { g, path: p, hit, flow, pill, rect, txt };
    });

    if (!keepPos) this.curPos = {};
    if (!keepPos) { this._fitBox = null; this.manual = {}; }
    this.targetPos = {};
  };

  /* --------- 位置：立即设定或缓动插值 --------- */
  Renderer.prototype.setPositions = function (positions, animate, duration) {
    const next = {};
    Object.keys(positions).forEach(id => {
      const p = positions[id];
      next[id] = { x: p.x + (this.manual[id] ? this.manual[id].x : 0), y: p.y + (this.manual[id] ? this.manual[id].y : 0) };
      if (!this.curPos[id]) this.curPos[id] = { x: next[id].x, y: next[id].y };
    });
    this.targetPos = next;
    if (!animate) {
      Object.keys(next).forEach(id => this.curPos[id] = { x: next[id].x, y: next[id].y });
      this.syncGeometry();
      this.autofit();
      return;
    }
    this.animateTo(next, duration || 460);
  };

  Renderer.prototype.animateTo = function (next, duration) {
    const from = {};
    Object.keys(next).forEach(id => from[id] = { x: this.curPos[id].x, y: this.curPos[id].y });
    const start = performance.now();
    if (this.anim) cancelAnimationFrame(this.anim);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = G.ease.inOutCubic(t);
      Object.keys(next).forEach(id => {
        this.curPos[id] = { x: G.lerp(from[id].x, next[id].x, e), y: G.lerp(from[id].y, next[id].y, e) };
      });
      this.syncGeometry();
      if (t < 1) this.anim = requestAnimationFrame(tick);
      else { this.anim = null; this.autofit(); }
    };
    this.anim = requestAnimationFrame(tick);
  };

  /* --------- 坐标 → 图元同步 --------- */
  Renderer.prototype.syncGeometry = function () {
    const P = this.curPos;
    const def = this.def;
    if (!def) return;

    // 节点
    def.nodes.forEach(n => {
      const box = this.nodeEls[n.id];
      if (!box) return;
      const p = P[n.id];
      if (!p) return;
      box.g.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
    });

    // 边
    def.edges.forEach(e => {
      const box = this.edgeEls[e.id];
      const a = P[e.source], b = P[e.target];
      if (!box || !a || !b) return;
      const geo = this.edgeGeometry(a, b, this.edgeMeta[e.id] ? this.edgeMeta[e.id].offset : 0, e);
      box.path.setAttribute('d', geo.d);
      box.hit.setAttribute('d', geo.d);
      box.flow.setAttribute('d', geo.d);
      const lw = textW(box.txt.textContent || '', 11) + 14;
      box.rect.setAttribute('x', geo.mid.x - lw / 2);
      box.rect.setAttribute('y', geo.mid.y - 9);
      box.rect.setAttribute('width', lw);
      box.txt.setAttribute('x', geo.mid.x);
      box.txt.setAttribute('y', geo.mid.y + 4);
      box.pill.setAttribute('transform', 'translate(0 0)');
      box._geo = geo;
    });

    // 临时弧
    if (this.scene) this.renderArcs(this.scene);
    this.renderHulls(this.scene);
    this.renderCuts(this.scene);
    this.renderResidual(this.scene);
  };

  /* --------- 残量网络视图：正向剩余 c-f / 反向可退流 f --------- */
  Renderer.prototype.renderResidual = function (scene) {
    if (!this.gRes) return;
    while (this.gRes.firstChild) this.gRes.removeChild(this.gRes.firstChild);
    if (!this.residual || !scene || !this.def) return;
    const P = this.curPos;
    // 若图上本就存在反向边，其反向残量由那条边自己的正向剩余表示，避免重复绘制
    const pairSet = {};
    (this.def.edges || []).forEach(e => { pairSet[e.source + '\u0001' + e.target] = true; });
    const pill = (pt, color, text, solid) => {
      const w = Math.max(19, textW(String(text), 10.5) + 12);
      el('rect', {
        x: pt.x - w / 2, y: pt.y - 8.5, width: w, height: 16, rx: 8,
        fill: this.pal.pill.fill, stroke: color, 'stroke-width': 1,
        opacity: 0.96, 'stroke-dasharray': solid ? 'none' : '3 2'
      }, this.gRes);
      const t = el('text', {
        x: pt.x, y: pt.y + 3.4, 'text-anchor': 'middle', 'font-size': 10.5,
        'font-family': 'ui-monospace, Menlo, monospace', fill: color, 'font-weight': 700
      }, this.gRes);
      t.textContent = String(text);
    };
    (this.def.edges || []).forEach(e => {
      const st = scene.edges[e.id];
      if (!st || st.flow == null || st.cap == null) return;
      const a = P[e.source], b = P[e.target];
      if (!a || !b) return;
      const off = this.edgeMeta[e.id] ? this.edgeMeta[e.id].offset : 0;
      const rf = Math.max(0, st.cap - st.flow);
      const rb = Math.max(0, st.flow);
      // 正向剩余容量：只标注数值（边本身已按残量改色）
      const geo = this.edgeGeometry(a, b, off, {});
      pill(geo.mid, rf > 0 ? '#0891B2' : (this.pal.edge.rejected || '#CBD5E1'), rf, rf > 0);
      // 反向可退流：反向虚弧 + 数值（已有显式反向边时跳过）
      if (rb > 0 && !pairSet[e.target + '\u0001' + e.source]) {
        const back = this.edgeGeometry(b, a, -off - 16, {});
        el('path', {
          d: back.d, fill: 'none', stroke: '#F59E0B', 'stroke-width': 2,
          'stroke-dasharray': '5 4', opacity: 0.9,
          'marker-end': `url(#arw-${this.markerFor('#F59E0B', this.pal)})`
        }, this.gRes);
        pill(back.mid, '#F59E0B', rb, false);
      }
    });
  };

  Renderer.prototype.edgeGeometry = function (a, b, offset, edge) {
    const R = 25;
    let dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    // 曲线控制点
    const mx = (a.x + b.x) / 2 + nx * offset * 2;
    const my = (a.y + b.y) / 2 + ny * offset * 2;
    // 端点裁剪
    const sa = { x: a.x + dx / len * R, y: a.y + dy / len * R };
    const sb = { x: b.x - dx / len * (R + 4), y: b.y - dy / len * (R + 4) };
    let d, mid;
    if (Math.abs(offset) < 0.5) {
      d = `M ${sa.x.toFixed(2)} ${sa.y.toFixed(2)} L ${sb.x.toFixed(2)} ${sb.y.toFixed(2)}`;
      mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else {
      d = `M ${sa.x.toFixed(2)} ${sa.y.toFixed(2)} Q ${mx.toFixed(2)} ${my.toFixed(2)} ${sb.x.toFixed(2)} ${sb.y.toFixed(2)}`;
      mid = G.quadPoint(sa, { x: mx, y: my }, sb, 0.5);
    }
    return { d, mid };
  };

  /* --------- 主渲染 --------- */
  Renderer.prototype.render = function (scene, opts) {
    this.scene = scene;
    opts = opts || {};
    const pal = this.pal;
    const def = this.def;

    // 节点外观
    def.nodes.forEach(n => {
      const box = this.nodeEls[n.id];
      const st = scene.nodes[n.id];
      if (!box || !st) return;
      const style = pal.node[st.state] || pal.node['default'];
      const isPath = st.state === 'path';
      const fillC = st.fill || style.fill;
      const strokeC = st.stroke || style.stroke;
      const textC = st.textColor || style.text;
      box.core.setAttribute('fill', fillC);
      box.core.setAttribute('stroke', strokeC);
      box.core.setAttribute('stroke-width', st.state === 'active' || isPath ? 2.6 : 1.7);
      box.coreRect.setAttribute('fill', fillC);
      box.coreRect.setAttribute('stroke', strokeC);
      box.coreRect.setAttribute('stroke-width', st.state === 'active' || isPath ? 2.6 : 1.7);
      if (box.label) {
        box.label.setAttribute('fill', textC);
        const lb = st.label == null ? n.id : String(st.label);
        if (box.label.textContent !== lb) box.label.textContent = lb;
      }
      box.g.setAttribute('class', 'node st-' + st.state + (st.hidden ? ' is-hidden' : '') + (st.dbl ? ' is-dbl' : ''));
      box.g.style.opacity = st.hidden ? '0' : '1';

      // 外环：active 呼吸、frontier 虚线、path 描边
      if (box.halo) {
        box.halo.setAttribute('r', (box.r + 7).toFixed(1));
        box.halo.setAttribute('fill', 'none');
        box.halo.setAttribute('stroke', st.state === 'default' ? 'transparent' : strokeC);
        box.halo.setAttribute('stroke-width', st.state === 'active' ? 2 : 1.6);
        box.halo.setAttribute('stroke-dasharray', st.state === 'frontier' ? '4 4' : 'none');
        box.halo.setAttribute('opacity', st.state === 'active' ? '0.55' : (st.state === 'default' || st.state === 'visited' ? 0 : 0.45));
      }
      // 双黑圈
      if (box.dblRing) {
        box.dblRing.setAttribute('r', (box.r + 11).toFixed(1));
        box.dblRing.setAttribute('opacity', st.dbl ? 1 : 0);
      }

      // 多槽位
      const sig = st.slots ? st.slots.join('\u0001') : '';
      if (box.slotSig !== sig) {
        box.slotSig = sig;
        this.paintSlots(box, st, style);
      } else if (st.slots) {
        box.slotTexts.forEach(t => t.setAttribute('fill', textC));
      }

      this.paintBadges(box, st, style);
    });

    // 边外观
    def.edges.forEach(e => {
      const box = this.edgeEls[e.id];
      const st = scene.edges[e.id];
      if (!box || !st) return;
      let color;
      if (st.color) color = EDGE_COLOR_ALIAS[st.color] || st.color;
      else if (st.state === 'custom') color = pal.edge.default;
      else color = pal.edge[st.state] || pal.edge.default;
      if (color && color.charAt(0) !== '#') color = pal.edge[color] || pal.edge.default;
      const resMode = this.residual && st.flow != null;
      let dashed = st.dashed || st.state === 'rejected' || st.state === 'ghost';
      let w = st.width || (st.state === 'active' ? 2.6 : st.state === 'path' ? 3.2 : st.state === 'visited' ? 2.2 : 1.7);
      if (resMode) {
        const rf = Math.max(0, (st.cap || 0) - (st.flow || 0));
        color = rf > 0 ? '#0891B2' : (pal.edge.rejected || '#CBD5E1');
        dashed = rf <= 0;
        w = 2.2;
      }
      box.path.setAttribute('stroke', color);
      box.path.setAttribute('stroke-dasharray', dashed ? '5 5' : 'none');
      box.path.setAttribute('stroke-width', w);
      box.path.setAttribute('opacity', st.hidden ? 0 : (resMode ? 0.9 : (st.state === 'rejected' ? 0.55 : 1)));
      const markerKey = this.markerFor(color, pal);
      box.path.setAttribute('marker-end', this.def.directed === false ? '' : `url(#arw-${markerKey})`);
      box.g.style.opacity = st.hidden ? '0' : '1';

      const label = (this.residual && st.flow != null) ? '' : (st.label == null ? '' : String(st.label));
      if (box.txt.textContent !== label) box.txt.textContent = label;
      box.pill.style.opacity = label === '' ? '0' : '1';
      box.txt.setAttribute('fill', pal.pill.text);

      // 流量填充
      if (st.flow && st.cap) {
        const frac = Math.max(0, Math.min(1, st.flow / st.cap));
        const len = box.path.getTotalLength ? box.path.getTotalLength() : 100;
        box.flow.setAttribute('stroke', pal.edge.flow || '#0EA5E9');
        box.flow.setAttribute('stroke-dasharray', `${(len * frac).toFixed(1)} ${len.toFixed(1)}`);
        box.flow.setAttribute('opacity', 0.55);
      } else {
        box.flow.setAttribute('opacity', 0);
      }
      if (!resMode && e.weight !== null && e.weight !== undefined && label === '') {
        box.txt.textContent = String(e.weight);
        box.pill.style.opacity = '1';
      }
    });

    this.syncGeometry();
    this.renderPulses(scene);
  };

  Renderer.prototype.markerFor = function (color, pal) {
    const map = {};
    Object.keys(pal.edge).forEach(k => map[pal.edge[k]] = k);
    map['#2563EB'] = 'c2563EB'; map['#EA580C'] = 'cEA580C';
    map['#0284C7'] = 'c0284C7'; map['#0EA5E9'] = 'c0EA5E9';
    map['#8B5CF6'] = 'c8B5CF6'; map['#DB2777'] = 'cDB2777'; map['#0891B2'] = 'c0891B2';
    return map[color] || 'default';
  };

  Renderer.prototype.paintSlots = function (box, st, style) {
    while (box.slotLayer.firstChild) box.slotLayer.removeChild(box.slotLayer.firstChild);
    box.slotTexts = [];
    if (!st.slots) {
      if (box.label) box.label.style.display = '';
      box.core.style.display = '';
      box.coreRect.style.display = 'none';
      return;
    }
    if (box.label) box.label.style.display = 'none';
    box.core.style.display = 'none';
    box.coreRect.style.display = '';
    const n = st.slots.length;
    const cellW = 34;
    const w = n * cellW + 10;
    box.coreRect.setAttribute('x', (-w / 2).toFixed(1));
    box.coreRect.setAttribute('width', w);
    const x0 = -w / 2 + 5;
    for (let i = 1; i < n; i++) {
      el('line', {
        x1: x0 + i * cellW, y1: -13, x2: x0 + i * cellW, y2: 13,
        stroke: style.stroke, 'stroke-width': 1, opacity: 0.3
      }, box.slotLayer);
    }
    st.slots.forEach((s, i) => {
      const t = el('text', {
        x: x0 + i * cellW + cellW / 2, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 12.5, 'font-family': 'ui-monospace, Menlo, monospace',
        fill: style.text, 'font-weight': 600
      }, box.slotLayer);
      t.textContent = s === null || s === undefined || s === '' ? '·' : String(s);
      box.slotTexts.push(t);
    });
  };

  Renderer.prototype.paintBadges = function (box, st, style) {
    const entries = Object.keys(st.badges || {}).map(k => [k, st.badges[k]]);
    const sig = JSON.stringify(entries);
    if (box.badgeSig === sig) return;
    const prev = box.badgeMap || {};
    box.badgeSig = sig;
    box.badgeMap = {};
    entries.forEach(e => box.badgeMap[e[0]] = e[1]);

    // 重建（数值变化时重新计算宽度与位置）
    while (box.badgeLayer.firstChild) box.badgeLayer.removeChild(box.badgeLayer.firstChild);
    let y = -(box.r + 24);
    entries.forEach(([k, v], idx) => {
      const text = (k ? k + '=' : '') + v;
      const w = Math.max(30, textW(text, 10.5) + 12);
      const hot = prev[k] !== undefined && String(prev[k]) !== String(v);
      const chip = el('g', { class: 'chip' + (hot ? ' chip-flash' : '') }, box.badgeLayer);
      el('rect', {
        x: -w / 2, y: y - 15, width: w, height: 16, rx: 8,
        fill: hot ? this.pal.chipHot.fill : this.pal.chip.fill,
        stroke: hot ? this.pal.chipHot.stroke : this.pal.chip.stroke,
        'stroke-width': 1
      }, chip);
      const t = el('text', {
        x: 0, y: y - 3.2, 'text-anchor': 'middle', 'font-size': 10.5,
        'font-family': 'ui-monospace, Menlo, monospace',
        fill: hot ? this.pal.chipHot.text : this.pal.chip.text, 'font-weight': 600
      }, chip);
      t.textContent = text;
      y -= 18;
    });
    if (box.sub) {
      box.sub.setAttribute('y', (box.r + 17).toFixed(1));
      box.sub.setAttribute('fill', style.stroke);
    }
  };

  Renderer.prototype.renderArcs = function (scene) {
    const P = this.curPos;
    const key = Object.keys(scene.arcs).join(',');
    if (this._arcKey !== key || this._arcMoving) {
      this._arcKey = key;
      while (this.gArc.firstChild) this.gArc.removeChild(this.gArc.firstChild);
    }
    // 清空重绘（弧数量少，成本可接受）
    while (this.gArc.firstChild) this.gArc.removeChild(this.gArc.firstChild);
    Object.keys(scene.arcs).forEach(k => {
      const a = scene.arcs[k];
      const p1 = P[a.from], p2 = P[a.to];
      if (!p1 || !p2) return;
      let dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const bow = a.curve || Math.min(120, 34 + len * 0.28);
      const c = { x: (p1.x + p2.x) / 2 + nx * bow, y: (p1.y + p2.y) / 2 + ny * bow };
      const R = 22;
      const pa = { x: p1.x + dx / len * R, y: p1.y + dy / len * R };
      const pb = { x: p2.x - dx / len * R, y: p2.y - dy / len * R };
      const path = el('path', {
        d: `M ${pa.x} ${pa.y} Q ${c.x} ${c.y} ${pb.x} ${pb.y}`,
        fill: 'none', stroke: a.color, 'stroke-width': a.width || 1.7,
        'stroke-dasharray': a.dashed === false ? 'none' : '5 4', opacity: 0.9,
        'marker-end': `url(#arw-${this.markerFor(a.color, this.pal)})`
      }, this.gArc);
      if (a.label) {
        const m = G.quadPoint(pa, c, pb, 0.5);
        const w = textW(a.label, 10) + 10;
        el('rect', { x: m.x - w / 2, y: m.y - 8, width: w, height: 15, rx: 7, fill: this.pal.chip.fill, stroke: a.color, 'stroke-width': 1, opacity: 0.96 }, this.gArc);
        const t = el('text', { x: m.x, y: m.y + 3.6, 'text-anchor': 'middle', 'font-size': 10, fill: a.color, 'font-family': 'ui-monospace, monospace' }, this.gArc);
        t.textContent = a.label;
      }
    });
  };

  Renderer.prototype.renderHulls = function (scene) {
    while (this.gHull.firstChild) this.gHull.removeChild(this.gHull.firstChild);
    if (!scene) return;
    Object.keys(scene.hulls).forEach(k => {
      const h = scene.hulls[k];
      const pts = h.nodeIds.map(id => this.curPos[id]).filter(Boolean);
      if (!pts.length) return;
      const hull = G.convexHull(pts);
      const poly = G.expandPolygon(hull, 34);
      const d = G.smoothClosedPath(poly, 16);
      el('path', {
        d, fill: h.color, 'fill-opacity': 0.10, stroke: h.color,
        'stroke-width': 1.8, 'stroke-dasharray': '7 5', opacity: 0.95
      }, this.gHull);
      if (h.label) {
        const top = poly.reduce((a, b) => (b.y < a.y ? b : a), poly[0]);
        const w = textW(h.label, 10.5) + 12;
        el('rect', { x: top.x - w / 2, y: top.y - 20, width: w, height: 16, rx: 8, fill: this.pal.chip.fill, stroke: h.color, 'stroke-width': 1 }, this.gHull);
        const t = el('text', { x: top.x, y: top.y - 8, 'text-anchor': 'middle', 'font-size': 10.5, fill: h.color, 'font-weight': 700 }, this.gHull);
        t.textContent = h.label;
      }
    });
  };

  Renderer.prototype.renderCuts = function (scene) {
    while (this.gCut.firstChild) this.gCut.removeChild(this.gCut.firstChild);
    if (!scene) return;
    Object.keys(scene.cuts).forEach(k => {
      const c = scene.cuts[k];
      const pts = c.nodeIds.map(id => this.curPos[id]).filter(Boolean);
      if (!pts.length) return;
      if (c.style === 'serrated' && c.otherIds) {
        const others = c.otherIds.map(id => this.curPos[id]).filter(Boolean);
        // 取跨割边中点
        const mids = [];
        (this.def.edges || []).forEach(e => {
          const inS = c.nodeIds.indexOf(e.source) >= 0, inT = c.otherIds.indexOf(e.source) >= 0;
          const inS2 = c.nodeIds.indexOf(e.target) >= 0, inT2 = c.otherIds.indexOf(e.target) >= 0;
          if ((inS && inT2) || (inT && inS2)) {
            const a = this.curPos[e.source], b = this.curPos[e.target];
            if (a && b) mids.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          }
        });
        if (mids.length) {
          mids.sort((p, q) => (p.x - q.x) || (p.y - q.y));
          el('path', {
            d: G.zigzag(mids, 7), fill: 'none', stroke: c.color,
            'stroke-width': 2.6, 'stroke-linejoin': 'round', opacity: 0.98
          }, this.gCut);
        }
      } else {
        const hull = G.convexHull(pts);
        const poly = G.expandPolygon(hull, 30);
        el('path', {
          d: G.smoothClosedPath(poly, 14), fill: 'none', stroke: c.color,
          'stroke-width': 2, 'stroke-dasharray': '8 6', opacity: 0.95
        }, this.gCut);
      }
      if (c.label) {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const top = pts.reduce((a, b) => (b.y < a.y ? b : a), pts[0]);
        const w = textW(c.label, 10.5) + 12;
        el('rect', { x: cx - w / 2, y: top.y - 34, width: w, height: 16, rx: 8, fill: this.pal.chip.fill, stroke: c.color, 'stroke-width': 1 }, this.gCut);
        const t = el('text', { x: cx, y: top.y - 22, 'text-anchor': 'middle', 'font-size': 10.5, fill: c.color, 'font-weight': 700 }, this.gCut);
        t.textContent = c.label;
      }
    });
  };

  Renderer.prototype.renderPulses = function (scene) {
    if (!scene.pulses || !scene.pulses.length) return;
    scene.pulses.forEach((pulse, i) => {
      const box = this.edgeEls[pulse.edgeId];
      if (!box || !box.path.getTotalLength) return;
      const len = box.path.getTotalLength();
      const dot = el('circle', { r: 4.2, fill: pulse.color, filter: 'url(#softGlow)', opacity: 0.95 }, this.gPulse);
      const trail = el('circle', { r: 8.5, fill: pulse.color, opacity: 0.16 }, this.gPulse);
      const start = performance.now() + i * 70;
      const dur = pulse.durationMs || 420;
      const back = pulse.direction === 'reverse';
      const step = (now) => {
        const t = Math.min(1, Math.max(0, (now - start) / dur));
        const pos = box.path.getPointAtLength((back ? 1 - t : t) * len);
        dot.setAttribute('cx', pos.x); dot.setAttribute('cy', pos.y);
        trail.setAttribute('cx', pos.x); trail.setAttribute('cy', pos.y);
        dot.setAttribute('opacity', t >= 1 ? 0 : 0.95);
        trail.setAttribute('opacity', t >= 1 ? 0 : 0.16);
        if (t < 1) requestAnimationFrame(step);
        else { dot.remove(); trail.remove(); }
      };
      requestAnimationFrame(step);
    });
  };

  /* --------- 视角 --------- */
  Renderer.prototype._bindView = function () {
    const host = this.host;
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    let nodeDrag = null;

    host.addEventListener('wheel', (ev) => {
      if (ev.ctrlKey || ev.metaKey || true) {
        ev.preventDefault();
        const rect = host.getBoundingClientRect();
        const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
        const k0 = this.view.k;
        const k1 = G.clamp(k0 * (ev.deltaY < 0 ? 1.12 : 0.893), 0.35, 3.2);
        // 以光标为中心缩放（在 viewBox 坐标系内）
        const vx = (mx / rect.width) * this.W, vy = (my / rect.height) * this.H;
        this.view.x = vx - (vx - this.view.x) * (k1 / k0);
        this.view.y = vy - (vy - this.view.y) * (k1 / k0);
        this.view.k = k1;
        this.applyView();
      }
    }, { passive: false });

    host.addEventListener('mousedown', (ev) => {
      const nodeG = ev.target.closest && ev.target.closest('.node');
      if (nodeG && ev.button === 0) {
        nodeDrag = { id: nodeG.getAttribute('data-id'), startX: ev.clientX, startY: ev.clientY };
        ev.preventDefault();
        return;
      }
      if (ev.button !== 0) return;
      dragging = true;
      sx = ev.clientX; sy = ev.clientY; ox = this.view.x; oy = this.view.y;
      host.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (ev) => {
      if (nodeDrag) {
        const rect = host.getBoundingClientRect();
        const scale = this.W / rect.width;
        const dx = (ev.clientX - nodeDrag.startX) * scale / this.view.k;
        const dy = (ev.clientY - nodeDrag.startY) * scale / this.view.k;
        this.manual[nodeDrag.id] = this.manual[nodeDrag.id] || { x: 0, y: 0 };
        this.manual[nodeDrag.id].x += dx;
        this.manual[nodeDrag.id].y += dy;
        nodeDrag.startX = ev.clientX; nodeDrag.startY = ev.clientY;
        if (this.targetPos[nodeDrag.id]) {
          this.curPos[nodeDrag.id] = {
            x: this.targetPos[nodeDrag.id].x + this.manual[nodeDrag.id].x,
            y: this.targetPos[nodeDrag.id].y + this.manual[nodeDrag.id].y
          };
        }
        this.syncGeometry();
        return;
      }
      if (!dragging) return;
      const rect = host.getBoundingClientRect();
      const scale = this.W / rect.width;
      this.view.x = ox + (ev.clientX - sx) * scale;
      this.view.y = oy + (ev.clientY - sy) * scale;
      this.applyView();
    });

    window.addEventListener('mouseup', () => {
      dragging = false; nodeDrag = null;
      host.style.cursor = '';
    });

    host.addEventListener('dblclick', (ev) => {
      const nodeG = ev.target.closest && ev.target.closest('.node');
      if (nodeG) {
        const id = nodeG.getAttribute('data-id');
        delete this.manual[id];
        if (this.targetPos[id]) this.curPos[id] = { x: this.targetPos[id].x, y: this.targetPos[id].y };
        this.syncGeometry();
        if (this.onNodeDblClick) this.onNodeDblClick(id);
        return;
      }
      const edgeG = ev.target.closest && ev.target.closest('.edge');
      if (edgeG && this.onEdgeDblClick) { this.onEdgeDblClick(edgeG.getAttribute('data-id')); return; }
      if (this.onBlankDblClick) this.onBlankDblClick(this.clientToWorld(ev));
    });

    host.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const nodeG = ev.target.closest && ev.target.closest('.node');
      if (nodeG && this.onNodeContext) { this.onNodeContext(nodeG.getAttribute('data-id')); return; }
      const edgeG = ev.target.closest && ev.target.closest('.edge');
      if (edgeG && this.onEdgeContext) { this.onEdgeContext(edgeG.getAttribute('data-id')); return; }
      if (this.onBlankContext) this.onBlankContext(this.clientToWorld(ev));
    });

    host.addEventListener('click', (ev) => {
      const edgeG = ev.target.closest && ev.target.closest('.edge');
      if (edgeG && this.onEdgeClick) this.onEdgeClick(edgeG.getAttribute('data-id'));
      const nodeG = ev.target.closest && ev.target.closest('.node');
      if (nodeG && this.onNodeClick) this.onNodeClick(nodeG.getAttribute('data-id'));
    });
  };

  Renderer.prototype.clientToWorld = function (ev) {
    const rect = this.host.getBoundingClientRect();
    const vb = this.svg.viewBox.baseVal;
    const vx = vb.x + (ev.clientX - rect.left) / rect.width * vb.width;
    const vy = vb.y + (ev.clientY - rect.top) / rect.height * vb.height;
    return { x: (vx - this.view.x) / this.view.k, y: (vy - this.view.y) / this.view.k };
  };

  Renderer.prototype.applyView = function () {    this.vp.setAttribute('transform', `translate(${this.view.x.toFixed(2)} ${this.view.y.toFixed(2)}) scale(${this.view.k.toFixed(3)})`);
  };

  Renderer.prototype.zoomBy = function (factor) {
    const k0 = this.view.k;
    const k1 = G.clamp(k0 * factor, 0.35, 3.2);
    const cx = this.W / 2, cy = this.H / 2;
    this.view.x = cx - (cx - this.view.x) * (k1 / k0);
    this.view.y = cy - (cy - this.view.y) * (k1 / k0);
    this.view.k = k1;
    this.applyView();
  };

  Renderer.prototype.autofit = function (force) {
    const ids = Object.keys(this.curPos).filter(id => {
      const st = this.scene && this.scene.nodes && this.scene.nodes[id];
      return !st || !st.hidden;
    });
    if (!ids.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    ids.forEach(id => {
      const p = this.curPos[id];
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
    const padX = 72, padTop = 112, padBottom = 56;
    const need = { x1: minX - padX, x2: maxX + padX, y1: minY - padTop, y2: maxY + padBottom };
    // 已适配过：只要当前视窗仍容纳内容，就不改变视角（避免每一步都缩放跳动）
    if (this._fitBox && !force) {
      const b = this._fitBox;
      if (need.x1 >= b.x1 && need.x2 <= b.x2 && need.y1 >= b.y1 && need.y2 <= b.y2) return;
      need.x1 = Math.min(need.x1, b.x1); need.x2 = Math.max(need.x2, b.x2);
      need.y1 = Math.min(need.y1, b.y1); need.y2 = Math.max(need.y2, b.y2);
    }
    const w = need.x2 - need.x1, h = need.y2 - need.y1;
    const cx = (need.x1 + need.x2) / 2, cy = (need.y1 + need.y2) / 2;
    const aspect = this.W / this.H;
    // 限制最大放大倍率，避免 3 个结点被放大到占满整块画布
    const minVW = this.minViewWidth || 640;
    let vw = Math.max(w, minVW), vh = Math.max(h, minVW / aspect);
    if (vw / vh < aspect) vw = vh * aspect; else vh = vw / aspect;
    this._fitBox = { x1: cx - vw / 2, x2: cx + vw / 2, y1: cy - vh / 2, y2: cy + vh / 2 };
    this.viewBox = { x: this._fitBox.x1, y: this._fitBox.y1, w: vw, h: vh };
    this.svg.setAttribute('viewBox', `${this._fitBox.x1.toFixed(1)} ${this._fitBox.y1.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    this.view = { x: 0, y: 0, k: 1 };
    this.applyView();
  };

  Renderer.prototype.resetView = function () { this.autofit(); };

  Renderer.prototype.relayout = function () {
    this.manual = {};
    if (this.onRelayout) this.onRelayout();
  };

  Renderer.prototype.exportSVG = function (transparent) {
    const clone = this.svg.cloneNode(true);
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('width', this.W);
    clone.setAttribute('height', this.H);
    if (!transparent) {
      const bg = document.createElementNS(NS, 'rect');
      bg.setAttribute('x', this.viewBox ? this.viewBox.x : 0);
      bg.setAttribute('y', this.viewBox ? this.viewBox.y : 0);
      bg.setAttribute('width', this.viewBox ? this.viewBox.w : this.W);
      bg.setAttribute('height', this.viewBox ? this.viewBox.h : this.H);
      bg.setAttribute('fill', this.theme === 'light' ? '#FFFFFF' : '#0B1220');
      clone.insertBefore(bg, clone.firstChild);
    }
    return new XMLSerializer().serializeToString(clone);
  };

  TGV.Renderer = Renderer;
  TGV.PALETTE = PALETTE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
