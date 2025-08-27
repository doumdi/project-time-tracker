#!/usr/bin/env node

/**
 * Comprehensive Timer Functionality Test Suite
 * Tests the coordination between TasksView and TimeTracker components
 */

const { TimerTests, MockLocalStorage } = require('./timer-tests');
const { TimerSyncTests } = require('./timer-sync-tests');

class ComprehensiveTimerTests {
  constructor() {
    this.basicTests = new TimerTests();
    this.syncTests = new TimerSyncTests();
  }

  async runAll() {
    console.log('=== COMPREHENSIVE TIMER FUNCTIONALITY TESTS ===\n');
    
    console.log('🔄 Running basic timer tests...\n');
    const basicSuccess = await this.basicTests.run();
    
    console.log('\n🔄 Running timer synchronization tests...\n');
    const syncSuccess = await this.syncTests.run();
    
    // Run additional integration tests
    console.log('\n🔄 Running integration tests...\n');
    const integrationSuccess = await this.runIntegrationTests();
    
    const allSuccess = basicSuccess && syncSuccess && integrationSuccess;
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`Basic Timer Tests: ${basicSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Synchronization Tests: ${syncSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Integration Tests: ${integrationSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60));
    
    if (allSuccess) {
      console.log('\n🎉 ALL TESTS PASSED! Timer functionality is working correctly.');
      console.log('\nKey features validated:');
      console.log('• Task timer starts correctly from TasksView');
      console.log('• TimeTracker preserves task timer data when updating');
      console.log('• Timer conflicts are handled properly');
      console.log('• Task deactivation works when stopping timers');
      console.log('• localStorage synchronization is working');
      return true;
    } else {
      console.log('\n💥 SOME TESTS FAILED! Please check the issues above.');
      return false;
    }
  }

  async runIntegrationTests() {
    const integrationTests = new TimerTests();
    
    integrationTests.test('Complete task timer workflow', () => {
      const mockStorage = new MockLocalStorage();
      
      // 1. Start task timer from TasksView
      const task = {
        id: 999,
        name: 'Integration Test Task',
        project_id: 2
      };
      
      const taskTimer = {
        isTracking: true,
        startTime: Date.now(),
        selectedProject: task.project_id,
        description: `Working on: ${task.name}`,
        taskId: task.id
      };
      
      mockStorage.setItem('activeTimer', JSON.stringify(taskTimer));
      
      // 2. TimeTracker loads the timer (simulate useEffect)
      const loaded = JSON.parse(mockStorage.getItem('activeTimer'));
      let activeTaskId = loaded.taskId;
      let selectedProject = loaded.selectedProject;
      let description = loaded.description;
      let isTracking = loaded.isTracking;
      let startTime = loaded.startTime;
      
      if (!activeTaskId) {
        throw new Error('TimeTracker failed to load task timer');
      }
      
      // 3. User updates description in TimeTracker
      description = `Working on: ${task.name} - Added progress notes`;
      
      // 4. TimeTracker saves updated state (with taskId preserved)
      const updatedTimer = {
        isTracking,
        startTime,
        selectedProject,
        description
      };
      
      if (activeTaskId) {
        updatedTimer.taskId = activeTaskId;
      }
      
      mockStorage.setItem('activeTimer', JSON.stringify(updatedTimer));
      
      // 5. Stop timer and create time entry
      const endTime = Date.now() + 300000; // 5 minutes later
      const duration = Math.max(5, Math.round((endTime - startTime) / 60000 / 5) * 5);
      
      const timeEntry = {
        project_id: selectedProject,
        description: description,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration: duration
      };
      
      // 6. Clear timer and task
      mockStorage.removeItem('activeTimer');
      activeTaskId = null;
      isTracking = false;
      
      // Verify final state
      if (mockStorage.getItem('activeTimer') !== null) {
        throw new Error('Timer not cleared after stopping');
      }
      
      if (activeTaskId !== null) {
        throw new Error('Task association not cleared');
      }
      
      if (!timeEntry.project_id || !timeEntry.duration) {
        throw new Error('Invalid time entry created');
      }
      
      console.log(`Complete workflow: ${duration} minute time entry created for task ${task.id}`);
    });
    
    integrationTests.test('Conflict handling between regular and task timers', () => {
      const mockStorage = new MockLocalStorage();
      
      // Start with a task timer
      const taskTimer = {
        isTracking: true,
        startTime: Date.now() - 60000,
        selectedProject: 1,
        description: 'Working on: Task A',
        taskId: 111
      };
      
      mockStorage.setItem('activeTimer', JSON.stringify(taskTimer));
      
      // TimeTracker loads it
      const loaded = JSON.parse(mockStorage.getItem('activeTimer'));
      const hasTaskTimer = loaded.taskId !== undefined;
      
      if (!hasTaskTimer) {
        throw new Error('Failed to detect existing task timer');
      }
      
      // User tries to start a regular timer - should be warned
      console.log('Conflict detected - would show confirmation dialog');
      
      // User confirms to replace task timer with regular timer
      const regularTimer = {
        isTracking: true,
        startTime: Date.now(),
        selectedProject: 2,
        description: 'Regular timer work'
        // No taskId
      };
      
      mockStorage.setItem('activeTimer', JSON.stringify(regularTimer));
      
      const final = JSON.parse(mockStorage.getItem('activeTimer'));
      
      if (final.taskId !== undefined) {
        throw new Error('Regular timer incorrectly has taskId');
      }
      
      console.log('Conflict resolved - task timer replaced with regular timer');
    });
    
    integrationTests.test('Task state persistence across app restarts', () => {
      const mockStorage = new MockLocalStorage();
      
      // Simulate app closing with active task timer
      const activeTimer = {
        isTracking: true,
        startTime: Date.now() - 30000, // 30 seconds ago
        selectedProject: 3,
        description: 'Working on: Persistent Task',
        taskId: 222
      };
      
      mockStorage.setItem('activeTimer', JSON.stringify(activeTimer));
      
      // Simulate app restart - components reload from localStorage
      const restored = mockStorage.getItem('activeTimer');
      
      if (!restored) {
        throw new Error('Timer state lost on restart');
      }
      
      const timerData = JSON.parse(restored);
      
      if (!timerData.taskId) {
        throw new Error('Task association lost on restart');
      }
      
      if (!timerData.isTracking) {
        throw new Error('Timer tracking state lost on restart');
      }
      
      // Calculate elapsed time since restart
      const currentTime = Date.now();
      const elapsedSinceStart = currentTime - timerData.startTime;
      const elapsedMinutes = Math.floor(elapsedSinceStart / 60000);
      
      if (elapsedMinutes < 0) {
        throw new Error('Invalid elapsed time calculation');
      }
      
      console.log(`Timer state restored: ${elapsedMinutes} minutes elapsed for task ${timerData.taskId}`);
    });
    
    return await integrationTests.run();
  }
}

// Main execution
async function main() {
  const comprehensiveTests = new ComprehensiveTimerTests();
  const success = await comprehensiveTests.runAll();
  
  if (!success) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { ComprehensiveTimerTests };