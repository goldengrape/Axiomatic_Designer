
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { locales, Locale, Language, DEFAULT_LANGUAGE } from '../locales';

interface LocaleContextType {
  locale: Locale;
  language: Language;
  setLanguage: (language: Language) => void;
  t: Locale; // Shortcut for locale
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const storedLang = localStorage.getItem('appLanguage');
      return storedLang && locales[storedLang as Language] ? (storedLang as Language) : DEFAULT_LANGUAGE;
    } catch (error) {
      console.warn("Could not retrieve language from localStorage", error);
      return DEFAULT_LANGUAGE;
    }
  });

  const setLanguage = (lang: Language) => {
    try {
      localStorage.setItem('appLanguage', lang);
    } catch (error) {
      console.warn("Could not save language to localStorage", error);
    }
    setLanguageState(lang);
  };
  
  useEffect(() => {
     if (language.startsWith('zh')) {
        document.documentElement.lang = 'zh-CN';
     } else if (language.startsWith('ko')) {
        document.documentElement.lang = 'ko-KR';
     } else if (language.startsWith('en')) {
        document.documentElement.lang = 'en-US';
     } else {
        document.documentElement.lang = language; // Fallback
     }
  }, [language]);

  const locale = locales[language];

  return (
    <LocaleContext.Provider value={{ locale, language, setLanguage, t: locale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
