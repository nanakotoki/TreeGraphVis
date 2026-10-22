# TreeGraphVis · 教学级树与图算法交互式可视化平台

一个**纯静态、零依赖、双击即用**的树与图算法教学平台：**96 个算法 / 数据操作**，覆盖 2 大卷、25 个专题。
算法逻辑与动画引擎通过一套**统一拓扑指令流协议（Topology Trace Protocol）**彻底解耦——
算法只产出"纯数据帧"，前端把帧回放成 100% 矢量动画，因此任意一步都能**逐帧回退、倍速播放、跳转到里程碑**。

> 用浏览器直接打开 `index.html` 即可运行（`file://` 协议即可，无需构建、无需 `npm install`、无后端）。

---

## 1. 四栏教学工作台

| 区域 | 占比 | 内容 |
| --- | --- | --- |
| **主矢量画布** | 约 60% | SVG 矢量拓扑。节点为"多维胶囊"：主核（圆 / 多槽位圆角矩形）、顶角标（可叠多枚 badge）、状态光环（active 呼吸 / frontier 虚线 / path 描边 / doubleblack 双黑圈）。边为直线或二阶贝塞尔（多重边自动对称偏移），带箭头 marker 与权重胶囊；遍历时发射**滑行脉冲粒子**；结构变化用 300~600ms Ease-In-Out 缓动 |
| **辅助结构透视窗** | 约 20% | 11 类副视图：队列 / 双端队列 / 栈 / 优先队列 / 状态表 / 矩阵热力 / 并查集森林 / 数组条 / 文本面板 / 列表 |
| **伪代码行级追踪** | 约 20% | 顶部「伪代码 / C++ / Python / Java」四标签切换：伪代码每帧高亮当前执行行、行尾内联变量气泡（`u = B · v = D`）；三种语言给出**可直接阅读的实现**（96 个算法 × 3 语言，5400 行） |
| **解说栏 + VCR 时光机** | 底部常驻 | 自然语言解说；重置 / 单步后退 / 播放 / 单步前进 / 跳末；**0.25x ~ 16x 倍速**（`[` `]` 快捷键调速，>3x 自动跳过缓动防止动画堆积）；「细粒度 ↔ 宏观阶段」两种停靠模式；里程碑书签轴 |

顶部工具条：**深浅主题**切换、**结点规模控制**（输入结点数即时生成随机数据，带合理性校验）、**同屏双算法对比**（优先复用左侧完全相同的输入数据，结构不兼容时才回退到内置预设）、**NIL 哨兵显隐开关**（红黑树等扩展二叉树视图，隐藏后布局自动收紧）、**残量网络视图**（网络流算法：原边按剩余容量 `c−f` 着色，橙色虚弧标出可退回的流量 `f`）、**导出**（矢量 SVG / 4K 透明 PNG / WebM / MP4 / GIF 动图）、算法下拉选择。

## 2. 目录结构

```
index.html                 四栏工作台骨架（按依赖顺序引入全部脚本）
css/app.css                主题变量、栅格布局、面板与控件样式
js/lib/geom.js             几何基元：向量、二次贝塞尔、凸包、缓动函数
js/lib/layouts.js          布局引擎：tidyTree(Reingold-Tilford) / force / layered(Sugiyama)
                           / bipartite / radial / grid / fixed
js/lib/gif.js              GIF89a 编码器：6×6×6 调色板 + 40 灰阶、逐帧 LZW、循环扩展
js/core/protocol.js        ★ 指令流协议：C 构造器 + Scene 状态机 + apply + replay + Builder
js/core/render.js          SVG 渲染器：节点胶囊、贝塞尔边、脉冲、气泡、切割线、缩放平移、autofit、导出
js/core/panels.js          辅助面板渲染（队列 / 栈 / 表 / 矩阵 / 并查集 / 数组 / 文本）
js/core/player.js          时光机：帧回放、单步、倍速、里程碑、阶段模式、动态结构签名同步
js/core/scale.js           结点规模生成器：arr / keys / seq / tree / graph 六种形态探测 + 合理性校验
js/core/ui.js              界面装配：算法菜单、预设切换、主题、对比模式、导出
js/algorithms/*.js         24 个算法模块，共 96 个算法（见 docs/algorithm-catalog.md）
js/data/*.js               10 个三语言实现模块：96 算法 × {C++, Python, Java}，共 5400 行
tools/validate.js          无头校验：Node vm 逐帧 replay，检查协议一致性 / 伪代码行号 / 树布局重叠（脚本列表自动读 index.html）
tools/validate-code.js     三语言实现校验：覆盖度 / 空实现 / 括号平衡 / 占位符
tools/shot.js              Chrome headless 截图自检（可指定算法、步数、预设、主题）
tools/genlist.js           扫描 index.html 的加载顺序生成算法清单（永不与页面脱节）
docs/instructions.md       开发规范原文（78 项算法清单）
docs/algorithm-catalog.md  自动生成的 96 个算法 / 专题清单
```

## 3. 算法覆盖

完整清单见 **[docs/algorithm-catalog.md](docs/algorithm-catalog.md)**（由 `tools/genlist.js` 自动生成）。概览：

- **第一卷 · 树**：遍历 8 种（Morris 线索化、后序递归 / 双栈 / prev 单栈三版对照）、BST / AVL / 红黑树（**插入 + 删除双黑四 Case**）/ Splay / Scapegoat / Treap / FHQ-Treap / 笛卡尔树、B 树（**插入分裂 + 删除下溢借键 / 合并 / 级联 / 根降层**）/ B+ 树 / B\* 树 / 2-3 树 / 2-3-4 树、二叉堆 / 左偏树 / 斜堆 / 配对堆 / 二项堆 / 斐波那契堆、Trie / 压缩 Trie / 0-1 异或 Trie / AC 自动机 / 后缀树（Ukkonen）、线段树 / 主席树 / 树状数组 / 树链剖分 / LCT、**LCA 四法同台**（朴素 / 倍增 / Tarjan / 欧拉序 RMQ，另有**四法同屏对决**：同一棵树同一询问依次演练并汇总对比表）、KD 树 / 四叉树、哈夫曼树、并查集（**朴素 / 按秩 / 带权偏移 / 可撤销**四版）、树的直径（两次 BFS **与树形 DP d1/d2** 对照）与重心
- **第二卷 · 图**：表示互转 + **链式前向星**（head/to/nxt 指针跳转）、BFS / DFS 四类边 / 双向 BFS / IDDFS、Dijkstra / Bellman-Ford / SPFA / 0-1 BFS / A\*（**四种启发式同图对比**）/ Floyd / Johnson / 差分约束 / 次短路与 Yen K 短路、Prim / Kruskal / Borůvka / 次小生成树 / 朱刘算法、Kahn 与 DFS 拓扑、AOE 关键路径、Tarjan / Kosaraju / 割点与桥 / 边双 / 点双与圆方树 / 2-SAT、欧拉回路、图着色 / 最大团、Edmonds-Karp / Dinic / HLPP / 最小割 / MCMF、二分图判定 / 匈牙利 / KM / 带花树

## 4. 拓扑指令流协议（TL;DR）

```js
// 算法侧只写"纯数据"，不碰任何 DOM
TGV.register({
  id: 'kruskal', name: 'Kruskal 最小生成树', category: '图 · 最小生成树',
  layout: 'fixed',            // fixed | tree | force | layered | bipartite | radial
  panels: [{ id: 'dsu', type: 'dsu', title: '并查集' }],
  pseudocode: ['for each (u, v, w) in edges.sort(by weight):', '...'],
  presets: [{ id: 'std', label: '...', data: () => ({}) }],
  run(input) {
    const b = new TGV.Builder(this, { nodes, edges, panels: this.panels });
    b.step('取出权值最小的边 A–D（3）', [TGV.C.edge('A>D', 'path'), TGV.C.pulse('A>D')], { line: 3 });
    return { nodes, edges, frames: b.frames, panels: b.panels };
  }
});
```

一帧 = `{ narration, codeLine, isMilestone, vars, commands[], durationMs }`。原子指令族：

`SET_NODE_STATE / SET_EDGE_STATE / UPDATE_NODE_BADGE / UPDATE_NODE_SLOTS / SET_NODE_LABEL / SET_NODE_STYLE /
UPDATE_EDGE_LABEL / TRAVERSE_EDGE_PULSE / MORPH_LAYOUT / DRAW_TEMP_ARC / CLEAR_TEMP_ARC / GROUP_NODES_HULL /
DRAW_CUT_LINE / SET_NODE_VISIBILITY / SET_EDGE_VISIBILITY / ADD_NODE / ADD_EDGE / REMOVE_NODE / REMOVE_EDGE /
AUX_CONTAINER_OP / AUX_TABLE_UPDATE / AUX_MATRIX_UPDATE / AUX_DSU_SYNC / AUX_ARRAY_SYNC / AUX_TEXT_SYNC / SET_SCENE_NOTE`

**回退的实现方式**：`TGV.replay(def, frames, index)` 永远从第 0 帧重放到目标帧，把指令作用在纯数据 `Scene` 上。
于是"后退"和"前进"走的是同一条代码路径，天然不可能出现状态不一致——这是整个时光机的地基。

## 5. 自由建图与数据导入

点顶部「建图」打开工作台，三种入口可混用：

| 入口 | 操作 | 说明 |
| --- | --- | --- |
| 竞赛文本 | 第一行 `n m`，随后 `m` 行 `u v [w]` | 自动识别有向 / 带权 / 0 基 |
| LeetCode 层序树 | `[5,3,8,1,4,null,9,null,2]` | 直接生成二叉树；对 LCA、树的直径等接受 `edges` 的树算法可「用此树运行」 |
| 鼠标建图 | 双击空白新建节点、点两点连边、**双击边改权重**、右键删除 | 勾选「有向图」即时切换箭头方向 |

导入后预设下拉显示「自定义导入数据」，切换算法即可恢复内置预设。

### 规模控制（结点数）

顶栏「结点 N 生成」可在**不重建算法**的前提下把演示扩到任意规模：

- **不支持就明说**：用 `arr / keys / seq / seqPair / tree / graph` 六种输入形态各试跑一次，并用「n 与 n+1 是否让结构增长」判断算法是否真的采用了输入。依赖固定教学用例的算法（红黑树删除四 Case、网络流内置网络等）会提示暂不支持并还原原规模，而不是假装生效。
- **合理性判断**：全局 5–56 个结点（少于 5 结构变化不明显；多于 56 标签会互相遮挡）；单步开销大的算法单独收紧（Floyd 12、Johnson 10、最大团 16、Dinic 22、HLPP 14…）；单次演示帧数超过 2600 会自动把规模降一档。
- 越界时**取最接近的可行值**并在提示里说明原因（如「上限为 12，已取 12」）。
- 覆盖面 **94 / 96**：除通用六形态外，还给网络流 / 二分图 / 2-SAT / 差分约束 / 字符串树 / 空间树 / 可并堆等族补了**专用生成器**
  （如 Trie 生成单词表、KD/四叉树生成点集、HLPP 生成带反向边的容量网络）。
- 仅 `lca_showdown`（四法同屏对照）与 `astar_heur`（四种启发式同图对照）保留固定教学图：它们本身就是「同图对比」演示，换规模会失去对照意义。

## 6. 自检工具

```bash
# 1) 无头协议校验：加载全部模块，逐个 preset 回放每一帧
node tools/validate.js
#    输出：算法总数: 96，帧总数: 4773 → ✓ 全部通过

# 2) 截图自检：算法 id / 步数 / 输出名 / 主题(light|dark) / 预设 id
node tools/shot.js kruskal 10 k1 light std
node tools/shot.js max_clique 8 dark1 dark

# 3) 三语言实现校验：96 个算法是否都有 C++ / Python / Java
node tools/validate-code.js
#    输出：覆盖算法: 96 / 96｜代码总行数: 5400 → ✓ 覆盖完整，结构检查通过

# 4) 重新生成算法清单
node tools/genlist.js
```

`validate.js` 会检查：每条指令引用的节点 / 边 / 面板是否存在、伪代码行号是否越界、每帧是否有解说、
树布局同层节点是否重叠。任何一条不通过都会列出来。

## 7. 约定

- 全部脚本为 IIFE + `globalThis.TGV` 命名空间，无模块打包、无运行时依赖。
- 中文字体优先，代码与数字用等宽字体；颜色走 CSS 变量，深浅主题同源。
- 新增算法时：算法逻辑进 `js/algorithms/`，三语言实现追加到 `js/data/solutions_*.js`（键名 = 算法 id），
  再跑 `validate.js` 与 `validate-code.js` 即可。
