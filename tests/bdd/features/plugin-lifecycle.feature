# language: zh-CN
功能: 插件生命周期
  作为插件执行的核心流程
  生命周期钩子应该按正确的顺序执行
  并正确传递上下文

  场景: 完整的生命周期执行顺序
    假如 一个定义了所有钩子的插件
    当 加载并执行该插件
    那么 钩子执行顺序应该是:
      | 钩子       |
      | beforeInit |
      | execute    |
      | afterInit  |

  场景: 多个插件按依赖顺序执行
    假如 注册了以下插件:
      | name     | dependencies |
      | plugin-a |              |
      | plugin-b | plugin-a     |
    当 执行所有插件的 "execute" 钩子
    那么 "plugin-a" 的钩子应该先执行
    而且 "plugin-b" 的钩子应该执行

  场景: 跳过没有定义钩子的插件
    假如 注册了以下插件:
      | name     | hasExecuteHook |
      | plugin-a | true           |
      | plugin-b | false          |
    当 执行 "execute" 钩子
    那么 只有 "plugin-a" 的钩子被执行

  场景: 钩子执行失败时抛出错误
    假如 一个 execute 钩子会抛出错误的插件
    当 执行 "execute" 钩子
    那么 应该抛出错误包含 "failed during"

  场景: 上下文正确传递给钩子
    假如 一个带 execute 钩子的插件
    当 执行该插件的钩子
    那么 钩子应该收到包含以下字段的上下文:
      | 字段        |
      | projectRoot |
      | targetDir   |
      | config      |
      | shared      |
      | logger      |
      | fs          |
