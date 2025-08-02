import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { format, parseISO, startOfDay } from 'date-fns';

const OfficePresenceView = ({ onRefresh }) => {
  const { t } = useLanguage();
  const [presenceData, setPresenceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresenceData();
  }, [selectedDate]);

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

  const getTotalDuration = () => {
    return presenceData.reduce((total, entry) => total + (entry.duration || 0), 0);
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
            {summary && (
              <div className="presence-summary">
                <div className="summary-card">
                  <h3>{t('presence.totalPresenceToday')}</h3>
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