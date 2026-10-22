/* ============================================================
 * 三语言教学实现 · 第 8 卷（连通性 / 欧拉 / 着色）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.tarjan_scc = {
    cpp: `// Tarjan SCC：dfn == low 时弹栈，栈中一段就是一个强连通分量
int idx = 0, sccCnt = 0;
vector<int> dfn, low, stk, inStack, scc;
void dfs(int u, vector<vector<int>>& g) {
    dfn[u] = low[u] = ++idx;
    stk.push_back(u); inStack[u] = 1;
    for (int v : g[u]) {
        if (!dfn[v]) { dfs(v, g); low[u] = min(low[u], low[v]); }
        else if (inStack[v]) low[u] = min(low[u], dfn[v]);
    }
    if (dfn[u] == low[u]) {
        while (true) {
            int v = stk.back(); stk.pop_back();
            inStack[v] = 0; scc[v] = sccCnt;
            if (v == u) break;
        }
        sccCnt++;
    }
}`,
    py: `import sys
sys.setrecursionlimit(10 ** 6)
idx, scc_cnt = 0, 0
dfn, low, stk, in_stack, scc = {}, {}, [], set(), {}

def dfs(u, g):
    global idx, scc_cnt
    idx += 1
    dfn[u] = low[u] = idx
    stk.append(u); in_stack.add(u)
    for v in g[u]:
        if v not in dfn:
            dfs(v, g)
            low[u] = min(low[u], low[v])
        elif v in in_stack:
            low[u] = min(low[u], dfn[v])
    if dfn[u] == low[u]:              # u 是本 SCC 的根
        while True:
            v = stk.pop()
            in_stack.discard(v)
            scc[v] = scc_cnt
            if v == u:
                break
        scc_cnt += 1`,
    java: `int idx = 0, sccCnt = 0;
int[] dfn, low, scc, inStack;
Deque<Integer> stk = new ArrayDeque<>();

void dfs(int u, List<List<Integer>> g) {
    dfn[u] = low[u] = ++idx;
    stk.push(u); inStack[u] = 1;
    for (int v : g.get(u)) {
        if (dfn[v] == 0) { dfs(v, g); low[u] = Math.min(low[u], low[v]); }
        else if (inStack[v] == 1) low[u] = Math.min(low[u], dfn[v]);
    }
    if (dfn[u] == low[u]) {
        while (true) {
            int v = stk.pop();
            inStack[v] = 0; scc[v] = sccCnt;
            if (v == u) break;
        }
        sccCnt++;
    }
}`
  };

  S.kosaraju = {
    cpp: `// Kosaraju：原图求后序 → 反图按逆后序 DFS，每次走出一整个 SCC
void dfs1(int u, vector<vector<int>>& g, vector<bool>& vis, vector<int>& order) {
    vis[u] = true;
    for (int v : g[u]) if (!vis[v]) dfs1(v, g, vis, order);
    order.push_back(u);                       // 后序
}
void dfs2(int u, vector<vector<int>>& rg, vector<bool>& vis, int c, vector<int>& scc) {
    vis[u] = true; scc[u] = c;
    for (int v : rg[u]) if (!vis[v]) dfs2(v, rg, vis, c, scc);
}
int kosaraju(int n, vector<vector<int>>& g, vector<vector<int>>& rg, vector<int>& scc) {
    vector<bool> vis(n, false); vector<int> order;
    for (int i = 0; i < n; i++) if (!vis[i]) dfs1(i, g, vis, order);
    fill(vis.begin(), vis.end(), false);
    int c = 0;
    for (int i = n - 1; i >= 0; i--)          // 逆后序
        if (!vis[order[i]]) { dfs2(order[i], rg, vis, c, scc); c++; }
    return c;
}`,
    py: `def kosaraju(n, g, rg):
    vis, order = [False] * n, []

    def dfs1(u):
        vis[u] = True
        for v in g[u]:
            if not vis[v]:
                dfs1(v)
        order.append(u)

    def dfs2(u, c, scc):
        vis[u] = True
        scc[u] = c
        for v in rg[u]:
            if not vis[v]:
                dfs2(v, c, scc)

    for i in range(n):
        if not vis[i]:
            dfs1(i)
    vis = [False] * n
    scc, c = [-1] * n, 0
    for u in reversed(order):          # 逆后序扫反图
        if not vis[u]:
            dfs2(u, c, scc)
            c += 1
    return c, scc`,
    java: `void dfs1(int u, List<List<Integer>> g, boolean[] vis, List<Integer> order) {
    vis[u] = true;
    for (int v : g.get(u)) if (!vis[v]) dfs1(v, g, vis, order);
    order.add(u);
}
void dfs2(int u, List<List<Integer>> rg, boolean[] vis, int c, int[] scc) {
    vis[u] = true; scc[u] = c;
    for (int v : rg.get(u)) if (!vis[v]) dfs2(v, rg, vis, c, scc);
}
int kosaraju(int n, List<List<Integer>> g, List<List<Integer>> rg, int[] scc) {
    boolean[] vis = new boolean[n];
    List<Integer> order = new ArrayList<>();
    for (int i = 0; i < n; i++) if (!vis[i]) dfs1(i, g, vis, order);
    Arrays.fill(vis, false);
    int c = 0;
    for (int i = order.size() - 1; i >= 0; i--)
        if (!vis[order.get(i)]) dfs2(order.get(i), rg, vis, c++, scc);
    return c;
}`
  };

  S.cut_bridge = {
    cpp: `// 割点：非根 low[v] >= dfn[u]；桥：low[v] > dfn[u]
void dfs(int u, int parent, vector<vector<int>>& g, vector<int>& dfn, vector<int>& low,
         vector<int>& cut, vector<pair<int,int>>& bridge, int& timer) {
    dfn[u] = low[u] = ++timer;
    int child = 0;
    for (int v : g[u]) {
        if (v == parent) continue;
        if (!dfn[v]) {
            child++;
            dfs(v, u, g, dfn, low, cut, bridge, timer);
            low[u] = min(low[u], low[v]);
            if (low[v] > dfn[u]) bridge.push_back({u, v});       // 桥
            if (parent != -1 && low[v] >= dfn[u]) cut[u] = 1;    // 割点
        } else low[u] = min(low[u], dfn[v]);
    }
    if (parent == -1 && child >= 2) cut[u] = 1;                  // 根有两棵子树
}`,
    py: `def tarjan_cut(n, g):
    dfn, low = [0] * n, [0] * n
    cut, bridges = [False] * n, []
    timer = 0

    def dfs(u, parent):
        nonlocal timer
        timer += 1
        dfn[u] = low[u] = timer
        child = 0
        for v in g[u]:
            if v == parent:
                continue
            if not dfn[v]:
                child += 1
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > dfn[u]:
                    bridges.append((u, v))         # 桥
                if parent != -1 and low[v] >= dfn[u]:
                    cut[u] = True                  # 割点
            else:
                low[u] = min(low[u], dfn[v])
        if parent == -1 and child >= 2:
            cut[u] = True

    for i in range(n):
        if not dfn[i]:
            dfs(i, -1)
    return cut, bridges`,
    java: `void dfs(int u, int parent, List<List<Integer>> g, int[] dfn, int[] low,
         boolean[] cut, List<int[]> bridges, int[] timer) {
    dfn[u] = low[u] = ++timer[0];
    int child = 0;
    for (int v : g.get(u)) {
        if (v == parent) continue;
        if (dfn[v] == 0) {
            child++;
            dfs(v, u, g, dfn, low, cut, bridges, timer);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > dfn[u]) bridges.add(new int[]{u, v});
            if (parent != -1 && low[v] >= dfn[u]) cut[u] = true;
        } else low[u] = Math.min(low[u], dfn[v]);
    }
    if (parent == -1 && child >= 2) cut[u] = true;
}`
  };

  S.e_bcc = {
    cpp: `// 边双：先求所有桥，删桥后每个连通块就是一个边双
int e_bcc(int n, vector<vector<pair<int,int>>>& g, vector<int>& comp) {
    // 1) Tarjan 标记桥边
    vector<int> dfn(n), low(n), timer = {0};
    vector<bool> isBridge(g.size() * 2, false);
    // 2) 第二次 DFS：跳过桥边划分连通块
    comp.assign(n, -1);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (comp[i] != -1) continue;
        stack<int> st; st.push(i); comp[i] = c;
        while (!st.empty()) {
            int u = st.top(); st.pop();
            for (auto [v, id] : g[u]) {
                if (isBridge[id] || comp[v] != -1) continue;
                comp[v] = c; st.push(v);
            }
        }
        c++;
    }
    return c;
}`,
    py: `def edge_bcc(n, g):
    dfn, low = [0] * n, [0] * n
    bridges = set()
    timer = 0

    def dfs(u, pe):
        nonlocal timer
        timer += 1
        dfn[u] = low[u] = timer
        for v, eid in g[u]:
            if eid == pe:
                continue
            if not dfn[v]:
                dfs(v, eid)
                low[u] = min(low[u], low[v])
                if low[v] > dfn[u]:
                    bridges.add(eid)          # 标记桥
            else:
                low[u] = min(low[u], dfn[v])

    for i in range(n):
        if not dfn[i]:
            dfs(i, -1)
    comp, c = [-1] * n, 0
    for i in range(n):
        if comp[i] != -1:
            continue
        comp[i] = c
        stack = [i]
        while stack:
            u = stack.pop()
            for v, eid in g[u]:
                if eid in bridges or comp[v] != -1:
                    continue
                comp[v] = c
                stack.append(v)
        c += 1
    return c, comp`,
    java: `int edgeBCC(int n, List<List<int[]>> g, int[] comp) {
    int[] dfn = new int[n], low = new int[n];
    boolean[] bridge = new boolean[2 * g.size() + 2];
    int[] timer = {0};
    for (int i = 0; i < n; i++) if (dfn[i] == 0) dfsBCC(i, -1, g, dfn, low, bridge, timer);
    Arrays.fill(comp, -1);
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (comp[i] != -1) continue;
        Deque<Integer> st = new ArrayDeque<>();
        st.push(i); comp[i] = c;
        while (!st.isEmpty()) {
            int u = st.pop();
            for (int[] e : g.get(u)) {
                if (bridge[e[1]] || comp[e[0]] != -1) continue;
                comp[e[0]] = c; st.push(e[0]);
            }
        }
        c++;
    }
    return c;
}`
  };

  S.vbcc = {
    cpp: `// 点双 + 圆方树：弹栈遇到割点即得到一个点双，新建方点连接其内所有圆点
void dfs(int u, vector<vector<int>>& g, vector<int>& dfn, vector<int>& low,
         stack<int>& st, vector<vector<int>>& blocks, int& timer, int parent) {
    dfn[u] = low[u] = ++timer;
    st.push(u);
    for (int v : g[u]) {
        if (v == parent) continue;
        if (!dfn[v]) {
            dfs(v, g, dfn, low, st, blocks, timer, u);
            low[u] = min(low[u], low[v]);
            if (low[v] >= dfn[u]) {                      // u 是点双的根
                vector<int> blk;
                while (true) {
                    int x = st.top(); st.pop(); blk.push_back(x);
                    if (x == v) break;
                }
                blk.push_back(u);
                blocks.push_back(blk);                   // 新建方点连向 blk
            }
        } else low[u] = min(low[u], dfn[v]);
    }
}`,
    py: `def vbcc(n, g):
    dfn, low = [0] * n, [0] * n
    timer, st, blocks = 0, [], []

    def dfs(u, parent):
        nonlocal timer
        timer += 1
        dfn[u] = low[u] = timer
        st.append(u)
        for v in g[u]:
            if v == parent:
                continue
            if not dfn[v]:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] >= dfn[u]:          # u 是切点
                    blk = []
                    while True:
                        x = st.pop()
                        blk.append(x)
                        if x == v:
                            break
                    blk.append(u)
                    blocks.append(blk)        # 每个 blk 对应一个方点
            else:
                low[u] = min(low[u], dfn[v])

    for i in range(n):
        if not dfn[i]:
            dfs(i, -1)
    return blocks`,
    java: `void dfs(int u, int parent, List<List<Integer>> g, int[] dfn, int[] low,
         Deque<Integer> st, List<List<Integer>> blocks, int[] timer) {
    dfn[u] = low[u] = ++timer[0];
    st.push(u);
    for (int v : g.get(u)) {
        if (v == parent) continue;
        if (dfn[v] == 0) {
            dfs(v, u, g, dfn, low, st, blocks, timer);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] >= dfn[u]) {
                List<Integer> blk = new ArrayList<>();
                while (true) {
                    int x = st.pop(); blk.add(x);
                    if (x == v) break;
                }
                blk.add(u);
                blocks.add(blk);
            }
        } else low[u] = Math.min(low[u], dfn[v]);
    }
}`
  };

  S.two_sat = {
    cpp: `// 2-SAT：(a or b) <=> !a -> b 且 !b -> a；同一变量正负落在同一 SCC 即无解
int id(int v, bool neg) { return 2 * v + (neg ? 1 : 0); }
bool twoSAT(int n, vector<pair<int,int>>& clauses) {   // 用 (v, neg) 表示文字
    vector<vector<int>> g(2 * n);
    for (auto [a, b] : clauses) {
        g[a ^ 1].push_back(b);      // !a -> b
        g[b ^ 1].push_back(a);      // !b -> a
    }
    // Tarjan 求 SCC（略），得到 comp[]
    for (int v = 0; v < n; v++)
        if (comp[id(v, false)] == comp[id(v, true)]) return false;
    return true;
}`,
    py: `def two_sat(n, clauses):
    """clause 用 (变量, 是否取反) 表示；节点 2v / 2v+1"""
    g = [[] for _ in range(2 * n)]
    for (a, na), (b, nb) in clauses:
        a2, b2 = 2 * a + na, 2 * b + nb
        g[a2 ^ 1].append(b2)          # !a -> b
        g[b2 ^ 1].append(a2)          # !b -> a
    comp = tarjan_scc(g)              # 求 SCC 编号
    for v in range(n):
        if comp[2 * v] == comp[2 * v + 1]:
            return None               # x 与 !x 同 SCC → 无解
    # 按 SCC 反拓扑序取值：comp 大者为真
    return [comp[2 * v] > comp[2 * v + 1] for v in range(n)]`,
    java: `boolean twoSAT(int n, int[][] clauses) {   // 文字 = 2*v + neg
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < 2 * n; i++) g.add(new ArrayList<>());
    for (int[] c : clauses) {
        g.get(c[0] ^ 1).add(c[1]);
        g.get(c[1] ^ 1).add(c[0]);
    }
    int[] comp = tarjanSCC(g);                 // 求 SCC
    for (int v = 0; v < n; v++)
        if (comp[2 * v] == comp[2 * v + 1]) return false;
    return true;
}`
  };

  S.euler = {
    cpp: `// Hierholzer：一路走一路删边，走到死胡同就回退并入栈，逆序即欧拉路
void dfs(int u, vector<vector<int>>& g, vector<int>& path) {
    while (!g[u].empty()) {
        int v = g[u].back(); g[u].pop_back();
        // 无向图还需删除反向边
        dfs(v, g, path);
    }
    path.push_back(u);              // 回溯时才记录
}
vector<int> eulerPath(int start, vector<vector<int>>& g) {
    vector<int> path;
    dfs(start, g, path);
    reverse(path.begin(), path.end());
    return path;
}`,
    py: `def hierholzer(start, g):
    path, stack = [], [start]
    while stack:
        u = stack[-1]
        if g[u]:
            v = g[u].pop()
            stack.append(v)        # 沿边深入
        else:
            path.append(stack.pop())   # 死胡同：回溯入结果
    return path[::-1]

def has_euler(g, directed=False):
    odd = sum(len(nb) % 2 for nb in g)
    return odd == 0 or odd == 2    # 无向图：奇度点 0 或 2 个`,
    java: `void dfs(int u, List<Deque<Integer>> g, List<Integer> path) {
    while (!g.get(u).isEmpty()) {
        int v = g.get(u).pollLast();
        dfs(v, g, path);
    }
    path.add(u);
}
List<Integer> eulerPath(int start, List<Deque<Integer>> g) {
    List<Integer> path = new ArrayList<>();
    dfs(start, g, path);
    Collections.reverse(path);
    return path;
}`
  };

  S.graph_color = {
    cpp: `// 图着色：Welsh-Powell 按度数降序贪心；回溯版可判定 m 可着色
int welshPowell(int n, vector<vector<int>>& g) {
    vector<int> deg(n), order(n), color(n, -1);
    for (int u = 0; u < n; u++) deg[u] = g[u].size();
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int a, int b) { return deg[a] > deg[b]; });
    for (int u : order) {
        vector<bool> used(n, false);
        for (int v : g[u]) if (color[v] != -1) used[color[v]] = true;
        int c = 0;
        while (used[c]) c++;
        color[u] = c;
    }
    return *max_element(color.begin(), color.end()) + 1;
}`,
    py: `def welsh_powell(n, g):
    order = sorted(range(n), key=lambda u: len(g[u]), reverse=True)
    color = [-1] * n
    for u in order:
        used = {color[v] for v in g[u] if color[v] != -1}
        c = 0
        while c in used:
            c += 1
        color[u] = c
    return max(color) + 1, color

def m_coloring(n, g, m):
    color = [-1] * n
    def dfs(u):
        if u == n:
            return True
        for c in range(m):
            if all(color[v] != c for v in g[u]):
                color[u] = c
                if dfs(u + 1):
                    return True
                color[u] = -1
        return False
    return color if dfs(0) else None`,
    java: `int welshPowell(int n, List<List<Integer>> g) {
    Integer[] order = new Integer[n];
    for (int i = 0; i < n; i++) order[i] = i;
    Arrays.sort(order, (a, b) -> g.get(b).size() - g.get(a).size());
    int[] color = new int[n];
    Arrays.fill(color, -1);
    for (int u : order) {
        boolean[] used = new boolean[n];
        for (int v : g.get(u)) if (color[v] != -1) used[color[v]] = true;
        int c = 0;
        while (used[c]) c++;
        color[u] = c;
    }
    int mx = 0;
    for (int c : color) mx = Math.max(mx, c);
    return mx + 1;
}`
  };

  S.max_clique = {
    cpp: `// Bron-Kerbosch + 枢轴：R 当前团，P 候选，X 已排除
int best = 0;
void bk(vector<int>& R, vector<int>& P, vector<int>& X, vector<vector<int>>& g) {
    if (P.empty() && X.empty()) { best = max(best, (int)R.size()); return; }
    int pivot = -1, bestCnt = -1;
    for (int u : P) {                                   // 选枢轴，减少分支
        int c = 0;
        for (int v : P) if (g[u][v]) c++;
        if (c > bestCnt) { bestCnt = c; pivot = u; }
    }
    vector<int> cand;
    for (int v : P) if (!g[pivot][v]) cand.push_back(v); // 只搜非邻居
    for (int v : cand) {
        vector<int> np, nx;
        for (int u : P) if (g[v][u]) np.push_back(u);
        for (int u : X) if (g[v][u]) nx.push_back(u);
        R.push_back(v);
        bk(R, np, nx, g);
        R.pop_back();
        P.erase(find(P.begin(), P.end(), v));
        X.push_back(v);
    }
}`,
    py: `def max_clique(n, adj):
    best = [0]

    def bk(R, P, X):
        if not P and not X:
            best[0] = max(best[0], len(R))
            return
        pivot = max(P, key=lambda u: sum(adj[u][v] for v in P)) if P else None
        cand = [v for v in P if not adj[pivot][v]] if pivot is not None else list(P)
        for v in cand:
            bk(R | {v},
               {u for u in P if adj[v][u]},
               {u for u in X if adj[v][u]})
            P.remove(v)
            X.add(v)

    bk(set(), set(range(n)), set())
    return best[0]`,
    java: `int best = 0;
void bk(Set<Integer> R, Set<Integer> P, Set<Integer> X, boolean[][] g) {
    if (P.isEmpty() && X.isEmpty()) { best = Math.max(best, R.size()); return; }
    int pivot = -1, bestCnt = -1;
    for (int u : P) {
        int c = 0;
        for (int v : P) if (g[u][v]) c++;
        if (c > bestCnt) { bestCnt = c; pivot = u; }
    }
    List<Integer> cand = new ArrayList<>();
    for (int v : P) if (pivot == -1 || !g[pivot][v]) cand.add(v);
    for (int v : cand) {
        Set<Integer> np = new HashSet<>(), nx = new HashSet<>();
        for (int u : P) if (g[v][u]) np.add(u);
        for (int u : X) if (g[v][u]) nx.add(u);
        R.add(v);
        bk(R, np, nx, g);
        R.remove(v);
        P.remove(v);
        X.add(v);
    }
}`
  };
})();
