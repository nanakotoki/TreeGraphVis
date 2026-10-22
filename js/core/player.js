/* ============================================================
 * TreeGraphVis · Time-Travel Stepper（时光机播放器）
 * 负责：帧序列回放、单步前进/后退、倍速播放、里程碑跳转、
 *       自动布局（每帧重算紧凑树拓扑）、与渲染器/面板同步。
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};

  function Player(opts) {
    this.renderer = opts.renderer;
    this.panels = opts.panels;
    this.onUpdate = opts.onUpdate || function () {};
    this.onRender = opts.onRender || function () {};
    this.speed = 1;
    this.mode = 'fine';
    this.playing = false;
    this.timer = null;
    this.index = 0;
    this.frames = [];
    this.def = null;
    this.meta = null;
    this.basePos = {};
    this.layoutOverride = '';
  }

  Player.prototype.load = function (meta, data) {
    this.meta = meta;
    this.def = {
      id: meta.id,
      directed: data.directed !== undefined ? data.directed : (meta.directed !== false),
      nodes: data.nodes,
      edges: data.edges,
      panels: data.panels || meta.panels || []
    };
    this.frames = data.frames;
    this.index = 0;
    this.playing = false;
    clearTimeout(this.timer);
    this.nodeMeta = {};
    (data.nodes || []).forEach(n => { this.nodeMeta[n.id] = n; });
    this.edgeMeta = {};
    (data.edges || []).forEach(e => { this.edgeMeta[e.id] = e; });
    this.sig = '';
    const kind = this.layoutOverride || meta.layout || 'fixed';
    this.view = { id: meta.id, directed: this.def.directed, panels: this.def.panels, nodes: this.def.nodes, edges: this.def.edges };
    this.renderer.setDef(this.view, false);
    if (kind !== 'tree') {
      const res = TGV.Layouts.compute(kind, this.def.nodes, this.def.edges, meta.layoutOpt || {});
      this.basePos = res.pos;
    }
    this.buildStops();
    this.renderCurrent(false);
  };

  Player.prototype.buildBase = function () {
    // 静态图：一次性计算布局
    const kind = this.layoutOverride || this.meta.layout || 'fixed';
    if (kind !== 'tree') {
      const v = this.view || this.def;
      const res = TGV.Layouts.compute(kind, v.nodes, v.edges, this.meta.layoutOpt || {});
      this.basePos = res.pos;
    }
  };

  Player.prototype.buildStops = function () {
    const frames = this.frames;
    if (this.mode === 'stage') {
      const stops = [];
      frames.forEach((f, i) => {
        if (f.stage || f.isMilestone) stops.push(i);
      });
      if (!stops.length || stops[0] !== 0) stops.unshift(0);
      if (stops[stops.length - 1] !== frames.length - 1) stops.push(frames.length - 1);
      this.stops = stops;
    } else {
      this.stops = frames.map((_, i) => i);
    }
    this.pos = this.stops.indexOf(this.index);
    if (this.pos < 0) this.pos = 0;
  };

  Player.prototype.setMode = function (mode) {
    this.mode = mode;
    const cur = this.index;
    this.buildStops();
    // 找到不大于当前帧的最近停靠点
    let best = 0;
    for (let i = 0; i < this.stops.length; i++) if (this.stops[i] <= cur) best = i;
    this.pos = best;
    this.index = this.stops[best];
    this.renderCurrent(false);
  };

  Player.prototype.positionsFor = function (scene) {
    const meta = this.meta;
    const kind = this.layoutOverride || meta.layout || 'fixed';
    const nodes = [], edges = [];
    const seen = {};
    const view = this.view || this.def;
    (view.nodes || []).forEach(n => {
      const st = scene.nodes[n.id];
      if (!st || st.hidden) return;
      seen[n.id] = true;
      nodes.push({ id: n.id, slots: st.slots, key: n.key, ord: n.ord != null ? n.ord : n.key, label: n.label });
    });
    (view.edges || []).forEach(e => {
      const st = scene.edges[e.id];
      if (!st || st.hidden) return;
      if (!seen[e.source] || !seen[e.target]) return;
      edges.push(e);
    });
    if (scene.layoutRequest && kind !== 'tree') {
      const pos = {};
      nodes.forEach(n => { pos[n.id] = scene.layoutRequest.positions[n.id] || this.basePos[n.id] || { x: 300, y: 300 }; });
      this.pendingDuration = scene.layoutRequest.durationMs;
      return pos;
    }
    this.pendingDuration = 0;
    if (kind === 'tree') {
      const res = TGV.Layouts.tidyTree(nodes, edges, {
        hGap: 30, vGap: 104,
        childOrder: meta.childOrder || 'key'
      });
      const pos = {};
      Object.keys(res.pos).forEach(id => { pos[id] = { x: res.pos[id].x + 80, y: res.pos[id].y + 66 }; });
      // 未参与布局（孤立/隐藏）节点兜底
      nodes.forEach(n => { if (!pos[n.id]) pos[n.id] = { x: 300, y: 500 }; });
      return pos;
    }
    const pos = {};
    nodes.forEach(n => { pos[n.id] = this.basePos[n.id] || { x: 300, y: 300 }; });
    return pos;
  };

  Player.prototype.ensureStructure = function (scene) {
    const sig = scene.nodeOrder.join(',') + '|' + scene.edgeOrder.join(',');
    if (sig === this.sig) return;
    this.sig = sig;
    this.view = {
      id: this.meta.id,
      directed: this.def.directed,
      panels: this.def.panels,
      nodes: scene.nodeOrder.map(id => {
        const st = scene.nodes[id];
        return { id, label: st.label, hidden: st.hidden, slots: st.slots, key: st.key, ord: st.ord, r: st.r };
      }),
      edges: scene.edgeOrder.map(id => {
        const st = scene.edges[id];
        return { id, source: st.source, target: st.target, weight: st.weight, hidden: st.hidden };
      })
    };
    this.renderer.setDef(this.view, true);
  };

  Player.prototype.suppressNil = function (scene) {
    // 全局开关：隐藏所有带 nil 标记的哨兵结点及其出边（布局随之收紧）
    const nilSet = {};
    let any = false;
    scene.nodeOrder.forEach(id => {
      const n = scene.nodes[id];
      if (n && n.nil) { nilSet[id] = true; any = true; }
    });
    if (!any) return;
    Object.keys(nilSet).forEach(id => { scene.nodes[id].hidden = true; });
    scene.edgeOrder.forEach(eid => {
      const e = scene.edges[eid];
      if (e && (nilSet[e.source] || nilSet[e.target])) e.hidden = true;
    });
  };

  Player.prototype.renderCurrent = function (animate) {
    if (!this.frames.length) return;
    const res = TGV.replay(this.def, this.frames, this.index);
    this.scene = res.scene;
    if (TGV.showNil === false) this.suppressNil(res.scene);
    if (res.errs && res.errs.length) {
      console.warn('[' + (this.meta && this.meta.id) + '] trace 指令警告:', Array.from(new Set(res.errs)).join(' | '));
    }
    this.ensureStructure(res.scene);
    const pos = this.positionsFor(res.scene);
    this.renderer.render(res.scene, {});
    const dur = this.pendingDuration || 460;
    this.renderer.setPositions(pos, !!animate, dur);
    if (this.panels) this.panels.render(res.scene);
    this.onUpdate(res.scene, this.index, this);
  };

  Player.prototype.go = function (pos, animate) {
    const p = Math.max(0, Math.min(this.stops.length - 1, pos));
    this.pos = p;
    this.index = this.stops[p];
    this.renderCurrent(animate !== false);
  };

  Player.prototype.next = function (animate) { this.go(this.pos + 1, animate); };
  Player.prototype.prev = function (animate) { this.go(this.pos - 1, animate); };
  Player.prototype.first = function () { this.pause(); this.go(0); };
  Player.prototype.last = function () { this.pause(); this.go(this.stops.length - 1); };

  Player.prototype.seekFrame = function (frameIndex) {
    let best = 0;
    for (let i = 0; i < this.stops.length; i++) if (this.stops[i] <= frameIndex) best = i;
    this.go(best);
  };

  Player.prototype.play = function () {
    if (this.playing) return;
    if (this.pos >= this.stops.length - 1) this.go(0, false);
    this.playing = true;
    this.tick();
  };

  Player.prototype.tick = function () {
    if (!this.playing) return;
    // 高倍速时不再等待 460ms 缓动，否则动画会层层叠加把播放拖慢
    const base = this.mode === 'stage' ? 1350 : 900;
    const delay = Math.max(16, base / this.speed);
    this.timer = setTimeout(() => {
      if (!this.playing) return;
      if (this.pos >= this.stops.length - 1) { this.pause(); return; }
      this.next(this.speed < 3);
      this.tick();
    }, delay);
  };

  Player.prototype.pause = function () {
    this.playing = false;
    clearTimeout(this.timer);
    if (this.onPlayState) this.onPlayState(false);
  };

  Player.prototype.toggle = function () {
    if (this.playing) this.pause();
    else this.play();
  };

  Player.prototype.setSpeed = function (s) { this.speed = s; };

  Player.prototype.milestones = function () {
    const out = [];
    this.frames.forEach((f, i) => { if (f.isMilestone) out.push({ frame: i, label: f.milestoneLabel }); });
    return out;
  };

  TGV.Player = Player;
})(typeof globalThis !== 'undefined' ? globalThis : this);
