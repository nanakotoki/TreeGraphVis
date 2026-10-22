/* ============================================================
 * TreeGraphVis · 几何与通用工具库
 * 纯函数，无 DOM 依赖，可在 Node 中做无头校验
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};

  const ease = {
    linear: t => t,
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outBack: t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)
  };

  /* mulberry32 确定性随机数，保证力导向布局每次一致 */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* 凸包（Andrew Monotone Chain），返回逆时针点列 */
  function convexHull(points) {
    if (points.length <= 2) return points.slice();
    const pts = points.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  /* 把点集向外扩张 pad 像素（以质心为原点缩放 + 圆角化） */
  function expandPolygon(poly, pad) {
    if (!poly.length) return [];
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    return poly.map(p => {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      return { x: p.x + (dx / d) * pad, y: p.y + (dy / d) * pad };
    });
  }

  /* 由凸包生成"圆角云朵"闭合路径（二次贝塞尔平滑） */
  function smoothClosedPath(poly, radius) {
    if (!poly.length) return '';
    if (poly.length === 1) {
      const p = poly[0], r = radius || 40;
      return `M ${p.x - r} ${p.y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
    }
    if (poly.length === 2) {
      const [a, b] = poly;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * (radius || 30), ny = dx / len * (radius || 30);
      return `M ${a.x + nx} ${a.y + ny} Q ${(a.x + b.x) / 2 + nx * 1.9} ${(a.y + b.y) / 2 + ny * 1.9} ${b.x + nx} ${b.y + ny}` +
        ` Q ${(a.x + b.x) / 2 - nx * 0.1} ${(a.y + b.y) / 2 - ny * 0.1} ${a.x - nx} ${a.y - ny} Z`;
    }
    const n = poly.length;
    const mids = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      mids.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    }
    let d = `M ${mids[n - 1].x} ${mids[n - 1].y}`;
    for (let i = 0; i < n; i++) {
      const c = poly[i];
      d += ` Q ${c.x} ${c.y} ${mids[i].x} ${mids[i].y}`;
    }
    return d + ' Z';
  }

  function quadPoint(p0, p1, p2, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
    };
  }

  /* 点到线段距离 */
  function pointSegDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return dist(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  /* 折线（用于锯齿切割线） */
  function zigzag(points, amp) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const steps = Math.max(1, Math.round(len / (amp * 2)));
      const nx = -dy / len * amp, ny = dx / len * amp;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const px = a.x + dx * t, py = a.y + dy * t;
        const sign = s % 2 === 0 ? 1 : -1;
        d += ` L ${px + nx * sign} ${py + ny * sign}`;
      }
    }
    return d;
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    return `M ${x + rr} ${y} H ${x + w - rr} A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V ${y + h - rr} A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H ${x + rr} A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr} V ${y + rr} A ${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  /* 稳定哈希（用于把任意字符串映射到配色） */
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < String(s).length; i++) {
      h ^= String(s).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  TGV.Geom = { ease, rng, lerp, dist, convexHull, expandPolygon, smoothClosedPath, quadPoint, pointSegDist, zigzag, roundRect, clamp, esc, hash };
})(typeof globalThis !== 'undefined' ? globalThis : this);
