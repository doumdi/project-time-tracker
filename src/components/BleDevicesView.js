import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const BleDevicesView = ({ onBack }) => {
  const { t } = useLanguage();
  const [myDevices, setMyDevices] = useState([]);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMyDevices();
    
    // Set up BLE event listeners
    const handleDeviceDiscovered = (event, device) => {
      setDiscoveredDevices(prev => {
        const existingIndex = prev.findIndex(d => d.id === device.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = device;
          return updated;
        } else {
          return [...prev, device];
        }
      });
    };

    const handleScanStopped = () => {
      setIsScanning(false);
    };

    if (window.electronAPI) {
      window.electronAPI.onBleDeviceDiscovered(handleDeviceDiscovered);
      window.electronAPI.onBleScanStopped(handleScanStopped);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('ble-device-discovered');
        window.electronAPI.removeAllListeners('ble-scan-stopped');
      }
    };
  }, []);

  const loadMyDevices = async () => {
    setLoading(true);
    try {
      const devices = await window.electronAPI.getBleDevices();
      setMyDevices(devices);
    } catch (error) {
      console.error('Failed to load BLE devices:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const startScan = async () => {
    setError(null);
    try {
      setIsScanning(true);
      setDiscoveredDevices([]);
      
      // First try to trigger an immediate scan if presence monitoring is active
      try {
        await window.electronAPI.triggerImmediateScan();
      } catch (triggerError) {
        // If immediate scan fails, fall back to regular scan
        console.warn('Immediate scan failed, using regular scan:', triggerError);
        await window.electronAPI.startBleScan();
      }
    } catch (error) {
      console.error('Failed to start BLE scan:', error);
      setError(t('bleDevices.scanFailed') + ': ' + error.message);
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    try {
      await window.electronAPI.stopBleScan();
      setIsScanning(false);
    } catch (error) {
      console.error('Failed to stop BLE scan:', error);
    }
  };

  const addDevice = async (discoveredDevice) => {
    try {
      const newDevice = {
        name: discoveredDevice.name,
        mac_address: discoveredDevice.mac_address,
        device_type: discoveredDevice.device_type,
        is_enabled: true
      };
      
      await window.electronAPI.addBleDevice(newDevice);
      await loadMyDevices();
      
      // Remove from discovered devices
      setDiscoveredDevices(prev => prev.filter(d => d.id !== discoveredDevice.id));
      
      alert(t('bleDevices.deviceAdded'));
    } catch (error) {
      console.error('Failed to add device:', error);
      alert(t('common.error') + ': ' + error.message);
    }
  };

  const toggleDevice = async (device) => {
    try {
      const updatedDevice = { ...device, is_enabled: !device.is_enabled };
      await window.electronAPI.updateBleDevice(updatedDevice);
      await loadMyDevices();
      alert(t('bleDevices.deviceUpdated'));
    } catch (error) {
      console.error('Failed to update device:', error);
      alert(t('common.error') + ': ' + error.message);
    }
  };

  const deleteDevice = async (deviceId) => {
    if (!confirm(t('bleDevices.confirmDelete'))) {
      return;
    }
    
    try {
      await window.electronAPI.deleteBleDevice(deviceId);
      await loadMyDevices();
      alert(t('bleDevices.deviceDeleted'));
    } catch (error) {
      console.error('Failed to delete device:', error);
      alert(t('common.error') + ': ' + error.message);
    }
  };

  const handleDragStart = (e, device) => {
    e.dataTransfer.setData('application/json', JSON.stringify(device));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    try {
      const deviceData = JSON.parse(e.dataTransfer.getData('application/json'));
      addDevice(deviceData);
    } catch (error) {
      console.error('Failed to parse dropped device data:', error);
    }
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="loading-state">
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h2>{t('bleDevices.title')}</h2>
          <button className="btn btn-secondary" onClick={onBack}>
            ← {t('common.back')}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="ble-container">
          {/* Scanning Section */}
          <div className="section">
            <div className="section-header">
              <h3>{t('bleDevices.discoveredDevices')}</h3>
              <div className="scan-controls">
                {!isScanning ? (
                  <button className="btn btn-primary" onClick={startScan}>
                    {t('bleDevices.scanForDevices')}
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={stopScan}>
                    {t('bleDevices.stopScanning')}
                  </button>
                )}
              </div>
            </div>

            {isScanning && (
              <div className="scanning-indicator">
                <span className="spinner"></span>
                {t('bleDevices.scanning')}
              </div>
            )}

            <div className="discovered-devices">
              {discoveredDevices.length === 0 ? (
                <div className="empty-state">
                  <p>{isScanning ? t('bleDevices.scanning') : t('bleDevices.noDevicesFound')}</p>
                </div>
              ) : (
                <div className="device-grid">
                  {discoveredDevices.map((device) => (
                    <div
                      key={device.id}
                      className="device-card discovered"
                      draggable
                      onDragStart={(e) => handleDragStart(e, device)}
                      onClick={() => addDevice(device)}
                    >
                      <div className="device-info">
                        <div className="device-name">{device.name}</div>
                        <div className="device-details">
                          <span className="device-type">{device.device_type}</span>
                          <span className="device-mac">{device.mac_address}</span>
                        </div>
                        <div className="device-rssi">RSSI: {device.rssi}dBm</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Devices Section */}
          <div className="section">
            <div className="section-header">
              <h3>{t('bleDevices.myDevices')}</h3>
            </div>

            <div 
              className="my-devices drop-zone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {myDevices.length === 0 ? (
                <div className="empty-state">
                  <p>{t('bleDevices.noMyDevices')}</p>
                  <p className="help-text">{t('bleDevices.addDevicesHelp')}</p>
                </div>
              ) : (
                <div className="device-list">
                  {myDevices.map((device) => (
                    <div key={device.id} className="device-item">
                      <div className="device-info">
                        <div className="device-name">{device.name}</div>
                        <div className="device-details">
                          <span className="device-type">{device.device_type}</span>
                          <span className="device-mac">{device.mac_address}</span>
                        </div>
                      </div>
                      <div className="device-actions">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={device.is_enabled}
                            onChange={() => toggleDevice(device)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteDevice(device.id)}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ble-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-top: 1.5rem;
        }

        .section {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #333;
        }

        .scan-controls button {
          font-size: 0.875rem;
        }

        .scanning-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: #007bff;
          font-size: 0.875rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .device-grid {
          display: grid;
          gap: 0.75rem;
        }

        .device-card {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .device-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 4px rgba(0,123,255,0.1);
        }

        .device-card.discovered {
          background: #f8f9fa;
        }

        .device-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .device-name {
          font-weight: 600;
          color: #333;
        }

        .device-details {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          font-size: 0.875rem;
          color: #666;
        }

        .device-type {
          text-transform: capitalize;
        }

        .device-mac {
          font-family: monospace;
          font-size: 0.8rem;
          background: #e9ecef;
          padding: 0.125rem 0.25rem;
          border-radius: 3px;
          color: #495057;
          font-weight: 500;
        }

        .device-rssi {
          font-size: 0.75rem;
          color: #999;
        }

        .my-devices {
          min-height: 200px;
        }

        .drop-zone {
          border: 2px dashed #dee2e6;
          border-radius: 6px;
          transition: border-color 0.2s;
        }

        .drop-zone:hover {
          border-color: #007bff;
        }

        .device-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .device-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          background: white;
        }

        .device-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          border-radius: 24px;
          transition: 0.4s;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: 0.4s;
        }

        input:checked + .toggle-slider {
          background-color: #007bff;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }

        .alert {
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 6px;
        }

        .alert-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .empty-state {
          text-align: center;
          padding: 2rem 1rem;
          color: #6c757d;
        }

        .help-text {
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-header h2 {
          margin: 0;
        }

        @media (max-width: 768px) {
          .ble-container {
            grid-template-columns: 1fr;
          }

          .card-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .device-item {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .device-actions {
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default BleDevicesView;