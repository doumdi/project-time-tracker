import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { format, parseISO, startOfDay } from 'date-fns';

const OfficePresenceView = ({ onRefresh }) => {
  const { t } = useLanguage();
  const [presenceData, setPresenceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState({
    isPresent: false,
    detectedDevices: [],
    activeSession: null,
    todayTotalMinutes: 0,
    continuousScanning: false,
    currentSessionSeconds: 0,
    globalPresenceStartTime: null
  });
  const [realtimeCounters, setRealtimeCounters] = useState({});

  useEffect(() => {
    loadPresenceData();
    loadCurrentStatus();
    
    // Set up real-time listeners
    if (window.electronAPI) {
      window.electronAPI.onPresenceStatusUpdated((event, status) => {
        setCurrentStatus(prev => ({
          ...prev,
          isPresent: status.isPresent,
          detectedDevices: status.detectedDevice ? [status.detectedDevice] : []
        }));
      });
      
      window.electronAPI.onPresenceDataUpdated(() => {
        loadPresenceData();
        loadCurrentStatus();
      });
    }
    
    // Refresh current status every 30 seconds
    const statusInterval = setInterval(loadCurrentStatus, 30000);
    
    // Update real-time counters every second
    const counterInterval = setInterval(() => {
      const now = new Date();
      const newCounters = {};
      
      // Update device detection counters
      currentStatus.detectedDevices.forEach(device => {
        if (device.secondsDetected !== undefined) {
          newCounters[device.mac_address] = device.secondsDetected + 1;
        }
      });
      
      // Update global presence counter
      if (currentStatus.globalPresenceStartTime) {
        const startTime = new Date(currentStatus.globalPresenceStartTime);
        newCounters.globalSeconds = Math.floor((now - startTime) / 1000);
      }
      
      setRealtimeCounters(newCounters);
    }, 1000);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(counterInterval);
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('presence-status-updated');
        window.electronAPI.removeAllListeners('presence-data-updated');
      }
    };
  }, [selectedDate, currentStatus.detectedDevices, currentStatus.globalPresenceStartTime]);

  const loadCurrentStatus = async () => {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.getCurrentPresenceStatus();
        setCurrentStatus(status);
      }
    } catch (error) {
      console.error('Failed to load current status:', error);
    }
  };

  const loadPresenceData = async () => {
    setLoading(true);
    try {
      const [entries, summaryData] = await Promise.all([
        window.electronAPI.getOfficePresence({ date: selectedDate }),
        window.electronAPI.getOfficePresenceSummary({ 
          startDate: selectedDate, 
          endDate: selectedDate 
        })
      ]);
      
      setPresenceData(entries);
      setSummary(summaryData[0] || null);
    } catch (error) {
      console.error('Failed to load presence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    try {
      return format(parseISO(timeStr), 'HH:mm');
    } catch (error) {
      return timeStr;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatSeconds = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTotalDuration = () => {
    return presenceData.reduce((total, entry) => total + (entry.duration || 0), 0);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const renderCurrentStatus = () => {
    if (!isToday || !currentStatus.continuousScanning) return null;

    return (
      <div className="current-status-container">
        <div className={`current-status ${currentStatus.isPresent ? 'present' : 'absent'}`}>
          <div className="status-header">
            <div className="status-indicator">
              <div className={`status-dot ${currentStatus.isPresent ? 'online' : 'offline'}`}></div>
              <span className="status-text">
                {currentStatus.isPresent ? t('presence.currentlyPresent') : t('presence.currentlyAbsent')}
              </span>
            </div>
            <div className="scanning-status">
              <span className="scanning-text">{t('presence.activeScanning')}</span>
            </div>
          </div>
          
          {currentStatus.isPresent && (
            <div className="global-presence-time">
              <h4>{t('presence.currentSessionTime')}</h4>
              <div className="global-time-display">
                <span className="global-time">
                  {formatSeconds(realtimeCounters.globalSeconds || currentStatus.currentSessionSeconds || 0)}
                </span>
              </div>
            </div>
          )}
          
          {currentStatus.isPresent && currentStatus.detectedDevices.length > 0 && (
            <div className="detected-devices">
              <h4>{t('presence.detectedDevices')}</h4>
              <div className="devices-list">
                {currentStatus.detectedDevices.map((device, index) => {
                  const deviceSeconds = realtimeCounters[device.mac_address] || device.secondsDetected || 0;
                  return (
                    <div key={index} className="device-item">
                      <span className="device-icon">
                        {device.device_type === 'watch' ? '⌚' : 
                         device.device_type === 'phone' ? '📱' : '📟'}
                      </span>
                      <span className="device-name">{device.name}</span>
                      <div className="device-timing">
                        <span className="device-detected-time">
                          {t('presence.detectedFor')}: {formatSeconds(deviceSeconds)}
                        </span>
                        <span className="device-last-seen">
                          {device.last_seen ? format(parseISO(device.last_seen), 'HH:mm:ss') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {isToday && (
            <div className="today-summary">
              <span className="today-label">{t('presence.todayTotal')}</span>
              <span className="today-time">{formatDuration(currentStatus.todayTotalMinutes)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h2>{t('presence.title')}</h2>
          <div className="presence-controls">
            <label className="form-label">
              {t('presence.selectDate')}
            </label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            {selectedDate === new Date().toISOString().split('T')[0] && (
              <span className="badge badge-primary">{t('presence.today')}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {renderCurrentStatus()}
            
            {summary && (
              <div className="presence-summary">
                <div className="summary-card">
                  <h3>{isToday ? t('presence.totalPresenceToday') : t('presence.totalPresenceDate')}</h3>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="stat-label">{t('presence.totalTime')}</span>
                      <span className="stat-value">{formatDuration(summary.total_minutes)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">{t('presence.sessions')}</span>
                      <span className="stat-value">{summary.session_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="presence-table-container">
              {presenceData.length === 0 ? (
                <div className="empty-state">
                  <h3>{t('presence.noPresence')}</h3>
                  <p>{t('presence.startDetecting')}</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('presence.startTime')}</th>
                      <th>{t('presence.endTime')}</th>
                      <th>{t('presence.duration')}</th>
                      <th>{t('presence.device')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presenceData.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatTime(entry.start_time)}</td>
                        <td>{formatTime(entry.end_time)}</td>
                        <td>{formatDuration(entry.duration)}</td>
                        <td>{entry.device_name || t('common.unknown')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .presence-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .presence-controls .form-label {
          margin: 0;
          white-space: nowrap;
        }

        .presence-controls .form-input {
          min-width: 150px;
        }

        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-primary {
          background-color: #007bff;
          color: white;
        }

        .current-status-container {
          margin: 1.5rem 0;
        }

        .current-status {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          padding: 1.5rem;
          border: 2px solid #dee2e6;
        }

        .current-status.present {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border-color: #28a745;
        }

        .current-status.absent {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
          border-color: #dc3545;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          position: relative;
        }

        .status-dot.online {
          background-color: #28a745;
          box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
        }

        .status-dot.offline {
          background-color: #dc3545;
          box-shadow: 0 0 10px rgba(220, 53, 69, 0.3);
        }

        .status-dot.online::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid #28a745;
          border-radius: 50%;
          opacity: 0;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.95);
            opacity: 1;
          }
          70% {
            transform: scale(1.1);
            opacity: 0;
          }
          100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }

        .status-text {
          font-weight: 600;
          font-size: 1.1rem;
          color: #333;
        }

        .scanning-status {
          font-size: 0.875rem;
          color: #666;
        }

        .scanning-text {
          background: #007bff;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
        }

        .detected-devices {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .detected-devices h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.95rem;
          color: #555;
        }

        .devices-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .device-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 6px;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .device-icon {
          font-size: 1.2rem;
        }

        .device-name {
          font-weight: 500;
          flex: 1;
        }

        .device-last-seen {
          font-size: 0.75rem;
          color: #666;
          font-family: monospace;
        }

        .today-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .today-label {
          font-weight: 500;
          color: #555;
        }

        .today-time {
          font-size: 1.2rem;
          font-weight: 600;
          color: #007bff;
        }

        .presence-summary {
          margin: 1.5rem 0;
        }

        .summary-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .summary-card h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.1rem;
        }

        .summary-stats {
          display: flex;
          gap: 2rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #007bff;
        }

        .presence-table-container {
          margin-top: 1.5rem;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .data-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .data-table tr:hover {
          background-color: #f8f9fa;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6c757d;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #6c757d;
        }

        .loading-state {
          text-align: center;
          padding: 2rem;
          color: #6c757d;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .card-header h2 {
          margin: 0;
        }

        @media (max-width: 768px) {
          .presence-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .summary-stats {
            flex-direction: column;
            gap: 1rem;
          }

          .card-header {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default OfficePresenceView;