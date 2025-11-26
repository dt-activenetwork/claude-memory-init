# language: zh-CN
功能: 系统环境检测
  作为初始化流程的一部分
  系统检测器应该自动识别开发环境
  并支持用户偏好和项目配置的分离

  背景:
    假如 一个新的空项目目录
    并且 system-detector 插件已启用

  场景: 检测操作系统信息
    当 系统检测器运行
    那么 应该检测到操作系统类型
    并且 应该检测到操作系统名称
    并且 应该检测到系统包管理器

  场景: 检测 Python 环境
    假如 系统安装了 Python
    当 系统检测器检测 Python 环境
    那么 应该检测到 Python 版本
    并且 应该列出可用的包管理器

  场景: 检测时区和语言
    当 系统检测器检测静态信息
    那么 应该检测到时区信息
    并且 应该检测到语言设置

  场景: 首次设置时选择首选包管理器
    当 用户选择 "uv" 作为首选 Python 包管理器
    并且 用户选择 "pnpm" 作为首选 Node.js 包管理器
    并且 用户完成系统检测配置
    那么 文件 ".agent/system/config.toon" 应该存在
    并且 文件 ".agent/system/config.toon" 应该包含 "package_managers:"
    并且 文件 ".agent/system/config.toon" 应该包含 "  python: uv"
    并且 文件 ".agent/system/config.toon" 应该包含 "  node: pnpm"

  场景: 为项目选择特定的包管理器
    当 用户选择 "pip" 作为首选 Python 包管理器
    并且 用户完成系统检测配置
    那么 文件 ".agent/system/config.toon" 应该包含 "  python: pip"
    并且 文件 ".agent/system/config.toon" 应该包含 "package_managers:"

  场景: 生成项目配置文件
    当 用户完成系统检测配置
    那么 文件 ".agent/system/config.toon" 应该存在
    并且 文件 ".agent/system/config.toon" 应该包含 "configured_at:"
    并且 文件 ".agent/system/config.toon" 应该包含 "package_managers:"
