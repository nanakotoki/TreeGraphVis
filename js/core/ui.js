/* ============================================================
 * TreeGraphVis · 工作台控制器
 * ============================================================ */
(function (root) {
  'use strict';
  const TGV = root.TGV = root.TGV || {};
  const $ = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

  const App = root.TGVApp = {
    meta: null, preset: null, players: [], active: 0, theme: 'light',
    customInput: null, compare: false
  };

  /* ---------------- 工具 ---------------- */
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function richText(s) {
    let out = esc(s);
    out = out.replace(/\*\*(.+?)\*\*/g, '<span class="em">$1</span>');
    out = out.replace(/`([^`]+)`/g, '<span class="num">$1</span>');
    return out;
  }

  function download(name, blobOrUrl, isUrl) {
    const a = document.createElement('a');
    a.download = name;
    if (isUrl) a.href = blobOrUrl; else a.href = URL.createObjectURL(blobOrUrl);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { if (!isUrl) URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  /* ---------------- 初始化 ---------------- */
  let inited = false;
  function init() {
    if (inited) return;
    inited = true;
    App.theme = localStorage.getItem('tgv-theme') || 'light';
    App.codeLang = localStorage.getItem('tgv-code-lang') || 'pseudo';
    App.speed = parseFloat(localStorage.getItem('tgv-speed') || '1') || 1;
    document.documentElement.setAttribute('data-theme', App.theme);
    $('#btnTheme').innerHTML = App.theme === 'dark' ? '<span class="ico">◑</span><span>浅色</span>' : '<span class="ico">◐</span><span>深色</span>';

    buildAlgoSelect();

    App.rendererA = new TGV.Renderer($('#stageA'), { theme: App.theme });
    App.panelsA = new TGV.Panels($('#auxPanels'));
    App.playerA = new TGV.Player({
      renderer: App.rendererA,
      panels: App.panelsA,
      onUpdate: (scene, idx, p) => onUpdate(scene, idx, p, 0)
    });
    App.players = [App.playerA];
    App.playerA.setSpeed(App.speed);
    const spSel = $('#speedSelect');
    if (Array.prototype.some.call(spSel.options, o => Number(o.value) === App.speed)) spSel.value = String(App.speed);
    App.rendererA.onRelayout = () => { App.playerA.renderCurrent(false); };

    bindToolbar();
    bindVCR();
    bindEditor();
    bindCodeTabs();

    const hash = (location.hash || '').replace('#', '');
    const initial = TGV.algos[hash] ? hash : 'bst_insert';
    loadAlgorithm(initial);
  }

  function buildAlgoSelect() {
    const sel = $('#algoSelect');
    sel.innerHTML = '';
    const cats = {};
    Object.keys(TGV.algos).forEach(id => {
      const a = TGV.algos[id];
      const cat = a.category || '其他';
      (cats[cat] = cats[cat] || []).push(a);
    });
    Object.keys(cats).forEach(cat => {
      const g = document.createElement('optgroup');
      g.label = cat;
      cats[cat].forEach(a => {
        const o = document.createElement('option');
        o.value = a.id;
        o.textContent = a.name;
        g.appendChild(o);
      });
      sel.appendChild(g);
    });
  }

  /* ---------------- 载入算法 ---------------- */
  function loadAlgorithm(id, presetId, customInput) {
    const meta = TGV.algos[id];
    if (!meta) return;
    App.meta = meta;
    App.customInput = customInput || null;
    clearScale();
    location.hash = id;

    const psel = $('#presetSelect');
    psel.innerHTML = '';
    (meta.presets || []).forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.label;
      psel.appendChild(o);
    });
    psel.disabled = (meta.presets || []).length <= 1 || !!customInput;
    const preset = (meta.presets || []).find(p => p.id === presetId) || (meta.presets || [])[0];
    App.preset = preset;
    if (preset) psel.value = preset.id;
    psel.title = preset && preset.desc ? preset.desc : '';

    $('#algoSelect').value = id;
    runCurrent();
    syncScaleInput();
  }

  function runCurrent() {
    const meta = App.meta;
    const input = App.customInput || App.scaleInput || (App.preset && App.preset.data ? App.preset.data() : {});
    App.currentInput = input;
    let data;
    try {
      data = meta.run(input || {});
    } catch (err) {
      console.error(err);
      alert('算法运行出错：' + err.message);
      return;
    }
    data.directed = data.directed !== undefined ? data.directed : meta.directed;
    const norm = TGV.normalize(meta, data);
    App.data = norm;

    App.playerA.layoutOverride = $('#layoutSelect').value || '';
    App.playerA.load(meta, norm);
    renderPseudo(meta, norm);
    renderMilestones(App.playerA);
    $('#auxSub').textContent = (meta.panels || []).map(p => p.title).join(' · ');
    if ((App.codeLang || 'pseudo') === 'pseudo') {
      $('#codeSub').textContent = '教学伪代码 · ' + (meta.pseudocode || []).length + ' 行 / ' + norm.frames.length + ' 步';
    }
    if (App.compare) loadCompareB(meta.compareWith || pickCompareDefault(meta.id));
    App.playerA.renderCurrent(false);
  }

  function pickCompareDefault(excludeId) {
    const order = ['dijkstra', 'prim', 'kruskal', 'avl_insert', 'rbt_insert', 'ek_maxflow', 'dinic', 'bfs', 'dfs_classify', 'bellman_ford', 'floyd'];
    for (const id of order) if (id !== excludeId && TGV.algos[id]) return id;
    const keys = Object.keys(TGV.algos).filter(k => k !== excludeId);
    return keys[0];
  }

  /* ---------------- 伪代码 / 三语言实现 ---------------- */
  const LANG_LABEL = { pseudo: '教学伪代码', cpp: 'C++ 实现', py: 'Python 实现', java: 'Java 实现' };

  function renderPseudo(meta, data) {
    renderCodePane();
  }

  function renderCodePane() {
    const host = $('#pseudo');
    if (!host || !App.meta) return;
    const lang = App.codeLang || 'pseudo';
    host.innerHTML = '';
    App.pseudoLines = null;
    if (lang === 'pseudo') {
      const lines = App.meta.pseudocode || [];
      lines.forEach((raw, i) => {
        const d = document.createElement('div');
        d.className = 'pl';
        d.dataset.line = i + 1;
        const ln = document.createElement('span');
        ln.className = 'ln';
        ln.textContent = i + 1;
        const code = document.createElement('span');
        code.className = 'code';
        code.innerHTML = highlightCode(raw);
        d.appendChild(ln); d.appendChild(code);
        host.appendChild(d);
      });
      App.pseudoLines = host.children;
      $('#codeSub').textContent = '教学伪代码 · ' + lines.length + ' 行';
      return;
    }
    const sol = (TGV.solutions || {})[App.meta.id];
    const src = sol && sol[lang];
    if (!src) {
      host.innerHTML = '<div class="code-missing">该算法暂未提供 ' + LANG_LABEL[lang] + '，可切回「伪代码」。</div>';
      $('#codeSub').textContent = LANG_LABEL[lang];
      return;
    }
    const pre = document.createElement('pre');
    pre.className = 'code-src';
    pre.innerHTML = highlightReal(src, lang);
    host.appendChild(pre);
    $('#codeSub').textContent = LANG_LABEL[lang] + ' · ' + src.split('\n').length + ' 行';
  }

  const KW_SETS = {
    cpp: new Set(('auto bool break case char class const constexpr continue default delete do double else enum explicit ' +
      'false float for friend if inline int long namespace new nullptr operator private protected public return short ' +
      'signed sizeof static struct switch template this throw true try typedef typename unsigned using virtual void while ' +
      'vector string queue stack deque priority_queue pair map set unordered_map array function min max swap sort reverse ' +
      'push_back pop_back push push_back size empty begin end').split(' ')),
    py: new Set(('and as assert async await break class continue def del elif else except False finally for from global if ' +
      'import in is lambda None nonlocal not or pass raise return True try while with yield self len range min max sum abs ' +
      'sorted enumerate zip set list dict tuple heapq deque defaultdict').split(' ')),
    java: new Set(('abstract boolean break case catch class continue default do double else enum extends false final finally ' +
      'for if implements import int interface long new null package private protected public return short static super switch ' +
      'this throw throws true try void while var record List ArrayList Map HashMap Set HashSet Deque ArrayDeque Queue ' +
      'PriorityQueue Arrays Collections Math String Integer Long System').split(' '))
  };

  function highlightReal(src, lang) {
    const kw = KW_SETS[lang] || KW_SETS.cpp;
    const re = lang === 'py'
      ? /(#[^\n]*)|("""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g
      : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="tk-cm">' + esc(m[0]) + '</span>';
      else if (m[2]) out += '<span class="tk-str">' + esc(m[0]) + '</span>';
      else if (m[3]) out += '<span class="tk-num">' + esc(m[0]) + '</span>';
      else if (kw.has(m[4])) out += '<span class="tk-kw">' + esc(m[0]) + '</span>';
      else out += esc(m[0]);
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out;
  }

  const KW = /\b(for|each|if|else|while|return|function|end|then|do|repeat|until|break|continue|and|or|not)\b/g;
  function highlightCode(s) {
    let out = esc(s);
    if (/^\s*\/\//.test(s)) return '<span class="tk-cm">' + out + '</span>';
    out = out.replace(KW, '<span class="tk-kw">$1</span>');
    out = out.replace(/\b(\d+)\b/g, '<span class="tk-num">$1</span>');
    return out;
  }

  /* ---------------- 里程碑 ---------------- */
  function renderMilestones(player) {
    const host = $('#milestones');
    host.innerHTML = '';
    const total = Math.max(1, player.stops.length - 1);
    player.milestones().forEach(m => {
      const pos = player.stops.indexOf(m.frame);
      if (pos < 0) {
        // 宏观模式下里程碑可能不在停靠点中
        const dot = document.createElement('div');
        dot.className = 'ms';
        dot.style.left = (m.frame / Math.max(1, player.frames.length - 1) * 100) + '%';
        dot.title = m.label;
        dot.addEventListener('click', () => player.seekFrame(m.frame));
        host.appendChild(dot);
        return;
      }
      const dot = document.createElement('div');
      dot.className = 'ms';
      dot.style.left = (pos / total * 100) + '%';
      dot.title = m.label;
      dot.addEventListener('click', () => player.seekFrame(m.frame));
      host.appendChild(dot);
    });
  }

  /* ---------------- 帧回调 ---------------- */
  function onUpdate(scene, idx, player, which) {
    if (which === 0) {
      const frame = player.frames[idx] || {};
      const badge = $('#stepBadge');
      badge.textContent = (player.pos + 1) + ' / ' + player.stops.length;
      $('#narration').innerHTML = richText(scene.narration || '');
      const vars = $('#narrVars');
      vars.innerHTML = '';
      (frame.vars || []).forEach(v => {
        const s = document.createElement('span');
        s.className = 'iv';
        s.innerHTML = '<b>' + esc(v.name) + '</b> = ' + esc(v.value);
        vars.appendChild(s);
      });
      $('#milestoneTag').textContent = scene.milestone ? '◈ ' + scene.milestone : '';

      // 伪代码高亮
      const line = frame.codeLine;
      if (App.pseudoLines) {
        Array.prototype.forEach.call(App.pseudoLines, el => {
          el.classList.remove('active');
          delete el.dataset.hint;
        });
        if (line && App.pseudoLines[line - 1]) {
          const el = App.pseudoLines[line - 1];
          el.classList.add('active');
          // 行内变量气泡（规范 §2.3）：在代码行右侧展示当前实参
          if ((frame.vars || []).length) {
            el.dataset.hint = frame.vars.map(v => v.name + ' = ' + v.value).join(' · ');
          }
          const box = $('#codeBody');
          const rt = el.offsetTop;
          if (rt < box.scrollTop + 20 || rt > box.scrollTop + box.clientHeight - 30) {
            box.scrollTop = Math.max(0, rt - box.clientHeight / 2);
          }
        }
      }

      // 场景备注
      const note = $('#sceneNote');
      if (scene.note && scene.note.text) {
        note.textContent = scene.note.text;
        note.dataset.tone = scene.note.tone || 'info';
        note.classList.add('show');
      } else {
        note.classList.remove('show');
      }

      // 进度条
      const scr = $('#scrubber');
      scr.max = String(Math.max(0, player.stops.length - 1));
      scr.value = String(player.pos);
      const pct = player.stops.length > 1 ? (player.pos / (player.stops.length - 1) * 100) : 0;
      scr.style.setProperty('--p', pct + '%');
      $('#btnPlay').textContent = player.playing ? '❚❚' : '▶';
    } else {
      const frame = player.frames[idx] || {};
      $('#cmpNarrB').innerHTML = richText(scene.narration || '');
    }
  }

  /* ---------------- 规模控制（自定义结点数） ---------------- */
  function clearScale() {
    App.scaleInput = null;
    App.scaleN = 0;
    App.scaleKind = '';
    $$('#presetSelect option[data-scale]').forEach(o => o.remove());
  }

  function syncScaleInput() {
    const n = App.data && App.data.nodes ? App.data.nodes.length : 0;
    if (!n) return;
    const lim = TGV.Scale.limitsFor(App.meta.id);
    const inp = $('#scaleInput');
    inp.value = n;
    inp.max = String(lim.max);
    inp.title = '当前 ' + n + ' 个结点；可输入 ' + lim.min + '–' + lim.max + '，超出会自动调整到最近可行值';
  }

  function applyScale() {
    const meta = App.meta;
    if (!meta) return;
    const raw = String($('#scaleInput').value).trim();
    const num = Number(raw);
    if (!raw || !isFinite(num)) {
      toast('请输入一个数字作为结点数');
      syncScaleInput();
      return;
    }
    let n = Math.round(num);
    if (n < 2) {
      toast('结点数至少为 2（当前输入 ' + n + '）');
      syncScaleInput();
      return;
    }
    const lim = TGV.Scale.limitsFor(meta.id);
    const notes = [];
    if (n < lim.min) {
      notes.push('少于 ' + lim.min + ' 个结点演示不出结构变化，已取 ' + lim.min);
      n = lim.min;
    }
    if (n > lim.max) {
      notes.push(lim.reason + '上限为 ' + lim.max + '，已取 ' + lim.max);
      n = lim.max;
    }
    let res = null;
    try { res = TGV.Scale.build(meta, n); } catch (e) { console.error(e); }
    if (!res) {
      toast('「' + meta.name + '」使用内置教学用例（固定树 / 图或特定 Case），暂不支持自定义结点数');
      syncScaleInput();
      return;
    }
    if (res.n !== n) {
      notes.push('为控制演示帧数，最终取 ' + res.n + ' 个结点（' + res.frames + ' 帧）');
    }
    App.customInput = null;
    App.scaleInput = res.input;
    App.scaleN = res.n;
    App.scaleKind = res.kind;
    runCurrent();
    const psel = $('#presetSelect');
    $$('#presetSelect option[data-scale]').forEach(o => o.remove());
    const o = document.createElement('option');
    o.dataset.scale = '1';
    o.value = '__scale__';
    o.textContent = '随机规模 · ' + res.n + ' 结点';
    psel.appendChild(o);
    psel.value = '__scale__';
    psel.disabled = false;
    psel.title = '随机生成的 ' + res.n + ' 个结点（' + TGV.Scale.KIND_LABEL[res.kind] + '）';
    syncScaleInput();
    const actual = (App.data && App.data.nodes) ? App.data.nodes.length : 0;
    const label = TGV.Scale.KIND_LABEL[res.kind] || '专用数据';
    if (actual && actual !== res.n) {
      toast((notes.length ? notes.join('；') + '；' : '') +
        '已生成规模 ' + res.n + '（' + label + '）→ 实际 ' + actual + ' 个结点，' + res.frames + ' 帧');
    } else {
      toast(notes.length
        ? notes.join('；')
        : '已生成 ' + res.n + ' 个结点（' + label + '，' + res.frames + ' 帧）');
    }
  }

  /* ---------------- 伪代码 / 语言标签 ---------------- */
  function bindCodeTabs() {
    const sync = () => {
      $$('#codeTabs button').forEach(b => b.classList.toggle('active', b.dataset.lang === (App.codeLang || 'pseudo')));
    };
    sync();
    $('#codeTabs').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      App.codeLang = btn.dataset.lang;
      localStorage.setItem('tgv-code-lang', App.codeLang);
      sync();
      renderCodePane();
    });
  }

  /* ---------------- 工具栏 ---------------- */
  function bindToolbar() {
    $('#algoSelect').addEventListener('change', e => loadAlgorithm(e.target.value));
    $('#presetSelect').addEventListener('change', e => {
      const p = (App.meta.presets || []).find(x => x.id === e.target.value);
      if (!p) return;                       // “随机规模”占位项
      clearScale();
      App.preset = p;
      App.customInput = null;
      runCurrent();
      syncScaleInput();
      $('#presetSelect').title = p && p.desc ? p.desc : '';
    });

    $('#btnTheme').addEventListener('click', () => {
      App.theme = App.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', App.theme);
      localStorage.setItem('tgv-theme', App.theme);
      $('#btnTheme').innerHTML = App.theme === 'dark' ? '<span class="ico">◑</span><span>浅色</span>' : '<span class="ico">◐</span><span>深色</span>';
      App.players.forEach(p => p.renderer.setTheme(App.theme));
      $$('.dsu-svg').forEach(s => s.classList.toggle('dark', App.theme === 'dark'));
    });

    $('#btnZoomIn').addEventListener('click', () => App.rendererA.zoomBy(1.18));
    $('#btnZoomOut').addEventListener('click', () => App.rendererA.zoomBy(1 / 1.18));
    $('#btnFit').addEventListener('click', () => App.rendererA.autofit());
    $('#btnRelayout').addEventListener('click', () => {
      App.players.forEach(p => { p.renderer.manual = {}; p.renderCurrent(false); });
    });

    // NIL 哨兵显隐（红黑树等扩展二叉树视图）
    TGV.showNil = localStorage.getItem('tgv-nil') !== '0';
    const syncNilBtn = () => {
      const b = $('#btnNil');
      b.style.opacity = TGV.showNil ? '1' : '0.4';
      b.title = TGV.showNil ? 'NIL 哨兵当前显示（点击隐藏）' : 'NIL 哨兵当前隐藏（点击显示）';
    };
    syncNilBtn();
    $('#btnNil').addEventListener('click', () => {
      TGV.showNil = !TGV.showNil;
      localStorage.setItem('tgv-nil', TGV.showNil ? '1' : '0');
      syncNilBtn();
      App.players.forEach(p => p.renderCurrent(false));
      toast(TGV.showNil ? '已显示 NIL 哨兵' : '已隐藏 NIL 哨兵');
    });

    // 残量网络视图（网络流算法）
    TGV.showResidual = false;
    const syncResidBtn = () => {
      const b = $('#btnResid');
      b.style.opacity = TGV.showResidual ? '1' : '0.4';
      App.players.forEach(p => { if (p.renderer) p.renderer.residual = TGV.showResidual; });
    };
    syncResidBtn();
    $('#btnResid').addEventListener('click', () => {
      TGV.showResidual = !TGV.showResidual;
      syncResidBtn();
      App.players.forEach(p => p.renderCurrent(false));
      toast(TGV.showResidual
        ? '残量视图：青色实线 = 正向剩余容量 c−f，橙色虚线 = 可退回的流量 f'
        : '已恢复 flow / cap 视图');
    });
    $('#layoutSelect').addEventListener('change', e => {
      App.players.forEach(p => { p.layoutOverride = e.target.value; p.buildBase(); p.renderCurrent(false); });
    });

    // 导出
    const exportMenu = $('#exportMenu');
    $('#btnExport').addEventListener('click', e => { e.stopPropagation(); exportMenu.classList.toggle('open'); });
    document.addEventListener('click', () => exportMenu.classList.remove('open'));
    exportMenu.addEventListener('click', e => {
      const act = e.target.dataset.act;
      if (!act) return;
      exportMenu.classList.remove('open');
      if (act === 'svg') exportSVG();
      if (act === 'png') exportPNG();
      if (act === 'video') exportVideo('webm');
      if (act === 'mp4') exportVideo('mp4');
      if (act === 'gif') exportGif();
      if (act === 'copy') {
        const text = App.playerA.scene ? App.playerA.scene.narration : '';
        navigator.clipboard.writeText(text).then(() => toast('当前帧解说已复制到剪贴板'));
      }
    });

    $('#btnCompare').addEventListener('click', toggleCompare);
    $('#btnEditor').addEventListener('click', openEditor);
    $('#btnScale').addEventListener('click', applyScale);
    $('#scaleInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); applyScale(); }
    });
  }

  App.exportVideo = exportVideo;
  App.exportGif = exportGif;
  TGV.App = App;

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#0F172A;color:#fff;padding:8px 16px;border-radius:9px;font-size:12px;z-index:200;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  /* ---------------- 导出 ---------------- */
  function exportSVG() {
    const str = App.playerA.renderer.exportSVG(true);
    const name = (App.meta.id || 'graph') + '-step' + App.playerA.pos + '.svg';
    download(name, new Blob([str], { type: 'image/svg+xml;charset=utf-8' }));
    toast('已导出矢量 SVG');
  }

  function exportPNG() {
    const str = App.playerA.renderer.exportSVG(true);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const W = 3840, H = Math.round(W * img.height / img.width);
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      cv.toBlob(b => {
        download((App.meta.id || 'graph') + '-4k.png', b);
        toast('已导出 4K 透明 PNG');
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => toast('PNG 导出失败，请改用 SVG');
    img.src = url;
  }
  /* ---------------- 视频导出：逐帧栅格化 → MediaRecorder 录 WebM ---------------- */
  function svgToImage(str) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG 栅格化失败')); };
      img.src = url;
    });
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function exportVideo(kind) {
    kind = kind || 'webm';
    const P = App.playerA;
    if (!P || !P.stops || !P.stops.length) { toast('没有可导出的帧'); return; }
    if (typeof MediaRecorder === 'undefined') { toast('当前浏览器不支持 MediaRecorder，请用 Chrome / Edge'); return; }
    const types = kind === 'mp4'
      ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    let mime = types.find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      if (kind === 'mp4') {
        toast('当前浏览器不支持 MP4 录制（需 Chrome 126+ 且平台支持 H.264），已改用 WebM');
        return exportVideo('webm');
      }
      toast('当前浏览器不支持 WebM 录制'); return;
    }
    const ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';

    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg = dark ? '#0B1220' : '#F8FAFC';
    const W = 1600;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = 900;
    const ctx = cv.getContext('2d');

    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#0F172A;color:#fff;padding:9px 18px;border-radius:9px;font-size:12px;z-index:300;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)';
    tip.textContent = '正在录制…';
    document.body.appendChild(tip);

    const stream = cv.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    rec.start(200);

    const origPos = P.pos;
    P.pause();
    const total = P.stops.length;
    // 总时长控制在 ~45s 以内，单帧不短于 160ms
    const per = Math.max(160, Math.min(900, 45000 / total));
    try {
      for (let i = 0; i < total; i++) {
        P.go(i, false);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const svg = P.renderer.exportSVG(true);
        const img = await svgToImage(svg);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, cv.width, cv.height);
        // 等比缩放并居中，不改变 canvas 尺寸（尺寸变化会让录制流重置）
        const k = Math.min(cv.width / img.width, cv.height / img.height);
        const dw = img.width * k, dh = img.height * k;
        ctx.drawImage(img, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
        track.requestFrame();
        if (i % 4 === 0) tip.textContent = '正在录制…  ' + (i + 1) + ' / ' + total + ' 帧';
        await sleep(per);
      }
    } catch (err) {
      tip.textContent = '录制失败：' + err.message;
      rec.stop();
      await stopped;
      setTimeout(() => tip.remove(), 2200);
      return;
    }
    await sleep(320);      // 让最后一帧进入编码器
    rec.stop();
    await stopped;
    P.go(origPos, false);
    tip.remove();
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    if (!blob.size) { toast('录制为空，请重试'); return; }
    download((App.meta.id || 'graph') + '-demo.' + ext, blob);
    toast('已导出 ' + ext.toUpperCase() + '（' + (blob.size / 1048576).toFixed(1) + ' MB）');
    return blob;
  }

  /* ---------------- GIF 动图导出 ---------------- */
  async function exportGif() {
    const P = App.playerA;
    if (!P || !P.stops || !P.stops.length) { toast('没有可导出的帧'); return; }
    if (!TGV.Gif) { toast('GIF 编码器未加载'); return; }
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg = dark ? '#0B1220' : '#F8FAFC';
    const total = P.stops.length;
    const stride = Math.max(1, Math.ceil(total / 48));      // 最多 48 帧，控制体积
    const picks = [];
    for (let i = 0; i < total; i += stride) picks.push(i);
    if (picks[picks.length - 1] !== total - 1) picks.push(total - 1);

    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#0F172A;color:#fff;padding:9px 18px;border-radius:9px;font-size:12px;z-index:300;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)';
    tip.textContent = '正在生成 GIF…';
    document.body.appendChild(tip);

    const origPos = P.pos;
    P.pause();
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    const W = 720;
    const frames = [];
    try {
      for (let k = 0; k < picks.length; k++) {
        P.go(picks[k], false);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const img = await svgToImage(P.renderer.exportSVG(true));
        if (!cv.width || k === 0) {
          cv.width = W;
          cv.height = Math.max(2, Math.round(W * img.height / img.width));
        }
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        frames.push(TGV.Gif.quantize(ctx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height));
        tip.textContent = '正在生成 GIF…  ' + (k + 1) + ' / ' + picks.length + ' 帧';
        await sleep(0);
      }
      const bytes = TGV.Gif.encode(frames, cv.width, cv.height, 8);   // 80ms/帧
      P.go(origPos, false);
      tip.remove();
      const blob = new Blob([bytes], { type: 'image/gif' });
      download((App.meta.id || 'graph') + '-demo.gif', blob);
      toast('已导出 GIF（' + frames.length + ' 帧，' + (blob.size / 1024).toFixed(0) + ' KB）');
      return blob;
    } catch (err) {
      P.go(origPos, false);
      tip.textContent = 'GIF 生成失败：' + err.message;
      setTimeout(() => tip.remove(), 2400);
      return null;
    }
  }


  /* ---------------- 对比模式 ---------------- */
  function toggleCompare() {
    App.compare = !App.compare;
    $('#btnCompare').classList.toggle('active', App.compare);
    $('#stageB').classList.toggle('hidden', !App.compare);
    $('#compareHead').classList.toggle('hidden', !App.compare);
    if (App.compare) {
      if (!App.rendererB) {
        App.rendererB = new TGV.Renderer($('#stageB'), { theme: App.theme });
        App.rendererB.residual = !!TGV.showResidual;
        App.playerB = new TGV.Player({
          renderer: App.rendererB,
          panels: null,
          onUpdate: (scene, idx, p) => onUpdate(scene, idx, p, 1)
        });
        App.players = [App.playerA, App.playerB];
        App.rendererB.onRelayout = () => App.playerB.renderCurrent(false);
      }
      loadCompareB(App.meta.compareWith || pickCompareDefault(App.meta.id));
    } else {
      App.players = [App.playerA];
      App.playerA.renderer.autofit();
    }
  }

  function loadCompareB(id) {
    if (!App.compare || !TGV.algos[id]) return;
    App.compareId = id;
    const metaB = TGV.algos[id];
    $('#cmpNameA').textContent = App.meta.name;
    $('#cmpNameB').textContent = metaB.name;
    const preset = (metaB.presets || [])[0];
    const own = preset && preset.data ? preset.data() : {};
    const clone = o => { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } };
    const runWith = (inp) => {
      const d = metaB.run(clone(inp || {}));
      d.directed = d.directed !== undefined ? d.directed : metaB.directed;
      return TGV.normalize(metaB, d);
    };
    // 规范 §5.3：对比模式应在**完全相同**的初始数据上步进；
    // 若 B 不接受 A 的输入结构，才回退到 B 自己的首个预设。
    let norm = null, sameInput = false;
    if (App.currentInput) {
      try { norm = runWith(App.currentInput); sameInput = true; } catch (e) { norm = null; }
    }
    if (!norm) {
      try { norm = runWith(own); } catch (e) { console.warn(e); return; }
    }
    $('#cmpNameB').textContent = metaB.name + (sameInput ? ' · 同一输入' : ' · 内置预设');
    $('#cmpNameB').title = sameInput ? '与左侧使用同一份初始数据' : '该算法输入结构不同，使用其内置教学预设';
    App.playerB.layoutOverride = $('#layoutSelect').value || '';
    App.playerB.load(metaB, norm);
    syncCompare();
  }

  function syncCompare() {
    if (!App.compare || !App.playerB) return;
    const A = App.playerA, B = App.playerB;
    const ratio = A.stops.length > 1 ? A.pos / (A.stops.length - 1) : 0;
    const target = Math.round(ratio * (B.stops.length - 1));
    if (B.pos !== target) B.go(target, false);
    onUpdate(B.scene, B.index, B, 1);
  }

  /* ---------------- VCR ---------------- */
  function bindVCR() {
    const A = () => App.playerA;
    $('#btnFirst').addEventListener('click', () => { A().first(); syncCompare(); });
    $('#btnPrev').addEventListener('click', () => { A().prev(); syncCompare(); });
    $('#btnNext').addEventListener('click', () => { A().next(); syncCompare(); });
    $('#btnLast').addEventListener('click', () => { A().last(); syncCompare(); });
    $('#btnPlay').addEventListener('click', () => {
      A().toggle();
      $('#btnPlay').textContent = A().playing ? '❚❚' : '▶';
      if (A().playing) driveCompare();
    });
    $('#scrubber').addEventListener('input', e => { A().pause(); A().go(+e.target.value); syncCompare(); });
    $('#speedSelect').addEventListener('change', e => {
      const s = parseFloat(e.target.value);
      App.speed = s;
      localStorage.setItem('tgv-speed', String(s));
      App.players.forEach(p => p.setSpeed(s));
      toast('播放速度 ' + s + 'x');
    });
    $('#modeSeg').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      $$('#modeSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.players.forEach(p => p.setMode(btn.dataset.mode));
      renderMilestones(App.playerA);
    });

    document.addEventListener('keydown', e => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); $('#btnPlay').click(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); A().next(); syncCompare(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); A().prev(); syncCompare(); }
      else if (e.key === 'Home') { A().first(); syncCompare(); }
      else if (e.key === 'End') { A().last(); syncCompare(); }
      else if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const opts = Array.from($('#speedSelect').options).map(o => Number(o.value));
        const cur = opts.indexOf(App.speed);
        const idx = Math.max(0, Math.min(opts.length - 1, (cur < 0 ? opts.indexOf(1) : cur) + (e.key === ']' ? 1 : -1)));
        $('#speedSelect').value = String(opts[idx]);
        $('#speedSelect').dispatchEvent(new Event('change'));
      }
    });

    setInterval(() => {
      if (App.compare && App.playerA.playing) syncCompare();
    }, 120);
  }

  function driveCompare() { /* 由 setInterval 同步 */ }

  /* ---------------- 建图 / 导入 ---------------- */
  let editGraph = null, editRenderer = null, editPick = null;

  function bindEditor() {
    $('#btnEditor').addEventListener('click', openEditor);
    $('#editorClose').addEventListener('click', () => $('#editorMask').classList.add('hidden'));
    $('#editorMask').addEventListener('click', e => { if (e.target.id === 'editorMask') $('#editorMask').classList.add('hidden'); });
    $('#ioParse').addEventListener('click', () => {
      try {
        const g = parseGraph($('#ioText').value, {
          directed: $('#ioDirected').checked,
          weighted: $('#ioWeighted').checked,
          zeroBased: $('#ioZeroBased').checked
        });
        editGraph = g;
        $('#ioMsg').className = 'io-msg ok';
        $('#ioMsg').textContent = g.treeArray
          ? `解析成功：层序树 ${g.nodes.length} 个结点 / ${g.edges.length} 条父子边。右侧为预览。`
          : `解析成功：${g.nodes.length} 个节点，${g.edges.length} 条边。右侧为预览。`;
        previewGraph(g);
      } catch (err) {
        $('#ioMsg').className = 'io-msg err';
        $('#ioMsg').textContent = '解析失败：' + err.message;
      }
    });
    $('#ioApply').addEventListener('click', () => {
      if (!editGraph) { $('#ioParse').click(); }
      if (!editGraph) return;
      applyCustomGraph(editGraph);
    });
    $('#editClear').addEventListener('click', () => {
      editGraph = { directed: $('#ioDirected').checked, nodes: [], edges: [], start: null };
      previewGraph(editGraph);
    });
    $('#editUse').addEventListener('click', () => { if (editGraph) applyCustomGraph(editGraph); });
    // 有向 / 无向即时切换（直接影响预览与后续运行）
    $('#ioDirected').addEventListener('change', e => {
      if (!editGraph) return;
      editGraph.directed = e.target.checked;
      previewGraph(editGraph);
    });
  }

  function openEditor() {
    $('#editorMask').classList.remove('hidden');
    if (!editRenderer) {
      editRenderer = new TGV.Renderer($('#editorStage'), { theme: App.theme });
      editRenderer.onNodeClick = (id) => {
        if (!editGraph) return;
        if (editPick === null) { editPick = id; toast('已选择 ' + id + '，再点击一个节点完成连边'); return; }
        if (editPick === id) { editPick = null; return; }
        let w = 1;
        if ($('#ioWeighted').checked) {
          const s = prompt(`边 ${editPick} → ${id} 的权重：`, '1');
          if (s === null) { editPick = null; return; }
          w = Number(s) || 1;
        }
        editGraph.edges.push({
          id: 'e' + (editGraph.edges.length + 1) + '_' + Date.now().toString(36),
          source: editPick, target: id, weight: w, label: ''
        });
        editPick = null;
        previewGraph(editGraph);
      };
      editRenderer.onBlankDblClick = (pt) => {
        if (!editGraph) editGraph = { directed: true, nodes: [], edges: [], start: null };
        let n = editGraph.nodes.length + 1;
        let id = String(n);
        while (editGraph.nodes.some(x => x.id === id)) { n++; id = String(n); }
        editGraph.nodes.push({ id, label: id, x: pt.x, y: pt.y });
        previewGraph(editGraph);
      };
      editRenderer.onNodeContext = (id) => {
        if (!editGraph) return;
        editGraph.nodes = editGraph.nodes.filter(n => n.id !== id);
        editGraph.edges = editGraph.edges.filter(e => e.source !== id && e.target !== id);
        previewGraph(editGraph);
      };
      editRenderer.onEdgeContext = (eid) => {
        if (!editGraph) return;
        editGraph.edges = editGraph.edges.filter(e => e.id !== eid);
        previewGraph(editGraph);
      };
      // 双击边 → 修改权重（规范 §5.2）
      editRenderer.onEdgeDblClick = (eid) => {
        if (!editGraph) return;
        const e = editGraph.edges.find(x => x.id === eid);
        if (!e) return;
        const s = prompt('边 ' + e.source + (editGraph.directed ? ' → ' : ' — ') + e.target + ' 的权重：', String(e.weight == null ? 1 : e.weight));
        if (s === null) return;
        const w = Number(s);
        if (!isFinite(w)) { toast('权重必须是数字'); return; }
        e.weight = w;
        previewGraph(editGraph);
      };
      editGraph = { directed: true, nodes: [], edges: [], start: null };
      previewGraph(editGraph);
    }
    if (editGraph) previewGraph(editGraph);
  }

  function previewGraph(g) {
    if (!editRenderer) return;
    const def = {
      id: 'editor', directed: g.directed,
      nodes: g.nodes.map(n => ({ id: n.id, label: n.label || n.id })),
      edges: g.edges.map(e => ({ id: e.id, source: e.source, target: e.target, weight: e.weight })),
      panels: []
    };
    editRenderer.setDef(def, false);
    // 手绘节点带真实坐标 → fixed；导入的图/树无坐标 → 力导向 / 紧凑树
    const hasCoords = g.nodes.some(n => n.x || n.y);
    const kind = g.treeArray ? 'tree' : (hasCoords ? 'fixed' : 'force');
    const res = TGV.Layouts.compute(kind, g.nodes, def.edges, {
      width: 700, height: 460, seed: 7, childOrder: 'none'
    });
    const scene = {
      nodes: {}, edges: {}, arcs: {}, hulls: {}, cuts: {},
      narration: '', codeLine: null, vars: []
    };
    g.nodes.forEach(n => {
      scene.nodes[n.id] = { id: n.id, label: n.label, state: n.state || 'default', badges: {}, slots: null, hidden: false, dbl: false };
    });
    g.edges.forEach(e => { scene.edges[e.id] = { id: e.id, state: e.state || 'default', label: '', hidden: false, color: null, dashed: false }; });
    editRenderer.W = 700; editRenderer.H = 460;
    editRenderer.svg.setAttribute('viewBox', '0 0 700 460');
    editRenderer.render(scene, {});
    editRenderer.setPositions(res.pos, false);
  }

  /* LeetCode 风格层序数组：[1,2,3,null,4] → 树（null 槽位跳过，孩子按队列顺序挂接） */
  function parseTreeArray(text, opts) {
    const body = String(text).trim().replace(/^\[/, '').replace(/\]$/, '');
    const toks = body.split(',').map(s => s.trim()).filter(s => s.length);
    if (!toks.length) throw new Error('树数组为空');
    const isNull = t => /^(null|nil|none|#|·)$/i.test(t);
    const norm = t => {
      const s = t.replace(/^["']|["']$/g, '');
      return /^-?\d+$/.test(s) ? Number(s) : s;
    };
    const vals = toks.map(t => (isNull(t) ? null : norm(t)));
    if (vals[0] === null) throw new Error('根结点不能为空');
    const nodes = [], edges = [], pairs = [];
    const nid = i => 'v' + i;
    nodes.push({ id: nid(0), label: String(vals[0]) });
    let p = 1;
    const queue = [0];
    while (queue.length && p < vals.length) {
      const i = queue.shift();
      for (let k = 0; k < 2 && p < vals.length; k++, p++) {
        if (vals[p] === null) continue;
        nodes.push({ id: nid(p), label: String(vals[p]) });
        edges.push({ id: nid(i) + '>' + nid(p), source: nid(i), target: nid(p), weight: null });
        pairs.push([vals[i], vals[p]]);
        queue.push(p);
      }
    }
    return {
      treeArray: true, directed: true, weighted: false,
      nodes, edges, pairs, start: vals[0], n: nodes.length, m: edges.length,
      directedOpt: opts.directed
    };
  }

  function parseGraph(text, opts) {
    const raw = String(text).trim();
    if (raw.charAt(0) === '[') return parseTreeArray(raw, opts);
    const lines = raw.replace(/\r/g, '').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#') && !s.startsWith('//'));
    if (!lines.length) throw new Error('内容为空');
    let n = 0, m = null, start = 0;
    const head = lines[0].split(/[\s,]+/).filter(Boolean);
    if (head.length >= 2 && head.slice(0, 2).every(t => /^\d+$/.test(t)) && lines.length - 1 >= Number(head[1])) {
      n = Number(head[0]); m = Number(head[1]);
      start = 1;
    }
    const nodes = [];
    const seen = {};
    const edges = [];
    const rows = lines.slice(start, m != null ? start + m : lines.length);
    if (n) {
      for (let i = 0; i < n; i++) {
        const id = String(i + (opts.zeroBased ? 0 : 1));
        nodes.push({ id, label: id });
        seen[id] = true;
      }
    }
    rows.forEach((line, idx) => {
      const t = line.split(/[\s,]+/).filter(Boolean);
      if (t.length < 2) return;
      const u = t[0], v = t[1];
      const w = t.length > 2 ? Number(t[2]) : 1;
      if (!opts.weighted) { /* 仍保留默认 1 */ }
      [u, v].forEach(id => { if (!seen[id]) { seen[id] = true; nodes.push({ id, label: id }); } });
      edges.push({ id: 'e' + (idx + 1), source: u, target: v, weight: isFinite(w) ? w : 1 });
      if (!opts.directed) edges.push({ id: 'r' + (idx + 1), source: v, target: u, weight: isFinite(w) ? w : 1 });
    });
    if (!nodes.length) throw new Error('未识别到节点');
    return { directed: opts.directed, nodes, edges, start: nodes[0].id, n, m };
  }

  const cloneInput = o => { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } };

  function markCustomPreset() {
    const psel = $('#presetSelect');
    psel.innerHTML = '<option>自定义导入数据</option>';
    psel.disabled = true;
    psel.title = '当前运行的是导入的自定义数据，切换算法可恢复内置预设';
  }

  function applyCustomGraph(g) {
    const meta = App.meta;
    const clone = cloneInput;
    if (meta.acceptsGraph) {
      $('#editorMask').classList.add('hidden');
      App.customInput = g;
      App.preset = null;
      markCustomPreset();
      runCurrent();
      toast('已载入自定义图：' + g.nodes.length + ' 点 / ' + g.edges.length + ' 边');
      return;
    }
    // 树算法：把 [[父, 子], ...] 试喂给当前算法的 run()
    if (g.treeArray && g.pairs && g.pairs.length) {
      const vals = [], kids = new Set();
      g.pairs.forEach(([p, c]) => {
        if (vals.indexOf(p) < 0) vals.push(p);
        if (vals.indexOf(c) < 0) vals.push(c);
        kids.add(c);
      });
      const leaves = vals.filter(v => !kids.has(v));
      const uA = leaves.length ? leaves[0] : vals[0];
      const vA = leaves.length > 1 ? leaves[leaves.length - 1] : vals[vals.length - 1];
      const tries = [
        { edges: g.pairs, start: g.start, u: uA, v: vA },
        { edges: g.pairs, start: g.start },
        { edges: g.pairs, u: uA, v: vA },
        { edges: g.pairs }
      ];
      for (const inp of tries) {
        let d = null;
        try { d = meta.run(clone(inp)); } catch (e) { continue; }
        // 拒绝"忽略输入、仍用内置树"的算法
        if (!d || !d.nodes || d.nodes.length !== g.nodes.length) continue;
        $('#editorMask').classList.add('hidden');
        App.customInput = inp;
        App.preset = null;
        markCustomPreset();
        runCurrent();
        toast('已载入自定义树：' + g.nodes.length + ' 个结点 / ' + g.edges.length + ' 条父子边');
        return;
      }
    }
    $('#ioMsg').className = 'io-msg err';
    $('#ioMsg').textContent = `「${meta.name}」不接受外部${g.treeArray ? '树' : '图'}数据（该算法依赖内置结构或键序列）。` +
      '可改用 BFS / DFS / Dijkstra / LCA / 树的直径 / 并查集 等接受 edges 的算法，或直接选择内置教学预设。';
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
