/* ============================================================
 * 三语言教学实现 · 第 4 卷（区间结构 / LCA / 树的性质）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.segment_tree = {
    cpp: `// 线段树：节点管区间 [l,r]，懒标记下传后再递归
struct Seg {
    int n; vector<long long> sum, lazy;
    void build(int u, int l, int r, vector<int>& a) {
        if (l == r) { sum[u] = a[l]; return; }
        int m = (l + r) / 2;
        build(u * 2, l, m, a); build(u * 2 + 1, m + 1, r, a);
        sum[u] = sum[u * 2] + sum[u * 2 + 1];
    }
    void pushDown(int u, int l, int r) {
        if (!lazy[u]) return;
        int m = (l + r) / 2;
        sum[u * 2] += lazy[u] * (m - l + 1);      lazy[u * 2] += lazy[u];
        sum[u * 2 + 1] += lazy[u] * (r - m);      lazy[u * 2 + 1] += lazy[u];
        lazy[u] = 0;
    }
    void add(int u, int l, int r, int ql, int qr, int v) {
        if (ql <= l && r <= qr) { sum[u] += (long long)v * (r - l + 1); lazy[u] += v; return; }
        pushDown(u, l, r);
        int m = (l + r) / 2;
        if (ql <= m) add(u * 2, l, m, ql, qr, v);
        if (qr > m)  add(u * 2 + 1, m + 1, r, ql, qr, v);
        sum[u] = sum[u * 2] + sum[u * 2 + 1];
    }
};`,
    py: `class SegTree:
    def __init__(self, a):
        self.n = len(a)
        self.sum = [0] * (4 * self.n)
        self.lazy = [0] * (4 * self.n)
        self._build(1, 0, self.n - 1, a)

    def _build(self, u, l, r, a):
        if l == r:
            self.sum[u] = a[l]; return
        m = (l + r) // 2
        self._build(u * 2, l, m, a)
        self._build(u * 2 + 1, m + 1, r, a)
        self.sum[u] = self.sum[u * 2] + self.sum[u * 2 + 1]

    def _push(self, u, l, r):
        if not self.lazy[u]:
            return
        m = (l + r) // 2
        self.sum[u * 2] += self.lazy[u] * (m - l + 1)
        self.sum[u * 2 + 1] += self.lazy[u] * (r - m)
        self.lazy[u * 2] += self.lazy[u]
        self.lazy[u * 2 + 1] += self.lazy[u]
        self.lazy[u] = 0

    def add(self, u, l, r, ql, qr, v):
        if ql <= l and r <= qr:
            self.sum[u] += v * (r - l + 1)
            self.lazy[u] += v
            return
        self._push(u, l, r)
        m = (l + r) // 2
        if ql <= m: self.add(u * 2, l, m, ql, qr, v)
        if qr > m:  self.add(u * 2 + 1, m + 1, r, ql, qr, v)
        self.sum[u] = self.sum[u * 2] + self.sum[u * 2 + 1]`,
    java: `class SegTree {
    int n; long[] sum, lazy;
    SegTree(int[] a) {
        n = a.length; sum = new long[4 * n]; lazy = new long[4 * n];
        build(1, 0, n - 1, a);
    }
    void build(int u, int l, int r, int[] a) {
        if (l == r) { sum[u] = a[l]; return; }
        int m = (l + r) / 2;
        build(u * 2, l, m, a); build(u * 2 + 1, m + 1, r, a);
        sum[u] = sum[u * 2] + sum[u * 2 + 1];
    }
    void push(int u, int l, int r) {
        if (lazy[u] == 0) return;
        int m = (l + r) / 2;
        sum[u * 2] += lazy[u] * (m - l + 1);     lazy[u * 2] += lazy[u];
        sum[u * 2 + 1] += lazy[u] * (r - m);     lazy[u * 2 + 1] += lazy[u];
        lazy[u] = 0;
    }
    void add(int u, int l, int r, int ql, int qr, long v) {
        if (ql <= l && r <= qr) { sum[u] += v * (r - l + 1); lazy[u] += v; return; }
        push(u, l, r);
        int m = (l + r) / 2;
        if (ql <= m) add(u * 2, l, m, ql, qr, v);
        if (qr > m)  add(u * 2 + 1, m + 1, r, ql, qr, v);
        sum[u] = sum[u * 2] + sum[u * 2 + 1];
    }
}`
  };

  S.fenwick = {
    cpp: `// 树状数组：lowbit 决定管辖长度，更新向上、查询向下
struct BIT {
    int n; vector<long long> t;
    BIT(int n) : n(n), t(n + 1, 0) {}
    void add(int i, long long v) {              // i 从 1 开始
        for (; i <= n; i += i & -i) t[i] += v;
    }
    long long sum(int i) {                      // 前缀和 [1..i]
        long long s = 0;
        for (; i > 0; i -= i & -i) s += t[i];
        return s;
    }
    long long range(int l, int r) { return sum(r) - sum(l - 1); }
};`,
    py: `class BIT:
    def __init__(self, n):
        self.n, self.t = n, [0] * (n + 1)

    def add(self, i, v):              # i 从 1 开始
        while i <= self.n:
            self.t[i] += v
            i += i & -i

    def sum(self, i):                 # 前缀和 [1..i]
        s = 0
        while i > 0:
            s += self.t[i]
            i -= i & -i
        return s

    def range(self, l, r):
        return self.sum(r) - self.sum(l - 1)`,
    java: `class BIT {
    int n; long[] t;
    BIT(int n) { this.n = n; t = new long[n + 1]; }
    void add(int i, long v) {
        for (; i <= n; i += i & -i) t[i] += v;
    }
    long sum(int i) {
        long s = 0;
        for (; i > 0; i -= i & -i) s += t[i];
        return s;
    }
    long range(int l, int r) { return sum(r) - sum(l - 1); }
}`
  };

  S.persistent_seg = {
    cpp: `// 主席树：每次修改只新建 O(log n) 个节点，其余共享旧版本
struct Node { int l = 0, r = 0, cnt = 0; };
vector<Node> tr(1);                        // 0 号为空节点

int update(int pre, int l, int r, int pos) {
    int cur = tr.size(); tr.push_back(tr[pre]); tr[cur].cnt++;
    if (l == r) return cur;
    int m = (l + r) / 2;
    if (pos <= m) tr[cur].l = update(tr[pre].l, l, m, pos);
    else          tr[cur].r = update(tr[pre].r, m + 1, r, pos);
    return cur;
}
int query(int u, int v, int l, int r, int k) {   // 版本差找第 k 小
    if (l == r) return l;
    int m = (l + r) / 2;
    int left = tr[tr[v].l].cnt - tr[tr[u].l].cnt;
    if (k <= left) return query(tr[u].l, tr[v].l, l, m, k);
    return query(tr[u].r, tr[v].r, m + 1, r, k - left);
}`,
    py: `left, right, cnt = [0], [0], [0]        # 0 号空节点

def update(pre, l, r, pos):
    cur = len(cnt)
    left.append(left[pre]); right.append(right[pre]); cnt.append(cnt[pre] + 1)
    if l == r:
        return cur
    m = (l + r) // 2
    if pos <= m:
        left[cur] = update(left[pre], l, m, pos)
    else:
        right[cur] = update(right[pre], m + 1, r, pos)
    return cur

def query(u, v, l, r, k):                 # 版本 v 减版本 u 找第 k 小
    if l == r:
        return l
    m = (l + r) // 2
    lc = cnt[left[v]] - cnt[left[u]]
    if k <= lc:
        return query(left[u], left[v], l, m, k)
    return query(right[u], right[v], m + 1, r, k - lc)`,
    java: `class PNode { int l, r, cnt; PNode(int l, int r, int c) { this.l = l; this.r = r; cnt = c; } }
List<PNode> tr = new ArrayList<>(List.of(new PNode(0, 0, 0)));

int update(int pre, int l, int r, int pos) {
    int cur = tr.size();
    tr.add(new PNode(tr.get(pre).l, tr.get(pre).r, tr.get(pre).cnt + 1));
    if (l == r) return cur;
    int m = (l + r) / 2;
    if (pos <= m) tr.get(cur).l = update(tr.get(pre).l, l, m, pos);
    else          tr.get(cur).r = update(tr.get(pre).r, m + 1, r, pos);
    return cur;
}
int query(int u, int v, int l, int r, int k) {
    if (l == r) return l;
    int m = (l + r) / 2;
    int lc = tr.get(tr.get(v).l).cnt - tr.get(tr.get(u).l).cnt;
    if (k <= lc) return query(tr.get(u).l, tr.get(v).l, l, m, k);
    return query(tr.get(u).r, tr.get(v).r, m + 1, r, k - lc);
}`
  };

  S.lca_naive = {
    cpp: `// 朴素 LCA：谁深谁先爬，同深后并肩爬
int lca(int u, int v, vector<int>& dep, vector<int>& fa) {
    while (dep[u] > dep[v]) u = fa[u];
    while (dep[v] > dep[u]) v = fa[v];
    while (u != v) { u = fa[u]; v = fa[v]; }
    return u;
}`,
    py: `def lca(u, v, dep, fa):
    while dep[u] > dep[v]:
        u = fa[u]
    while dep[v] > dep[u]:
        v = fa[v]
    while u != v:
        u, v = fa[u], fa[v]
    return u`,
    java: `int lca(int u, int v, int[] dep, int[] fa) {
    while (dep[u] > dep[v]) u = fa[u];
    while (dep[v] > dep[u]) v = fa[v];
    while (u != v) { u = fa[u]; v = fa[v]; }
    return u;
}`
  };

  S.lca_binary = {
    cpp: `// 倍增 LCA：fa[u][k] = 向上 2^k 步
int lca(int u, int v, vector<int>& dep, vector<array<int, 20>>& fa) {
    if (dep[u] < dep[v]) swap(u, v);
    int d = dep[u] - dep[v];
    for (int k = 0; d; k++, d >>= 1)            // 深度对齐
        if (d & 1) u = fa[u][k];
    if (u == v) return u;
    for (int k = 19; k >= 0; k--)               // 同步上跳
        if (fa[u][k] != fa[v][k]) { u = fa[u][k]; v = fa[v][k]; }
    return fa[u][0];
}`,
    py: `LOG = 20

def lca(u, v, dep, fa):                # fa[u][k]：向上 2^k 步
    if dep[u] < dep[v]:
        u, v = v, u
    d = dep[u] - dep[v]
    k = 0
    while d:                           # 深度对齐
        if d & 1:
            u = fa[u][k]
        d >>= 1
        k += 1
    if u == v:
        return u
    for k in range(LOG - 1, -1, -1):   # 同步上跳
        if fa[u][k] != fa[v][k]:
            u, v = fa[u][k], fa[v][k]
    return fa[u][0]`,
    java: `int lca(int u, int v, int[] dep, int[][] fa) {
    if (dep[u] < dep[v]) { int t = u; u = v; v = t; }
    int d = dep[u] - dep[v];
    for (int k = 0; d != 0; k++, d >>= 1)
        if ((d & 1) == 1) u = fa[u][k];
    if (u == v) return u;
    for (int k = 19; k >= 0; k--)
        if (fa[u][k] != fa[v][k]) { u = fa[u][k]; v = fa[v][k]; }
    return fa[u][0];
}`
  };

  S.lca_tarjan = {
    cpp: `// Tarjan 离线 LCA：DFS 回溯时并查集合并，黑色端点直接作答
void dfs(int u, vector<vector<int>>& g, vector<int>& fa, vector<int>& anc,
         vector<int>& color, vector<vector<pair<int,int>>>& q, vector<int>& ans) {
    fa[u] = u; anc[u] = u; color[u] = 1;         // 1 = 灰
    for (int v : g[u]) {
        if (color[v]) continue;
        dfs(v, g, fa, anc, color, q, ans);
        fa[v] = u; anc[u] = u;                   // 子树收缩到 u
    }
    color[u] = 2;                                 // 2 = 黑
    for (auto [v, id] : q[u])
        if (color[v] == 2) ans[id] = anc[find(fa, v)];
}

int find(vector<int>& fa, int x) { return fa[x] == x ? x : fa[x] = find(fa, fa[x]); }`,
    py: `def tarjan(u, g, fa, anc, color, q, ans):
    fa[u] = u
    anc[u] = u
    color[u] = 1                     # 1 = 访问中（灰）
    for v in g[u]:
        if color[v]:
            continue
        tarjan(v, g, fa, anc, color, q, ans)
        fa[v] = u                    # 子树收缩到 u
        anc[u] = u
    color[u] = 2                     # 2 = 已回溯（黑）
    for v, qi in q[u]:
        if color[v] == 2:
            ans[qi] = anc[find(fa, v)]

def find(fa, x):
    while fa[x] != x:
        fa[x] = fa[fa[x]]
        x = fa[x]
    return x`,
    java: `void tarjan(int u, List<List<Integer>> g, int[] fa, int[] anc,
             int[] color, List<List<int[]>> q, int[] ans) {
    fa[u] = u; anc[u] = u; color[u] = 1;
    for (int v : g.get(u)) {
        if (color[v] != 0) continue;
        tarjan(v, g, fa, anc, color, q, ans);
        fa[v] = u; anc[u] = u;
    }
    color[u] = 2;
    for (int[] qr : q.get(u))
        if (color[qr[0]] == 2) ans[qr[1]] = anc[find(fa, qr[0])];
}
int find(int[] fa, int x) { return fa[x] == x ? x : (fa[x] = find(fa, fa[x])); }`
  };

  S.lca_rmq = {
    cpp: `// 欧拉序 + ST 表：区间内深度最小者即 LCA
int euler[2 * N], dep[2 * N], first[N], st[20][2 * N];

void build() {
    int m = 2 * n - 1, L = 32 - __builtin_clz(m);
    for (int i = 0; i < m; i++) st[0][i] = i;
    for (int k = 1; k < L; k++)
        for (int i = 0; i + (1 << k) <= m; i++) {
            int a = st[k - 1][i], b = st[k - 1][i + (1 << (k - 1))];
            st[k][i] = dep[a] < dep[b] ? a : b;
        }
}
int lca(int u, int v) {
    int l = first[u], r = first[v];
    if (l > r) swap(l, r);
    int k = 31 - __builtin_clz(r - l + 1);
    int a = st[k][l], b = st[k][r - (1 << k) + 1];
    return euler[dep[a] < dep[b] ? a : b];
}`,
    py: `def build(euler, dep, first, n):
    m = len(euler)
    LOG = max(1, m.bit_length())
    st = [[0] * m for _ in range(LOG)]
    st[0] = list(range(m))
    k = 1
    while (1 << k) <= m:
        half = 1 << (k - 1)
        for i in range(m - (1 << k) + 1):
            a, b = st[k - 1][i], st[k - 1][i + half]
            st[k][i] = a if dep[a] < dep[b] else b
        k += 1
    return st

def lca(u, v, first, euler, dep, st):
    l, r = first[u], first[v]
    if l > r:
        l, r = r, l
    k = (r - l + 1).bit_length() - 1
    a, b = st[k][l], st[k][r - (1 << k) + 1]
    return euler[a if dep[a] < dep[b] else b]`,
    java: `int[] euler, dep, first; int[][] st;

int lca(int u, int v) {
    int l = first[u], r = first[v];
    if (l > r) { int t = l; l = r; r = t; }
    int k = 31 - Integer.numberOfLeadingZeros(r - l + 1);
    int a = st[k][l], b = st[k][r - (1 << k) + 1];
    return euler[dep[a] < dep[b] ? a : b];
}
void build(int m) {
    int LOG = 32 - Integer.numberOfLeadingZeros(m);
    st = new int[LOG][m];
    for (int i = 0; i < m; i++) st[0][i] = i;
    for (int k = 1; k < LOG; k++)
        for (int i = 0; i + (1 << k) <= m; i++) {
            int a = st[k - 1][i], b = st[k - 1][i + (1 << (k - 1))];
            st[k][i] = dep[a] < dep[b] ? a : b;
        }
}`
  };

  S.lca_showdown = {
    cpp: `// 四法对比：同一棵树、同一询问，比较预处理 / 查询 / 空间
// ① 朴素 O(n)：逐层上跳
// ② 倍增 O(n log n) 预处理 + O(log n) 查询
// ③ Tarjan O(n alpha) 离线，一次 DFS 收全部询问
// ④ 欧拉序 RMQ：ST 表 O(1) 查询
int lcaDispatch(int u, int v, int method) {
    switch (method) {
        case 0: return lcaNaive(u, v);
        case 1: return lcaBinary(u, v);
        case 3: return lcaRMQ(u, v);
        default: return -1;      // Tarjan 需离线，单独批量处理
    }
}`,
    py: `# 四种方法按「预处理 / 查询 / 空间」三列对比
def lca_naive(u, v, dep, fa):        # O(n) 查询
    while dep[u] > dep[v]: u = fa[u]
    while dep[v] > dep[u]: v = fa[v]
    while u != v: u, v = fa[u], fa[v]
    return u

def lca_binary(u, v, dep, up):       # O(log n) 查询
    if dep[u] < dep[v]: u, v = v, u
    d = dep[u] - dep[v]
    k = 0
    while d:
        if d & 1: u = up[u][k]
        d >>= 1; k += 1
    if u == v: return u
    for k in range(len(up[0]) - 1, -1, -1):
        if up[u][k] != up[v][k]:
            u, v = up[u][k], up[v][k]
    return up[u][0]

def lca_rmq(u, v, first, euler, dep, st):   # O(1) 查询
    l, r = sorted((first[u], first[v]))
    k = (r - l + 1).bit_length() - 1
    a, b = st[k][l], st[k][r - (1 << k) + 1]
    return euler[a if dep[a] < dep[b] else b]`,
    java: `// 四法统一入口：Tarjan 需离线批量，其余可在线
int lca(int u, int v, int method) {
    switch (method) {
        case 0: return lcaNaive(u, v);     // O(n)
        case 1: return lcaBinary(u, v);    // O(log n)
        case 3: return lcaRMQ(u, v);       // O(1)
        default: throw new IllegalArgumentException("Tarjan 需离线批量处理");
    }
}
int lcaNaive(int u, int v) {
    while (dep[u] > dep[v]) u = fa[u];
    while (dep[v] > dep[u]) v = fa[v];
    while (u != v) { u = fa[u]; v = fa[v]; }
    return u;
}`
  };

  S.tree_diameter = {
    cpp: `// 两次 BFS：任取一点找最远点 s，再从 s 找最远点 t，s-t 即直径
int bfsFar(int s, vector<vector<int>>& g, vector<int>& dist) {
    fill(dist.begin(), dist.end(), -1);
    queue<int> q; q.push(s); dist[s] = 0;
    int far = s;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        if (dist[u] > dist[far]) far = u;
        for (int v : g[u]) if (dist[v] < 0) { dist[v] = dist[u] + 1; q.push(v); }
    }
    return far;
}
int diameter(vector<vector<int>>& g, int n) {
    vector<int> d(n);
    int s = bfsFar(0, g, d);
    int t = bfsFar(s, g, d);
    return d[t];
}`,
    py: `from collections import deque

def bfs_far(s, g):
    dist = [-1] * len(g)
    dist[s] = 0
    q, far = deque([s]), s
    while q:
        u = q.popleft()
        if dist[u] > dist[far]:
            far = u
        for v in g[u]:
            if dist[v] < 0:
                dist[v] = dist[u] + 1
                q.append(v)
    return far, dist

def diameter(g):
    s, _ = bfs_far(0, g)
    t, dist = bfs_far(s, g)
    return dist[t], s, t`,
    java: `int bfsFar(int s, List<List<Integer>> g, int[] dist) {
    Arrays.fill(dist, -1);
    Deque<Integer> q = new ArrayDeque<>();
    q.add(s); dist[s] = 0;
    int far = s;
    while (!q.isEmpty()) {
        int u = q.poll();
        if (dist[u] > dist[far]) far = u;
        for (int v : g.get(u))
            if (dist[v] < 0) { dist[v] = dist[u] + 1; q.add(v); }
    }
    return far;
}
int diameter(List<List<Integer>> g, int n) {
    int[] d = new int[n];
    int s = bfsFar(0, g, d);
    bfsFar(s, g, d);
    int best = 0;
    for (int x : d) best = Math.max(best, x);
    return best;
}`
  };

  S.tree_diameter_dp = {
    cpp: `// 树形 DP：每个点维护向下最长 d1 与次长 d2，答案 = max(d1 + d2)
int ans = 0;
int dfs(int u, int p, vector<vector<int>>& g) {
    int d1 = 0, d2 = 0;
    for (int v : g[u]) {
        if (v == p) continue;
        int len = dfs(v, u, g) + 1;
        if (len > d1) { d2 = d1; d1 = len; }
        else if (len > d2) d2 = len;
    }
    ans = max(ans, d1 + d2);        // 经过 u 的最长路径
    return d1;
}`,
    py: `def diameter_dp(g):
    ans = 0

    def dfs(u, p):
        nonlocal ans
        d1 = d2 = 0
        for v in g[u]:
            if v == p:
                continue
            length = dfs(v, u) + 1
            if length > d1:
                d1, d2 = length, d1
            elif length > d2:
                d2 = length
        ans = max(ans, d1 + d2)
        return d1

    dfs(0, -1)
    return ans`,
    java: `int ans = 0;
int dfs(int u, int p, List<List<Integer>> g) {
    int d1 = 0, d2 = 0;
    for (int v : g.get(u)) {
        if (v == p) continue;
        int len = dfs(v, u, g) + 1;
        if (len > d1) { d2 = d1; d1 = len; }
        else if (len > d2) d2 = len;
    }
    ans = Math.max(ans, d1 + d2);
    return d1;
}`
  };
})();
