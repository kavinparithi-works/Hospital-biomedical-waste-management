import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, LANGUAGES } from './translations';

const STORAGE_KEY = 'appLanguage';
const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return translations[saved] ? saved : 'en';
  });

  const setLang = useCallback((code) => {
    if (!translations[code]) return;
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // t('path.to.key', { count: 3 }) — falls back to English, then to the key itself
  const t = useCallback((key, vars) => {
    let value = lookup(translations[lang], key);
    if (value === undefined) value = lookup(translations.en, key);
    if (value === undefined) return key;
    if (typeof value === 'function') return value(vars || {});
    if (vars && typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
    }
    return value;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
export const useT = () => useContext(LanguageContext).t;
