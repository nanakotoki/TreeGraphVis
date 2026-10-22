/* ============================================================
 * 三语言教学实现 · 第 7 卷（最小生成树 / DAG）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.prim = {
    cpp: `// Prim：维护「已选集合 S」，每次取横跨割集的最小边扩张
long long prim(int n, vector<vector<pair<int,int>>>& g) {
    vector<int> d(n, INT_MAX);
    vector<bool> in(n, false);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    d[0] = 0; pq.push({0, 0});
    long long sum = 0;
    while (!pq.empty()) {
        auto [w, u] = pq.top(); pq.pop();
        if (in[u]) continue;
        in[u] = true; sum += w;               // 这条边就是割集最小边
        for (auto [v, c] : g[u])
            if (!in[v] && c < d[v]) { d[v] = c; pq.push({c, v}); }
    }
    return sum;
}`,
    py: `import heapq

def prim(n, g):
    d = [float('inf')] * n
    used = [False] * n
    d[0] = 0
    pq = [(0, 0)]
    total = 0
    while pq:
        w, u = heapq.heappop(pq)
        if used[u]:
            continue
        used[u] = True
        total += w                    # 当前割集最小边
        for v, c in g[u]:
            if not used[v] and c < d[v]:
                d[v] = c
                heapq.heappush(pq, (c, v))
    return total`,
    java: `long prim(int n, List<List<int[]>> g) {
    int[] d = new int[n];
    boolean[] used = new boolean[n];
    Arrays.fill(d, Integer.MAX_VALUE);
    d[0] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.add(new int[]{0, 0});
    long total = 0;
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int w = top[0], u = top[1];
        if (used[u]) continue;
        used[u] = true; total += w;
        for (int[] e : g.get(u))
            if (!used[e[0]] && e[1] < d[e[0]]) {
                d[e[0]] = e[1]; pq.add(new int[]{e[1], e[0]});
            }
    }
    return total;
}`
  };

  S.kruskal = {
    cpp: `// Kruskal：边按权排序，能合并就选，成环则丢弃
long long kruskal(int n, vector<array<int,3>>& edges) {
    sort(edges.begin(), edges.end(),
         [](auto& a, auto& b) { return a[2] < b[2]; });
    vector<int> fa(n); iota(fa.begin(), fa.end(), 0);
    long long sum = 0; int picked = 0;
    for (auto& [u, v, w] : edges) {
        if (find(fa, u) == find(fa, v)) continue;   // 成环，丢弃
        fa[find(fa, u)] = find(fa, v);
        sum += w;
        if (++picked == n - 1) break;
    }
    return sum;
}`,
    py: `def kruskal(n, edges):
    fa = list(range(n))
    def find(x):
        while fa[x] != x:
            fa[x] = fa[fa[x]]; x = fa[x]
        return x
    total = 0
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        ru, rv = find(u), find(v)
        if ru == rv:
            continue                  # 两端同集合 → 成环
        fa[ru] = rv
        total += w
    return total`,
    java: `long kruskal(int n, int[][] edges) {
    Arrays.sort(edges, (a, b) -> a[2] - b[2]);
    int[] fa = new int[n];
    for (int i = 0; i < n; i++) fa[i] = i;
    long total = 0;
    for (int[] e : edges) {
        int ru = find(fa, e[0]), rv = find(fa, e[1]);
        if (ru == rv) continue;
        fa[ru] = rv;
        total += e[2];
    }
    return total;
}`
  };

  S.boruvka = {
    cpp: `// Boruvka：每轮每个连通块各挑一条最小出边，然后批量合并
long long boruvka(int n, vector<array<int,3>>& edges) {
    vector<int> fa(n); iota(fa.begin(), fa.end(), 0);
    long long sum = 0;
    int comp = n;
    while (comp > 1) {
        vector<int> best(n, -1);
        for (int i = 0; i < (int)edges.size(); i++) {
            auto& [u, v, w] = edges[i];
            int ru = find(fa, u), rv = find(fa, v);
            if (ru == rv) continue;
            if (best[ru] < 0 || w < edges[best[ru]][2]) best[ru] = i;
            if (best[rv] < 0 || w < edges[best[rv]][2]) best[rv] = i;
        }
        for (int i = 0; i < n; i++) {
            if (best[i] < 0) continue;
            auto& [u, v, w] = edges[best[i]];
            int ru = find(fa, u), rv = find(fa, v);
            if (ru == rv) continue;
            fa[ru] = rv; sum += w; comp--;      // 一轮可合并多条
        }
    }
    return sum;
}`,
    py: `def boruvka(n, edges):
    fa = list(range(n))
    def find(x):
        while fa[x] != x:
            fa[x] = fa[fa[x]]; x = fa[x]
        return x
    total, comp = 0, n
    while comp > 1:
        best = [-1] * n
        for i, (u, v, w) in enumerate(edges):
            ru, rv = find(u), find(v)
            if ru == rv:
                continue
            if best[ru] < 0 or w < edges[best[ru]][2]:
                best[ru] = i
            if best[rv] < 0 or w < edges[best[rv]][2]:
                best[rv] = i
        for i in range(n):
            if best[i] < 0:
                continue
            u, v, w = edges[best[i]]
            ru, rv = find(u), find(v)
            if ru == rv:
                continue
            fa[ru] = rv
            total += w
            comp -= 1                # 并发合并，O(log V) 轮收敛
    return total`,
    java: `long boruvka(int n, int[][] edges) {
    int[] fa = new int[n];
    for (int i = 0; i < n; i++) fa[i] = i;
    long total = 0;
    int comp = n;
    while (comp > 1) {
        int[] best = new int[n];
        Arrays.fill(best, -1);
        for (int i = 0; i < edges.length; i++) {
            int ru = find(fa, edges[i][0]), rv = find(fa, edges[i][1]);
            if (ru == rv) continue;
            if (best[ru] < 0 || edges[i][2] < edges[best[ru]][2]) best[ru] = i;
            if (best[rv] < 0 || edges[i][2] < edges[best[rv]][2]) best[rv] = i;
        }
        for (int i = 0; i < n; i++) {
            if (best[i] < 0) continue;
            int[] e = edges[best[i]];
            int ru = find(fa, e[0]), rv = find(fa, e[1]);
            if (ru == rv) continue;
            fa[ru] = rv; total += e[2]; comp--;
        }
    }
    return total;
}`
  };

  S.second_mst = {
    cpp: `// 次小生成树：枚举每条非树边 u-v，替换树上环中最大的边
long long secondMST(int n, vector<array<int,3>>& edges, vector<int> treeEdges) {
    // 1) 先求 MST，标记树边
    // 2) 树上倍增预处理 u->v 路径的最大边 mx[u][v]
    // 3) 对每条非树边 (u,v,w)：cand = mst + w - mx[u][v]
    long long best = LLONG_MAX;
    for (int i = 0; i < (int)edges.size(); i++) {
        if (isTree[i]) continue;
        auto& [u, v, w] = edges[i];
        best = min(best, mstWeight + w - maxEdgeOnPath(u, v));
    }
    return best;
}`,
    py: `def second_mst(n, edges, mst_edges):
    """非树边 (u,v,w) 替换树上 u-v 路径中的最大边"""
    tree = [[] for _ in range(n)]
    for u, v, w in mst_edges:
        tree[u].append((v, w)); tree[v].append((u, w))
    mst_weight = sum(w for _, _, w in mst_edges)

    def max_on_path(s, t):                 # 简单 DFS 找路径最大边
        stack, best = [(s, -1, 0)], -1
        while stack:
            u, p, mx = stack.pop()
            if u == t:
                return mx
            for v, w in tree[u]:
                if v != p:
                    stack.append((v, u, max(mx, w)))
        return -1

    in_mst = {(min(u, v), max(u, v)) for u, v, _ in mst_edges}
    ans = float('inf')
    for u, v, w in edges:
        if (min(u, v), max(u, v)) in in_mst:
            continue
        ans = min(ans, mst_weight + w - max_on_path(u, v))
    return ans`,
    java: `long secondMST(int n, int[][] edges, List<int[]> mstEdges, long mstWeight) {
    List<List<int[]>> tree = new ArrayList<>();
    for (int i = 0; i < n; i++) tree.add(new ArrayList<>());
    Set<Long> inMst = new HashSet<>();
    for (int[] e : mstEdges) {
        tree.get(e[0]).add(new int[]{e[1], e[2]});
        tree.get(e[1]).add(new int[]{e[0], e[2]});
        inMst.add(Math.min(e[0], e[1]) * 100000L + Math.max(e[0], e[1]));
    }
    long best = Long.MAX_VALUE;
    for (int[] e : edges) {
        if (inMst.contains(Math.min(e[0], e[1]) * 100000L + Math.max(e[0], e[1]))) continue;
        best = Math.min(best, mstWeight + e[2] - maxOnPath(tree, e[0], e[1]));
    }
    return best;
}`
  };

  S.chu_liu = {
    cpp: `// 朱刘算法：每点选最小入边 -> 判环 -> 缩环重赋权 -> 展开
long long chuLiu(int n, int root, vector<array<int,3>>& edges) {
    long long ans = 0;
    while (true) {
        vector<long long> in(n, LLONG_MAX);
        vector<int> pre(n, -1), id(n, -1), vis(n, -1);
        for (auto& [u, v, w] : edges)
            if (u != v && w < in[v]) { in[v] = w; pre[v] = u; }   // 最小入边
        in[root] = 0;
        for (int i = 0; i < n; i++) if (in[i] == LLONG_MAX) return -1; // 不可达
        int cnt = 0;
        for (int i = 0; i < n; i++) {
            ans += in[i];
            int v = i;
            while (vis[v] != i && id[v] == -1 && v != root) { vis[v] = i; v = pre[v]; }
            if (v != root && id[v] == -1) {                    // 找到有向环
                for (int u = pre[v]; u != v; u = pre[u]) id[u] = cnt;
                id[v] = cnt++;
            }
        }
        if (cnt == 0) break;                                   // 无环，收工
        for (int i = 0; i < n; i++) if (id[i] == -1) id[i] = cnt++;
        for (auto& [u, v, w] : edges) {                        // 缩环重赋权
            int uu = id[u], vv = id[v];
            if (uu != vv) w -= in[v];
            u = uu; v = vv;
        }
        n = cnt; root = id[root];
    }
    return ans;
}`,
    py: `def chu_liu(n, root, edges):
    ans = 0
    while True:
        INF = float('inf')
        inw = [INF] * n
        pre = [-1] * n
        for u, v, w in edges:
            if u != v and w < inw[v]:
                inw[v], pre[v] = w, u
        inw[root] = 0
        if any(x == INF for x in inw):
            return -1
        cnt, id_, vis = 0, [-1] * n, [-1] * n
        for i in range(n):
            ans += inw[i]
            v = i
            while vis[v] != i and id_[v] == -1 and v != root:
                vis[v] = i
                v = pre[v]
            if v != root and id_[v] == -1:
                u = pre[v]
                while u != v:
                    id_[u] = cnt
                    u = pre[u]
                id_[v] = cnt
                cnt += 1
        if cnt == 0:
            return ans
        for i in range(n):
            if id_[i] == -1:
                id_[i] = cnt
                cnt += 1
        ne = []
        for u, v, w in edges:
            uu, vv = id_[u], id_[v]
            if uu != vv:
                w -= inw[v]
            ne.append((uu, vv, w))
        edges = ne
        n, root = cnt, id_[root]`,
    java: `long chuLiu(int n, int root, int[][] edgesIn) {
    long ans = 0;
    int[][] edges = edgesIn;
    while (true) {
        long[] in = new long[n];
        int[] pre = new int[n];
        Arrays.fill(in, Long.MAX_VALUE); Arrays.fill(pre, -1);
        for (int[] e : edges)
            if (e[0] != e[1] && e[2] < in[e[1]]) { in[e[1]] = e[2]; pre[e[1]] = e[0]; }
        in[root] = 0;
        for (long x : in) if (x == Long.MAX_VALUE) return -1;
        int cnt = 0;
        int[] id = new int[n], vis = new int[n];
        Arrays.fill(id, -1); Arrays.fill(vis, -1);
        for (int i = 0; i < n; i++) {
            ans += in[i];
            int v = i;
            while (vis[v] != i && id[v] == -1 && v != root) { vis[v] = i; v = pre[v]; }
            if (v != root && id[v] == -1) {
                for (int u = pre[v]; u != v; u = pre[u]) id[u] = cnt;
                id[v] = cnt++;
            }
        }
        if (cnt == 0) return ans;
        for (int i = 0; i < n; i++) if (id[i] == -1) id[i] = cnt++;
        for (int[] e : edges) {
            int uu = id[e[0]], vv = id[e[1]];
            int w = e[2] - (uu != vv ? (int) in[e[1]] : 0);
            e[0] = uu; e[1] = vv; e[2] = w;
        }
        n = cnt; root = id[root];
    }
}`
  };

  S.topo_kahn = {
    cpp: `// Kahn：入度为 0 入队，出队后删除其出边（目标入度 -1）
vector<int> topoSort(int n, vector<vector<int>>& g) {
    vector<int> deg(n, 0);
    for (int u = 0; u < n; u++) for (int v : g[u]) deg[v]++;
    queue<int> q;
    for (int i = 0; i < n; i++) if (!deg[i]) q.push(i);
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u])
            if (--deg[v] == 0) q.push(v);
    }
    return order.size() == (size_t)n ? order : vector<int>{};   // 空 = 有环
}`,
    py: `from collections import deque

def topo_sort(n, g):
    deg = [0] * n
    for u in range(n):
        for v in g[u]:
            deg[v] += 1
    q = deque([i for i in range(n) if deg[i] == 0])
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in g[u]:
            deg[v] -= 1
            if deg[v] == 0:
                q.append(v)
    return order if len(order) == n else None   # None = 存在环`,
    java: `List<Integer> topoSort(int n, List<List<Integer>> g) {
    int[] deg = new int[n];
    for (int u = 0; u < n; u++)
        for (int v : g.get(u)) deg[v]++;
    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (deg[i] == 0) q.add(i);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.poll();
        order.add(u);
        for (int v : g.get(u))
            if (--deg[v] == 0) q.add(v);
    }
    return order.size() == n ? order : null;
}`
  };

  S.topo_dfs = {
    cpp: `// DFS 逆后序：按完成时间从大到小排列；遇到灰色点说明有环
bool dfs(int u, vector<vector<int>>& g, vector<int>& color, vector<int>& order) {
    color[u] = 1;                            // 1 = 递归中
    for (int v : g[u]) {
        if (color[v] == 1) return false;     // 后向边 -> 有环
        if (color[v] == 0 && !dfs(v, g, color, order)) return false;
    }
    color[u] = 2;
    order.push_back(u);                      // 后序：完成时入列
    return true;
}
vector<int> topoDFS(int n, vector<vector<int>>& g) {
    vector<int> color(n, 0), order;
    for (int i = 0; i < n; i++)
        if (!color[i] && !dfs(i, g, color, order)) return {};
    reverse(order.begin(), order.end());     // 逆后序即拓扑序
    return order;
}`,
    py: `def topo_dfs(n, g):
    color = [0] * n               # 0 白 / 1 灰 / 2 黑
    order = []

    def dfs(u):
        color[u] = 1
        for v in g[u]:
            if color[v] == 1:     # 后向边 → 有环
                return False
            if color[v] == 0 and not dfs(v):
                return False
        color[u] = 2
        order.append(u)           # 完成时间递增
        return True

    for i in range(n):
        if color[i] == 0 and not dfs(i):
            return None
    return order[::-1]            # 逆后序`,
    java: `boolean dfs(int u, List<List<Integer>> g, int[] color, List<Integer> order) {
    color[u] = 1;
    for (int v : g.get(u)) {
        if (color[v] == 1) return false;
        if (color[v] == 0 && !dfs(v, g, color, order)) return false;
    }
    color[u] = 2;
    order.add(u);
    return true;
}
List<Integer> topoDFS(int n, List<List<Integer>> g) {
    int[] color = new int[n];
    List<Integer> order = new ArrayList<>();
    for (int i = 0; i < n; i++)
        if (color[i] == 0 && !dfs(i, g, color, order)) return null;
    Collections.reverse(order);
    return order;
}`
  };

  S.aoe_cpm = {
    cpp: `// AOE 关键路径：正向 ve、逆向 vl，边松弛量 l - e == 0 即关键活动
void criticalPath(int n, vector<array<int,3>>& acts, vector<int>& ve, vector<int>& vl) {
    ve.assign(n, 0);
    for (int k = 0; k < n; k++)                       // 拓扑序正向递推
        for (auto& [u, v, w] : acts) ve[v] = max(ve[v], ve[u] + w);
    int T = *max_element(ve.begin(), ve.end());
    vl.assign(n, T);
    for (int k = n - 1; k >= 0; k--)                  // 逆拓扑序反向递推
        for (auto& [u, v, w] : acts) vl[u] = min(vl[u], vl[v] - w);
    for (auto& [u, v, w] : acts) {
        int e = ve[u], l = vl[v] - w;
        if (e == l) { /* 关键活动：slack = 0 */ }
    }
}`,
    py: `def critical_path(n, acts, order):
    ve = [0] * n
    for u in order:                       # 正拓扑序
        for a, b, w in acts:
            if a == u:
                ve[b] = max(ve[b], ve[a] + w)
    total = max(ve)
    vl = [total] * n
    for u in reversed(order):             # 逆拓扑序
        for a, b, w in acts:
            if a == u:
                vl[a] = min(vl[a], vl[b] - w)
    key = [(a, b, w) for a, b, w in acts if ve[a] == vl[b] - w]
    return ve, vl, key                    # key 即关键活动`,
    java: `void criticalPath(int n, int[][] acts, int[] order, int[] ve, int[] vl) {
    Arrays.fill(ve, 0);
    for (int u : order)
        for (int[] a : acts)
            if (a[0] == u) ve[a[1]] = Math.max(ve[a[1]], ve[u] + a[2]);
    int total = Arrays.stream(ve).max().getAsInt();
    Arrays.fill(vl, total);
    for (int i = n - 1; i >= 0; i--) {
        int u = order[i];
        for (int[] a : acts)
            if (a[0] == u) vl[u] = Math.min(vl[u], vl[a[1]] - a[2]);
    }
}`
  };
})();
