import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const LanguageSelector = ({ compact = false, style }) => {
  const { lang, setLang, languages, t } = useLanguage();
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }} title={t('common.language')}>
      <Globe size={15} color="var(--primary-blue)" />
      <select
        id="app-language-selector"
        className="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t('common.language')}
        style={compact ? { padding: '0.3rem 1.6rem 0.3rem 0.5rem', fontSize: '0.78rem' } : undefined}
      >
        {languages.map(l => (
          <option key={l.code} value={l.code}>{l.native}{l.code !== 'en' ? ` (${l.label})` : ''}</option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSelector;
