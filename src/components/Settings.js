import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import BleDevicesView from './BleDevicesView';

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
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [databaseVersion, setDatabaseVersion] = useState(1);
  const [showBleDevices, setShowBleDevices] = useState(false);
  const [officePresenceEnabled, setOfficePresenceEnabled] = useState(false);
  const [presenceSaveInterval, setPresenceSaveInterval] = useState(15); // Default 15 minutes
  const [taskDisplayCount, setTaskDisplayCount] = useState(5); // Default 5 tasks
  const [mcpServerEnabled, setMcpServerEnabled] = useState(false);

  // Load version information
  useEffect(() => {
    const loadVersions = async () => {
      try {
        if (window.electronAPI) {
          const appVer = await window.electronAPI.getAppVersion();
          const dbVer = await window.electronAPI.getDatabaseVersion();
          setAppVersion(appVer);
          setDatabaseVersion(dbVer);
        }
      } catch (err) {
        console.error('Error loading versions:', err);
      }
    };
    
    loadVersions();
  }, []);

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

  const handleOfficePresenceToggle = async (e) => {
    const enabled = e.target.checked;
    setOfficePresenceEnabled(enabled);
    
    // Store in localStorage
    localStorage.setItem('officePresenceEnabled', enabled.toString());
    
    // Enable/disable presence monitoring via IPC
    try {
      await window.electronAPI.enablePresenceMonitoring(enabled);
      alert(t('settings.settingsSaved'));
    } catch (error) {
      console.error('Failed to toggle presence monitoring:', error);
      alert(t('settings.errorSaving') || 'Error saving settings');
      // Revert the toggle state
      setOfficePresenceEnabled(!enabled);
      localStorage.setItem('officePresenceEnabled', (!enabled).toString());
    }
  };

  const handleConfigureDevices = () => {
    setShowBleDevices(true);
  };

  const handleBackFromBleDevices = () => {
    setShowBleDevices(false);
  };

  const handlePresenceSaveIntervalChange = async (e) => {
    const intervalMinutes = parseInt(e.target.value);
    if (isNaN(intervalMinutes) || intervalMinutes < 1) return;
    
    setPresenceSaveInterval(intervalMinutes);
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.setPresenceSaveInterval(intervalMinutes);
        alert(t('settings.settingsSaved'));
      }
    } catch (error) {
      console.error('Failed to update presence save interval:', error);
      alert(t('settings.errorSaving') || 'Error saving settings');
    }
  };

  const handleTaskDisplayCountChange = (e) => {
    const count = parseInt(e.target.value);
    if (isNaN(count) || count < 1) return;
    
    setTaskDisplayCount(count);
    localStorage.setItem('taskDisplayCount', count.toString());
    alert(t('settings.settingsSaved'));
  };

  const handleMcpServerToggle = async (e) => {
    const enabled = e.target.checked;
    setMcpServerEnabled(enabled);
    
    // Store in localStorage
    localStorage.setItem('mcpServerEnabled', enabled.toString());
    
    // Enable/disable MCP server via IPC
    try {
      await window.electronAPI.enableMcpServer(enabled);
      alert(t('settings.settingsSaved'));
    } catch (error) {
      console.error('Failed to toggle MCP server:', error);
      alert(t('settings.errorSaving') || 'Error saving settings');
      // Revert the toggle state
      setMcpServerEnabled(!enabled);
      localStorage.setItem('mcpServerEnabled', (!enabled).toString());
    }
  };

  // Load office presence setting and initialize monitoring
  useEffect(() => {
    const initializePresenceMonitoring = async () => {
      const stored = localStorage.getItem('officePresenceEnabled');
      const enabled = stored === 'true';
      setOfficePresenceEnabled(enabled);
      
      // Load presence save interval
      try {
        if (window.electronAPI) {
          const interval = await window.electronAPI.getPresenceSaveInterval();
          setPresenceSaveInterval(interval);
        }
      } catch (error) {
        console.error('Failed to load presence save interval:', error);
      }
      
      // Load task display count
      const storedTaskCount = localStorage.getItem('taskDisplayCount');
      if (storedTaskCount) {
        setTaskDisplayCount(parseInt(storedTaskCount) || 5);
      }
      
      // Load MCP server setting
      const storedMcpServer = localStorage.getItem('mcpServerEnabled');
      const mcpEnabled = storedMcpServer === 'true';
      setMcpServerEnabled(mcpEnabled);
      
      // Initialize MCP server if enabled
      if (mcpEnabled && window.electronAPI) {
        try {
          await window.electronAPI.enableMcpServer(true);
          console.log('MCP server initialized');
        } catch (error) {
          console.error('Failed to initialize MCP server:', error);
        }
      }
      
      // Initialize presence monitoring if enabled
      if (enabled && window.electronAPI) {
        try {
          await window.electronAPI.enablePresenceMonitoring(true);
          console.log('Presence monitoring initialized');
        } catch (error) {
          console.error('Failed to initialize presence monitoring:', error);
        }
      }
    };
    
    initializePresenceMonitoring();
  }, []);

  return (
    <>
      {showBleDevices ? (
        <BleDevicesView onBack={handleBackFromBleDevices} />
      ) : (
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

            <div className="form-group">
              <label className="form-label">{t('settings.taskDisplayCount')}</label>
              <input
                type="number"
                className="form-input"
                value={taskDisplayCount}
                onChange={handleTaskDisplayCountChange}
                min="1"
                max="20"
                step="1"
                style={{ maxWidth: '120px' }}
              />
              <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                {t('settings.taskDisplayCountDescription')}
              </small>
            </div>

            {/* Office Presence Settings */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#333' }}>
                {t('settings.officePresence')}
              </h3>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={officePresenceEnabled}
                    onChange={handleOfficePresenceToggle}
                    style={{ marginRight: '0.5rem' }}
                  />
                  {t('settings.enableOfficePresence')}
                </label>
                <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                  {t('settings.officePresenceDescription')}
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  {t('settings.presenceSaveInterval') || 'Presence Save Interval (minutes)'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={presenceSaveInterval}
                  onChange={handlePresenceSaveIntervalChange}
                  min="1"
                  max="480"
                  step="1"
                  style={{ maxWidth: '120px' }}
                />
                <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                  {t('settings.presenceSaveIntervalDescription') || 'How often to save presence sessions to database (1-480 minutes)'}
                </small>
              </div>

              <button 
                className="btn btn-secondary"
                onClick={handleConfigureDevices}
                style={{ marginTop: '1rem' }}
              >
                {t('settings.configureBleDevices')}
              </button>
            </div>

            {/* MCP Server Settings */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0f7ff', borderRadius: '8px', border: '1px solid #d6e9f9' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#333' }}>
                {t('settings.mcpServer') || 'MCP Server'}
              </h3>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={mcpServerEnabled}
                    onChange={handleMcpServerToggle}
                    style={{ marginRight: '0.5rem' }}
                  />
                  {t('settings.enableMcpServer') || 'Enable MCP Server'}
                </label>
                <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                  {t('settings.mcpServerDescription') || 'Expose all app functionalities via Model Context Protocol (MCP) server for AI systems. Server runs on localhost when enabled.'}
                </small>
              </div>

              {mcpServerEnabled && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#fff3cd', 
                  border: '1px solid #ffeaa7', 
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}>
                  <strong>⚠️ Security Notice:</strong> The MCP server exposes read/write access to all your data. 
                  Only enable this feature if you understand the security implications and trust the AI systems 
                  that will connect to it.
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                {t('app.title')}
              </h3>
              <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>
                App Version: {appVersion}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                Database Version: {databaseVersion}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                Built with Electron and React
              </p>
              <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem' }}>
                <a 
                  href="https://github.com/doumdi/project-time-tracker" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#007bff', textDecoration: 'none' }}
                  onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                >
                  GitHub Repository
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-weight: 500;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
        }
      `}</style>
    </>
  );
};

export default Settings;