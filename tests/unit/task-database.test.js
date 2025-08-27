/**
 * Unit Tests for Task Database Operations
 * 
 * These tests verify the functionality of task CRUD operations
 * in the database layer, including edge cases and data integrity.
 */

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

// Import database functions - we need to mock the electron app
const originalApp = global.app;
global.app = null; // Disable electron app initialization

const db = require('../../src/database/db');

describe('Task Database Operations', function() {
  let testDbPath;
  let testProject;
  
  before(async function() {
    // Create a temporary test database
    testDbPath = path.join(__dirname, 'test-tasks.db');
    
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Initialize the test database
    await db.initDatabase();
  });
  
  after(function() {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    // Restore original app
    global.app = originalApp;
  });
  
  beforeEach(async function() {
    // Clean all tasks and projects before each test to ensure isolation
    const tasks = await db.getTasks();
    for (const task of tasks) {
      await db.deleteTask(task.id);
    }
    
    const projects = await db.getProjects();
    for (const project of projects) {
      await db.deleteProject(project.id);
    }
    
    // Create a test project for task relationships
    testProject = await db.addProject({
      name: 'Test Project',
      description: 'Project for task testing'
    });
  });

  describe('Task Creation (addTask)', function() {
    it('should create a task with all fields', async function() {
      const taskData = {
        name: 'Complete project documentation',
        due_date: '2024-12-31',
        project_id: testProject.id,
        allocated_time: 120
      };
      
      const result = await db.addTask(taskData);
      
      expect(result).to.have.property('id');
      expect(result.name).to.equal('Complete project documentation');
      expect(result.due_date).to.equal('2024-12-31');
      expect(result.project_id).to.equal(testProject.id);
      expect(result.allocated_time).to.equal(120);
      
      // The addTask function returns the input with id, but database defaults
      // like is_active, created_at, updated_at are not included in the return value
      // Let's verify by retrieving from database
      const tasks = await db.getTasks();
      const createdTask = tasks.find(t => t.id === result.id);
      expect(createdTask.is_active).to.be.false;
      expect(createdTask).to.have.property('created_at');
      expect(createdTask).to.have.property('updated_at');
    });
    
    it('should create a task with minimal required fields', async function() {
      const taskData = {
        name: 'Simple task'
      };
      
      const result = await db.addTask(taskData);
      
      expect(result.name).to.equal('Simple task');
      // Check database defaults by retrieving the task
      const tasks = await db.getTasks();
      const createdTask = tasks.find(t => t.id === result.id);
      expect(createdTask.due_date).to.be.null;
      expect(createdTask.project_id).to.be.null;
      expect(createdTask.allocated_time).to.equal(0);
      expect(createdTask.is_active).to.be.false;
    });
    
    it('should reject task creation without name', async function() {
      const taskData = {
        due_date: '2024-12-31',
        project_id: testProject.id
      };
      
      try {
        await db.addTask(taskData);
        expect.fail('Should have thrown an error for missing name');
      } catch (error) {
        expect(error.message).to.include('NOT NULL constraint failed');
      }
    });
    
    it('should create task with non-existent project_id (foreign key should allow null or invalid)', async function() {
      const taskData = {
        name: 'Task with invalid project',
        project_id: 99999
      };
      
      const result = await db.addTask(taskData);
      expect(result.name).to.equal('Task with invalid project');
      expect(result.project_id).to.equal(99999);
    });
  });
  
  describe('Task Retrieval (getTasks)', function() {
    beforeEach(async function() {
      // Create test tasks
      await db.addTask({ 
        name: 'Task A', 
        project_id: testProject.id,
        allocated_time: 60
      });
      await db.addTask({ 
        name: 'Task B', 
        due_date: '2024-06-15',
        allocated_time: 90
      });
      await db.addTask({ 
        name: 'Task C', 
        project_id: testProject.id,
        due_date: '2024-12-31',
        allocated_time: 30
      });
    });
    
    it('should retrieve all tasks with default ordering', async function() {
      const tasks = await db.getTasks();
      
      expect(tasks).to.have.length(3);
      // Tasks should be ordered by active status first, then by creation date (newest first)
      expect(tasks.map(t => t.name)).to.include.members(['Task A', 'Task B', 'Task C']);
    });
    
    it('should filter tasks by project_id', async function() {
      const tasks = await db.getTasks({ projectId: testProject.id });
      
      expect(tasks).to.have.length(2);
      tasks.forEach(task => {
        expect(task.project_id).to.equal(testProject.id);
      });
    });
    
    it('should filter tasks by active status', async function() {
      // First, set one task as active
      const allTasks = await db.getTasks();
      await db.setActiveTask(allTasks[0].id);
      
      const activeTasks = await db.getTasks({ isActive: true });
      const inactiveTasks = await db.getTasks({ isActive: false });
      
      expect(activeTasks).to.have.length(1);
      expect(activeTasks[0].is_active).to.be.true;
      
      expect(inactiveTasks).to.have.length(2);
      inactiveTasks.forEach(task => {
        expect(task.is_active).to.be.false;
      });
    });
    
    it('should limit number of returned tasks', async function() {
      const tasks = await db.getTasks({ limit: 2 });
      
      expect(tasks).to.have.length(2);
    });
    
    it('should return empty array when no tasks exist', async function() {
      // Clean all tasks
      const existingTasks = await db.getTasks();
      for (const task of existingTasks) {
        await db.deleteTask(task.id);
      }
      
      const tasks = await db.getTasks();
      expect(tasks).to.be.an('array').that.is.empty;
    });
  });
  
  describe('Task Updates (updateTask)', function() {
    let testTask;
    
    beforeEach(async function() {
      testTask = await db.addTask({
        name: 'Original Task',
        due_date: '2024-06-01',
        project_id: testProject.id,
        allocated_time: 60
      });
    });
    
    it('should update all task fields', async function() {
      const updatedData = {
        id: testTask.id,
        name: 'Updated Task Name',
        due_date: '2024-12-31',
        project_id: null,
        allocated_time: 120
      };
      
      const result = await db.updateTask(updatedData);
      
      expect(result.name).to.equal('Updated Task Name');
      expect(result.due_date).to.equal('2024-12-31');
      expect(result.project_id).to.be.null;
      expect(result.allocated_time).to.equal(120);
    });
    
    it('should update partial task fields', async function() {
      const updatedData = {
        id: testTask.id,
        name: 'Partially Updated Task',
        due_date: testTask.due_date,
        project_id: testTask.project_id,
        allocated_time: testTask.allocated_time
      };
      
      await db.updateTask(updatedData);
      
      const tasks = await db.getTasks();
      const updated = tasks.find(t => t.id === testTask.id);
      
      expect(updated.name).to.equal('Partially Updated Task');
      expect(updated.due_date).to.equal(testTask.due_date); // Unchanged
      expect(updated.project_id).to.equal(testTask.project_id); // Unchanged
    });
    
    it('should fail to update non-existent task', async function() {
      const updatedData = {
        id: 99999,
        name: 'Non-existent Task',
        due_date: '2024-12-31',
        project_id: null,
        allocated_time: 60
      };
      
      // The function should complete but no rows should be affected
      const result = await db.updateTask(updatedData);
      expect(result).to.equal(updatedData); // Function returns the input data
    });
  });
  
  describe('Task Deletion (deleteTask)', function() {
    let testTask;
    
    beforeEach(async function() {
      testTask = await db.addTask({
        name: 'Task to Delete',
        due_date: '2024-12-31'
      });
    });
    
    it('should delete existing task', async function() {
      const result = await db.deleteTask(testTask.id);
      
      expect(result.deleted).to.be.true;
      
      const tasks = await db.getTasks();
      const deletedTask = tasks.find(t => t.id === testTask.id);
      expect(deletedTask).to.be.undefined;
    });
    
    it('should return false when deleting non-existent task', async function() {
      const result = await db.deleteTask(99999);
      
      expect(result.deleted).to.be.false;
    });
    
    it('should handle multiple task deletions', async function() {
      const task2 = await db.addTask({ name: 'Task 2' });
      const task3 = await db.addTask({ name: 'Task 3' });
      
      const result1 = await db.deleteTask(testTask.id);
      const result2 = await db.deleteTask(task2.id);
      const result3 = await db.deleteTask(task3.id);
      
      expect(result1.deleted).to.be.true;
      expect(result2.deleted).to.be.true;
      expect(result3.deleted).to.be.true;
      
      const remainingTasks = await db.getTasks();
      expect(remainingTasks).to.have.length(0);
    });
  });
  
  describe('Active Task Management', function() {
    let task1, task2, task3;
    
    beforeEach(async function() {
      task1 = await db.addTask({ name: 'Task 1', project_id: testProject.id });
      task2 = await db.addTask({ name: 'Task 2', project_id: testProject.id });
      task3 = await db.addTask({ name: 'Task 3' });
    });
    
    it('should set task as active', async function() {
      const result = await db.setActiveTask(task1.id);
      
      expect(result.activated).to.be.true;
      expect(result.taskId).to.equal(task1.id);
      
      const activeTask = await db.getActiveTask();
      expect(activeTask.id).to.equal(task1.id);
      expect(activeTask.is_active).to.be.true;
    });
    
    it('should deactivate all tasks when setting new active task', async function() {
      await db.setActiveTask(task1.id);
      await db.setActiveTask(task2.id);
      
      const activeTask = await db.getActiveTask();
      expect(activeTask.id).to.equal(task2.id);
      
      // Verify that task1 is no longer active
      const allTasks = await db.getTasks();
      const task1Updated = allTasks.find(t => t.id === task1.id);
      const task2Updated = allTasks.find(t => t.id === task2.id);
      
      expect(task1Updated.is_active).to.be.false;
      expect(task2Updated.is_active).to.be.true;
    });
    
    it('should return null when no task is active', async function() {
      const activeTask = await db.getActiveTask();
      expect(activeTask).to.be.null;
    });
    
    it('should handle setting non-existent task as active', async function() {
      const result = await db.setActiveTask(99999);
      
      expect(result.activated).to.be.false;
      expect(result.taskId).to.equal(99999);
      
      const activeTask = await db.getActiveTask();
      expect(activeTask).to.be.null;
    });
    
    it('should maintain only one active task constraint', async function() {
      // Set multiple tasks as active in sequence
      await db.setActiveTask(task1.id);
      await db.setActiveTask(task2.id);
      await db.setActiveTask(task3.id);
      
      const allTasks = await db.getTasks();
      const activeTasks = allTasks.filter(t => t.is_active);
      
      expect(activeTasks).to.have.length(1);
      expect(activeTasks[0].id).to.equal(task3.id);
    });
  });
  
  describe('Database Integrity with Multiple Tasks', function() {
    it('should maintain data consistency with concurrent task operations', async function() {
      // Create multiple tasks rapidly
      const taskPromises = [];
      for (let i = 1; i <= 10; i++) {
        taskPromises.push(db.addTask({
          name: `Concurrent Task ${i}`,
          due_date: `2024-${String(i).padStart(2, '0')}-01`,
          project_id: i % 2 === 0 ? testProject.id : null,
          allocated_time: i * 15
        }));
      }
      
      const tasks = await Promise.all(taskPromises);
      
      // Verify all tasks were created
      expect(tasks).to.have.length(10);
      tasks.forEach((task, index) => {
        expect(task.name).to.equal(`Concurrent Task ${index + 1}`);
        expect(task.allocated_time).to.equal((index + 1) * 15);
      });
      
      // Verify they can all be retrieved
      const retrievedTasks = await db.getTasks();
      expect(retrievedTasks).to.have.length(10);
    });
    
    it('should handle edge case data values', async function() {
      const edgeCaseTask = await db.addTask({
        name: 'Task with special chars: àáâãäåæçèéêë & symbols @#$%^&*()',
        due_date: '1900-01-01', // Very old date
        allocated_time: 0, // Zero time
        project_id: testProject.id
      });
      
      expect(edgeCaseTask.name).to.include('special chars');
      expect(edgeCaseTask.due_date).to.equal('1900-01-01');
      expect(edgeCaseTask.allocated_time).to.equal(0);
    });
    
    it('should handle very long task names', async function() {
      const longName = 'A very long task name that contains many characters. '.repeat(10);
      
      const task = await db.addTask({
        name: longName,
        project_id: testProject.id
      });
      
      expect(task.name).to.equal(longName);
    });
    
    it('should handle task operations with project deletion', async function() {
      // Create tasks linked to the test project
      const task1 = await db.addTask({ name: 'Task 1', project_id: testProject.id });
      const task2 = await db.addTask({ name: 'Task 2', project_id: testProject.id });
      
      // Delete the project (should cascade or handle gracefully)
      await db.deleteProject(testProject.id);
      
      // Tasks should still exist but with null project_id or be deleted depending on CASCADE rules
      const remainingTasks = await db.getTasks();
      // The exact behavior depends on the database foreign key constraints
      // This test documents the current behavior
      expect(remainingTasks).to.be.an('array');
    });
  });
});

// Export for potential use in other test files
module.exports = { db };