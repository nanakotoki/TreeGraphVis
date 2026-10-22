/* ============================================================
 * TreeGraphVis · 统一拓扑指令流协议 (Topology Trace Protocol)
 * 算法模块只产出纯数据帧序列，绝不接触 DOM。
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};

  /* ---------------- 指令构造器（算法侧书写糖） ---------------- */
  const C = {
    state: (target, state) => ({ op: 'SET_NODE_STATE', target, state }),
    multiState: (targets, state) => targets.map(t => ({ op: 'SET_NODE_STATE', target: t, state })),
    edge: (target, state) => ({ op: 'SET_EDGE_STATE', target, state }),
    edgeColor: (target, color, dashed, width) => ({ op: 'SET_EDGE_STATE', target, state: 'custom', color, dashed, width }),
    badge: (target, key, value, highlight) => ({ op: 'UPDATE_NODE_BADGE', target, key, value, highlight: !!highlight }),
    badges: (target, obj, highlight) => Object.keys(obj).map(k => ({ op: 'UPDATE_NODE_BADGE', target, key: k, value: obj[k], highlight: !!highlight })),
    slots: (target, slots) => ({ op: 'UPDATE_NODE_SLOTS', target, slots }),
    setLabel: (target, label) => ({ op: 'SET_NODE_LABEL', target, label }),
    style: (target, s) => ({ op: 'SET_NODE_STYLE', target, fill: s.fill, stroke: s.stroke, text: s.text }),
    label: (edgeId, label, highlight) => ({ op: 'UPDATE_EDGE_LABEL', edgeId, label, highlight: !!highlight }),
    flowEdge: (edgeId, flow, cap) => ({ op: 'UPDATE_EDGE_LABEL', edgeId, label: flow + '/' + cap, flow, cap }),
    pulse: (edgeId, opts) => Object.assign({ op: 'TRAVERSE_EDGE_PULSE' }, opts || {}, { edgeId }),
    morph: (positions, durationMs) => ({ op: 'MORPH_LAYOUT', positions, durationMs: durationMs || 460 }),
    arc: (id, a, b, opts) => Object.assign({ op: 'DRAW_TEMP_ARC', id, from: a, to: b }, opts || {}),
    clearArc: (id) => ({ op: 'CLEAR_TEMP_ARC', id }),
    clearArcs: (prefix) => ({ op: 'CLEAR_TEMP_ARC', id: '*', prefix }),
    hull: (groupId, nodeIds, color, label) => ({ op: 'GROUP_NODES_HULL', groupId, nodeIds, color, label }),
    clearHull: (groupId) => ({ op: 'GROUP_NODES_HULL', groupId, nodeIds: null }),
    cut: (id, nodeIds, color, label, otherIds, style) => ({ op: 'DRAW_CUT_LINE', id, nodeIds, color, label, otherIds, style }),
    clearCut: (id) => ({ op: 'DRAW_CUT_LINE', id, nodeIds: null }),
    /* 辅助面板 */
    q: (panelId, action, items, label) => ({ op: 'AUX_CONTAINER_OP', panelId, action, items, label }),
    push: (panelId, item, label) => ({ op: 'AUX_CONTAINER_OP', panelId, action: 'push', items: [item], label }),
    pop: (panelId, count) => ({ op: 'AUX_CONTAINER_OP', panelId, action: 'pop', count: count || 1 }),
    setQ: (panelId, items, label) => ({ op: 'AUX_CONTAINER_OP', panelId, action: 'set', items, label }),
    front: (panelId, item) => ({ op: 'AUX_CONTAINER_OP', panelId, action: 'push_front', items: [item] }),
    back: (panelId, item) => ({ op: 'AUX_CONTAINER_OP', panelId, action: 'push', items: [item] }),
    table: (panelId, rowKey, colKey, value, highlight) => ({ op: 'AUX_TABLE_UPDATE', panelId, rowKey, colKey, value, highlight: !!highlight }),
    matrix: (panelId, i, j, value, highlight) => ({ op: 'AUX_MATRIX_UPDATE', panelId, i, j, value, highlight: !!highlight }),
    dsu: (panelId, parent, rank) => ({ op: 'AUX_DSU_SYNC', panelId, parent, rank }),
    array: (panelId, values, highlight, labels) => ({ op: 'AUX_ARRAY_SYNC', panelId, values, highlight, labels }),
    text: (panelId, lines) => ({ op: 'AUX_TEXT_SYNC', panelId, lines }),
    hide: (target) => ({ op: 'SET_NODE_VISIBILITY', target, hidden: true }),
    show: (target) => ({ op: 'SET_NODE_VISIBILITY', target, hidden: false }),
    hideEdge: (target) => ({ op: 'SET_EDGE_VISIBILITY', target, hidden: true }),
    showEdge: (target) => ({ op: 'SET_EDGE_VISIBILITY', target, hidden: false }),
    addNode: (id, label, extra) => Object.assign({ op: 'ADD_NODE', id, label: label != null ? label : id }, extra || {}),
    addEdge: (id, source, target, extra) => Object.assign({ op: 'ADD_EDGE', id, source, target }, extra || {}),
    removeEdge: (id) => ({ op: 'REMOVE_EDGE', id }),
    removeNode: (id) => ({ op: 'REMOVE_NODE', id }),
    note: (text, tone) => ({ op: 'SET_SCENE_NOTE', text, tone })
  };

  /* ---------------- 场景状态（纯数据） ---------------- */
  function initAux(panel) {
    switch (panel.type) {
      case 'queue': case 'deque': case 'stack': case 'heap': case 'list':
        return { type: panel.type, items: [], title: panel.title, hint: panel.hint, action: '' };
      case 'table': return { type: 'table', columns: panel.columns, rows: {}, rowOrder: panel.rowOrder || null, title: panel.title, default: panel.default || '-' };
      case 'matrix': return { type: 'matrix', n: panel.n || 6, cells: {}, title: panel.title, rowLabels: panel.rowLabels, colLabels: panel.colLabels, default: panel.default };
      case 'dsu': return { type: 'dsu', parent: Object.assign({}, panel.parent || {}), rank: Object.assign({}, panel.rank || {}), title: panel.title };
      case 'array': return { type: 'array', values: panel.values || [], labels: panel.labels || null, highlight: [], title: panel.title, base: panel.base || 0 };
      case 'text': return { type: 'text', lines: panel.lines || [], title: panel.title };
      default: return { type: 'text', lines: [], title: panel.title || '' };
    }
  }

  function Scene(def) {
    this.def = def;
    this.nodes = {};
    this.nodeOrder = [];
    (def.nodes || []).forEach(n => {
      this.nodes[n.id] = {
        id: n.id,
        label: n.label != null ? n.label : n.id,
        state: n.initialState || 'default',
        badges: Object.assign({}, n.badges || {}),
        slots: n.slots ? n.slots.slice() : null,
        hidden: !!n.hidden,
        dbl: false,
        shape: n.shape || null,
        sub: n.sub || null,
        key: n.key != null ? n.key : n.label,
        ord: n.ord != null ? n.ord : (n.key != null ? n.key : n.label),
        r: n.r,
        nil: !!n.nil,
        fixed: !!n.fixed
      };
      this.nodeOrder.push(n.id);
    });
    this.edges = {};
    this.edgeOrder = [];
    (def.edges || []).forEach(e => {
      this.edges[e.id] = {
        id: e.id,
        source: e.source,
        target: e.target,
        weight: e.weight != null ? e.weight : null,
        state: e.initialState || 'default',
        label: e.label != null ? e.label : '',
        hidden: !!e.hidden,
        color: null,
        dashed: !!e.dashed,
        width: null,
        flow: null,
        cap: e.cap != null ? e.cap : (e.weight != null ? e.weight : null),
        curve: e.curve
      };
      this.edgeOrder.push(e.id);
    });
    this.aux = {};
    (def.panels || []).forEach(p => { this.aux[p.id] = initAux(p); });
    this.arcs = {};
    this.hulls = {};
    this.cuts = {};
    this.note = null;
    this.narration = '';
    this.codeLine = null;
    this.vars = [];
    this.milestone = null;
    this.layoutRequest = null;   // 由 MORPH_LAYOUT 提供
    this.pulses = [];
  }

  Scene.prototype.clone = function () {
    const s = new Scene({ nodes: [], edges: [], panels: [] });
    s.def = this.def;
    s.nodes = {}; s.nodeOrder = this.nodeOrder.slice();
    this.nodeOrder.forEach(id => {
      const n = this.nodes[id];
      s.nodes[id] = Object.assign({}, n, { badges: Object.assign({}, n.badges), slots: n.slots ? n.slots.slice() : null });
    });
    s.edges = {}; s.edgeOrder = this.edgeOrder.slice();
    this.edgeOrder.forEach(id => { s.edges[id] = Object.assign({}, this.edges[id]); });
    s.aux = {};
    Object.keys(this.aux).forEach(k => { s.aux[k] = JSON.parse(JSON.stringify(this.aux[k])); });
    s.arcs = JSON.parse(JSON.stringify(this.arcs));
    s.hulls = JSON.parse(JSON.stringify(this.hulls));
    s.cuts = JSON.parse(JSON.stringify(this.cuts));
    s.note = this.note;
    s.narration = this.narration;
    s.codeLine = this.codeLine;
    s.vars = this.vars.slice();
    s.milestone = this.milestone;
    s.layoutRequest = null;
    s.pulses = [];
    return s;
  };

  /* ---------------- 指令执行 ---------------- */
  function apply(scene, cmd, errs) {
    const noop = null;
    switch (cmd.op) {
      case 'SET_NODE_STATE': {
        const n = scene.nodes[cmd.target];
        if (!n) { errs && errs.push('未知节点 ' + cmd.target + ' @SET_NODE_STATE'); return; }
        n.state = cmd.state;
        if (cmd.state === 'doubleblack') n.dbl = true;
        else if (cmd.state !== 'default') n.dbl = false;
        return;
      }
      case 'SET_EDGE_STATE': {
        const e = scene.edges[cmd.target];
        if (!e) { errs && errs.push('未知边 ' + cmd.target + ' @SET_EDGE_STATE'); return; }
        e.state = cmd.state;
        if (cmd.color) e.color = cmd.color; else if (cmd.state !== 'custom') e.color = null;
        if (cmd.dashed !== undefined) e.dashed = cmd.dashed;
        if (cmd.width !== undefined) e.width = cmd.width;
        return;
      }
      case 'UPDATE_NODE_BADGE': {
        const n = scene.nodes[cmd.target];
        if (!n) { errs && errs.push('未知节点 ' + cmd.target + ' @UPDATE_NODE_BADGE'); return; }
        if (cmd.value === null || cmd.value === undefined || cmd.value === '') delete n.badges[cmd.key];
        else n.badges[cmd.key] = cmd.value;
        return;
      }
      case 'UPDATE_NODE_SLOTS': {
        const n = scene.nodes[cmd.target];
        if (!n) { errs && errs.push('未知节点 ' + cmd.target); return; }
        n.slots = cmd.slots ? cmd.slots.slice() : null;
        return;
      }
      case 'SET_NODE_LABEL': {
        const n = scene.nodes[cmd.target];
        if (!n) { errs && errs.push('未知节点 ' + cmd.target); return; }
        n.label = cmd.label;
        return;
      }
      case 'SET_NODE_STYLE': {
        const n = scene.nodes[cmd.target];
        if (!n) { errs && errs.push('未知节点 ' + cmd.target); return; }
        n.fill = cmd.fill || null;
        n.stroke = cmd.stroke || null;
        n.textColor = cmd.text || null;
        return;
      }
      case 'UPDATE_EDGE_LABEL': {
        const e = scene.edges[cmd.edgeId];
        if (!e) { errs && errs.push('未知边 ' + cmd.edgeId + ' @UPDATE_EDGE_LABEL'); return; }
        e.label = cmd.label;
        if (cmd.flow !== undefined) e.flow = cmd.flow;
        if (cmd.cap !== undefined) e.cap = cmd.cap;
        return;
      }
      case 'TRAVERSE_EDGE_PULSE': {
        scene.pulses.push({ edgeId: cmd.edgeId, direction: cmd.direction || 'forward', color: cmd.color || '#4F46E5', durationMs: cmd.durationMs || 460 });
        return;
      }
      case 'MORPH_LAYOUT': scene.layoutRequest = { positions: cmd.positions, durationMs: cmd.durationMs || 460 }; return;
      case 'DRAW_TEMP_ARC':
        if (cmd.id) scene.arcs[cmd.id] = { id: cmd.id, from: cmd.from, to: cmd.to, color: cmd.color || '#8B5CF6', label: cmd.label || '', dashed: cmd.dashed !== false, curve: cmd.curve, width: cmd.width };
        return;
      case 'CLEAR_TEMP_ARC': {
        if (cmd.id === '*') {
          Object.keys(scene.arcs).forEach(k => { if (!cmd.prefix || k.indexOf(cmd.prefix) === 0) delete scene.arcs[k]; });
        } else delete scene.arcs[cmd.id];
        return;
      }
      case 'GROUP_NODES_HULL':
        if (!cmd.nodeIds) delete scene.hulls[cmd.groupId];
        else scene.hulls[cmd.groupId] = { id: cmd.groupId, nodeIds: cmd.nodeIds.slice(), color: cmd.color || '#8B5CF6', label: cmd.label || '' };
        return;
      case 'DRAW_CUT_LINE':
        if (!cmd.nodeIds) delete scene.cuts[cmd.id];
        else scene.cuts[cmd.id] = { id: cmd.id, nodeIds: cmd.nodeIds.slice(), otherIds: cmd.otherIds, color: cmd.color || '#DC2626', label: cmd.label || '', style: cmd.style || 'hull' };
        return;
      case 'SET_NODE_VISIBILITY': {
        const n = scene.nodes[cmd.target];
        if (n) n.hidden = !!cmd.hidden;
        return;
      }
      case 'ADD_NODE': {
        if (!scene.nodes[cmd.id]) {
          scene.nodes[cmd.id] = {
            id: cmd.id,
            label: cmd.label != null ? cmd.label : cmd.id,
            state: cmd.state || 'default',
            badges: cmd.badges || {},
            slots: cmd.slots ? cmd.slots.slice() : null,
            hidden: !!cmd.hidden,
            dbl: false,
            shape: cmd.shape || null,
            sub: cmd.sub || null,
            key: cmd.key != null ? cmd.key : cmd.label,
            ord: cmd.ord != null ? cmd.ord : (cmd.key != null ? cmd.key : cmd.label),
            r: cmd.r,
            nil: !!cmd.nil,
            fixed: false
          };
          scene.nodeOrder.push(cmd.id);
        }
        return;
      }
      case 'ADD_EDGE': {
        if (!scene.edges[cmd.id]) {
          if (!scene.nodes[cmd.source] || !scene.nodes[cmd.target]) {
            errs && errs.push('ADD_EDGE 端点不存在: ' + cmd.id + ' ' + cmd.source + '->' + cmd.target);
            return;
          }
          scene.edges[cmd.id] = {
            id: cmd.id,
            source: cmd.source,
            target: cmd.target,
            weight: cmd.weight != null ? cmd.weight : null,
            state: cmd.state || 'default',
            label: cmd.label != null ? cmd.label : '',
            hidden: !!cmd.hidden,
            color: null, dashed: !!cmd.dashed, width: null, flow: null, cap: null,
            curve: cmd.curve
          };
          scene.edgeOrder.push(cmd.id);
        }
        return;
      }
      case 'SET_EDGE_VISIBILITY': {
        const e = scene.edges[cmd.target];
        if (e) e.hidden = !!cmd.hidden;
        return;
      }
      case 'REMOVE_EDGE': {
        if (scene.edges[cmd.id]) {
          delete scene.edges[cmd.id];
          const i = scene.edgeOrder.indexOf(cmd.id);
          if (i >= 0) scene.edgeOrder.splice(i, 1);
        }
        return;
      }
      case 'REMOVE_NODE': {
        if (scene.nodes[cmd.id]) {
          delete scene.nodes[cmd.id];
          const i = scene.nodeOrder.indexOf(cmd.id);
          if (i >= 0) scene.nodeOrder.splice(i, 1);
          scene.edgeOrder.slice().forEach(eid => {
            const e = scene.edges[eid];
            if (e && (e.source === cmd.id || e.target === cmd.id)) {
              delete scene.edges[eid];
              scene.edgeOrder.splice(scene.edgeOrder.indexOf(eid), 1);
            }
          });
        }
        return;
      }
      case 'SET_SCENE_NOTE': scene.note = cmd.text ? { text: cmd.text, tone: cmd.tone || 'info' } : null; return;
      case 'AUX_CONTAINER_OP': {
        const p = scene.aux[cmd.panelId];
        if (!p) { errs && errs.push('未知面板 ' + cmd.panelId); return; }
        const items = (cmd.items || []).map(it => (typeof it === 'object' ? Object.assign({}, it) : { key: it, label: String(it) }));
        if (cmd.action === 'set') p.items = items;
        else if (cmd.action === 'push') p.items = p.items.concat(items);
        else if (cmd.action === 'push_front') p.items = items.concat(p.items);
        else if (cmd.action === 'pop') p.items = p.items.slice(0, Math.max(0, p.items.length - (cmd.count || 1)));
        else if (cmd.action === 'pop_back') p.items = p.items.slice(0, Math.max(0, p.items.length - (cmd.count || 1)));
        else if (cmd.action === 'pop_front') p.items = p.items.slice(cmd.count || 1);
        else if (cmd.action === 'clear') p.items = [];
        else if (cmd.action === 'reorder') p.items = items;
        if (cmd.label !== undefined) p.action = cmd.label;
        return;
      }
      case 'AUX_TABLE_UPDATE': {
        const p = scene.aux[cmd.panelId];
        if (!p) { errs && errs.push('未知面板 ' + cmd.panelId); return; }
        if (!p.rows[cmd.rowKey]) p.rows[cmd.rowKey] = {};
        p.rows[cmd.rowKey][cmd.colKey] = cmd.value;
        return;
      }
      case 'AUX_MATRIX_UPDATE': {
        const p = scene.aux[cmd.panelId];
        if (!p) { errs && errs.push('未知面板 ' + cmd.panelId); return; }
        p.cells[cmd.i + ',' + cmd.j] = cmd.value;
        return;
      }
      case 'AUX_DSU_SYNC': {
        const p = scene.aux[cmd.panelId];
        if (!p) { errs && errs.push('未知面板 ' + cmd.panelId); return; }
        if (cmd.parent) p.parent = Object.assign({}, cmd.parent);
        if (cmd.rank) p.rank = Object.assign({}, cmd.rank);
        if (cmd.size) p.size = Object.assign({}, cmd.size);
        if (cmd.highlight) p.highlight = cmd.highlight.slice();
        return;
      }
      case 'AUX_ARRAY_SYNC': {
        const p = scene.aux[cmd.panelId];
        if (!p) { errs && errs.push('未知面板 ' + cmd.panelId); return; }
        p.values = (cmd.values || []).slice();
        p.highlight = (cmd.highlight || []).slice();
        if (cmd.labels) p.labels = cmd.labels.slice();
        return;
      }
      case 'AUX_TEXT_SYNC': {
        const p = scene.aux[cmd.panelId];
        if (!p) { errs && errs.push('未知面板 ' + cmd.panelId); return; }
        p.lines = (cmd.lines || []).slice();
        return;
      }
      default:
        errs && errs.push('未知指令 ' + cmd.op);
    }
  }

  function replay(def, frames, index) {
    const scene = new Scene(def);
    const errs = [];
    const upto = Math.min(index, frames.length - 1);
    for (let i = 0; i <= upto; i++) {
      const f = frames[i];
      (f.commands || []).forEach(c => apply(scene, c, errs));
      scene.narration = f.narration || '';
      scene.codeLine = f.codeLine != null ? f.codeLine : null;
      scene.vars = f.vars || [];
      scene.milestone = f.isMilestone ? f.milestoneLabel : null;
      if (i < upto) scene.pulses = [];
    }
    return { scene, errs };
  }

  /* ---------------- 算法追踪构建器 ---------------- */
  function Builder(meta, data) {
    this.meta = meta;
    this.nodes = data.nodes;
    this.edges = data.edges;
    this.frames = [];
    this.currentLine = 0;
    this.panels = data.panels || meta.panels || [];
    this.aux_presets = data.aux || null;
  }

  Builder.prototype.step = function (narration, commands, opts) {
    opts = opts || {};
    const frame = {
      stepIndex: this.frames.length,
      narration: narration || '',
      codeLine: opts.line != null ? opts.line : this.currentLine,
      isMilestone: !!opts.milestone,
      milestoneLabel: opts.milestone || null,
      stage: !!opts.stage,
      vars: opts.vars || [],
      commands: Array.isArray(commands) ? commands : (commands ? [commands] : []),
      durationMs: opts.duration || 0
    };
    this.frames.push(frame);
    return frame;
  };

  /* 添加一帧并同时刷新若干角标的便捷方法 */
  Builder.prototype.trace = function () { return this.frames; };

  function normalize(def, built) {
    const nodes = built.nodes.map(n => {
      const o = Object.assign({}, n);
      if (!o.id) throw new Error('节点缺少 id: ' + JSON.stringify(n));
      if (o.x === undefined) o.x = 0;
      if (o.y === undefined) o.y = 0;
      return o;
    });
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = (built.edges || []).map((e, i) => {
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
        throw new Error('边端点不存在: ' + JSON.stringify(e));
      }
      return Object.assign({ id: e.id || ('e' + i), weight: e.weight != null ? e.weight : null }, e);
    });
    return { nodes, edges, frames: built.frames, panels: built.panels };
  }

  TGV.C = C;
  TGV.Scene = Scene;
  TGV.applyCommand = apply;
  TGV.replay = replay;
  TGV.Builder = Builder;
  TGV.normalize = normalize;
  TGV.algos = {};
  TGV.register = function (def) { TGV.algos[def.id] = def; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
