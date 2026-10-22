/* ============================================================
 * 三语言教学实现 · 第 1 卷（遍历 + BST）
 * 每个算法给出 C++ / Python / Java 三份可直接阅读的实现。
 * 约定：TreeNode 含 val/left/right；代码聚焦算法核心，省略 I/O。
 * ============================================================ */
(function () {
  'use strict';
  const S = TGV.solutions = TGV.solutions || {};

  S.preorder = {
    cpp: `// 先序：根 -> 左 -> 右
void preorder(TreeNode* u, vector<int>& out) {
    if (!u) return;
    out.push_back(u->val);      // 访问根
    preorder(u->left, out);
    preorder(u->right, out);
}

// 迭代版：显式栈，先压右再压左
vector<int> preorderIter(TreeNode* root) {
    vector<int> out; stack<TreeNode*> st;
    if (root) st.push(root);
    while (!st.empty()) {
        TreeNode* u = st.top(); st.pop();
        out.push_back(u->val);
        if (u->right) st.push(u->right);
        if (u->left)  st.push(u->left);
    }
    return out;
}`,
    py: `def preorder(u, out):
    if not u:
        return
    out.append(u.val)          # 访问根
    preorder(u.left, out)
    preorder(u.right, out)

def preorder_iter(root):
    out, st = [], [root] if root else []
    while st:
        u = st.pop()
        out.append(u.val)
        if u.right: st.append(u.right)   # 先压右，后弹出左
        if u.left:  st.append(u.left)
    return out`,
    java: `void preorder(TreeNode u, List<Integer> out) {
    if (u == null) return;
    out.add(u.val);
    preorder(u.left, out);
    preorder(u.right, out);
}

List<Integer> preorderIter(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> st = new ArrayDeque<>();
    if (root != null) st.push(root);
    while (!st.isEmpty()) {
        TreeNode u = st.pop();
        out.add(u.val);
        if (u.right != null) st.push(u.right);
        if (u.left != null)  st.push(u.left);
    }
    return out;
}`
  };

  S.inorder = {
    cpp: `// 中序：左 -> 根 -> 右，二叉搜索树中序即升序
void inorder(TreeNode* u, vector<int>& out) {
    if (!u) return;
    inorder(u->left, out);
    out.push_back(u->val);
    inorder(u->right, out);
}

// 迭代版：一路向左压栈，弹出即访问
vector<int> inorderIter(TreeNode* root) {
    vector<int> out; stack<TreeNode*> st; TreeNode* u = root;
    while (u || !st.empty()) {
        while (u) { st.push(u); u = u->left; }
        u = st.top(); st.pop();
        out.push_back(u->val);
        u = u->right;
    }
    return out;
}`,
    py: `def inorder(u, out):
    if not u:
        return
    inorder(u.left, out)
    out.append(u.val)
    inorder(u.right, out)

def inorder_iter(root):
    out, st, u = [], [], root
    while u or st:
        while u:
            st.append(u)
            u = u.left
        u = st.pop()
        out.append(u.val)
        u = u.right
    return out`,
    java: `void inorder(TreeNode u, List<Integer> out) {
    if (u == null) return;
    inorder(u.left, out);
    out.add(u.val);
    inorder(u.right, out);
}

List<Integer> inorderIter(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode u = root;
    while (u != null || !st.isEmpty()) {
        while (u != null) { st.push(u); u = u.left; }
        u = st.pop();
        out.add(u.val);
        u = u.right;
    }
    return out;
}`
  };

  S.postorder = {
    cpp: `// 后序：左 -> 右 -> 根
void postorder(TreeNode* u, vector<int>& out) {
    if (!u) return;
    postorder(u->left, out);
    postorder(u->right, out);
    out.push_back(u->val);
}

// 单栈 + prev 指针：判断右子树是否已处理完
vector<int> postorderIter(TreeNode* root) {
    vector<int> out; stack<TreeNode*> st; TreeNode* prev = nullptr, *u = root;
    while (u || !st.empty()) {
        while (u) { st.push(u); u = u->left; }
        TreeNode* top = st.top();
        if (top->right && top->right != prev) u = top->right;
        else { out.push_back(top->val); st.pop(); prev = top; }
    }
    return out;
}`,
    py: `def postorder(u, out):
    if not u:
        return
    postorder(u.left, out)
    postorder(u.right, out)
    out.append(u.val)

def postorder_iter(root):
    out, st, prev, u = [], [], None, root
    while u or st:
        while u:
            st.append(u)
            u = u.left
        top = st[-1]
        if top.right and top.right is not prev:
            u = top.right
        else:
            out.append(top.val)
            st.pop()
            prev = top
    return out`,
    java: `void postorder(TreeNode u, List<Integer> out) {
    if (u == null) return;
    postorder(u.left, out);
    postorder(u.right, out);
    out.add(u.val);
}

List<Integer> postorderIter(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode prev = null, u = root;
    while (u != null || !st.isEmpty()) {
        while (u != null) { st.push(u); u = u.left; }
        TreeNode top = st.peek();
        if (top.right != null && top.right != prev) u = top.right;
        else { out.add(top.val); st.pop(); prev = top; }
    }
    return out;
}`
  };

  S.postorder_2stack = {
    cpp: `// 双栈法：按「根右左」压栈，再整体倒序即为后序
vector<int> postorder2Stack(TreeNode* root) {
    vector<int> out;
    if (!root) return out;
    stack<TreeNode*> s1, s2;
    s1.push(root);
    while (!s1.empty()) {
        TreeNode* u = s1.top(); s1.pop();
        s2.push(u);
        if (u->left)  s1.push(u->left);
        if (u->right) s1.push(u->right);
    }
    while (!s2.empty()) { out.push_back(s2.top()->val); s2.pop(); }
    return out;
}`,
    py: `def postorder_2stack(root):
    if not root:
        return []
    s1, s2 = [root], []
    while s1:
        u = s1.pop()
        s2.append(u)
        if u.left:  s1.append(u.left)
        if u.right: s1.append(u.right)
    return [u.val for u in reversed(s2)]`,
    java: `List<Integer> postorder2Stack(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    if (root == null) return out;
    Deque<TreeNode> s1 = new ArrayDeque<>(), s2 = new ArrayDeque<>();
    s1.push(root);
    while (!s1.isEmpty()) {
        TreeNode u = s1.pop();
        s2.push(u);
        if (u.left != null)  s1.push(u.left);
        if (u.right != null) s1.push(u.right);
    }
    while (!s2.isEmpty()) out.add(s2.pop().val);
    return out;
}`
  };

  S.levelorder = {
    cpp: `// 层序：FIFO 队列，一次处理一整层
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> res;
    if (!root) return res;
    queue<TreeNode*> q; q.push(root);
    while (!q.empty()) {
        int n = q.size(); vector<int> layer;
        for (int i = 0; i < n; i++) {
            TreeNode* u = q.front(); q.pop();
            layer.push_back(u->val);
            if (u->left)  q.push(u->left);
            if (u->right) q.push(u->right);
        }
        res.push_back(layer);
    }
    return res;
}`,
    py: `from collections import deque

def level_order(root):
    if not root:
        return []
    res, q = [], deque([root])
    while q:
        layer = []
        for _ in range(len(q)):
            u = q.popleft()
            layer.append(u.val)
            if u.left:  q.append(u.left)
            if u.right: q.append(u.right)
        res.append(layer)
    return res`,
    java: `List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Queue<TreeNode> q = new LinkedList<>();
    q.offer(root);
    while (!q.isEmpty()) {
        int n = q.size();
        List<Integer> layer = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            TreeNode u = q.poll();
            layer.add(u.val);
            if (u.left != null)  q.offer(u.left);
            if (u.right != null) q.offer(u.right);
        }
        res.add(layer);
    }
    return res;
}`
  };

  S.zigzag = {
    cpp: `// 之字形：偶数层正序、奇数层反序；双端队列两端插拔
vector<vector<int>> zigzag(TreeNode* root) {
    vector<vector<int>> res;
    if (!root) return res;
    deque<TreeNode*> dq; dq.push_back(root);
    bool leftToRight = true;
    while (!dq.empty()) {
        int n = dq.size(); vector<int> layer(n);
        for (int i = 0; i < n; i++) {
            TreeNode* u;
            if (leftToRight) { u = dq.front(); dq.pop_front(); }
            else             { u = dq.back();  dq.pop_back();  }
            layer[i] = u->val;
            if (leftToRight) {
                if (u->left)  dq.push_back(u->left);
                if (u->right) dq.push_back(u->right);
            } else {
                if (u->right) dq.push_front(u->right);
                if (u->left)  dq.push_front(u->left);
            }
        }
        res.push_back(layer);
        leftToRight = !leftToRight;
    }
    return res;
}`,
    py: `from collections import deque

def zigzag(root):
    if not root:
        return []
    res, dq, ltr = [], deque([root]), True
    while dq:
        n, layer = len(dq), [0] * len(dq)
        for i in range(n):
            if ltr:
                u = dq.popleft()
            else:
                u = dq.pop()
            layer[i] = u.val
            if ltr:
                if u.left:  dq.append(u.left)
                if u.right: dq.append(u.right)
            else:
                if u.right: dq.appendleft(u.right)
                if u.left:  dq.appendleft(u.left)
        res.append(layer)
        ltr = not ltr
    return res`,
    java: `List<List<Integer>> zigzag(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Deque<TreeNode> dq = new ArrayDeque<>();
    dq.add(root);
    boolean ltr = true;
    while (!dq.isEmpty()) {
        int n = dq.size();
        List<Integer> layer = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            TreeNode u = ltr ? dq.pollFirst() : dq.pollLast();
            layer.add(u.val);
            if (ltr) {
                if (u.left != null)  dq.addLast(u.left);
                if (u.right != null) dq.addLast(u.right);
            } else {
                if (u.right != null) dq.addFirst(u.right);
                if (u.left != null)  dq.addFirst(u.left);
            }
        }
        res.add(layer);
        ltr = !ltr;
    }
    return res;
}`
  };

  S.morris = {
    cpp: `// Morris 中序：借用叶子右指针做线索，空间 O(1)
vector<int> morrisInorder(TreeNode* root) {
    vector<int> out; TreeNode* u = root;
    while (u) {
        if (!u->left) {
            out.push_back(u->val);       // 无左子树，直接访问
            u = u->right;
        } else {
            TreeNode* pre = u->left;
            while (pre->right && pre->right != u) pre = pre->right;
            if (!pre->right) {           // 建线索
                pre->right = u;
                u = u->left;
            } else {                     // 拆线索
                pre->right = nullptr;
                out.push_back(u->val);
                u = u->right;
            }
        }
    }
    return out;
}`,
    py: `def morris_inorder(root):
    out, u = [], root
    while u:
        if not u.left:
            out.append(u.val)
            u = u.right
        else:
            pre = u.left
            while pre.right and pre.right is not u:
                pre = pre.right
            if not pre.right:          # 建立线索
                pre.right = u
                u = u.left
            else:                      # 拆除线索
                pre.right = None
                out.append(u.val)
                u = u.right
    return out`,
    java: `List<Integer> morrisInorder(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    TreeNode u = root;
    while (u != null) {
        if (u.left == null) {
            out.add(u.val);
            u = u.right;
        } else {
            TreeNode pre = u.left;
            while (pre.right != null && pre.right != u) pre = pre.right;
            if (pre.right == null) {
                pre.right = u;
                u = u.left;
            } else {
                pre.right = null;
                out.add(u.val);
                u = u.right;
            }
        }
    }
    return out;
}`
  };

  S.nary_preorder = {
    cpp: `// N 叉树先序：根 -> 依此每个孩子
struct NNode { int val; vector<NNode*> children; };

void preorder(NNode* u, vector<int>& out) {
    if (!u) return;
    out.push_back(u->val);
    for (NNode* c : u->children) preorder(c, out);
}`,
    py: `def preorder(u, out):
    if not u:
        return
    out.append(u.val)
    for c in u.children:
        preorder(c, out)`,
    java: `class NNode {
    int val;
    List<NNode> children = new ArrayList<>();
}

void preorder(NNode u, List<Integer> out) {
    if (u == null) return;
    out.add(u.val);
    for (NNode c : u.children) preorder(c, out);
}`
  };

  S.bst_insert = {
    cpp: `// BST 插入：小于往左、大于往右，空位挂新叶
TreeNode* insert(TreeNode* u, int key) {
    if (!u) return new TreeNode(key);
    if (key < u->val)      u->left  = insert(u->left, key);
    else if (key > u->val) u->right = insert(u->right, key);
    return u;              // 相等：不重复插入
}`,
    py: `def insert(u, key):
    if not u:
        return TreeNode(key)
    if key < u.val:
        u.left = insert(u.left, key)
    elif key > u.val:
        u.right = insert(u.right, key)
    return u`,
    java: `TreeNode insert(TreeNode u, int key) {
    if (u == null) return new TreeNode(key);
    if (key < u.val)      u.left  = insert(u.left, key);
    else if (key > u.val) u.right = insert(u.right, key);
    return u;
}`
  };

  S.bst_search = {
    cpp: `// BST 查找：每比较一次排除一半子树
TreeNode* search(TreeNode* u, int key) {
    while (u && u->val != key)
        u = key < u->val ? u->left : u->right;
    return u;              // 找不到返回 nullptr
}`,
    py: `def search(u, key):
    while u and u.val != key:
        u = u.left if key < u.val else u.right
    return u`,
    java: `TreeNode search(TreeNode u, int key) {
    while (u != null && u.val != key)
        u = key < u.val ? u.left : u.right;
    return u;
}`
  };

  S.bst_delete = {
    cpp: `// BST 删除：叶子 / 单孩子 / 双孩子（用中序后继替换）
TreeNode* remove(TreeNode* u, int key) {
    if (!u) return nullptr;
    if (key < u->val)      u->left  = remove(u->left, key);
    else if (key > u->val) u->right = remove(u->right, key);
    else {
        if (!u->left)  return u->right;
        if (!u->right) return u->left;
        TreeNode* s = u->right;              // 中序后继
        while (s->left) s = s->left;
        u->val = s->val;
        u->right = remove(u->right, s->val);
    }
    return u;
}`,
    py: `def remove(u, key):
    if not u:
        return None
    if key < u.val:
        u.left = remove(u.left, key)
    elif key > u.val:
        u.right = remove(u.right, key)
    else:
        if not u.left:  return u.right
        if not u.right: return u.left
        s = u.right                  # 中序后继
        while s.left:
            s = s.left
        u.val = s.val
        u.right = remove(u.right, s.val)
    return u`,
    java: `TreeNode remove(TreeNode u, int key) {
    if (u == null) return null;
    if (key < u.val)      u.left  = remove(u.left, key);
    else if (key > u.val) u.right = remove(u.right, key);
    else {
        if (u.left == null)  return u.right;
        if (u.right == null) return u.left;
        TreeNode s = u.right;
        while (s.left != null) s = s.left;
        u.val = s.val;
        u.right = remove(u.right, s.val);
    }
    return u;
}`
  };
})();
