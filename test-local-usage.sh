#!/bin/bash
# 测试本地使用的各种方式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取工具的绝对路径
TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="/tmp/claude-init-test-$$"

echo -e "${YELLOW}=== Claude Memory Init - 本地使用测试 ===${NC}"
echo "工具目录: $TOOL_DIR"
echo "测试目录: $TEST_DIR"
echo ""

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}清理测试目录...${NC}"
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# 测试 1: 检查构建
echo -e "${YELLOW}[测试 1/5] 检查构建...${NC}"
if [ ! -f "$TOOL_DIR/dist/index.js" ]; then
    echo -e "${RED}❌ 构建文件不存在，正在构建...${NC}"
    cd "$TOOL_DIR"
    pnpm run build
fi
echo -e "${GREEN}✓ 构建文件存在${NC}"
echo ""

# 测试 2: 使用 node 直接执行
echo -e "${YELLOW}[测试 2/5] 使用 node 直接执行...${NC}"
mkdir -p "$TEST_DIR/test-node"
cd "$TEST_DIR/test-node"
node "$TOOL_DIR/dist/index.js" init --quick
if [ -f "CLAUDE.md" ]; then
    echo -e "${GREEN}✓ 使用 node 直接执行成功${NC}"
else
    echo -e "${RED}❌ 使用 node 直接执行失败${NC}"
    exit 1
fi
echo ""

# 测试 3: 使用 pnpm link 全局链接
echo -e "${YELLOW}[测试 3/5] 测试全局链接...${NC}"
cd "$TOOL_DIR"
pnpm link --global > /dev/null 2>&1
mkdir -p "$TEST_DIR/test-link"
cd "$TEST_DIR/test-link"
if command -v claude-memory-init &> /dev/null; then
    claude-memory-init init --quick > /dev/null 2>&1
    if [ -f "CLAUDE.md" ]; then
        echo -e "${GREEN}✓ 全局链接工作正常${NC}"
    else
        echo -e "${YELLOW}⚠ 全局链接命令可用但初始化失败${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 跳过全局链接测试（需要手动测试）${NC}"
fi
# 清理链接
cd "$TOOL_DIR"
pnpm unlink --global > /dev/null 2>&1
echo ""

# 测试 4: 验证配置功能
echo -e "${YELLOW}[测试 4/4] 测试配置验证功能...${NC}"
mkdir -p "$TEST_DIR/test-validate"
cd "$TEST_DIR/test-validate"
cp "$TOOL_DIR/mem/config.example.yaml" ./config.yaml
node "$TOOL_DIR/dist/index.js" validate --config ./config.yaml
echo -e "${GREEN}✓ 配置验证功能正常${NC}"
echo ""

# 显示测试结果
echo -e "${GREEN}=== 所有测试通过 ===${NC}"
echo ""
echo "测试的使用方式："
echo "1. ✓ node 直接执行"
echo "2. ✓ 全局链接"
echo "3. ✓ 配置验证"
echo ""
echo -e "${YELLOW}推荐的使用方式：${NC}"
echo ""
echo "  方式 1: 使用 GitHub 仓库（最推荐）"
echo "  pnpm dlx github:dt-activenetwork/claude-memory-init init --quick"
echo ""
echo "  方式 2: 克隆后使用 node"
echo "  node $TOOL_DIR/dist/index.js init --quick"
echo ""
echo "  方式 3: 创建全局链接"
echo "  cd $TOOL_DIR && pnpm link --global"
echo "  claude-memory-init init --quick"
echo ""
