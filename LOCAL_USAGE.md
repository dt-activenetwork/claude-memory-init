# 本地使用指南

本工具 **不发布到 npmjs.com**，而是通过 GitHub 仓库直接使用。本文档详细说明所有使用方式。

## 快速开始

### 最简单的方式：pnpm dlx + GitHub

```bash
cd /path/to/your/project

# 直接从 GitHub 执行
pnpm dlx github:yourusername/claude-memory-init init --quick
```

这会自动：
1. 从 GitHub 克隆仓库（包含 submodules）
2. 安装依赖
3. 构建
4. 执行命令

---

## 所有使用方式

### 方式一：pnpm dlx 从 GitHub（推荐）

**无需提前克隆，一条命令搞定**

#### 基本用法

```bash
# 使用最新版本（main 分支）
pnpm dlx github:yourusername/claude-memory-init init --quick

# 指定分支
pnpm dlx github:yourusername/claude-memory-init#main init --quick
pnpm dlx github:yourusername/claude-memory-init#dev init --quick

# 指定标签/版本
pnpm dlx github:yourusername/claude-memory-init#v1.0.0 init --quick

# 指定 commit hash
pnpm dlx github:yourusername/claude-memory-init#abc1234 init --quick
```

#### 完整示例

```bash
cd /path/to/your/project

# 快速模式
pnpm dlx github:yourusername/claude-memory-init init --quick

# 配置文件模式
pnpm dlx github:yourusername/claude-memory-init init --config ./claude/config.yaml

# 交互式模式
pnpm dlx github:yourusername/claude-memory-init init --interactive

# 验证配置
pnpm dlx github:yourusername/claude-memory-init validate --config ./claude/config.yaml

# 检查 submodule 状态
pnpm dlx github:yourusername/claude-memory-init submodule --status
```

**优点**：
- 无需提前克隆仓库
- 总是使用最新代码
- 不占用本地磁盘空间
- 支持指定版本/分支

**缺点**：
- 首次执行较慢（需要下载）
- 需要网络连接

---

### 方式二：安装到项目依赖

适合在团队项目中统一版本。

#### 添加到 package.json

```json
{
  "devDependencies": {
    "@claude-memory/init": "github:yourusername/claude-memory-init#v1.0.0"
  }
}
```

#### 使用

```bash
# 安装依赖
pnpm install

# 使用 pnpx 执行
pnpx claude-memory-init init --quick
pnpx claude-memory-init validate --config ./claude/config.yaml

# 或在 package.json scripts 中使用
{
  "scripts": {
    "init-claude": "claude-memory-init init --quick"
  }
}

pnpm run init-claude
```

**优点**：
- 版本固定，团队一致
- 可以在 CI/CD 中使用
- 集成到项目工作流

**缺点**：
- 增加项目依赖体积
- 需要更新 package.json

---

### 方式三：克隆后本地使用

适合需要修改或调试工具本身。

#### 克隆和构建

```bash
# 克隆（重要：使用 --recurse-submodules）
git clone --recurse-submodules https://github.com/yourusername/claude-memory-init.git
cd claude-memory-init

# 安装和构建
pnpm install
pnpm run build

# 验证
pnpm test
node dist/index.js --version
```

#### 使用方式 A：直接执行

```bash
cd /path/to/your/project
node /path/to/claude-memory-init/dist/index.js init --quick
```

#### 使用方式 B：创建全局链接

```bash
# 在工具目录中创建链接
cd /path/to/claude-memory-init
pnpm link --global

# 现在可以在任何地方使用
cd /path/to/your/project
claude-memory-init init --quick

# 取消链接
pnpm unlink --global @claude-memory/init
```

#### 使用方式 C：创建 shell alias

在 `~/.bashrc` 或 `~/.zshrc` 中：

```bash
alias cmi='node /path/to/claude-memory-init/dist/index.js'
```

然后使用：

```bash
cmi init --quick
cmi validate --config ./claude/config.yaml
```

**优点**：
- 可以修改和调试代码
- 执行速度最快（已构建）
- 不依赖网络

**缺点**：
- 需要手动克隆和构建
- 占用本地磁盘空间
- 需要手动更新

---

### 方式四：打包 tarball 分发

适合内网环境或离线使用。

#### 创建 tarball

```bash
cd /path/to/claude-memory-init

# 确保最新代码
git pull
git submodule update --remote --merge
pnpm install
pnpm run build
pnpm test

# 打包
pnpm pack
# 生成: claude-memory-init-1.0.0.tgz
```

#### 分发和使用

```bash
# 方法 A: 使用 pnpm dlx
pnpm dlx /path/to/claude-memory-init-1.0.0.tgz init --quick

# 方法 B: 全局安装
pnpm add -g /path/to/claude-memory-init-1.0.0.tgz
claude-memory-init init --quick

# 方法 C: 作为项目依赖
pnpm add -D /path/to/claude-memory-init-1.0.0.tgz
pnpx claude-memory-init init --quick
```

**优点**：
- 适合内网环境
- 版本固定
- 便于分发

**缺点**：
- 文件较大
- 需要手动更新

---

## 推荐使用场景

| 场景 | 推荐方式 | 命令 |
|------|---------|------|
| 临时使用一次 | pnpm dlx GitHub | `pnpm dlx github:user/repo init --quick` |
| 团队项目 | 安装到 package.json | 添加到 devDependencies |
| 频繁使用 | 克隆+全局链接 | `pnpm link --global` |
| 开发调试 | 克隆+直接执行 | `node dist/index.js` |
| 内网环境 | tarball | `pnpm pack` |

---

## 常见问题

### Q1: pnpm dlx github:... 下载很慢怎么办？

**方案 A**：使用镜像（如果有）
```bash
pnpm dlx gitee:yourusername/claude-memory-init init --quick
```

**方案 B**：提前克隆，使用本地方式
```bash
git clone --recurse-submodules https://github.com/yourusername/claude-memory-init.git
cd claude-memory-init
pnpm install && pnpm run build
pnpm link --global
```

### Q2: 提示 "Submodule not initialized"

这通常发生在使用 `pnpm dlx github:...` 时。

**解决**：在工具内部已经处理了 submodule 的初始化，但如果还有问题：

```bash
# 克隆仓库
git clone https://github.com/yourusername/claude-memory-init.git
cd claude-memory-init

# 手动初始化 submodule
git submodule update --init --recursive

# 构建
pnpm install && pnpm run build

# 使用全局链接
pnpm link --global
```

### Q3: 如何固定版本？

使用 git tag/branch：

```bash
# 使用特定版本
pnpm dlx github:yourusername/claude-memory-init#v1.0.0 init --quick

# 或在 package.json 中
{
  "devDependencies": {
    "@claude-memory/init": "github:yourusername/claude-memory-init#v1.0.0"
  }
}
```

### Q4: 在 CI/CD 中使用

**GitHub Actions 示例**：

```yaml
name: Initialize Claude Memory

on: [push]

jobs:
  init:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Initialize Claude Memory System
        run: |
          pnpm dlx github:yourusername/claude-memory-init \
            init --config ./claude/config.yaml

      - name: Commit generated files
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add CLAUDE.md claude/
          git commit -m "Initialize Claude memory system" || true
          git push
```

### Q5: 如何更新到最新版本？

**如果使用 pnpm dlx**：
```bash
# 每次执行都是最新的（除非指定了版本）
pnpm dlx github:yourusername/claude-memory-init init --quick
```

**如果克隆到本地**：
```bash
cd /path/to/claude-memory-init
git pull
git submodule update --remote --merge
pnpm install
pnpm run build
```

**如果安装在项目中**：
```bash
# 更新到最新 main
pnpm update @claude-memory/init

# 或修改 package.json 指定新版本
"@claude-memory/init": "github:yourusername/claude-memory-init#v2.0.0"
```

---

## 完整使用示例

### 示例 1: 新项目快速初始化

```bash
# 创建项目
mkdir my-new-project
cd my-new-project
git init

# 直接从 GitHub 初始化
pnpm dlx github:yourusername/claude-memory-init init --quick

# 查看生成的文件
ls -la claude/
cat CLAUDE.md
```

### 示例 2: 团队项目标准化配置

```bash
# 在项目中添加依赖
cat >> package.json << 'EOF'
{
  "devDependencies": {
    "@claude-memory/init": "github:yourusername/claude-memory-init#v1.0.0"
  },
  "scripts": {
    "claude:init": "claude-memory-init init --config ./claude/config.yaml",
    "claude:validate": "claude-memory-init validate --config ./claude/config.yaml"
  }
}
EOF

# 安装
pnpm install

# 使用
pnpm run claude:init
```

### 示例 3: 本地开发和调试

```bash
# 克隆工具
git clone --recurse-submodules https://github.com/yourusername/claude-memory-init.git
cd claude-memory-init

# 安装和构建
pnpm install
pnpm run build

# 运行测试
pnpm test

# 修改代码后重新构建
# ... 编辑代码 ...
pnpm run build

# 测试修改
cd /path/to/test-project
node /path/to/claude-memory-init/dist/index.js init --quick
```

---

## 总结

**最推荐的日常使用方式**：

```bash
# 简单、快速、不留痕迹
pnpm dlx github:yourusername/claude-memory-init init --quick
```

**用于团队项目**：

```json
{
  "devDependencies": {
    "@claude-memory/init": "github:yourusername/claude-memory-init#v1.0.0"
  }
}
```

**用于频繁使用**：

```bash
git clone --recurse-submodules https://github.com/yourusername/claude-memory-init.git
cd claude-memory-init
pnpm install && pnpm run build
pnpm link --global
```

根据你的使用场景选择合适的方式！
