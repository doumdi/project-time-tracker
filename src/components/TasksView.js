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
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [subtasks, setSubtasks] = useState({});
  const [addingSubtaskFor, setAddingSubtaskFor] = useState(null);
  const [subtaskName, setSubtaskName] = useState('');

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
      alert(t('tasks.taskNameRequired'));
      return;
    }

    if (!formData.project_id) {
      alert(t('tasks.selectProjectForTimeEntry'));
      return;
    }

    try {
      const taskData = {
        name: formData.name.trim(),
        due_date: formData.due_date || null,
        project_id: parseInt(formData.project_id),
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

  // Subtask functions
  const toggleTaskExpand = async (taskId) => {
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

  const handleAddSubtask = async (taskId) => {
    if (!subtaskName.trim()) {
      alert(t('tasks.taskNameRequired'));
      return;
    }

    try {
      await window.electronAPI.addSubTask({
        name: subtaskName.trim(),
        parent_task_id: taskId,
        is_completed: false
      });
      
      setSubtaskName('');
      setAddingSubtaskFor(null);
      await loadSubtasks(taskId);
      alert(t('tasks.subtaskCreated'));
    } catch (error) {
      console.error('Error adding subtask:', error);
      alert(t('tasks.errorCreatingSubtask'));
    }
  };

  const handleToggleSubtaskComplete = async (subtask, taskId) => {
    try {
      await window.electronAPI.updateSubTask({
        id: subtask.id,
        name: subtask.name,
        is_completed: !subtask.is_completed
      });
      
      await loadSubtasks(taskId);
      alert(t('tasks.subtaskUpdated'));
    } catch (error) {
      console.error('Error updating subtask:', error);
      alert(t('tasks.errorUpdatingSubtask'));
    }
  };

  const handleDeleteSubtask = async (subtaskId, taskId) => {
    if (!window.confirm(t('tasks.confirmDeleteSubtask'))) return;

    try {
      await window.electronAPI.deleteSubTask(subtaskId);
      await loadSubtasks(taskId);
      alert(t('tasks.subtaskDeleted'));
    } catch (error) {
      console.error('Error deleting subtask:', error);
      alert(t('tasks.errorDeletingSubtask'));
    }
  };

  // Filter tasks based on search
  const filteredTasks = tasks.filter(task => {
    if (!searchFilter.trim()) return true;
    return task.name.toLowerCase().includes(searchFilter.toLowerCase());
  });

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
            padding: '1.5rem', 
            background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)', 
            borderRadius: '12px',
            border: '2px solid #4CAF50',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#2e7d2e', fontSize: '1.3rem' }}>
                  ⏱️ {activeTask.name}
                </h3>
                <p style={{ margin: '0', color: '#666', fontSize: '1rem' }}>
                  {activeTask.project_name} • {formatElapsedTime(elapsedTime)}
                </p>
              </div>
              <button 
                className="btn btn-danger btn-large"
                onClick={handleStopTask}
                style={{ minWidth: '120px' }}
              >
                ⏹️ {t('tasks.stopTask')}
              </button>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {isCreateFormOpen && (
          <div style={{ 
            marginBottom: '2rem', 
            padding: '2rem', 
            background: 'white', 
            borderRadius: '12px',
            border: '1px solid #e1e5e9',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem', color: '#333' }}>
              {editingTask ? t('tasks.editTask') : t('tasks.createTask')}
            </h3>
            <form onSubmit={handleSubmit}>
              {/* Task Name - Full Width */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '1rem', fontWeight: '600' }}>
                  {t('tasks.taskName')} <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('tasks.taskNamePlaceholder')}
                  required
                  style={{ 
                    fontSize: '1.1rem', 
                    padding: '1rem',
                    minHeight: '50px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px'
                  }}
                />
              </div>

              {/* Two Column Layout for Due Date and Allocated Time */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '1.5rem', 
                marginBottom: '1.5rem' 
              }}>
                <div>
                  <label className="form-label" style={{ fontSize: '1rem', fontWeight: '600' }}>
                    {t('tasks.dueDate')}
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={{ 
                      fontSize: '1rem', 
                      padding: '1rem',
                      minHeight: '50px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px'
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '1rem', fontWeight: '600' }}>
                    {t('tasks.allocatedTime')}
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.allocated_time}
                    onChange={(e) => setFormData({ ...formData, allocated_time: e.target.value })}
                    placeholder={t('tasks.allocatedTimePlaceholder')}
                    min="0"
                    style={{ 
                      fontSize: '1rem', 
                      padding: '1rem',
                      minHeight: '50px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              </div>

              {/* Project Selection - Full Width */}
              <div style={{ marginBottom: '2rem' }}>
                <label className="form-label" style={{ fontSize: '1rem', fontWeight: '600' }}>
                  {t('tasks.project')} <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  required
                  style={{ 
                    fontSize: '1rem', 
                    padding: '1rem',
                    minHeight: '50px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px'
                  }}
                >
                  <option value="">{t('tasks.chooseProject')}</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-large"
                  style={{ minWidth: '120px' }}
                >
                  ✅ {editingTask ? t('common.save') : t('common.create')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-large" 
                  onClick={resetForm}
                  style={{ minWidth: '120px' }}
                >
                  ❌ {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Filter */}
        {tasks.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              className="form-control"
              placeholder={t('tasks.searchTasks')}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                fontSize: '1rem',
                padding: '0.75rem 1rem',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                maxWidth: '500px'
              }}
            />
            <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
              {searchFilter ? `${filteredTasks.length} ${t('common.results')}` : t('tasks.showingAllTasks')}
            </small>
          </div>
        )}

        {/* Tasks List */}
        {filteredTasks.length > 0 ? (
          <div style={{ 
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e1e5e9'
          }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <th style={{ fontSize: '0.9rem', fontWeight: '600', padding: '1.2rem 1rem' }}>
                    {t('tasks.taskName')}
                  </th>
                  <th style={{ fontSize: '0.9rem', fontWeight: '600', padding: '1.2rem 1rem' }}>
                    {t('tasks.project')}
                  </th>
                  <th style={{ fontSize: '0.9rem', fontWeight: '600', padding: '1.2rem 1rem' }}>
                    {t('tasks.dueDate')}
                  </th>
                  <th style={{ fontSize: '0.9rem', fontWeight: '600', padding: '1.2rem 1rem' }}>
                    {t('tasks.allocatedTime')}
                  </th>
                  <th style={{ fontSize: '0.9rem', fontWeight: '600', padding: '1.2rem 1rem' }}>
                    {t('tasks.cumulatedTime')}
                  </th>
                  <th style={{ fontSize: '0.9rem', fontWeight: '600', padding: '1.2rem 1rem' }}>
                    {t('common.status')}
                  </th>
                  <th style={{ fontSize: '0.9rem', fontWeight: '600', padding: '1.2rem 1rem' }}>
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const status = getTaskStatus(task);
                  const isExpanded = expandedTasks.has(task.id);
                  const taskSubtasks = subtasks[task.id] || [];
                  
                  return (
                    <React.Fragment key={task.id}>
                      <tr style={{ 
                        background: task.is_active ? 'linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%)' : 'transparent',
                        borderLeft: task.is_active ? '4px solid #4CAF50' : '4px solid transparent'
                      }}>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => toggleTaskExpand(task.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '0',
                                marginRight: '0.3rem'
                              }}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <strong style={{ fontSize: '1rem' }}>{task.name}</strong>
                            {task.is_active && (
                              <span style={{ 
                                background: '#4CAF50',
                                color: 'white',
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '12px',
                                fontWeight: 'bold'
                              }}>
                                {t('tasks.active')}
                              </span>
                            )}
                            {taskSubtasks.length > 0 && (
                              <span style={{
                                background: '#667eea',
                                color: 'white',
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '12px',
                                fontWeight: 'bold'
                              }}>
                                {taskSubtasks.filter(s => s.is_completed).length}/{taskSubtasks.length} ✓
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          {task.project_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div 
                                style={{ 
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: task.project_color || '#666'
                                }}
                              />
                              <span style={{ 
                                fontWeight: '500',
                                fontSize: '0.95rem'
                              }}>
                                {task.project_name}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic' }}>
                              {t('tasks.noProject')}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', fontSize: '0.95rem' }}>
                          {task.due_date ? format(parseISO(task.due_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', fontSize: '0.95rem' }}>
                          {task.allocated_time > 0 ? `${task.allocated_time} min` : '-'}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', fontSize: '0.95rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '500' }}>
                              {task.cumulated_time > 0 ? `${Math.floor(task.cumulated_time / 60)}h ${task.cumulated_time % 60}m` : '0 min'}
                            </span>
                            {task.allocated_time > 0 && (
                              <div style={{
                                width: '60px',
                                height: '8px',
                                background: '#e1e5e9',
                                borderRadius: '4px',
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${Math.min(100, (task.cumulated_time / task.allocated_time) * 100)}%`,
                                  height: '100%',
                                  background: task.cumulated_time > task.allocated_time ? '#f44336' : 
                                            task.cumulated_time > task.allocated_time * 0.8 ? '#ff9800' : '#4CAF50',
                                  borderRadius: '4px'
                                }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <span style={{ 
                            color: getStatusColor(status),
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            background: status === 'overdue' ? 'rgba(244, 67, 54, 0.1)' : 
                                       status === 'due-soon' ? 'rgba(255, 152, 0, 0.1)' :
                                       status === 'active' ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '12px',
                            border: status !== 'normal' && status !== 'no-due-date' ? 
                                   `1px solid ${getStatusColor(status)}40` : 'none'
                          }}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {!task.is_active && task.project_id && (
                              <button 
                                className="btn btn-small btn-success"
                                onClick={() => handleStartTask(task)}
                                disabled={activeTask !== null}
                                style={{ 
                                  fontSize: '0.8rem',
                                  padding: '0.4rem 0.8rem'
                                }}
                              >
                                ▶️ {t('tasks.startTask')}
                              </button>
                            )}
                            <button 
                              className="btn btn-small btn-secondary"
                              onClick={() => handleEdit(task)}
                              style={{ 
                                fontSize: '0.8rem',
                                padding: '0.4rem 0.8rem'
                              }}
                            >
                              ✏️ {t('common.edit')}
                            </button>
                            <button 
                              className="btn btn-small btn-danger"
                              onClick={() => handleDelete(task)}
                              style={{ 
                                fontSize: '0.8rem',
                                padding: '0.4rem 0.8rem'
                              }}
                            >
                              🗑️ {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Subtasks Section */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" style={{ padding: '0', background: '#f8f9fa' }}>
                            <div style={{ padding: '1.5rem 2rem' }}>
                              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#667eea' }}>
                                📋 {t('tasks.subtasks')}
                              </h4>
                              
                              {/* Subtasks List */}
                              {taskSubtasks.length > 0 ? (
                                <div style={{ marginBottom: '1rem' }}>
                                  {taskSubtasks.map(subtask => (
                                    <div 
                                      key={subtask.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: 'white',
                                        borderRadius: '8px',
                                        marginBottom: '0.5rem',
                                        border: '1px solid #e1e5e9'
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={subtask.is_completed}
                                        onChange={() => handleToggleSubtaskComplete(subtask, task.id)}
                                        style={{
                                          width: '18px',
                                          height: '18px',
                                          cursor: 'pointer'
                                        }}
                                      />
                                      <span style={{
                                        flex: 1,
                                        textDecoration: subtask.is_completed ? 'line-through' : 'none',
                                        color: subtask.is_completed ? '#999' : '#333',
                                        fontSize: '0.95rem'
                                      }}>
                                        {subtask.name}
                                      </span>
                                      <button
                                        className="btn btn-small btn-danger"
                                        onClick={() => handleDeleteSubtask(subtask.id, task.id)}
                                        style={{
                                          fontSize: '0.75rem',
                                          padding: '0.3rem 0.6rem'
                                        }}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                  {t('tasks.noSubtasks')}
                                </p>
                              )}
                              
                              {/* Add Subtask Form */}
                              {addingSubtaskFor === task.id ? (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder={t('tasks.subtaskNamePlaceholder')}
                                    value={subtaskName}
                                    onChange={(e) => setSubtaskName(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleAddSubtask(task.id);
                                      }
                                    }}
                                    autoFocus
                                    style={{
                                      fontSize: '0.9rem',
                                      padding: '0.5rem',
                                      flex: 1
                                    }}
                                  />
                                  <button
                                    className="btn btn-small btn-primary"
                                    onClick={() => handleAddSubtask(task.id)}
                                    style={{
                                      fontSize: '0.8rem',
                                      padding: '0.5rem 1rem'
                                    }}
                                  >
                                    ✅ {t('common.add')}
                                  </button>
                                  <button
                                    className="btn btn-small btn-secondary"
                                    onClick={() => {
                                      setAddingSubtaskFor(null);
                                      setSubtaskName('');
                                    }}
                                    style={{
                                      fontSize: '0.8rem',
                                      padding: '0.5rem 1rem'
                                    }}
                                  >
                                    ❌ {t('common.cancel')}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn btn-small btn-primary"
                                  onClick={() => setAddingSubtaskFor(task.id)}
                                  style={{
                                    fontSize: '0.85rem',
                                    padding: '0.5rem 1rem'
                                  }}
                                >
                                  ➕ {t('tasks.addSubtask')}
                                </button>
                              )}
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
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            background: 'white',
            borderRadius: '12px',
            border: '2px dashed #e1e5e9',
            color: '#666'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: '#333' }}>
              {t('tasks.noTasks')}
            </h3>
            <p style={{ margin: '0', fontSize: '1.1rem', lineHeight: '1.5' }}>
              {t('tasks.createFirstTask')}
            </p>
            <button 
              className="btn btn-primary btn-large"
              onClick={() => setIsCreateFormOpen(true)}
              style={{ marginTop: '1.5rem', minWidth: '150px' }}
            >
              ✅ {t('tasks.createTask')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksView;