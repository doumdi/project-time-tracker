import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const { currentLanguage, changeLanguage, availableLanguages, t } = useLanguage();
  const { 
    hourlyRate, 
    currency, 
    availableCurrencies, 
    updateHourlyRate, 
    updateCurrency 
  } = useSettings();
  
  const [localHourlyRate, setLocalHourlyRate] = useState(hourlyRate.toString());

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    changeLanguage(newLanguage);
    
    // Show success message
    alert(t('settings.settingsSaved'));
  };

  const handleHourlyRateChange = (e) => {
    const value = e.target.value;
    setLocalHourlyRate(value);
    
    // Update the actual rate (allow for decimal values)
    if (value === '' || !isNaN(parseFloat(value))) {
      updateHourlyRate(value === '' ? 0 : parseFloat(value));
    }
  };

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    updateCurrency(newCurrency);
    
    // Show success message
    alert(t('settings.settingsSaved'));
  };

  return (
    <div className="fade-in">
      <div className="card">
        <h2>{t('settings.title')}</h2>
        
        <div className="form-group">
          <label className="form-label">{t('settings.language')}</label>
          <select
            className="form-select"
            value={currentLanguage}
            onChange={handleLanguageChange}
          >
            {availableLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
            {t('settings.selectLanguage')}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">{t('settings.hourlyRate')}</label>
          <input
            type="number"
            className="form-input"
            value={localHourlyRate}
            onChange={handleHourlyRateChange}
            placeholder={t('settings.enterHourlyRate')}
            min="0"
            step="0.01"
          />
          <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
            {t('settings.enterHourlyRate')}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">{t('settings.currency')}</label>
          <select
            className="form-select"
            value={currency}
            onChange={handleCurrencyChange}
          >
            {availableCurrencies.map(curr => (
              <option key={curr.code} value={curr.code}>
                {curr.name} ({curr.symbol})
              </option>
            ))}
          </select>
          <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
            {t('settings.selectCurrency')}
          </small>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
            {t('app.title')}
          </h3>
          <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>
            Version 1.0.0
          </p>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
            Built with Electron and React
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;