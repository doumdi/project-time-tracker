import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const TimeTracker = ({ projects, onRefresh }) => {
  const { t } = useLanguage();
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [quickEntryMode, setQuickEntryMode] = useState(false);
  const [quickEntry, setQuickEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    duration: 5
  });

  useEffect(() => {
    let interval;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const formatElapsedTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (!selectedProject) {
      alert(t('timer.selectProjectFirst'));
      return;
    }

    if (isTracking) {
      // Stop tracking
      handleStopTimer();
    } else {
      // Start tracking
      setStartTime(Date.now());
      setElapsedTime(0);
      setIsTracking(true);
    }
  };

  const handleStopTimer = async () => {
    if (!startTime) return;

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    // Round to nearest 5 minutes
    const roundedDuration = Math.max(5, Math.round(durationMinutes / 5) * 5);

    try {
      const timeEntry = {
        project_id: parseInt(selectedProject),
        description: description.trim(),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration: roundedDuration
      };

      await window.electronAPI.addTimeEntry(timeEntry);
      
      // Reset state
      setIsTracking(false);
      setStartTime(null);
      setElapsedTime(0);
      setDescription('');
      onRefresh();
      
      alert(`${t('timer.timeEntrySaved')}: ${Math.floor(roundedDuration / 60)}${t('common.hours')} ${roundedDuration % 60}${t('common.minutes')}`);
    } catch (error) {
      console.error('Error saving time entry:', error);
      alert(`${t('timer.errorSaving')}: ` + error.message);
      setIsTracking(false);
    }
  };

  const handleQuickEntry = async (e) => {
    e.preventDefault();
    
    if (!selectedProject || !quickEntry.date || !quickEntry.startTime) {
      alert(t('timer.fillAllFields'));
      return;
    }

    try {
      const startDateTime = new Date(`${quickEntry.date}T${quickEntry.startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + (quickEntry.duration * 60000));

      const timeEntry = {
        project_id: parseInt(selectedProject),
        description: description.trim(),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration: quickEntry.duration
      };

      await window.electronAPI.addTimeEntry(timeEntry);
      
      // Reset form
      setDescription('');
      setQuickEntry({
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        duration: 5
      });
      onRefresh();
      
      alert(`${t('timer.quickEntrySaved')}: ${Math.floor(quickEntry.duration / 60)}${t('common.hours')} ${quickEntry.duration % 60}${t('common.minutes')}`);
    } catch (error) {
      console.error('Error saving quick entry:', error);
      alert(`${t('timer.errorSavingQuick')}: ` + error.message);
    }
  };

  const quickDurations = [5, 15, 30, 60, 120, 240, 480]; // in minutes

  return (
    <div className="fade-in">
      <div className="card">
        <h2>{t('timer.title')}</h2>
        
        {/* Project Selection */}
        <div className="form-group">
          <label className="form-label">{t('timer.selectProject')}</label>
          <select
            className="form-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={isTracking}
          >
            <option value="">{t('timer.chooseProject')}</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {projects.length === 0 && (
          <div className="empty-state">
            <h3>{t('timer.noProjects')}</h3>
            <p>{t('timer.createProjectFirst')}</p>
          </div>
        )}

        {projects.length > 0 && (
          <>
            {/* Description */}
            <div className="form-group">
              <label className="form-label">{t('timer.description')}</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('timer.descriptionPlaceholder')}
                disabled={!selectedProject}
              />
            </div>

            {/* Mode Toggle */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={quickEntryMode}
                  onChange={(e) => setQuickEntryMode(e.target.checked)}
                  disabled={isTracking}
                />
                {t('timer.quickEntryMode')}
              </label>
            </div>

            {!quickEntryMode ? (
              /* Live Timer Mode */
              <>
                <div className="timer-display">
                  {formatElapsedTime(elapsedTime)}
                </div>

                <div className="timer-controls">
                  <button
                    className={`btn ${isTracking ? 'btn-danger' : ''}`}
                    onClick={handleStartStop}
                    disabled={!selectedProject}
                    style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
                  >
                    {isTracking ? t('timer.stopTimer') : t('timer.startTimer')}
                  </button>
                </div>

                {isTracking && (
                  <div style={{ textAlign: 'center', color: '#4CAF50', fontWeight: '500' }}>
                    {t('timer.timerRunning')}
                  </div>
                )}
              </>
            ) : (
              /* Quick Entry Mode */
              <form onSubmit={handleQuickEntry} style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '6px' }}>
                <h3>{t('timer.quickTimeEntry')}</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('timer.date')}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={quickEntry.date}
                      onChange={(e) => setQuickEntry({ ...quickEntry, date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">{t('timer.startTime')}</label>
                    <input
                      type="time"
                      className="form-input"
                      value={quickEntry.startTime}
                      onChange={(e) => setQuickEntry({ ...quickEntry, startTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('timer.duration')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {quickDurations.map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        className={`btn btn-small ${quickEntry.duration === minutes ? '' : 'btn-secondary'}`}
                        onClick={() => setQuickEntry({ ...quickEntry, duration: minutes })}
                      >
                        {minutes < 60 ? `${minutes}${t('common.minutes')}` : `${Math.floor(minutes / 60)}${t('common.hours')}${minutes % 60 ? ` ${minutes % 60}${t('common.minutes')}` : ''}`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    value={quickEntry.duration}
                    onChange={(e) => setQuickEntry({ ...quickEntry, duration: parseInt(e.target.value) || 5 })}
                    min="5"
                    step="5"
                    placeholder={t('timer.customDuration')}
                  />
                </div>

                <button type="submit" className="btn">
                  {t('timer.addTimeEntry')} ({Math.floor(quickEntry.duration / 60)}{t('common.hours')} {quickEntry.duration % 60}{t('common.minutes')})
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TimeTracker;