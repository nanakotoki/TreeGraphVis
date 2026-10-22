/* ============================================================
 * TreeGraphVis · 辅助数据结构透视窗组件库
 * 队列 / 双端队列 / 栈 / 堆列表 / 状态表 / 矩阵热力 / 并查集森林 / 数组条
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};
  const G = TGV.Geom;

  function h(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }

  function Panels(host) {
    this.host = host;
    this.prev = {};
    this.elMap = {};
  }

  Panels.prototype.render = function (scene) {
    if (!scene) return;
    const aux = scene.aux || {};
    const ids = Object.keys(aux);
    // 结构变化则整块重建
    const sig = ids.join('|');
    if (this.sig !== sig) {
      this.sig = sig;
      this.host.innerHTML = '';
      this.elMap = {};
      ids.forEach(id => {
        const p = aux[id];
        const card = h('div', 'aux-card');
        const head = h('div', 'aux-head');
        head.appendChild(h('span', 'aux-title', p.title || ''));
        const badge = h('span', 'aux-badge');
        head.appendChild(badge);
        card.appendChild(head);
        const body = h('div', 'aux-body');
        card.appendChild(body);
        this.host.appendChild(card);
        this.elMap[id] = { card, body, badge, type: p.type };
      });
    }
    ids.forEach(id => {
      const p = aux[id];
      const box = this.elMap[id];
      if (!box) return;
      box.body.innerHTML = '';
      if (box.badge) box.badge.textContent = p.action || (p.items ? p.items.length + ' 项' : '');
      switch (p.type) {
        case 'queue': this.renderQueue(box.body, p, false); break;
        case 'deque': this.renderQueue(box.body, p, true); break;
        case 'stack': this.renderStack(box.body, p); break;
        case 'heap': case 'list': this.renderList(box.body, p); break;
        case 'table': this.renderTable(box.body, p, id); break;
        case 'matrix': this.renderMatrix(box.body, p, id); break;
        case 'dsu': this.renderDsu(box.body, p); break;
        case 'array': this.renderArray(box.body, p); break;
        case 'text': this.renderText(box.body, p); break;
        default: break;
      }
    });
  };

  Panels.prototype.renderQueue = function (body, p, isDeque) {
    const wrap = h('div', 'q-wrap');
    if (isDeque) {
      const l = h('div', 'q-end', '队首 ⇠');
      wrap.appendChild(l);
    }
    const track = h('div', 'q-track');
    if (!p.items.length) track.appendChild(h('div', 'q-empty', '（空）'));
    p.items.forEach((it, i) => {
      const chip = h('div', 'q-chip' + (i === 0 ? ' q-front' : ''));
      chip.appendChild(h('span', 'q-key', it.label != null ? it.label : it.key));
      if (it.meta) chip.appendChild(h('span', 'q-meta', it.meta));
      track.appendChild(chip);
    });
    wrap.appendChild(track);
    if (isDeque) wrap.appendChild(h('div', 'q-end', '⇢ 队尾'));
    body.appendChild(wrap);
    if (isDeque) {
      body.appendChild(h('div', 'q-hint', '权 0 松弛 → push_front（队首） ｜ 权 1 松弛 → push_back（队尾）'));
    }
  };

  Panels.prototype.renderStack = function (body, p) {
    const wrap = h('div', 'stack-wrap');
    if (!p.items.length) wrap.appendChild(h('div', 'q-empty', '（空栈）'));
    p.items.slice().reverse().forEach((it, i) => {
      const row = h('div', 'stack-item' + (i === 0 ? ' stack-top' : ''));
      row.appendChild(h('span', 'stack-key', it.label != null ? it.label : it.key));
      if (it.meta) row.appendChild(h('span', 'stack-meta', it.meta));
      if (i === 0) row.appendChild(h('span', 'stack-flag', 'TOP'));
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  };

  Panels.prototype.renderList = function (body, p) {
    const wrap = h('div', 'list-wrap');
    if (!p.items.length) wrap.appendChild(h('div', 'q-empty', '（空）'));
    p.items.forEach((it, i) => {
      const row = h('div', 'list-item');
      row.appendChild(h('span', 'list-idx', String(i)));
      row.appendChild(h('span', 'list-key', it.label != null ? it.label : it.key));
      if (it.meta) row.appendChild(h('span', 'list-meta', it.meta));
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  };

  Panels.prototype.renderTable = function (body, p, pid) {
    const cols = p.columns || [];
    const keys = p.rowOrder && p.rowOrder.length ? p.rowOrder.filter(k => p.rows[k]) : Object.keys(p.rows);
    const tbl = h('table', 'watch-table');
    const thead = h('thead');
    const tr = h('tr');
    tr.appendChild(h('th', 'rowhead', '节点'));
    cols.forEach(c => tr.appendChild(h('th', '', c.label != null ? c.label : c.key)));
    thead.appendChild(tr);
    tbl.appendChild(thead);
    const tbody = h('tbody');
    keys.forEach(k => {
      const row = h('tr');
      row.appendChild(h('th', 'rowhead', k));
      cols.forEach(c => {
        const v = p.rows[k] && p.rows[k][c.key] !== undefined ? p.rows[k][c.key] : (p.default || '-');
        const td = h('td', '', String(v));
        const prevKey = pid + '|' + k + '|' + c.key;
        if (this.prev[prevKey] !== undefined && this.prev[prevKey] !== String(v)) td.classList.add('cell-flash');
        this.prev[prevKey] = String(v);
        if (String(v) === '∞') td.classList.add('cell-inf');
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    tbl.appendChild(tbody);
    const scroll = h('div', 'tbl-scroll');
    scroll.appendChild(tbl);
    body.appendChild(scroll);
  };

  Panels.prototype.renderMatrix = function (body, p, pid) {
    const n = p.n;
    if (!n) { body.appendChild(h('div', 'q-empty', '（无矩阵）')); return; }
    const verts = p.verts || p.rowLabels || Array.from({ length: n }, (_, i) => String(i + 1));
    // 热力范围
    let mn = Infinity, mx = -Infinity;
    Object.keys(p.cells).forEach(k => {
      const v = p.cells[k];
      if (typeof v === 'number' && isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    });
    const tbl = h('table', 'matrix-table');
    const head = h('tr');
    head.appendChild(h('th', 'corner', ''));
    for (let j = 0; j < n; j++) head.appendChild(h('th', '', verts[j]));
    tbl.appendChild(head);
    for (let i = 0; i < n; i++) {
      const tr = h('tr');
      tr.appendChild(h('th', 'rowhead', verts[i]));
      for (let j = 0; j < n; j++) {
        const raw = p.cells[i + ',' + j];
        const v = raw === undefined ? (p.default !== undefined ? p.default : '∞') : raw;
        const td = h('td', '', String(v));
        if (i === j) td.classList.add('diag');
        if (typeof v === 'number' && isFinite(v) && mx > mn) {
          const a = 0.06 + 0.34 * ((v - mn) / (mx - mn));
          td.style.background = `rgba(79,70,229,${a.toFixed(3)})`;
        }
        const pk = pid + '|' + i + ',' + j;
        if (this.prev[pk] !== undefined && this.prev[pk] !== String(v)) td.classList.add('cell-flash');
        this.prev[pk] = String(v);
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
    }
    const scroll = h('div', 'matrix-scroll');
    scroll.appendChild(tbl);
    body.appendChild(scroll);
  };

  Panels.prototype.renderDsu = function (body, p) {
    const parent = p.parent || {};
    const ids = Object.keys(parent);
    if (!ids.length) { body.appendChild(h('div', 'q-empty', '（无节点）')); return; }
    const children = {};
    ids.forEach(id => children[id] = []);
    const roots = [];
    ids.forEach(id => {
      const par = parent[id];
      if (par === null || par === undefined || par === id || parent[par] === undefined) roots.push(id);
      else children[par].push(id);
    });
    const W = 260;
    let cursor = 0;
    const pos = {};
    const depthOf = {};
    function place(u, d) {
      depthOf[u] = d;
      const kids = children[u];
      if (!kids.length) {
        pos[u] = { x: cursor, y: d };
        cursor += 52;
        return pos[u].x;
      }
      const xs = kids.map(k => place(k, d + 1));
      const x = (xs[0] + xs[xs.length - 1]) / 2;
      pos[u] = { x, y: d };
      return x;
    }
    roots.forEach(r => { place(r, 0); cursor += 16; });
    let maxD = 0;
    ids.forEach(id => maxD = Math.max(maxD, depthOf[id] || 0));
    const width = Math.max(cursor, 120);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const H = (maxD + 1) * 54 + 18;
    svg.setAttribute('viewBox', `-26 -16 ${width + 52} ${H}`);
    svg.setAttribute('class', 'dsu-svg');
    const scale = Math.min(1, (W + 40) / (width + 52));
    ids.forEach(id => {
      const pp = pos[id];
      const par = parent[id];
      if (par !== null && par !== undefined && par !== id && pos[par]) {
        const a = pos[par], b = pp;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y * 54 + 12);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y * 54 - 12);
        line.setAttribute('stroke', '#94A3B8');
        line.setAttribute('stroke-width', '1.4');
        line.setAttribute('stroke-dasharray', '4 3');
        svg.appendChild(line);
      }
    });
    ids.forEach(id => {
      const pp = pos[id];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${pp.x} ${pp.y * 54})`);
      const isRoot = parent[id] === null || parent[id] === undefined || parent[id] === id;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', isRoot ? 13 : 11);
      c.setAttribute('fill', isRoot ? '#EEF2FF' : '#FFFFFF');
      c.setAttribute('stroke', isRoot ? '#4F46E5' : '#94A3B8');
      c.setAttribute('stroke-width', isRoot ? 2 : 1.4);
      g.appendChild(c);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('font-size', '11');
      t.setAttribute('font-weight', '700');
      t.setAttribute('fill', isRoot ? '#312E81' : '#334155');
      t.textContent = id;
      g.appendChild(t);
      if (p.rank && p.rank[id] !== undefined && isRoot) {
        const rt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rt.setAttribute('y', -17);
        rt.setAttribute('text-anchor', 'middle');
        rt.setAttribute('font-size', '9');
        rt.setAttribute('fill', '#64748B');
        rt.textContent = 'r=' + p.rank[id];
        g.appendChild(rt);
      }
      svg.appendChild(g);
    });
    const wrap = h('div', 'dsu-wrap');
    wrap.appendChild(svg);
    body.appendChild(wrap);
    body.appendChild(h('div', 'q-hint', '实线圆=根（认自己为父），虚线=指向父节点'));
  };

  Panels.prototype.renderArray = function (body, p, pid) {
    const wrap = h('div', 'arr-wrap');
    const labels = p.labels || [];
    const row = h('div', 'arr-row');
    const idxRow = h('div', 'arr-row arr-idx');
    (p.values || []).forEach((v, i) => {
      const cell = h('div', 'arr-cell' + (p.highlight && p.highlight.indexOf(i) >= 0 ? ' arr-hot' : ''));
      cell.appendChild(h('div', 'arr-val', String(v)));
      if (labels[i] !== undefined) cell.appendChild(h('div', 'arr-lab', String(labels[i])));
      row.appendChild(cell);
      idxRow.appendChild(h('div', 'arr-cell arr-i', String(i + (p.base || 0))));
    });
    wrap.appendChild(row);
    wrap.appendChild(idxRow);
    body.appendChild(wrap);
  };

  Panels.prototype.renderText = function (body, p) {
    const pre = h('pre', 'aux-pre');
    pre.textContent = (p.lines || []).join('\n');
    body.appendChild(pre);
  };

  TGV.Panels = Panels;
})(typeof globalThis !== 'undefined' ? globalThis : this);
