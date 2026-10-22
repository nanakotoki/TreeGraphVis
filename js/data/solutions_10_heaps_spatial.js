/* ============================================================
 * 三语言教学实现 · 第 10 卷（可并堆 / 字符串进阶 / 空间树 / 图表示）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.leftist_heap = {
    cpp: `// 左偏树：dist 为到最近外节点的距离，右链永远不长于左链
int dist[ N];
int merge(int a, int b) {
    if (!a || !b) return a ? a : b;
    if (val[a] > val[b]) swap(a, b);        // 小根堆
    rs[a] = merge(rs[a], b);
    if (dist[ls[a]] < dist[rs[a]]) swap(ls[a], rs[a]);   // 保持左偏
    dist[a] = dist[rs[a]] + 1;
    return a;
}
void push(int& root, int x) { root = merge(root, newNode(x)); }
void pop(int& root) { root = merge(ls[root], rs[root]); }`,
    py: `class Node:
    def __init__(self, v):
        self.v, self.l, self.r, self.dist = v, None, None, 1

def merge(a, b):
    if not a or not b:
        return a or b
    if a.v > b.v:
        a, b = b, a
    a.r = merge(a.r, b)
    if (a.l.dist if a.l else 0) < (a.r.dist if a.r else 0):
        a.l, a.r = a.r, a.l          # 保证左偏
    a.dist = (a.r.dist if a.r else 0) + 1
    return a

def push(root, x):
    return merge(root, Node(x))

def pop(root):
    return merge(root.l, root.r)`,
    java: `int[] dist = new int[N];
int merge(int a, int b) {
    if (a == 0 || b == 0) return a != 0 ? a : b;
    if (val[a] > val[b]) { int t = a; a = b; b = t; }
    rs[a] = merge(rs[a], b);
    if (dist[ls[a]] < dist[rs[a]]) { int t = ls[a]; ls[a] = rs[a]; rs[a] = t; }
    dist[a] = dist[rs[a]] + 1;
    return a;
}`
  };

  S.skew_heap = {
    cpp: `// 斜堆：合并后无条件交换左右子树，均摊 O(log n)
int merge(int a, int b) {
    if (!a || !b) return a ? a : b;
    if (val[a] > val[b]) swap(a, b);
    rs[a] = merge(rs[a], b);
    swap(ls[a], rs[a]);                     // 无条件交换
    return a;
}`,
    py: `def merge(a, b):
    if not a or not b:
        return a or b
    if a.v > b.v:
        a, b = b, a
    a.r = merge(a.r, b)
    a.l, a.r = a.r, a.l        # 斜堆：无条件交换左右
    return a`,
    java: `int merge(int a, int b) {
    if (a == 0 || b == 0) return a != 0 ? a : b;
    if (val[a] > val[b]) { int t = a; a = b; b = t; }
    rs[a] = merge(rs[a], b);
    int t = ls[a]; ls[a] = rs[a]; rs[a] = t;
    return a;
}`
  };

  S.pairing_heap = {
    cpp: `// 配对堆：deleteMin 时把儿子拆成森林，两两配对再自右向左合并
Node* merge(Node* a, Node* b) {
    if (!a || !b) return a ? a : b;
    if (a->v > b->v) swap(a, b);
    b->next = a->child;                     // 孩子用兄弟链表串起来
    a->child = b;
    return a;
}
Node* mergePairs(Node* first) {
    if (!first || !first->next) return first;
    Node *a = first, *b = first->next, *rest = b->next;
    a->next = b->next = nullptr;
    return merge(merge(a, b), mergePairs(rest));   // 第一趟成对，第二趟归并
}`,
    py: `def merge(a, b):
    if not a or not b:
        return a or b
    if a.v > b.v:
        a, b = b, a
    b.next = a.child            # 兄弟链表挂孩子
    a.child = b
    return a

def merge_pairs(first):
    if not first or not first.next:
        return first
    a, b = first, first.next
    rest = b.next
    a.next = b.next = None
    return merge(merge(a, b), merge_pairs(rest))   # 两两配对后递归归并`,
    java: `Node merge(Node a, Node b) {
    if (a == null || b == null) return a != null ? a : b;
    if (a.v > b.v) { Node t = a; a = b; b = t; }
    b.next = a.child;
    a.child = b;
    return a;
}
Node mergePairs(Node first) {
    if (first == null || first.next == null) return first;
    Node a = first, b = first.next, rest = b.next;
    a.next = b.next = null;
    return merge(merge(a, b), mergePairs(rest));
}`
  };

  S.binomial_heap = {
    cpp: `// 二项堆：同阶树合并像二进制进位，根表按度数递增链表
Node* mergeTree(Node* a, Node* b) {           // 合并两棵同阶树
    if (a->key > b->key) swap(a, b);
    b->sibling = a->child;
    a->child = b;
    a->degree++;
    return a;
}
Node* unionHeap(Node* h1, Node* h2) {
    Node *head = nullptr, **tail = &head;
    while (h1 && h2) {                        // 按 degree 归并根表
        if (h1->degree <= h2->degree) { *tail = h1; h1 = h1->sibling; }
        else                          { *tail = h2; h2 = h2->sibling; }
        tail = &((*tail)->sibling);
    }
    *tail = h1 ? h1 : h2;
    // 再扫描一遍：同 degree 的树两两合并（进位）
    return head;
}`,
    py: `def merge_tree(a, b):                 # 合并两棵同阶二项树
    if a.key > b.key:
        a, b = b, a
    b.sibling = a.child
    a.child = b
    a.degree += 1
    return a

def union_heap(h1, h2):
    roots = []
    while h1 and h2:                  # 按 degree 归并根表
        if h1.degree <= h2.degree:
            roots.append(h1); h1 = h1.sibling
        else:
            roots.append(h2); h2 = h2.sibling
    roots += [x for x in (h1, h2) if x]
    out = []
    for t in roots:
        if out and out[-1].degree == t.degree:   # 同阶 -> 进位合并
            out.append(merge_tree(out.pop(), t))
        else:
            out.append(t)
    return out`,
    java: `Node mergeTree(Node a, Node b) {
    if (a.key > b.key) { Node t = a; a = b; b = t; }
    b.sibling = a.child;
    a.child = b;
    a.degree++;
    return a;
}
Node unionHeap(Node h1, Node h2) {
    Node head = null, tail = null;
    while (h1 != null && h2 != null) {
        Node pick = (h1.degree <= h2.degree) ? h1 : h2;
        if (pick == h1) h1 = h1.sibling; else h2 = h2.sibling;
        if (head == null) head = tail = pick;
        else { tail.sibling = pick; tail = pick; }
    }
    Node rest = (h1 != null) ? h1 : h2;
    if (head == null) return rest;
    tail.sibling = rest;
    return head;
}`
  };

  S.fib_heap = {
    cpp: `// 斐波那契堆：惰性合并；extractMin 后按度数桶 Consolidate 收拢森林
void consolidate() {
    vector<Node*> bucket(64, nullptr);            // 度数桶
    for (Node* w : roots) {
        Node* x = w;
        while (bucket[x->degree]) {               // 同度数两两合并
            Node* y = bucket[x->degree];
            if (x->key > y->key) swap(x, y);
            y->parent = x;
            x->child ? (y->next = x->child->next, x->child->next = y) : (x->child = y);
            x->degree++;
            bucket[x->degree - 1] = nullptr;
        }
        bucket[x->degree] = x;
    }
    // 重新串根表并更新 min
}
void decreaseKey(Node* x, int k) {                // 减小键 + 级联切断
    x->key = k;
    if (x->parent && x->key < x->parent->key) {
        cut(x); cascadingCut(x->parent);          // mark 位由 0 变 1，二次即切断
    }
    if (x->key < minNode->key) minNode = x;
}`,
    py: `def consolidate(roots, min_node):
    """extractMin 后把森林按度数收拢，度数相同就合并"""
    bucket = {}
    for w in roots:
        x = w
        while x.degree in bucket:                 # 同度数两两合并
            y = bucket.pop(x.degree)
            if x.key > y.key:
                x, y = y, x
            y.parent = x
            y.sibling = x.child
            x.child = y
            x.degree += 1
        bucket[x.degree] = x
    roots = list(bucket.values())
    return min(roots, key=lambda u: u.key), roots

def decrease_key(x, k, min_node):
    x.key = k
    p = x.parent
    if p and x.key < p.key:                       # 违反堆序
        cut(x)                                    # 剪下并加入根表
        if not p.marked:
            p.marked = True                       # 第一次仅打标记
        else:
            cascading_cut(p)                      # 第二次级联切断
    if x.key < min_node.key:
        min_node = x
    return min_node`,
    java: `void consolidate(List<Node> roots) {
    Node[] bucket = new Node[64];
    for (Node w : roots) {
        Node x = w;
        while (bucket[x.degree] != null) {
            Node y = bucket[x.degree];
            if (x.key > y.key) { Node t = x; x = y; y = t; }
            y.parent = x;
            y.sibling = x.child;
            x.child = y;
            x.degree++;
            bucket[x.degree - 1] = null;
        }
        bucket[x.degree] = x;
    }
}
void decreaseKey(Node x, int k) {
    x.key = k;
    if (x.parent != null && x.key < x.parent.key) {
        cut(x);
        cascadingCut(x.parent, 0);
    }
    if (x.key < minNode.key) minNode = x;
}`
  };

  S.suffix_tree = {
    cpp: `// 后缀树（Ukkonen 简化版）：活动点 + 剩余后缀数 + 后缀链接
struct STNode { map<char, STNode*> ch; STNode* link = nullptr; int start, len; };

void extend(char c) {
    remainder++;                          // 每步剩余后缀数 +1
    STNode* last = nullptr;
    while (remainder > 0) {
        // 1) 若活动点后可延伸，直接延伸并结束本步
        // 2) 否则为活动点新建叶子，挂后缀链接
        if (last) last->link = active;
        last = active;
        // 3) 沿后缀链接回退，remainder--
    }
}
// active_node / active_edge / active_length 三元组决定下一步插入位置`,
    py: `class STNode:
    def __init__(self, start=0, length=0):
        self.ch, self.link = {}, None
        self.start, self.length = start, length

def build(s):
    """Ukkonen：维护活动点 (node, edge, length) 与剩余后缀数 remainder"""
    root = STNode()
    active, active_edge, active_len = root, -1, 0
    remainder = 0
    for i, c in enumerate(s):
        remainder += 1
        last = None
        while remainder > 0:
            if active_len == 0:
                active_edge = i
            if c not in active.ch:
                active.ch[c] = STNode(i, len(s) - i)   # 新建叶子
                if last:
                    last.link = active                  # 后缀链接
                last = active
            else:
                if last:
                    last.link = active
                break
            remainder -= 1
    return root`,
    java: `class STNode {
    Map<Character, STNode> ch = new HashMap<>();
    STNode link; int start, len;
    STNode(int start, int len) { this.start = start; this.len = len; }
}
void extend(char c) {
    remainder++;
    STNode last = null;
    while (remainder > 0) {
        if (activeLen == 0) activeEdge = pos;
        if (!active.ch.containsKey(c)) {
            active.ch.put(c, new STNode(pos, s.length() - pos));
            if (last != null) last.link = active;
            last = active;
        } else {
            if (last != null) last.link = active;
            break;
        }
        remainder--;
    }
}`
  };

  S.tree_centroid = {
    cpp: `// 树的重心：删掉它后最大连通块最小
int n;
int dfs(int u, int p, vector<vector<int>>& g, vector<int>& sz, vector<int>& best) {
    sz[u] = 1;
    int mx = 0;
    for (int v : g[u]) {
        if (v == p) continue;
        dfs(v, u, g, sz, best);
        sz[u] += sz[v];
        mx = max(mx, sz[v]);
    }
    mx = max(mx, n - sz[u]);            // 上方那块
    best[u] = mx;                        // 移除 u 后的最大连通块
    return sz[u];
}
// 重心 = best[u] 最小的 1~2 个点`,
    py: `def centroids(n, g):
    sz = [0] * n
    best = [0] * n

    def dfs(u, p):
        sz[u] = 1
        mx = 0
        for v in g[u]:
            if v == p:
                continue
            dfs(v, u)
            sz[u] += sz[v]
            mx = max(mx, sz[v])
        best[u] = max(mx, n - sz[u])       # 上方的连通块
        return sz[u]

    dfs(0, -1)
    mn = min(best)
    return [u for u in range(n) if best[u] == mn], best`,
    java: `int n;
int dfs(int u, int p, List<List<Integer>> g, int[] sz, int[] best) {
    sz[u] = 1;
    int mx = 0;
    for (int v : g.get(u)) {
        if (v == p) continue;
        dfs(v, u, g, sz, best);
        sz[u] += sz[v];
        mx = Math.max(mx, sz[v]);
    }
    best[u] = Math.max(mx, n - sz[u]);
    return sz[u];
}`
  };

  S.hld = {
    cpp: `// 树链剖分：两遍 DFS —— 先求 size/重儿子，再按重链优先标 dfn
int dfn[N], top[N], fa[N], dep[N], sz[N], son[N], timer = 0;
void dfs1(int u, int p) {
    fa[u] = p; dep[u] = dep[p] + 1; sz[u] = 1;
    for (int v : g[u]) if (v != p) {
        dfs1(v, u); sz[u] += sz[v];
        if (sz[v] > sz[son[u]]) son[u] = v;       // 重儿子
    }
}
void dfs2(int u, int t) {
    top[u] = t; dfn[u] = ++timer;                 // 同一条链 dfn 连续
    if (son[u]) dfs2(son[u], t);                  // 先走重儿子
    for (int v : g[u]) if (v != fa[u] && v != son[u]) dfs2(v, v);
}
void pathQuery(int u, int v) {
    while (top[u] != top[v]) {                    // 深链先跳，拆成若干区间
        if (dep[top[u]] < dep[top[v]]) swap(u, v);
        // query(dfn[top[u]], dfn[u]);
        u = fa[top[u]];
    }
    // query(min(dfn[u], dfn[v]), max(dfn[u], dfn[v]));
}`,
    py: `def hld(g, root=0):
    n = len(g)
    fa, dep, sz, son = [-1] * n, [0] * n, [1] * n, [-1] * n

    def dfs1(u, p):
        fa[u], dep[u] = p, dep[p] + 1
        for v in g[u]:
            if v == p:
                continue
            dfs1(v, u)
            sz[u] += sz[v]
            if son[u] == -1 or sz[v] > sz[son[u]]:
                son[u] = v

    top, dfn, order = [0] * n, [0] * n, []
    def dfs2(u, t):
        top[u] = t
        dfn[u] = len(order)
        order.append(u)
        if son[u] != -1:
            dfs2(son[u], t)               # 重链连续编号
        for v in g[u]:
            if v != fa[u] and v != son[u]:
                dfs2(v, v)                # 轻儿子另起链头

    dfs1(root, -1)
    dfs2(root, root)
    return dfn, top, fa, dep, son`,
    java: `int[] dfn, top, fa, dep, sz, son; int timer = 0;
void dfs1(int u, int p, List<List<Integer>> g) {
    fa[u] = p; dep[u] = dep[p] + 1; sz[u] = 1;
    for (int v : g.get(u)) if (v != p) {
        dfs1(v, u, g);
        sz[u] += sz[v];
        if (son[u] == 0 || sz[v] > sz[son[u]]) son[u] = v;
    }
}
void dfs2(int u, int t, List<List<Integer>> g) {
    top[u] = t; dfn[u] = ++timer;
    if (son[u] != 0) dfs2(son[u], t, g);
    for (int v : g.get(u))
        if (v != fa[u] && v != son[u]) dfs2(v, v, g);
}`
  };

  S.kd_tree = {
    cpp: `// KD 树：按维度交替切分，中位数建树；查询时按超平面剪枝
struct KD { int d; KD *l = 0, *r = 0; vector<int> p; };
KD* build(vector<vector<int>>& pts, int dep) {
    if (pts.empty()) return nullptr;
    int d = dep % pts[0].size();
    sort(pts.begin(), pts.end(), [&](auto& a, auto& b) { return a[d] < b[d]; });
    int m = pts.size() / 2;
    KD* u = new KD{d, nullptr, nullptr, pts[m]};
    vector<vector<int>> L(pts.begin(), pts.begin() + m);
    vector<vector<int>> R(pts.begin() + m + 1, pts.end());
    u->l = build(L, dep + 1);
    u->r = build(R, dep + 1);
    return u;
}
void nearest(KD* u, vector<int>& q, long long& best) {
    if (!u) return;
    best = min(best, dist2(u->p, q));
    int d = u->d, diff = q[d] - u->p[d];
    nearest(diff < 0 ? u->l : u->r, q, best);
    if ((long long)diff * diff < best)             // 超平面可能更近才搜另一侧
        nearest(diff < 0 ? u->r : u->l, q, best);
}`,
    py: `import math

def build(points, depth=0):
    if not points:
        return None
    d = depth % len(points[0])
    points.sort(key=lambda p: p[d])
    m = len(points) // 2
    return {
        'd': d, 'p': points[m],
        'l': build(points[:m], depth + 1),
        'r': build(points[m + 1:], depth + 1),
    }

def nearest(node, q, best=[math.inf]):
    if not node:
        return best[0]
    d = node['d']
    dist = sum((a - b) ** 2 for a, b in zip(node['p'], q))
    best[0] = min(best[0], dist)
    diff = q[d] - node['p'][d]
    near, far = (node['l'], node['r']) if diff < 0 else (node['r'], node['l'])
    nearest(near, q, best)
    if diff * diff < best[0]:           # 球面与超平面相交才搜另一侧
        nearest(far, q, best)
    return best[0]`,
    java: `KD build(List<int[]> pts, int depth) {
    if (pts.isEmpty()) return null;
    int d = depth % pts.get(0).length;
    pts.sort((a, b) -> a[d] - b[d]);
    int m = pts.size() / 2;
    KD u = new KD();
    u.d = d; u.p = pts.get(m);
    u.l = build(new ArrayList<>(pts.subList(0, m)), depth + 1);
    u.r = build(new ArrayList<>(pts.subList(m + 1, pts.size())), depth + 1);
    return u;
}
void nearest(KD u, int[] q, long[] best) {
    if (u == null) return;
    long dist = 0;
    for (int i = 0; i < q.length; i++) dist += (long) (q[i] - u.p[i]) * (q[i] - u.p[i]);
    best[0] = Math.min(best[0], dist);
    int diff = q[u.d] - u.p[u.d];
    nearest(diff < 0 ? u.l : u.r, q, best);
    if ((long) diff * diff < best[0]) nearest(diff < 0 ? u.r : u.l, q, best);
}`
  };

  S.quadtree = {
    cpp: `// 四叉树：节点容纳点，超容量则四分；范围检索按包围盒剪枝
struct QT {
    double x0, y0, x1, y1;
    vector<Point> pts;
    QT *kid[4] = {0, 0, 0, 0};
    void insert(Point p) {
        if (!inside(p)) return;
        if (pts.size() < CAP && !kid[0]) { pts.push_back(p); return; }
        if (!kid[0]) split();                      // 超容量：四分
        for (int i = 0; i < 4; i++) kid[i]->insert(p);
    }
    void query(Rect r, vector<Point>& out) {
        if (!intersect(r)) return;                 // 不相交直接剪枝
        for (auto& p : pts) if (r.has(p)) out.push_back(p);
        for (int i = 0; i < 4; i++) if (kid[i]) kid[i]->query(r, out);
    }
};`,
    py: `class QuadTree:
    def __init__(self, x0, y0, x1, y1, cap=4):
        self.box = (x0, y0, x1, y1)
        self.pts = []
        self.kids = []
        self.cap = cap

    def insert(self, p):
        if not self._inside(p):
            return
        if len(self.pts) < self.cap and not self.kids:
            self.pts.append(p)
            return
        if not self.kids:
            self._split()
        for k in self.kids:
            k.insert(p)

    def query(self, rect, out):
        if not self._intersect(rect):
            return out                   # 包围盒不相交，整棵剪掉
        for p in self.pts:
            if rect[0] <= p[0] <= rect[2] and rect[1] <= p[1] <= rect[3]:
                out.append(p)
        for k in self.kids:
            k.query(rect, out)
        return out`,
    java: `class QuadTree {
    double x0, y0, x1, y1;
    List<double[]> pts = new ArrayList<>();
    QuadTree[] kids = new QuadTree[4];
    int cap = 4;

    void insert(double[] p) {
        if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) return;
        if (pts.size() < cap && kids[0] == null) { pts.add(p); return; }
        if (kids[0] == null) split();
        for (QuadTree k : kids) k.insert(p);
    }
    void query(double[] rect, List<double[]> out) {
        if (rect[2] < x0 || rect[0] > x1 || rect[3] < y0 || rect[1] > y1) return;
        for (double[] p : pts)
            if (p[0] >= rect[0] && p[0] <= rect[2] && p[1] >= rect[1] && p[1] <= rect[3]) out.add(p);
        if (kids[0] != null) for (QuadTree k : kids) k.query(rect, out);
    }
}`
  };

  S.lct = {
    cpp: `// LCT：splay 维护实链，access 打通根到 x 的路径
bool isRoot(int x) { return ch[fa[x]][0] != x && ch[fa[x]][1] != x; }
void rotate(int x) {
    int y = fa[x], z = fa[y], k = (ch[y][1] == x);
    if (!isRoot(y)) ch[z][ch[z][1] == y] = x;
    fa[x] = z;
    ch[y][k] = ch[x][k ^ 1]; if (ch[x][k ^ 1]) fa[ch[x][k ^ 1]] = y;
    ch[x][k ^ 1] = y; fa[y] = x;
    pushUp(y); pushUp(x);
}
void splay(int x) {
    static int stk[N]; int top = 0, y = x;
    stk[++top] = y;
    while (!isRoot(y)) stk[++top] = y = fa[y];
    while (top) pushDown(stk[top--]);
    while (!isRoot(x)) {
        int y = fa[x], z = fa[y];
        if (!isRoot(y)) rotate(((ch[y][0] == x) ^ (ch[z][0] == y)) ? x : y);
        rotate(x);
    }
}
void access(int x) {                       // 打通根到 x 的实链
    for (int y = 0; x; y = x, x = fa[x]) { splay(x); ch[x][1] = y; pushUp(x); }
}
void makeRoot(int x) { access(x); splay(x); rev[x] ^= 1; }   // 翻转区间
void link(int x, int y) { makeRoot(x); fa[x] = y; }
void cut(int x, int y) {
    makeRoot(x); access(y); splay(y);
    if (ch[y][0] == x && !ch[x][1]) { ch[y][0] = fa[x] = 0; pushUp(y); }
}`,
    py: `def access(x):
    """把根到 x 的路径打通成一条实链（splay 维护）"""
    last = 0
    while x:
        splay(x)
        ch[x][1] = last            # 右子树换成刚处理的那段
        push_up(x)
        last = x
        x = fa[x]
    return last

def make_root(x):
    access(x)
    splay(x)
    rev[x] ^= 1                    # 翻转整条链，x 成为根

def find_root(x):
    access(x); splay(x)
    while ch[x][0]:
        push_down(x); x = ch[x][0]
    splay(x)
    return x

def link(x, y):
    make_root(x)
    if find_root(y) != x:
        fa[x] = y                  # 连虚边

def cut(x, y):
    make_root(x)
    access(y); splay(y)
    if ch[y][0] == x and not ch[x][1]:
        ch[y][0] = fa[x] = 0
        push_up(y)`,
    java: `boolean isRoot(int x) { return ch[fa[x]][0] != x && ch[fa[x]][1] != x; }
void access(int x) {
    for (int y = 0; x != 0; y = x, x = fa[x]) {
        splay(x);
        ch[x][1] = y;
        pushUp(x);
    }
}
void makeRoot(int x) { access(x); splay(x); rev[x] ^= 1; }
void link(int x, int y) { makeRoot(x); fa[x] = y; }
void cut(int x, int y) {
    makeRoot(x); access(y); splay(y);
    if (ch[y][0] == x && ch[x][1] == 0) { ch[y][0] = 0; fa[x] = 0; pushUp(y); }
}`
  };

  S.graph_repr = {
    cpp: `// 三种表示互转：邻接矩阵 / 邻接表 / 边集
vector<vector<int>> toMatrix(int n, vector<pair<int,int>>& edges) {
    vector<vector<int>> m(n, vector<int>(n, 0));
    for (auto [u, v] : edges) m[u][v] = 1;
    return m;
}
vector<vector<int>> toAdjList(int n, vector<pair<int,int>>& edges) {
    vector<vector<int>> g(n);
    for (auto [u, v] : edges) g[u].push_back(v);
    return g;
}
vector<pair<int,int>> toEdgeList(vector<vector<int>>& g) {
    vector<pair<int,int>> es;
    for (int u = 0; u < (int)g.size(); u++)
        for (int v : g[u]) es.push_back({u, v});
    return es;
}`,
    py: `def to_matrix(n, edges):
    m = [[0] * n for _ in range(n)]
    for u, v in edges:
        m[u][v] = 1
    return m

def to_adj(n, edges):
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)
    return g

def to_edges(g):
    return [(u, v) for u in range(len(g)) for v in g[u]]`,
    java: `int[][] toMatrix(int n, int[][] edges) {
    int[][] m = new int[n][n];
    for (int[] e : edges) m[e[0]][e[1]] = 1;
    return m;
}
List<List<Integer>> toAdj(int n, int[][] edges) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) g.get(e[0]).add(e[1]);
    return g;
}`
  };

  S.forward_star = {
    cpp: `// 链式前向星：head[u] 指向第一条边，nxt 串起同起点的边
int head[N], to[M], nxt[M], w[M], tot = 0;
void addEdge(int u, int v, int c) {
    to[++tot] = v; w[tot] = c;
    nxt[tot] = head[u]; head[u] = tot;     // 头插
}
void traverse(int u) {
    for (int e = head[u]; e; e = nxt[e]) {
        int v = to[e], c = w[e];            // 依次访问 u 的邻边
    }
}`,
    py: `head, to, nxt, wt = {}, [], [], []
tot = 0

def add_edge(u, v, c):
    global tot
    tot += 1
    to.append(v); wt.append(c); nxt.append(head.get(u, 0))
    head[u] = tot                 # 头插法

def neighbors(u):
    e = head.get(u, 0)
    while e:
        yield to[e - 1], wt[e - 1]
        e = nxt[e - 1]`,
    java: `int[] head, to, nxt, w; int tot = 0;
void addEdge(int u, int v, int c) {
    to[++tot] = v; w[tot] = c;
    nxt[tot] = head[u]; head[u] = tot;
}
void traverse(int u) {
    for (int e = head[u]; e != 0; e = nxt[e]) {
        int v = to[e], c = w[e];
    }
}`
  };
})();
