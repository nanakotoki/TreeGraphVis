/* ============================================================
 * 三语言教学实现 · 第 9 卷（匹配 / 网络流）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.bip_color = {
    cpp: `// 二分图判定：BFS 交替染色，撞色即有奇环
bool isBipartite(int n, vector<vector<int>>& g, vector<int>& color) {
    color.assign(n, -1);
    for (int s = 0; s < n; s++) {
        if (color[s] != -1) continue;
        queue<int> q; q.push(s); color[s] = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : g[u]) {
                if (color[v] == -1) { color[v] = color[u] ^ 1; q.push(v); }
                else if (color[v] == color[u]) return false;    // 冲突
            }
        }
    }
    return true;
}`,
    py: `from collections import deque

def is_bipartite(n, g):
    color = [-1] * n
    for s in range(n):
        if color[s] != -1:
            continue
        color[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for v in g[u]:
                if color[v] == -1:
                    color[v] = color[u] ^ 1
                    q.append(v)
                elif color[v] == color[u]:
                    return False, color      # 撞色 → 奇环
    return True, color`,
    java: `boolean isBipartite(int n, List<List<Integer>> g, int[] color) {
    Arrays.fill(color, -1);
    for (int s = 0; s < n; s++) {
        if (color[s] != -1) continue;
        Deque<Integer> q = new ArrayDeque<>();
        q.add(s); color[s] = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : g.get(u)) {
                if (color[v] == -1) { color[v] = color[u] ^ 1; q.add(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}`
  };

  S.ff_ek = {
    cpp: `// Edmonds-Karp：BFS 找增广路，沿路推瓶颈流量（含反向退流）
long long maxflow(int n, vector<vector<int>>& cap, int S, int T) {
    long long flow = 0;
    while (true) {
        vector<int> pre(n, -1); queue<int> q;
        q.push(S); pre[S] = S;
        while (!q.empty() && pre[T] == -1) {
            int u = q.front(); q.pop();
            for (int v = 0; v < n; v++)
                if (pre[v] == -1 && cap[u][v] > 0) { pre[v] = u; q.push(v); }
        }
        if (pre[T] == -1) break;                    // 无增广路
        int add = INT_MAX;
        for (int v = T; v != S; v = pre[v]) add = min(add, cap[pre[v]][v]);
        for (int v = T; v != S; v = pre[v]) {       // 更新残余容量
            cap[pre[v]][v] -= add;
            cap[v][pre[v]] += add;                  // 反向边
        }
        flow += add;
    }
    return flow;
}`,
    py: `from collections import deque

def max_flow(n, cap, s, t):
    flow = 0
    while True:
        pre = [-1] * n
        pre[s] = s
        q = deque([s])
        while q and pre[t] == -1:
            u = q.popleft()
            for v in range(n):
                if pre[v] == -1 and cap[u][v] > 0:
                    pre[v] = u
                    q.append(v)
        if pre[t] == -1:
            break
        add = float('inf')
        v = t
        while v != s:
            add = min(add, cap[pre[v]][v])
            v = pre[v]
        v = t
        while v != s:                    # 正向减、反向加
            cap[pre[v]][v] -= add
            cap[v][pre[v]] += add
            v = pre[v]
        flow += add
    return flow`,
    java: `long maxflow(int n, int[][] cap, int S, int T) {
    long flow = 0;
    while (true) {
        int[] pre = new int[n];
        Arrays.fill(pre, -1);
        Deque<Integer> q = new ArrayDeque<>();
        q.add(S); pre[S] = S;
        while (!q.isEmpty() && pre[T] == -1) {
            int u = q.poll();
            for (int v = 0; v < n; v++)
                if (pre[v] == -1 && cap[u][v] > 0) { pre[v] = u; q.add(v); }
        }
        if (pre[T] == -1) break;
        int add = Integer.MAX_VALUE;
        for (int v = T; v != S; v = pre[v]) add = Math.min(add, cap[pre[v]][v]);
        for (int v = T; v != S; v = pre[v]) {
            cap[pre[v]][v] -= add;
            cap[v][pre[v]] += add;
        }
        flow += add;
    }
    return flow;
}`
  };

  S.dinic = {
    cpp: `// Dinic：BFS 分层 + DFS 多路增广，当前弧跳过已榨干的分支
struct Edge { int to, cap, rev; };
vector<vector<Edge>> g;
int level[N], cur[N];
bool bfs(int s, int t) {
    fill(level, level + N, -1);
    queue<int> q; q.push(s); level[s] = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (auto& e : g[u])
            if (e.cap > 0 && level[e.to] < 0) { level[e.to] = level[u] + 1; q.push(e.to); }
    }
    return level[t] >= 0;
}
int dfs(int u, int t, int f) {
    if (u == t) return f;
    for (int& i = cur[u]; i < (int)g[u].size(); i++) {
        Edge& e = g[u][i];
        if (e.cap <= 0 || level[e.to] != level[u] + 1) continue;
        int d = dfs(e.to, t, min(f, e.cap));
        if (d > 0) { e.cap -= d; g[e.to][e.rev].cap += d; return d; }
    }
    return 0;
}`,
    py: `from collections import deque

class Dinic:
    def __init__(self, n):
        self.n = n
        self.g = [[] for _ in range(n)]

    def add(self, u, v, c):
        self.g[u].append([v, c, len(self.g[v])])
        self.g[v].append([u, 0, len(self.g[u]) - 1])   # 反向边容量 0

    def bfs(self, s, t):
        self.level = [-1] * self.n
        self.level[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for v, c, _ in self.g[u]:
                if c > 0 and self.level[v] < 0:
                    self.level[v] = self.level[u] + 1
                    q.append(v)
        return self.level[t] >= 0

    def dfs(self, u, t, f):
        if u == t:
            return f
        while self.cur[u] < len(self.g[u]):        # 当前弧优化
            e = self.g[u][self.cur[u]]
            v, c, r = e
            if c > 0 and self.level[v] == self.level[u] + 1:
                d = self.dfs(v, t, min(f, c))
                if d > 0:
                    e[1] -= d
                    self.g[v][r][1] += d
                    return d
            self.cur[u] += 1
        return 0`,
    java: `class Dinic {
    int n; List<int[]>[] g; int[] level, cur;
    Dinic(int n) {
        this.n = n; g = new List[n];
        for (int i = 0; i < n; i++) g[i] = new ArrayList<>();
    }
    void add(int u, int v, int c) {
        g[u].add(new int[]{v, c, g[v].size()});
        g[v].add(new int[]{u, 0, g[u].size() - 1});
    }
    boolean bfs(int s, int t) {
        level = new int[n]; Arrays.fill(level, -1);
        level[s] = 0;
        Deque<Integer> q = new ArrayDeque<>(); q.add(s);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int[] e : g[u])
                if (e[1] > 0 && level[e[0]] < 0) { level[e[0]] = level[u] + 1; q.add(e[0]); }
        }
        return level[t] >= 0;
    }
    int dfs(int u, int t, int f) {
        if (u == t) return f;
        for (; cur[u] < g[u].size(); cur[u]++) {
            int[] e = g[u].get(cur[u]);
            if (e[1] <= 0 || level[e[0]] != level[u] + 1) continue;
            int d = dfs(e[0], t, Math.min(f, e[1]));
            if (d > 0) { e[1] -= d; g[e[0]].get(e[2])[1] += d; return d; }
        }
        return 0;
    }
}`
  };

  S.min_cut = {
    cpp: `// 最小割：最大流结束后从 S 沿残余容量 > 0 的边泛洪，割开两侧即最小割
long long minCut(int n, vector<vector<int>>& cap, int S, int T, vector<int>& side) {
    long long flow = maxflow(n, cap, S, T);       // 先跑最大流
    side.assign(n, 0);
    queue<int> q; q.push(S); side[S] = 1;
    while (!q.empty()) {                          // 残余网络可达集 = S 侧
        int u = q.front(); q.pop();
        for (int v = 0; v < n; v++)
            if (!side[v] && cap[u][v] > 0) { side[v] = 1; q.push(v); }
    }
    return flow;                                  // 割容量 == 最大流
}`,
    py: `from collections import deque

def min_cut(n, cap, s, t):
    flow = max_flow(n, cap, s, t)      # 先求最大流
    side = [False] * n
    side[s] = True
    q = deque([s])
    while q:                           # 残量网络可达集 = S 侧
        u = q.popleft()
        for v in range(n):
            if not side[v] and cap[u][v] > 0:
                side[v] = True
                q.append(v)
    cut = [(u, v) for u in range(n) for v in range(n)
           if side[u] and not side[v] and cap[u][v] == 0]
    return flow, side, cut             # 割容量 = 最大流`,
    java: `long minCut(int n, int[][] cap, int S, int T, boolean[] side) {
    long flow = maxflow(n, cap, S, T);
    Deque<Integer> q = new ArrayDeque<>();
    q.add(S); side[S] = true;
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v = 0; v < n; v++)
            if (!side[v] && cap[u][v] > 0) { side[v] = true; q.add(v); }
    }
    return flow;
}`
  };

  S.mcmf = {
    cpp: `// MCMF（SSP）：每次沿单位费用最短路增广，直到无路可走
long long minCostFlow(int n, vector<vector<Edge>>& g, int S, int T, long long& cost) {
    long long flow = 0; cost = 0;
    while (true) {
        vector<long long> dist(n, LLONG_MAX);
        vector<int> inq(n, 0), pre(n, -1), preE(n, -1);
        queue<int> q; dist[S] = 0; q.push(S); inq[S] = 1;
        while (!q.empty()) {                        // SPFA 找最小费用路
            int u = q.front(); q.pop(); inq[u] = 0;
            for (int i = 0; i < (int)g[u].size(); i++) {
                Edge& e = g[u][i];
                if (e.cap > 0 && dist[u] + e.cost < dist[e.to]) {
                    dist[e.to] = dist[u] + e.cost; pre[e.to] = u; preE[e.to] = i;
                    if (!inq[e.to]) { q.push(e.to); inq[e.to] = 1; }
                }
            }
        }
        if (dist[T] == LLONG_MAX) break;
        int add = INT_MAX;
        for (int v = T; v != S; v = pre[v]) add = min(add, g[pre[v]][preE[v]].cap);
        for (int v = T; v != S; v = pre[v]) {
            Edge& e = g[pre[v]][preE[v]];
            e.cap -= add; g[v][e.rev].cap += add;
        }
        flow += add; cost += (long long)add * dist[T];
    }
    return flow;
}`,
    py: `from collections import deque

def min_cost_flow(n, g, s, t):
    """g[u] 里存 [v, cap, cost, rev]；返回 (flow, cost)"""
    flow = cost = 0
    while True:
        INF = float('inf')
        dist = [INF] * n
        inq = [False] * n
        pre, pre_e = [-1] * n, [-1] * n
        dist[s] = 0
        q = deque([s]); inq[s] = True
        while q:                              # SPFA 最小费用路
            u = q.popleft(); inq[u] = False
            for i, e in enumerate(g[u]):
                v, cap, w, _ = e
                if cap > 0 and dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    pre[v], pre_e[v] = u, i
                    if not inq[v]:
                        q.append(v); inq[v] = True
        if dist[t] == INF:
            break
        add = INF
        v = t
        while v != s:
            add = min(add, g[pre[v]][pre_e[v]][1])
            v = pre[v]
        v = t
        while v != s:
            e = g[pre[v]][pre_e[v]]
            e[1] -= add
            g[v][e[3]][1] += add
            v = pre[v]
        flow += add
        cost += add * dist[t]
    return flow, cost`,
    java: `long[] minCostFlow(int n, List<List<int[]>> g, int S, int T) {
    long flow = 0, cost = 0;
    while (true) {
        long[] dist = new long[n]; int[] pre = new int[n], preE = new int[n];
        Arrays.fill(dist, Long.MAX_VALUE); Arrays.fill(pre, -1);
        boolean[] inq = new boolean[n];
        Deque<Integer> q = new ArrayDeque<>();
        dist[S] = 0; q.add(S); inq[S] = true;
        while (!q.isEmpty()) {
            int u = q.poll(); inq[u] = false;
            List<int[]> es = g.get(u);
            for (int i = 0; i < es.size(); i++) {
                int[] e = es.get(i);
                if (e[1] > 0 && dist[u] + e[2] < dist[e[0]]) {
                    dist[e[0]] = dist[u] + e[2];
                    pre[e[0]] = u; preE[e[0]] = i;
                    if (!inq[e[0]]) { q.add(e[0]); inq[e[0]] = true; }
                }
            }
        }
        if (dist[T] == Long.MAX_VALUE) break;
        int add = Integer.MAX_VALUE;
        for (int v = T; v != S; v = pre[v]) add = Math.min(add, g.get(pre[v]).get(preE[v])[1]);
        for (int v = T; v != S; v = pre[v]) {
            int[] e = g.get(pre[v]).get(preE[v]);
            e[1] -= add; g.get(v).get(e[3])[1] += add;
        }
        flow += add; cost += (long) add * dist[T];
    }
    return new long[]{flow, cost};
}`
  };

  S.hungarian = {
    cpp: `// 匈牙利：从左部每个点出发找交错路，找到则匹配数 +1
bool dfs(int u, vector<vector<int>>& g, vector<int>& match, vector<bool>& vis) {
    for (int v : g[u]) {
        if (vis[v]) continue;
        vis[v] = true;
        if (match[v] == -1 || dfs(match[v], g, match, vis)) {
            match[v] = u;                     // 腾位置：翻转交错路
            return true;
        }
    }
    return false;
}
int maxMatching(int nl, int nr, vector<vector<int>>& g) {
    vector<int> match(nr, -1);
    int res = 0;
    for (int u = 0; u < nl; u++) {
        vector<bool> vis(nr, false);
        if (dfs(u, g, match, vis)) res++;
    }
    return res;
}`,
    py: `def max_matching(nl, g, nr):
    match = [-1] * nr

    def dfs(u, vis):
        for v in g[u]:
            if vis[v]:
                continue
            vis[v] = True
            if match[v] == -1 or dfs(match[v], vis):
                match[v] = u          # 交错路翻转：换上新的左点
                return True
        return False

    res = 0
    for u in range(nl):
        if dfs(u, [False] * nr):
            res += 1
    return res, match`,
    java: `boolean dfs(int u, List<List<Integer>> g, int[] match, boolean[] vis) {
    for (int v : g.get(u)) {
        if (vis[v]) continue;
        vis[v] = true;
        if (match[v] == -1 || dfs(match[v], g, match, vis)) {
            match[v] = u;
            return true;
        }
    }
    return false;
}
int maxMatching(int nl, int nr, List<List<Integer>> g) {
    int[] match = new int[nr];
    Arrays.fill(match, -1);
    int res = 0;
    for (int u = 0; u < nl; u++)
        if (dfs(u, g, match, new boolean[nr])) res++;
    return res;
}`
  };

  S.km = {
    cpp: `// KM：顶标 lx + ly >= w，相等子图上增广；失败则调整顶标 d
long long km(int n, vector<vector<int>>& w) {          // n x n 完全二分图
    vector<long long> lx(n), ly(n, 0);
    vector<int> matchY(n, -1), slack(n);
    vector<bool> vx(n), vy(n);
    for (int i = 0; i < n; i++) lx[i] = *max_element(w[i].begin(), w[i].end());
    for (int x = 0; x < n; x++) {
        fill(vx.begin(), vx.end(), false); fill(vy.begin(), vy.end(), false);
        fill(slack.begin(), slack.end(), LLONG_MAX);
        while (true) {
            if (dfsKM(x, w, lx, ly, matchY, slack, vx, vy)) break;
            long long d = LLONG_MAX;
            for (int j = 0; j < n; j++) if (!vy[j]) d = min(d, (long long)slack[j]);
            for (int i = 0; i < n; i++) if (vx[i]) lx[i] -= d;
            for (int j = 0; j < n; j++) if (vy[j]) ly[j] += d;
        }
    }
    long long res = 0;
    for (int j = 0; j < n; j++) if (matchY[j] != -1) res += w[matchY[j]][j];
    return res;
}`,
    py: `def km(n, w):
    lx = [max(row) for row in w]
    ly, match_y = [0] * n, [-1] * n

    def dfs(x, vx, vy, slack):
        vx[x] = True
        for y in range(n):
            if vy[y]:
                continue
            gap = lx[x] + ly[y] - w[x][y]
            if gap == 0:                       # 相等子图上的边
                vy[y] = True
                if match_y[y] == -1 or dfs(match_y[y], vx, vy, slack):
                    match_y[y] = x
                    return True
            else:
                slack[y] = min(slack[y], gap)  # 记录松弛量
        return False

    for x in range(n):
        while True:
            vx, vy = [False] * n, [False] * n
            slack = [float('inf')] * n
            if dfs(x, vx, vy, slack):
                break
            d = min(slack[y] for y in range(n) if not vy[y])
            for i in range(n):
                if vx[i]: lx[i] -= d           # S 侧顶标 -d
                if vy[i]: ly[i] += d           # T 侧顶标 +d
    return sum(w[match_y[y]][y] for y in range(n) if match_y[y] != -1)`,
    java: `long km(int n, int[][] w) {
    long[] lx = new long[n], ly = new long[n];
    int[] matchY = new int[n];
    Arrays.fill(matchY, -1);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) lx[i] = Math.max(lx[i], w[i][j]);
    for (int x = 0; x < n; x++) {
        while (true) {
            boolean[] vx = new boolean[n], vy = new boolean[n];
            long[] slack = new long[n];
            Arrays.fill(slack, Long.MAX_VALUE);
            if (dfsKM(x, w, lx, ly, matchY, slack, vx, vy)) break;
            long d = Long.MAX_VALUE;
            for (int j = 0; j < n; j++) if (!vy[j]) d = Math.min(d, slack[j]);
            for (int i = 0; i < n; i++) if (vx[i]) lx[i] -= d;
            for (int j = 0; j < n; j++) if (vy[j]) ly[j] += d;
        }
    }
    long res = 0;
    for (int j = 0; j < n; j++) if (matchY[j] != -1) res += w[matchY[j]][j];
    return res;
}`
  };

  S.hlpp = {
    cpp: `// HLPP：水往低处流。源点抬到 n 高度，Push 归位、Relabel 抬高
void push(int u, int v, vector<vector<Edge>>& g, vector<long long>& ex, vector<int>& h) {
    long long d = min(ex[u], (long long)g[u][?].cap);
    // 找到 u->v 的边，正向减、反向加，ex 转移
}
void relabel(int u, vector<vector<Edge>>& g, vector<int>& h) {
    int mn = INT_MAX;
    for (auto& e : g[u]) if (e.cap > 0) mn = min(mn, h[e.to]);
    h[u] = mn + 1;                              // 抬到最低可推邻居 + 1
}
// 主循环：取出高度最高的活跃点（ex > 0 且非 S/T），
// 能推则推，推不动则 relabel；结束后 ex[T] 即最大流`,
    py: `import heapq

def hlpp(n, cap, s, t):
    h = [0] * n
    ex = [0] * n
    h[s] = n                                  # 源点抬到最高
    for v in range(n):
        if cap[s][v] > 0:
            ex[v] += cap[s][v]; cap[v][s] += cap[s][v]; cap[s][v] = 0
    ex[s] = 0

    def push(u, v):
        d = min(ex[u], cap[u][v])
        cap[u][v] -= d; cap[v][u] += d
        ex[u] -= d; ex[v] += d

    def relabel(u):
        h[u] = min(h[v] for v in range(n) if cap[u][v] > 0) + 1

    pq = [(-h[v], v) for v in range(n) if ex[v] > 0]
    heapq.heapify(pq)
    active = set(v for _, v in pq)
    while pq:
        _, u = heapq.heappop(pq)
        if u in (s, t) or ex[u] <= 0:
            continue
        moved = False
        for v in range(n):
            if cap[u][v] > 0 and h[u] == h[v] + 1:   # 只往低处流
                push(u, v); moved = True
                if ex[v] > 0 and v not in active:
                    heapq.heappush(pq, (-h[v], v)); active.add(v)
                if ex[u] == 0:
                    break
        if ex[u] > 0:
            relabel(u)
            heapq.heappush(pq, (-h[u], u))
        else:
            active.discard(u)
    return ex[t]`,
    java: `long hlpp(int n, int[][] cap, int s, int t) {
    int[] h = new int[n];
    long[] ex = new long[n];
    h[s] = n;
    for (int v = 0; v < n; v++)
        if (cap[s][v] > 0) {
            ex[v] += cap[s][v];
            cap[v][s] += cap[s][v];
            cap[s][v] = 0;
        }
    ex[s] = 0;
    PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> h[b] - h[a]);
    for (int v = 0; v < n; v++) if (ex[v] > 0) pq.add(v);
    while (!pq.isEmpty()) {
        int u = pq.poll();
        if (ex[u] <= 0) continue;
        for (int v = 0; v < n && ex[u] > 0; v++)
            if (cap[u][v] > 0 && h[u] == h[v] + 1) {
                long d = Math.min(ex[u], cap[u][v]);
                cap[u][v] -= d; cap[v][u] += d;
                ex[u] -= d; ex[v] += d;
                if (v != s && v != t && ex[v] > 0) pq.add(v);
            }
        if (ex[u] > 0) {
            int mn = Integer.MAX_VALUE;
            for (int v = 0; v < n; v++) if (cap[u][v] > 0) mn = Math.min(mn, h[v]);
            h[u] = mn + 1;                       // Relabel
            pq.add(u);
        }
    }
    return ex[t];
}`
  };

  S.blossom = {
    cpp: `// 带花树：BFS 建交错树，奇环（花）缩成超级点，继续找增广路
int lca(int a, int b, vector<int>& match, vector<int>& p, vector<int>& base) {
    vector<bool> used(match.size(), false);
    while (true) {
        a = base[a]; used[a] = true;
        if (match[a] == -1) break;
        a = p[match[a]];
    }
    while (true) {
        b = base[b];
        if (used[b]) return b;
        b = p[match[b]];
    }
}
void markPath(int v, int b, int child, vector<int>& match, vector<int>& p,
              vector<int>& base, vector<bool>& blossom) {
    while (base[v] != b) {                     // 把花上所有点染成偶点
        blossom[base[v]] = blossom[base[match[v]]] = true;
        p[v] = child;
        child = match[v];
        v = p[match[v]];
    }
}`,
    py: `def blossom(n, edges):
    match = [-1] * n
    p, base = [-1] * n, list(range(n))

    def lca(a, b):
        used = [False] * n
        while True:
            a = base[a]; used[a] = True
            if match[a] == -1:
                break
            a = p[match[a]]
        while True:
            b = base[b]
            if used[b]:
                return b
            b = p[match[b]]

    def mark_path(v, b, child, blossom):
        while base[v] != b:                    # 花上所有点变成偶点
            blossom[base[v]] = blossom[base[match[v]]] = True
            p[v] = child
            child = match[v]
            v = p[match[v]]

    # BFS 主循环：找到偶点间连边 -> 缩花；找到未匹配点 -> 增广并翻转
    return match`,
    java: `int lca(int a, int b, int[] match, int[] p, int[] base) {
    boolean[] used = new boolean[match.length];
    while (true) {
        a = base[a]; used[a] = true;
        if (match[a] == -1) break;
        a = p[match[a]];
    }
    while (true) {
        b = base[b];
        if (used[b]) return b;
        b = p[match[b]];
    }
}
void markPath(int v, int b, int child, int[] match, int[] p, int[] base, boolean[] blossom) {
    while (base[v] != b) {
        blossom[base[v]] = blossom[base[match[v]]] = true;
        p[v] = child;
        child = match[v];
        v = p[match[v]];
    }
}`
  };
})();
