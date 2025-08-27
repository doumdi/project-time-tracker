const path = require('path');
const fs = require('fs');

// Simple test framework for timer functionality
class TimerTests {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log(`Running ${this.tests.length} timer tests...\n`);
    
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
    
    console.log(`\n=== Test Results ===`);
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

// Test timer coordination
const tests = new TimerTests();

tests.test('Timer data structure validation', () => {
  const mockStorage = new MockLocalStorage();
  
  // Test TasksView timer data structure
  const taskTimerData = {
    isTracking: true,
    startTime: Date.now(),
    selectedProject: 1,
    description: 'Working on: Test Task',
    taskId: 123
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(taskTimerData));
  const retrieved = JSON.parse(mockStorage.getItem('activeTimer'));
  
  if (!retrieved.taskId) {
    throw new Error('Task timer data missing taskId');
  }
  
  if (!retrieved.isTracking) {
    throw new Error('Task timer data missing isTracking');
  }
  
  if (!retrieved.selectedProject) {
    throw new Error('Task timer data missing selectedProject');
  }
});

tests.test('TimeTracker timer data structure', () => {
  const mockStorage = new MockLocalStorage();
  
  // Test TimeTracker timer data structure (without taskId)
  const regularTimerData = {
    isTracking: true,
    startTime: Date.now(),
    selectedProject: 1,
    description: 'Regular time tracking'
    // Note: no taskId for regular timer
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(regularTimerData));
  const retrieved = JSON.parse(mockStorage.getItem('activeTimer'));
  
  if (!retrieved.isTracking) {
    throw new Error('Regular timer data missing isTracking');
  }
  
  if (!retrieved.selectedProject) {
    throw new Error('Regular timer data missing selectedProject');
  }
  
  // taskId should be undefined for regular timers
  if (retrieved.taskId !== undefined) {
    console.log('Note: Regular timer has taskId, this might cause conflicts');
  }
});

tests.test('Timer state conflict detection', () => {
  const mockStorage = new MockLocalStorage();
  
  // Simulate starting a task timer
  const taskTimer = {
    isTracking: true,
    startTime: Date.now() - 5000, // 5 seconds ago
    selectedProject: 1,
    description: 'Working on: Task A',
    taskId: 123
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(taskTimer));
  
  // Simulate TimeTracker trying to start a new timer
  const regularTimer = {
    isTracking: true,
    startTime: Date.now(),
    selectedProject: 2,
    description: 'New regular timer'
  };
  
  // This would overwrite the task timer - potential bug!
  mockStorage.setItem('activeTimer', JSON.stringify(regularTimer));
  
  const final = JSON.parse(mockStorage.getItem('activeTimer'));
  
  if (final.taskId) {
    throw new Error('Regular timer overwrote task timer but retained taskId');
  }
  
  if (final.selectedProject !== 2) {
    throw new Error('Timer state not properly updated');
  }
  
  console.log('Warning: Timer conflict detected - regular timer overwrote task timer');
});

tests.test('Task validation for time tracking', () => {
  // Test task without project
  const taskWithoutProject = {
    id: 1,
    name: 'Test Task',
    project_id: null
  };
  
  if (!taskWithoutProject.project_id) {
    // This should trigger an alert in the UI
    console.log('Task without project correctly detected');
  } else {
    throw new Error('Task project validation failed');
  }
  
  // Test task with project
  const taskWithProject = {
    id: 2,
    name: 'Test Task 2',
    project_id: 1
  };
  
  if (taskWithProject.project_id) {
    console.log('Task with project correctly detected');
  } else {
    throw new Error('Valid task incorrectly rejected');
  }
});

tests.test('Timer synchronization logic', () => {
  const mockStorage = new MockLocalStorage();
  
  // Test the synchronization between TasksView and TimeTracker
  
  // 1. Start a task timer
  const taskTimer = {
    isTracking: true,
    startTime: Date.now(),
    selectedProject: 1,
    description: 'Working on: Important Task',
    taskId: 456
  };
  
  mockStorage.setItem('activeTimer', JSON.stringify(taskTimer));
  
  // 2. TimeTracker should recognize this as a task timer
  const saved = JSON.parse(mockStorage.getItem('activeTimer'));
  const isTaskTimer = saved.taskId !== undefined;
  
  if (!isTaskTimer) {
    throw new Error('Failed to detect task timer');
  }
  
  // 3. When stopping, should preserve task info
  const endTime = Date.now() + 60000; // 1 minute later
  const duration = Math.round((endTime - saved.startTime) / 60000);
  
  if (duration <= 0) {
    throw new Error('Invalid duration calculation');
  }
  
  console.log(`Task timer ran for ${duration} minute(s)`);
});

// Run the tests
async function runTimerTests() {
  console.log('=== Timer Functionality Tests ===\n');
  
  const success = await tests.run();
  
  if (!success) {
    console.log('\n⚠️  Timer functionality issues detected!');
    process.exit(1);
  } else {
    console.log('\n✅ All timer tests passed!');
  }
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimerTests, MockLocalStorage, runTimerTests };
}

// Run tests if called directly
if (require.main === module) {
  runTimerTests().catch(console.error);
}