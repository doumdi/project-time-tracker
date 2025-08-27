// Test script to verify cumulated time calculation
// This demonstrates how the SQL query works for calculating cumulated time

const exampleData = {
  tasks: [
    { id: 1, name: 'Bug Fix #123', project_id: 1, allocated_time: 60 },
    { id: 2, name: 'Update Documentation', project_id: 2, allocated_time: 120 },
    { id: 3, name: 'Code Review', project_id: 1, allocated_time: 90 }
  ],
  timeEntries: [
    { id: 1, project_id: 1, description: 'Working on: Bug Fix #123', duration: 30 },
    { id: 2, project_id: 1, description: 'Continuing Bug Fix #123', duration: 45 },
    { id: 3, project_id: 1, description: 'Final touches on Bug Fix #123', duration: 20 },
    { id: 4, project_id: 2, description: 'Working on: Update Documentation', duration: 60 },
    { id: 5, project_id: 1, description: 'Some other work', duration: 25 },
    { id: 6, project_id: 1, description: 'Started Code Review process', duration: 40 }
  ]
};

// SQL Query Logic Simulation
function calculateCumulatedTime(taskName, projectId, timeEntries) {
  return timeEntries
    .filter(entry => entry.project_id === projectId)
    .filter(entry => entry.description.includes(taskName))
    .reduce((total, entry) => total + entry.duration, 0);
}

// Test the calculation
console.log('Cumulated Time Calculation Test:');
console.log('================================');

exampleData.tasks.forEach(task => {
  const cumulatedTime = calculateCumulatedTime(task.name, task.project_id, exampleData.timeEntries);
  const percentage = task.allocated_time > 0 ? Math.round((cumulatedTime / task.allocated_time) * 100) : 0;
  
  console.log(`Task: ${task.name}`);
  console.log(`  Allocated Time: ${task.allocated_time} minutes`);
  console.log(`  Cumulated Time: ${cumulatedTime} minutes`);
  console.log(`  Progress: ${percentage}%`);
  console.log(`  Status: ${cumulatedTime > task.allocated_time ? 'Over budget' : 'On track'}`);
  console.log('');
});

// Expected Results:
// Bug Fix #123: 95 minutes cumulated (30+45+20) vs 60 allocated = 158% (over budget)
// Update Documentation: 60 minutes cumulated vs 120 allocated = 50% (on track)
// Code Review: 40 minutes cumulated vs 90 allocated = 44% (on track)

module.exports = { calculateCumulatedTime, exampleData };