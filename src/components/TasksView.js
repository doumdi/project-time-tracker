import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

const TasksView = ({ projects, onRefresh }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    due_date: '',
    project_id: '',
    allocated_time: ''
  });
  const [activeTaskStartTime, setActiveTaskStartTime] = useState(null);

  useEffect(() => {
    loadTasks();
    loadActiveTask();
  }, []);

  const loadTasks = async () => {
    try {
      const taskList = await window.electronAPI.getTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadActiveTask = async () => {
    try {
      const activeTaskData = await window.electronAPI.getActiveTask();
      setActiveTask(activeTaskData);
      
      // Load start time from localStorage if task is active
      if (activeTaskData) {
        const savedTimer = localStorage.getItem('activeTimer');
        if (savedTimer) {
          const timerData = JSON.parse(savedTimer);
          if (timerData.taskId === activeTaskData.id) {
            setActiveTaskStartTime(timerData.startTime);
          }
        }
      }
    } catch (error) {
      console.error('Error loading active task:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a task name');
      return;
    }

    try {
      const taskData = {
        name: formData.name.trim(),
        due_date: formData.due_date || null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        allocated_time: formData.allocated_time ? parseInt(formData.allocated_time) : 0
      };

      if (editingTask) {
        await window.electronAPI.updateTask({ ...taskData, id: editingTask.id });
        alert(t('tasks.taskUpdated'));
      } else {
        await window.electronAPI.addTask(taskData);
        alert(t('tasks.taskCreated'));
      }

      resetForm();
      loadTasks();
      onRefresh();
    } catch (error) {
      console.error('Error saving task:', error);
      alert(editingTask ? t('tasks.errorUpdating') : t('tasks.errorCreating'));
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      due_date: task.due_date || '',
      project_id: task.project_id || '',
      allocated_time: task.allocated_time || ''
    });
    setIsCreateFormOpen(true);
  };

  const handleDelete = async (task) => {
    if (!window.confirm(t('tasks.confirmDelete'))) return;

    try {
      await window.electronAPI.deleteTask(task.id);
      alert(t('tasks.taskDeleted'));
      loadTasks();
      
      // If the deleted task was active, clear active task
      if (activeTask && activeTask.id === task.id) {
        setActiveTask(null);
        setActiveTaskStartTime(null);
        localStorage.removeItem('activeTimer');
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(t('tasks.errorDeleting'));
    }
  };

  const handleStartTask = async (task) => {
    try {
      // Check if task has a project for time tracking
      if (!task.project_id) {
        alert(t('tasks.selectProjectForTimeEntry'));
        return;
      }

      // Set this task as active
      await window.electronAPI.setActiveTask(task.id);
      
      // Save timer data to localStorage
      const timerData = {
        isTracking: true,
        startTime: Date.now(),
        selectedProject: task.project_id,
        description: `Working on: ${task.name}`,
        taskId: task.id
      };
      localStorage.setItem('activeTimer', JSON.stringify(timerData));
      
      setActiveTask(task);
      setActiveTaskStartTime(Date.now());
      loadTasks();
      alert(t('tasks.taskStarted'));
    } catch (error) {
      console.error('Error starting task:', error);
      alert(t('tasks.errorStarting'));
    }
  };

  const handleStopTask = async () => {
    if (!activeTask || !activeTaskStartTime) return;

    try {
      const endTime = Date.now();
      const durationMinutes = Math.max(5, Math.round((endTime - activeTaskStartTime) / 60000 / 5) * 5);

      // Create time entry
      const timeEntry = {
        project_id: activeTask.project_id,
        description: `Completed work on: ${activeTask.name}`,
        start_time: new Date(activeTaskStartTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration: durationMinutes
      };

      await window.electronAPI.addTimeEntry(timeEntry);
      
      // Deactivate task
      await window.electronAPI.setActiveTask(null);
      
      // Clear timer data
      localStorage.removeItem('activeTimer');
      
      setActiveTask(null);
      setActiveTaskStartTime(null);
      loadTasks();
      onRefresh();
      alert(t('tasks.taskStopped'));
    } catch (error) {
      console.error('Error stopping task:', error);
      alert(t('tasks.errorStopping'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      due_date: '',
      project_id: '',
      allocated_time: ''
    });
    setEditingTask(null);
    setIsCreateFormOpen(false);
  };

  const getTaskStatus = (task) => {
    if (task.is_active) return 'active';
    if (!task.due_date) return 'no-due-date';
    
    const dueDate = parseISO(task.due_date);
    const today = new Date();
    const soon = addDays(today, 3);
    
    if (isBefore(dueDate, today)) return 'overdue';
    if (isBefore(dueDate, soon)) return 'due-soon';
    return 'normal';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return t('tasks.active');
      case 'overdue': return t('tasks.overdue');
      case 'due-soon': return t('tasks.dueSoon');
      default: return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'overdue': return '#f44336';
      case 'due-soon': return '#ff9800';
      default: return '#666';
    }
  };

  const formatElapsedTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval;
    if (activeTask && activeTaskStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - activeTaskStartTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTask, activeTaskStartTime]);

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>{t('tasks.title')}</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setIsCreateFormOpen(true)}
        >
          {t('tasks.createTask')}
        </button>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Active Task Display */}
        {activeTask && (
          <div style={{ 
            marginBottom: '2rem', 
            padding: '1rem', 
            background: '#e8f5e8', 
            borderRadius: '6px',
            border: '1px solid #4CAF50'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#2e7d2e' }}>
                  ⏱️ {activeTask.name}
                </h3>
                <p style={{ margin: '0', color: '#666' }}>
                  {activeTask.project_name} • {formatElapsedTime(elapsedTime)}
                </p>
              </div>
              <button 
                className="btn btn-danger"
                onClick={handleStopTask}
              >
                {t('tasks.stopTask')}
              </button>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {isCreateFormOpen && (
          <div style={{ 
            marginBottom: '2rem', 
            padding: '1rem', 
            background: '#f8f9fa', 
            borderRadius: '6px',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>
              {editingTask ? t('tasks.editTask') : t('tasks.createTask')}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">{t('tasks.taskName')}</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('tasks.taskNamePlaceholder')}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">{t('tasks.dueDate')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">{t('tasks.allocatedTime')}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.allocated_time}
                    onChange={(e) => setFormData({ ...formData, allocated_time: e.target.value })}
                    placeholder={t('tasks.allocatedTimePlaceholder')}
                    min="0"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">{t('tasks.project')}</label>
                <select
                  className="form-control"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">{t('tasks.chooseProject')}</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? t('common.save') : t('common.create')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks List */}
        {tasks.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('tasks.taskName')}</th>
                  <th>{t('tasks.project')}</th>
                  <th>{t('tasks.dueDate')}</th>
                  <th>{t('tasks.allocatedTime')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const status = getTaskStatus(task);
                  return (
                    <tr key={task.id} style={{ 
                      background: task.is_active ? '#f0f8f0' : 'transparent' 
                    }}>
                      <td>
                        <strong>{task.name}</strong>
                        {task.is_active && <span style={{ color: '#4CAF50', marginLeft: '0.5rem' }}>●</span>}
                      </td>
                      <td>
                        {task.project_name ? (
                          <span style={{ 
                            color: task.project_color,
                            fontWeight: 'bold'
                          }}>
                            {task.project_name}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>No project</span>
                        )}
                      </td>
                      <td>
                        {task.due_date ? format(parseISO(task.due_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td>
                        {task.allocated_time > 0 ? `${task.allocated_time} min` : '-'}
                      </td>
                      <td>
                        <span style={{ 
                          color: getStatusColor(status),
                          fontWeight: 'bold'
                        }}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!task.is_active && task.project_id && (
                            <button 
                              className="btn btn-small btn-success"
                              onClick={() => handleStartTask(task)}
                              disabled={activeTask !== null}
                            >
                              {t('tasks.startTask')}
                            </button>
                          )}
                          <button 
                            className="btn btn-small btn-secondary"
                            onClick={() => handleEdit(task)}
                          >
                            {t('common.edit')}
                          </button>
                          <button 
                            className="btn btn-small btn-danger"
                            onClick={() => handleDelete(task)}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>{t('tasks.noTasks')}</p>
            <p>{t('tasks.createFirstTask')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksView;