/* ============================================================
 * 三语言教学实现 · 第 5 卷（字符串树 / 图基础搜索）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.trie = {
    cpp: `// Trie：每个节点 26 个孩子槽 + 结束标记
struct Trie {
    struct Node { int ch[26] = {0}; bool end = false; } tr[100005];
    int tot = 0;
    void insert(const string& s) {
        int u = 0;
        for (char c : s) {
            int x = c - 'a';
            if (!tr[u].ch[x]) tr[u].ch[x] = ++tot;
            u = tr[u].ch[x];
        }
        tr[u].end = true;
    }
    bool query(const string& s) {
        int u = 0;
        for (char c : s) {
            int x = c - 'a';
            if (!tr[u].ch[x]) return false;
            u = tr[u].ch[x];
        }
        return tr[u].end;
    }
};`,
    py: `class Trie:
    def __init__(self):
        self.ch = [dict()]
        self.end = [False]

    def insert(self, s):
        u = 0
        for c in s:
            if c not in self.ch[u]:
                self.ch.append({})
                self.end.append(False)
                self.ch[u][c] = len(self.ch) - 1
            u = self.ch[u][c]
        self.end[u] = True

    def query(self, s):
        u = 0
        for c in s:
            if c not in self.ch[u]:
                return False
            u = self.ch[u][c]
        return self.end[u]

    def starts_with(self, p):         # 前缀匹配
        u = 0
        for c in p:
            if c not in self.ch[u]:
                return False
            u = self.ch[u][c]
        return True`,
    java: `class Trie {
    int[][] ch = new int[100005][26];
    boolean[] end = new boolean[100005];
    int tot = 0;

    void insert(String s) {
        int u = 0;
        for (char c : s.toCharArray()) {
            int x = c - 'a';
            if (ch[u][x] == 0) ch[u][x] = ++tot;
            u = ch[u][x];
        }
        end[u] = true;
    }
    boolean query(String s) {
        int u = 0;
        for (char c : s.toCharArray()) {
            int x = c - 'a';
            if (ch[u][x] == 0) return false;
            u = ch[u][x];
        }
        return end[u];
    }
}`
  };

  S.radix_trie = {
    cpp: `// 压缩 Trie：单分支链折叠成多字符边，插入分叉时裂边
struct RNode { map<char, RNode*> ch; string label; bool end = false; };

void splitEdge(RNode* u, char c, const string& rest, int pos) {
    RNode* old = u->ch[c];
    RNode* mid = new RNode;
    mid->label = old->label.substr(0, pos);       // 公共前缀留在 mid
    old->label = old->label.substr(pos);
    mid->ch[old->label[0]] = old;
    u->ch[c] = mid;
}

void insert(RNode* u, const string& s, int i) {
    if (i == (int)s.size()) { u->end = true; return; }
    char c = s[i];
    if (!u->ch.count(c)) {
        RNode* n = new RNode; n->label = s.substr(i); n->end = true;
        u->ch[c] = n; return;
    }
    RNode* v = u->ch[c];
    int k = 0;
    while (k < (int)v->label.size() && i + k < (int)s.size() && v->label[k] == s[i + k]) k++;
    if (k < (int)v->label.size()) splitEdge(u, c, s, k);   // 边中间分叉
    insert(u->ch[c], s, i + k);
}`,
    py: `class RNode:
    def __init__(self, label=''):
        self.ch, self.label, self.end = {}, label, False

def insert(u, s, i=0):
    if i == len(s):
        u.end = True
        return
    c = s[i]
    if c not in u.ch:
        u.ch[c] = RNode(s[i:])
        u.ch[c].end = True
        return
    v = u.ch[c]
    k = 0
    while k < len(v.label) and i + k < len(s) and v.label[k] == s[i + k]:
        k += 1
    if k < len(v.label):                      # 在边中间分叉
        mid = RNode(v.label[:k])
        v.label = v.label[k:]
        mid.ch[v.label[0]] = v
        u.ch[c] = mid
    insert(u.ch[c], s, i + k)`,
    java: `class RNode {
    Map<Character, RNode> ch = new HashMap<>();
    String label; boolean end;
    RNode(String label) { this.label = label; }
}
void insert(RNode u, String s, int i) {
    if (i == s.length()) { u.end = true; return; }
    char c = s.charAt(i);
    if (!u.ch.containsKey(c)) {
        RNode n = new RNode(s.substring(i)); n.end = true;
        u.ch.put(c, n); return;
    }
    RNode v = u.ch.get(c);
    int k = 0;
    while (k < v.label.length() && i + k < s.length()
           && v.label.charAt(k) == s.charAt(i + k)) k++;
    if (k < v.label.length()) {
        RNode mid = new RNode(v.label.substring(0, k));
        v.label = v.label.substring(k);
        mid.ch.put(v.label.charAt(0), v);
        u.ch.put(c, mid);
    }
    insert(u.ch.get(c), s, i + k);
}`
  };

  S.xor_trie = {
    cpp: `// 0-1 Trie：从高位到低位，尽量走相反比特
struct XTrie {
    int ch[3200005][2], tot = 0;
    void insert(int x) {
        int u = 0;
        for (int k = 30; k >= 0; k--) {
            int b = (x >> k) & 1;
            if (!ch[u][b]) ch[u][b] = ++tot;
            u = ch[u][b];
        }
    }
    int queryMaxXor(int x) {                 // 与已有数的最大异或
        int u = 0, res = 0;
        for (int k = 30; k >= 0; k--) {
            int b = (x >> k) & 1;
            if (ch[u][b ^ 1]) { res |= 1 << k; u = ch[u][b ^ 1]; }
            else u = ch[u][b];
        }
        return res;
    }
};`,
    py: `class XorTrie:
    def __init__(self):
        self.ch = [[0, 0]]

    def insert(self, x):
        u = 0
        for k in range(30, -1, -1):
            b = (x >> k) & 1
            if not self.ch[u][b]:
                self.ch.append([0, 0])
                self.ch[u][b] = len(self.ch) - 1
            u = self.ch[u][b]

    def max_xor(self, x):
        u, res = 0, 0
        for k in range(30, -1, -1):
            b = (x >> k) & 1
            if self.ch[u][b ^ 1]:         # 贪心走相反位
                res |= 1 << k
                u = self.ch[u][b ^ 1]
            else:
                u = self.ch[u][b]
        return res`,
    java: `class XorTrie {
    int[][] ch = new int[3200005][2];
    int tot = 0;

    void insert(int x) {
        int u = 0;
        for (int k = 30; k >= 0; k--) {
            int b = (x >> k) & 1;
            if (ch[u][b] == 0) ch[u][b] = ++tot;
            u = ch[u][b];
        }
    }
    int maxXor(int x) {
        int u = 0, res = 0;
        for (int k = 30; k >= 0; k--) {
            int b = (x >> k) & 1;
            if (ch[u][b ^ 1] != 0) { res |= 1 << k; u = ch[u][b ^ 1]; }
            else u = ch[u][b];
        }
        return res;
    }
}`
  };

  S.ac_automaton = {
    cpp: `// AC 自动机：Trie + BFS 建 fail 指针
void build() {
    queue<int> q;
    for (int c = 0; c < 26; c++)
        if (ch[0][c]) q.push(ch[0][c]);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int c = 0; c < 26; c++) {
            int v = ch[u][c];
            if (v) { fail[v] = ch[fail[u]][c]; q.push(v); }
            else   ch[u][c] = ch[fail[u]][c];   // 失配边直接补全
        }
    }
}
int query(const string& s) {
    int u = 0, hits = 0;
    for (char c : s) {
        u = ch[u][c - 'a'];
        for (int t = u; t && cnt[t] != -1; t = fail[t]) {
            hits += cnt[t]; cnt[t] = -1;        // 每个模式只计一次
        }
    }
    return hits;
}`,
    py: `from collections import deque

def build(ch, fail, root=0, sigma=26):
    q = deque()
    for c in range(sigma):
        if ch[root][c]:
            q.append(ch[root][c])
    while q:
        u = q.popleft()
        for c in range(sigma):
            v = ch[u][c]
            if v:
                fail[v] = ch[fail[u]][c]       # 失配指针
                q.append(v)
            else:
                ch[u][c] = ch[fail[u]][c]      # 失配跳转

def query(s, ch, fail, cnt):
    u, hits = 0, 0
    for c in s:
        u = ch[u][ord(c) - 97]
        t = u
        while t and cnt[t] != -1:
            hits += cnt[t]
            cnt[t] = -1                        # 只统计一次
            t = fail[t]
    return hits`,
    java: `void build(int[][] ch, int[] fail) {
    Deque<Integer> q = new ArrayDeque<>();
    for (int c = 0; c < 26; c++)
        if (ch[0][c] != 0) q.add(ch[0][c]);
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int c = 0; c < 26; c++) {
            int v = ch[u][c];
            if (v != 0) { fail[v] = ch[fail[u]][c]; q.add(v); }
            else ch[u][c] = ch[fail[u]][c];
        }
    }
}
int query(String s, int[][] ch, int[] fail, int[] cnt) {
    int u = 0, hits = 0;
    for (char ch2 : s.toCharArray()) {
        u = ch[u][ch2 - 'a'];
        for (int t = u; t != 0 && cnt[t] != -1; t = fail[t]) {
            hits += cnt[t]; cnt[t] = -1;
        }
    }
    return hits;
}`
  };

  S.huffman = {
    cpp: `// 哈夫曼：每次取最小两棵合并，小根堆维护
struct Node { int w; char c; Node *l = 0, *r = 0; };
struct Cmp { bool operator()(Node* a, Node* b) { return a->w > b->w; } };

Node* build(map<char, int> freq) {
    priority_queue<Node*, vector<Node*>, Cmp> pq;
    for (auto [c, w] : freq) pq.push(new Node{w, c});
    while (pq.size() > 1) {
        Node* a = pq.top(); pq.pop();
        Node* b = pq.top(); pq.pop();
        Node* p = new Node{a->w + b->w, 0, a, b};
        pq.push(p);
    }
    return pq.top();
}
void encode(Node* u, string code, map<char, string>& out) {
    if (!u) return;
    if (u->c) { out[u->c] = code.empty() ? "0" : code; return; }
    encode(u->l, code + "0", out);
    encode(u->r, code + "1", out);
}`,
    py: `import heapq

def build(freq):
    heap = [(w, i, c) for i, (c, w) in enumerate(freq.items())]
    heapq.heapify(heap)
    tie = len(heap)
    while len(heap) > 1:
        w1, _, c1 = heapq.heappop(heap)
        w2, _, c2 = heapq.heappop(heap)
        heapq.heappush(heap, (w1 + w2, tie, (c1, c2)))
        tie += 1
    return heap[0]

def encode(tree, code='', out=None):
    out = {} if out is None else out
    _, _, node = tree
    if isinstance(node, str):
        out[node] = code or '0'
        return out
    encode((0, 0, node[0]), code + '0', out)
    encode((0, 0, node[1]), code + '1', out)
    return out`,
    java: `Node build(Map<Character, Integer> freq) {
    PriorityQueue<Node> pq = new PriorityQueue<>((a, b) -> a.w - b.w);
    for (var e : freq.entrySet()) pq.add(new Node(e.getValue(), e.getKey()));
    while (pq.size() > 1) {
        Node a = pq.poll(), b = pq.poll();
        pq.add(new Node(a.w + b.w, '\\0', a, b));
    }
    return pq.poll();
}
void encode(Node u, String code, Map<Character, String> out) {
    if (u == null) return;
    if (u.c != '\\0') { out.put(u.c, code.isEmpty() ? "0" : code); return; }
    encode(u.l, code + "0", out);
    encode(u.r, code + "1", out);
}`
  };

  S.bfs = {
    cpp: `// BFS：队列 + 距离分层，同时标记生成树边
vector<int> bfs(int s, vector<vector<int>>& g) {
    vector<int> dist(g.size(), -1);
    queue<int> q; q.push(s); dist[s] = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;              // 第一次到达即最短
            q.push(v);
        }
    }
    return dist;
}`,
    py: `from collections import deque

def bfs(s, g):
    dist = [-1] * len(g)
    dist[s] = 0
    q = deque([s])
    while q:
        u = q.popleft()
        for v in g[u]:
            if dist[v] != -1:
                continue
            dist[v] = dist[u] + 1       # 首次到达即最短层数
            q.append(v)
    return dist`,
    java: `int[] bfs(int s, List<List<Integer>> g) {
    int[] dist = new int[g.size()];
    Arrays.fill(dist, -1);
    Deque<Integer> q = new ArrayDeque<>();
    q.add(s); dist[s] = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : g.get(u)) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;
            q.add(v);
        }
    }
    return dist;
}`
  };

  S.dfs_classify = {
    cpp: `// DFS 四类边：树边 / 后向边（有环）/ 前向边 / 横叉边
int timer = 0;
void dfs(int u, vector<vector<int>>& g, vector<int>& d, vector<int>& f, vector<int>& color) {
    d[u] = ++timer; color[u] = 1;               // 1 = 灰
    for (int v : g[u]) {
        if (color[v] == 0) {                    // 树边
            dfs(v, g, d, f, color);
        } else if (color[v] == 1) {
            // 后向边：v 仍在栈中 -> 存在环
        } else {
            // f[v] < d[u]：横叉边；d[v] > d[u]：前向边
        }
    }
    color[u] = 2; f[u] = ++timer;               // 2 = 黑
}`,
    py: `timer = 0

def dfs(u, g, d, f, color):
    global timer
    timer += 1
    d[u] = timer
    color[u] = 1                       # 1 = 在栈中（灰）
    for v in g[u]:
        if color[v] == 0:              # 树边
            dfs(v, g, d, f, color)
        elif color[v] == 1:
            pass                       # 后向边：指向祖先，说明有环
        else:
            pass                       # d[v] > d[u] 前向边，否则横叉边
    color[u] = 2                       # 2 = 已回溯（黑）
    timer += 1
    f[u] = timer`,
    java: `int timer = 0;
void dfs(int u, List<List<Integer>> g, int[] d, int[] f, int[] color) {
    d[u] = ++timer; color[u] = 1;
    for (int v : g.get(u)) {
        if (color[v] == 0) dfs(v, g, d, f, color);   // 树边
        else if (color[v] == 1) { /* 后向边：有环 */ }
        else { /* d[v] > d[u] ? 前向边 : 横叉边 */ }
    }
    color[u] = 2; f[u] = ++timer;
}`
  };

  S.bidir_bfs = {
    cpp: `// 双向 BFS：两队列交替扩展，某个点被两侧都访问即会师
int bidirBFS(int s, int t, vector<vector<int>>& g) {
    vector<int> ds(g.size(), -1), dt(g.size(), -1);
    queue<int> qs, qt;
    qs.push(s); ds[s] = 0;
    qt.push(t); dt[t] = 0;
    while (!qs.empty() && !qt.empty()) {
        auto step = [&](queue<int>& q, vector<int>& d, vector<int>& other) -> int {
            int u = q.front(); q.pop();
            for (int v : g[u]) {
                if (d[v] != -1) continue;
                d[v] = d[u] + 1;
                if (other[v] != -1) return d[v] + other[v];   // 会师
                q.push(v);
            }
            return -1;
        };
        int r = step(qs, ds, dt); if (r >= 0) return r;
        r = step(qt, dt, ds);     if (r >= 0) return r;
    }
    return -1;
}`,
    py: `from collections import deque

def bidir_bfs(s, t, g):
    ds, dt = {s: 0}, {t: 0}
    qs, qt = deque([s]), deque([t])

    def step(q, d, other):
        u = q.popleft()
        for v in g[u]:
            if v in d:
                continue
            d[v] = d[u] + 1
            if v in other:                   # 两股波纹相遇
                return d[v] + other[v]
            q.append(v)
        return -1

    while qs and qt:
        r = step(qs, ds, dt)
        if r >= 0:
            return r
        r = step(qt, dt, ds)
        if r >= 0:
            return r
    return -1`,
    java: `int bidirBFS(int s, int t, List<List<Integer>> g) {
    int n = g.size();
    int[] ds = new int[n], dt = new int[n];
    Arrays.fill(ds, -1); Arrays.fill(dt, -1);
    Deque<Integer> qs = new ArrayDeque<>(), qt = new ArrayDeque<>();
    qs.add(s); ds[s] = 0;
    qt.add(t); dt[t] = 0;
    while (!qs.isEmpty() && !qt.isEmpty()) {
        int r = expand(qs, ds, dt, g);
        if (r >= 0) return r;
        r = expand(qt, dt, ds, g);
        if (r >= 0) return r;
    }
    return -1;
}
int expand(Deque<Integer> q, int[] d, int[] other, List<List<Integer>> g) {
    int u = q.poll();
    for (int v : g.get(u)) {
        if (d[v] != -1) continue;
        d[v] = d[u] + 1;
        if (other[v] != -1) return d[v] + other[v];
        q.add(v);
    }
    return -1;
}`
  };

  S.iddfs = {
    cpp: `// IDDFS：逐层收紧深度上限，反复做受限 DFS
bool dfsLimited(int u, int depth, int limit, vector<vector<int>>& g, vector<bool>& vis) {
    if (depth == limit) return true;            // 到达目标层（此处用目标点判断）
    vis[u] = true;
    for (int v : g[u]) {
        if (vis[v]) continue;
        if (dfsLimited(v, depth + 1, limit, g, vis)) return true;
    }
    vis[u] = false;                             // 回溯
    return false;
}
bool iddfs(int s, int maxDepth, vector<vector<int>>& g) {
    for (int limit = 0; limit <= maxDepth; limit++) {
        vector<bool> vis(g.size(), false);
        if (dfsLimited(s, 0, limit, g, vis)) return true;
    }
    return false;
}`,
    py: `def dfs_limited(u, depth, limit, g, vis, target):
    if u == target:
        return True
    if depth == limit:
        return False
    vis.add(u)
    for v in g[u]:
        if v in vis:
            continue
        if dfs_limited(v, depth + 1, limit, g, vis, target):
            return True
    vis.discard(u)                 # 回溯，允许别的路径再经过
    return False

def iddfs(s, t, max_depth, g):
    for limit in range(max_depth + 1):
        if dfs_limited(s, 0, limit, g, set(), t):
            return limit
    return -1`,
    java: `boolean dfsLimited(int u, int depth, int limit, List<List<Integer>> g,
                   boolean[] vis, int target) {
    if (u == target) return true;
    if (depth == limit) return false;
    vis[u] = true;
    for (int v : g.get(u)) {
        if (vis[v]) continue;
        if (dfsLimited(v, depth + 1, limit, g, vis, target)) return true;
    }
    vis[u] = false;
    return false;
}
int iddfs(int s, int target, int maxDepth, List<List<Integer>> g) {
    for (int limit = 0; limit <= maxDepth; limit++)
        if (dfsLimited(s, 0, limit, g, new boolean[g.size()], target)) return limit;
    return -1;
}`
  };
})();
