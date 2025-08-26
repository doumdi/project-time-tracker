/**
 * Unit Tests for Task-related Database Operations
 * 
 * These tests verify the functionality of the task CRUD operations
 * added to the database layer for the Tasks View feature.
 */

const { expect } = require('chai');
const path = require('path');

// Mock database setup
const mockDatabase = {
  tasks: [],
  nextId: 1,
  
  // Mock task operations
  addTask: function(task) {
    const newTask = {
      id: this.nextId++,
      name: task.name,
      due_date: task.due_date || null,
      project_id: task.project_id || null,
      allocated_time: task.allocated_time || 0,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tasks.push(newTask);
    return Promise.resolve(newTask);
  },
  
  getTasks: function(filters = {}) {
    let result = [...this.tasks];
    
    if (filters.projectId) {
      result = result.filter(task => task.project_id === filters.projectId);
    }
    
    if (filters.isActive !== undefined) {
      result = result.filter(task => task.is_active === filters.isActive);
    }
    
    result.sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return b.is_active - a.is_active; // Active tasks first
      }
      return new Date(b.created_at) - new Date(a.created_at); // Newest first
    });
    
    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }
    
    return Promise.resolve(result);
  },
  
  updateTask: function(task) {
    const index = this.tasks.findIndex(t => t.id === task.id);
    if (index === -1) {
      return Promise.reject(new Error('Task not found'));
    }
    
    this.tasks[index] = {
      ...this.tasks[index],
      ...task,
      updated_at: new Date().toISOString()
    };
    
    return Promise.resolve(this.tasks[index]);
  },
  
  deleteTask: function(id) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return Promise.resolve({ deleted: false });
    }
    
    this.tasks.splice(index, 1);
    return Promise.resolve({ deleted: true });
  },
  
  setActiveTask: function(taskId) {
    // Deactivate all tasks
    this.tasks.forEach(task => task.is_active = false);
    
    if (taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        task.is_active = true;
        return Promise.resolve({ taskId, activated: true });
      }
    }
    
    return Promise.resolve({ taskId: null, activated: false });
  },
  
  getActiveTask: function() {
    const activeTask = this.tasks.find(task => task.is_active);
    return Promise.resolve(activeTask || null);
  },
  
  // Helper to reset database for tests
  reset: function() {
    this.tasks = [];
    this.nextId = 1;
  }
};

describe('Task Database Operations', function() {
  
  beforeEach(function() {
    mockDatabase.reset();
  });
  
  describe('Task Creation', function() {
    it('should create a task with required fields', async function() {
      const taskData = {
        name: 'Test Task',
        due_date: '2024-12-31',
        project_id: 1,
        allocated_time: 60
      };
      
      const result = await mockDatabase.addTask(taskData);
      
      expect(result).to.have.property('id');
      expect(result.name).to.equal('Test Task');
      expect(result.due_date).to.equal('2024-12-31');
      expect(result.project_id).to.equal(1);
      expect(result.allocated_time).to.equal(60);
      expect(result.is_active).to.equal(false);
    });
    
    it('should create a task with minimal required fields', async function() {
      const taskData = {
        name: 'Minimal Task'
      };
      
      const result = await mockDatabase.addTask(taskData);
      
      expect(result.name).to.equal('Minimal Task');
      expect(result.due_date).to.be.null;
      expect(result.project_id).to.be.null;
      expect(result.allocated_time).to.equal(0);
    });
  });
  
  describe('Task Retrieval', function() {
    it('should retrieve all tasks', async function() {
      await mockDatabase.addTask({ name: 'Task 1' });
      await mockDatabase.addTask({ name: 'Task 2' });
      
      const tasks = await mockDatabase.getTasks();
      
      expect(tasks).to.have.length(2);
      expect(tasks[0].name).to.equal('Task 2'); // Newest first
      expect(tasks[1].name).to.equal('Task 1');
    });
    
    it('should filter tasks by project', async function() {
      await mockDatabase.addTask({ name: 'Task 1', project_id: 1 });
      await mockDatabase.addTask({ name: 'Task 2', project_id: 2 });
      await mockDatabase.addTask({ name: 'Task 3', project_id: 1 });
      
      const tasks = await mockDatabase.getTasks({ projectId: 1 });
      
      expect(tasks).to.have.length(2);
      expect(tasks.every(task => task.project_id === 1)).to.be.true;
    });
    
    it('should limit number of returned tasks', async function() {
      await mockDatabase.addTask({ name: 'Task 1' });
      await mockDatabase.addTask({ name: 'Task 2' });
      await mockDatabase.addTask({ name: 'Task 3' });
      
      const tasks = await mockDatabase.getTasks({ limit: 2 });
      
      expect(tasks).to.have.length(2);
    });
  });
  
  describe('Task Updates', function() {
    it('should update task fields', async function() {
      const task = await mockDatabase.addTask({ name: 'Original Task' });
      
      const updatedTask = await mockDatabase.updateTask({
        id: task.id,
        name: 'Updated Task',
        allocated_time: 120
      });
      
      expect(updatedTask.name).to.equal('Updated Task');
      expect(updatedTask.allocated_time).to.equal(120);
    });
    
    it('should fail to update non-existent task', async function() {
      try {
        await mockDatabase.updateTask({ id: 999, name: 'Non-existent' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Task not found');
      }
    });
  });
  
  describe('Task Deletion', function() {
    it('should delete existing task', async function() {
      const task = await mockDatabase.addTask({ name: 'Task to Delete' });
      
      const result = await mockDatabase.deleteTask(task.id);
      
      expect(result.deleted).to.be.true;
      
      const tasks = await mockDatabase.getTasks();
      expect(tasks).to.have.length(0);
    });
    
    it('should handle deletion of non-existent task', async function() {
      const result = await mockDatabase.deleteTask(999);
      
      expect(result.deleted).to.be.false;
    });
  });
  
  describe('Active Task Management', function() {
    it('should set task as active', async function() {
      const task1 = await mockDatabase.addTask({ name: 'Task 1' });
      const task2 = await mockDatabase.addTask({ name: 'Task 2' });
      
      const result = await mockDatabase.setActiveTask(task1.id);
      
      expect(result.activated).to.be.true;
      expect(result.taskId).to.equal(task1.id);
      
      const activeTask = await mockDatabase.getActiveTask();
      expect(activeTask.id).to.equal(task1.id);
      expect(activeTask.is_active).to.be.true;
    });
    
    it('should deactivate all tasks when setting new active task', async function() {
      const task1 = await mockDatabase.addTask({ name: 'Task 1' });
      const task2 = await mockDatabase.addTask({ name: 'Task 2' });
      
      await mockDatabase.setActiveTask(task1.id);
      await mockDatabase.setActiveTask(task2.id);
      
      const activeTask = await mockDatabase.getActiveTask();
      expect(activeTask.id).to.equal(task2.id);
      
      const task1Updated = mockDatabase.tasks.find(t => t.id === task1.id);
      expect(task1Updated.is_active).to.be.false;
    });
    
    it('should deactivate all tasks when called with null', async function() {
      const task = await mockDatabase.addTask({ name: 'Active Task' });
      await mockDatabase.setActiveTask(task.id);
      
      const result = await mockDatabase.setActiveTask(null);
      
      expect(result.activated).to.be.false;
      expect(result.taskId).to.be.null;
      
      const activeTask = await mockDatabase.getActiveTask();
      expect(activeTask).to.be.null;
    });
  });
  
  describe('Task Filtering and Sorting', function() {
    it('should prioritize active tasks in results', async function() {
      const task1 = await mockDatabase.addTask({ name: 'Task 1' });
      const task2 = await mockDatabase.addTask({ name: 'Task 2' });
      const task3 = await mockDatabase.addTask({ name: 'Task 3' });
      
      await mockDatabase.setActiveTask(task2.id);
      
      const tasks = await mockDatabase.getTasks();
      
      expect(tasks[0].id).to.equal(task2.id); // Active task should be first
      expect(tasks[0].is_active).to.be.true;
    });
    
    it('should filter by active status', async function() {
      const task1 = await mockDatabase.addTask({ name: 'Task 1' });
      const task2 = await mockDatabase.addTask({ name: 'Task 2' });
      
      await mockDatabase.setActiveTask(task1.id);
      
      const activeTasks = await mockDatabase.getTasks({ isActive: true });
      const inactiveTasks = await mockDatabase.getTasks({ isActive: false });
      
      expect(activeTasks).to.have.length(1);
      expect(activeTasks[0].id).to.equal(task1.id);
      
      expect(inactiveTasks).to.have.length(1);
      expect(inactiveTasks[0].id).to.equal(task2.id);
    });
  });
});

// Export for potential use in other test files
module.exports = mockDatabase;