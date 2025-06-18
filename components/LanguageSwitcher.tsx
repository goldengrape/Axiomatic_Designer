
import React from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { locales, Language } from '../locales';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLocale();

  const getLanguageDisplayName = (langKey: Language): string => {
    switch (langKey) {
      case 'zh-CN':
        return '中文';
      case 'en-US':
        return 'English';
      case 'ko-KR':
        return '한국어';
      default:
        return langKey;
    }
  };

  return (
    <div className="relative">
      <label htmlFor="language-select" className="sr-only">
        {t.languageSwitcher.label}
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="block appearance-none w-auto bg-gray-100 border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-primary shadow-sm hover:bg-gray-200 transition-colors text-sm font-medium"
        aria-label={t.languageSwitcher.label}
      >
        {(Object.keys(locales) as Language[]).map((langKey) => (
          <option key={langKey} value={langKey}>
            {getLanguageDisplayName(langKey)}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
};
