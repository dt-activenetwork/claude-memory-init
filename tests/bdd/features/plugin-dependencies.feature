# language: zh-CN
功能: 插件依赖解析
  作为插件加载器的核心功能
  应该正确解析插件之间的依赖关系
  并按照正确的顺序加载插件

  场景: 无依赖的插件排序
    假如 注册了以下无依赖的插件:
      | name     |
      | plugin-a |
      | plugin-b |
      | plugin-c |
    当 对插件进行依赖排序
    那么 排序应该成功
    并且 所有插件都应该在结果中

  场景: 线性依赖链
    假如 注册了以下插件:
      | name     | dependencies |
      | plugin-a |              |
      | plugin-b | plugin-a     |
      | plugin-c | plugin-b     |
    当 对插件进行依赖排序
    那么 "plugin-a" 应该在 "plugin-b" 之前
    并且 "plugin-b" 应该在 "plugin-c" 之前

  场景: 多重依赖
    假如 注册了以下插件:
      | name     | dependencies      |
      | plugin-a |                   |
      | plugin-b |                   |
      | plugin-c | plugin-a,plugin-b |
    当 对插件进行依赖排序
    那么 "plugin-a" 应该在 "plugin-c" 之前
    并且 "plugin-b" 应该在 "plugin-c" 之前

  场景: 菱形依赖模式
    假如 注册了以下插件:
      | name     | dependencies      |
      | plugin-d |                   |
      | plugin-b | plugin-d          |
      | plugin-c | plugin-d          |
      | plugin-a | plugin-b,plugin-c |
    当 对插件进行依赖排序
    那么 "plugin-d" 应该在 "plugin-b" 之前
    并且 "plugin-d" 应该在 "plugin-c" 之前
    并且 "plugin-b" 应该在 "plugin-a" 之前
    并且 "plugin-c" 应该在 "plugin-a" 之前

  场景: 检测循环依赖（两个插件）
    假如 注册了以下插件:
      | name     | dependencies |
      | plugin-a | plugin-b     |
      | plugin-b | plugin-a     |
    当 尝试对插件进行依赖排序
    那么 应该抛出错误 "Circular dependency detected"

  场景: 检测循环依赖（三个插件）
    假如 注册了以下插件:
      | name     | dependencies |
      | plugin-a | plugin-c     |
      | plugin-b | plugin-a     |
      | plugin-c | plugin-b     |
    当 尝试对插件进行依赖排序
    那么 应该抛出错误 "Circular dependency detected"

  场景: 检测自依赖
    假如 注册了以下插件:
      | name     | dependencies |
      | plugin-a | plugin-a     |
    当 尝试对插件进行依赖排序
    那么 应该抛出错误 "Circular dependency detected"

  场景: 检测缺失的依赖
    假如 注册了以下插件:
      | name     | dependencies     |
      | plugin-a | non-existent     |
    当 尝试对插件进行依赖排序
    那么 应该抛出错误 "not registered or enabled"
