import React, { useState, useEffect } from 'react';

const TimeTracker = ({ projects, onRefresh }) => {
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
      alert('Please select a project first');
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
      
      alert(`Time entry saved: ${Math.floor(roundedDuration / 60)}h ${roundedDuration % 60}m`);
    } catch (error) {
      console.error('Error saving time entry:', error);
      alert('Error saving time entry: ' + error.message);
      setIsTracking(false);
    }
  };

  const handleQuickEntry = async (e) => {
    e.preventDefault();
    
    if (!selectedProject || !quickEntry.date || !quickEntry.startTime) {
      alert('Please fill in all required fields');
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
      
      alert(`Quick entry saved: ${Math.floor(quickEntry.duration / 60)}h ${quickEntry.duration % 60}m`);
    } catch (error) {
      console.error('Error saving quick entry:', error);
      alert('Error saving quick entry: ' + error.message);
    }
  };

  const quickDurations = [5, 15, 30, 60, 120, 240, 480]; // in minutes

  return (
    <div className="fade-in">
      <div className="card">
        <h2>Time Tracker</h2>
        
        {/* Project Selection */}
        <div className="form-group">
          <label className="form-label">Select Project *</label>
          <select
            className="form-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={isTracking}
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {projects.length === 0 && (
          <div className="empty-state">
            <h3>No Projects Available</h3>
            <p>Please create a project first in the Projects tab.</p>
          </div>
        )}

        {projects.length > 0 && (
          <>
            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on?"
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
                Quick Entry Mode (for past work)
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
                    {isTracking ? 'Stop Timer' : 'Start Timer'}
                  </button>
                </div>

                {isTracking && (
                  <div style={{ textAlign: 'center', color: '#4CAF50', fontWeight: '500' }}>
                    ⏱️ Timer is running...
                  </div>
                )}
              </>
            ) : (
              /* Quick Entry Mode */
              <form onSubmit={handleQuickEntry} style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '6px' }}>
                <h3>Quick Time Entry</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={quickEntry.date}
                      onChange={(e) => setQuickEntry({ ...quickEntry, date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
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
                  <label className="form-label">Duration</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {quickDurations.map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        className={`btn btn-small ${quickEntry.duration === minutes ? '' : 'btn-secondary'}`}
                        onClick={() => setQuickEntry({ ...quickEntry, duration: minutes })}
                      >
                        {minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`}
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
                    placeholder="Custom duration (minutes)"
                  />
                </div>

                <button type="submit" className="btn">
                  Add Time Entry ({Math.floor(quickEntry.duration / 60)}h {quickEntry.duration % 60}m)
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