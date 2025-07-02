import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';

const ProjectManager = ({ projects, onRefresh }) => {
  const { t } = useLanguage();
  const { hourlyRate, formatMoney, calculateEarnings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4CAF50',
    budget: ''
  });

  const colors = [
    '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0',
    '#607D8B', '#795548', '#E91E63', '#00BCD4', '#8BC34A'
  ];

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        description: editingProject.description || '',
        color: editingProject.color || '#4CAF50',
        budget: editingProject.budget || ''
      });
      setShowForm(true);
    }
  }, [editingProject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert(t('projects.nameRequired'));
      return;
    }

    try {
      if (editingProject) {
        await window.electronAPI.updateProject({
          ...editingProject,
          ...formData
        });
        alert(t('projects.projectUpdated'));
      } else {
        await window.electronAPI.addProject(formData);
        alert(t('projects.projectAdded'));
      }
      
      setFormData({ name: '', description: '', color: '#4CAF50', budget: '' });
      setShowForm(false);
      setEditingProject(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving project:', error);
      const errorMsg = editingProject ? t('projects.errorUpdating') : t('projects.errorAdding');
      alert(`${errorMsg}: ` + error.message);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
  };

  const handleDelete = async (project) => {
    if (window.confirm(t('projects.confirmDelete'))) {
      try {
        await window.electronAPI.deleteProject(project.id);
        alert(t('projects.projectDeleted'));
        onRefresh();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert(`${t('projects.errorDeleting')}: ` + error.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', color: '#4CAF50', budget: '' });
    setShowForm(false);
    setEditingProject(null);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${t('common.hours')} ${mins}${t('common.minutes')}`;
  };

  const calculateRemainingBudgetAndHours = (project) => {
    if (!project.budget || project.budget <= 0) {
      return { remainingBudget: 0, remainingHours: 0 };
    }
    
    const totalEarnings = calculateEarnings(project.total_minutes || 0);
    const remainingBudget = Math.max(0, project.budget - totalEarnings);
    const remainingHours = hourlyRate > 0 ? remainingBudget / hourlyRate : 0;
    
    return { remainingBudget, remainingHours };
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>{t('projects.title')}</h2>
          <button 
            className="btn"
            onClick={() => setShowForm(true)}
            disabled={showForm}
          >
            {t('projects.addProject')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '6px' }}>
            <h3>{editingProject ? t('projects.updateProject') : t('projects.addProject')}</h3>
            
            <div className="form-group">
              <label className="form-label">{t('projects.name')}</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('projects.name')}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('projects.description')}</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('projects.descriptionPlaceholder')}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('projects.budget')}</label>
              <input
                type="number"
                className="form-input"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder={t('projects.budgetPlaceholder')}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('projects.color')}</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: formData.color === color ? '3px solid #333' : '2px solid #ddd',
                      cursor: 'pointer'
                    }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn">
                {editingProject ? t('projects.updateProject') : t('projects.addProject')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                {t('projects.cancel')}
              </button>
            </div>
          </form>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>{t('projects.noProjects')}</h3>
            <p>{t('projects.createFirst')}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('entries.project')}</th>
                  <th>{t('entries.description')}</th>
                  <th>{t('projects.totalTime')}</th>
                  <th>{t('projects.budget')}</th>
                  <th>{t('projects.remainingHours')}</th>
                  <th>{t('projects.entries')}</th>
                  <th>{t('entries.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const { remainingBudget, remainingHours } = calculateRemainingBudgetAndHours(project);
                  return (
                  <tr key={project.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: project.color
                          }}
                        />
                        {project.name}
                      </div>
                    </td>
                    <td>{project.description || '-'}</td>
                    <td>{formatTime(project.total_minutes || 0)}</td>
                    <td>{project.budget ? formatMoney(project.budget) : '-'}</td>
                    <td>{project.budget && project.budget > 0 ? `${remainingHours.toFixed(1)}h` : '-'}</td>
                    <td>{project.entry_count || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(project)}
                        >
                          {t('projects.edit')}
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(project)}
                        >
                          {t('projects.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManager;