import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';

const ProjectManager = ({ projects, onRefresh }) => {
  const { t } = useLanguage();
  const { hourlyRate, formatMoney, calculateEarnings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState({});
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4CAF50',
    budget: '',
    start_date: '',
    end_date: ''
  });

  const colors = [
    '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0',
    '#607D8B', '#795548', '#E91E63', '#00BCD4', '#8BC34A'
  ];

  // Load tasks when component mounts
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const taskList = await window.electronAPI.getTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const toggleProjectExpansion = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleTaskExpansion = async (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
      // Load subtasks if not already loaded
      if (!subtasks[taskId]) {
        await loadSubtasks(taskId);
      }
    }
    setExpandedTasks(newExpanded);
  };

  const loadSubtasks = async (taskId) => {
    try {
      const taskSubtasks = await window.electronAPI.getSubTasks(taskId);
      setSubtasks(prev => ({ ...prev, [taskId]: taskSubtasks }));
    } catch (error) {
      console.error('Error loading subtasks:', error);
    }
  };

  const getProjectTasks = (projectId) => {
    return tasks.filter(task => task.project_id === projectId);
  };

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        description: editingProject.description || '',
        color: editingProject.color || '#4CAF50',
        budget: editingProject.budget || '',
        start_date: editingProject.start_date || '',
        end_date: editingProject.end_date || ''
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
      
      setFormData({ name: '', description: '', color: '#4CAF50', budget: '', start_date: '', end_date: '' });
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
    setFormData({ name: '', description: '', color: '#4CAF50', budget: '', start_date: '', end_date: '' });
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
              <label className="form-label">{t('projects.startDate')}</label>
              <input
                type="date"
                className="form-input"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('projects.endDate')}</label>
              <input
                type="date"
                className="form-input"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
                  <th></th>
                  <th>{t('entries.project')}</th>
                  <th>{t('entries.description')}</th>
                  <th>{t('projects.startDate')}</th>
                  <th>{t('projects.endDate')}</th>
                  <th>{t('projects.totalTime')}</th>
                  <th>{t('projects.budget')}</th>
                  <th>{t('projects.remainingHours')}</th>
                  <th>{t('projects.entries')}</th>
                  <th>Tasks</th>
                  <th>{t('entries.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const { remainingBudget, remainingHours } = calculateRemainingBudgetAndHours(project);
                  const projectTasks = getProjectTasks(project.id);
                  const isExpanded = expandedProjects.has(project.id);
                  return (
                    <React.Fragment key={project.id}>
                  <tr>
                    <td>
                      {projectTasks.length > 0 && (
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => toggleProjectExpansion(project.id)}
                          style={{ padding: '0.25rem', minWidth: '24px' }}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      )}
                    </td>
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
                    <td>{project.start_date || '-'}</td>
                    <td>{project.end_date || '-'}</td>
                    <td>{formatTime(project.total_minutes || 0)}</td>
                    <td>{project.budget ? formatMoney(project.budget) : '-'}</td>
                    <td>{project.budget && project.budget > 0 ? `${remainingHours.toFixed(1)}h` : '-'}</td>
                    <td>{project.entry_count || 0}</td>
                    <td>{projectTasks.length}</td>
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
                  
                  {/* Expanded tasks row */}
                  {isExpanded && projectTasks.length > 0 && (
                    <tr>
                      <td colSpan="11" style={{ padding: '0', background: '#f8f9fa' }}>
                        <div style={{ padding: '1rem' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>
                            Project Tasks ({projectTasks.length})
                          </h4>
                          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.9rem' }}>
                              <thead>
                                <tr style={{ background: '#e9ecef' }}>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', width: '30px' }}></th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Task Name</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Due Date</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Allocated Time</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectTasks.map(task => {
                                  const taskSubtasks = subtasks[task.id] || [];
                                  const isTaskExpanded = expandedTasks.has(task.id);
                                  return (
                                    <React.Fragment key={task.id}>
                                      <tr>
                                        <td style={{ padding: '0.5rem' }}>
                                          {taskSubtasks.length > 0 && (
                                            <button
                                              onClick={() => toggleTaskExpansion(task.id)}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                padding: '0'
                                              }}
                                            >
                                              {isTaskExpanded ? '▼' : '▶'}
                                            </button>
                                          )}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                          {task.name}
                                          {task.is_active && <span style={{ color: '#4CAF50', marginLeft: '0.5rem' }}>●</span>}
                                          {taskSubtasks.length > 0 && (
                                            <span style={{ 
                                              marginLeft: '0.5rem',
                                              fontSize: '0.8rem',
                                              color: '#667eea',
                                              fontWeight: 'bold'
                                            }}>
                                              ({taskSubtasks.filter(s => s.is_completed).length}/{taskSubtasks.length} ✓)
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                          {task.allocated_time > 0 ? `${task.allocated_time} min` : '-'}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                          <span style={{ 
                                            color: task.is_active ? '#4CAF50' : '#666',
                                            fontWeight: task.is_active ? 'bold' : 'normal'
                                          }}>
                                            {task.is_active ? 'Active' : 'Inactive'}
                                          </span>
                                        </td>
                                      </tr>
                                      
                                      {/* Subtasks row */}
                                      {isTaskExpanded && taskSubtasks.length > 0 && (
                                        <tr>
                                          <td colSpan="5" style={{ padding: '0 0.5rem 0.5rem 2rem', background: '#ffffff' }}>
                                            <div style={{ fontSize: '0.85rem' }}>
                                              <strong style={{ color: '#667eea' }}>📋 Subtasks:</strong>
                                              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                                                {taskSubtasks.map(subtask => (
                                                  <li key={subtask.id} style={{
                                                    textDecoration: subtask.is_completed ? 'line-through' : 'none',
                                                    color: subtask.is_completed ? '#999' : '#333',
                                                    marginBottom: '0.25rem'
                                                  }}>
                                                    {subtask.is_completed ? '☑' : '☐'} {subtask.name}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
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