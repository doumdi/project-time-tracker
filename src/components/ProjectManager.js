import React, { useState, useEffect } from 'react';

const ProjectManager = ({ projects, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4CAF50'
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
        color: editingProject.color || '#4CAF50'
      });
      setShowForm(true);
    }
  }, [editingProject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Project name is required');
      return;
    }

    try {
      if (editingProject) {
        await window.electronAPI.updateProject({
          ...editingProject,
          ...formData
        });
      } else {
        await window.electronAPI.addProject(formData);
      }
      
      setFormData({ name: '', description: '', color: '#4CAF50' });
      setShowForm(false);
      setEditingProject(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project: ' + error.message);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
  };

  const handleDelete = async (project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This will also delete all time entries for this project.`)) {
      try {
        await window.electronAPI.deleteProject(project.id);
        onRefresh();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project: ' + error.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', color: '#4CAF50' });
    setShowForm(false);
    setEditingProject(null);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Project Management</h2>
          <button 
            className="btn"
            onClick={() => setShowForm(true)}
            disabled={showForm}
          >
            Add Project
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '6px' }}>
            <h3>{editingProject ? 'Edit Project' : 'Add New Project'}</h3>
            
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description (optional)"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
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
                {editingProject ? 'Update Project' : 'Add Project'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>No Projects Yet</h3>
            <p>Create your first project to start tracking time!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Description</th>
                  <th>Time Tracked</th>
                  <th>Entries</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
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
                    <td>{project.entry_count || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(project)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(project)}
                        >
                          Delete
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

export default ProjectManager;