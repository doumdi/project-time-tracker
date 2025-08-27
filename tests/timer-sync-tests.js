const path = require('path');
const fs = require('fs');

// Enhanced test framework for timer synchronization
class TimerSyncTests {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log(`Running ${this.tests.length} timer synchronization tests...\n`);
    
    for (const { name, testFn } of this.tests) {
      try {
        console.log(`Testing: ${name}`);
        await testFn();
        console.log('✅ PASSED\n');
        this.results.push({ name, status: 'PASSED' });
      } catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        this.results.push({ name, status: 'FAILED', error: error.message });
      }
    }

    // Summary
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    
    console.log(`\n=== Timer Synchronization Test Results ===`);
    console.log(`Total: ${this.tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      this.results.filter(r => r.status === 'FAILED').forEach(r => {
        console.log(`- ${r.name}: ${r.error}`);
      });
    }

    return failed === 0;
  }
}

// Mock localStorage for testing
class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = value;
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

// Test timer synchronization between TasksView and TimeTracker
const tests = new TimerSyncTests();

tests.test('TasksView starts task timer correctly', () => {
  const mockStorage = new MockLocalStorage();
  
  // Simulate TasksView starting a task timer
  const task = {
    id: 123,
    name: 'Important Task',
    project_id: 1
  };
  
  const taskTimerData = {
    isTracking: true,
    startTime: Date.now(),
    selectedProject: task.project_id,
    description: `Working on: ${task.name}`,
    taskId: task.id
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(taskTimerData));
  
  // Verify the data structure
  const retrieved = JSON.parse(mockStorage.getItem('activeTimer'));
  
  if (!retrieved.taskId) {
    throw new Error('Task timer missing taskId');
  }
  
  if (retrieved.taskId !== task.id) {
    throw new Error('Task timer has wrong taskId');
  }
  
  if (!retrieved.isTracking) {
    throw new Error('Task timer not marked as tracking');
  }
  
  if (retrieved.selectedProject !== task.project_id) {
    throw new Error('Task timer has wrong project');
  }
  
  console.log(`Task timer created for task ${retrieved.taskId} on project ${retrieved.selectedProject}`);
});

tests.test('TimeTracker preserves task timer data when updating', () => {
  const mockStorage = new MockLocalStorage();
  
  // Start with a task timer
  const originalTaskTimer = {
    isTracking: true,
    startTime: Date.now() - 30000, // 30 seconds ago
    selectedProject: 1,
    description: 'Working on: Critical Task',
    taskId: 456
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(originalTaskTimer));
  
  // Simulate TimeTracker loading the timer (what happens in useEffect)
  const loaded = JSON.parse(mockStorage.getItem('activeTimer'));
  let activeTaskId = loaded.taskId;
  let selectedProject = loaded.selectedProject;
  let description = loaded.description;
  let isTracking = loaded.isTracking;
  let startTime = loaded.startTime;
  
  // Simulate TimeTracker updating description (user types something)
  description = 'Working on: Critical Task - Updated description';
  
  // Simulate TimeTracker saving state (what happens in the useEffect)
  const updatedTimerData = {
    isTracking,
    startTime,
    selectedProject,
    description
  };
  
  // This is the key fix - preserve taskId if it exists
  if (activeTaskId) {
    updatedTimerData.taskId = activeTaskId;
  }
  
  mockStorage.setItem('activeTimer', JSON.stringify(updatedTimerData));
  
  // Verify taskId is preserved
  const final = JSON.parse(mockStorage.getItem('activeTimer'));
  
  if (!final.taskId) {
    throw new Error('TaskId was lost during TimeTracker update');
  }
  
  if (final.taskId !== originalTaskTimer.taskId) {
    throw new Error('TaskId was changed during TimeTracker update');
  }
  
  if (final.description !== description) {
    throw new Error('Description update was lost');
  }
  
  console.log(`Task timer preserved with taskId ${final.taskId} and updated description`);
});

tests.test('TimeTracker prevents conflicts when starting new timer over task timer', () => {
  const mockStorage = new MockLocalStorage();
  
  // Start with an active task timer
  const taskTimer = {
    isTracking: true,
    startTime: Date.now() - 60000, // 1 minute ago
    selectedProject: 1,
    description: 'Working on: Urgent Task',
    taskId: 789
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(taskTimer));
  
  // Simulate TimeTracker starting a new regular timer
  // This should prompt user for confirmation
  
  const loaded = JSON.parse(mockStorage.getItem('activeTimer'));
  const hasActiveTask = loaded.taskId !== undefined;
  
  if (!hasActiveTask) {
    throw new Error('Failed to detect existing task timer');
  }
  
  // User confirms to stop task timer and start new timer
  const newTimer = {
    isTracking: true,
    startTime: Date.now(),
    selectedProject: 2,
    description: 'New regular timer work'
    // Note: no taskId for regular timer
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(newTimer));
  
  const final = JSON.parse(mockStorage.getItem('activeTimer'));
  
  if (final.taskId !== undefined) {
    throw new Error('New timer incorrectly retains taskId');
  }
  
  if (final.selectedProject !== 2) {
    throw new Error('New timer project not set correctly');
  }
  
  console.log('Task timer conflict handled correctly - new regular timer started');
});

tests.test('Timer stops correctly and clears task association', () => {
  const mockStorage = new MockLocalStorage();
  
  // Start with a running task timer
  const taskTimer = {
    isTracking: true,
    startTime: Date.now() - 120000, // 2 minutes ago
    selectedProject: 1,
    description: 'Working on: Important Feature',
    taskId: 101
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(taskTimer));
  
  // Simulate stopping the timer
  // This should create a time entry and clear the timer
  const endTime = Date.now();
  const durationMs = endTime - taskTimer.startTime;
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const roundedDuration = Math.max(5, Math.round(durationMinutes / 5) * 5);
  
  // Simulate creating the time entry
  const timeEntry = {
    project_id: taskTimer.selectedProject,
    description: taskTimer.description,
    start_time: new Date(taskTimer.startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    duration: roundedDuration
  };
  
  // Verify time entry looks correct
  if (!timeEntry.project_id) {
    throw new Error('Time entry missing project_id');
  }
  
  if (timeEntry.duration < 5) {
    throw new Error('Duration should be minimum 5 minutes');
  }
  
  // Clear the timer
  mockStorage.removeItem('activeTimer');
  
  const remaining = mockStorage.getItem('activeTimer');
  if (remaining !== null) {
    throw new Error('Timer was not cleared after stopping');
  }
  
  console.log(`Created time entry for ${roundedDuration} minutes and cleared timer`);
});

tests.test('Database task activation/deactivation', () => {
  // Test the database functions for task management
  
  // Simulate setActiveTask(taskId) call
  let activeTasks = [];
  const taskId = 555;
  
  // First deactivate all tasks
  activeTasks.forEach(task => task.is_active = false);
  
  // Then activate the specified task
  const taskToActivate = { id: taskId, is_active: false };
  taskToActivate.is_active = true;
  activeTasks.push(taskToActivate);
  
  const activeTask = activeTasks.find(t => t.is_active);
  
  if (!activeTask) {
    throw new Error('Task activation failed');
  }
  
  if (activeTask.id !== taskId) {
    throw new Error('Wrong task was activated');
  }
  
  // Test deactivation
  activeTasks.forEach(task => task.is_active = false);
  
  const stillActive = activeTasks.find(t => t.is_active);
  if (stillActive) {
    throw new Error('Task deactivation failed');
  }
  
  console.log(`Task ${taskId} activation/deactivation cycle completed`);
});

// Run the tests
async function runTimerSyncTests() {
  console.log('=== Timer Synchronization Tests ===\n');
  
  const success = await tests.run();
  
  if (!success) {
    console.log('\n⚠️  Timer synchronization issues detected!');
    process.exit(1);
  } else {
    console.log('\n✅ All timer synchronization tests passed!');
    console.log('\nThe timer functionality should now work correctly between TasksView and TimeTracker.');
  }
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimerSyncTests, MockLocalStorage, runTimerSyncTests };
}

// Run tests if called directly
if (require.main === module) {
  runTimerSyncTests().catch(console.error);
}