# language: zh-CN
功能: 项目初始化
  作为一个使用 Claude Code 的开发者
  我希望初始化 Claude Memory System
  以便 Claude 能够跨会话保持上下文

  背景:
    假如 一个新的空项目目录

  场景: 首次初始化新项目
    当 用户输入项目名称 "my-project"
    并且 用户输入项目描述 "A test project"
    并且 用户选择所有推荐的功能
    并且 用户确认初始化
    那么 目录 ".agent" 应该存在
    并且 目录 ".claude/rules" 应该存在
    并且 文件 ".claude/rules/00-project.md" 应该包含 "my-project"
    并且 文件 ".agent/.claude-memory-init" 应该存在

  场景: 最小化初始化（仅系统检测器）
    当 用户输入项目名称 "minimal-project"
    并且 用户只选择 "system-detector" 功能
    并且 用户确认初始化
    那么 目录 ".agent" 应该存在
    并且 目录 ".agent/system" 应该存在
    并且 目录 ".claude/rules" 应该存在

  场景: 检测到已初始化的项目
    假如 项目已经初始化过
    当 用户尝试再次初始化
    那么 应该提示用户选择操作方式
    并且 选项应该包含 "keep" "reconfigure" "reinitialize"

  场景: 强制重新初始化
    假如 项目已经初始化过
    当 用户使用 force 选项初始化
    那么 旧的配置应该被覆盖
    并且 目录 ".agent" 应该存在

  场景: 生成正确的目录结构
    当 用户完成初始化并选择所有功能
    那么 应该创建以下目录结构:
      | 目录路径                    |
      | .agent                      |
      | .agent/system               |
      | .agent/memory               |
      | .agent/memory/knowledge     |
      | .agent/memory/history       |
      | .agent/memory/index         |
      | .agent/git                  |
      | .claude/rules               |

  场景: 规则文件不应包含未替换的占位符
    当 用户完成初始化
    那么 文件 ".claude/rules/00-project.md" 不应该包含 "{{"
    并且 文件 ".claude/rules/00-project.md" 不应该包含 "}}"

  场景: 保留现有的 AGENT.md 文件
    假如 项目中存在 "AGENT.md" 文件包含 "# Existing Content"
    当 用户完成初始化
    那么 文件 "AGENT.md" 应该包含 "# Existing Content"
    并且 目录 ".claude/rules" 应该存在
