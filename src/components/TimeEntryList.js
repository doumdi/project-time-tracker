import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

const TimeEntryList = ({ timeEntries, projects, onRefresh }) => {
  const { t } = useLanguage();
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [filters, setFilters] = useState({
    projectId: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    applyFilters();
  }, [timeEntries, filters]);

  const applyFilters = () => {
    let filtered = [...timeEntries];

    if (filters.projectId) {
      filtered = filtered.filter(entry => entry.project_id === parseInt(filters.projectId));
    }

    if (filters.startDate) {
      filtered = filtered.filter(entry => 
        format(parseISO(entry.start_time), 'yyyy-MM-dd') >= filters.startDate
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(entry => 
        format(parseISO(entry.start_time), 'yyyy-MM-dd') <= filters.endDate
      );
    }

    if (filters.description) {
      filtered = filtered.filter(entry => 
        entry.description && entry.description.toLowerCase().includes(filters.description.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  };

  const handleEdit = (entry) => {
    setEditingEntry({ ...entry });
  };

  const handleSaveEdit = async () => {
    try {
      await window.electronAPI.updateTimeEntry(editingEntry);
      setEditingEntry(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating time entry:', error);
      alert('Error updating time entry: ' + error.message);
    }
  };

  const handleDelete = async (entry) => {
    if (window.confirm(t('entries.confirmDelete'))) {
      try {
        await window.electronAPI.deleteTimeEntry(entry.id);
        alert(t('entries.entryDeleted'));
        onRefresh();
      } catch (error) {
        console.error('Error deleting time entry:', error);
        alert(`${t('entries.errorDeleting')}: ` + error.message);
      }
    }
  };

  const formatDateTime = (dateTime) => {
    return format(parseISO(dateTime), 'MMM dd, yyyy HH:mm');
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${t('common.hours')} ${mins}${t('common.minutes')}`;
  };

  const getTotalTime = () => {
    return filteredEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
  };

  const clearFilters = () => {
    setFilters({
      projectId: '',
      startDate: '',
      endDate: '',
      description: ''
    });
  };

  return (
    <div className="fade-in">
      <div className="card">
        <h2>{t('entries.title')}</h2>
        
        {/* Filters */}
        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{t('entries.filterByProject')}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('entries.project')}</label>
              <select
                className="form-select"
                value={filters.projectId}
                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              >
                <option value="">{t('entries.all')}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('entries.fromDate')}</label>
              <input
                type="date"
                className="form-input"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('entries.toDate')}</label>
              <input
                type="date"
                className="form-input"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('entries.filterByDescription')}</label>
              <input
                type="text"
                className="form-input"
                value={filters.description}
                onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                placeholder={t('entries.filterByDescription')}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={clearFilters}
              >
                {t('entries.clearFilters')}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '6px' }}>
          <strong>
            {filteredEntries.length} {t('projects.entries')} • {t('projects.totalTime')}: {formatDuration(getTotalTime())}
          </strong>
        </div>

        {/* Edit Modal */}
        {editingEntry && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '500px'
            }}>
              <h3>{t('entries.edit')}</h3>
              
              <div className="form-group">
                <label className="form-label">{t('entries.project')}</label>
                <select
                  className="form-select"
                  value={editingEntry.project_id}
                  onChange={(e) => setEditingEntry({ 
                    ...editingEntry, 
                    project_id: parseInt(e.target.value) 
                  })}
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('entries.description')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingEntry.description || ''}
                  onChange={(e) => setEditingEntry({ 
                    ...editingEntry, 
                    description: e.target.value 
                  })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('timer.date')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingEntry.start_time ? format(parseISO(editingEntry.start_time), 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const date = e.target.value;
                      const time = editingEntry.start_time ? format(parseISO(editingEntry.start_time), 'HH:mm') : '09:00';
                      setEditingEntry({ 
                        ...editingEntry, 
                        start_time: new Date(`${date}T${time}`).toISOString() 
                      });
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('timer.startTime')}</label>
                  <input
                    type="time"
                    className="form-input"
                    value={editingEntry.start_time ? format(parseISO(editingEntry.start_time), 'HH:mm') : ''}
                    onChange={(e) => {
                      const date = editingEntry.start_time ? format(parseISO(editingEntry.start_time), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
                      const time = e.target.value;
                      setEditingEntry({ 
                        ...editingEntry, 
                        start_time: new Date(`${date}T${time}`).toISOString() 
                      });
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('timer.duration')} (minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editingEntry.duration || 0}
                  onChange={(e) => setEditingEntry({ 
                    ...editingEntry, 
                    duration: parseInt(e.target.value) || 0 
                  })}
                  min="5"
                  step="5"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setEditingEntry(null)}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  className="btn"
                  onClick={handleSaveEdit}
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Time Entries Table */}
        {filteredEntries.length === 0 ? (
          <div className="empty-state">
            <h3>{t('entries.noEntries')}</h3>
            <p>
              {timeEntries.length === 0 
                ? t('entries.startTracking')
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('entries.project')}</th>
                  <th>{t('entries.description')}</th>
                  <th>{t('timer.date')}</th>
                  <th>{t('entries.startTime')}</th>
                  <th>{t('entries.duration')}</th>
                  <th>{t('entries.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <span 
                        className="project-badge"
                        style={{ backgroundColor: entry.project_color }}
                      >
                        {entry.project_name}
                      </span>
                    </td>
                    <td>{entry.description || '-'}</td>
                    <td>{format(parseISO(entry.start_time), 'MMM dd, yyyy')}</td>
                    <td>{format(parseISO(entry.start_time), 'HH:mm')}</td>
                    <td>{formatDuration(entry.duration)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(entry)}
                        >
                          {t('entries.edit')}
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(entry)}
                        >
                          {t('entries.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeEntryList;