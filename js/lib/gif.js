/* ============================================================
 * TreeGraphVis · 极简 GIF89a 编码器（无依赖）
 *   - 全局调色板：6×6×6 色立方（216）+ 40 级灰阶
 *   - 逐帧 LZW（可变码宽 9~12 bit）
 *   - 用法：
 *       const pal = TGV.Gif.palette();                  // 768 字节
 *       const idx = TGV.Gif.quantize(rgba, w, h);       // Uint8Array(w*h)
 *       const bytes = TGV.Gif.encode([idx, idx2], w, h, 12, pal);
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};
  const Gif = {};

  /* ---------- 调色板 ---------- */
  Gif.palette = function () {
    const p = new Uint8Array(768);
    const lv = v => Math.round((v / 5) * 255);
    let i = 0;
    for (let r = 0; r < 6; r++)
      for (let g = 0; g < 6; g++)
        for (let b = 0; b < 6; b++) {
          p[i++] = lv(r); p[i++] = lv(g); p[i++] = lv(b);
        }
    for (let k = 0; k < 40; k++) {           // 40 级灰阶（216..255）
      const v = Math.round((k / 39) * 255);
      p[i++] = v; p[i++] = v; p[i++] = v;
    }
    while (i < 768) { p[i++] = 0; }
    return p;
  };

  const CACHE = new Map();
  function level(v) { return Math.round((v / 255) * 5); }

  Gif.quantize = function (rgba, w, h) {
    const out = new Uint8Array(w * h);
    const n = w * h;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const r = rgba[j], g = rgba[j + 1], b = rgba[j + 2];
      const key = (r << 16) | (g << 8) | b;
      let v = CACHE.get(key);
      if (v === undefined) {
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx - mn < 14) {                  // 近似灰阶走灰色通道
          v = 216 + Math.round(((r + g + b) / 3 / 255) * 39);
        } else {
          v = level(r) * 36 + level(g) * 6 + level(b);
        }
        if (CACHE.size < 200000) CACHE.set(key, v);
      }
      out[i] = v;
    }
    return out;
  };

  /* ---------- LZW ---------- */
  function lzw(indices, minCode) {
    const clear = 1 << minCode, eoi = clear + 1;
    let dict = new Map(), next = eoi + 1, codeSize = minCode + 1;
    const out = [];
    let cur = 0, bits = 0;
    const emit = c => {
      cur |= c << bits; bits += codeSize;
      while (bits >= 8) { out.push(cur & 0xff); cur >>>= 8; bits -= 8; }
    };
    emit(clear);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      const hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      emit(prefix);
      if (next < 4096) {
        dict.set(key, next);
        next++;
        // 解码器比编码器晚一码建表，故码宽在 next > 2^codeSize 时提升
        if (next > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clear);
        dict = new Map(); next = eoi + 1; codeSize = minCode + 1;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (bits > 0) out.push(cur & 0xff);
    return out;
  }

  /* ---------- 组装 GIF ---------- */
  Gif.encode = function (frames, w, h, delayCs, palette) {
    const pal = palette || Gif.palette();
    const b = [];
    const u16 = v => { b.push(v & 0xff, (v >> 8) & 0xff); };
    const str = s => { for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i)); };

    str('GIF89a');
    u16(w); u16(h);
    b.push(0xF7, 0, 0);                       // 全局色表 256 色
    for (let i = 0; i < 768; i++) b.push(pal[i]);
    // Netscape 循环扩展
    b.push(0x21, 0xFF, 0x0B); str('NETSCAPE2.0');
    b.push(0x03, 0x01); u16(0); b.push(0x00);

    frames.forEach(idx => {
      b.push(0x21, 0xF9, 0x04, 0x04);         // 处置方式：保留上一帧
      u16(Math.max(2, delayCs)); b.push(0, 0x00);
      b.push(0x2C); u16(0); u16(0); u16(w); u16(h); b.push(0x00);
      b.push(8);                              // LZW min code size
      const data = lzw(idx, 8);
      for (let i = 0; i < data.length; i += 255) {
        const n = Math.min(255, data.length - i);
        b.push(n);
        for (let k = 0; k < n; k++) b.push(data[i + k]);
      }
      b.push(0x00);
    });
    b.push(0x3B);
    return new Uint8Array(b);
  };

  TGV.Gif = Gif;
})(typeof globalThis !== 'undefined' ? globalThis : this);
