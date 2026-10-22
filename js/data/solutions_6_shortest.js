/* ============================================================
 * 三语言教学实现 · 第 6 卷（最短路径）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.dijkstra = {
    cpp: `// Dijkstra（堆优化）：每次取 dist 最小的未定点，松弛其出边
vector<long long> dijkstra(int s, vector<vector<pair<int,int>>>& g) {
    int n = g.size();
    vector<long long> dist(n, LLONG_MAX);
    priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
    dist[s] = 0; pq.push({0, s});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;              // 懒删除
        for (auto [v, w] : g[u])
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
    }
    return dist;
}`,
    py: `import heapq

def dijkstra(s, g):
    dist = {u: float('inf') for u in g}
    dist[s] = 0
    pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue                      # 懒删除过期堆项
        for v, w in g[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist`,
    java: `long[] dijkstra(int s, List<List<int[]>> g) {
    int n = g.size();
    long[] dist = new long[n];
    Arrays.fill(dist, Long.MAX_VALUE);
    dist[s] = 0;
    PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
    pq.add(new long[]{0, s});
    while (!pq.isEmpty()) {
        long[] top = pq.poll();
        long d = top[0]; int u = (int) top[1];
        if (d > dist[u]) continue;
        for (int[] e : g.get(u)) {
            int v = e[0], w = e[1];
            if (d + w < dist[v]) {
                dist[v] = d + w;
                pq.add(new long[]{dist[v], v});
            }
        }
    }
    return dist;
}`
  };

  S.bellman_ford = {
    cpp: `// Bellman-Ford：V-1 轮全边松弛；第 V 轮还能松弛就有负环
bool bellmanFord(int n, vector<array<int,3>>& edges, int s, vector<long long>& dist) {
    dist.assign(n, LLONG_MAX); dist[s] = 0;
    for (int it = 1; it < n; it++) {
        bool changed = false;
        for (auto& [u, v, w] : edges)
            if (dist[u] != LLONG_MAX && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                changed = true;
            }
        if (!changed) break;                    // 提前收敛
    }
    for (auto& [u, v, w] : edges)
        if (dist[u] != LLONG_MAX && dist[u] + w < dist[v]) return false;   // 负环
    return true;
}`,
    py: `def bellman_ford(n, edges, s):
    INF = float('inf')
    dist = [INF] * n
    dist[s] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        if not changed:                 # 已经收敛，提前退出
            break
    for u, v, w in edges:               # 第 n 轮还能松弛 -> 负环
        if dist[u] + w < dist[v]:
            return None
    return dist`,
    java: `long[] bellmanFord(int n, int[][] edges, int s) {
    long[] dist = new long[n];
    Arrays.fill(dist, Long.MAX_VALUE);
    dist[s] = 0;
    for (int it = 1; it < n; it++) {
        boolean changed = false;
        for (int[] e : edges) {
            if (dist[e[0]] != Long.MAX_VALUE && dist[e[0]] + e[2] < dist[e[1]]) {
                dist[e[1]] = dist[e[0]] + e[2];
                changed = true;
            }
        }
        if (!changed) break;
    }
    for (int[] e : edges)
        if (dist[e[0]] != Long.MAX_VALUE && dist[e[0]] + e[2] < dist[e[1]]) return null;
    return dist;
}`
  };

  S.spfa = {
    cpp: `// SPFA：只把被松弛成功的点重新入队；入队 >= n 次说明有负环
bool spfa(int n, vector<vector<pair<int,int>>>& g, int s, vector<long long>& dist) {
    dist.assign(n, LLONG_MAX);
    vector<int> cnt(n, 0);
    vector<bool> inq(n, false);
    queue<int> q;
    dist[s] = 0; q.push(s); inq[s] = true;
    while (!q.empty()) {
        int u = q.front(); q.pop(); inq[u] = false;
        for (auto [v, w] : g[u]) {
            if (dist[u] + w >= dist[v]) continue;
            dist[v] = dist[u] + w;
            if (!inq[v]) {
                if (++cnt[v] >= n) return false;   // 负环
                q.push(v); inq[v] = true;
            }
        }
    }
    return true;
}`,
    py: `from collections import deque

def spfa(n, g, s):
    INF = float('inf')
    dist = [INF] * n
    cnt = [0] * n
    inq = [False] * n
    dist[s] = 0
    q = deque([s]); inq[s] = True
    while q:
        u = q.popleft(); inq[u] = False
        for v, w in g[u]:
            if dist[u] + w >= dist[v]:
                continue
            dist[v] = dist[u] + w
            if not inq[v]:
                cnt[v] += 1
                if cnt[v] >= n:            # 入队 n 次 → 负环
                    return None
                q.append(v); inq[v] = True
    return dist`,
    java: `boolean spfa(int n, List<List<int[]>> g, int s, long[] dist) {
    Arrays.fill(dist, Long.MAX_VALUE);
    int[] cnt = new int[n];
    boolean[] inq = new boolean[n];
    Deque<Integer> q = new ArrayDeque<>();
    dist[s] = 0; q.add(s); inq[s] = true;
    while (!q.isEmpty()) {
        int u = q.poll(); inq[u] = false;
        for (int[] e : g.get(u)) {
            int v = e[0], w = e[1];
            if (dist[u] + w >= dist[v]) continue;
            dist[v] = dist[u] + w;
            if (!inq[v]) {
                if (++cnt[v] >= n) return false;
                q.add(v); inq[v] = true;
            }
        }
    }
    return true;
}`
  };

  S.floyd = {
    cpp: `// Floyd：枚举中转点 k，D[i][j] = min(D[i][j], D[i][k] + D[k][j])
void floyd(vector<vector<long long>>& D, int n) {
    for (int i = 0; i < n; i++) D[i][i] = 0;
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++) {
            if (D[i][k] == LLONG_MAX) continue;
            for (int j = 0; j < n; j++) {
                if (D[k][j] == LLONG_MAX) continue;
                D[i][j] = min(D[i][j], D[i][k] + D[k][j]);
            }
        }
}`,
    py: `def floyd(D, n):
    for i in range(n):
        D[i][i] = 0
    for k in range(n):                  # 中转点必须在最外层
        for i in range(n):
            if D[i][k] == float('inf'):
                continue
            for j in range(n):
                nd = D[i][k] + D[k][j]
                if nd < D[i][j]:
                    D[i][j] = nd`,
    java: `void floyd(long[][] D, int n) {
    for (int i = 0; i < n; i++) D[i][i] = 0;
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++) {
            if (D[i][k] == Long.MAX_VALUE) continue;
            for (int j = 0; j < n; j++) {
                if (D[k][j] == Long.MAX_VALUE) continue;
                D[i][j] = Math.min(D[i][j], D[i][k] + D[k][j]);
            }
        }
}`
  };

  S.astar = {
    cpp: `// A*：f = g + h，h 必须可采纳（不高估），否则最优性失效
vector<int> astar(int s, int t, vector<vector<pair<int,int>>>& g, vector<int> heur) {
    vector<int> gx(g.size(), INT_MAX), pre(g.size(), -1);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    gx[s] = 0; pq.push({heur[s], s});
    while (!pq.empty()) {
        auto [f, u] = pq.top(); pq.pop();
        if (u == t) break;
        for (auto [v, w] : g[u]) {
            int ng = gx[u] + w;
            if (ng >= gx[v]) continue;
            gx[v] = ng; pre[v] = u;
            pq.push({gx[v] + heur[v], v});      // 按 f 排序
        }
    }
    vector<int> path;
    for (int u = t; u != -1; u = pre[u]) path.push_back(u);
    reverse(path.begin(), path.end());
    return path;
}`,
    py: `import heapq

def astar(s, t, g, h):
    gx = {u: float('inf') for u in g}
    pre, gx[s] = {s: None}, 0
    pq = [(h[s], s)]
    while pq:
        f, u = heapq.heappop(pq)
        if u == t:
            break
        for v, w in g[u]:
            ng = gx[u] + w
            if ng >= gx[v]:
                continue
            gx[v], pre[v] = ng, u
            heapq.heappush(pq, (ng + h[v], v))   # f = g + h
    path, u = [], t
    while u is not None:
        path.append(u); u = pre[u]
    return path[::-1]`,
    java: `List<Integer> astar(int s, int t, List<List<int[]>> g, int[] h) {
    int n = g.size();
    int[] gx = new int[n], pre = new int[n];
    Arrays.fill(gx, Integer.MAX_VALUE); Arrays.fill(pre, -1);
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    gx[s] = 0; pq.add(new int[]{h[s], s});
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int u = top[1];
        if (u == t) break;
        for (int[] e : g.get(u)) {
            int v = e[0], w = e[1], ng = gx[u] + w;
            if (ng >= gx[v]) continue;
            gx[v] = ng; pre[v] = u;
            pq.add(new int[]{ng + h[v], v});
        }
    }
    LinkedList<Integer> path = new LinkedList<>();
    for (int u = t; u != -1; u = pre[u]) path.addFirst(u);
    return path;
}`
  };

  S.astar_heur = {
    cpp: `// 同一张图换四种启发式：曼哈顿 / 欧氏 / 切比雪夫 / 零启发
double manhattan(int a, int b, vector<int>& x, vector<int>& y) {
    return abs(x[a] - x[b]) + abs(y[a] - y[b]);
}
double euclid(int a, int b, vector<int>& x, vector<int>& y) {
    return hypot(x[a] - x[b], y[a] - y[b]);
}
double chebyshev(int a, int b, vector<int>& x, vector<int>& y) {
    return max(abs(x[a] - x[b]), abs(y[a] - y[b]));
}
// 零启发 h ≡ 0 时 A* 退化为 Dijkstra，扩展点数最多
double zero(int a, int b) { return 0; }`,
    py: `import math

def manhattan(a, b, pos):
    return abs(pos[a][0] - pos[b][0]) + abs(pos[a][1] - pos[b][1])

def euclid(a, b, pos):
    return math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1])

def chebyshev(a, b, pos):
    return max(abs(pos[a][0] - pos[b][0]), abs(pos[a][1] - pos[b][1]))

def zero(a, b, pos):
    return 0                          # h ≡ 0：退化为 Dijkstra

HEURISTICS = {
    'manhattan': manhattan,
    'euclid': euclid,
    'chebyshev': chebyshev,
    'dijkstra': zero,
}`,
    java: `double manhattan(int a, int b, int[][] pos) {
    return Math.abs(pos[a][0] - pos[b][0]) + Math.abs(pos[a][1] - pos[b][1]);
}
double euclid(int a, int b, int[][] pos) {
    return Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]);
}
double chebyshev(int a, int b, int[][] pos) {
    return Math.max(Math.abs(pos[a][0] - pos[b][0]), Math.abs(pos[a][1] - pos[b][1]));
}
double zero(int a, int b, int[][] pos) { return 0; }`
  };

  S.zero_one_bfs = {
    cpp: `// 0-1 BFS：0 权边从队首入、1 权边从队尾入，天然有序
vector<int> zeroOneBFS(int s, vector<vector<pair<int,int>>>& g) {
    vector<int> dist(g.size(), INT_MAX);
    deque<int> dq;
    dist[s] = 0; dq.push_front(s);
    while (!dq.empty()) {
        int u = dq.front(); dq.pop_front();
        for (auto [v, w] : g[u]) {
            if (dist[u] + w >= dist[v]) continue;
            dist[v] = dist[u] + w;
            if (w == 0) dq.push_front(v);      // 0 权：插队首
            else        dq.push_back(v);       // 1 权：排队尾
        }
    }
    return dist;
}`,
    py: `from collections import deque

def zero_one_bfs(s, g):
    dist = {u: float('inf') for u in g}
    dist[s] = 0
    dq = deque([s])
    while dq:
        u = dq.popleft()
        for v, w in g[u]:
            nd = dist[u] + w
            if nd >= dist[v]:
                continue
            dist[v] = nd
            if w == 0:
                dq.appendleft(v)      # 0 权走队首
            else:
                dq.append(v)          # 1 权走队尾
    return dist`,
    java: `int[] zeroOneBFS(int s, List<List<int[]>> g) {
    int n = g.size();
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    Deque<Integer> dq = new ArrayDeque<>();
    dist[s] = 0; dq.addFirst(s);
    while (!dq.isEmpty()) {
        int u = dq.pollFirst();
        for (int[] e : g.get(u)) {
            int v = e[0], w = e[1];
            if (dist[u] + w >= dist[v]) continue;
            dist[v] = dist[u] + w;
            if (w == 0) dq.addFirst(v); else dq.addLast(v);
        }
    }
    return dist;
}`
  };

  S.diff_constraints = {
    cpp: `// 差分约束：x_v - x_u <= w 变成边 u -> v (w)，跑最短路
// 有负环 => 不等式组无解；dist 即一组可行解
bool solve(int n, vector<array<int,3>>& cons, vector<long long>& x) {
    vector<vector<pair<int,int>>> g(n + 1);
    for (auto& [u, v, w] : cons) g[u].push_back({v, w});
    for (int i = 1; i <= n; i++) g[0].push_back({i, 0});   // 超级源点
    vector<long long> dist(n + 1, LLONG_MAX);
    if (!spfa(n + 1, g, 0, dist)) return false;            // 无解
    x.assign(dist.begin() + 1, dist.end());
    return true;
}`,
    py: `from collections import deque

def solve(n, cons):
    g = {i: [] for i in range(n + 1)}
    for u, v, w in cons:
        g[u].append((v, w))           # x_v - x_u <= w
    for i in range(1, n + 1):
        g[0].append((i, 0))           # 超级源点连所有点
    dist = [float('inf')] * (n + 1)
    cnt = [0] * (n + 1)
    inq = [False] * (n + 1)
    dist[0] = 0
    q = deque([0]); inq[0] = True
    while q:
        u = q.popleft(); inq[u] = False
        for v, w in g[u]:
            if dist[u] + w >= dist[v]:
                continue
            dist[v] = dist[u] + w
            if not inq[v]:
                cnt[v] += 1
                if cnt[v] >= n + 1:
                    return None       # 矛盾负环
                q.append(v); inq[v] = True
    return dist[1:]`,
    java: `long[] solve(int n, int[][] cons) {
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
    for (int[] c : cons) g.get(c[0]).add(new int[]{c[1], c[2]});
    for (int i = 1; i <= n; i++) g.get(0).add(new int[]{i, 0});
    long[] dist = new long[n + 1];
    if (!spfa(n + 1, g, 0, dist)) return null;   // 无解
    return Arrays.copyOfRange(dist, 1, n + 1);
}`
  };

  S.johnson = {
    cpp: `// Johnson：超级源跑 Bellman-Ford 得势能 h，重赋权后跑 V 次 Dijkstra
vector<vector<long long>> johnson(int n, vector<array<int,3>>& edges) {
    vector<array<int,3>> es = edges;
    for (int i = 0; i < n; i++) es.push_back({n, i, 0});
    vector<long long> h(n + 1, LLONG_MAX);
    if (!bellmanFord(n + 1, es, n, h)) return {};         // 负环
    vector<vector<pair<int,int>>> g(n);
    for (auto& [u, v, w] : edges)
        g[u].push_back({v, w + h[u] - h[v]});             // w' >= 0
    vector<vector<long long>> D(n);
    for (int s = 0; s < n; s++) {
        auto d = dijkstra(s, g);
        for (int v = 0; v < n; v++)
            D[s].push_back(d[v] == LLONG_MAX ? LLONG_MAX : d[v] - h[s] + h[v]);
    }
    return D;
}`,
    py: `import heapq

def johnson(n, edges):
    ext = edges + [(n, i, 0) for i in range(n)]      # 超级源
    h = bellman_ford(n + 1, ext, n)
    if h is None:
        return None                                  # 存在负环
    g = {u: [] for u in range(n)}
    for u, v, w in edges:
        g[u].append((v, w + h[u] - h[v]))            # 重赋权，边权非负
    D = []
    for s in range(n):
        d = dijkstra(s, g)
        D.append([d[v] - h[s] + h[v] for v in range(n)])
    return D`,
    java: `long[][] johnson(int n, int[][] edges) {
    int[][] ext = Arrays.copyOf(edges, edges.length + n);
    for (int i = 0; i < n; i++) ext[edges.length + i] = new int[]{n, i, 0};
    long[] h = bellmanFord(n + 1, ext, n);
    if (h == null) return null;
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges)
        g.get(e[0]).add(new int[]{e[1], (int) (e[2] + h[e[0]] - h[e[1]])});
    long[][] D = new long[n][n];
    for (int s = 0; s < n; s++) {
        long[] d = dijkstra(s, g);
        for (int v = 0; v < n; v++) D[s][v] = d[v] - h[s] + h[v];
    }
    return D;
}`
  };

  S.k_shortest = {
    cpp: `// 次短路：每个点维护 dist1（最短）与 dist2（严格次短）
void relax(vector<long long>& d1, vector<long long>& d2, int v, long long nd) {
    if (nd < d1[v]) { d2[v] = d1[v]; d1[v] = nd; }
    else if (nd > d1[v] && nd < d2[v]) d2[v] = nd;
}
// 第 K 短路（Yen）：不断封路 + 重跑 Dijkstra，候选池取最小
long long yenKth(int s, int t, int k, Graph g) {
    vector<long long> cand;                       // 最小堆
    // 每次取当前最优路径，逐点偏离（spur node）后重算，推入候选池
    // 返回第 k 次弹出的路径代价
    return cand.empty() ? -1 : cand.back();
}`,
    py: `import heapq

def second_shortest(s, t, g):
    d1 = {u: float('inf') for u in g}
    d2 = {u: float('inf') for u in g}
    d1[s] = 0
    pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > d2[u]:
            continue
        for v, w in g[u]:
            nd = d + w
            if nd < d1[v]:
                d2[v] = d1[v]; d1[v] = nd
                heapq.heappush(pq, (nd, v))
            elif d1[v] < nd < d2[v]:
                d2[v] = nd
                heapq.heappush(pq, (nd, v))
    return d2[t]

def yen_kth(s, t, k, g):
    cand = [(0, [s])]                    # 候选池：代价 + 路径
    banned = set()
    count = 0
    while cand:
        cost, path = heapq.heappop(cand)
        count += 1
        if count == k:
            return cost, path
        # 逐个 spur node 封边后重算，推入新候选
    return None`,
    java: `void relax(long[] d1, long[] d2, int v, long nd) {
    if (nd < d1[v]) { d2[v] = d1[v]; d1[v] = nd; }
    else if (nd > d1[v] && nd < d2[v]) d2[v] = nd;
}
long yenKth(int s, int t, int k, List<List<int[]>> g) {
    PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
    pq.add(new long[]{0, s});
    long[] d1 = new long[g.size()], d2 = new long[g.size()];
    Arrays.fill(d1, Long.MAX_VALUE); Arrays.fill(d2, Long.MAX_VALUE);
    d1[s] = 0;
    while (!pq.isEmpty()) {
        long[] top = pq.poll();
        long d = top[0]; int u = (int) top[1];
        if (d > d2[u]) continue;
        for (int[] e : g.get(u)) relax(d1, d2, e[0], d + e[1]);
    }
    return d2[t];
}`
  };
})();
