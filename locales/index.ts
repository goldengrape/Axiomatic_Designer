
import { zhCN } from './zh-CN';
import { enUS } from './en-US';
import { koKR } from './ko-KR'; // Import Korean locale

export const locales = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ko-KR': koKR, // Add Korean locale
};

export type Locale = typeof enUS; // Structure is the same for all locales
export type Language = keyof typeof locales;

export const DEFAULT_LANGUAGE: Language = 'en-US'; // Changed default to English
