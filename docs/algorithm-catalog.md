### 树 · 遍历

- `preorder` — 二叉树先序遍历（递归 / 迭代）（3 个预设）
- `inorder` — 二叉树中序遍历（递归 / 迭代）（3 个预设）
- `postorder` — 二叉树后序遍历（递归 / 单栈迭代）（2 个预设）
- `levelorder` — 二叉树层序遍历（BFS 队列）（2 个预设）
- `zigzag` — 锯齿形（之字形）层序遍历（2 个预设）
- `morris` — Morris 线索化中序遍历（O(1) 空间）（2 个预设）
- `nary_preorder` — N 叉树先序遍历（1 个预设）
- `postorder_2stack` — 后序遍历 · 双栈法（先序的镜像）（2 个预设）

### 树 · 二叉搜索树

- `bst_insert` — 二叉搜索树 · 插入（4 个预设）
- `bst_search` — 二叉搜索树 · 查找（3 个预设）
- `bst_delete` — 二叉搜索树 · 删除（三种情况）（4 个预设）

### 树 · 平衡搜索树

- `avl_insert` — AVL 平衡树 · 插入与四种旋转（5 个预设）
- `rbt_insert` — 红黑树 · 插入修复（Case 1/2/3）（3 个预设）
- `splay` — 伸展树 Splay · Zig / Zig-Zig / Zig-Zag（3 个预设）
- `treap` — Treap 树堆（旋转维护堆性质）（2 个预设）
- `fhq_treap` — FHQ-Treap · 分裂 Split 与合并 Merge（2 个预设）
- `cartesian` — 笛卡尔树（单调栈 O(n) 建树）（2 个预设）
- `scapegoat` — 替罪羊树 · 拍平重构（Flatten & Rebuild）（2 个预设）
- `rbt_delete` — 红黑树 · 删除修复（双黑 + 四 Case）（6 个预设）

### 树 · 多路搜索树

- `btree_insert` — B 树 · 插入上溢分裂（4 个预设）
- `bplus_range` — B+ 树 · 叶子链表与范围查询（3 个预设）
- `two_three_four` — 2-3 树 / 2-3-4 树（自底向上 vs 自顶向下）（4 个预设）
- `bstar_tree` — B* 树（兄弟转移 + 2-to-3 分裂）（3 个预设）
- `btree_delete` — B 树 · 删除下溢（借键 / 合并）（4 个预设）

### 树 · 堆与优先队列

- `binary_heap` — 二叉堆 · 上浮 / 下沉 / Floyd 建堆（3 个预设）

### 树 · 并查集

- `dsu` — 并查集 · 按秩合并与路径压缩（3 个预设）
- `dsu_weighted` — 带权并查集（维护到根的偏移量）（2 个预设）
- `dsu_rollback` — 可撤销并查集（按秩合并 + 操作栈）（2 个预设）

### 树 · 区间结构

- `segment_tree` — 线段树 · 区间查询与懒标记下传（3 个预设）
- `fenwick` — 树状数组 · lowbit 与区间覆盖（2 个预设）
- `persistent_seg` — 可持久化线段树（主席树 · 版本共享）（1 个预设）

### 树 · 最近公共祖先

- `lca_binary` — 最近公共祖先 · 倍增法（3 个预设）
- `lca_tarjan` — 最近公共祖先 · Tarjan 离线算法（DFS + 并查集）（2 个预设）
- `lca_rmq` — 最近公共祖先 · 欧拉序转 RMQ（区间最浅点）（3 个预设）
- `lca_naive` — 最近公共祖先 · 朴素逐层上跳（3 个预设）
- `lca_showdown` — 最近公共祖先 · 四法同屏对比（3 个预设）

### 树 · 树的性质

- `tree_diameter` — 树的直径 · 两次 BFS 端点搜索（2 个预设）
- `tree_diameter_dp` — 树的直径 · 树形 DP（d1 / d2）（3 个预设）

### 树 · 字符串树

- `trie` — 字典树 Trie · 插入与前缀匹配（3 个预设）
- `ac_automaton` — AC 自动机 · fail 指针与多模式匹配（2 个预设）
- `huffman` — 哈夫曼树与最优前缀编码（2 个预设）
- `xor_trie` — 0-1 异或字典树 · 最大异或对（2 个预设）

### 图 · 基础搜索

- `bfs` — 广度优先搜索 BFS（队列 + 波纹分层）（2 个预设）
- `dfs_classify` — 深度优先搜索 DFS · 四类边分类（2 个预设）
- `bidir_bfs` — 双向 BFS（两股波纹中途会师）（2 个预设）
- `iddfs` — 迭代加深搜索 IDDFS（逐层放宽深度上限）（2 个预设）

### 图 · 最短路径

- `dijkstra` — Dijkstra 单源最短路（贪心 + 松弛）（4 个预设）
- `bellman_ford` — Bellman-Ford（V-1 轮全局松弛 + 负环检测）（2 个预设）
- `spfa` — SPFA（队列优化的 Bellman-Ford）（2 个预设）
- `floyd` — Floyd-Warshall（区间 DP + 矩阵热力联动）（2 个预设）
- `astar` — A* 启发式搜索（f = g + h）（2 个预设）
- `zero_one_bfs` — 0-1 BFS（双端队列替代优先队列）（2 个预设）
- `diff_constraints` — 差分约束系统（不等式 → 最短路）（2 个预设）
- `johnson` — Johnson 全源最短路（重赋权 + 多次 Dijkstra）（1 个预设）
- `k_shortest` — 次短路 与 第 K 短路（Yen 算法）（2 个预设）
- `astar_heur` — A* · 四种启发式同图对比（1 个预设）

### 图 · 最小生成树

- `prim` — Prim 最小生成树（割性质 + 优先队列）（2 个预设）
- `kruskal` — Kruskal 最小生成树（边排序 + 并查集）（2 个预设）
- `boruvka` — Borůvka 最小生成树（每块找最短出边）（1 个预设）
- `second_mst` — 次小生成树（换一条边，增量最小）（1 个预设）
- `chu_liu` — 朱刘算法（有向图最小树形图）（2 个预设）

### 图 · 有向无环图

- `topo_kahn` — 拓扑排序 · Kahn 算法（入度表 + 队列）（2 个预设）
- `topo_dfs` — 拓扑排序 · DFS 逆后序（时间戳）（2 个预设）
- `aoe_cpm` — AOE 网络 · 关键路径（ve / vl / 松弛）（1 个预设）

### 图 · 连通性

- `tarjan_scc` — Tarjan 强连通分量（low-link + 栈）（2 个预设）
- `kosaraju` — Kosaraju 强连通分量（两遍 DFS + 反图）（1 个预设）
- `cut_bridge` — 割点与桥（删掉就断开的点/边）（1 个预设）
- `e_bcc` — 边双连通分量（删掉所有桥后缩点）（1 个预设）
- `two_sat` — 2-SAT（蕴含图 + SCC 判可满足）（2 个预设）
- `euler` — 欧拉回路（一笔画 · Hierholzer）（1 个预设）
- `graph_color` — 图着色（Welsh-Powell 贪心 + 轮图）（1 个预设）
- `vbcc` — 点双连通分量 与 圆方树（1 个预设）
- `max_clique` — 最大团 · Bron-Kerbosch（枢轴剪枝）（1 个预设）

### 图 · 匹配与网络流

- `bip_color` — 二分图判定（BFS 二染色）（2 个预设）
- `ff_ek` — 最大流 · Edmonds-Karp（BFS 找增广路）（1 个预设）
- `dinic` — 最大流 · Dinic（分层图 + 阻塞流）（1 个预设）
- `min_cut` — 最小割（最大流最小割定理）（1 个预设）
- `mcmf` — 最小费用最大流（SPFA 找最便宜增广路）（1 个预设）
- `hungarian` — 匈牙利算法（二分图最大匹配）（1 个预设）
- `km` — KM 算法（二分图最佳完美匹配）（1 个预设）
- `hlpp` — HLPP 最高标号预流推进（2 个预设）
- `blossom` — 一般图最大匹配 · 带花树算法（1 个预设）

### 树 · 堆与可并堆

- `leftist_heap` — 左偏树（可并堆 · 保持左偏性质）（1 个预设）
- `skew_heap` — 斜堆（无条件交换左右儿子）（1 个预设）
- `pairing_heap` — 配对堆（多路合并 · 两趟配对）（1 个预设）
- `binomial_heap` — 二项堆（二项树森林 · 按度数合并）（1 个预设）
- `fib_heap` — 斐波那契堆（惰性合并 + 级联切断）（2 个预设）

### 树 · 字符串

- `radix_trie` — 压缩 Trie（基数树 · 单链合并）（1 个预设）
- `suffix_tree` — 后缀树 · Ukkonen 在线构建（2 个预设）

### 树 · 进阶

- `tree_centroid` — 树的重心（最大子树最小）（1 个预设）
- `hld` — 树链剖分（重儿子 · 链 · dfn 连续）（1 个预设）
- `kd_tree` — KD 树（交替维度切分 + 最近邻）（1 个预设）
- `quadtree` — 四叉树（空间递归四分 + 范围检索）（2 个预设）
- `lct` — 动态树 · Link-Cut Tree（实边 / 虚边）（2 个预设）

### 图 · 基础

- `graph_repr` — 图的三种表示（矩阵 / 邻接表 / 边集）（1 个预设）
- `forward_star` — 链式前向星（head / to / nxt 指针跳转）（3 个预设）

