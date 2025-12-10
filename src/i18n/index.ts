import { detectLocale } from './detector.js';
import { loadAllLocales } from './i18n-util.sync.js';
import { i18n } from './i18n-util.js';
import type { Locales, TranslationFunctions } from './i18n-types.js';

let currentLocale: Locales = 'en';
let initialized = false;

export function initI18n(locale?: Locales): void {
  if (initialized) return;

  loadAllLocales();
  currentLocale = locale || detectLocale();
  initialized = true;
}

export function t(): TranslationFunctions {
  if (!initialized) {
    initI18n();
  }
  return i18n()[currentLocale];
}

export function getLocale(): Locales {
  return currentLocale;
}

export function setLocale(locale: Locales): void {
  currentLocale = locale;
}

export { detectLocale } from './detector.js';
export type { Locales, TranslationFunctions };
