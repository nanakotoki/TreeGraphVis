/* ============================================================
 * 三语言教学实现 · 第 2 卷（平衡搜索树）
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.avl_insert = {
    cpp: `// AVL：高度差 |BF| <= 1，失衡时四种旋转
struct Node { int val, h = 1; Node *l = 0, *r = 0; };
int H(Node* u) { return u ? u->h : 0; }
int BF(Node* u) { return u ? H(u->l) - H(u->r) : 0; }
void pull(Node* u) { u->h = 1 + max(H(u->l), H(u->r)); }

Node* rotR(Node* y) { Node* x = y->l; y->l = x->r; x->r = y; pull(y); pull(x); return x; }
Node* rotL(Node* x) { Node* y = x->r; x->r = y->l; y->l = x; pull(x); pull(y); return y; }

Node* insert(Node* u, int key) {
    if (!u) return new Node{key};
    if (key < u->val) u->l = insert(u->l, key);
    else if (key > u->val) u->r = insert(u->r, key);
    else return u;
    pull(u);
    int bf = BF(u);
    if (bf > 1 && key < u->l->val)   return rotR(u);              // LL
    if (bf < -1 && key > u->r->val)  return rotL(u);              // RR
    if (bf > 1 && key > u->l->val) { u->l = rotL(u->l); return rotR(u); }  // LR
    if (bf < -1 && key < u->r->val){ u->r = rotR(u->r); return rotL(u); }  // RL
    return u;
}`,
    py: `def h(u):  return u.h if u else 0
def bf(u): return h(u.left) - h(u.right) if u else 0
def pull(u): u.h = 1 + max(h(u.left), h(u.right))

def rot_right(y):
    x = y.left; y.left = x.right; x.right = y
    pull(y); pull(x); return x

def rot_left(x):
    y = x.right; x.right = y.left; y.left = x
    pull(x); pull(y); return y

def insert(u, key):
    if not u: return Node(key)
    if key < u.val:   u.left = insert(u.left, key)
    elif key > u.val: u.right = insert(u.right, key)
    else: return u
    pull(u)
    b = bf(u)
    if b > 1 and key < u.left.val:    return rot_right(u)          # LL
    if b < -1 and key > u.right.val:  return rot_left(u)           # RR
    if b > 1 and key > u.left.val:    u.left = rot_left(u.left); return rot_right(u)   # LR
    if b < -1 and key < u.right.val:  u.right = rot_right(u.right); return rot_left(u) # RL
    return u`,
    java: `int h(Node u) { return u == null ? 0 : u.h; }
int bf(Node u) { return u == null ? 0 : h(u.l) - h(u.r); }
void pull(Node u) { u.h = 1 + Math.max(h(u.l), h(u.r)); }

Node rotR(Node y) { Node x = y.l; y.l = x.r; x.r = y; pull(y); pull(x); return x; }
Node rotL(Node x) { Node y = x.r; x.r = y.l; y.l = x; pull(x); pull(y); return y; }

Node insert(Node u, int key) {
    if (u == null) return new Node(key);
    if (key < u.val)      u.l = insert(u.l, key);
    else if (key > u.val) u.r = insert(u.r, key);
    else return u;
    pull(u);
    int b = bf(u);
    if (b > 1 && key < u.l.val)   return rotR(u);
    if (b < -1 && key > u.r.val)  return rotL(u);
    if (b > 1 && key > u.l.val)  { u.l = rotL(u.l); return rotR(u); }
    if (b < -1 && key < u.r.val) { u.r = rotR(u.r); return rotL(u); }
    return u;
}`
  };

  S.rbt_insert = {
    cpp: `// 红黑树插入：新点染红，双红冲突按叔节点分三种 Case
void insertFix(Node*& root, Node* z) {
    while (z->p && z->p->red) {
        Node* g = z->p->p;
        bool left = (z->p == g->l);
        Node* uncle = left ? g->r : g->l;
        if (uncle && uncle->red) {                 // Case 1：叔红 -> 变色上溢
            z->p->red = uncle->red = false;
            g->red = true;
            z = g;
        } else {
            if (left && z == z->p->r) {            // Case 2：折线 -> 先左旋
                z = z->p; rotateLeft(root, z);
            } else if (!left && z == z->p->l) {
                z = z->p; rotateRight(root, z);
            }
            z->p->red = false;                     // Case 3：共线 -> 旋转 + 变色
            g->red = true;
            if (left) rotateRight(root, g); else rotateLeft(root, g);
        }
    }
    root->red = false;                             // 根永远黑
}`,
    py: `def insert_fix(root, z):
    while z.parent and z.parent.red:
        g = z.parent.parent
        left = (z.parent is g.left)
        uncle = g.right if left else g.left
        if uncle and uncle.red:                    # Case 1：叔红，变色上溢
            z.parent.red = uncle.red = False
            g.red = True
            z = g
        else:
            if left and z is z.parent.right:        # Case 2：折线转共线
                z = z.parent; rotate_left(root, z)
            elif not left and z is z.parent.left:
                z = z.parent; rotate_right(root, z)
            z.parent.red = False                    # Case 3：共线，旋转 + 变色
            g.red = True
            rotate_right(root, g) if left else rotate_left(root, g)
    root.red = False`,
    java: `void insertFix(Node root, Node z) {
    while (z.p != null && z.p.red) {
        Node g = z.p.p;
        boolean left = (z.p == g.l);
        Node uncle = left ? g.r : g.l;
        if (uncle != null && uncle.red) {          // Case 1
            z.p.red = false; uncle.red = false; g.red = true;
            z = g;
        } else {
            if (left && z == z.p.r) {              // Case 2
                z = z.p; rotateLeft(root, z);
            } else if (!left && z == z.p.l) {
                z = z.p; rotateRight(root, z);
            }
            z.p.red = false;                       // Case 3
            g.red = true;
            if (left) rotateRight(root, g); else rotateLeft(root, g);
        }
    }
    root.red = false;
}`
  };

  S.rbt_delete = {
    cpp: `// 删除后出现「双黑」，按兄弟颜色与侄子颜色分四个 Case 修复
void deleteFix(Node*& root, Node* x, Node* p) {
    while (x != root && (!x || !x->red)) {
        bool left = (x == p->l);
        Node* w = left ? p->r : p->l;              // 兄弟
        if (w->red) {                              // Case 1：兄弟红 -> 转成兄黑
            w->red = false; p->red = true;
            if (left) rotateLeft(root, p); else rotateRight(root, p);
            w = left ? p->r : p->l;
        }
        if ((!w->l || !w->l->red) && (!w->r || !w->r->red)) {
            w->red = true;                         // Case 2：双侄皆黑，上移双黑
            x = p; p = p->p;
        } else {
            if (left && (!w->r || !w->r->red)) {   // Case 3：近侄红远侄黑
                w->l->red = false; w->red = true;
                rotateRight(root, w); w = p->r;
            } else if (!left && (!w->l || !w->l->red)) {
                w->r->red = false; w->red = true;
                rotateLeft(root, w); w = p->l;
            }
            w->red = p->red;                       // Case 4：远侄红，旋转收工
            p->red = false;
            if (left) { w->r->red = false; rotateLeft(root, p); }
            else      { w->l->red = false; rotateRight(root, p); }
            x = root;
        }
    }
    if (x) x->red = false;
}`,
    py: `def delete_fix(root, x, p):
    while x is not root and (not x or not x.red):
        left = (x is p.left)
        w = p.right if left else p.left            # 兄弟
        if w.red:                                  # Case 1：兄弟红
            w.red = False; p.red = True
            rotate_left(root, p) if left else rotate_right(root, p)
            w = p.right if left else p.left
        if (not w.left or not w.left.red) and (not w.right or not w.right.red):
            w.red = True                           # Case 2：双侄皆黑
            x, p = p, p.parent
        else:
            if left and (not w.right or not w.right.red):   # Case 3
                w.left.red = False; w.red = True
                rotate_right(root, w); w = p.right
            elif not left and (not w.left or not w.left.red):
                w.right.red = False; w.red = True
                rotate_left(root, w); w = p.left
            w.red = p.red                          # Case 4：远侄红
            p.red = False
            if left:
                w.right.red = False; rotate_left(root, p)
            else:
                w.left.red = False; rotate_right(root, p)
            x = root
    if x: x.red = False`,
    java: `void deleteFix(Node root, Node x, Node p) {
    while (x != root && (x == null || !x.red)) {
        boolean left = (x == p.l);
        Node w = left ? p.r : p.l;
        if (w.red) {                                // Case 1
            w.red = false; p.red = true;
            if (left) rotateLeft(root, p); else rotateRight(root, p);
            w = left ? p.r : p.l;
        }
        if ((w.l == null || !w.l.red) && (w.r == null || !w.r.red)) {
            w.red = true;                           // Case 2
            x = p; p = p.p;
        } else {
            if (left && (w.r == null || !w.r.red)) { // Case 3
                w.l.red = false; w.red = true;
                rotateRight(root, w); w = p.r;
            } else if (!left && (w.l == null || !w.l.red)) {
                w.r.red = false; w.red = true;
                rotateLeft(root, w); w = p.l;
            }
            w.red = p.red;                          // Case 4
            p.red = false;
            if (left) { w.r.red = false; rotateLeft(root, p); }
            else      { w.l.red = false; rotateRight(root, p); }
            x = root;
        }
    }
    if (x != null) x.red = false;
}`
  };

  S.splay = {
    cpp: `// Splay：按 Zig / Zig-Zig / Zig-Zag 把 x 转到根
void splay(Node*& root, Node* x) {
    while (x->p) {
        Node* p = x->p, *g = p->p;
        if (!g) {                                  // Zig
            if (x == p->l) rotateRight(root, p); else rotateLeft(root, p);
        } else if ((x == p->l) == (p == g->l)) {   // Zig-Zig：先转父再转己
            if (x == p->l) { rotateRight(root, g); rotateRight(root, p); }
            else           { rotateLeft(root, g);  rotateLeft(root, p);  }
        } else {                                   // Zig-Zag：连转两次自己
            if (x == p->l) { rotateRight(root, p); rotateLeft(root, g); }
            else           { rotateLeft(root, p);  rotateRight(root, g); }
        }
    }
}`,
    py: `def splay(root, x):
    while x.parent:
        p, g = x.parent, x.parent.parent
        if not g:                                  # Zig
            rotate_right(root, p) if x is p.left else rotate_left(root, p)
        elif (x is p.left) == (p is g.left):       # Zig-Zig
            if x is p.left:
                rotate_right(root, g); rotate_right(root, p)
            else:
                rotate_left(root, g); rotate_left(root, p)
        else:                                      # Zig-Zag
            if x is p.left:
                rotate_right(root, p); rotate_left(root, g)
            else:
                rotate_left(root, p); rotate_right(root, g)`,
    java: `void splay(Node root, Node x) {
    while (x.p != null) {
        Node p = x.p, g = p.p;
        if (g == null) {
            if (x == p.l) rotateRight(root, p); else rotateLeft(root, p);
        } else if ((x == p.l) == (p == g.l)) {
            if (x == p.l) { rotateRight(root, g); rotateRight(root, p); }
            else          { rotateLeft(root, g);  rotateLeft(root, p);  }
        } else {
            if (x == p.l) { rotateRight(root, p); rotateLeft(root, g); }
            else          { rotateLeft(root, p);  rotateRight(root, g); }
        }
    }
}`
  };

  S.treap = {
    cpp: `// Treap = BST(键) + 堆(随机优先级)，插入后按优先级旋转上浮
Node* insert(Node* u, int key) {
    if (!u) return new Node{key, rand()};
    if (key < u->val) {
        u->l = insert(u->l, key);
        if (u->l->prio < u->prio) u = rotR(u);     // 小根堆
    } else if (key > u->val) {
        u->r = insert(u->r, key);
        if (u->r->prio < u->prio) u = rotL(u);
    }
    return u;
}`,
    py: `import random

def insert(u, key):
    if not u:
        return Node(key, random.random())
    if key < u.val:
        u.left = insert(u.left, key)
        if u.left.prio < u.prio:
            u = rot_right(u)
    elif key > u.val:
        u.right = insert(u.right, key)
        if u.right.prio < u.prio:
            u = rot_left(u)
    return u`,
    java: `Node insert(Node u, int key) {
    if (u == null) return new Node(key, Math.random());
    if (key < u.val) {
        u.l = insert(u.l, key);
        if (u.l.prio < u.prio) u = rotR(u);
    } else if (key > u.val) {
        u.r = insert(u.r, key);
        if (u.r.prio < u.prio) u = rotL(u);
    }
    return u;
}`
  };

  S.fhq_treap = {
    cpp: `// FHQ-Treap：split 按值拆成两棵，merge 按优先级缝合
void split(Node* u, int key, Node*& a, Node*& b) {   // a: <=key, b: >key
    if (!u) { a = b = nullptr; return; }
    if (u->val <= key) { split(u->r, key, u->r, b); a = u; }
    else               { split(u->l, key, a, u->l); b = u; }
    pull(u);
}
Node* merge(Node* a, Node* b) {
    if (!a || !b) return a ? a : b;
    if (a->prio < b->prio) { a->r = merge(a->r, b); pull(a); return a; }
    b->l = merge(a, b->l); pull(b); return b;
}`,
    py: `def split(u, key):                 # 返回 (<=key, >key)
    if not u:
        return None, None
    if u.val <= key:
        a, b = split(u.right, key)
        u.right = a
        pull(u)
        return u, b
    a, b = split(u.left, key)
    u.left = b
    pull(u)
    return a, u

def merge(a, b):
    if not a or not b:
        return a or b
    if a.prio < b.prio:
        a.right = merge(a.right, b); pull(a); return a
    b.left = merge(a, b.left); pull(b); return b`,
    java: `Node[] split(Node u, int key) {      // [0]: <=key, [1]: >key
    if (u == null) return new Node[]{null, null};
    if (u.val <= key) {
        Node[] t = split(u.r, key);
        u.r = t[0]; pull(u);
        return new Node[]{u, t[1]};
    }
    Node[] t = split(u.l, key);
    u.l = t[1]; pull(u);
    return new Node[]{t[0], u};
}

Node merge(Node a, Node b) {
    if (a == null || b == null) return a != null ? a : b;
    if (a.prio < b.prio) { a.r = merge(a.r, b); pull(a); return a; }
    b.l = merge(a, b.l); pull(b); return b;
}`
  };

  S.cartesian = {
    cpp: `// 笛卡尔树：下标满足 BST、值满足小根堆，单调栈 O(n) 建树
Node* build(vector<int>& a) {
    stack<Node*> st; Node* root = nullptr;
    for (int i = 0; i < (int)a.size(); i++) {
        Node* cur = new Node{a[i]};
        Node* last = nullptr;
        while (!st.empty() && st.top()->val > a[i]) { last = st.top(); st.pop(); }
        cur->l = last;                       // 被弹出的链变成左子树
        if (!st.empty()) st.top()->r = cur;   // 当前点挂在栈顶右孩子
        else root = cur;
        st.push(cur);
    }
    return root;
}`,
    py: `def build(a):
    st, root = [], None
    for x in a:
        cur = Node(x)
        last = None
        while st and st[-1].val > x:
            last = st.pop()
        cur.left = last
        if st:
            st[-1].right = cur
        else:
            root = cur
        st.append(cur)
    return root`,
    java: `Node build(int[] a) {
    Deque<Node> st = new ArrayDeque<>();
    Node root = null;
    for (int x : a) {
        Node cur = new Node(x), last = null;
        while (!st.isEmpty() && st.peek().val > x) last = st.pop();
        cur.l = last;
        if (!st.isEmpty()) st.peek().r = cur;
        else root = cur;
        st.push(cur);
    }
    return root;
}`
  };

  S.scapegoat = {
    cpp: `// 替罪羊树：失衡时把子树拍平成有序表，再二分重建
void flatten(Node* u, vector<Node*>& v) {
    if (!u) return;
    flatten(u->l, v); v.push_back(u); flatten(u->r, v);
}
Node* rebuild(vector<Node*>& v, int lo, int hi) {
    if (lo > hi) return nullptr;
    int mid = (lo + hi) / 2;
    Node* u = v[mid];
    u->l = rebuild(v, lo, mid - 1);
    u->r = rebuild(v, mid + 1, hi);
    pull(u);
    return u;
}
bool bad(Node* u) {          // 子树大小 > alpha * 整棵大小
    return max(size(u->l), size(u->r)) > alpha * size(u);
}`,
    py: `def flatten(u, v):
    if not u:
        return
    flatten(u.left, v); v.append(u); flatten(u.right, v)

def rebuild(v, lo, hi):
    if lo > hi:
        return None
    mid = (lo + hi) // 2
    u = v[mid]
    u.left = rebuild(v, lo, mid - 1)
    u.right = rebuild(v, mid + 1, hi)
    pull(u)
    return u

def bad(u, alpha=0.75):
    return max(size(u.left), size(u.right)) > alpha * size(u)`,
    java: `void flatten(Node u, List<Node> v) {
    if (u == null) return;
    flatten(u.l, v); v.add(u); flatten(u.r, v);
}
Node rebuild(List<Node> v, int lo, int hi) {
    if (lo > hi) return null;
    int mid = (lo + hi) / 2;
    Node u = v.get(mid);
    u.l = rebuild(v, lo, mid - 1);
    u.r = rebuild(v, mid + 1, hi);
    pull(u);
    return u;
}
boolean bad(Node u, double alpha) {
    return Math.max(size(u.l), size(u.r)) > alpha * size(u);
}`
  };
})();
