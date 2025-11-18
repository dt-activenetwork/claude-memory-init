# 交互式 CLI 设计方案

## 设计理念

### 当前问题

```bash
# ❌ 反人类的参数式调用
claude-init init --plugins memory-system,prompt-presets,git --config path/to/config.yaml

# 用户需要：
# 1. 记住所有插件名称
# 2. 记住参数格式
# 3. 提前准备配置文件
```

### 新设计原则

1. **对话式交互**: 通过问答引导用户完成配置
2. **渐进式披露**: 只在需要时询问详细配置
3. **智能默认**: 提供合理的默认值
4. **可视化选择**: 使用复选框、单选框等 UI 组件
5. **上下文感知**: 根据前面的选择调整后续问题

## 交互流程设计

### 主流程：初始化项目

**示例 1: 选择了 2 个需要配置的插件 + 1 个不需要配置的**

```
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘

📋 Step 1/5: Project Information
────────────────────────────────────────

? Project name: › my-awesome-project
? Project description: › A web application for task management


📦 Step 2/5: Select Features
────────────────────────────────────────

What features do you want to enable?
(Use ↑↓ to move, Space to select, Enter to confirm)

  ◉ Prompt Presets        Generate CLAUDE.md with preset prompts
  ◉ Memory System         Full semantic memory system
  ◯ Git Integration       Auto-commit and remote sync
  ◉ System Detection      Detect OS and dev tools

Selected: 3 features


📝 Step 3/5: Configure Prompt Presets
────────────────────────────────────────

Which presets would you like to install?

  ◉ Code Review          Help review code changes
  ◉ Documentation        Generate and maintain docs
  ◯ Refactoring          Assist with code refactoring
  ◯ Testing              Generate and review tests
  ◉ Architecture         Analyze system architecture

Selected: 3 presets


📝 Step 4/5: Configure Memory System
────────────────────────────────────────

? Memory template source:
  ● Use default template (recommended)
  ○ Custom git repository
  ○ Local directory


✨ Step 5/5: Summary
────────────────────────────────────────

Project: my-awesome-project
Location: /home/user/my-awesome-project

Features:
  ✓ Prompt Presets (3 presets: code-review, documentation, architecture)
  ✓ Memory System (default template)
  ✓ System Detection (auto-detected: Ubuntu 22.04, Python 3.11, Node.js 20.10)

? Proceed with initialization? (Y/n) › Yes


🎉 Initialization complete!
────────────────────────────────────────

Files created:
  ✓ CLAUDE.md
  ✓ claude/config.yaml
  ✓ claude/prompts/code-review.md
  ✓ claude/prompts/documentation.md
  ✓ claude/prompts/architecture.md
  ✓ claude/memory/index/tags.json
  ✓ claude/memory/index/topics.json

Next steps:
  • Review CLAUDE.md and customize as needed
  • Start chatting with Claude in this project
  • Run 'claude-init add-preset' to add more presets

```

**示例 2: 只选择了不需要配置的插件**

```
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘

📋 Step 1/3: Project Information
────────────────────────────────────────

? Project name: › simple-project
? Project description: › A simple project


📦 Step 2/3: Select Features
────────────────────────────────────────

What features do you want to enable?

  ◯ Prompt Presets
  ◯ Memory System
  ◯ Git Integration
  ◉ System Detection      Detect OS and dev tools

Selected: 1 feature


✨ Step 3/3: Summary
────────────────────────────────────────

Project: simple-project
Location: /home/user/simple-project

Features:
  ✓ System Detection (auto-detected: Ubuntu 22.04)

? Proceed with initialization? (Y/n) › Yes


🎉 Initialization complete!
────────────────────────────────────────

Files created:
  ✓ CLAUDE.md
  ✓ claude/config.yaml
  ✓ claude/system-info.yaml

```

## 交互组件库

### 1. 多选列表（Checkbox List）

```typescript
// src/prompts/components/checkbox-list.ts

import inquirer from 'inquirer';

export interface CheckboxOption {
  name: string;          // 显示名称
  value: string;         // 返回值
  description?: string;  // 描述（显示在右侧）
  checked?: boolean;     // 默认选中
  disabled?: boolean;    // 禁用
}

export async function checkboxList(
  message: string,
  options: CheckboxOption[]
): Promise<string[]> {
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices: options.map(opt => ({
        name: opt.description
          ? `${opt.name.padEnd(20)} ${opt.description}`
          : opt.name,
        value: opt.value,
        checked: opt.checked,
        disabled: opt.disabled
      })),
      pageSize: 15,
      loop: false
    }
  ]);

  return selected;
}
```

### 2. 单选列表（Radio List）

```typescript
// src/prompts/components/radio-list.ts

export interface RadioOption {
  name: string;
  value: string;
  description?: string;
}

export async function radioList(
  message: string,
  options: RadioOption[],
  defaultValue?: string
): Promise<string> {
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message,
      choices: options.map(opt => ({
        name: opt.description
          ? `${opt.name.padEnd(20)} ${opt.description}`
          : opt.name,
        value: opt.value
      })),
      default: defaultValue,
      pageSize: 10
    }
  ]);

  return selected;
}
```

### 3. 确认框（Confirm）

```typescript
// src/prompts/components/confirm.ts

export async function confirm(
  message: string,
  defaultValue: boolean = true
): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }
  ]);

  return confirmed;
}
```

### 4. 文本输入（Input）

```typescript
// src/prompts/components/input.ts

export async function input(
  message: string,
  defaultValue?: string,
  validate?: (input: string) => boolean | string
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
      validate
    }
  ]);

  return value;
}
```

### 5. 进度显示（Progress）

```typescript
// src/prompts/components/progress.ts

import ora, { Ora } from 'ora';

export class ProgressIndicator {
  private spinner: Ora;
  private steps: string[];
  private currentStep: number = 0;

  constructor(steps: string[]) {
    this.steps = steps;
    this.spinner = ora();
  }

  start() {
    this.currentStep = 0;
    this.updateSpinner();
    this.spinner.start();
  }

  nextStep() {
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      this.updateSpinner();
    }
  }

  succeed(message?: string) {
    this.spinner.succeed(message || 'Complete');
  }

  fail(message?: string) {
    this.spinner.fail(message || 'Failed');
  }

  private updateSpinner() {
    const step = this.currentStep + 1;
    const total = this.steps.length;
    this.spinner.text = `[${step}/${total}] ${this.steps[this.currentStep]}`;
  }
}
```

## 插件配置流程

### 插件配置接口

```typescript
// src/plugin/types.ts

export interface PluginConfigurationFlow {
  /**
   * 插件是否需要配置
   */
  needsConfiguration: boolean;

  /**
   * 交互式配置流程
   */
  configure: (context: ConfigurationContext) => Promise<PluginConfig>;

  /**
   * 配置摘要（用于最终确认）
   */
  getSummary: (config: PluginConfig) => string[];
}

export interface ConfigurationContext {
  // 项目信息
  projectName: string;
  projectRoot: string;

  // 其他已选插件的配置（可能影响当前插件的配置）
  otherPlugins: Map<string, PluginConfig>;

  // UI 组件
  ui: {
    checkboxList: typeof checkboxList;
    radioList: typeof radioList;
    confirm: typeof confirm;
    input: typeof input;
  };

  // 日志
  logger: Logger;
}
```

### 插件配置示例

#### 1. Prompt Presets 插件配置

```typescript
// plugins/prompt-presets/configure.ts

export const promptPresetsConfiguration: PluginConfigurationFlow = {
  needsConfiguration: true,

  configure: async (context) => {
    const { ui, logger } = context;

    logger.info('\n[Prompt Presets Configuration]');

    // 1. 选择预设
    const presets = await ui.checkboxList(
      'Which presets would you like to install?',
      [
        {
          name: 'Code Review',
          value: 'code-review',
          description: 'Help review code changes',
          checked: true
        },
        {
          name: 'Documentation',
          value: 'documentation',
          description: 'Generate and maintain docs',
          checked: true
        },
        {
          name: 'Refactoring',
          value: 'refactoring',
          description: 'Assist with code refactoring'
        },
        {
          name: 'Testing',
          value: 'testing',
          description: 'Generate and review tests'
        },
        {
          name: 'Architecture',
          value: 'architecture',
          description: 'Analyze system architecture',
          checked: true
        },
        {
          name: 'Bug Fixing',
          value: 'bug-fixing',
          description: 'Help debug and fix issues'
        }
      ]
    );

    if (presets.length === 0) {
      logger.warning('No presets selected. You can add them later with "claude-init add-preset"');
    }

    // 2. 是否允许自定义
    const allowCustom = await ui.confirm(
      'Allow custom prompt templates?',
      true
    );

    return {
      enabled: true,
      options: {
        presets,
        allow_custom: allowCustom,
        custom_dir: allowCustom ? 'claude/prompts/custom' : null
      }
    };
  },

  getSummary: (config) => {
    const lines = [];
    if (config.options.presets.length > 0) {
      lines.push(`Presets: ${config.options.presets.join(', ')}`);
    }
    if (config.options.allow_custom) {
      lines.push('Custom templates: enabled');
    }
    return lines;
  }
};
```

#### 2. Memory System 插件配置

```typescript
// plugins/memory-system/configure.ts

export const memorySystemConfiguration: PluginConfigurationFlow = {
  needsConfiguration: true,

  configure: async (context) => {
    const { ui, logger } = context;

    logger.info('\n[Memory System Configuration]');

    // 1. 模板来源
    const templateSource = await ui.radioList(
      'Memory template source:',
      [
        {
          name: 'Default Template',
          value: 'default',
          description: '(recommended)'
        },
        {
          name: 'Custom Git Repository',
          value: 'git'
        },
        {
          name: 'Local Directory',
          value: 'local'
        }
      ],
      'default'
    );

    let templateUrl = 'git@github.com:dt-activenetwork/mem.git';
    let templatePath = null;

    // 2. 如果选择自定义，询问详细信息
    if (templateSource === 'git') {
      templateUrl = await ui.input(
        'Git repository URL:',
        'git@github.com:your-org/memory-template.git'
      );
    } else if (templateSource === 'local') {
      templatePath = await ui.input(
        'Local template directory:',
        './memory-template'
      );
    }

    // 3. 选择记忆类型
    const memoryTypes = await ui.checkboxList(
      'Which memory types to enable?',
      [
        {
          name: 'Semantic Memory',
          value: 'semantic',
          description: 'Knowledge and concepts',
          checked: true
        },
        {
          name: 'Episodic Memory',
          value: 'episodic',
          description: 'Task history',
          checked: true
        },
        {
          name: 'Procedural Memory',
          value: 'procedural',
          description: 'Workflows and processes',
          checked: true
        }
      ]
    );

    return {
      enabled: true,
      options: {
        template_source: templateSource,
        template_url: templateUrl,
        template_path: templatePath,
        memory_types: memoryTypes
      }
    };
  },

  getSummary: (config) => {
    const lines = [];
    if (config.options.template_source === 'default') {
      lines.push('Template: Default');
    } else if (config.options.template_source === 'git') {
      lines.push(`Template: ${config.options.template_url}`);
    } else {
      lines.push(`Template: ${config.options.template_path}`);
    }
    lines.push(`Memory types: ${config.options.memory_types.join(', ')}`);
    return lines;
  }
};
```

#### 3. Git 插件配置

```typescript
// plugins/git/configure.ts

export const gitConfiguration: PluginConfigurationFlow = {
  needsConfiguration: true,

  configure: async (context) => {
    const { ui, logger } = context;

    logger.info('\n[Git Integration Configuration]');

    // 1. 检查是否为 Git 仓库
    const isGitRepo = await checkIfGitRepository(context.projectRoot);

    if (!isGitRepo) {
      logger.warning('This is not a Git repository. Git features will be limited.');
      const initGit = await ui.confirm('Initialize Git repository?', true);

      if (initGit) {
        await initializeGitRepository(context.projectRoot);
        logger.success('Git repository initialized');
      } else {
        return {
          enabled: false,
          options: {}
        };
      }
    }

    // 2. Auto-commit 配置
    const autoCommit = await ui.confirm(
      'Auto-commit changes after initialization?',
      false
    );

    let commitSeparately = true;
    if (autoCommit) {
      commitSeparately = await ui.confirm(
        'Commit Claude files separately from other changes?',
        true
      );
    }

    // 3. Remote sync 配置
    const enableSync = await ui.confirm(
      'Enable remote sync for memory templates?',
      false
    );

    let syncConfig = {
      enabled: false,
      remote_url: '',
      auto_pr: false
    };

    if (enableSync) {
      const remoteUrl = await ui.input(
        'Remote template repository URL:',
        'git@github.com:dt-activenetwork/mem.git'
      );

      const autoPR = await ui.confirm(
        'Auto-create PR when syncing changes?',
        false
      );

      syncConfig = {
        enabled: true,
        remote_url: remoteUrl,
        auto_pr: autoPR
      };
    }

    return {
      enabled: true,
      options: {
        auto_commit: autoCommit,
        commit_separately: commitSeparately,
        ignore_patterns: ['claude/temp/'],
        remote_sync: syncConfig
      }
    };
  },

  getSummary: (config) => {
    const lines = [];
    if (config.options.auto_commit) {
      lines.push('Auto-commit: enabled');
      if (config.options.commit_separately) {
        lines.push('  • Separate commits for Claude files');
      }
    }
    if (config.options.remote_sync?.enabled) {
      lines.push(`Remote sync: ${config.options.remote_sync.remote_url}`);
      if (config.options.remote_sync.auto_pr) {
        lines.push('  • Auto-create PRs');
      }
    }
    return lines;
  }
};
```

#### 4. System Detector 插件配置

```typescript
// plugins/system-detector/configure.ts

export const systemDetectorConfiguration: PluginConfigurationFlow = {
  needsConfiguration: false,  // ⭐ 不需要配置，自动检测

  configure: async (context) => {
    // 静默自动检测，不显示交互步骤
    const systemInfo = await detectSystemInfo();
    const devTools = await detectDevelopmentTools();

    return {
      enabled: true,
      options: {
        include_in_config: true,
        system_info: systemInfo,
        dev_tools: devTools
      }
    };
  },

  getSummary: (config) => {
    // 在最终摘要中显示检测结果
    const lines = [];
    const info = config.options.system_info;
    const tools = config.options.dev_tools;

    const parts = [info?.os_name];
    if (tools?.python) parts.push(`Python ${tools.python.version}`);
    if (tools?.node) parts.push(`Node.js ${tools.node.version}`);

    lines.push(`Auto-detected: ${parts.filter(Boolean).join(', ')}`);
    return lines;
  }
};
```

**关键点**：
- `needsConfiguration: false` - 不会出现在配置步骤中
- `configure()` 静默执行，不显示 UI
- `getSummary()` 在最终摘要中显示检测结果

## 主初始化流程（动态步骤）

```typescript
// src/core/interactive-initializer.ts

export class InteractiveInitializer {
  private pluginRegistry: PluginRegistry;
  private ui: UIComponents;

  async run(targetDir: string, options: { force?: boolean } = {}): Promise<void> {
    console.clear();
    this.printHeader();

    // Step 1: 项目信息（固定步骤）
    const projectInfo = await this.promptProjectInfo(1);

    // Step 2: 选择插件（固定步骤）
    const selectedPlugins = await this.promptPluginSelection(2);

    // 🔥 动态计算需要配置的插件
    const pluginsNeedingConfig = this.getPluginsNeedingConfiguration(selectedPlugins);

    // 🔥 动态计算总步骤数
    const totalSteps = this.calculateTotalSteps(selectedPlugins);
    // totalSteps = 1 (项目信息) + 1 (选择插件) + pluginsNeedingConfig.length + 1 (摘要)

    // Step 3+: 配置插件（动态步骤，只配置需要的）
    const pluginConfigs = await this.configurePlugins(
      selectedPlugins,
      pluginsNeedingConfig,
      projectInfo,
      3,  // 从步骤 3 开始
      totalSteps
    );

    // Last Step: 显示摘要并确认
    const confirmed = await this.showSummaryAndConfirm(
      projectInfo,
      pluginConfigs,
      totalSteps
    );

    if (!confirmed) {
      console.log('\nInitialization cancelled.');
      return;
    }

    // 执行初始化
    await this.executeInitialization(
      targetDir,
      projectInfo,
      pluginConfigs
    );

    // 显示完成信息
    this.showCompletionMessage(targetDir);
  }

  /**
   * 计算总步骤数
   */
  private calculateTotalSteps(selectedPlugins: string[]): number {
    const pluginsNeedingConfig = this.getPluginsNeedingConfiguration(selectedPlugins);

    return (
      1 +  // 项目信息
      1 +  // 选择插件
      pluginsNeedingConfig.length +  // 需要配置的插件
      1    // 摘要确认
    );
  }

  /**
   * 获取需要配置的插件列表
   */
  private getPluginsNeedingConfiguration(selectedPlugins: string[]): string[] {
    return selectedPlugins.filter(pluginName => {
      const plugin = this.pluginRegistry.get(pluginName);
      return plugin.configuration?.needsConfiguration === true;
    });
  }

  private printHeader() {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘
    `);
  }

  private async promptProjectInfo(currentStep: number, totalSteps?: number): Promise<ProjectInfo> {
    const stepLabel = totalSteps ? `Step ${currentStep}/${totalSteps}` : `Step ${currentStep}`;
    console.log(`📋 ${stepLabel}: Project Information`);
    console.log('─'.repeat(60));

    const name = await this.ui.input(
      'Project name:',
      path.basename(process.cwd())
    );

    const description = await this.ui.input(
      'Project description:',
      'A project with Claude integration'
    );

    return { name, description };
  }

  private async promptPluginSelection(currentStep: number, totalSteps?: number): Promise<string[]> {
    const stepLabel = totalSteps ? `Step ${currentStep}/${totalSteps}` : `Step ${currentStep}`;
    console.log(`\n📦 ${stepLabel}: Select Features`);
    console.log('─'.repeat(60));

    const availablePlugins = this.pluginRegistry.getAll();

    const selected = await this.ui.checkboxList(
      'What features do you want to enable?',
      availablePlugins.map(plugin => ({
        name: plugin.meta.name,
        value: plugin.meta.name,
        description: plugin.meta.description,
        checked: plugin.meta.recommended || false
      }))
    );

    console.log(`\nSelected: ${selected.length} features\n`);

    return selected;
  }

  /**
   * 配置插件（只配置需要配置的插件）
   */
  private async configurePlugins(
    selectedPlugins: string[],
    pluginsNeedingConfig: string[],
    projectInfo: ProjectInfo,
    startStep: number,
    totalSteps: number
  ): Promise<Map<string, PluginConfig>> {
    const configs = new Map<string, PluginConfig>();
    const context: ConfigurationContext = {
      projectName: projectInfo.name,
      projectRoot: process.cwd(),
      otherPlugins: configs,
      ui: this.ui,
      logger: this.logger
    };

    let currentStep = startStep;

    // 遍历所有选中的插件
    for (const pluginName of selectedPlugins) {
      const plugin = this.pluginRegistry.get(pluginName);

      if (pluginsNeedingConfig.includes(pluginName)) {
        // 需要配置的插件：显示步骤并配置
        console.log(`\n📝 Step ${currentStep}/${totalSteps}: Configure ${plugin.meta.name}`);
        console.log('─'.repeat(60));

        const config = await plugin.configuration!.configure(context);
        configs.set(pluginName, config);

        currentStep++;
      } else {
        // 不需要配置的插件：使用默认配置，不显示步骤
        const config = plugin.configuration?.configure
          ? await plugin.configuration.configure(context)
          : { enabled: true, options: {} };

        configs.set(pluginName, config);
      }
    }

    return configs;
  }

  private async showSummaryAndConfirm(
    projectInfo: ProjectInfo,
    pluginConfigs: Map<string, PluginConfig>,
    totalSteps: number
  ): Promise<boolean> {
    console.log(`\n✨ Step ${totalSteps}/${totalSteps}: Summary`);
    console.log('─'.repeat(60));
    console.log(`\nProject: ${projectInfo.name}`);
    console.log(`Location: ${process.cwd()}\n`);

    console.log('Features:');
    for (const [pluginName, config] of pluginConfigs) {
      const plugin = this.pluginRegistry.get(pluginName);
      console.log(`  ✓ ${plugin.meta.name}`);

      if (plugin.configuration?.getSummary) {
        const summary = plugin.configuration.getSummary(config);
        summary.forEach(line => {
          console.log(`    ${line}`);
        });
      }
    }

    console.log();

    return await this.ui.confirm('Proceed with initialization?', true);
  }

  private async executeInitialization(
    targetDir: string,
    projectInfo: ProjectInfo,
    pluginConfigs: Map<string, PluginConfig>
  ): Promise<void> {
    const progress = new ProgressIndicator([
      'Creating directory structure',
      'Installing plugins',
      'Generating configuration',
      'Creating CLAUDE.md',
      'Finalizing setup'
    ]);

    progress.start();

    try {
      // 执行初始化逻辑...
      await this.performInitialization(targetDir, projectInfo, pluginConfigs);

      progress.succeed('Initialization complete!');
    } catch (error) {
      progress.fail('Initialization failed');
      throw error;
    }
  }

  private showCompletionMessage(targetDir: string) {
    console.log('\n🎉 Initialization complete!');
    console.log('─'.repeat(60));
    console.log('\nFiles created:');
    console.log('  ✓ CLAUDE.md');
    console.log('  ✓ claude/config.yaml');
    console.log('  ✓ ...\n');
    console.log('Next steps:');
    console.log('  • Review CLAUDE.md and customize as needed');
    console.log('  • Start chatting with Claude in this project');
    console.log('  • Run \'claude-init --help\' for more commands\n');
  }
}
```

## 命令行入口（极简）

```typescript
// src/cli.ts (重构后)

import { Command } from 'commander';
import { InteractiveInitializer } from './core/interactive-initializer.js';
import { PluginRegistry } from './plugin/registry.js';
import { builtinPlugins } from './plugins/index.js';

const program = new Command();

program
  .name('claude-init')
  .description('Interactive CLI for setting up Claude in your projects')
  .version('2.0.0');

// 主命令：初始化（只有交互式）
program
  .command('init')
  .description('Initialize Claude in your project')
  .option('-f, --force', 'Reinitialize even if already initialized')
  .action(async (options) => {
    const pluginRegistry = new PluginRegistry();
    for (const plugin of builtinPlugins) {
      pluginRegistry.register(plugin);
    }

    const initializer = new InteractiveInitializer(pluginRegistry);
    await initializer.run(process.cwd(), { force: options.force });
  });

// 其他辅助命令（都是交互式）
program
  .command('add-preset')
  .description('Add a new prompt preset')
  .action(async () => {
    // 交互式添加预设
    await interactiveAddPreset();
  });

program
  .command('sync')
  .description('Sync with remote template')
  .action(async () => {
    // 交互式同步
    await interactiveSync();
  });

program
  .command('reconfigure')
  .description('Modify current configuration')
  .action(async () => {
    // 交互式重新配置
    await interactiveReconfigure();
  });

// 显示当前配置（只读）
program
  .command('status')
  .description('Show current configuration')
  .action(async () => {
    await showStatus();
  });

program.parse();
```

### 所有命令都是交互式的

```bash
# 初始化项目
claude-init init

# 添加新的预设（会打开交互式选择器）
claude-init add-preset

# 同步到远程（会询问确认和选项）
claude-init sync

# 修改配置（会显示当前配置并允许修改）
claude-init reconfigure

# 查看当前状态（只读，不交互）
claude-init status
```

## 唯一的交互方式

**只有一种方式：对话式交互**

```bash
# 就这一个命令，简单明了
claude-init init

# 如果需要重新初始化
claude-init init --force
```

**为什么不需要其他模式？**

1. ❌ **不需要 CI 模式** - 这是开发者本地使用的工具，不会在 CI 中运行
2. ❌ **不需要配置文件** - 配置由交互生成，不是预先准备的
3. ❌ **不需要快速模式** - 交互本身已经足够快，智能默认值让你按几次回车就完成
4. ✅ **只需要交互** - 简单、直观、不需要记忆任何参数

### 重新初始化

如果项目已经初始化过，工具会提示：

```
⚠️  This project is already initialized!

Project: my-project
Initialized: 2025-01-18

? What would you like to do?
  ● Keep existing setup
  ○ Reconfigure (modify settings)
  ○ Reinitialize (start from scratch)
```

## 优势总结

### 1. 极简主义
- ✅ **只有一个命令**: `claude-init init`
- ✅ **无需参数**: 所有配置通过对话完成
- ✅ **不需要文档**: 工具本身就是文档

### 2. 用户体验
- ✅ 无需记忆任何参数和插件名
- ✅ 可视化选择，直观易用
- ✅ 渐进式引导，不会迷失
- ✅ 智能默认，按几次回车就完成

### 3. 适合场景
- ✅ 开发者本地使用（主要场景）
- ✅ 一次性配置，长期使用
- ✅ 需要理解选项含义
- ❌ 不适合 CI/CD（这不是 CI 工具）
- ❌ 不适合批量操作（每个项目都有独特需求）

### 4. 可扩展性
- ✅ 插件可注册自己的配置流程
- ✅ 统一的 UI 组件库
- ✅ 上下文感知的配置

### 5. 专业性
- ✅ 清晰的步骤划分
- ✅ 实时反馈和进度显示
- ✅ 详细的摘要和确认
- ✅ 友好的错误处理

---

**版本**: Draft 1.0
**日期**: 2025-01-18
**状态**: 待评审
