/* ============================================================
 * 三语言教学实现 · 第 3 卷（多路树 / 堆 / 并查集基础）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.btree_insert = {
    cpp: `// B 树插入（自顶向下预分裂，阶 M）：满节点先裂，再下降
struct Node { vector<int> key; vector<Node*> ch; bool leaf = true; };

void splitChild(Node* p, int i) {                 // 裂开 p->ch[i]
    Node* y = p->ch[i];
    Node* z = new Node;
    int mid = y->key.size() / 2;
    z->key.assign(y->key.begin() + mid + 1, y->key.end());
    z->leaf = y->leaf;
    y->key.resize(mid);
    if (!y->leaf) {
        z->ch.assign(y->ch.begin() + mid + 1, y->ch.end());
        y->ch.resize(mid + 1);
    }
    p->key.insert(p->key.begin() + i, y->key[mid]);
    p->ch.insert(p->ch.begin() + i + 1, z);
}

void insert(Node*& root, int k, int M) {
    if (root->key.size() == M - 1) {
        Node* s = new Node; s->leaf = false; s->ch.push_back(root);
        root = s; splitChild(s, 0);
    }
    Node* u = root;
    while (!u->leaf) {
        int i = upper_bound(u->key.begin(), u->key.end(), k) - u->key.begin();
        if (u->ch[i]->key.size() == M - 1) { splitChild(u, i); if (k > u->key[i]) i++; }
        u = u->ch[i];
    }
    u->key.insert(upper_bound(u->key.begin(), u->key.end(), k), k);
}`,
    py: `class Node:
    def __init__(self, leaf=True):
        self.key, self.ch, self.leaf = [], [], leaf

def split_child(p, i):                    # 裂开 p.ch[i]
    y = p.ch[i]
    z = Node(y.leaf)
    mid = len(y.key) // 2
    z.key = y.key[mid + 1:]
    y.key = y.key[:mid]
    if not y.leaf:
        z.ch = y.ch[mid + 1:]
        y.ch = y.ch[:mid + 1]
    p.key.insert(i, y.key[mid])
    p.ch.insert(i + 1, z)

def insert(root, k, M):
    if len(root.key) == M - 1:            # 根满，先长高一层
        s = Node(leaf=False); s.ch = [root]
        split_child(s, 0); root = s
    u = root
    while not u.leaf:
        i = bisect_right(u.key, k)
        if len(u.ch[i].key) == M - 1:
            split_child(u, i)
            if k > u.key[i]: i += 1
        u = u.ch[i]
    u.key.insert(bisect_right(u.key, k), k)
    return root`,
    java: `List<Integer> splitChild(Node p, int i, int M) {
    Node y = p.ch.get(i), z = new Node(y.leaf);
    int mid = y.key.size() / 2;
    z.key.addAll(y.key.subList(mid + 1, y.key.size()));
    y.key.subList(mid, y.key.size()).clear();
    if (!y.leaf) {
        z.ch.addAll(y.ch.subList(mid + 1, y.ch.size()));
        y.ch.subList(mid + 1, y.ch.size()).clear();
    }
    p.key.add(i, y.key.get(splitPos));
    p.ch.add(i + 1, z);
    return p.key;
}

Node insert(Node root, int k, int M) {
    if (root.key.size() == M - 1) {
        Node s = new Node(false); s.ch.add(root);
        splitChild(s, 0, M); root = s;
    }
    Node u = root;
    while (!u.leaf) {
        int i = upperBound(u.key, k);
        if (u.ch.get(i).key.size() == M - 1) {
            splitChild(u, i, M);
            if (k > u.key.get(i)) i++;
        }
        u = u.ch.get(i);
    }
    u.key.add(upperBound(u.key, k), k);
    return root;
}`
  };

  S.btree_delete = {
    cpp: `// 删除前先「补」：兄弟富余则借键，否则父键下沉合并
void fixChild(Node* u, int i, int M) {
    Node* c = u->ch[i];
    int minKeys = (M + 1) / 2 - 1;
    if (c->key.size() >= minKeys) return;
    Node* L = i > 0 ? u->ch[i - 1] : nullptr;
    Node* R = i + 1 < (int)u->ch.size() ? u->ch[i + 1] : nullptr;
    if (L && L->key.size() > minKeys) {          // 向左兄弟借
        c->key.insert(c->key.begin(), u->key[i - 1]);
        u->key[i - 1] = L->key.back(); L->key.pop_back();
        if (!L->leaf) { c->ch.insert(c->ch.begin(), L->ch.back()); L->ch.pop_back(); }
    } else if (R && R->key.size() > minKeys) {   // 向右兄弟借
        c->key.push_back(u->key[i]);
        u->key[i] = R->key.front(); R->key.erase(R->key.begin());
        if (!R->leaf) { c->ch.push_back(R->ch.front()); R->ch.erase(R->ch.begin()); }
    } else if (L) {                              // 与左兄弟合并
        L->key.push_back(u->key[i - 1]);
        L->key.insert(L->key.end(), c->key.begin(), c->key.end());
        L->ch.insert(L->ch.end(), c->ch.begin(), c->ch.end());
        u->key.erase(u->key.begin() + i - 1);
        u->ch.erase(u->ch.begin() + i);
    } else {                                     // 与右兄弟合并
        c->key.push_back(u->key[i]);
        c->key.insert(c->key.end(), R->key.begin(), R->key.end());
        c->ch.insert(c->ch.end(), R->ch.begin(), R->ch.end());
        u->key.erase(u->key.begin() + i);
        u->ch.erase(u->ch.begin() + i + 1);
    }
}`,
    py: `def fix_child(u, i, M):
    c = u.ch[i]
    min_keys = (M + 1) // 2 - 1
    if len(c.key) >= min_keys:
        return
    L = u.ch[i - 1] if i > 0 else None
    R = u.ch[i + 1] if i + 1 < len(u.ch) else None
    if L and len(L.key) > min_keys:            # 向左借
        c.key.insert(0, u.key[i - 1])
        u.key[i - 1] = L.key.pop()
        if not L.leaf:
            c.ch.insert(0, L.ch.pop())
    elif R and len(R.key) > min_keys:          # 向右借
        c.key.append(u.key[i])
        u.key[i] = R.key.pop(0)
        if not R.leaf:
            c.ch.append(R.ch.pop(0))
    elif L:                                    # 与左合并
        L.key.append(u.key.pop(i - 1))
        L.key += c.key; L.ch += c.ch
        u.ch.pop(i)
    else:                                      # 与右合并
        c.key.append(u.key.pop(i))
        c.key += R.key; c.ch += R.ch
        u.ch.pop(i + 1)`,
    java: `void fixChild(Node u, int i, int M) {
    Node c = u.ch.get(i);
    int minKeys = (M + 1) / 2 - 1;
    if (c.key.size() >= minKeys) return;
    Node L = i > 0 ? u.ch.get(i - 1) : null;
    Node R = i + 1 < u.ch.size() ? u.ch.get(i + 1) : null;
    if (L != null && L.key.size() > minKeys) {
        c.key.add(0, u.key.get(i - 1));
        u.key.set(i - 1, L.key.remove(L.key.size() - 1));
        if (!L.leaf) c.ch.add(0, L.ch.remove(L.ch.size() - 1));
    } else if (R != null && R.key.size() > minKeys) {
        c.key.add(u.key.get(i));
        u.key.set(i, R.key.remove(0));
        if (!R.leaf) c.ch.add(R.ch.remove(0));
    } else if (L != null) {
        L.key.add(u.key.remove(i - 1));
        L.key.addAll(c.key); L.ch.addAll(c.ch);
        u.ch.remove(i);
    } else {
        c.key.add(u.key.remove(i));
        c.key.addAll(R.key); c.ch.addAll(R.ch);
        u.ch.remove(i + 1);
    }
}`
  };

  S.bplus_range = {
    cpp: `// B+ 树范围查询：先下潜定位 L，再沿叶子链表扫到 R
struct Leaf { vector<int> key; Leaf* next; };

void rangeQuery(Node* root, int L, int R, vector<int>& out) {
    Node* u = root;
    while (!u->leaf) {                       // 内部节点只做路由
        int i = 0;
        while (i + 1 < (int)u->key.size() && L >= u->key[i + 1]) i++;
        u = u->ch[i];
    }
    for (Leaf* p = (Leaf*)u; p; p = p->next) {
        for (int k : p->key) {
            if (k < L) continue;
            if (k > R) return;
            out.push_back(k);
        }
    }
}`,
    py: `def range_query(root, L, R):
    u = root
    while not u.leaf:                 # 内部节点只负责路由
        i = 0
        while i + 1 < len(u.key) and L >= u.key[i + 1]:
            i += 1
        u = u.ch[i]
    out = []
    p = u
    while p:                          # 叶子层双向链表横向滑行
        for k in p.key:
            if k < L: continue
            if k > R: return out
            out.append(k)
        p = p.next
    return out`,
    java: `List<Integer> rangeQuery(Node root, int L, int R) {
    Node u = root;
    while (!u.leaf) {
        int i = 0;
        while (i + 1 < u.key.size() && L >= u.key.get(i + 1)) i++;
        u = u.ch.get(i);
    }
    List<Integer> out = new ArrayList<>();
    for (Node p = u; p != null; p = p.next) {
        for (int k : p.key) {
            if (k < L) continue;
            if (k > R) return out;
            out.add(k);
        }
    }
    return out;
}`
  };

  S.two_three_four = {
    cpp: `// 2-3-4 树（自顶向下）：下降前先把 4-节点劈开
void insert(Node*& root, int k) {
    if (!root) { root = new Node{k}; return; }
    if (root->key.size() == 3) {              // 根是 4-节点：先长高
        Node* s = new Node; s->ch.push_back(root);
        split(s, 0); root = s;
    }
    Node* u = root;
    while (!u->leaf) {
        int i = upper_bound(u->key.begin(), u->key.end(), k) - u->key.begin();
        if (u->ch[i]->key.size() == 3) { split(u, i); if (k > u->key[i]) i++; }
        u = u->ch[i];
    }
    u->key.insert(upper_bound(u->key.begin(), u->key.end(), k), k);   // 2/3-节点直接放
}`,
    py: `def insert(root, k):
    if not root:
        return Node([k])
    if len(root.key) == 3:                    # 根为 4-节点，先长高
        s = Node([], [root])
        split(s, 0)
        root = s
    u = root
    while not u.leaf:
        i = bisect_right(u.key, k)
        if len(u.ch[i].key) == 3:
            split(u, i)
            if k > u.key[i]:
                i += 1
        u = u.ch[i]
    insort(u.key, k)
    return root`,
    java: `Node insert(Node root, int k) {
    if (root == null) return new Node(k);
    if (root.key.size() == 3) {
        Node s = new Node(); s.ch.add(root);
        split(s, 0); root = s;
    }
    Node u = root;
    while (!u.leaf) {
        int i = upperBound(u.key, k);
        if (u.ch.get(i).key.size() == 3) {
            split(u, i);
            if (k > u.key.get(i)) i++;
        }
        u = u.ch.get(i);
    }
    u.key.add(upperBound(u.key, k), k);
    return root;
}`
  };

  S.bstar_tree = {
    cpp: `// B* 树：节点至少 2/3 满；兄弟也满时做 2-to-3 分裂
void insertBStar(Node*& root, int k, int M) {
    Node* u = root;
    while (!u->leaf) {
        int i = upper_bound(u->key.begin(), u->key.end(), k) - u->key.begin();
        Node* c = u->ch[i];
        int full = (M - 1) * 2 / 3;
        if ((int)c->key.size() >= full) {
            Node* sib = (i + 1 < (int)u->ch.size()) ? u->ch[i + 1] : (i ? u->ch[i - 1] : nullptr);
            if (sib && (int)sib->key.size() < M - 1) {
                // 1) 先向兄弟转移一个键（父键中转）
                transfer(u, i, sib);
            } else {
                // 2) 双满：两节点 + 父键合成 2-to-3 分裂
                split2to3(u, i, M);
            }
        }
        u = u->ch[upper_bound(u->key.begin(), u->key.end(), k) - u->key.begin()];
    }
    u->key.insert(upper_bound(u->key.begin(), u->key.end(), k), k);
}`,
    py: `def insert_bstar(u, k, M):
    while not u.leaf:
        i = bisect_right(u.key, k)
        c = u.ch[i]
        full = (M - 1) * 2 // 3
        if len(c.key) >= full:
            sib = u.ch[i + 1] if i + 1 < len(u.ch) else (u.ch[i - 1] if i else None)
            if sib and len(sib.key) < M - 1:
                transfer(u, i, sib)        # 兄弟还有余量：转移
            else:
                split_2to3(u, i, M)        # 双满：2-to-3 分裂
        i = bisect_right(u.key, k)
        u = u.ch[i]
    insort(u.key, k)
    return u`,
    java: `Node insertBStar(Node u, int k, int M) {
    while (!u.leaf) {
        int i = upperBound(u.key, k);
        Node c = u.ch.get(i);
        int full = (M - 1) * 2 / 3;
        if (c.key.size() >= full) {
            Node sib = i + 1 < u.ch.size() ? u.ch.get(i + 1) : (i > 0 ? u.ch.get(i - 1) : null);
            if (sib != null && sib.key.size() < M - 1) transfer(u, i, sib);
            else split2to3(u, i, M);
        }
        u = u.ch.get(upperBound(u.key, k));
    }
    u.key.add(upperBound(u.key, k), k);
    return u;
}`
  };

  S.binary_heap = {
    cpp: `// 二叉堆：数组存储，父子下标 i -> 2i+1 / 2i+2
void siftUp(vector<int>& h, int i) {
    while (i > 0 && h[(i - 1) / 2] > h[i]) {
        swap(h[i], h[(i - 1) / 2]); i = (i - 1) / 2;
    }
}
void siftDown(vector<int>& h, int i) {
    int n = h.size();
    while (true) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && h[l] < h[m]) m = l;
        if (r < n && h[r] < h[m]) m = r;
        if (m == i) break;
        swap(h[i], h[m]); i = m;
    }
}
void buildFloyd(vector<int>& h) {                 // O(n) 建堆
    for (int i = h.size() / 2 - 1; i >= 0; i--) siftDown(h, i);
}`,
    py: `def sift_up(h, i):
    while i > 0 and h[(i - 1) // 2] > h[i]:
        h[i], h[(i - 1) // 2] = h[(i - 1) // 2], h[i]
        i = (i - 1) // 2

def sift_down(h, i):
    n = len(h)
    while True:
        l, r, m = 2 * i + 1, 2 * i + 2, i
        if l < n and h[l] < h[m]: m = l
        if r < n and h[r] < h[m]: m = r
        if m == i: break
        h[i], h[m] = h[m], h[i]
        i = m

def build_floyd(h):                   # O(n) 建堆
    for i in range(len(h) // 2 - 1, -1, -1):
        sift_down(h, i)`,
    java: `void siftUp(int[] h, int i) {
    while (i > 0 && h[(i - 1) / 2] > h[i]) {
        int t = h[i]; h[i] = h[(i - 1) / 2]; h[(i - 1) / 2] = t;
        i = (i - 1) / 2;
    }
}
void siftDown(int[] h, int i, int n) {
    while (true) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && h[l] < h[m]) m = l;
        if (r < n && h[r] < h[m]) m = r;
        if (m == i) break;
        int t = h[i]; h[i] = h[m]; h[m] = t;
        i = m;
    }
}
void buildFloyd(int[] h) {
    for (int i = h.length / 2 - 1; i >= 0; i--) siftDown(h, i, h.length);
}`
  };

  S.dsu = {
    cpp: `// 并查集：路径压缩 + 按秩合并，均摊 O(alpha(n))
int find(vector<int>& fa, int x) {
    return fa[x] == x ? x : fa[x] = find(fa, fa[x]);
}
void unite(vector<int>& fa, vector<int>& rk, int a, int b) {
    a = find(fa, a); b = find(fa, b);
    if (a == b) return;
    if (rk[a] < rk[b]) swap(a, b);
    fa[b] = a;
    if (rk[a] == rk[b]) rk[a]++;
}`,
    py: `def find(fa, x):
    if fa[x] != x:
        fa[x] = find(fa, fa[x])        # 路径压缩：直接挂到根
    return fa[x]

def unite(fa, rk, a, b):
    a, b = find(fa, a), find(fa, b)
    if a == b:
        return False
    if rk[a] < rk[b]:
        a, b = b, a
    fa[b] = a
    if rk[a] == rk[b]:
        rk[a] += 1
    return True`,
    java: `int find(int[] fa, int x) {
    return fa[x] == x ? x : (fa[x] = find(fa, fa[x]));
}
boolean unite(int[] fa, int[] rk, int a, int b) {
    a = find(fa, a); b = find(fa, b);
    if (a == b) return false;
    if (rk[a] < rk[b]) { int t = a; a = b; b = t; }
    fa[b] = a;
    if (rk[a] == rk[b]) rk[a]++;
    return true;
}`
  };

  S.dsu_weighted = {
    cpp: `// 带权并查集：d[x] 表示 x 到父亲的偏移，find 时顺带累加
int find(vector<int>& fa, vector<int>& d, int x) {
    if (fa[x] == x) return x;
    int p = fa[x];
    int r = find(fa, d, p);
    d[x] += d[p];                       // 前缀和：x -> 根的总偏移
    return fa[x] = r;
}
// 已知 relation(x, y) = w（模 mod）时合并：
void unite(int x, int y, int w, vector<int>& fa, vector<int>& d) {
    int rx = find(fa, d, x), ry = find(fa, d, y);
    if (rx == ry) return;               // 可用 d[x]-d[y] 校验矛盾
    fa[rx] = ry; d[rx] = d[y] + w - d[x];
}`,
    py: `def find(fa, d, x):
    if fa[x] == x:
        return x
    p = fa[x]
    r = find(fa, d, p)
    d[x] += d[p]                       # 前缀和：x 到根的偏移
    fa[x] = r
    return r

def unite(x, y, w, fa, d):             # 关系 x - y = w
    rx, ry = find(fa, d, x), find(fa, d, y)
    if rx == ry:
        return d[x] - d[y] == w        # 校验是否矛盾
    fa[rx] = ry
    d[rx] = d[y] + w - d[x]
    return True`,
    java: `int find(int[] fa, int[] d, int x) {
    if (fa[x] == x) return x;
    int p = fa[x];
    int r = find(fa, d, p);
    d[x] += d[p];
    return fa[x] = r;
}
boolean unite(int x, int y, int w, int[] fa, int[] d) {
    int rx = find(fa, d, x), ry = find(fa, d, y);
    if (rx == ry) return d[x] - d[y] == w;
    fa[rx] = ry;
    d[rx] = d[y] + w - d[x];
    return true;
}`
  };

  S.dsu_rollback = {
    cpp: `// 可撤销并查集：不路径压缩（否则无法回滚），按秩合并 + 操作栈
struct Op { int child, root, rankRoot; };
vector<Op> hist;

int find(vector<int>& fa, int x) { while (fa[x] != x) x = fa[x]; return x; }

bool unite(vector<int>& fa, vector<int>& rk, int a, int b) {
    a = find(fa, a); b = find(fa, b);
    if (a == b) return false;
    if (rk[a] < rk[b]) swap(a, b);
    hist.push_back({b, a, rk[a]});
    fa[b] = a;
    if (rk[a] == rk[b]) rk[a]++;
    return true;
}
void rollback(size_t snap) {              // 回滚到快照时刻
    while (hist.size() > snap) {
        Op op = hist.back(); hist.pop_back();
        fa[op.child] = op.child;
        rk[op.root] = op.rankRoot;
    }
}`,
    py: `hist = []

def find(fa, x):                      # 不压缩，才能撤销
    while fa[x] != x:
        x = fa[x]
    return x

def unite(fa, rk, a, b):
    a, b = find(fa, a), find(fa, b)
    if a == b:
        return False
    if rk[a] < rk[b]:
        a, b = b, a
    hist.append((b, a, rk[a]))
    fa[b] = a
    if rk[a] == rk[b]:
        rk[a] += 1
    return True

def rollback(fa, rk, snap):
    while len(hist) > snap:
        child, root, old_rank = hist.pop()
        fa[child] = child
        rk[root] = old_rank`,
    java: `Deque<int[]> hist = new ArrayDeque<>();

int find(int[] fa, int x) { while (fa[x] != x) x = fa[x]; return x; }

boolean unite(int[] fa, int[] rk, int a, int b) {
    a = find(fa, a); b = find(fa, b);
    if (a == b) return false;
    if (rk[a] < rk[b]) { int t = a; a = b; b = t; }
    hist.push(new int[]{b, a, rk[a]});
    fa[b] = a;
    if (rk[a] == rk[b]) rk[a]++;
    return true;
}
void rollback(int[] fa, int[] rk, int snap) {
    while (hist.size() > snap) {
        int[] op = hist.pop();
        fa[op[0]] = op[0];
        rk[op[1]] = op[2];
    }
}`
  };
})();
