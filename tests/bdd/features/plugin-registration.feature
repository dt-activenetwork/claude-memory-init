# language: zh-CN
功能: 插件注册
  作为插件系统的核心功能
  插件注册表应该管理所有已注册的插件
  并确保插件的唯一性和有效性

  场景: 注册有效的插件
    假如 一个有效的插件定义:
      | 属性         | 值                |
      | name         | test-plugin       |
      | commandName  | test              |
      | version      | 1.0.0             |
      | description  | A test plugin     |
    当 将该插件注册到 Registry
    那么 注册应该成功
    并且 Registry 应该包含 "test-plugin" 插件

  场景: 拒绝缺少必要字段的插件
    假如 一个缺少 "name" 字段的插件
    当 尝试注册该插件
    那么 应该抛出错误 "Plugin must have a valid name"

  场景: 拒绝缺少 commandName 的插件
    假如 一个缺少 "commandName" 字段的插件
    当 尝试注册该插件
    那么 应该抛出错误 "must have a valid commandName"

  场景: 拒绝重复的插件名称
    假如 已注册名为 "existing-plugin" 的插件
    当 尝试注册另一个名为 "existing-plugin" 的插件
    那么 应该抛出错误 "already registered"

  场景: 拒绝重复的 commandName
    假如 已注册 commandName 为 "cmd" 的插件
    当 尝试注册另一个 commandName 为 "cmd" 的插件
    那么 应该抛出错误 "already used"

  场景: 获取所有已注册的插件
    假如 已注册以下插件:
      | name     | commandName |
      | plugin-a | cmd-a       |
      | plugin-b | cmd-b       |
      | plugin-c | cmd-c       |
    当 获取所有插件列表
    那么 应该返回 3 个插件
    并且 插件列表应该包含 "plugin-a"
    并且 插件列表应该包含 "plugin-b"
    并且 插件列表应该包含 "plugin-c"
