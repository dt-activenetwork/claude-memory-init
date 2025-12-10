import type { Locales } from './i18n-types.js';

const SUPPORTED_LOCALES: Locales[] = ['en', 'zh'];
const DEFAULT_LOCALE: Locales = 'en';

export function detectLocale(): Locales {
  // 1. 环境变量优先
  const envLang = process.env.CLAUDE_INIT_LANG;
  if (envLang && isSupported(envLang)) {
    return envLang as Locales;
  }

  // 2. 系统 locale
  const systemLocale = process.env.LANG ||
                       process.env.LANGUAGE ||
                       process.env.LC_ALL ||
                       process.env.LC_MESSAGES || '';

  const lang = systemLocale.split(/[_.@]/)[0]?.toLowerCase();

  if (lang === 'zh') return 'zh';
  if (lang === 'en') return 'en';

  // 3. 默认英文
  return DEFAULT_LOCALE;
}

function isSupported(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale as Locales);
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
