/**
 * Language Settings Plugin
 *
 * Configures LLM Agent language preferences:
 * - THINK_LANGUAGE: Language for AI's internal thinking and technical analysis
 * - USER_LANGUAGE: Language for AI's user-facing outputs
 *
 * Auto-detects from shell locale and allows user customization.
 */

import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
} from '../../plugin/types.js';
import { t, getLocale } from '../../i18n/index.js';
import type { LanguageSettingsOptions } from './schema.js';

// ============================================================================
// Language Detection
// ============================================================================

/**
 * Map locale codes to full language names
 */
const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
};

/**
 * Available language options for selection
 */
const LANGUAGE_OPTIONS = [
  { value: 'English', name: 'English' },
  { value: 'Chinese', name: '中文 (Chinese)' },
  { value: 'Japanese', name: '日本語 (Japanese)' },
  { value: 'Korean', name: '한국어 (Korean)' },
  { value: 'Spanish', name: 'Español (Spanish)' },
  { value: 'French', name: 'Français (French)' },
  { value: 'German', name: 'Deutsch (German)' },
  { value: 'Portuguese', name: 'Português (Portuguese)' },
  { value: 'Russian', name: 'Русский (Russian)' },
  { value: 'Arabic', name: 'العربية (Arabic)' },
];

/**
 * Detect user language from shell locale
 */
function detectUserLanguage(): string {
  // Use CLI's detected locale
  const locale = getLocale();
  return LOCALE_TO_LANGUAGE[locale] || 'English';
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const languageSettingsPlugin: Plugin<LanguageSettingsOptions> = {
  meta: {
    name: 'language-settings',
    commandName: 'language',
    version: '1.0.0',
    description: 'Configure LLM Agent language preferences',
    recommended: true,
    rulesPriority: 20, // 20-29: Global settings
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig<LanguageSettingsOptions>> {
      const { ui, logger } = context;
      const L = t();

      logger.info('\n' + L.plugins.languageSettings.configTitle());

      // Detect default language from shell
      const detectedLanguage = detectUserLanguage();
      logger.info(L.plugins.languageSettings.detected({ language: detectedLanguage }));

      // Ask for user language (AI output language)
      const userLanguage = await ui.radioList(
        L.plugins.languageSettings.selectUserLanguage(),
        LANGUAGE_OPTIONS.map(opt => ({
          name: opt.name,
          value: opt.value,
          description: opt.value === detectedLanguage
            ? L.plugins.languageSettings.detectedHint()
            : '',
        })),
        detectedLanguage
      );

      // Ask for think language (usually English for technical work)
      const thinkLanguage = await ui.radioList(
        L.plugins.languageSettings.selectThinkLanguage(),
        [
          {
            name: 'English',
            value: 'English',
            description: L.plugins.languageSettings.thinkEnglishDesc(),
          },
          {
            name: L.plugins.languageSettings.sameAsUser(),
            value: userLanguage,
            description: L.plugins.languageSettings.sameAsUserDesc(),
          },
        ],
        'English'
      );

      const options: LanguageSettingsOptions = {
        think_language: thinkLanguage,
        user_language: userLanguage,
      };

      return {
        enabled: true,
        options,
      };
    },

    getSummary(config: PluginConfig<LanguageSettingsOptions>): string[] {
      const { options } = config;
      const L = t();

      return [
        L.plugins.languageSettings.thinkLabel({ language: options.think_language }),
        L.plugins.languageSettings.userLabel({ language: options.user_language }),
      ];
    },
  },

  // Contribute to AGENT.md Language Convention section
  prompt: {
    placeholder: 'LANGUAGE_SECTION',
    generate: (config: PluginConfig<LanguageSettingsOptions>): string => {
      if (!config.enabled) {
        return '';
      }

      const { options } = config;

      const lines: string[] = [];
      lines.push('## Language Convention');
      lines.push('');
      lines.push(`- **Internal thinking**: ${options.think_language} (for code analysis, technical reasoning)`);
      lines.push(`- **External retrieval**: ${options.think_language} (code, documentation, web search)`);
      lines.push(`- **Final outputs**: ${options.user_language} (user-facing documentation, reports)`);

      return lines.join('\n');
    },
  },

  // No outputs needed - this plugin only contributes to AGENT.md via prompt
  outputs: {
    generate: async (): Promise<[]> => [],
  },

  commands: [],
};

export default languageSettingsPlugin;
