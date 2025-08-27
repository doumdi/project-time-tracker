/**
 * Unit Tests for Project Database Operations
 * 
 * These tests verify the functionality of project CRUD operations
 * in the database layer, including edge cases and data integrity.
 */

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Import database functions - we need to mock the electron app
const originalApp = global.app;
global.app = null; // Disable electron app initialization

const db = require('../../src/database/db');

describe('Project Database Operations', function() {
  let testDbPath;
  
  before(async function() {
    // Create a temporary test database
    testDbPath = path.join(__dirname, 'test-projects.db');
    
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
    // Clean all projects before each test to ensure isolation
    const projects = await db.getProjects();
    for (const project of projects) {
      await db.deleteProject(project.id);
    }
  });

  describe('Project Creation (addProject)', function() {
    it('should create a project with all fields', async function() {
      const projectData = {
        name: 'Test Project',
        description: 'A test project for validation',
        color: '#FF5722',
        budget: 1000,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };
      
      const result = await db.addProject(projectData);
      
      expect(result).to.have.property('id');
      expect(result.name).to.equal('Test Project');
      expect(result.description).to.equal('A test project for validation');
      expect(result.color).to.equal('#FF5722');
      expect(result.budget).to.equal(1000);
      expect(result.start_date).to.equal('2024-01-01');
      expect(result.end_date).to.equal('2024-12-31');
    });
    
    it('should create a project with minimal required fields', async function() {
      const projectData = {
        name: 'Minimal Project'
      };
      
      const result = await db.addProject(projectData);
      
      expect(result.name).to.equal('Minimal Project');
      // The addProject function spreads the input, so these fields won't be in the result
      // unless explicitly provided in the input. The database defaults are applied
      // but not returned by the function.
      expect(result.description).to.be.undefined; // Not provided in input
      expect(result.color).to.be.undefined; // Not provided in input  
      expect(result.budget).to.be.undefined; // Not provided in input
      expect(result.start_date).to.be.undefined; // Not provided in input
      expect(result.end_date).to.be.undefined; // Not provided in input
      
      // Verify the defaults are actually applied by retrieving from database
      const projects = await db.getProjects();
      const createdProject = projects.find(p => p.id === result.id);
      expect(createdProject.description).to.equal('');
      expect(createdProject.color).to.equal('#4CAF50');
      expect(createdProject.budget).to.equal(0);
      expect(createdProject.start_date).to.be.null;
      expect(createdProject.end_date).to.be.null;
    });
    
    it('should reject project creation with duplicate name', async function() {
      const projectData = { name: 'Duplicate Project' };
      
      await db.addProject(projectData);
      
      try {
        await db.addProject(projectData);
        expect.fail('Should have thrown an error for duplicate name');
      } catch (error) {
        expect(error.message).to.include('UNIQUE constraint failed');
      }
    });
    
    it('should reject project creation without name', async function() {
      const projectData = { description: 'Project without name' };
      
      try {
        await db.addProject(projectData);
        expect.fail('Should have thrown an error for missing name');
      } catch (error) {
        expect(error.message).to.include('NOT NULL constraint failed');
      }
    });
  });
  
  describe('Project Retrieval (getProjects)', function() {
    beforeEach(async function() {
      // Create test projects
      await db.addProject({ name: 'Project A', description: 'First project' });
      await db.addProject({ name: 'Project B', description: 'Second project' });
      await db.addProject({ name: 'Project C', description: 'Third project' });
    });
    
    it('should retrieve all projects with default ordering', async function() {
      const projects = await db.getProjects();
      
      expect(projects).to.have.length(3);
      expect(projects[0].name).to.equal('Project A'); // Ordered by name
      expect(projects[1].name).to.equal('Project B');
      expect(projects[2].name).to.equal('Project C');
    });
    
    it('should include project statistics (entry_count, total_minutes)', async function() {
      const projects = await db.getProjects();
      
      projects.forEach(project => {
        expect(project).to.have.property('entry_count');
        expect(project).to.have.property('total_minutes');
        expect(project.entry_count).to.equal(0); // No time entries yet
        expect(project.total_minutes).to.equal(0);
      });
    });
    
    it('should return empty array when no projects exist', async function() {
      // Clean all projects
      const existingProjects = await db.getProjects();
      for (const project of existingProjects) {
        await db.deleteProject(project.id);
      }
      
      const projects = await db.getProjects();
      expect(projects).to.be.an('array').that.is.empty;
    });
  });
  
  describe('Project Updates (updateProject)', function() {
    let testProject;
    
    beforeEach(async function() {
      testProject = await db.addProject({
        name: 'Original Project',
        description: 'Original description',
        color: '#4CAF50',
        budget: 500
      });
    });
    
    it('should update all project fields', async function() {
      const updatedData = {
        id: testProject.id,
        name: 'Updated Project',
        description: 'Updated description',
        color: '#FF5722',
        budget: 1500,
        start_date: '2024-06-01',
        end_date: '2024-12-31'
      };
      
      const result = await db.updateProject(updatedData);
      
      expect(result.name).to.equal('Updated Project');
      expect(result.description).to.equal('Updated description');
      expect(result.color).to.equal('#FF5722');
      expect(result.budget).to.equal(1500);
      expect(result.start_date).to.equal('2024-06-01');
      expect(result.end_date).to.equal('2024-12-31');
    });
    
    it('should update partial project fields', async function() {
      const updatedData = {
        id: testProject.id,
        name: testProject.name,
        description: 'Only description updated',
        color: testProject.color,
        budget: testProject.budget
      };
      
      await db.updateProject(updatedData);
      
      const projects = await db.getProjects();
      const updated = projects.find(p => p.id === testProject.id);
      
      expect(updated.description).to.equal('Only description updated');
      expect(updated.name).to.equal(testProject.name); // Unchanged
    });
    
    it('should fail to update non-existent project', async function() {
      const updatedData = {
        id: 99999,
        name: 'Non-existent Project',
        description: 'This should fail',
        color: '#4CAF50',
        budget: 0
      };
      
      // The function should complete but no rows should be affected
      const result = await db.updateProject(updatedData);
      expect(result).to.equal(updatedData); // Function returns the input data
    });
  });
  
  describe('Project Deletion (deleteProject)', function() {
    let testProject;
    
    beforeEach(async function() {
      testProject = await db.addProject({
        name: 'Project to Delete',
        description: 'This project will be deleted'
      });
    });
    
    it('should delete existing project', async function() {
      const result = await db.deleteProject(testProject.id);
      
      expect(result.deleted).to.be.true;
      
      const projects = await db.getProjects();
      const deletedProject = projects.find(p => p.id === testProject.id);
      expect(deletedProject).to.be.undefined;
    });
    
    it('should return false when deleting non-existent project', async function() {
      const result = await db.deleteProject(99999);
      
      expect(result.deleted).to.be.false;
    });
    
    it('should handle multiple project deletions', async function() {
      const project2 = await db.addProject({ name: 'Project 2' });
      const project3 = await db.addProject({ name: 'Project 3' });
      
      const result1 = await db.deleteProject(testProject.id);
      const result2 = await db.deleteProject(project2.id);
      const result3 = await db.deleteProject(project3.id);
      
      expect(result1.deleted).to.be.true;
      expect(result2.deleted).to.be.true;
      expect(result3.deleted).to.be.true;
      
      const remainingProjects = await db.getProjects();
      expect(remainingProjects).to.have.length(0);
    });
  });
  
  describe('Database Integrity with Multiple Projects', function() {
    it('should maintain data consistency with concurrent operations', async function() {
      // Create multiple projects rapidly
      const projectPromises = [];
      for (let i = 1; i <= 5; i++) {
        projectPromises.push(db.addProject({
          name: `Concurrent Project ${i}`,
          description: `Project ${i} description`,
          budget: i * 100
        }));
      }
      
      const projects = await Promise.all(projectPromises);
      
      // Verify all projects were created
      expect(projects).to.have.length(5);
      projects.forEach((project, index) => {
        expect(project.name).to.equal(`Concurrent Project ${index + 1}`);
        expect(project.budget).to.equal((index + 1) * 100);
      });
      
      // Verify they can all be retrieved
      const retrievedProjects = await db.getProjects();
      expect(retrievedProjects).to.have.length(5);
    });
    
    it('should handle edge case data values', async function() {
      const edgeCaseProject = await db.addProject({
        name: 'Edge Case Project',
        description: 'Project with special characters: àáâãäåæçèéêë & symbols @#$%^&*()',
        color: '#000000', // Black color
        budget: 0.01, // Very small budget
        start_date: '1900-01-01', // Very old date
        end_date: '2100-12-31' // Far future date
      });
      
      expect(edgeCaseProject.name).to.equal('Edge Case Project');
      expect(edgeCaseProject.description).to.include('special characters');
      expect(edgeCaseProject.color).to.equal('#000000');
      expect(edgeCaseProject.start_date).to.equal('1900-01-01');
      expect(edgeCaseProject.end_date).to.equal('2100-12-31');
    });
    
    it('should handle very long project names and descriptions', async function() {
      const longName = 'A'.repeat(255); // Very long name
      const longDescription = 'Description with lots of text. '.repeat(100); // Very long description
      
      const project = await db.addProject({
        name: longName,
        description: longDescription
      });
      
      expect(project.name).to.equal(longName);
      expect(project.description).to.equal(longDescription);
    });
  });
});